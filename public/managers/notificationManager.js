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

    if (await notifDB.getNotificationRecipient(notificationID) !== req.userID) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const result = await notifDB.processProjectInvitationResponse(notificationID, response);
    if (result.successful) {
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

router.post('/notification/fetch', async (req, res) => {
    console.log("New requests /notifications/fetch")
    const userID = await dbService.findUserIDBySessionID(req.cookies.req.userID);

    try {
        console.log(`Attempt to fetch notifications for user ${userID}`)
        const notifications = await notifDB.getAllNotifications(userID);

        console.log("Notification is fetched")
        console.log(notifications)
        return res.status(200).json({ successful: true, notifications})

    } catch (err) {
        console.error(`Failed to fetch notifications for user ${userID}`)
        return res.status(500).json({ successful: false, message: `Server Error: Failed to fetch notifications`})
    }

})

module.exports = router;

