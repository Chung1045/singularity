const Minio = require("minio");
const fs = require("fs");
const path = require("path");

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_END_POINT,
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_SSL,
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
        return {
            successful: true,
            path: `${localPath}/objectName`
        }
    } catch (err) {
        console.error("Upload error:", err);
    }
}

/**
 * Download a file
 */
async function downloadFile(objectName, localPath) {
    try {
        await minioClient.fGetObject(bucket, objectName, localPath);
        console.log(`Downloaded ${objectName} to ${localPath}`);
    } catch (err) {
        console.error("Download error:", err);
    }
}

/**
 * Delete file/folder by path
 */
async function deleteContent(objectName) {
    if (objectName.endsWith("/")) {
        await deleteFolder(objectName);
    } else {
        await deleteObject(objectName);
    }
}

/**
 * Rename a file or folder (by copy + delete)
 */
async function renameContent(oldName, newName) {
    try {
        // Copy object
        await minioClient.copyObject(bucket, newName, `${bucket}/${oldName}`);
        // Delete old object
        await deleteContent(oldName);
        console.log(`Renamed ${oldName} -> ${newName}`);
    } catch (err) {
        console.error("Rename error:", err);
    }
}

async function checkExists(filePath) {
    return await minioClient.statObject(bucket, filePath)
        .then(() => true)
        .catch(err => {
            if (err.code === 'NotFound') return false;
            throw err; // unexpected error
        });
}

async function listObjectContent(path) {
    if (!path.endsWith("/")) {
        path += "/";
    }

    const objectsStream = minioClient.listObjects(bucket, path, true); // recursive = true
    const files = [];

    return new Promise((resolve, reject) => {
        objectsStream.on("data", obj => {
            if (!obj.name.endsWith("/")) { // skip folder placeholders
                files.push(obj.name);
            }
        });
        objectsStream.on("error", err => reject(err));
        objectsStream.on("end", () => resolve(files));
    });
}

module.exports = {
    init,
    createFolder,
    createProjectFolder,
    uploadFile,
    downloadFile,
    deleteContent,
    renameContent,
    deleteProjectFolder,
    minioClient
};

