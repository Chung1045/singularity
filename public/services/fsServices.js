const Minio = require("minio");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const db = require("./db")
const uuid = require("uuid-v4");
const preprocessService = require("./preprocessingService");
const { serverLogger } = require("./loggingService");
const ServiceError = require("../errors/ServiceError");

const SERVICE_NAME = 'FSService';

const FSS_REPORT_USERSTORIES = "userStories";
const FSS_REPORT_REQUIREMENTS = "requirements";
const FSS_REPORT_USERSTORIES_PDF = "userStories_pdf";
const FSS_REPORT_REQUIREMENTS_PDF = "requirements_pdf";

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_END_POINT,
    port: parseInt(process.env.MINIO_PORT, 10),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESSKEY,
    secretKey: process.env.MINIO_SECRETKEY,
});

const bucket = process.env.MINIO_BUCKET;

/**
 * Initialize MinIO bucket
 */
const init = async () => {
    try {
        const exists = await minioClient.bucketExists(bucket);
        if (!exists) {
            await minioClient.makeBucket(bucket, "us-east-1");
            serverLogger.info(`[${SERVICE_NAME}] Bucket created: ${bucket}`);
        } else {
            serverLogger.info(`[${SERVICE_NAME}] Bucket already exists: ${bucket}`);
        }
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'init', 'Failed to initialize MinIO bucket', err);
    }
};

/**
 * Create a folder (or empty object) inside bucket
 */
async function createFolder(folderName) {
    if (!folderName.endsWith("/")) folderName += "/";
    try {
        await minioClient.putObject(bucket, folderName, "");
        serverLogger.info(`[${SERVICE_NAME}] Created folder: ${folderName}`);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'createFolder', `Failed to create folder: ${folderName}`, err);
    }
}

async function createProjectFolder(projectID) {
    try {
        const folderPath = `project/${projectID}/`;
        await minioClient.putObject(bucket, folderPath, "");
        serverLogger.info(`[${SERVICE_NAME}] Created project folder: ${folderPath}`);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'createProjectFolder', `Failed to create project folder: ${projectID}`, err);
    }
}

/**
 * Delete Project and all its contents
 */

async function deleteProjectFolder(projectID) {
    let path = `project/${projectID}/`

    try {
        const objectsToDelete = await new Promise((resolve, reject) => {
            const objects = [];
            const stream = minioClient.listObjects(bucket, path, true);
            stream.on("data", obj => objects.push(obj.name));
            stream.on("error", reject);
            stream.on("end", () => resolve(objects));
        });

        if (objectsToDelete.length > 0) {
            await minioClient.removeObjects(bucket, objectsToDelete);
            serverLogger.info(`[${SERVICE_NAME}] Deleted ${objectsToDelete.length} file(s) from: ${folderPath}`);
        } else {
            serverLogger.info(`[${SERVICE_NAME}] No files found in: ${path}`);
        }
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'deleteProjectFolder', `Failed to delete project folder: ${projectID}`, err);
    }
}

async function updateProfilePic(userID, uploadedFile) {
    const objectPath = `user/${userID}`;

    try {
        const buffer = uploadedFile.buffer
            ? uploadedFile.buffer
            : await fs.readFile(uploadedFile.path);

        let contentType = uploadedFile.mimetype || 'image/jpeg';

        // Upload to MinIO using putObject (for buffers)
        await minioClient.putObject(
            bucket,
            objectPath,
            buffer,
            buffer.length,
            {
                'Content-Type': contentType
            }
        );

        serverLogger.info(`[${SERVICE_NAME}] Uploaded profile pic for user: ${userID}`);
        return { successful: true, path: objectPath };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'updateProfilePic', `Failed to upload profile pic for user: ${userID}`, err);
    } finally {
        // Always clean up temp file
        if (uploadedFile.path) {
            await fs.unlink(uploadedFile.path).catch(() => {});
        }
    }
}

async function removeProfilePic(userID) {
    try {
        const objectPath = `user/${userID}`;
        await minioClient.removeObject(bucket, objectPath);
        serverLogger.info(`[${SERVICE_NAME}] Removed profile pic for user: ${userID}`);
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'removeProfilePic', `Failed to remove profile pic for user: ${userID}`, err);
    }
}

async function fetchProfilePics(userIDs) {
    const promises = userIDs.map(async (userID) => {
        try {
            const stream = await minioClient.getObject(bucket, `user/${userID}`);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            return { userID, image: `data:image/jpeg;base64,${buffer.toString('base64')}`, mimeType: 'image/jpeg' };
        } catch {
            return { userID, image: null, mimeType: 'image/jpeg' };
        }
    });
    return Promise.all(promises);
}


/**
 * Upload a file
 */
async function uploadFile(localPath, objectName) {
    try {
        await minioClient.fPutObject(bucket, objectName, localPath);
        await fs.unlink(localPath); // ✅ fixed: was unlinkSync
        serverLogger.info(`[${SERVICE_NAME}] Uploaded: ${objectName}`);
        return { successful: true, path: objectName };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'uploadFile', `Failed to upload file: ${objectName}`, err);
    }
}

async function uploadProjectFile(tempFilePath, projectID, documentID) {
    const pathName = `project/${projectID}/${documentID}`;
    try {
        await minioClient.fPutObject(bucket, pathName, tempFilePath);
        serverLogger.info(`[${SERVICE_NAME}] Uploaded project file: ${pathName}`);
        return { successful: true, path: pathName };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'uploadProjectFile', `Failed to upload project file: ${pathName}`, err);
    }
}

async function insertFileData(projectID, documentID, documentName, documentExt) {
    const sql = `INSERT INTO documents (documentID, projectID, documentName, documentExt) VALUES (?, ?, ?, ?)`;
    try {
        await db.run(sql, [documentID, projectID, documentName, documentExt]);
        serverLogger.info(`[${SERVICE_NAME}] Inserted file metadata: ${documentID}`);

        const isSupported =
            preprocessService.supportedDocumentFormats.includes(documentExt) ||
            preprocessService.supportedVideoAudioFormats.includes(documentExt);

        if (isSupported) {
            await createAliasFile(projectID, documentID, documentExt);
        }

        return { successful: true };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'insertFileData', `Failed to insert file data: ${documentID}`, err);
    }
}

/**
 * Download a file
 */

async function downloadProjectFile(projectID, documentID) {
    try {
        return await minioClient.getObject(bucket, `project/${projectID}/${documentID}`);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'downloadProjectFile', `Failed to download file: ${documentID}`, err);
    }
}

/**
 * Delete file path
 */
async function deleteProjectFile(documentID, projectID) {
    try {
        const doc = await db.get(
            `SELECT documentAlias FROM documents WHERE documentID = ? AND projectID = ?`,
            [documentID, projectID]
        );

        await db.run(
            `DELETE FROM documents WHERE documentID = ? AND projectID = ?`,
            [documentID, projectID]
        );

        await minioClient.removeObject(bucket, `project/${projectID}/${documentID}`);

        if (doc?.documentAlias) {
            await minioClient.removeObject(bucket, `project/${projectID}/alias/${doc.documentAlias}`);
        }

        serverLogger.info(`[${SERVICE_NAME}] Deleted file: ${documentID}`);
        return { successful: true };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'deleteProjectFile', `Failed to delete file: ${documentID}`, err);
    }
}


async function listProjectFiles(projectID) {
    try {
        return await db.all(
            `SELECT documentID, documentName, documentExt FROM documents WHERE projectID = ? ORDER BY documentName`,
            [projectID]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'listProjectFiles', `Failed to list files for project: ${projectID}`, err);
    }
}

async function renameProjectFile(projectID, documentID, newFileName) {
    try {
        await db.run(
            `UPDATE documents SET documentName = ? WHERE documentID = ? AND projectID = ?`,
            [newFileName, documentID, projectID]
        );
        serverLogger.info(`[${SERVICE_NAME}] Renamed document ${documentID} to: ${newFileName}`);
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'renameProjectFile', `Failed to rename file: ${documentID}`, err);
    }
}

async function getFileMetadata(documentID, projectID) {
    try {
        return await db.get(
            `SELECT documentID, documentName, documentExt FROM documents WHERE documentID = ? AND projectID = ?`,
            [documentID, projectID]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getFileMetadata', `Failed to get file metadata: ${documentID}`, err);
    }
}

/**
 * Get file stats (size and last modified) from MinIO
 */
async function getFileStats(projectID, documentID) {
    try {
        const stats = await minioClient.statObject(bucket, `project/${projectID}/${documentID}`);
        return {
            size: stats.size || 0,
            lastModified: new Date(stats.lastModified).toISOString() // ✅ simplified
        };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getFileStats', `Failed to get file stats: ${documentID}`, err);
    }
}

async function saveGeneratedReport(projectID, buffer, kind) {
    try {
        const reportID = await insertReportRecord(projectID, kind);
        const pathName = `project/${projectID}/reports/${reportID}`;
        const contentType = kind.endsWith('_pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        await minioClient.putObject(bucket, pathName, buffer, buffer.length, { 'Content-Type': contentType });
        serverLogger.info(`[${SERVICE_NAME}] Saved report: ${pathName}`);
        return { successful: true, path: pathName };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'saveGeneratedReport', 'Failed to save generated report', err);
    }
}

async function listReportRecord(projectID) {
    try {
        return await db.all(
            `SELECT reportID, reportName, reportType FROM reports WHERE projectID = ?`,
            [projectID]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'listReportRecord', `Failed to list reports for project: ${projectID}`, err);
    }
}

async function downloadReport(projectID, reportID) {
    try {
        return await minioClient.getObject(bucket, `project/${projectID}/reports/${reportID}`);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'downloadReport', `Failed to download report: ${reportID}`, err);
    }
}

async function insertReportRecord(projectID, reportType) {
    const isPdf = reportType?.endsWith('_pdf');
    const baseType = isPdf ? reportType.replace('_pdf', '') : reportType;

    let reportName;
    if (baseType === FSS_REPORT_REQUIREMENTS) {
        reportName = `Project Requirements Report${isPdf ? ' (PDF)' : ''}`;
    } else if (baseType === FSS_REPORT_USERSTORIES) {
        reportName = `Project User Stories Report${isPdf ? ' (PDF)' : ''}`;
    } else {
        reportName = 'Generated Report';
        serverLogger.warn(`[${SERVICE_NAME}] Unknown report type: ${reportType}`);
    }

    const reportID = uuid();
    const dateTimeStr = new Date().toISOString().replace('T', ' ').split('.')[0];
    const params = [reportID, projectID, `${reportName}-${dateTimeStr}`, reportType, dateTimeStr];

    try {
        await db.run(
            `INSERT INTO reports (reportID, projectID, reportName, reportType, reportDate) VALUES (?, ?, ?, ?, ?)`,
            params
        );
        serverLogger.info(`[${SERVICE_NAME}] Report record inserted: ${reportID}`);
        return reportID;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'insertReportRecord', 'Failed to insert report record', err);
    }
}

async function queryReportName(projectID, reportID) {
    try {
        const row = await db.get(
            `SELECT reportName FROM reports WHERE projectID = ? AND reportID = ?`,
            [projectID, reportID]
        );
        return row ? row.reportName : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'queryReportName', `Failed to query report name: ${reportID}`, err);
    }
}

async function deleteReportRecord(projectID, reportID) {
    try {
        await db.run(
            `DELETE FROM reports WHERE projectID = ? AND reportID = ?`,
            [projectID, reportID]
        );

        await minioClient.removeObject(bucket, `project/${projectID}/reports/${reportID}`);

        serverLogger.info(`[${SERVICE_NAME}] Deleted report: ${reportID}`);
        return { successful: true };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'deleteReportRecord', `Failed to delete report: ${reportID}`, err);
    }
}

async function getFileContext(projectID, documentID) {
    try {
        const row = await db.get(
            `SELECT * FROM documents WHERE projectID = ? AND documentID = ?`,
            [projectID, documentID]
        );

        if (!row) return 'Context is not available.';

        const { documentAlias, documentExt } = row;

        if (!documentAlias && documentExt !== '.txt') {
            return 'Context is not available.';
        }

        const objectPath = documentExt === '.txt'
            ? `project/${projectID}/${documentID}`
            : `project/${projectID}/alias/${documentAlias}`;

        const stream = await minioClient.getObject(bucket, objectPath);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks).toString('utf-8');

    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getFileContext', `Failed to get file context: ${documentID}`, err);
    }
}

async function testConnection() {
    try {
        return await minioClient.bucketExists(process.env.MINIO_BUCKET);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'testConnection', 'MinIO connection test failed', err);
    }
}

async function createAliasFile(projectID, documentID, documentExt) {
    try {
        const stream = await downloadProjectFile(projectID, documentID);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const data = await preprocessService.documentPreprocessing(buffer, documentExt);
        const aliasID = uuid();
        const textPath = `project/${projectID}/alias/${aliasID}`;
        const textBuffer = Buffer.from(data, 'utf-8');

        await minioClient.putObject(bucket, textPath, textBuffer, textBuffer.length, {
            'Content-Type': 'text/plain; charset=utf-8'
        });

        await db.run(
            `UPDATE documents SET documentAlias = ? WHERE projectID = ? AND documentID = ?`,
            [aliasID, projectID, documentID]
        );

        serverLogger.info(`[${SERVICE_NAME}] Created alias file: ${textPath}`);
        return { aliasID, minioPath: textPath, textLength: data.length };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'createAliasFile', `Failed to create alias for: ${documentID}`, err);
    }
}

module.exports = {
    createFolder,
    createProjectFolder,
    deleteProjectFile,
    deleteProjectFolder,
    deleteReportRecord,
    getFileStats,
    downloadProjectFile,
    downloadReport,
    FSS_REPORT_REQUIREMENTS,
    FSS_REPORT_REQUIREMENTS_PDF,
    FSS_REPORT_USERSTORIES,
    FSS_REPORT_USERSTORIES_PDF,
    getFileMetadata,
    getFileContext,
    init,
    insertFileData,
    insertReportRecord,
    listProjectFiles,
    listReportRecord,
    minioClient,
    queryReportName,
    renameProjectFile,
    saveGeneratedReport,
    testConnection,
    uploadFile,
    createAliasFile,
    uploadProjectFile,
    updateProfilePic,
    removeProfilePic,
    fetchProfilePics
};
