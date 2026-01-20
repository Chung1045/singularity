const express = require("express");
const router = express.Router();


router.get("/profilePic", async(req, res) => {
    res.render("testProfilePic");
});

router.get("/upload", async(req, res) => {
    res.render("test/testUpload");
});

module.exports = router;
