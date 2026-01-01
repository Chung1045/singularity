const Minio = require("minio");
const fs = require("fs");
const path = require("path");
const db = require("./db")
const uuid = require("uuid-v4");

const FSS_REPORT_USERSTORIES = "userStories";
const FSS_REPORT_REQUIREMENTS = "requirements";

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_END_POINT,
    port: process.env.MINIO_PORT,
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
            console.log("Bucket does not exist. Creating...");
            await minioClient.makeBucket(bucket, "us-east-1");
            console.log("Bucket created.");
        } else {
            console.log("Bucket already exists.");
        }
    } catch (err) {
        console.error("Bucket error:", err);
    }
};

/**
 * Create a folder (or empty object) inside bucket
 */
async function createFolder(folderName) {
    if (!folderName.endsWith("/")) folderName += "/";
    try {
        await minioClient.putObject(bucket, folderName, "");
        console.log(`Created folder: ${folderName}`);
    } catch (err) {
        console.error("Unable to create folder:", err);
    }
}

async function createProjectFolder(projectID) {
    try {
        let path = `project/${projectID}/`
        await minioClient.putObject(bucket, path, "");
        console.log(`Created folder for projectID ${projectID}: ${path}`);
    } catch (err) {
        console.error("Unable to create folder:", err);
    }
}

/**
 * Delete Project and all its contents
 */

async function deleteProjectFolder(projectID) {
    let path = `project/${projectID}/`

    const objectsToDelete = [];
    const stream = minioClient.listObjects(bucket, path, true);

    return new Promise((resolve, reject) => {
        stream.on("data", obj => objectsToDelete.push(obj.name));
        stream.on("error", err => reject(err));
        stream.on("end", async () => {
            try {
                if (objectsToDelete.length > 0) {
                    await minioClient.removeObjects(bucket, objectsToDelete);
                    console.log(`Deleted ${objectsToDelete.length} object(s) in folder: ${path}`);
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}


/**
 * Upload a file
 */
async function uploadFile(localPath, objectName) {
    try {
        await minioClient.fPutObject(bucket, objectName, localPath);
        console.log(`Uploaded ${objectName}`);
        await fs.unlinkSync(localPath);
        return {
            successful: true,
            path: `${localPath}/objectName`
        }
    } catch (err) {
        console.error("Upload error:", err);
    }
}

async function uploadProjectFile(tempFilePath, projectID, documentID) {
    try {
        const pathName = `project/${projectID}/${documentID}`;

        await minioClient.fPutObject(bucket, pathName, tempFilePath);
        console.log(`Uploaded ${pathName}`);

        // Don't insert file data here - do it in the route after upload succeeds
        return {
            successful: true,
            path: pathName
        };
    } catch (err) {
        console.error("Upload error:", err);
        return {
            successful: false,
            message: err.message
        };
    }
}

async function insertFileData(projectID, documentID, documentName, documentExt) {
    const sql = `
        INSERT INTO documents (documentID, projectID, documentName, documentExt)
        VALUES (?, ?, ?, ?)
    `;

    try {
        await db.run(sql, [documentID, projectID, documentName, documentExt]);
        console.log(`Inserted file metadata: ${documentID}`);
        return { successful: true };
    } catch (err) {
        console.error("Database insert error:", err);
        throw err;
    }
}

/**
 * Download a file
 */

async function downloadProjectFile(projectID, documentID) {
    try {
        const objectPath = `project/${projectID}/${documentID}`;
        return await minioClient.getObject(bucket, objectPath);
    } catch (err) {
        console.error("Download error:", err);
        throw err;
    }
}

/**
 * Delete file path
 */
async function deleteProjectFile(documentID, projectID) {
    try {
        // Delete from MinIO first
        const objectPath = `project/${projectID}/${documentID}`;
        await minioClient.removeObject(bucket, objectPath);
        console.log(`Deleted from MinIO: ${objectPath}`);

        // Delete from database
        const sql = `
            DELETE FROM documents WHERE documentID = ? AND projectID = ?
        `;

        await db.run(sql, [documentID, projectID]);
        console.log(`Deleted from DB: ${documentID}`);

        return {
            successful: true,
        };
    } catch (err) {
        console.error("Delete error:", err);
        return {
            successful: false,
            message: err.message
        };
    }
}

async function listProjectFiles(projectID) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT documentID, documentName, documentExt
            FROM documents
            WHERE projectID = ?
            ORDER BY documentName
        `;

        db.all(sql, [projectID], (err, rows) => {
            if (err) {
                console.error('Error in listProjectFiles2 query:', err);
                return reject(err);
            }
            console.log(`🔍 Project ID ${projectID} Files:`, rows);
            resolve(rows);
        });
    });
}

async function renameProjectFile(projectID, documentID, newFileName) {
    return new Promise((resolve, reject) => {

        const sql = `
            UPDATE documents 
            SET documentName = ?
            WHERE documentID = ? AND projectID = ?
        `;

        db.run(sql, [newFileName, documentID, projectID], function(err) {  // Use db.run for UPDATE
            if (err) {
                console.error('Error in renameProjectFiles2:', err);
                return reject(err);
            }

            console.log(`✏️ Renamed document ${documentID} to: ${newFileName}`);
            console.log(`   Changes made: ${this.changes}`);

            resolve(true);
        });
    });
}

async function getFileMetadata(documentID, projectID) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT documentID, documentName, documentExt
            FROM documents
            WHERE documentID = ? AND projectID = ?
        `;

        db.get(sql, [documentID, projectID], (err, row) => {
            if (err) {
                console.error('Error in getFileMetadata:', err);
                return reject(err);
            }
            resolve(row); // Will be undefined if not found
        });
    });
}

async function filePreProcessing(projectID, documentID, fileExt){

    switch (fileExt) {
        case 'doc':
        case 'docx':
        // convert to pdf pipeline + extract

        case 'pdf':
            // extract text from pdf

        case 'mp3':
            // whisper pipeline

        default:
            // unrecognized file format
    }

}

async function saveGeneratedReport(projectID, buffer, kind) {
    try {

        const reportID = await insertReportRecord(projectID, kind)
        const pathName = `project/${projectID}/reports/${reportID}`;

        // Use putObject for buffer data
        await minioClient.putObject(bucket, pathName, buffer, buffer.length, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        console.log(`Uploaded ${pathName}`);

        return {
            successful: true,
            path: pathName,
        };
    } catch (err) {
        console.error("Upload error:", err);
        return {
            successful: false,
            message: err.message
        };
    }
}

async function listReportRecord(projectID) {
    const sql = `SELECT reportID, reportName, reportType FROM reports WHERE projectID = ?`;

    return new Promise((resolve, reject) => {
        db.all(sql, [projectID], (err, rows) => {
            if (err) {
                console.error("Error fetching report records:", err);
                reject(err);
            } else {
                resolve(rows); // rows is already an array of objects (JSON-ready)
            }
        });
    });
}

async function insertReportRecord(projectID, reportType) {
    const sql = `INSERT INTO reports (reportID, projectID, reportName, reportType, reportDate)
                 VALUES (?, ?, ?, ?, ?)`;

    let reportName;

    if (reportType === FSS_REPORT_REQUIREMENTS) {
        reportName = "Project Requirements Report"
    } else if (reportType === FSS_REPORT_USERSTORIES) {
        reportName = "Project User Stories Report"
    }

    const reportID = uuid();
    const dateStr = new Date().toISOString().split('T')[0];

    const params = [
        reportID,
        projectID,
        `${reportName}-${dateStr}`,
        reportType,
        dateStr
    ]

    await db.run(sql, params, (err) => {
        if (err) {
            console.error("Error inserting report record:", err);
        }
    });

    return reportID;
}

async function deleteReportRecord(projectID, reportID) {
    try {
        const objectPath = `project/${projectID}/reports/${reportID}`;
        await minioClient.removeObject(bucket, objectPath);

        const sql = `DELETE
                     FROM reports
                     WHERE projectID = ?
                       AND reportID = ?`;

        return new Promise((resolve, reject) => {
            db.run(sql, [projectID, reportID], function (err) {
                if (err) {
                    console.error("Error deleting report record:", err);
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        deletedCount: this.changes
                    });
                }
            });
        });
    } catch (err) {
        console.error("Report deletion error:", err);
        return {
            successful: false,
            message: err.message
        };
    }
}

async function testConnection() {
    return await minioClient.bucketExists(process.env.MINIO_BUCKET);
}

init()

module.exports = {
    init,
    createFolder,
    createProjectFolder,
    uploadFile,
    uploadProjectFile,
    insertFileData,
    downloadProjectFile,
    deleteProjectFile,
    renameProjectFile,
    deleteProjectFolder,
    listProjectFiles,
    getFileMetadata,
    testConnection,
    saveGeneratedReport,
    insertReportRecord,
    listReportRecord,
    deleteReportRecord,
    minioClient,
    FSS_REPORT_USERSTORIES,
    FSS_REPORT_REQUIREMENTS
};

