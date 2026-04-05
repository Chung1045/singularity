const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const libre = require('libreoffice-convert');
const crypto = require('crypto');
const {serverLogger, serviceLogger} = require("./loggingService");
libre.convertAsync = require('util').promisify(libre.convert);
const { nodewhisper } = require("nodejs-whisper");
const PQueue = require('p-queue').default;

const supportedAudioFormats = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg'];
const supportedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const supportedDocumentFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.odt', '.odp', '.ods', '.rtf'];

// Environment Setting
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

// MAIN PRE-PROCESSING HELPER FUNCTION - GROUPED
// CAN USE DIRECTLY
// InputPath: ALL DOCUMENT, VIDEO, AUDIO TYPE
// IMPORTANT: Return Raw Text

async function documentPreprocessing(buffer, documentExt) {

    let tempFilePath = "";
    let tempWavPath = "";
    let tempPdfPath = "";

    // Create temporary directory
    try {
        const jobID = crypto.randomUUID();
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `doc-${jobID}`));
        const tempFileName = jobID + documentExt;
        tempFilePath = path.join(tempDir, tempFileName);
        await fs.writeFile(tempFilePath, buffer);

        // Check file type
        if (supportedAudioFormats.includes(documentExt) || supportedVideoFormats.includes(documentExt) ) {
            serviceLogger.info(`[Pre-processing] Staring preprocess Job ${jobID}, kind: ${documentExt}`);
            const totalStart = Date.now();

            if (supportedVideoFormats.includes(documentExt)) {
                serviceLogger.info(`[Pre-processing] JobID ${jobID} video to audio conversion started...`);
                const conversionStart = Date.now();
                const wavPath = path.join(tempDir, `audio-${jobID}.wav`);

                await new Promise((resolve, reject) => {
                    ffmpeg(tempFilePath)
                        .audioFrequency(16000)
                        .audioChannels(1)
                        .audioCodec('pcm_s16le')
                        .format('wav')
                        .audioBitrate('128k')
                        .on('end', resolve)
                        .on('error', reject)
                        .save(wavPath);
                });

                serviceLogger.info(`[Pre-processing] JobID ${jobID} video to audio conversion finished, elapsed time: ${
                    ((Date.now() - conversionStart)/1000).toFixed(2)}s`)
                tempFilePath = wavPath;
            }

            const transcriptionStart = Date.now();
            serviceLogger.info(`[Pre-processing] JobID ${jobID} transcription started...`);
            await transcribeFile(tempFilePath, documentExt, jobID);
            serviceLogger.info(`[Pre-processing] JobID ${jobID} transcription finished, elapsed time: ${
                ((Date.now() - transcriptionStart)/1000).toFixed(2)}s`);

            const transcriptText = await fs.readFile(
                path.join(tempDir, `${jobID}.txt`),
                "utf8"
            );

            serviceLogger.info(`[Pre-processing] Preprocess Job ${jobID} finished, elapsed time: ${
                ((Date.now() - totalStart)/1000).toFixed(2)}s`);

            await fs.rm(tempDir, { recursive: true, force: true });

            // return output.text?.trim();
            return transcriptText.trim();
        } else if (supportedDocumentFormats.includes(documentExt)) {
            serviceLogger.info(`[Pre-processing] JobID ${jobID} document preprocessing started...`);
            const timeStart = Date.now()
            if (documentExt !== '.pdf') {
                // Create dynamic temp PDF path
                tempPdfPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.pdf`);

                await documentToPdf_libreofficeconvert(tempFilePath, tempPdfPath);
                const result = await pdfExtracted_pdfjslib(tempPdfPath);

                // Cleanup
                await fs.unlink(tempPdfPath).catch(() => {});
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

                return result;
            }

            // Extract text from original PDF
            const result = await pdfExtracted_pdfjslib(tempFilePath);
            serviceLogger.info(`[Pre-processing] JobID ${jobID} document preprocessing finished, elapsed time: ${
                ((Date.now() - timeStart)/1000).toFixed(2)}s`);
            // Cleanup
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

            return result;
        } else {
            console.error('Unsupported file format');
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            return null;
        }
    } catch (err) {
        serviceLogger.warn(`[Pre-processing] Document preprocessing failed`);
        console.error('Document preprocessing failed:', err.message);
        // Cleanup on error
        if (tempWavPath) await fs.unlink(tempWavPath).catch(() => {});
        if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
        if (tempFilePath) {
            const tempDir = path.dirname(tempFilePath);
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
        return null;
    }
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
        return err;
    }
}

// Extract text from PDF using pdfjs-dist
// Note: Works well for academic papers, Can't parse picture
// InputPath: Where the document path staying at
// IMPORTANT: Return Raw Text
async function pdfExtracted_pdfjslib(inputPath){
    try {
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
    } catch (err) {
        console.error('Document to PDF conversion failed:', err.message);
        return err;
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
            groupedData +=  await extractTxtFile(report);
        }
        return groupedData;
    } catch (err) {
        console.error('Grouping report failed:', err.message);
    }
}

async function transcribeFile(filePath, originalExt, jobId) {

    try {

        console.log(`Transcribing ${filePath}`);
        const startTime = Date.now();

        await nodewhisper(filePath, {
            modelName: "base.en",
            autoDownloadModelName: "base.en",
            removeWavFileAfterTranscription: true,
            withCuda: false,
            logger: console,
            whisperOptions: {
                outputInText: true,
                splitOnWord: true
            },
        });

        const dir = path.dirname(filePath);
        const baseName = path.parse(filePath).name;
        let oldPath = path.join(dir, `${baseName}.wav.txt`);

        const newPath = path.join(dir, `${jobId}.txt`);

        await fs.rename(oldPath, newPath);

        console.log(`Renamed transcript to ${newPath}`);

        console.log(
            `Completed in ${
                ((Date.now() - startTime) / 1000).toFixed(2)
            }s`
        );

        return newPath;

    } catch (e) {

        console.error(
            "Unable to transcribe audio file:",
            e.message
        );

        throw e;
    }
}

module.exports = {
    documentPreprocessing,
    groupMultipleFile,
    supportedAudioFormats,
    supportedVideoFormats,
    supportedDocumentFormats
};
