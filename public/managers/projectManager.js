const credDBService = require("../services/credentialDBService");
const uuid = require("uuid-v4");
const dbService = require("../services/accountDBService");
const projectDBService = require("../services/projectDBService");
const express = require('express');
const {json} = require("express");
const router = express.Router();

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

module.exports = router;
