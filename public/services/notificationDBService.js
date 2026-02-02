const uuid = require("uuid-v4");
const db = require("./db");
const projectDB = require("./projectDBService")

async function setupProjectShareNotification(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        const now = new Date();
        const dateTimeStr = now.toISOString().replace('T', ' ').split('.')[0];

        const params = [
            uuid(),
            collaboratorID,
            dateTimeStr,
            "invitation",
            projectID,
            `You are invited to join ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Notification setup failed:", err);
        return false;
    }
}

async function removeProjectInvitationNotification(projectID, collaboratorID) {
    const sql = `
        DELETE FROM notification
        WHERE projectID = ? AND receiveUid = ?
    `;

    try {
        const [result] = await db.run(sql, [projectID, collaboratorID]);

        return {
            successful: true,
        };

    } catch (err) {
        console.error("Error removing project invitation notification:", err);
        return { successful: false, error: err };
    }
}


async function setProjectShareRemoveNotification(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        const now = new Date();
        const dateTimeStr = now.toISOString().replace('T', ' ').split('.')[0];

        const params = [
            uuid(),
            collaboratorID,
            dateTimeStr,
            "remove",
            projectID,
            `You have been removed from the project ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Notification setup failed:", err);
        return false;
    }
}

async function processProjectInvitationResponse(notificationID, response) {
    try {
        // Load the notification
        const [rows] = await db.run(
            `SELECT projectID, receiveUid FROM notification WHERE notifID = ?`,
            [notificationID]
        );

        if (rows.length === 0) {
            return { successful: false, message: "Notification not found" };
        }

        const { projectID, receiveUid } = rows[0];

        switch (response) {
            case "accept":
                await db.run(
                    `UPDATE projectShare SET confirmed = true WHERE projectID = ? AND collabUid = ?`,
                    [projectID, receiveUid]
                );

                await removeNotification(notificationID);

                return { successful: true, message: "Accepted invitation" };

            case "reject":
                await db.run(
                    `DELETE FROM projectShare WHERE projectID = ? AND collabUid = ?`,
                    [projectID, receiveUid]
                );
                await removeNotification(notificationID);

                return { successful: true, message: "Rejected Invitation" };

            default:
                return { successful: false, message: "Invalid response type" };
        }

    } catch (err) {
        console.error("Error processing invitation response:", err);
        return { successful: false, error: err };
    }
}

async function markNotificationRead(notifID) {
    const sql = `
        UPDATE notification 
        SET isRead = true
        WHERE notifID = ?
    `;

    try {
        await db.run(sql, [notifID]);
        return { successful: true };
    } catch (err) {
        console.error("Error marking notification read:", err);
        return { successful: false, error: err };
    }
}

async function removeNotification(notifID) {
    const sql = `
        DELETE FROM notification
        WHERE notifID = ?
    `;

    try {
        await db.run(sql, [notifID]);
        return { successful: true };
    } catch (err) {
        console.error("Error removing notification:", err);
        return { successful: false, error: err };
    }
}

async function getNotificationRecipient(notifID) {
    const sql = `SELECT receiveUid FROM notification WHERE notifID = ?`;

    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [notifID], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (rows.length === 0) {
            return { successful: false, message: "Notification not found" };
        }

        return { successful: true, receiveUid: rows[0].receiveUid };

    } catch (err) {
        console.error("Error fetching notification recipient:", err);
        return { successful: false, error: err };
    }
}

async function getAllNotifications(userID) {
    const sql = `SELECT * FROM notification WHERE receiveUid = ?`;

    try {
        return await new Promise((resolve, reject) => {
            db.all(sql, [userID], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

    } catch (err) {
        console.error("Error fetching notification recipient:", err);
        return { successful: false, error: err };
    }

}

async function createProjectCreationNotification(projectID, userID, projectName) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const now = Date.now(); // Use milliseconds timestamp

        const params = [
            uuid(),
            userID,
            now,
            "create",
            projectID,
            `Project "${projectName}" has been created successfully`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting project creation notification:", err);
                    return reject(err);
                }
                console.log("Project creation notification created successfully");
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Project creation notification setup failed:", err);
        return false;
    }
}

async function createProjectDeletionNotification(projectID, userID, projectName) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const now = Date.now(); // Store as milliseconds timestamp

        const params = [
            uuid(),
            userID,
            now,
            "delete",
            null, // Set to null since project will be deleted
            `Project "${projectName}" has been deleted`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting project deletion notification:", err);
                    return reject(err);
                }
                console.log("Project deletion notification created successfully");
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Project deletion notification setup failed:", err);
        return false;
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
    createProjectCreationNotification,
    createProjectDeletionNotification
}
