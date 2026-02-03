const express = require('express');
const { json } = require('express');
const router = express.Router();
const notifDB = require('../services/notificationDBService');
const dbService = require("../services/accountDBService");

router.use(json());
router.use(dbService.apiAuthUser);

router.post('/notification/invite/respond', async (req, res) => {
    console.log("New requests /notifications/invite-respond")

    const { notificationID, response } = req.body;
    if (!notificationID || !response) {
        return res.status(400).json({ successful: false, message: "Bad request: Missing notificationID or response" });
    }

    const recipientResult = await notifDB.getNotificationRecipient(notificationID);
    if (!recipientResult.successful || recipientResult.receiveUid !== req.userID) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const result = await notifDB.processProjectInvitationResponse(notificationID, response);
    if (result.successful) {
        // Emit real-time update to project owner when invitation is accepted
        if (response === 'accept') {
            try {
                // Get project owner ID
                const notification = await new Promise((resolve, reject) => {
                    require('../services/db').get(
                        `SELECT projectID FROM notification WHERE notifID = ?`,
                        [notificationID],
                        (err, row) => {
                            if (err) return reject(err);
                            resolve(row);
                        }
                    );
                });

                if (notification?.projectID) {
                    const ownerID = await new Promise((resolve, reject) => {
                        require('../services/db').get(
                            `SELECT projectOwnerUid FROM project WHERE projectID = ?`,
                            [notification.projectID],
                            (err, row) => {
                                if (err) return reject(err);
                                resolve(row?.projectOwnerUid);
                            }
                        );
                    });

                    if (ownerID && global.io) {
                        global.io.to(`user_${ownerID}`).emit('project-share-updated', {
                            projectID: notification.projectID,
                            action: 'collaborator-accepted',
                            collaboratorID: req.userID
                        });
                        console.log(`Emitted project-share-updated to owner ${ownerID} for project ${notification.projectID}`);
                    }
                }
            } catch (err) {
                console.error('Error emitting real-time update:', err);
            }
        }

        res.status(200).json({ successful: true });
    } else {
        res.status(500).json({ successful: false, message: "Server Error: Failed to respond to invitation"});
    }
});

router.post('/notification/mark-read', async (req, res) => {
    console.log("New requests /notifications/mark-read")
    const { notifID } = req.body;
    if (!notifID) {
        return res.status(400).json({ successful: false, message: "Bad request: Missing notifID" });
    }

    const result = await notifDB.markNotificationRead(notifID);
    if (result.successful) {
        res.status(200).json({ successful: true });
    } else {
        res.status(500).json({ successful: false, message: "Server Error: Failed to mark notification as read"});
    }
});

router.post('/notification/remove', async (req, res) => {
    console.log("New requests /notifications/remove")

    const { notifID } = req.body;
    if (!notifID) {
        return res.status(400).json({ successful: false, message: "Bad request: Missing notifID" });
    }

    const result = await notifDB.removeNotification(notifID);
    if (result.successful) {
        res.status(200).json({ successful: true });
    } else {
        res.status(500).json({ successful: false, message: "Server Error: Failed to remove notification"});
    }
});

router.post('/notifications/accept-invitation', async (req, res) => {
    console.log("New requests /notifications/accept-invitation")

    const { notificationId, projectId } = req.body;
    if (!notificationId) {
        return res.status(400).json({ successful: false, message: "Bad request: Missing notificationId" });
    }

    const recipientResult = await notifDB.getNotificationRecipient(notificationId);
    if (!recipientResult.successful || recipientResult.receiveUid !== req.userID) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const result = await notifDB.processProjectInvitationResponse(notificationId, 'accept');
    if (result.successful) {
        res.status(200).json({ successful: true });
    } else {
        res.status(500).json({ successful: false, message: "Server Error: Failed to accept invitation"});
    }
});

router.post('/notifications/decline-invitation', async (req, res) => {
    console.log("New requests /notifications/decline-invitation")

    const { notificationId } = req.body;
    if (!notificationId) {
        return res.status(400).json({ successful: false, message: "Bad request: Missing notificationId" });
    }

    const recipientResult = await notifDB.getNotificationRecipient(notificationId);
    if (!recipientResult.successful || recipientResult.receiveUid !== req.userID) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const result = await notifDB.processProjectInvitationResponse(notificationId, 'reject');
    if (result.successful) {
        res.status(200).json({ successful: true });
    } else {
        res.status(500).json({ successful: false, message: "Server Error: Failed to decline invitation"});
    }
});

router.post('/notification/fetch', async (req, res) => {
    console.log("New requests /notifications/fetch")
    const userID = req.userID;

    try {
        console.log(`Attempt to fetch notifications for user ${userID}`)
        const notifications = await notifDB.getAllNotifications(userID);

        // Transform notifications to match frontend expectations
        const transformedNotifications = notifications.map(notif => {
            let createdAt;

            // Check if dateReceive is a number (milliseconds) or string
            if (typeof notif.dateReceive === 'number') {
                // New format: milliseconds timestamp - convert to ISO string
                createdAt = new Date(notif.dateReceive).toISOString();
            } else if (!isNaN(Number(notif.dateReceive))) {
                // SQLite might return it as a numeric string
                createdAt = new Date(Number(notif.dateReceive)).toISOString();
            } else if (notif.dateReceive && typeof notif.dateReceive === 'string') {
                // Old format: "2026-02-02 10:30:45" string
                createdAt = notif.dateReceive.replace(' ', 'T');
            } else {
                // Fallback
                createdAt = new Date().toISOString();
            }

            return {
                notificationID: notif.notifID,
                notificationTitle: getNotificationTitle(notif.kind),
                notificationMessage: notif.message,
                notificationType: notif.kind === 'invitation' ? 'collaboration_invite' : notif.kind,
                projectID: notif.projectID,
                createdAt: createdAt,
                isRead: notif.isRead
            };
        });

        console.log("Notification is fetched")
        console.log(transformedNotifications)
        return res.status(200).json({ successful: true, notifications: transformedNotifications})

    } catch (err) {
        console.error(`Failed to fetch notifications for user ${userID}`)
        return res.status(500).json({ successful: false, message: `Server Error: Failed to fetch notifications`})
    }

})

// Add alias endpoint for compatibility
router.post('/notifications/list', async (req, res) => {
    console.log("New requests /notifications/list (alias for /notification/fetch)")
    const userID = req.userID;

    try {
        console.log(`[NotificationAPI] Fetching notifications for user ${userID}`)
        const notifications = await notifDB.getAllNotifications(userID);

        console.log(`[NotificationAPI] Raw notifications from DB:`, notifications.length);
        notifications.forEach((notif, index) => {
            console.log(`[NotificationAPI] Raw notification ${index + 1}:`, {
                notifID: notif.notifID,
                kind: notif.kind,
                projectID: notif.projectID,
                message: notif.message,
                dateReceive: notif.dateReceive,
                isRead: notif.isRead
            });
        });

        // Transform notifications to match frontend expectations
        const transformedNotifications = notifications.map(notif => {
            let createdAt;

            // Check if dateReceive is a number (milliseconds) or string
            if (typeof notif.dateReceive === 'number') {
                // New format: milliseconds timestamp - convert to ISO string
                createdAt = new Date(notif.dateReceive).toISOString();
            } else if (!isNaN(Number(notif.dateReceive))) {
                // SQLite might return it as a numeric string
                createdAt = new Date(Number(notif.dateReceive)).toISOString();
            } else if (notif.dateReceive && typeof notif.dateReceive === 'string') {
                // Old format: "2026-02-02 10:30:45" string
                createdAt = notif.dateReceive.replace(' ', 'T');
            } else {
                // Fallback
                createdAt = new Date().toISOString();
            }

            return {
                notificationID: notif.notifID,
                notificationTitle: getNotificationTitle(notif.kind, notif.message),
                notificationMessage: notif.message,
                notificationType: notif.kind === 'invitation' ? 'collaboration_invite' : notif.kind,
                projectID: notif.projectID,
                createdAt: createdAt,
                isRead: notif.isRead
            };
        });

        console.log(`[NotificationAPI] Transformed notifications:`, transformedNotifications.length);
        transformedNotifications.forEach((notif, index) => {
            console.log(`[NotificationAPI] Transformed notification ${index + 1}:`, {
                notificationID: notif.notificationID,
                notificationType: notif.notificationType,
                notificationTitle: notif.notificationTitle,
                message: notif.notificationMessage,
                isRead: notif.isRead
            });
        });

        console.log("Notification is fetched")
        console.log(transformedNotifications)
        return res.status(200).json({ successful: true, notifications: transformedNotifications})

    } catch (err) {
        console.error(`Failed to fetch notifications for user ${userID}`)
        return res.status(500).json({ successful: false, message: `Server Error: Failed to fetch notifications`})
    }

})

// Helper function to generate notification titles based on type
function getNotificationTitle(kind, message = '') {
    switch (kind) {
        case 'invitation':
            return 'Project Collaboration Invitation';
        case 'create':
            // Check message content to determine if it's a state change or collaboration change
            if (message.includes('renamed') || message.includes('created successfully')) {
                return 'Project State';
            }
            return 'Project Collaboration Changes';
        case 'delete':
            return 'Project State Change';
        case 'removal':
            return 'Project Collaboration Changes';
        case 'leaving':
            return 'Project Collaboration Changes';
        default:
            return 'Notification';
    }
}

module.exports = router;

