const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { pipeline, env } = require('@huggingface/transformers');
const { WaveFile } = require('wavefile');
const libre = require('libreoffice-convert');
const crypto = require('crypto');

// Environment Setting
libre.convertAsync = require('util').promisify(libre.convert);
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
env.authToken = process.env.HUGGING_FACE_TOKEN;

const supportedVideoAudioFormats = ['.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.flac', '.aac', '.m4a'];
const supportedDocumentFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.odt', '.odp', '.ods', '.rtf'];

// Lazy singleton for whisper model
let transcriber = null
let modelLoading = null;
let modelLoadFailed = false;

async function getTranscriber() {
    // If model previously failed to load, don't retry
    if (modelLoadFailed) {
        throw new Error('Whisper model previously failed to load');
    }

    // If already loaded, return immediately
    if (transcriber) {
        return transcriber;
    }

    // If currently loading, wait for it
    if (modelLoading) {
        return modelLoading;
    }

    // Start loading
    console.log('Loading Whisper model (this happens once)...');
    const startTime = Date.now();

    modelLoading = await pipeline(
        'automatic-speech-recognition',
        // 'Xenova/whisper-large-v2',
        'Xenova/whisper-base',
        {
            quantized: true,
            dtype: {
                encoder_model: 'q8',
                decoder_model_merged: 'q8'
            },
            cache_dir: path.join(__dirname, '../model_cache')
        }
    ).then(model => {
        transcriber = model;
        modelLoading = null;
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Whisper model loaded in ${loadTime}s and ready for requests`);
        return model;
    }).catch(err => {
        console.error(`Failed to load whisper model: ${err.message}`);
        modelLoading = null;
        modelLoadFailed = true;
        transcriber = null;
        throw err;
    });

    return modelLoading;
}

async function init(){
    transcriber = await getTranscriber()
}

// lazy singleton for pdfjslib
let pdfjsLib = null;

async function getPdfjsLib() {
    if (!pdfjsLib) pdfjsLib = await import('pdfjs-dist');
    return pdfjsLib;
}

// Helper function list
function createTempPath(extension) {
    return path.join(os.tmpdir(), `${crypto.randomUUID()}${extension}`);
}

async function processAudioBuffer(wavBuffer) {
    const wav = new WaveFile(wavBuffer);
    wav.toBitDepth('32f');
    wav.toSampleRate(16000);

    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
        if (audioData.length > 1) {
            const SCALING_FACTOR = Math.sqrt(2);
            for (let i = 0; i < audioData[0].length; i++) {
                audioData[0][i] = SCALING_FACTOR * (audioData[0][i] + audioData[1][i]) / 2;
            }
        }
        audioData = audioData[0];
    }

    let maxAbs = 0;
    for (const v of audioData) maxAbs = Math.max(maxAbs, Math.abs(v));
    if (maxAbs > 0 && maxAbs < 0.9) {
        const gain = 0.9 / maxAbs;
        for (let i = 0; i < audioData.length; i++) audioData[i] *= gain;
    }

    return audioData;
}

async function transcribeAudioData(audioData) {
    const model = await getTranscriber();
    const output = await model(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'en',
    });
    return output.text?.trim();
}

// OTHER SMALL HELPER FUNCTION
// Convert video and audio to different file type
async function convert_ffmpeg(inputPath, outputPath, convertType) {
    const audioCodecMap = {
        mp3: 'libmp3lame',
        wav: 'pcm_s16le',
    };

    const audioCodec = audioCodecMap[convertType];
    if (!audioCodec) throw new Error(`Unsupported convert type: ${convertType}`);

    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFrequency(16000)
            .audioChannels(1)
            .audioCodec(audioCodec)
            .format(convertType)
            .audioBitrate('128k')
            .on('end', () => {
                console.log(`ffmpeg ${convertType} conversion completed`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`ffmpeg ${convertType} error:`, err);
                reject(err);
            })
            .save(outputPath);
    });
}

// Extract text from video/audio using ffmpeg and Whisper model
// InputPath: Where the video / audio path staying at
// IMPORTANT: Return Raw Text
async function videoAudioExtracted_ffmpeg(inputPath) {
    const tempWavPath = createTempPath('.wav'); // Dynamic path

    try {
        // Benchmark WAV conversion
        const conversionStart = Date.now();

        await convert_ffmpeg(inputPath, tempWavPath, 'wav');

        const wavBuffer = await fs.readFile(tempWavPath);
        const audioData = await processAudioBuffer(wavBuffer);

        console.log(`WAV conversion done in ${((Date.now() - conversionStart) / 1000).toFixed(2)}s`);

        const transcriptionStart = Date.now();
        const text = await transcribeAudioData(audioData);
        console.log(`Transcription done in ${((Date.now() - transcriptionStart) / 1000).toFixed(2)}s`);
        console.log(`Total processing time: ${((Date.now() - conversionStart) / 1000).toFixed(2)}s`);

        return text;
    } catch (err) {
        console.error('Transcription pipeline failed:', err);
        throw err;
    } finally {
        await fs.unlink(tempWavPath).catch(() => {});
    }
}

// Extract text from PDF using pdfjs-dist
// Note: Works well for academic papers, Can't parse picture
// InputPath: Where the document path staying at
// IMPORTANT: Return Raw Text
async function pdfExtracted_pdfjslib(inputPath){
    try {
        const pdfjs = await getPdfjsLib();
        const loadingTask = pdfjs.getDocument({
            url: inputPath,
            standardFontDataUrl: '/standard_fonts/'
        });

        const pdfDocument = await loadingTask.promise;
        const extractedText = [];

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(' ');
            extractedText.push("Page " + pageNum + ":\n" + text);
        }

        return extractedText.join('\n\n');
    } catch (err) {
        console.error('Document to PDF conversion failed:', err.message);
        return err;
    }
}

// Convert document to pdf file with libreoffice-convert
// InputPath: Where the document path staying at
// OutputPath: Where you want the pdf file placing at
// IMPORTANT: No return, instead write the file
async function documentToPdf_libreofficeconvert(inputPath, outputPath) {
    try{
        const docBuffer = await fs.readFile(inputPath);
        let pdfBuf = await libre.convertAsync(docBuffer, '.pdf', undefined);
        await fs.writeFile(outputPath, pdfBuf);
    } catch (err) {
        console.error('Document to PDF conversion failed:', err.message);
        return err;
    }
}

// MAIN PRE-PROCESSING HELPER FUNCTION - GROUPED
// CAN USE DIRECTLY
// InputPath: ALL DOCUMENT, VIDEO, AUDIO TYPE
// IMPORTANT: Return Raw Text
async function documentPreprocessing(buffer, documentExt) {
    let tempDir = "";
    let tempWavPath = "";
    let tempPdfPath = "";

    // Create temporary directory
    try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-'));
        const tempFilePath = path.join(tempDir, `${crypto.randomUUID()}${documentExt}`);
        await fs.writeFile(tempFilePath, buffer);

        // Check file type
        if (supportedVideoAudioFormats.includes(documentExt)) {
            // Create dynamic temp WAV path
            tempWavPath = createTempPath('.wav');

            // Benchmark WAV conversion
            const conversionStart = Date.now();

            // Convert to WAV
            await convert_ffmpeg(tempFilePath, tempWavPath, 'wav');

            const conversionTime = ((Date.now() - conversionStart) / 1000).toFixed(2);
            console.log(`WAV conversion completed in ${conversionTime}s`);

            // Read and process WAV file
            const wavBuffer = await fs.readFile(tempWavPath);
            const audioData = await processAudioBuffer(wavBuffer);

            console.log('Video / audio is now being transcribed');
            const transcriptionStart = Date.now();
            const text = await transcribeAudioData(audioData);
            console.log(`Transcription completed in ${((Date.now() - transcriptionStart) / 1000).toFixed(2)}s`);

            return text;

        } else if (supportedDocumentFormats.includes(documentExt)) {
            if (documentExt !== '.pdf') {
                // Create dynamic temp PDF path
                tempPdfPath = createTempPath('.pdf');
                await documentToPdf_libreofficeconvert(tempFilePath, tempPdfPath);
                return await pdfExtracted_pdfjslib(tempPdfPath);
            }

            // Extract text from original PDF
            return await pdfExtracted_pdfjslib(tempFilePath);
        } else {
            console.error('Unsupported file format');
            return null;
        }
    } catch (err) {
        console.error('Document preprocessing failed:', err.message);
        return null;
    } finally {
        // Cleanup on error
        if (tempWavPath) await fs.unlink(tempWavPath).catch(() => {});
        if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
        if (tempFilePath) {
            const tempDir = path.dirname(tempFilePath);
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
    }
}

// Convert extracted text to a .txt file
async function writeTxtFile(extractedText, outputPath) {
    try {
        await fs.writeFile(outputPath, extractedText, 'utf8');
        console.log(`\nSaved extracted text to:\n   ${outputPath}`);
    } catch (err) {
        console.error('Main failed:', err.message);
    }
}

// Extract text from txt file
async function extractTxtFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (err) {
        console.error('Text file extraction failed:', err.message);
        throw err;
    }
}

// Group multiple report files into a single text data
async function groupMultipleFile(requirementReports) {
    try {
        let groupedData = "";
        for (const report of requirementReports) {
            groupedData += `\n\n==============================
Report File ${report}
==============================\n\n`;
            groupedData +=  await extractTxtFile(report);
        }
        return groupedData;
    } catch (err) {
        console.error('Grouping report failed:', err.message);
        throw err;
    }
}

module.exports = {
    init,
    documentPreprocessing,
    documentToPdf_libreofficeconvert,
    pdfExtracted_pdfjslib,
    videoAudioExtracted_ffmpeg,
    getTranscriber,
    convert_ffmpeg,
    writeTxtFile,
    extractTxtFile,
    groupMultipleFile,
    supportedVideoAudioFormats,
    supportedDocumentFormats
};
