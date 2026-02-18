const credDBService = require("../services/credentialDBService");
const uuid = require("uuid-v4");
const dbService = require("../services/accountDBService");
const projectDBService = require("../services/projectDBService");
const notifDB = require("../services/notificationDBService");
const fss = require("../services/fsServices")
const express = require('express');
const {json} = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {apiAuthUser} = require("../services/accountDBService");
const fs = require('fs').promises;
const agentDB = require("../services/aiAgentService/aiAgentDBService")

router.use(dbService.apiAuthUser);

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = './temp_uploads';
        // Create directory if it doesn't exist
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        } catch (err) {
            console.error('Error creating upload directory:', err);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB limit (adjust as needed)
    }
});

/** POST Create a new project
 * @param {string} projectName - Name of the project to create (required)
 * @example
 * // Request body:
 * {
 *   "projectName": "My New Project"
 * }
 *
 * // Success response:
 * {
 *   "success": true,
 *   "message": "successful"
 * }
 */

router.post('/project/create', async (req, res) => {
    try{
        console.log("New request /project/create")

        let formData = req.body;
        if (formData.projectName == null) {
            return res.status(400).json({ success: false, message: "projectName is required" });
        }

        const data = {
            projectID: uuid(),
            uid: req.userID,
            projectName: formData.projectName
        };

        let successful = await projectDBService.createProject(data)

        if (successful) {
            console.log("Project is created with ID:", data.projectID)

            // Return the new projectID and projectName so frontend can use it
            return res.status(200).json({
                success: true,
                message: 'successful',
                projectID: data.projectID,
                projectName: data.projectName
            });
        } else {
            return res.status(500).json({ success: false, message: 'Failed to create project in database' });
        }
    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }
});


/** DELETE project
 * @param {string} projectID - UUID of the project to delete (required)
 */
router.post('/project/delete', async (req, res) => {
    try {
        const { projectID } = req.body;

        console.log(`\n${'═'.repeat(60)}`);
        console.log(` DELETE PROJECT REQUEST`);
        console.log(`${'═'.repeat(60)}`);
        console.log(`   Project ID: ${projectID}`);
        console.log(`   User ID: ${req.userID}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        console.log(`${'═'.repeat(60)}\n`);

        if (projectID == null) {
            console.log(` Validation failed: Project ID is required\n`);
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }

        const projectOwner = await projectDBService.queryProjectOwner(projectID);

        if (projectOwner !== req.userID) {
            console.log(` Authorization failed: User ${req.userID} is not the owner of project ${projectID}`);
            console.log(`   Project owner: ${projectOwner}\n`);
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        console.log(`Authorization passed: User is project owner\n`);

        // Get project name before deletion for notification
        const projectName = await projectDBService.fetchProjectName(projectID);

        // Get all collaborators BEFORE deletion
        const collaborators = await projectDBService.fetchProjectCollaborator(projectID);

        // Notify all collaborators BEFORE deletion (while project still exists in DB)
        await notifDB.notifyCollaboratorsProjectDeleted(projectID, projectName, req.userID);

        const successful = await projectDBService.deleteProject(projectID);

        if (successful) {
            // Notify owner that they deleted the project
            await notifDB.notifyOwnerProjectDeleted(projectID, projectName, req.userID);

            // Send real-time notifications via Socket.io to kick collaborators
            const io = global.io;
            const userSockets = global.userSockets;

            console.log(`\n[Socket.io] Sending real-time deletion notifications (kick):`);
            console.log(`  Project: "${projectName}"`);

            if (io && userSockets) {
                let sentCount = 0;

                // Notify all collaborators - instant kick
                for (const collab of collaborators) {
                    if (collab.uid) {
                        const socketID = userSockets.get(collab.uid);
                        if (socketID) {
                            io.to(socketID).emit('projectDeleted', {
                                projectID,
                                projectName,
                                deletedByOwner: true
                            });
                            console.log(` Kicked collaborator (${collab.uid})`);
                            sentCount++;
                        } else {
                            console.log(` Collaborator not connected (${collab.uid})`);
                        }
                    }
                }

                console.log(`  Total kicked: ${sentCount} collaborator(s)\n`);
            } else {
                console.log(` Socket.io not available\n`);
            }

            console.log(`\n${'═'.repeat(60)}`);
            console.log(` API RESPONSE: Project deleted successfully`);
            console.log(`${'═'.repeat(60)}\n`);
            return res.status(200).json({ success: true, message: 'Project deleted successfully' });
        } else {
            console.log(`\n Deletion failed: Unknown error\n`);
            return res.status(500).json({ success: false, message: 'Failed to delete project' });
        }

    } catch (error) {
        console.error(`\n SERVER ERROR during project deletion:`, error);
        console.log(`${'═'.repeat(60)}\n`);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

/** Rename a project
 * @param {string} newprojectName - New name of the project (required)
 * @param {string} projectID - UUID of the project to rename (required)
 */

router.post('/project/rename', async (req, res) => {
    try {
        console.log("New request /project/rename");
        const { projectID, newProjectName } = req.body;

        if (newProjectName == null || projectID == null) {
            return res.status(400).json({ success: false, message: "New Project Name and project ID are required" });
        } else if (await projectDBService.queryProjectOwner(projectID) !== req.userID) {
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        // Get the old project name before renaming
        const oldProjectName = await projectDBService.fetchProjectName(projectID);

        const successful = await projectDBService.renameProject(projectID, newProjectName);

        if (successful) {
            // Notify owner and collaborators about the rename
            await notifDB.notifyProjectRenamed(projectID, oldProjectName, newProjectName, req.userID);

            // Get all collaborators to send real-time notifications
            const ownerUID = await projectDBService.queryProjectOwner(projectID);
            const collaborators = await projectDBService.fetchProjectCollaborator(projectID);

            // Send real-time notifications via Socket.io
            const io = global.io;
            const userSockets = global.userSockets;

            console.log(`\n[Socket.io] Sending real-time rename notifications:`);
            console.log(`  Project: "${oldProjectName}" → "${newProjectName}"`);

            if (io && userSockets) {
                let sentCount = 0;

                // Notify owner
                if (ownerUID) {
                    const ownerSocketID = userSockets.get(ownerUID);
                    if (ownerSocketID) {
                        io.to(ownerSocketID).emit('projectRenamed', {
                            projectID,
                            oldProjectName,
                            newProjectName,
                            changedByUserID: req.userID
                        });
                        console.log(` Sent to owner (${ownerUID})`);
                        sentCount++;
                    } else {
                        console.log(` Owner not connected (${ownerUID})`);
                    }
                }

                // Notify all collaborators
                for (const collab of collaborators) {
                    if (collab.uid) {
                        const socketID = userSockets.get(collab.uid);
                        if (socketID) {
                            io.to(socketID).emit('projectRenamed', {
                                projectID,
                                oldProjectName,
                                newProjectName,
                                changedByUserID: req.userID
                            });
                            console.log(` Sent to collaborator (${collab.uid})`);
                            sentCount++;
                        } else {
                            console.log(` Collaborator not connected (${collab.uid})`);
                        }
                    }
                }

                console.log(`  Total sent: ${sentCount} real-time notification(s)\n`);
            } else {
                console.log(`  Socket.io not available\n`);
            }

            console.log("Project renamed successfully");
            return res.status(200).json({ success: true, message: 'Project renamed successfully' });
        } else {
            return res.status(500).json({ success: false, message: 'Failed to rename project' });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

router.post('/project/list', apiAuthUser, async (req, res) => {
    try{
        console.log("New requests /project/list")
        let projects = await projectDBService.listProjects(req.userID)

        console.log(projects)

        return res.status(200).json({ success: true, projects });

    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }
});

/** POST Edit project sharing settings
 * @param {string} projectID - UUID of the project (required)
 * @param {Array<Object>} shareOptions - Array of share operations to perform (required)
 * @param {string} shareOptions[].uid - User ID to share with or remove
 * @param {string} shareOptions[].operation - Operation type: "invite", "remove", or "remove-invite"
 * @example
 * // Request body:
 * {
 *   "projectID": "f3342960-06b7-4875-8081-e962c83b23a4,
 *   "shareOptions": [
 *     { "uid": "257b31e2-be71-4cfd-8051-e37ec343fdfa", "operation": "invite" },
 *     { "uid": "9cb37a7f-b1fe-41dc-8064-7bbbed289f85", "operation": "remove" }
 *   ]
 * }
 */
router.post('/project/editShare', async (req, res) => {
    try {
        console.log("New requests /project/editShare")

        let {projectID, shareOptions} = req.body
        // shareOptions = [{
        // uid: xxxxxxxx,
        // operation: "invite" / "remove", "remove-invite"
        // }]

        if (projectID == null || shareOptions == null) {
            return res.status(400).json({ success: false, message: "Missing required field(s)" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
        if (await projectDBService.queryProjectOwner(projectID) !== userID) {
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        } else {
            await projectDBService.updateProjectShare(projectID, shareOptions)
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }

})


/** POST Upload a file to a project
 * @param {File} file - File to upload (required, sent as form-data)
 * @param {string} projectID - UUID of the project (required, sent as form-data)
 */
router.post("/project/file/upload", upload.single('file'), async(req, res) => {
    console.log("New request /project/file/upload");

    const { projectID } = req.body;
    const uploadedFile = req.file;

    if (projectID == null) {
        return res.status(400).json({ success: false, message: "projectID is required" });
    }

    // Helper function to safely delete temp file
    const cleanupTempFile = async () => {
        if (uploadedFile && uploadedFile.path) {
            try {
                const fs = require('fs').promises;
                await fs.unlink(uploadedFile.path);
                console.log(`Cleaned up temp file: ${uploadedFile.path}`);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting temp file:', err);
                }
            }
        }
    };

    if (!uploadedFile) {
        return res.status(400).json({ successful: false, message: "No file uploaded" });
    }

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for uploading file");
        await cleanupTempFile();
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

        if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
            await cleanupTempFile();
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        // Generate UUID for the document
        const documentID = uuid();

        // Extract filename and extension
        const fileExt = path.extname(uploadedFile.originalname); // e.g., ".pdf" (with dot)
        let documentName = path.basename(uploadedFile.originalname, fileExt); // e.g., "report" or "HELLO.pdf"

        // Clean any trailing dots from the filename (e.g., "HELLO.pdf." becomes "HELLO.pdf")
        documentName = documentName.replace(/\.+$/, '');

        // If the documentName already ends with the extension (e.g., "HELLO.pdf" and ext is ".pdf"),
        // remove it to avoid duplication (HELLO.pdf.pdf → HELLO.pdf)
        if (fileExt && documentName.toLowerCase().endsWith(fileExt.toLowerCase())) {
            documentName = documentName.substring(0, documentName.length - fileExt.length);
            // Clean trailing dots again after removing extension
            documentName = documentName.replace(/\.+$/, '');
        }

        console.log(`[FILE UPLOAD] Original: "${uploadedFile.originalname}" → Name: "${documentName}" Ext: "${fileExt}"`);

        // Upload file to MinIO (pass temp file path, not the file object)
        const result = await fss.uploadProjectFile(
            uploadedFile.path,  // This is the temp file path on disk
            projectID,
            documentID
        );

        // Clean up temp file after upload attempt
        await cleanupTempFile();

        if (result && result.successful) {
            // Save metadata to database AFTER successful MinIO upload
            await fss.insertFileData(projectID, documentID, documentName, fileExt);

            return res.json({
                successful: true,
                message: "File uploaded successfully",
                documentID: documentID,
                fileName: uploadedFile.originalname
            });
        } else {
            return res.status(500).json({
                successful: false,
                message: result?.message || "Failed to upload to storage"
            });
        }
    } catch (err) {
        console.error("Upload error:", err);
        await cleanupTempFile();
        return res.status(500).json({
            successful: false,
            message: "Upload failed: " + err.message
        });
    }
});

/** POST Rename an uploaded file in a project
 * @param {string} projectID - UUID of the project (required)
 * @param {string} documentID - UUID of the document to rename (required)
 * @param {string} newFileName - New file name for the document (required)
 */

router.post("/project/file/rename", async(req, res) => {
    console.log("New requests /project/file/rename")

    let { projectID, documentID, newFileName } = req.body // need to have file extension at back, for instance, sample.txt

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for renaming project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    if (projectID == null || documentID == null || newFileName == null) {
        return res.status(400).json({ success: false, message: "Missing required field(s)" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (! await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    } else {
        // Extract just the filename without extension
        // newFileName comes as "file1.pdf", need to split it
        const path = require('path');
        const fileExt = path.extname(newFileName); // e.g., ".pdf"
        let documentName = path.basename(newFileName, fileExt); // e.g., "file1"

        // Clean any trailing dots
        documentName = documentName.replace(/\.+$/, '');

        console.log(`[RENAME] Full: "${newFileName}" → Name: "${documentName}" Ext: "${fileExt}"`);

        if (await fss.renameProjectFile(projectID, documentID, documentName)) {
            return res.status(200).json({ successful: true });
        } else {
            return res.status(500).json({ successful: false, message: "Internal server error" });
        }
    }
})

/** POST Delete an uploaded file in a project
 * @param {string} projectID - UUID of the project (required)
 * @param {string} documentID - UUID of the document to delete (required)
 */
router.post("/project/file/delete", async(req, res) => {
    console.log("New requests /project/file/delete")
    let { projectID, documentID } = req.body // need to have file extension at back, for instance, sample.txt

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for deleting project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    if (projectID == null || documentID == null) {
        return res.status(400).json({ success: false, message: "Missing required field(s)" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (! await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    } else {
        if (await fss.deleteProjectFile(documentID, projectID)) {
            return res.status(200).json({ successful: true });
        } else {
            return res.status(500).json({ successful: false, message: "Internal server error" });
        }
    }
})

/** POST Download an uploaded file in a project
 * @param {string} projectID - UUID of the project (required)
 * @param {string} documentID - UUID of the document to download (required)
 */

router.post("/project/file/download", async (req, res) => {
    console.log("New request /project/file/download");

    const { projectID, documentID } = req.body;

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for downloading project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    if (projectID == null || documentID == null) {
        return res.status(400).json({ success: false, message: "Missing required field(s)" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        // First, get the file metadata from database to get the filename
        const fileMetadata = await fss.getFileMetadata(documentID, projectID);

        if (!fileMetadata) {
            return res.status(404).json({ successful: false, message: "File not found" });
        }

        const fileName = fileMetadata.documentName + fileMetadata.documentExt;

        // Then get the file stream from MinIO
        const stream = await fss.downloadProjectFile(projectID, documentID);

        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/octet-stream");

        stream.pipe(res);
    } catch (err) {
        console.error("Download failed:", err);
        res.status(500).send("Download failed");
    }
});

router.post("/project/file/stats", async (req, res) => {
    console.log("New request /project/file/stats");

    const { projectID, documentID } = req.body;

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for file stats");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    if (projectID == null || documentID == null) {
        return res.status(400).json({ success: false, message: "Missing required field(s)" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        const stats = await fss.getFileStats(projectID, documentID);
        return res.status(200).json({ successful: true, size: stats.size, lastModified: stats.lastModified });
    } catch (err) {
        console.error("Get file stats failed:", err);
        return res.status(500).json({ successful: false, message: "Failed to get file stats" });
    }
});

router.post("/project/file/list", async(req, res) => {
    console.log("New request /project/file/list");

    const { projectID } = req.body;
    const userID = req.userID;

    if (projectID == null) {
        return res.status(400).json({ success: false, message: "projectID is required" });
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let files = await fss.listProjectFiles(projectID);

        return res.status(200).json({ successful: true, files })

    } catch (err) {
        console.error("Download failed:", err);
        res.status(500).send("Download failed");
    }
})

/** List project reports
 * @param {string} projectID - UUID of the current project (required)
 *
 * return format:
 * {
 *  "successful":true,
 *  "reports":[{
 *      "reportID":"ec436183-a928-40a7-a9ab-40bd9141559f",
 *      "reportName":"Project User Stories Report-2026-01-01",
 *      "reportType":"userStories"}
 *  ]
 *  }
 */

router.post("/project/report/list", async(req, res) => {
    const { projectID } = req.body;

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for listing project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    if (projectID == null) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let reports = await fss.listReportRecord(projectID);
        console.log(`Results: ${reports}`)

        return res.status(200).json({ successful: true, reports: reports })

    } catch (err) {
        console.error("Unable to list out report record:", err);
        res.status(500).send("Internal Server Error, cannot list report record");
    }
})

/** DELETE project reports
 * @param {string} projectID - UUID of the current project (required)
 * @param {string} reportID - UUID of the report to delete (required)
 */

router.post("/project/report/delete", async(req, res) => {
    const { projectID, reportID } = req.body;

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for listing project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    if (projectID == null || reportID == null) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let result = await fss.deleteReportRecord(projectID, reportID);

        if (result) {
            return res.status(200).json({ successful: true })
        } else {
            return res.status(400).json({ successful: false, message: "Unable to delete report record" })
        }

    } catch (err) {
        console.error("Unable to delete report record:", err);
        res.status(500).send("Internal Server Error, unable to delete report record");
    }

})

/** POST Download a generated report in a project
 * @param {string} projectID - UUID of the project (required)
 * @param {string} reportID - UUID of the document to download (required)
 */

router.post("/project/report/download", async (req, res) => {
    console.log("New request /project/report/download");

    const { projectID, reportID } = req.body;

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for downloading project report");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    if (projectID == null || reportID == null) {
        return res.status(400).json({ success: false, message: "Missing required field(s)" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        const fileName = await fss.queryReportName(projectID, reportID) + `.docx`;

        // Then get the file stream from MinIO
        const stream = await fss.downloadReport(projectID, reportID);

        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/octet-stream");

        stream.pipe(res);
    } catch (err) {
        console.error("Download failed:", err);
        res.status(500).send("Download failed");
    }
});

router.post("/project/list/requirements", async (req, res) => {
    console.log("New request /project/report/download");

    const { projectID } = req.body;

    const userID = req.userID;

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        const requirementList = await agentDB.getProjectRequirements(projectID)
        return res.status(200).json({successful: true, reports: requirementList});
    } catch (err) {
        return res.status(403).json({ successful: false, message: "Unable to fetch project requirements" });
    }
});

router.post("/project/list/user-stories", async (req, res) => {

    const { projectID } = req.body;

    const userID = req.userID;

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        const requirementList = await agentDB.getProjectUserStories(projectID)
        return res.status(200).json({successful: true, reports: requirementList});
    } catch (err) {
        return res.status(400).json({ successful: false, message: "Unable to fetch project user-stories" });
    }
});

router.post("/project/delete/requirements", async (req, res) => {

    const userID = req.userID;
    let data = req.body;
    let projectID = data.projectID;
    let requirementID = data.requirementID;

    if (projectID == null || requirementID == null) {
        return res.status(400).json({ successful:false, message: "Missing field: Please provide a valid project ID and requirement ID" });
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    let success = await agentDB.deleteRequirement(requirementID, projectID)

    if (success) {
        return res.status(200).json({successful: true});
    } else {
        return res.status(400).json({ successful: false, message: "Unable to delete requirement from the project" });
    }

});

router.post("/project/delete/user-stories", async (req, res) => {
    const userID = req.userID;
    let data = req.body;
    let projectID = data.projectID;
    let storyID = data.storyID;

    if (projectID == null || storyID == null) {
        return res.status(400).json({ successful:false, message: "Missing field: Please provide a valid project ID and story ID" });
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    let success = await agentDB.deleteUserStory(storyID, projectID)

    if (success) {
        return res.status(200).json({successful: true});
    } else {
        return res.status(400).json({ successful: false, message: "Unable to delete user story from the project" });
    }
});

/** POST Get project collaborators and invitations
 * @param {string} projectID - UUID of the project (required)
 * @returns {Object} owner, collaborators, pendingInvites
 */
router.post("/project/collaborators", async (req, res) => {
    console.log("New request /project/collaborators");

    const { projectID } = req.body;
    const userID = req.userID;

    if (!projectID) {
        return res.status(400).json({ success: false, message: "projectID is required" });
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const fss = require('../services/fsServices');

    try {
        // Get project owner
        const ownerUID = await projectDBService.queryProjectOwner(projectID);
        const ownerQuery = `SELECT uid as userID, userName as username, userEmail as email, firstName, lastName, googleAvatarUrl FROM user WHERE uid = ?`;

        const owner = await new Promise((resolve, reject) => {
            const db = require('../services/db');
            db.get(ownerQuery, [ownerUID], async (err, row) => {
                if (err) reject(err);
                else {
                    if (row) {
                        // Fetch profile picture from MinIO
                        let profilePic = null;
                        try {
                            const pics = await fss.fetchProfilePics([row.userID]);
                            profilePic = pics[0]?.image || row.googleAvatarUrl || null;
                        } catch (err) {
                            console.log('Could not fetch profile pic for owner, using googleAvatarUrl');
                            profilePic = row.googleAvatarUrl || null;
                        }

                        resolve({
                            userID: row.userID,
                            displayName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.username,
                            username: row.username,
                            email: row.email,
                            profilePicture: profilePic
                        });
                    } else {
                        resolve(null);
                    }
                }
            });
        });

        // Get confirmed collaborators
        const collabQuery = `
            SELECT u.uid as userID, u.userName as username, u.userEmail as email, u.firstName, u.lastName, u.googleAvatarUrl
            FROM projectShare ps
            JOIN user u ON ps.collabUid = u.uid
            WHERE ps.projectID = ? AND ps.confirmed = 1
        `;

        const collaborators = await new Promise((resolve, reject) => {
            const db = require('../services/db');
            db.all(collabQuery, [projectID], async (err, rows) => {
                if (err) reject(err);
                else {
                    // Fetch profile pictures from MinIO for all collaborators
                    const userIDs = rows.map(row => row.userID);
                    let profilePics = {};

                    if (userIDs.length > 0) {
                        try {
                            const pics = await fss.fetchProfilePics(userIDs);
                            pics.forEach(pic => {
                                profilePics[pic.userID] = pic.image;
                            });
                        } catch (err) {
                            console.log('Could not fetch profile pics for collaborators');
                        }
                    }

                    const collabs = rows.map(row => ({
                        userID: row.userID,
                        displayName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.username,
                        username: row.username,
                        email: row.email,
                        profilePicture: profilePics[row.userID] || row.googleAvatarUrl || null
                    }));
                    resolve(collabs);
                }
            });
        });

        // Get pending invitations
        const inviteQuery = `
            SELECT ps.shareID as inviteID, u.uid as userID, u.userName as username, u.userEmail as email, u.firstName, u.lastName, u.googleAvatarUrl
            FROM projectShare ps
            JOIN user u ON ps.collabUid = u.uid
            WHERE ps.projectID = ? AND ps.confirmed = 0
        `;

        const pendingInvites = await new Promise((resolve, reject) => {
            const db = require('../services/db');
            db.all(inviteQuery, [projectID], async (err, rows) => {
                if (err) reject(err);
                else {
                    // Fetch profile pictures from MinIO for all pending invites
                    const userIDs = rows.map(row => row.userID);
                    let profilePics = {};

                    if (userIDs.length > 0) {
                        try {
                            const pics = await fss.fetchProfilePics(userIDs);
                            pics.forEach(pic => {
                                profilePics[pic.userID] = pic.image;
                            });
                        } catch (err) {
                            console.log('Could not fetch profile pics for pending invites');
                        }
                    }

                    const invites = rows.map(row => ({
                        inviteID: row.inviteID,
                        userID: row.userID,
                        displayName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.username,
                        username: row.username,
                        email: row.email,
                        profilePicture: profilePics[row.userID] || row.googleAvatarUrl || null,
                        status: 'pending'
                    }));
                    resolve(invites);
                }
            });
        });

        return res.status(200).json({
            success: true,
            owner,
            collaborators,
            pendingInvites,
            currentUserID: userID  // Include current user ID to determine if they are the owner
        });

    } catch (error) {
        console.error("Error fetching collaborators:", error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

/** POST Search users to invite
 * @param {string} projectID - UUID of the project (required)
 * @param {string} query - Search query string (required)
 * @returns {Array} users - Array of user objects matching the search
 */
router.post("/project/search-users", async (req, res) => {
    console.log("New request /project/search-users");

    const { projectID, query } = req.body;
    const userID = req.userID;

    if (!projectID || !query) {
        return res.status(400).json({ success: false, message: "projectID and query are required" });
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    try {
        const fss = require('../services/fsServices');

        const searchQuery = `
            SELECT uid as userID, userName as username, userEmail as email, firstName, lastName, googleAvatarUrl
            FROM user
            WHERE (
                userName LIKE ? OR 
                userEmail LIKE ? OR 
                firstName LIKE ? OR 
                lastName LIKE ?
            )
            AND uid != ?
            AND uid NOT IN (
                SELECT collabUid FROM projectShare WHERE projectID = ?
            )
            AND uid != (SELECT projectOwnerUid FROM project WHERE projectID = ?)
            LIMIT 10
        `;

        const searchPattern = `%${query}%`;
        const ownerUID = await projectDBService.queryProjectOwner(projectID);

        const users = await new Promise((resolve, reject) => {
            const db = require('../services/db');
            db.all(searchQuery, [searchPattern, searchPattern, searchPattern, searchPattern, ownerUID, projectID, projectID], async (err, rows) => {
                if (err) reject(err);
                else {
                    // Fetch profile pictures from MinIO for all search results
                    const userIDs = rows.map(row => row.userID);
                    let profilePics = {};

                    if (userIDs.length > 0) {
                        try {
                            const pics = await fss.fetchProfilePics(userIDs);
                            pics.forEach(pic => {
                                profilePics[pic.userID] = pic.image;
                            });
                        } catch (err) {
                            console.log('Could not fetch profile pics for search results');
                        }
                    }

                    const results = rows.map(row => ({
                        userID: row.userID,
                        displayName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.username,
                        profilePicture: profilePics[row.userID] || row.googleAvatarUrl || null,
                        username: row.username,
                        email: row.email
                    }));
                    resolve(results);
                }
            });
        });

        return res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        console.error("Error searching users:", error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

/** POST Send invitation to a user
 * @param {string} projectID - UUID of the project (required)
 * @param {string} invitedUserId - UUID of the user to invite (required)
 */
router.post("/project/invite", async (req, res) => {
    console.log("New request /project/invite");

    const { projectID, invitedUserId } = req.body;
    const userID = req.userID;

    if (!projectID || !invitedUserId) {
        return res.status(400).json({ success: false, message: "projectID and invitedUserId are required" });
    }

    // Check if requester is project owner
    const ownerUID = await projectDBService.queryProjectOwner(projectID);
    if (ownerUID !== userID) {
        return res.status(403).json({ success: false, message: "Only project owner can invite collaborators" });
    }

    try {
        // Check if user already invited or is collaborator
        const checkQuery = `SELECT * FROM projectShare WHERE projectID = ? AND collabUid = ?`;

        const db = require('../services/db');
        const exists = await new Promise((resolve, reject) => {
            db.get(checkQuery, [projectID, invitedUserId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (exists) {
            return res.status(400).json({ success: false, message: "User already invited or is a collaborator" });
        }

        // Create invitation
        const inviteQuery = `INSERT INTO projectShare (shareID, projectID, collabUid, confirmed) VALUES (?, ?, ?, ?)`;
        const shareID = uuid();

        await new Promise((resolve, reject) => {
            db.run(inviteQuery, [shareID, projectID, invitedUserId, 0], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        // Send notification to invited user
        await notifDB.setupProjectShareNotification(projectID, invitedUserId);

        // Notify owner that they sent an invitation
        await notifDB.notifyOwnerInvitationSent(projectID, userID, invitedUserId);

        console.log(`[Invitation] Database notifications created successfully`);

        // Send real-time socket notifications AFTER database writes complete
        const io = global.io;
        const userSockets = global.userSockets;
        
        console.log(`\n[Socket.io] Sending invitation notifications:`);
        console.log(`  Project: ${projectID}`);
        console.log(`  From (Owner): ${userID}`);
        console.log(`  To (Invited): ${invitedUserId}`);
        console.log(`  Owner UID type: ${typeof userID}`);
        console.log(`  Invited UID type: ${typeof invitedUserId}`);
        
        if (io && userSockets) {
            console.log(`  Total connected users: ${userSockets.size}`);
            console.log(`  All connected UIDs:`, Array.from(userSockets.keys()));
            
            // Notify the invited user
            const invitedSocketID = userSockets.get(invitedUserId);
            console.log(`  Looking for invited user socket: ${invitedUserId} -> ${invitedSocketID}`);
            if (invitedSocketID) {
                io.to(invitedSocketID).emit('newInvitation', {
                    projectID: projectID,
                    from: userID
                });
                console.log(`SENT 'newInvitation' to invited user (${invitedUserId}) socket ${invitedSocketID}`);
            } else {
                console.log(`INVITED USER NOT CONNECTED (${invitedUserId}) - They will see notification on next page load/poll`);
            }
            
            // Notify the owner
            const ownerSocketID = userSockets.get(userID);
            console.log(`  Looking for owner socket: ${userID} -> ${ownerSocketID}`);
            if (ownerSocketID) {
                io.to(ownerSocketID).emit('invitationSent', {
                    projectID: projectID,
                    to: invitedUserId
                });
                console.log(`SENT 'invitationSent' to owner (${userID}) socket ${ownerSocketID}`);
            } else {
                console.log(`OWNER NOT CONNECTED (${userID})`);
            }
        } else {
            console.log(`Socket.io not available`);
        }
        console.log(``);

        console.log(`Invitation sent: ${invitedUserId} to project ${projectID}`);

        return res.status(200).json({
            success: true,
            message: "Invitation sent successfully"
        });

    } catch (error) {
        console.error("Error sending invitation:", error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

/** POST Remove a collaborator from project
 * @param {string} projectID - UUID of the project (required)
 * @param {string} userId - UUID of the user to remove (required)
 */
router.post("/project/remove-collaborator", async (req, res) => {
    console.log("New request /project/remove-collaborator");

    const { projectID, userId } = req.body;
    const userID = req.userID;

    if (!projectID || !userId) {
        return res.status(400).json({ success: false, message: "projectID and userId are required" });
    }

    // Check if requester is project owner
    const ownerUID = await projectDBService.queryProjectOwner(projectID);
    if (ownerUID !== userID) {
        return res.status(403).json({ success: false, message: "Only project owner can remove collaborators" });
    }

    try {
        // Get project name and user info before removal
        const projectName = await projectDBService.fetchProjectName(projectID);

        const db = require('../services/db');
        const removedUser = await new Promise((resolve, reject) => {
            db.get('SELECT userName FROM user WHERE uid = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const deleteQuery = `DELETE FROM projectShare WHERE projectID = ? AND collabUid = ?`;

        await new Promise((resolve, reject) => {
            db.run(deleteQuery, [projectID, userId], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        // Send notification to removed collaborator
        await notifDB.setProjectShareRemoveNotification(projectID, userId);

        // Notify owner that they removed a collaborator
        await notifDB.notifyOwnerCollaboratorRemoved(projectID, userID, userId);

        // Send real-time notification via Socket.io to removed collaborator
        const io = global.io;
        const userSockets = global.userSockets;

        console.log(`\n[Socket.io] Sending removal notification (kick):`);
        console.log(`  User: ${removedUser?.userName || userId}`);
        console.log(`  Project: "${projectName}"`);

        if (io && userSockets) {
            const socketID = userSockets.get(userId);
            if (socketID) {
                io.to(socketID).emit('removedFromProject', {
                    projectID,
                    projectName,
                    removedByOwner: true
                });
                console.log(`Sent removal alert to user (${userId})`);
            } else {
                console.log(`User not connected (${userId})`);
            }
        } else {
            console.log(`Socket.io not available`);
        }
        console.log();

        console.log(`Collaborator removed: ${userId} from project ${projectID}`);

        return res.status(200).json({
            success: true,
            message: "Collaborator removed successfully"
        });

    } catch (error) {
        console.error("Error removing collaborator:", error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

/** POST Remove a pending invitation
 * @param {string} projectID - UUID of the project (required)
 * @param {string} inviteId - UUID of the invitation to remove (required)
 */
router.post("/project/remove-invite", async (req, res) => {
    console.log("New request /project/remove-invite");

    const { projectID, inviteId } = req.body;
    const userID = req.userID;

    if (!projectID || !inviteId) {
        return res.status(400).json({ success: false, message: "projectID and inviteId are required" });
    }

    // Check if requester is project owner
    const ownerUID = await projectDBService.queryProjectOwner(projectID);
    if (ownerUID !== userID) {
        return res.status(403).json({ success: false, message: "Only project owner can remove invitations" });
    }

    try {
        // Get user ID from invitation before deleting
        const db = require('../services/db');
        const invitation = await new Promise((resolve, reject) => {
            db.get(`SELECT collabUid FROM projectShare WHERE shareID = ? AND projectID = ?`, [inviteId, projectID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const deleteQuery = `DELETE FROM projectShare WHERE shareID = ? AND projectID = ?`;

        await new Promise((resolve, reject) => {
            db.run(deleteQuery, [inviteId, projectID], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        // Remove related notification if exists
        if (invitation && invitation.collabUid) {
            await notifDB.removeProjectInvitationNotification(projectID, invitation.collabUid);
        }

        console.log(`Invitation removed: ${inviteId} from project ${projectID}`);

        return res.status(200).json({
            success: true,
            message: "Invitation removed successfully"
        });

    } catch (error) {
        console.error("Error removing invitation:", error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

/** POST Accept a pending invitation
 * @param {string} projectID - UUID of the project (required)
 * @param {string} inviteId - UUID of the invitation to accept (required)
 */
router.post("/project/accept-invite", async (req, res) => {
    console.log("New request /project/accept-invite");

    const { projectID, inviteId } = req.body;
    const userID = req.userID;

    if (!projectID || !inviteId) {
        return res.status(400).json({ success: false, message: "projectID and inviteId are required" });
    }

    try {
        // Verify the invitation exists and belongs to this user
        const verifyQuery = `SELECT * FROM projectShare WHERE shareID = ? AND projectID = ? AND collabUid = ?`;

        const db = require('../services/db');
        const invitation = await new Promise((resolve, reject) => {
            db.get(verifyQuery, [inviteId, projectID, userID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!invitation) {
            return res.status(404).json({ success: false, message: "Invitation not found or unauthorized" });
        }

        // Update invitation to confirmed
        const updateQuery = `UPDATE projectShare SET confirmed = 1 WHERE shareID = ?`;

        await new Promise((resolve, reject) => {
            db.run(updateQuery, [inviteId], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`Invitation accepted: ${inviteId} for project ${projectID}`);

        return res.status(200).json({
            success: true,
            message: "Invitation accepted successfully"
        });

    } catch (error) {
        console.error("Error accepting invitation:", error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

module.exports = router;
