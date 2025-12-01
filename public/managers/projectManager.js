const credDBService = require("../services/credentialDBService");
const uuid = require("uuid-v4");
const dbService = require("../services/accountDBService");
const projectDBService = require("../services/projectDBService");
const fss = require("../services/fsServices")
const express = require('express');
const {json} = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

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
        fileSize: 50 * 1024 * 1024 // 50MB limit (adjust as needed)
    }
});

router.post('/project/create', async (req, res) => {
    try{
        console.log("New requests /project/create")

        if (!req.cookies.session_id) {
            console.log("❌ Unauthorized attempt for creating project");
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

        let formData = req.body

        console.log(formData)

        const data = {
            projectID: uuid(),
            uid: userID,
            projectName: formData.projectName
        };

        let successful = await projectDBService.createProject(data)

        if (successful) {
            console.log("Project is created")
        }
    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }
    return res.status(200).json({ success: true, message: 'successful' });
});

router.post('/project/delete', async (req, res) => {
    try {
        console.log("New request /project/delete");

        if (!req.cookies.session_id) {
            console.log("❌ Unauthorized attempt for deleting project");
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
        const { projectID } = req.body;

        if (!projectID) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        } else if (await projectDBService.queryProjectOwner(projectID) !== userID) {
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const successful = await projectDBService.deleteProject(projectID);

        if (successful) {
            console.log("Project deleted successfully");
            return res.status(200).json({ success: true, message: 'Project deleted successfully' });
        } else {
            return res.status(500).json({ success: false, message: 'Failed to delete project' });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: `Server Error: ${error}` });
    }
});

router.post('/project/rename', async (req, res) => {
    try {
        console.log("New request /project/rename");

        if (!req.cookies.session_id) {
            console.log("❌ Unauthorized attempt for renaming project");
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
        const { projectID, newProjectName } = req.body;

        if (!newProjectName || !projectID) {
            return res.status(400).json({ success: false, message: "New Project Name and project ID are required" });
        } else if (await projectDBService.queryProjectOwner(projectID) !== userID) {
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const successful = await projectDBService.renameProject(projectID, newProjectName);

        if (successful) {
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

router.post('/project/list', async (req, res) => {
    try{
        console.log("New requests /project/list")

        if (!req.cookies.session_id) {
            console.log("❌ Unauthorized attempt for creating project");
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

        let projects = await projectDBService.listProjects(userID)

        console.log(projects)

        return res.status(200).json({ success: true, projects });

    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }
    return res.status(200).json({ success: true, message: 'successful' });
});

router.post('/project/editShare', async (req, res) => {

    try {

        console.log("New requests /project/editShare")

        if (!req.cookies.session_id) {
            console.log("❌ Unauthorized attempt for editing project share");
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        let {projectID, shareOptions} = req.body
        // shareOptions = [{
        // uid: xxxxxxxx,
        // operation: "invite" / "remove", "remove-invite"
        // }]

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

router.post("/project/file/upload", upload.single('file'), async(req, res) => {
    console.log("New request /project/file/upload");

    const { projectID } = req.body;
    const uploadedFile = req.file;

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
        const fileExt = path.extname(uploadedFile.originalname); // e.g., ".pdf"
        const documentName = path.basename(uploadedFile.originalname, fileExt); // e.g., "report"

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

router.post("/project/file/rename", async(req, res) => {
    console.log("New requests /project/file/rename")

    let { projectID, documentID, newFileName } = req.body // need to have file extension at back, for instance, sample.txt

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for renaming project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (! await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    } else {
        if (await fss.renameProjectFile(projectID, documentID, newFileName)) {
            return res.status(200).json({ successful: true });
        } else {
            return res.status(500).json({ successful: false, message: "Internal server error" });
        }
    }
})

router.post("/project/file/delete", async(req, res) => {
    console.log("New requests /project/file/delete")
    let { projectID, documentID } = req.body // need to have file extension at back, for instance, sample.txt

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for deleting project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
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

router.post("/project/file/download", async (req, res) => {
    console.log("New request /project/file/download");

    const { projectID, documentID } = req.body;

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for downloading project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
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

    if (!req.cookies.session_id) {
        console.log("Unauthorized attempt for listing project documents");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

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


module.exports = router;
