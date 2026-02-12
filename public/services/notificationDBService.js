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
        const now = Date.now(); // Store as milliseconds timestamp
        const notifID = uuid();

        const params = [
            notifID,
            collaboratorID,
            now,
            "invitation",
            projectID,
            `You are invited to join ${projectName}`,
            false
        ];

        console.log(`[Notification DB] Creating invitation notification for user ${collaboratorID}:`, {
            notifID: notifID,
            projectID: projectID,
            projectName: projectName,
            isRead: false,
            timestamp: now
        });

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting notification:", err);
                    return reject(err);
                }
                console.log(`[Notification DB] ✓ Invitation notification created successfully for user ${collaboratorID}`);
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
        WHERE projectID = ? AND receiveUid = ? AND kind = 'invitation'
    `;

    try {
        await new Promise((resolve, reject) => {
            db.run(sql, [projectID, collaboratorID], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

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
        const now = Date.now(); // Store as milliseconds timestamp

        const params = [
            uuid(),
            collaboratorID,
            now,
            "remove",
            projectID,
            `You have been removed from the project ${projectName}`,
            false
        ];
        
        console.log(`[Notification] Creating removal notification for user ${collaboratorID} from project "${projectName}"`);

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting removal notification:", err);
                    return reject(err);
                }
                console.log(` Removal notification created\n`);
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
        const notification = await new Promise((resolve, reject) => {
            db.get(
                `SELECT projectID, receiveUid FROM notification WHERE notifID = ?`,
                [notificationID],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!notification) {
            return { successful: false, message: "Notification not found" };
        }

        const { projectID, receiveUid } = notification;
        
        // Get project owner to notify them
        const ownerUID = await projectDB.queryProjectOwner(projectID);

        switch (response) {
            case "accept":
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE projectShare SET confirmed = 1 WHERE projectID = ? AND collabUid = ?`,
                        [projectID, receiveUid],
                        function(err) {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

                await removeNotification(notificationID);
                
                // Notify owner that invitation was accepted
                if (ownerUID) {
                    await notifyOwnerInvitationAccepted(projectID, ownerUID, receiveUid);
                }
                
                // Notify collaborator that they successfully joined
                await notifyCollaboratorJoined(projectID, receiveUid);

                return { successful: true, message: "Accepted invitation" };

            case "reject":
                await new Promise((resolve, reject) => {
                    db.run(
                        `DELETE FROM projectShare WHERE projectID = ? AND collabUid = ?`,
                        [projectID, receiveUid],
                        function(err) {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                await removeNotification(notificationID);
                
                // Notify owner that invitation was declined
                if (ownerUID) {
                    await notifyOwnerInvitationDeclined(projectID, ownerUID, receiveUid);
                }
                
                // Notify collaborator that they declined
                await notifyCollaboratorDeclined(projectID, receiveUid);

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

    console.log(`[getNotificationRecipient] Called with notifID: ${notifID}`);

    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [notifID], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        console.log(`[getNotificationRecipient] Query returned ${rows.length} rows:`, rows);

        if (rows.length === 0) {
            console.log(`[getNotificationRecipient] Notification not found, returning null`);
            return null;
        }

        const receiveUid = rows[0].receiveUid;
        console.log(`[getNotificationRecipient] Returning receiveUid: ${receiveUid}`);
        return receiveUid;

    } catch (err) {
        console.error("[getNotificationRecipient] Error fetching notification recipient:", err);
        return null;
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

// Notify owner when they send an invitation
async function notifyOwnerInvitationSent(projectID, ownerID, invitedUserID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        
        // Get invited user's name
        const invitedUser = await new Promise((resolve, reject) => {
            db.get('SELECT userName, firstName, lastName FROM user WHERE uid = ?', [invitedUserID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const invitedUsername = invitedUser ? invitedUser.userName : 'User';
        const now = Date.now();
        const notifID = uuid();

        const params = [
            notifID,
            ownerID,
            now,
            "invitation",
            projectID,
            `You invited @${invitedUsername} to join ${projectName}`,
            false
        ];

        console.log(`[Notification DB] Creating owner invitation notification for user ${ownerID}:`, {
            notifID: notifID,
            projectID: projectID,
            invitedUser: invitedUsername,
            isRead: false,
            timestamp: now
        });

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting owner invitation notification:", err);
                    return reject(err);
                }
                console.log(`[Notification DB] ✓ Owner invitation notification created successfully for user ${ownerID}`);
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Owner invitation notification failed:", err);
        return false;
    }
}

// Notify owner when invitation is accepted
async function notifyOwnerInvitationAccepted(projectID, ownerID, acceptedUserID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        
        // Get accepted user's name
        const acceptedUser = await new Promise((resolve, reject) => {
            db.get('SELECT userName, firstName, lastName FROM user WHERE uid = ?', [acceptedUserID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const acceptedUsername = acceptedUser ? acceptedUser.userName : 'User';
        const now = Date.now();

        const params = [
            uuid(),
            ownerID,
            now,
            "invitation",
            projectID,
            `@${acceptedUsername} accepted your invitation to ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting owner accept notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Owner accept notification failed:", err);
        return false;
    }
}

// Notify collaborator when they successfully join
async function notifyCollaboratorJoined(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        const now = Date.now();

        const params = [
            uuid(),
            collaboratorID,
            now,
            "invitation",
            projectID,
            `You have successfully joined ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting collaborator join notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Collaborator join notification failed:", err);
        return false;
    }
}

// Notify owner when invitation is declined
async function notifyOwnerInvitationDeclined(projectID, ownerID, declinedUserID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        
        // Get declined user's name
        const declinedUser = await new Promise((resolve, reject) => {
            db.get('SELECT userName, firstName, lastName FROM user WHERE uid = ?', [declinedUserID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const declinedUsername = declinedUser ? declinedUser.userName : 'User';
        const now = Date.now();

        const params = [
            uuid(),
            ownerID,
            now,
            "invitation",
            projectID,
            `@${declinedUsername} declined your invitation to ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting owner decline notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Owner decline notification failed:", err);
        return false;
    }
}

// Notify collaborator when they decline an invitation
async function notifyCollaboratorDeclined(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        const now = Date.now();

        const params = [
            uuid(),
            collaboratorID,
            now,
            "invitation",
            projectID,
            `You declined the invitation to ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting collaborator decline notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Collaborator decline notification failed:", err);
        return false;
    }
}

// Notify owner when they remove a collaborator
async function notifyOwnerCollaboratorRemoved(projectID, ownerID, removedUserID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await projectDB.fetchProjectName(projectID);
        
        // Get removed user's name
        const removedUser = await new Promise((resolve, reject) => {
            db.get('SELECT userName, firstName, lastName FROM user WHERE uid = ?', [removedUserID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const removedUsername = removedUser ? removedUser.userName : 'User';
        const now = Date.now();

        const params = [
            uuid(),
            ownerID,
            now,
            "remove",
            projectID,
            `You removed @${removedUsername} from ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting owner removal notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Owner removal notification failed:", err);
        return false;
    }
}

// Notify owner and collaborators when project is renamed
async function notifyProjectRenamed(projectID, oldProjectName, newProjectName, changedByUserID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        console.log(`\n[Notification] Creating project rename notifications:`);
        console.log(`  Project: "${oldProjectName}" → "${newProjectName}"`);
        console.log(`  Changed by: ${changedByUserID}`);
        
        // Get the user who made the change
        const changedByUser = await new Promise((resolve, reject) => {
            db.get('SELECT userName, firstName, lastName FROM user WHERE uid = ?', [changedByUserID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const changedByUsername = changedByUser ? changedByUser.userName : 'Someone';
        const now = Date.now();

        // Get project owner
        const ownerUID = await projectDB.queryProjectOwner(projectID);

        // Get all confirmed collaborators
        const collaborators = await new Promise((resolve, reject) => {
            db.all(
                'SELECT collabUid FROM projectShare WHERE projectID = ? AND confirmed = 1',
                [projectID],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows ? rows.map(r => r.collabUid) : []);
                }
            );
        });
        
        console.log(`  Recipients: Owner (${ownerUID}) + ${collaborators.length} collaborator(s)`);

        // Notify owner
        if (ownerUID) {
            const ownerMessage = ownerUID === changedByUserID
                ? `You renamed project "${oldProjectName}" to "${newProjectName}"`
                : `@${changedByUsername} renamed project "${oldProjectName}" to "${newProjectName}"`;

            const ownerParams = [
                uuid(),
                ownerUID,
                now,
                "rename",
                projectID,
                ownerMessage,
                false
            ];

            await new Promise((resolve, reject) => {
                db.run(sql, ownerParams, (err) => {
                    if (err) {
                        console.error("Error inserting owner rename notification:", err);
                        return reject(err);
                    }
                    resolve(true);
                });
            });
        }

        // Notify all collaborators
        for (const collabUID of collaborators) {
            const collabMessage = collabUID === changedByUserID
                ? `You renamed project "${oldProjectName}" to "${newProjectName}"`
                : `@${changedByUsername} renamed project "${oldProjectName}" to "${newProjectName}"`;

            const collabParams = [
                uuid(),
                collabUID,
                now,
                "rename",
                projectID,
                collabMessage,
                false
            ];

            await new Promise((resolve, reject) => {
                db.run(sql, collabParams, (err) => {
                    if (err) {
                        console.error("Error inserting collaborator rename notification:", err);
                        return reject(err);
                    }
                    resolve(true);
                });
            });
        }

        console.log(`  Created ${1 + collaborators.length} rename notification(s)\n`);
        return true;

    } catch (err) {
        console.error("Project rename notification failed:", err);
        return false;
    }
}

// Notify all collaborators when project is deleted
// Notify owner when they delete a project
async function notifyOwnerProjectDeleted(projectID, projectName, ownerID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const now = Date.now();

        const params = [
            uuid(),
            ownerID,
            now,
            "delete",
            null, // Set to null since project is deleted
            `You deleted project "${projectName}"`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting owner deletion notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Owner deletion notification failed:", err);
        return false;
    }
}

async function notifyCollaboratorsProjectDeleted(projectID, projectName, deletedByUserID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        console.log(`\n[Notification] Creating project deletion notifications:`);
        console.log(`  Project: "${projectName}"`);
        console.log(`  Deleted by: ${deletedByUserID}`);
        
        const now = Date.now();

        // Get all confirmed collaborators
        const collaborators = await new Promise((resolve, reject) => {
            db.all(
                'SELECT collabUid FROM projectShare WHERE projectID = ? AND confirmed = 1',
                [projectID],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows ? rows.map(r => r.collabUid) : []);
                }
            );
        });
        
        console.log(`  Recipients: ${collaborators.length} collaborator(s)`);

        // Notify all collaborators
        for (const collabUID of collaborators) {
            const params = [
                uuid(),
                collabUID,
                now,
                "delete",
                null, // Set to null since project will be deleted
                `Project "${projectName}" has been deleted by the owner`,
                false
            ];

            await new Promise((resolve, reject) => {
                db.run(sql, params, (err) => {
                    if (err) {
                        console.error("Error inserting collaborator deletion notification:", err);
                        return reject(err);
                    }
                    resolve(true);
                });
            });
        }

        console.log(` Created ${collaborators.length} deletion notification(s)\n`);
        return true;

    } catch (err) {
        console.error("Collaborator deletion notification failed:", err);
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
