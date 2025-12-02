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

router.get("/", (req, res) => {
    if (req.cookies.session_id) return res.redirect("/home");
    res.redirect("/login");
});

router.get("/signup", (req, res) => {
    res.render("tempSignup", { csrfToken: req.csrfToken() });
});

router.get("/login", (req, res) => {
    res.render("tempLogin", { csrfToken: req.csrfToken() });
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
        console.log("❌ Session expired — redirect login");
        return res.redirect("/login");
    }

    console.log("✅ Session OK — showing home");
    res.render("tempHome", { csrfToken: req.csrfToken() });
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

    res.render("tempPasskey", {
        csrfToken: req.csrfToken()
    });
});

/* ----------------------------------------
 * Profile
 * ---------------------------------------- */
router.get("/profile", async (req, res) => {
    const userID = await getUserID(req);
    if (!userID) return res.redirect("/login");

    const userInfo = await dbService.getUserInfo(userID);
    res.render("tempUserProfile", { userInfo });
});

/* ----------------------------------------
 * Session Activity
 * ---------------------------------------- */
router.get("/session", async (req, res) => {
    const userID = await getUserID(req);
    if (!userID) return res.redirect("/login");

    const sessions = await dbService.listSessions(userID);
    const loginAttempts = await dbService.listLoginAttempts(userID);

    res.render("tempSession", {
        csrfToken: req.csrfToken(),
        sessions,
        loginAttempts
    });
});

/* ----------------------------------------
 * Password Change
 * ---------------------------------------- */
router.get("/change-password", async (req, res) => {
    const userID = await getUserID(req);
    if (!userID) return res.redirect("/login");

    res.render("tempChangePassword", { csrfToken: req.csrfToken() });
});

/* ----------------------------------------
 * CSRF Token
 * ---------------------------------------- */
router.get("/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

module.exports = router;


