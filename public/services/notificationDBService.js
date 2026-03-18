const uuid = require("uuid-v4");
const db = require("./db");
const projectDB = require("./projectDBService")
const { serverLogger } = require("./loggingService");
const ServiceError = require("../errors/ServiceError");

const SERVICE_NAME = 'NotificationDBService';

async function getUserName(userID) {
    try {
        const row = await db.get('SELECT userName FROM user WHERE uid = ?', [userID]);
        return row ? row.userName : 'User';
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getUserName', 'Failed to fetch username', err);
    }
}

async function insertNotification(receiveUid, kind, projectID, message) {
    const sql = `
        INSERT INTO notification (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    try {
        await db.run(sql, [uuid(), receiveUid, Date.now(), kind, projectID, message, false]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'insertNotification', 'Failed to insert notification', err);
    }
}

async function setupProjectShareNotification(projectID, collaboratorID) {
    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        await insertNotification(collaboratorID, 'invitation', projectID, `You are invited to join ${projectName}`);
        serverLogger.info(`[${SERVICE_NAME}] Invitation notification created for user ${collaboratorID}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'setupProjectShareNotification', 'Failed to setup invite notification', err);
    }
}

async function removeProjectInvitationNotification(projectID, collaboratorID) {
    const sql = `DELETE FROM notification WHERE projectID = ? AND receiveUid = ? AND kind = 'invitation'`;
    try {
        await db.run(sql, [projectID, collaboratorID]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'removeProjectInvitationNotification', 'Failed to remove invitation notification', err);
    }
}


async function setProjectShareRemoveNotification(projectID, collaboratorID) {
    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        await insertNotification(collaboratorID, 'remove', projectID, `You have been removed from the project ${projectName}`);
        serverLogger.info(`[${SERVICE_NAME}] Removal notification created for user ${collaboratorID}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'setProjectShareRemoveNotification', 'Failed to setup remove notification', err);
    }
}

async function processProjectInvitationResponse(notificationID, response) {
    try {
        const notification = await db.get(
            `SELECT projectID, receiveUid FROM notification WHERE notifID = ?`,
            [notificationID]
        );

        if (!notification) {
            throw new ServiceError(SERVICE_NAME, 'processProjectInvitationResponse', 'Notification not found');
        }

        const { projectID, receiveUid } = notification;
        const ownerUID = await projectDB.queryProjectOwner(projectID);

        switch (response) {
            case 'accept':
                await db.run(
                    `UPDATE projectShare SET confirmed = 1 WHERE projectID = ? AND collabUid = ?`,
                    [projectID, receiveUid]
                );
                await removeNotification(notificationID);
                if (ownerUID) await notifyOwnerInvitationAccepted(projectID, ownerUID, receiveUid);
                await notifyCollaboratorJoined(projectID, receiveUid);
                return { successful: true, message: 'Accepted invitation' };

            case 'reject':
                await db.run(
                    `DELETE FROM projectShare WHERE projectID = ? AND collabUid = ?`,
                    [projectID, receiveUid]
                );
                await removeNotification(notificationID);
                if (ownerUID) await notifyOwnerInvitationDeclined(projectID, ownerUID, receiveUid);
                await notifyCollaboratorDeclined(projectID, receiveUid);
                return { successful: true, message: 'Rejected invitation' };

            default:
                throw new ServiceError(SERVICE_NAME, 'processProjectInvitationResponse', `Invalid response type: ${response}`);
        }
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'processProjectInvitationResponse', 'Failed to process invitation response', err);
    }
}

async function markNotificationRead(notifID) {
    try {
        await db.run(`UPDATE notification SET isRead = true WHERE notifID = ?`, [notifID]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'markNotificationRead', 'Failed to mark notification as read', err);
    }
}

async function removeNotification(notifID) {
    try {
        await db.run(`DELETE FROM notification WHERE notifID = ?`, [notifID]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'removeNotification', 'Failed to remove notification', err);
    }
}

async function getNotificationRecipient(notifID) {
    try {
        const row = await db.get(`SELECT receiveUid FROM notification WHERE notifID = ?`, [notifID]);
        return row ? row.receiveUid : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getNotificationRecipient', 'Failed to fetch notification recipient', err);
    }
}

async function getAllNotifications(userID) {
    try {
        return await db.all(`SELECT * FROM notification WHERE receiveUid = ?`, [userID]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getAllNotifications', 'Failed to fetch notifications', err);
    }
}

async function createProjectDeletionNotification(projectID, userID, projectName) {
    try {
        await insertNotification(userID, 'delete', null, `Project "${projectName}" has been deleted`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'createProjectDeletionNotification', 'Failed to create deletion notification', err);
    }
}

// Notify owner when they send an invitation
async function notifyOwnerInvitationSent(projectID, ownerID, invitedUserID) {
    try {
        const [projectName, invitedUsername] = await Promise.all([
            projectDB.fetchProjectName(projectID),
            getUserName(invitedUserID)
        ]);
        await insertNotification(ownerID, 'invitation', projectID, `You invited @${invitedUsername} to join ${projectName}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyOwnerInvitationSent', 'Failed to notify owner of invitation', err);
    }
}

// Notify owner when invitation is accepted
async function notifyOwnerInvitationAccepted(projectID, ownerID, acceptedUserID) {
    try {
        const [projectName, acceptedUsername] = await Promise.all([
            projectDB.fetchProjectName(projectID),
            getUserName(acceptedUserID)
        ]);
        await insertNotification(ownerID, 'invitation', projectID, `@${acceptedUsername} accepted your invitation to ${projectName}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyOwnerInvitationAccepted', 'Failed to notify owner of acceptance', err);
    }
}

// Notify collaborator when they successfully join
async function notifyCollaboratorJoined(projectID, collaboratorID) {
    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        await insertNotification(collaboratorID, 'invitation', projectID, `You have successfully joined ${projectName}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyCollaboratorJoined', 'Failed to notify collaborator of join', err);
    }
}

// Notify owner when invitation is declined
async function notifyOwnerInvitationDeclined(projectID, ownerID, declinedUserID) {
    try {
        const [projectName, declinedUsername] = await Promise.all([
            projectDB.fetchProjectName(projectID),
            getUserName(declinedUserID)
        ]);
        await insertNotification(ownerID, 'invitation', projectID, `@${declinedUsername} declined your invitation to ${projectName}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyOwnerInvitationDeclined', 'Failed to notify owner of decline', err);
    }
}

// Notify collaborator when they decline an invitation
async function notifyCollaboratorDeclined(projectID, collaboratorID) {
    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        await insertNotification(collaboratorID, 'invitation', projectID, `You declined the invitation to ${projectName}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyCollaboratorDeclined', 'Failed to notify collaborator of decline', err);
    }
}

// Notify owner when they remove a collaborator
async function notifyOwnerCollaboratorRemoved(projectID, ownerID, removedUserID) {
    try {
        const [projectName, removedUsername] = await Promise.all([
            projectDB.fetchProjectName(projectID),
            getUserName(removedUserID)
        ]);
        await insertNotification(ownerID, 'remove', projectID, `You removed @${removedUsername} from ${projectName}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyOwnerCollaboratorRemoved', 'Failed to notify owner of removal', err);
    }
}

// Notify owner and collaborators when project is renamed
async function notifyProjectRenamed(projectID, oldProjectName, newProjectName, changedByUserID) {
    try {
        const [changedByUsername, ownerUID, collaborators] = await Promise.all([
            getUserName(changedByUserID),
            projectDB.queryProjectOwner(projectID),
            db.all('SELECT collabUid FROM projectShare WHERE projectID = ? AND confirmed = 1', [projectID])
        ]);

        const recipients = [
            ...(ownerUID ? [ownerUID] : []),
            ...collaborators.map(r => r.collabUid)
        ];

        for (const uid of recipients) {
            const message = uid === changedByUserID
                ? `You renamed project "${oldProjectName}" to "${newProjectName}"`
                : `@${changedByUsername} renamed project "${oldProjectName}" to "${newProjectName}"`;
            await insertNotification(uid, 'rename', projectID, message);
        }

        serverLogger.info(`[${SERVICE_NAME}] Created ${recipients.length} rename notification(s) for project ${projectID}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyProjectRenamed', 'Failed to send rename notifications', err);
    }
}

// Notify all collaborators when project is deleted
// Notify owner when they delete a project
async function notifyOwnerProjectDeleted(projectID, projectName, ownerID) {
    try {
        await insertNotification(ownerID, 'delete', null, `You deleted project "${projectName}"`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyOwnerProjectDeleted', 'Failed to notify owner of deletion', err);
    }
}

async function notifyCollaboratorsProjectDeleted(projectID, projectName, deletedByUserID) {
    try {
        const collaborators = await db.all(
            'SELECT collabUid FROM projectShare WHERE projectID = ? AND confirmed = 1',
            [projectID]
        );

        for (const { collabUid } of collaborators) {
            await insertNotification(collabUid, 'delete', null, `Project "${projectName}" has been deleted by the owner`);
        }

        serverLogger.info(`[${SERVICE_NAME}] Created ${collaborators.length} deletion notification(s) for project ${projectID}`);
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(SERVICE_NAME, 'notifyCollaboratorsProjectDeleted', 'Failed to notify collaborators of deletion', err);
    }
}


module.exports = {
    setProjectShareRemoveNotification,
    removeProjectInvitationNotification,
    setupProjectShareNotification,
    processProjectInvitationResponse,
    markNotificationRead,
    removeNotification,
    getNotificationRecipient,
    getAllNotifications,
    createProjectDeletionNotification,
    notifyOwnerInvitationSent,
    notifyOwnerInvitationAccepted,
    notifyOwnerInvitationDeclined,
    notifyOwnerCollaboratorRemoved,
    notifyCollaboratorJoined,
    notifyCollaboratorDeclined,
    notifyProjectRenamed,
    notifyOwnerProjectDeleted,
    notifyCollaboratorsProjectDeleted
}
