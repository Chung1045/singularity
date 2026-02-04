const credDBService = require("../services/credentialDBService");
const uuid = require("uuid-v4");
const dbService = require("../services/accountDBService");
const projectDBService = require("../services/projectDBService");
const notificationDBService = require("../services/notificationDBService");
const fss = require("../services/fsServices")
const express = require('express');
const {json} = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {apiAuthUser} = require("../services/accountDBService");
const fs = require('fs').promises;
const agentDB = require("../services/aiAgentDBService")

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

            // Create notification for project creation
            await notificationDBService.createProjectCreationNotification(
                data.projectID,
                req.userID,
                data.projectName
            );

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

        console.log(`✓ Authorization passed: User is project owner\n`);

        // Get project name before deletion for notification
        const projectName = await projectDBService.fetchProjectName(projectID);

        // Notify all collaborators before deleting
        await notificationDBService.notifyProjectDeleted(projectID, projectName, req.userID);

        const successful = await projectDBService.deleteProject(projectID);

        if (successful) {
            // Create notification for project deletion (for owner)
            await notificationDBService.createProjectDeletionNotification(
                projectID,
                req.userID,
                projectName
            );

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

        const successful = await projectDBService.renameProject(projectID, newProjectName);

        if (successful) {
            // Notify all collaborators about the rename
            await notificationDBService.notifyProjectRenamed(projectID, newProjectName);
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
        // operation: "invite" / "remove" / "cancel-invite" / "remove-invite"
        // }]

        if (projectID == null || shareOptions == null) {
            return res.status(400).json({ success: false, message: "Missing required field(s)" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
        const ownerID = await projectDBService.queryProjectOwner(projectID);

        if (ownerID !== userID) {
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        } else {
            await projectDBService.updateProjectShare(projectID, shareOptions);

            // Send notifications to owner for each operation
            for (const option of shareOptions) {
                const { uid, operation } = option;

                if (operation === "invite") {
                    await notificationDBService.notifyOwnerInviteSent(projectID, ownerID, uid);
                } else if (operation === "remove") {
                    await notificationDBService.notifyOwnerRemovedCollaborator(projectID, ownerID, uid);
                }
            }

            return res.status(200).json({ success: true, message: "Project sharing updated successfully" });
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }

})

/** POST Get project share details
 * @param {string} projectID - UUID of the project (required)
 * @example
 * // Request body:
 * {
 *   "projectID": "f3342960-06b7-4875-8081-e962c83b23a4"
 * }
 *
 * // Success response:
 * {
 *   "success": true,
 *   "owner": {
 *     "uid": "owner-id",
 *     "username": "john_doe",
 *     "displayName": "John Doe",
 *     "email": "john@example.com"
 *   },
 *   "collaborators": [...],
 *   "pendingInvites": [...]
 * }
 */
router.post('/project/share/details', async (req, res) => {
    try {
        console.log("New request /project/share/details");
        const { projectID } = req.body;

        if (!projectID) {
            return res.status(400).json({ success: false, message: "projectID is required" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

        // Verify user is either project owner or collaborator
        const isCollaborator = await projectDBService.isProjectCollaborator(projectID, userID);
        if (!isCollaborator) {
            return res.status(403).json({ success: false, message: "Unauthorized - must be project owner or collaborator" });
        }

        // Get project share details
        const shareDetails = await projectDBService.getProjectShareDetails(projectID);

        // Check if user is the owner to determine if they can edit
        const projectOwnerID = await projectDBService.queryProjectOwner(projectID);
        const isOwner = projectOwnerID === userID;

        return res.status(200).json({
            success: true,
            owner: shareDetails.owner,
            collaborators: shareDetails.collaborators,
            pendingInvites: shareDetails.pendingInvites,
            isOwner: isOwner  // Let frontend know if user can edit
        });

    } catch (error) {
        console.error('Error in /project/share/details:', error);
        return res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
});


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
        return res.status(403).json({ successful: false, message: "Unable to fetch project user-stories" });
    }
});

module.exports = router;
