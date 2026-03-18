const db = require("./db");
const fss = require("./fsServices")
const uuid = require("uuid-v4")
const { serverLogger } = require("./loggingService");
const ServiceError = require("../errors/ServiceError");

const SERVICE_NAME = 'ProjectDBService';

async function listProjects(uid) {
    const sql = `
        SELECT projectID, projectName
        FROM project
        WHERE projectOwnerUid = ?
        UNION
        SELECT p.projectID, p.projectName
        FROM project p
        JOIN projectShare ps ON ps.projectID = p.projectID
        WHERE ps.collabUid = ? AND ps.confirmed = 1
    `;

    try {
        return await db.all(sql, [uid, uid]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'listProjects', 'Failed to list projects', err);
    }
}

async function createProject(data) {
    const sql = `INSERT INTO project (projectID, projectOwnerUid, projectName, dateCreate) VALUES (?, ?, ?, ?)`;
    const params = [data.projectID, data.uid, data.projectName, new Date().toISOString()];

    try {
        await db.run(sql, params);
        await fss.createProjectFolder(data.projectID);
        serverLogger.info(`[${SERVICE_NAME}:createProject] Project created: ${data.projectID}`);
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'createProject', 'Failed to create project', err);
    }
}

async function deleteProject(projectID) {
    serverLogger.info(`[${SERVICE_NAME}:deleteProject] Starting deletion for project: ${projectID}`);

    try {
        // Cascade delete child records
        const storyIDs = (await db.all('SELECT storyID FROM userStories WHERE projectID = ?', [projectID])).map(r => r.storyID);
        if (storyIDs.length > 0) {
            const ph = storyIDs.map(() => '?').join(',');
            await deleteFromTable('userStorySource', `storyID IN (${ph})`, storyIDs);
        }

        const reqIDs = (await db.all('SELECT requirementsID FROM requirements WHERE projectID = ?', [projectID])).map(r => r.requirementsID);
        if (reqIDs.length > 0) {
            const ph = reqIDs.map(() => '?').join(',');
            await deleteFromTable('requirementsSource', `requirementsID IN (${ph})`, reqIDs);
            await deleteFromTable('requirementsStoryRef', `requirementsID IN (${ph})`, reqIDs);
        }

        const docIDs = (await db.all('SELECT documentID FROM documents WHERE projectID = ?', [projectID])).map(r => r.documentID);
        if (docIDs.length > 0) {
            const ph = docIDs.map(() => '?').join(',');
            await deleteFromTable('conversationDocRef', `documentID IN (${ph})`, docIDs);
        }

        const chatIDs = (await db.all('SELECT chatID FROM chat WHERE projectID = ?', [projectID])).map(r => r.chatID);
        if (chatIDs.length > 0) {
            const ph = chatIDs.map(() => '?').join(',');
            const convIDs = (await db.all(`SELECT conversationID FROM conversation WHERE chatID IN (${ph})`, chatIDs)).map(r => r.conversationID);
            if (convIDs.length > 0) {
                const convPh = convIDs.map(() => '?').join(',');
                await deleteFromTable('response', `conversationID IN (${convPh})`, convIDs);
                await deleteFromTable('conversationDocRef', `conversationID IN (${convPh})`, convIDs);
            }
            await deleteFromTable('conversation', `chatID IN (${ph})`, chatIDs);
        }

        await deleteFromTable('userStories', 'projectID = ?', [projectID]);
        await deleteFromTable('requirements', 'projectID = ?', [projectID]);
        await deleteFromTable('chat', 'projectID = ?', [projectID]);
        await deleteFromTable('documents', 'projectID = ?', [projectID]);
        await deleteFromTable('reports', 'projectID = ?', [projectID]);
        await deleteFromTable('voiceAnalysis', 'projectID = ?', [projectID]);
        await deleteFromTable('projectShare', 'projectID = ?', [projectID]);
        await deleteFromTable('notification', 'projectID = ?', [projectID]);

        // Delete MinIO files
        await fss.deleteProjectFolder(projectID);

        // Delete project itself
        await db.run('DELETE FROM project WHERE projectID = ?', [projectID]);

        serverLogger.info(`[${SERVICE_NAME}:deleteProject] Project deleted successfully: ${projectID}`);
        return true;

    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'deleteProject', `Failed to delete project: ${projectID}`, err);
    }
}

async function renameProject(projectID, newProjectName) {
    const sql = `UPDATE project SET projectName = ? WHERE projectID = ?`;

    try {
        const result = await db.run(sql, [newProjectName, projectID]);
        if (result.changes === 0) {
            throw new ServiceError(SERVICE_NAME, 'renameProject', `Project not found: ${projectID}`);
        }
        serverLogger.info(`[${SERVICE_NAME}:renameProject] Renamed project: ${projectID}`);
        return true;
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'renameProject', 'Failed to rename project', err);
    }
}

async function queryProjectOwner(projectID) {
    const sql = `SELECT projectOwnerUid FROM project WHERE projectID = ? LIMIT 1`;

    try {
        const row = await db.get(sql, [projectID]);
        return row ? row.projectOwnerUid : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'queryProjectOwner', 'Failed to query project owner', err);
    }
}

async function updateProjectShare(projectID, shareOptions) {
    const sql_invite = `INSERT INTO projectShare (shareID, projectID, collabUid, confirmed) VALUES (?, ?, ?, ?)`;
    const sql_delete = `DELETE FROM projectShare WHERE projectID = ? AND collabUid = ?`;

    try {
        for (const { uid, operation } of shareOptions) {
            switch (operation) {
                case 'invite':
                    await db.run(sql_invite, [uuid(), projectID, uid, 0]);
                    await setupProjectShareNotification(projectID, uid);
                    serverLogger.info(`[${SERVICE_NAME}:updateProjectShare] Invited uid: ${uid}`);
                    break;
                case 'remove':
                case 'remove-invite':
                    await db.run(sql_delete, [projectID, uid]);
                    if (operation === 'remove') {
                        await setProjectShareRemoveNotification(projectID, uid);
                    }
                    serverLogger.info(`[${SERVICE_NAME}:updateProjectShare] Removed uid: ${uid}`);
                    break;
                default:
                    serverLogger.warn(`[${SERVICE_NAME}:updateProjectShare] Unknown operation: ${operation}`);
            }
        }
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'updateProjectShare', 'Failed to update project share', err);
    }
}

async function isProjectCollaborator(projectID, userID) {
    const sql = `
        SELECT collabUid AS uid FROM projectShare
        WHERE projectID = ? AND collabUid = ? AND confirmed = 1
        UNION ALL
        SELECT projectOwnerUid AS uid FROM project
        WHERE projectID = ? AND projectOwnerUid = ?
            LIMIT 1
    `;
    try {
        const row = await db.get(sql, [projectID, userID, projectID, userID]);
        return !!row;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'isProjectCollaborator', 'Failed to check collaborator', err);
    }
}

async function fetchProjectCollaborator(projectID) {
    const sql = `
        SELECT user.firstName, user.lastName, user.userName, user.uid
        FROM projectShare ps
                 JOIN user ON ps.collabUid = user.uid
        WHERE ps.projectID = ?
    `;
    try {
        return await db.all(sql, [projectID]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'fetchProjectCollaborator', 'Failed to fetch collaborators', err);
    }
}

async function fetchProjectName(projectID) {
    const sql = `SELECT projectName FROM project WHERE projectID = ?`;

    try {
        const row = await db.get(sql, [projectID]);
        return row ? row.projectName : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'fetchProjectName', 'Failed to fetch project name', err);
    }
}

async function setupProjectShareNotification(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    try {
        const projectName = await fetchProjectName(projectID);
        await db.run(sql, [
            uuid(), collaboratorID, Date.now(),
            'invitation', projectID,
            `You are invited to join ${projectName}`, false
        ]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'setupProjectShareNotification', 'Failed to setup invite notification', err);
    }
}

async function setProjectShareRemoveNotification(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    try {
        const projectName = await fetchProjectName(projectID);
        await db.run(sql, [
            uuid(), collaboratorID, Date.now(),
            'remove', projectID,
            `You have been removed from the project ${projectName}`, false
        ]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'setProjectShareRemoveNotification', 'Failed to setup remove notification', err);
    }
}

module.exports = {
    listProjects,
    createProject,
    deleteProject,
    renameProject,
    updateProjectShare,
    queryProjectOwner,
    isProjectCollaborator,
    fetchProjectCollaborator,
    fetchProjectName
}
