const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { pipeline, env } = require('@huggingface/transformers');
const { WaveFile } = require('wavefile');
const libre = require('libreoffice-convert');
const crypto = require('crypto');
const ServiceError = require("../errors/ServiceError");
const {serverLogger} = require("./loggingService");

const SERVICE_NAME = 'PreprocessingService';

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
        throw new ServiceError(SERVICE_NAME, 'getTranscriber', 'Whisper model previously failed to load');
    }

    if (transcriber) return transcriber;
    if (modelLoading) return modelLoading;

    serverLogger.info(`[${SERVICE_NAME}] Loading Whisper model...`);
    const startTime = Date.now();

    modelLoading = pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base',
        {
            quantized: true,
            dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
            cache_dir: path.join(__dirname, '../model_cache')
        }
    ).then(model => {
        transcriber = model;
        modelLoading = null;
        serverLogger.info(`[${SERVICE_NAME}] Whisper model loaded in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        return model;
    }).catch(err => {
        modelLoading = null;
        modelLoadFailed = true;
        transcriber = null;
        throw new ServiceError(SERVICE_NAME, 'getTranscriber', 'Failed to load Whisper model', err);
    });

    return modelLoading;
}

async function init() {
    try {
        transcriber = await getTranscriber();
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'init', 'Failed to initialize transcriber', err);
    }
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
    try {
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
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'processAudioBuffer', 'Failed to process audio buffer', err);
    }
}

async function transcribeAudioData(audioData) {
    try {
        const model = await getTranscriber();
        const output = await model(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'en',
        });
        return output.text?.trim();
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'transcribeAudioData', 'Transcription failed', err);
    }
}

// OTHER SMALL HELPER FUNCTION
// Convert video and audio to different file type
async function convert_ffmpeg(inputPath, outputPath, convertType) {
    const audioCodecMap = { mp3: 'libmp3lame', wav: 'pcm_s16le' };
    const audioCodec = audioCodecMap[convertType];

    if (!audioCodec) {
        throw new ServiceError(SERVICE_NAME, 'convert_ffmpeg', `Unsupported convert type: ${convertType}`);
    }

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioFrequency(16000)
                .audioChannels(1)
                .audioCodec(audioCodec)
                .format(convertType)
                .audioBitrate('128k')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'convert_ffmpeg', `FFmpeg conversion to ${convertType} failed`, err);
    }
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

        serverLogger.info(`[${SERVICE_NAME}] WAV conversion done in ${((Date.now() - conversionStart) / 1000).toFixed(2)}s`);

        const transcriptionStart = Date.now();
        const text = await transcribeAudioData(audioData);
        serverLogger.info(`[${SERVICE_NAME}] Transcription done in ${((Date.now() - transcriptionStart) / 1000).toFixed(2)}s`);

        return text;
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'videoAudioExtracted_ffmpeg', 'Video/audio extraction failed', err);
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
        const pdfDocument = pdfjs.getDocument({
            url: inputPath,
            standardFontDataUrl: '/standard_fonts/'
        }).promise;

        const extractedText = [];
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(' ');
            extractedText.push(`Page ${pageNum}:\n${text}`);
        }

        return extractedText.join('\n\n');
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'pdfExtracted_pdfjslib', 'PDF extraction failed', err);
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
        throw new ServiceError(SERVICE_NAME, 'documentToPdf_libreofficeconvert', 'Document to PDF conversion failed', err);
    }
}

// MAIN PRE-PROCESSING HELPER FUNCTION - GROUPED
// CAN USE DIRECTLY
// InputPath: ALL DOCUMENT, VIDEO, AUDIO TYPE
// IMPORTANT: Return Raw Text
async function documentPreprocessing(buffer, documentExt) {
    let tempDir = null;
    let tempFilePath = null;
    let tempWavPath = null;
    let tempPdfPath = null;

    // Create temporary directory
    try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-'));
        tempFilePath = path.join(tempDir, `${crypto.randomUUID()}${documentExt}`);
        await fs.writeFile(tempFilePath, buffer);

        // Check file type
        if (supportedVideoAudioFormats.includes(documentExt)) {
            // Create dynamic temp WAV path
            tempWavPath = createTempPath('.wav');

            // Benchmark WAV conversion
            const conversionStart = Date.now();

            // Convert to WAV
            await convert_ffmpeg(tempFilePath, tempWavPath, 'wav');
            serverLogger.info(`[${SERVICE_NAME}] WAV conversion completed in ${((Date.now() - conversionStart) / 1000).toFixed(2)}s`);

            // Read and process WAV file
            const wavBuffer = await fs.readFile(tempWavPath);
            const audioData = await processAudioBuffer(wavBuffer);
            const transcriptionStart = Date.now();
            const text = await transcribeAudioData(audioData);
            serverLogger.info(`[${SERVICE_NAME}] Transcription completed in ${((Date.now() - transcriptionStart) / 1000).toFixed(2)}s`);
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
            throw new ServiceError(SERVICE_NAME, 'documentPreprocessing', `Unsupported file format: ${documentExt}`);
        }
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'documentPreprocessing', 'Document preprocessing failed', err);
    } finally {
        // Cleanup on error
        if (tempWavPath) await fs.unlink(tempWavPath).catch(() => {});
        if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
        if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

// Convert extracted text to a .txt file
async function writeTxtFile(extractedText, outputPath) {
    try {
        await fs.writeFile(outputPath, extractedText, 'utf8');
        serverLogger.info(`[${SERVICE_NAME}] Saved extracted text to: ${outputPath}`);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'writeTxtFile', 'Failed to write text file', err);
    }
}

// Extract text from txt file
async function extractTxtFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'extractTxtFile', 'Failed to read text file', err);
    }
}


// Group multiple report files into a single text data
async function groupMultipleFile(requirementReports) {
    try {
        let groupedData = '';
        for (const report of requirementReports) {
            groupedData += `\n\n==============================\nReport File ${report}\n==============================\n\n`;
            groupedData += await extractTxtFile(report);
        }
        return groupedData;
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'groupMultipleFile', 'Failed to group report files', err);
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
}