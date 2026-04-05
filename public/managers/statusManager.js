const express = require('express');
const router = express.Router();

router.get("/status/ENFORCE_TRANSCRIPT_TIME_LIMIT", async (req, res) => {
    return res.status(200).json({value: process.env.ENFORCE_TRANSCRIPT_TIME_LIMIT === 'true' ? 1 : 0});
});

router.get("/status/ENFORCE_TRANSCRIPT_TIME_LIMIT_MAX", async (req, res) => {
    return res.status(200).json({value: process.env.ENFORCE_TRANSCRIPT_TIME_MAX ? process.env.ENFORCE_TRANSCRIPT_TIME_MAX : 5});
});

module.exports = router;
