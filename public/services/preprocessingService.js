const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { pipeline } = require('@huggingface/transformers');
const { WaveFile } = require('wavefile');
const libre = require('libreoffice-convert');
const crypto = require('crypto');
libre.convertAsync = require('util').promisify(libre.convert);

// Environment Setting
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
const tempWavPath = path.join(__dirname, '../tempfolder/temp_audio.wav');
const tempPdfPath = path.join(__dirname, '../tempfolder/temp_document.pdf');

// MAIN PRE-PROCESSING HELPER FUNCTION - GROUPED
// CAN USE DIRECTLY
// InputPath: ALL DOCUMENT, VIDEO, AUDIO TYPE
// IMPORTANT: Return Raw Text
async function documentPreprocessing(buffer, documentExt) {
    const supportedVideoAudioFormats = ['.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.flac', '.aac'];
    const supportedDocumentFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.odt', '.odp', '.ods', '.txt', '.rtf'];
    let tempFilePath = "";

    // Create temporary directory
    try {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docx-'));
        const tempFileName = crypto.randomUUID() + documentExt;
        tempFilePath = path.join(tempDir, tempFileName);
        await fs.writeFile(tempFilePath, buffer)
    } catch (error) {
        console.log(`Error creating buffer temporary directory: ${error}`);
    }

    try {
        // 1. Check file type
        if (supportedVideoAudioFormats.includes(documentExt)) {
            // 2.1 Convert video/audio to wav file
            // 2.11 Extract text from video/audio using ffmpeg and Whisper model
            await convert_ffmpeg(tempFilePath, tempWavPath, 'wav');

            const wavBuffer = await fs.readFile(tempWavPath);
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
            for (const v of audioData) {
                maxAbs = Math.max(maxAbs, Math.abs(v));
            }
            if (maxAbs > 0 && maxAbs < 0.9) {
                const gain = 0.9 / maxAbs;
                for (let i = 0; i < audioData.length; i++) {
                    audioData[i] *= gain;
                }
            }

            const model = await getTranscriber();
            const output = await model(audioData, {
                chunk_length_s: 30,
                stride_length_s: 5,
            });

            return output.text?.trim();
        } else if (supportedDocumentFormats.includes(documentExt)) {
            // 3.1 Convert document to PDF file
            // 3.11 Convert other document formats to PDF
            if (documentExt !== 'pdf') {
                await documentToPdf_libreofficeconvert(tempFilePath, tempPdfPath);

                // 3.2 Extract text from converted PDF file
                return await pdfExtracted_pdfjslib(tempPdfPath);
            }

            // 3.12 Extract text from original PDF file
            return await pdfExtracted_pdfjslib(tempFilePath);
        } else {
            console.error('Unsupported file format');
        }
    } catch (err) {
        console.error('Document preprocessing failed:', err.message);
    }
}

// SMALL HELPER FUNCTION FOR REFERENCES

// Pre-loaded whisper model
let transcriber = null;
let modelLoading = null;

async function getTranscriber() {
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

    modelLoading = pipeline(
        'automatic-speech-recognition',
        'Xenova/distil-whisper-large-v2',
        {
            quantized: true,
            cache_dir: path.join(__dirname, '../model_cache')
        }
    ).then(model => {
        transcriber = model;
        modelLoading = null;
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Whisper model loaded in ${loadTime}s and ready for requests`);
        return model;
    });

    return modelLoading;
}

// Convert document to pdf file with libreoffice-convert
// InputPath: Where the document path staying at
// OutputPath: Where you want the pdf file placing at
// IMPORTANT: No return, instead write the file
async function documentToPdf_libreofficeconvert(inputPath, outputPath) {
    let ext = '.pdf';

    try{
        const docBuffer = await fs.readFile(inputPath);
        let pdfBuf = await libre.convertAsync(docBuffer, ext, undefined);
        await fs.writeFile(outputPath, pdfBuf);
    } catch (err) {
        console.error('Document to PDF conversion failed:', err.message);
    }
}

// Extract text from PDF using pdfjs-dist
// Note: Works well for academic papers, Can't parse picture
// InputPath: Where the document path staying at
// IMPORTANT: Return Raw Text
async function pdfExtracted_pdfjslib(inputPath){
    const pdfjsLib = await import('pdfjs-dist');
    const loadingTask = pdfjsLib.getDocument({
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
}

// Extract text from video/audio using ffmpeg and Whisper model
// InputPath: Where the video / audio path staying at
// IMPORTANT: Return Raw Text
async function videoAudioExtracted_ffmpeg(inputPath) {
    try {
        await convert_ffmpeg(inputPath, tempWavPath, 'wav');

        const wavBuffer = await fs.readFile(tempWavPath);
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
        for (const v of audioData) {
            maxAbs = Math.max(maxAbs, Math.abs(v));
        }
        if (maxAbs > 0 && maxAbs < 0.9) {
            const gain = 0.9 / maxAbs;
            for (let i = 0; i < audioData.length; i++) {
                audioData[i] *= gain;
            }
        }

        const model = await getTranscriber();
        const output = await model(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
        });

        return output.text?.trim();
    } catch (err) {
        console.error('Transcription pipeline failed:', err);
        throw err;
    } finally {
        await fs.unlink(tempWavPath).catch(() => {});
    }
}

// OTHER SMALL HELPER FUNCTION
// Convert video and audio to different file type
async function convert_ffmpeg(inputPath, outputPath, convertType) {
    let audioCodec_model;

    // Convert setting based on convert type
    switch (convertType) {
        case 'mp3':
            audioCodec_model = 'libmp3lame';
            break;
        case 'wav':
            audioCodec_model = 'pcm_s16le';
    }

    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFrequency(16000)
            .audioChannels(1)
            .audioCodec(audioCodec_model)
            .format(convertType)
            .audioBitrate('128k')
            .on('end', () => {
                console.log(`${convertType} completed`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`${convertType} error:', err);`);
                reject(err);
            })
            .save(outputPath);
    });
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
        const data = await fs.readFile(filePath, 'utf8');
        return data;
    } catch (err) {
        console.error('Text file extraction failed:', err.message);
    }
}

// Group multiple report files into a single text data
async function groupMultipleFile(requirementReports) {
    let groupedData = "";
    try {
        for (const report of requirementReports) {
            groupedData += `\n\n==============================
Report File ${report}
==============================\n\n`;
            groupedData +=  await extracttxtFile(report);
        }
        return groupedData;
    } catch (err) {
        console.error('Grouping report failed:', err.message);
    }
}

module.exports = {
    documentPreprocessing, documentToPdf_libreofficeconvert, pdfExtracted_pdfjslib, videoAudioExtracted_ffmpeg, getTranscriber,  convert_ffmpeg, writeTxtFile, extractTxtFile, groupMultipleFile
};