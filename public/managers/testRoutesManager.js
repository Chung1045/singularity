const express = require("express");
const router = express.Router();


router.get("/profilePic", async(req, res) => {
    res.render("testProfilePic");
});

router.get("/upload", async(req, res) => {
    res.render("test/testUpload");
});

router.get("/chat/stream", async(req, res) => {
    res.render("test/testChatStream");
});

module.exports = router;
