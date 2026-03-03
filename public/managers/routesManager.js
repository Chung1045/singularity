const express = require("express");
const router = express.Router();

const dbService = require("../services/accountDBService");
const sessionDBService = require("../services/sessionDBService");

/** Helper: get logged-in user or null */
async function getUserID(req) {
    const sessionID = req.cookies?.session_id;
    if (!sessionID) return null;
    return await dbService.findUserIDBySessionID(sessionID);
}

/** Helper: enforce login */
async function requireLogin(req, res) {
    const sessionID = req.cookies?.session_id;
    if (!sessionID) return null;

    const active = await sessionDBService.isSessionActive(sessionID);
    if (!active) return null;

    return await dbService.findUserIDBySessionID(sessionID);
}

/* ----------------------------------------
 * Public pages
 * ---------------------------------------- */

router.get("/", async (req, res) => {
    const sessionID = req.cookies?.session_id;
    if (sessionID) {
        const active = await sessionDBService.isSessionActive(sessionID);
        if (active) return res.redirect("/home");
    }
    res.render("Landing");
});

router.get("/signup", (req, res) => {
    res.render("Signup", { csrfToken: req.csrfToken() || '' });
});

router.get("/login", (req, res) => {
    res.render("Login", { csrfToken: req.csrfToken() });
});

/* ----------------------------------------
 * Protected: Home
 * ---------------------------------------- */
router.get("/home", async (req, res) => {
    console.log("New request from /home");
    console.log("Cookies:", req.cookies);

    const sessionID = req.cookies?.session_id;
    console.log("Session ID:", sessionID);

    const active = await sessionDBService.isSessionActive(sessionID);
    if (!active) {
        console.log(" Session expired — redirect login");
        return res.redirect("/login");
    }

    try {
        const userID = await dbService.findUserIDBySessionID(sessionID)
        const userInfo = await dbService.getUserInfo(userID)

        console.log(" Session OK — showing home");
        res.render("Home", { csrfToken: req.csrfToken() || '', userInfo: userInfo });
    } catch(err) {
        console.error(`Error occurred at /home : ${err.message}`)
        res.send("Server error")
    }
});

/* ----------------------------------------
 * Passkeys
 * ---------------------------------------- */
router.get("/passkeys", async (req, res) => {
    const userID = await requireLogin(req, res);
    if (!userID) return res.redirect("/login");

    let passkeys = await dbService.listPasskey(userID);

    // Ensure array + normalize data
    passkeys = (Array.isArray(passkeys) ? passkeys : []).map(pk => ({
        keyID: pk.keyID || "",
        keyName: pk.keyName || "Unnamed Passkey",
        dateCreate: pk.dateCreate || new Date().toISOString()
    }));

    res.locals.passkeys = passkeys;

    const userInfo = await dbService.getUserInfo(userID)

    res.render("Passkey", {
        csrfToken: req.csrfToken(),
        userInfo
    });
});

/* ----------------------------------------
 * Profile
 * ---------------------------------------- */
router.get("/profile", async (req, res) => {
    const userID = await getUserID(req);
    if (!userID) return res.redirect("/login");

    const userInfo = await dbService.getUserInfo(userID);
    res.render("UserProfile", { csrfToken: req.csrfToken(), userInfo });
});

/* ----------------------------------------
 * Session Activity
 * ---------------------------------------- */
router.get("/session", async (req, res) => {
    const userID = await getUserID(req);
    if (!userID) return res.redirect("/login");

    const sessions = await dbService.listSessions(userID);
    const loginAttempts = await dbService.listLoginAttempts(userID);
    const userInfo = await dbService.getUserInfo(userID)

    res.render("Session", {
        csrfToken: req.csrfToken(),
        sessions,
        loginAttempts,
        userInfo
    });
});

/* ----------------------------------------
 * Password Change
 * ---------------------------------------- */
router.get("/change-password", async (req, res) => {
    const userID = await getUserID(req);
    if (!userID) return res.redirect("/login");

    res.render("ChangePassword", { csrfToken: req.csrfToken() });
});

/* ----------------------------------------
 * CSRF Token
 * ---------------------------------------- */
router.get("/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

module.exports = router;

