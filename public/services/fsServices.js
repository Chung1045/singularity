const Minio = require("minio");
const fs = require("fs");
const path = require("path");
const db = require("./db")

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

/**
 * Rename a file or folder (by copy + delete)
 */

async function checkExists(filePath) {
    return await minioClient.statObject(bucket, filePath)
        .then(() => true)
        .catch(err => {
            if (err.code === 'NotFound') return false;
            throw err; // unexpected error
        });
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
    minioClient
};

