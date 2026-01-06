const express = require("express");
const router = express.Router();


router.get("/profilePic", async(req, res) => {
    res.render("testProfilePic");
});

module.exports = router;
