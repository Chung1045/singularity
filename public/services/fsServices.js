const Minio = require("minio");
const fs = require("fs").promises;
const path = require("path");
const db = require("./db")
const uuid = require("uuid-v4");
const {PDFParse} = require("pdf-parse");
const docx_pdf = require('docx-pdf');
const os = require("os");

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
        stream.on("error", err => {
            console.error(`   ❌ Error listing MinIO objects:`, err);
            reject(err);
        });
        stream.on("end", async () => {
            try {
                if (objectsToDelete.length > 0) {
                    console.log(`   📁 Found ${objectsToDelete.length} file(s) in MinIO:`);

                    // Group files by type for cleaner output
                    const filesByType = {};
                    objectsToDelete.forEach(fileName => {
                        const parts = fileName.split('/');
                        const folder = parts.length > 2 ? parts[1] : 'root';
                        if (!filesByType[folder]) {
                            filesByType[folder] = [];
                        }
                        filesByType[folder].push(parts[parts.length - 1]);
                    });

                    // Log grouped files
                    Object.keys(filesByType).forEach(folder => {
                        console.log(`      - ${folder}/: ${filesByType[folder].length} file(s)`);
                        if (filesByType[folder].length <= 5) {
                            // Show individual files if 5 or fewer
                            filesByType[folder].forEach(file => {
                                console.log(`         • ${file}`);
                            });
                        }
                    });

                    await minioClient.removeObjects(bucket, objectsToDelete);
                    console.log(`   ✓ Successfully deleted ${objectsToDelete.length} file(s) from MinIO`);
                } else {
                    console.log(`   ℹ️  No files found in MinIO path: ${path}`);
                }
                resolve();
            } catch (err) {
                console.error(`   ❌ Error deleting MinIO objects:`, err);
                reject(err);
            }
        });
    });
}

// TODO: New, need testing
async function updateProfilePic(userID, uploadedFile) {
    try {
        const objectPath = `user/${userID}`;

        // Check if we have a compressed buffer or need to read from file
        let buffer;
        let contentType = uploadedFile.mimetype || 'image/jpeg';

        if (uploadedFile.buffer) {
            // Use the compressed buffer if available
            buffer = uploadedFile.buffer;
            console.log(`📦 Using compressed buffer (${buffer.length} bytes)`);
        } else {
            // Fallback: read from file path
            buffer = await fs.readFile(uploadedFile.path);
            console.log(`📁 Reading from file path (${buffer.length} bytes)`);
        }

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
        console.log(`✅ Uploaded profile pic for user ${userID}`);

        // Delete temporary file if it exists
        if (uploadedFile.path) {
            await fs.unlink(uploadedFile.path);
            console.log(`🗑️ Deleted temp file: ${uploadedFile.path}`);
        }

        return {
            successful: true,
            path: objectPath
        };
    } catch (err) {
        console.error("❌ Upload error:", err);

        // Try to clean up temp file even if upload failed
        if (uploadedFile.path) {
            try {
                await fs.unlink(uploadedFile.path);
            } catch (cleanupErr) {
                console.error("Failed to cleanup temp file:", cleanupErr);
            }
        }

        return {
            successful: false,
            error: err.message
        };
    }
}

async function removeProfilePic(userID) {
    const objectPath = `user/${userID}`;
    await minioClient.removeObject(bucket, objectPath);
    console.log(`Deleted from MinIO: ${objectPath}`);

    return true;
}

async function fetchProfilePics(userIDs) {
    const promises = userIDs.map(async (userID) => {
        try {
            const objectPath = `user/${userID}`;
            const stream = await minioClient.getObject(bucket, objectPath);

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            return {
                userID,
                image: `data:image/jpeg;base64,${buffer.toString('base64')}`,
                mimeType: 'image/jpeg', // or detect from file
            };
        } catch (error) {
            console.log("User avatar is not found, returning a generic one")
            return {
                userID,
                image: null,
                mimeType: 'image/jpeg'
            };
        }
    });

    return await Promise.all(promises);
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

        // Only create alias for supported document types (PDF and DOCX)
        // Audio files (.mp3, .m4a, .mp4) will be handled separately by audio processing pipeline
        const extLower = documentExt.toLowerCase();
        console.log(`Checking if alias needed for extension: ${documentExt} (lowercase: ${extLower})`);

        if (extLower === ".pdf" || extLower === ".docx") {
            console.log(`Creating alias file for document type: ${extLower}`);
            await createAliasFile(projectID, documentID, documentExt);
        } else {
            console.log(`Skipping alias creation for non-document type: ${extLower}`);
        }

        return {successful: true};
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
        const getAliasSql = `
            SELECT documentAlias
            FROM documents
            WHERE documentID = ?
              AND projectID = ?
        `;

        const doc = await new Promise((resolve, reject) => {
            db.get(getAliasSql, [documentID, projectID], function (err, row) {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        console.log(`Result:`, doc);
        console.log(`documentAlias value:`, doc?.documentAlias);

        // Delete the original file from MinIO
        const objectPath = `project/${projectID}/${documentID}`;
        await minioClient.removeObject(bucket, objectPath);
        console.log(`Deleted from MinIO: ${objectPath}`);

        // Delete the alias file if it exists
        if (doc && doc.documentAlias) {
            console.log("inside - deleting alias");
            const aliasPath = `project/${projectID}/alias/${doc.documentAlias}`;
            await minioClient.removeObject(bucket, aliasPath);
            console.log(`Deleted alias from MinIO: ${aliasPath}`);
        } else {
            console.log("No alias to delete or doc not found");
        }

        console.log("Outside")

        const deleteSql = `
            DELETE
            FROM documents
            WHERE documentID = ?
              AND projectID = ?
        `;

        await new Promise((resolve, reject) => {
            db.run(deleteSql, [documentID, projectID], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });

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
            WHERE documentID = ?
              AND projectID = ?
        `;

        db.run(sql, [newFileName, documentID, projectID], function (err) {  // Use db.run for UPDATE
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
            WHERE documentID = ?
              AND projectID = ?
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
    const sql = `SELECT reportID, reportName, reportType
                 FROM reports
                 WHERE projectID = ?`;

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

async function downloadReport(projectID, reportID) {
    try {
        const objectPath = `project/${projectID}/reports/${reportID}`;
        console.log(`Attempting to fetch ${objectPath}`)
        return await minioClient.getObject(bucket, objectPath);
    } catch (err) {
        console.error("Download error:", err);
        throw err;
    }
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
    const now = new Date();
    const dateTimeStr = now.toISOString().replace('T', ' ').split('.')[0];

    const params = [
        reportID,
        projectID,
        `${reportName}-${dateTimeStr}`,
        reportType,
        dateTimeStr
    ]

    await db.run(sql, params, (err) => {
        if (err) {
            console.error("Error inserting report record:", err);
        }
    });

    return reportID;
}

async function queryReportName(projectID, reportID) {
    const sql = `SELECT reportName
                 FROM reports
                 WHERE projectID = ?
                   AND reportID = ?`;

    return new Promise((resolve, reject) => {
        db.get(sql, [projectID, reportID], (err, row) => {
            if (err) {
                console.error("Error querying report name:", err);
                reject(err);
            } else {
                resolve(row ? row.reportName : null);
            }
        });
    });
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

async function extractPDFFromStream(buffer) {
    const parser = new PDFParse({data: buffer});

    try {
        const result = await parser.getText();
        console.log(`Parsed data: ${result.text}`);
        return result.text;
    } finally {
        await parser.destroy();
    }
}

async function extractDOCXFromStream(buffer) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docx-'));
    const docxFilename = crypto.randomUUID() + '.docx';
    const pdfFilename = crypto.randomUUID() + '.pdf';
    const inputPath = path.join(tempDir, docxFilename);
    const outputPath = path.join(tempDir, pdfFilename);

    try {
        await fs.writeFile(inputPath, buffer);

        await new Promise((resolve, reject) => {
            docx_pdf(inputPath, outputPath, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        const pdfBuffer = await fs.readFile(outputPath);

        // Extract text from converted PDF
        const parser = new PDFParse({data: pdfBuffer});
        const result = await parser.getText();
        await parser.destroy();

        return result.text;
    } finally {
        await fs.rm(tempDir, {recursive: true, force: true});
    }
}

async function createAliasFile(projectID, documentID, documentExt) {
    // Download the file
    const stream = await downloadProjectFile(projectID, documentID);
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Extract text based on document type
    let extractedText = "";

    switch (documentExt.toLowerCase()) {
        case ".docx":
            extractedText = await extractDOCXFromStream(buffer);
            break;
        case ".pdf":
            extractedText = await extractPDFFromStream(buffer);
            break;
        default:
            throw new Error(`Unsupported document type: ${documentExt}`);
    }

    // Generate alias ID and path
    const aliasID = uuid();
    const textPath = `project/${projectID}/alias/${aliasID}`;

    // Save extracted text to MinIO
    const textBuffer = Buffer.from(extractedText, 'utf-8');
    await minioClient.putObject(bucket, textPath, textBuffer, textBuffer.length, {
        'Content-Type': 'text/plain; charset=utf-8'
    });

    console.log(`Saved extracted text to: ${textPath}`);

    // Update database with alias ID
    const sql = `UPDATE documents
                 SET documentAlias = ?
                 WHERE projectID = ?
                   AND documentID = ?`;

    await db.run(sql, [aliasID, projectID, documentID]);

    console.log(`Updated database: documentID=${documentID}, aliasID=${aliasID}`);

    return {
        aliasID: aliasID,
        minioPath: textPath,
        textLength: extractedText.length
    };
}

async function getFileContext(projectID, documentID) {
    const sql = `SELECT *
                 FROM documents
                 WHERE projectID = ?
                   AND documentID = ?`;

    console.log(`Parameter: projectID: ${projectID}, documentID: ${documentID}`);

    // Wrap db.all in a promise
    const result = await new Promise((resolve, reject) => {
        db.all(sql, [projectID, documentID], (err, rows) => {
            if (err) {
                console.error("Query error:", err);
                return reject(err);
            }
            resolve(rows);
        });
    });

    console.log("DB result:", result);
    console.log("DB result length:", result?.length);

    if (!result || result.length === 0) {
        console.log("No rows found");
        return `Context is not available.`;
    }

    console.log("First row:", result[0]);

    const documentAlias = result[0].documentAlias;
    console.log("Document alias:", documentAlias);

    if (!documentAlias) {
        console.log("Document alias is null/empty");
        return `Context is not available.`;
    }

    const objectPath = `project/${projectID}/alias/${documentAlias}.txt`;
    console.log("Fetching from MinIO:", objectPath);

    const stream = await minioClient.getObject(bucket, objectPath);

    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    const content = Buffer.concat(chunks).toString('utf-8');
    console.log("Content length:", content.length);

    return content;
}

async function testConnection() {
    return await minioClient.bucketExists(process.env.MINIO_BUCKET);
}

init()




module.exports = {
    createFolder,
    createProjectFolder,
    deleteProjectFile,
    deleteProjectFolder,
    deleteReportRecord,
    downloadProjectFile,
    downloadReport,
    FSS_REPORT_REQUIREMENTS,
    FSS_REPORT_USERSTORIES,
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
    uploadProjectFile,
    updateProfilePic,
    removeProfilePic,
    fetchProfilePics
};

