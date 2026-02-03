const uuid = require("uuid-v4");
const db = require("./db");

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


async function setProjectShareRemoveNotification(projectID, collaboratorID, ownerID) {
    console.log('[NotificationDB] ====================================');
    console.log('[NotificationDB] Creating removal notification');
    console.log('[NotificationDB] ProjectID:', projectID);
    console.log('[NotificationDB] CollaboratorID:', collaboratorID);
    console.log('[NotificationDB] OwnerID:', ownerID);

    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Fetch project name directly to avoid circular dependency issues
        const projectName = await new Promise((resolve, reject) => {
            db.get('SELECT projectName FROM project WHERE projectID = ?', [projectID], (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.projectName : 'Unknown Project');
            });
        });
        console.log('[NotificationDB] Project name:', projectName);

        // Get owner info for the notification message
        const ownerInfo = await new Promise((resolve, reject) => {
            db.get(`SELECT userName, firstName, lastName FROM user WHERE uid = ?`, [ownerID], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        const ownerName = ownerInfo?.firstName && ownerInfo?.lastName
            ? `${ownerInfo.firstName} ${ownerInfo.lastName}`
            : ownerInfo?.userName || 'Project owner';

        console.log('[NotificationDB] Owner name:', ownerName);

        const notifID = uuid();
        const timestamp = Date.now();
        const message = `You have been removed from "${projectName}" by ${ownerName}`;

        const params = [
            notifID,
            collaboratorID,
            timestamp,
            "removal",
            null, // Set to null so removed users can still see the notification
            message,
            0  // SQLite expects INTEGER, not boolean
        ];

        console.log('[NotificationDB] Notification params:', {
            notifID,
            receiveUid: collaboratorID,
            dateReceive: timestamp,
            kind: 'removal',
            projectID: null,
            message,
            isRead: 0
        });

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("[NotificationDB] Error inserting notification:", err);
                    console.log('[NotificationDB] ====================================');
                    return reject(err);
                }
                console.log('[NotificationDB] Removal notification created successfully');

                // Verify the notification was actually saved
                db.get('SELECT * FROM notification WHERE notifID = ?', [notifID], (err, row) => {
                    if (err) {
                        console.error('[NotificationDB] Error verifying notification:', err);
                    } else if (row) {
                        console.log('[NotificationDB] VERIFICATION: Notification found in database:', {
                            notifID: row.notifID,
                            receiveUid: row.receiveUid,
                            kind: row.kind,
                            message: row.message,
                            isRead: row.isRead
                        });
                    } else {
                        console.error('[NotificationDB] VERIFICATION FAILED: Notification not found in database!');
                    }
                });

                console.log('[NotificationDB] ====================================');
                resolve(true);
            });
        });

    } catch (err) {
        console.error("[NotificationDB] Notification setup failed:", err);
        console.log('[NotificationDB] ====================================');
        return false;
    }
}

// Notify owner when they add a collaborator
async function notifyOwnerInviteSent(projectID, ownerID, invitedUserID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Get invited user info
        const userInfo = await new Promise((resolve, reject) => {
            db.get(`SELECT userName, firstName, lastName FROM user WHERE uid = ?`, [invitedUserID], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        const userName = userInfo?.firstName && userInfo?.lastName
            ? `${userInfo.firstName} ${userInfo.lastName}`
            : userInfo?.userName || 'User';

        const params = [
            uuid(),
            ownerID,
            Date.now(),
            'create',
            projectID,
            `You have added ${userName} as collaborator`,
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
        console.error("Notification failed:", err);
        return false;
    }
}

// Notify owner when collaborator accepts invitation
async function notifyOwnerInviteAccepted(projectID, ownerID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Get collaborator info
        const userInfo = await new Promise((resolve, reject) => {
            db.get(`SELECT userName, firstName, lastName FROM user WHERE uid = ?`, [collaboratorID], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        const userName = userInfo?.firstName && userInfo?.lastName
            ? `${userInfo.firstName} ${userInfo.lastName}`
            : userInfo?.userName || 'User';

        const params = [
            uuid(),
            ownerID,
            Date.now(),
            'create',
            projectID,
            `${userName} has accepted your invite request`,
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
        console.error("Notification failed:", err);
        return false;
    }
}

// Notify owner when collaborator declines invitation
async function notifyOwnerInviteDeclined(projectID, ownerID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Get collaborator info
        const userInfo = await new Promise((resolve, reject) => {
            db.get(`SELECT userName, firstName, lastName FROM user WHERE uid = ?`, [collaboratorID], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        const userName = userInfo?.firstName && userInfo?.lastName
            ? `${userInfo.firstName} ${userInfo.lastName}`
            : userInfo?.userName || 'User';

        const params = [
            uuid(),
            ownerID,
            Date.now(),
            'create',
            projectID,
            `${userName} has declined your invite request`,
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
        console.error("Notification failed:", err);
        return false;
    }
}

// Notify collaborator when they join a project
async function notifyCollaboratorJoined(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Fetch project name directly to avoid circular dependency issues
        const projectName = await new Promise((resolve, reject) => {
            db.get('SELECT projectName FROM project WHERE projectID = ?', [projectID], (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.projectName : 'Unknown Project');
            });
        });

        const params = [
            uuid(),
            collaboratorID,
            Date.now(),
            'create',
            projectID,
            `You have joined project ${projectName}`,
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
        console.error("Notification failed:", err);
        return false;
    }
}

// Notify owner when they remove a collaborator
async function notifyOwnerRemovedCollaborator(projectID, ownerID, collaboratorID) {
    // ...existing code...
}

// Notify all collaborators when project is renamed
async function notifyProjectRenamed(projectID, newProjectName) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Get owner and all collaborators
        const users = await new Promise((resolve, reject) => {
            db.all(`
                SELECT projectOwnerUid AS uid FROM project WHERE projectID = ?
                UNION
                SELECT collabUid AS uid FROM projectShare WHERE projectID = ? AND status = 1
            `, [projectID, projectID], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        // Send notification to all users
        const promises = users.map(user => {
            const params = [
                uuid(),
                user.uid,
                Date.now(),
                'create',
                projectID,
                `Project has been renamed to "${newProjectName}"`,
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
        });

        await Promise.all(promises);
        return true;

    } catch (err) {
        console.error("Notification failed:", err);
        return false;
    }
}

// Notify all collaborators when project is deleted (owner gets different message)
async function notifyProjectDeleted(projectID, projectName, ownerID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Get owner info
        const ownerInfo = await new Promise((resolve, reject) => {
            db.get(`SELECT userName, firstName, lastName FROM user WHERE uid = ?`, [ownerID], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        const ownerName = ownerInfo?.firstName && ownerInfo?.lastName
            ? `${ownerInfo.firstName} ${ownerInfo.lastName}`
            : ownerInfo?.userName || 'Project owner';

        // Get all collaborators (not owner)
        const collaborators = await new Promise((resolve, reject) => {
            db.all(`
                SELECT collabUid AS uid FROM projectShare WHERE projectID = ? AND status = 1
            `, [projectID], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        // Send notification to all collaborators
        const promises = collaborators.map(collab => {
            const params = [
                uuid(),
                collab.uid,
                Date.now(),
                'delete',
                null, // projectID is null since project is deleted
                `Project "${projectName}" has been deleted by ${ownerName}`,
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
        });

        await Promise.all(promises);
        return true;

    } catch (err) {
        console.error("Notification failed:", err);
        return false;
    }
}

async function processProjectInvitationResponse(notificationID, response) {
    try {
        // Load the notification using callback-style db.get
        const notification = await new Promise((resolve, reject) => {
            db.get(
                `SELECT projectID, receiveUid FROM notification WHERE notifID = ?`,
                [notificationID],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });

        if (!notification) {
            return { successful: false, message: "Notification not found" };
        }

        const { projectID, receiveUid } = notification;

        // Get project owner ID
        const ownerID = await new Promise((resolve, reject) => {
            db.get(
                `SELECT projectOwnerUid FROM project WHERE projectID = ?`,
                [projectID],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row?.projectOwnerUid);
                }
            );
        });

        switch (response) {
            case "accept":
                // Set status to 1 (accepted)
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE projectShare SET status = 1 WHERE projectID = ? AND collabUid = ?`,
                        [projectID, receiveUid],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        }
                    );
                });

                await removeNotification(notificationID);

                // Notify owner that collaborator accepted
                if (ownerID) {
                    await notifyOwnerInviteAccepted(projectID, ownerID, receiveUid);
                }

                // Notify collaborator that they joined
                await notifyCollaboratorJoined(projectID, receiveUid);

                return { successful: true, message: "Accepted invitation" };

            case "reject":
                // Set status to 2 (declined) instead of deleting
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE projectShare SET status = 2 WHERE projectID = ? AND collabUid = ?`,
                        [projectID, receiveUid],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        }
                    );
                });

                await removeNotification(notificationID);

                // Notify owner that collaborator declined
                if (ownerID) {
                    await notifyOwnerInviteDeclined(projectID, ownerID, receiveUid);
                }

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
    console.log('[NotificationDB] ====================================');
    console.log('[NotificationDB] getAllNotifications called for user:', userID);

    const sql = `SELECT * FROM notification WHERE receiveUid = ?`;

    try {
        const results = await new Promise((resolve, reject) => {
            db.all(sql, [userID], (err, results) => {
                if (err) {
                    console.error('[NotificationDB] Error querying notifications:', err);
                    return reject(err);
                }
                console.log('[NotificationDB] Query executed successfully');
                console.log('[NotificationDB] Raw results from DB:', results);
                console.log('[NotificationDB] Number of notifications found:', results?.length || 0);

                if (results && results.length > 0) {
                    const notifIds = {};
                    results.forEach((notif, index) => {
                        console.log(`[NotificationDB] Notification ${index + 1}:`, {
                            notifID: notif.notifID,
                            kind: notif.kind,
                            receiveUid: notif.receiveUid,
                            projectID: notif.projectID,
                            message: notif.message,
                            isRead: notif.isRead
                        });

                        // Check for duplicate IDs
                        if (notifIds[notif.notifID]) {
                            console.error('[NotificationDB] DUPLICATE notifID IN DATABASE:', notif.notifID);
                        } else {
                            notifIds[notif.notifID] = true;
                        }
                    });
                    console.log('[NotificationDB] Unique notification IDs:', Object.keys(notifIds).length);
                }

                resolve(results);
            });
        });

        console.log('[NotificationDB] Returning', results?.length || 0, 'notifications');
        console.log('[NotificationDB] ====================================');
        return results;

    } catch (err) {
        console.error("[NotificationDB] Error fetching notifications:", err);
        console.log('[NotificationDB] ====================================');
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
    createProjectDeletionNotification,
    notifyOwnerInviteSent,
    notifyOwnerInviteAccepted,
    notifyOwnerInviteDeclined,
    notifyCollaboratorJoined,
    notifyOwnerRemovedCollaborator,
    notifyProjectRenamed,
    notifyProjectDeleted
}
