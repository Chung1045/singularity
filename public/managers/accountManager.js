const express = require('express');
const uuid = require("uuid-v4");
const dbService = require('../services/accountDBService.js');
const credDBService = require('../services/credentialDBService.js');
const fss = require("../services/fsServices");
const sessionDBService = require('../services/sessionDBService');
const { requireLogin } = require('../middleware/authMiddleware');
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = express.Router();
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const UAParser = require('ua-parser-js');
const multer = require("multer");
const { promises: fs } = require("fs");
const utils = require("../services/utlisService");
const ServiceError = require('../errors/ServiceError');
const { serverLogger } = require("../services/loggingService");

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = './temp/avatar';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        } catch (err) {
            serverLogger.error(`[accountManager] Failed to create upload dir: ${err.message}`);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: getGoogleOAuthRedirectURL(),
    scope: ['profile', 'email'],
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        if (await dbService.isGoogleOAuthUserExist(profile.id)) {
            const uid = await dbService.getUIDfromOAuth(profile.id);
            if (!uid) return done(new Error("Failed to retrieve user ID"), null);
            return done(null, { uid });
        } else {
            const newUser = await credDBService.insertGoogleOAuthUserAccount(profile);
            if (!newUser?.uid) return done(new Error("Failed to create user account"), null);
            return done(null, { uid: newUser.uid });
        }
    } catch (err) {
        serverLogger.error(`[accountManager:OAuth] ${err.message}`);
        return done(err, null);
    }
}));

async function createSession(req, res, uid) {
    const { clientOS, clientBrowser, clientIP } = await utils.getClientDeviceInfo(req);

    const sessionID = await sessionDBService.createSession({
        uid,
        sessionOS: clientOS,
        sessionBrowser: clientBrowser,
        sessionIP: clientIP
    });

    res.cookie('session_id', sessionID, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 * 7
    });

    await dbService.logLoginAttempts({
        uid,
        attemptOS: clientOS,
        attemptBrowser: clientBrowser,
        attemptIP: clientIP
    });

    return true;
}

router.post('/signup', async (req, res) => {
    try {
        serverLogger.info('[accountManager] New request: /signup');
        const { firstName, lastName, email, username, password } = req.body;

        const { uid } = await credDBService.insertUserAccount({
            firstName,
            lastName,
            userEmail: email,
            userName: username,
            userType: 'general'
        });

        await credDBService.insertCredentials({
            uid,
            credentialPassword: password
        });

        await createSession(req, res, uid);
        return res.status(200).json({ success: true, message: 'Account created successfully' });

    } catch (err) {
        if (err instanceof ServiceError && err.message.includes('Username or email already exists')) {
            return res.status(400).json({ success: false, message: 'Username or email already exists' });
        }
        serverLogger.error(`[accountManager:/signup] ${err.message}`);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post("/login", async (req, res) => {
    try {
        serverLogger.info('[accountManager] New request: /login');
        const { usernameEmail, password } = req.body;

        if (!usernameEmail || !password) {
            return res.status(400).json({ success: false, message: 'Username/email and password are required' });
        }

        const uid = await credDBService.checkUsernameEmailExists(usernameEmail);
        if (!uid) {
            return res.status(400).json({ success: false, message: 'Please check your credentials and try again' });
        }

        const valid = await credDBService.checkPassword({ uid, password });
        if (!valid) {
            await dbService.logLoginAttempts({
                uid,
                ...await utils.getClientDeviceInfo(req)
            });
            return res.status(401).json({ success: false, message: 'Please check your credentials and try again' });
        }

        await createSession(req, res, uid);
        return res.status(200).json({ success: true, message: 'Login successful' });

    } catch (err) {
        serverLogger.error(`[accountManager:/login] ${err.message}`);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post("/logout", requireLogin, async (req, res) => {
    try {
        await sessionDBService.destroySession(req.cookies.session_id);
    } catch (err) {
        serverLogger.error(`[accountManager:/logout] ${err.message}`);
        return res.status(500).json({ success: false, message: 'Error while logging out' });
    }

    req.session.destroy((err) => {
        if (err) {
            serverLogger.error(`[accountManager:/logout] Failed to destroy session: ${err.message}`);
            return res.status(500).json({ success: false, message: 'Error while logging out' });
        }
        res.clearCookie('session_id');
        return res.status(200).json({ success: true });
    });
});

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    async (req, res) => {
        try {
            await createSession(req, res, req.user.uid);
            res.redirect("/home");
        } catch (err) {
            serverLogger.error(`[accountManager:/auth/google/callback] ${err.message}`);
            res.redirect('/login');
        }
    }
);

router.post("/passkey/gen-option", requireLogin, async (req, res) => {
    try {
        const userID = req.userID;
        const userName = await dbService.findUserNameByUserID(userID);
        if (!userName) return res.status(400).json({ error: "User not found" });

        const options = await generateRegistrationOptions({
            rpName: 'Singularity',
            rpID: process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost',
            userID: new TextEncoder().encode(userID),
            userName,
            userDisplayName: userName,
            attestationType: 'none',
            authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }
        });

        req.session.challenge = options.challenge;
        return res.json(options);
    } catch (err) {
        serverLogger.error(`[accountManager:/passkey/gen-option] ${err.message}`);
        return res.status(500).json({ error: err.message });
    }
});

router.post("/passkey/gen-auth-option", async (req, res) => {
    try {
        const options = await generateAuthenticationOptions({
            rpID: process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost',
            allowCredentials: [],
            userVerification: 'required',
            timeout: 60000
        });
        req.session.challenge = options.challenge;
        return res.json(options);
    } catch (err) {
        serverLogger.error(`[accountManager:/passkey/gen-auth-option] ${err.message}`);
        return res.status(500).json({ error: err.message });
    }
});

router.post("/passkey/verify-register", requireLogin, async (req, res) => {
    try {
        const { attResp } = req.body;
        const verification = await verifyRegistrationResponse({
            response: attResp,
            expectedChallenge: req.session.challenge,
            expectedOrigin: getExpectedOrigin(),
            expectedRPID: getExpectedRPID()
        });

        if (verification.verified) {
            const { id, publicKey, counter } = verification.registrationInfo.credential;
            const transports = attResp.response.transports || [];

            await credDBService.savePasskey({
                keyID: id,
                uid: req.userID,
                keyName: inferProviderName(transports, req.headers['user-agent']),
                transports: JSON.stringify(transports),
                publicKey,
                signCount: counter
            });

            delete req.session.challenge;
        }

        return res.json({ verified: verification.verified });
    } catch (err) {
        serverLogger.error(`[accountManager:/passkey/verify-register] ${err.message}`);
        return res.status(400).json({ verified: false, error: err.message });
    }
});

router.post("/passkey/verify-authentication", async (req, res) => {
    try {
        const { credential } = req.body;
        const expectedChallenge = req.session.challenge;

        if (!expectedChallenge || !credential) {
            return res.status(400).json({ successful: false, message: 'Missing required fields' });
        }

        const passkey = await dbService.getPasskey(credential.id);
        if (!passkey) {
            return res.status(400).json({ verified: false, error: 'Passkey not found' });
        }

        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: getExpectedOrigin(),
            expectedRPID: getExpectedRPID(),
            credential: {
                id: passkey.keyID,
                publicKey: passkey.publicKey,
                counter: passkey.signCount,
                transports: passkey.transports
            },
            requireUserVerification: true
        });

        if (!verification.verified) {
            return res.status(400).json({ successful: false, message: 'Verification failed' });
        }

        const uid = await dbService.findUserIDByPasskeyID(passkey.keyID);

        await credDBService.updatePasskeyLastUsed(passkey.keyID).catch(err =>
            serverLogger.warn(`[accountManager] Failed to update passkey lastUsed: ${err.message}`)
        );

        await createSession(req, res, uid);
        return res.json({ successful: true });

    } catch (err) {
        serverLogger.error(`[accountManager:/passkey/verify-authentication] ${err.message}`);
        return res.status(500).json({ verified: false, error: err.message });
    }
});

router.post("/passkey/list", requireLogin, async (req, res) => {
    try {
        const passkeyList = await dbService.listPasskey(req.userID);
        return res.status(200).json(passkeyList);
    } catch (err) {
        serverLogger.error(`[accountManager:/passkey/list] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Could not fetch passkey list' });
    }
});

router.post("/passkey/delete", requireLogin, async (req, res) => {
    try {
        const { passkeyID } = req.body;
        const userID = req.userID;

        const owner = await dbService.findUserIDByPasskeyID(passkeyID);
        if (owner !== userID) {
            return res.status(403).json({ successful: false, message: 'Unauthorized' });
        }

        await dbService.deletePasskey(passkeyID);
        return res.status(200).json({ successful: true });

    } catch (err) {
        serverLogger.error(`[accountManager:/passkey/delete] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Failed to delete passkey' });
    }
});

router.post("/session/list", requireLogin, async (req, res) => {
    try {
        const sessionList = await dbService.listSessions(req.userID);
        return res.status(200).json(sessionList);
    } catch (err) {
        serverLogger.error(`[accountManager:/session/list] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Could not fetch session list' });
    }
});

router.post("/session/logout", requireLogin, async (req, res) => {
    try {
        const { sessionID } = req.body;
        const target = await dbService.findUserIDBySessionID(sessionID);

        if (req.userID !== target) {
            return res.status(403).json({ successful: false, message: 'Unauthorized' });
        }

        await dbService.logoutSession(sessionID);
        return res.status(200).json({ successful: true });

    } catch (err) {
        serverLogger.error(`[accountManager:/session/logout] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Failed to logout session' });
    }
});

// ─── Account ──────────────────────────────────────────────────────────

router.post("/loginAttempts/deleteAll", requireLogin, async (req, res) => {
    try {
        await dbService.deleteAllLoginAttempts(req.userID);
        return res.status(200).json({ successful: true });
    } catch (err) {
        serverLogger.error(`[accountManager:/loginAttempts/deleteAll] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Failed to delete login attempts' });
    }
});

router.post("/userInfo/query", requireLogin, async (req, res) => {
    try {
        const userinfo = await dbService.getUserInfo(req.userID);
        if (!userinfo) return res.status(404).json({ successful: false, message: 'User not found' });
        return res.status(200).json({ successful: true, userinfo });
    } catch (err) {
        serverLogger.error(`[accountManager:/userInfo/query] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Failed to query user info' });
    }
});

router.post("/user/search", requireLogin, async (req, res) => {
    try {
        const { query } = req.body;
        const users = await dbService.findUserByUsername(query, req.userID);
        return res.status(200).json({ successful: true, users });
    } catch (err) {
        serverLogger.error(`[accountManager:/user/search] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Internal server error' });
    }
});

router.post("/password/change", requireLogin, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userInfo = await dbService.getUserInfo(req.userID);

        if (userInfo.userType === 'google') {
            return res.status(400).json({ successful: false, message: 'Password change not available for Google OAuth users' });
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ successful: false, message: 'Please fill in all required fields' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ successful: false, message: 'New password and confirmation do not match' });
        }

        const valid = await credDBService.checkPassword({ uid: req.userID, password: currentPassword });
        if (!valid) {
            return res.status(400).json({ successful: false, message: 'Current password is incorrect' });
        }

        await credDBService.updatePassword({ uid: req.userID, password: newPassword });
        return res.status(200).json({ successful: true, message: 'Password changed successfully' });

    } catch (err) {
        serverLogger.error(`[accountManager:/password/change] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Internal server error' });
    }
});

router.post("/profile-pic/replace", requireLogin, upload.single('file'), async (req, res) => {
    try {
        const compressedBuffer = await utils.cropAndCompressImage(req.file);
        await fss.updateProfilePic(req.userID, {
            ...req.file,
            buffer: compressedBuffer,
            size: compressedBuffer.length
        });
        return res.status(200).json({ success: true, message: 'Profile picture updated' });
    } catch (err) {
        serverLogger.error(`[accountManager:/profile-pic/replace] ${err.message}`);
        return res.status(500).json({ success: false, message: 'Unable to update profile picture' });
    }
});

router.post("/profile-pic/remove", requireLogin, async (req, res) => {
    try {
        await fss.removeProfilePic(req.userID);
        return res.status(200).json({ success: true, message: 'Profile picture removed' });
    } catch (err) {
        serverLogger.error(`[accountManager:/profile-pic/remove] ${err.message}`);
        return res.status(500).json({ success: false, message: 'Unable to remove profile picture' });
    }
});

router.post("/profile-pic/fetch", requireLogin, async (req, res) => {
    try {
        let { userIDs } = req.body;
        if (!userIDs) {
            userIDs = [req.userID];
        } else if (!Array.isArray(userIDs)) {
            return res.status(400).json({ success: false, message: 'userIDs must be an array' });
        }
        const data = await fss.fetchProfilePics(userIDs);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        serverLogger.error(`[accountManager:/profile-pic/fetch] ${err.message}`);
        return res.status(500).json({ success: false, message: 'Unable to fetch profile pictures' });
    }
});

router.post("/account/delete", requireLogin, async (req, res) => {
    try {
        await dbService.deleteUserAccount(req.userID);
        req.session.destroy(() => {});
        return res.status(200).json({ success: true });
    } catch (err) {
        serverLogger.error(`[accountManager:/account/delete] ${err.message}`);
        return res.status(500).json({ success: false, message: 'Unable to delete account' });
    }
});

function inferProviderName(transports, userAgent) {
    const ua = userAgent.toLowerCase();
    const { os, device } = new UAParser(userAgent).getResult();

    if (transports.includes('internal')) {
        if (ua.includes('iphone')) return `iCloud Keychain (iPhone)`;
        if (ua.includes('ipad')) return `iCloud Keychain (iPad)`;
        if (ua.includes('mac')) return `iCloud Keychain (Mac)`;
        if (ua.includes('windows')) return `Windows Hello (${os.name})`;
        if (ua.includes('android')) {
            return device.vendor && device.model
                ? `Google Password Manager (${device.vendor} ${device.model})`
                : 'Google Password Manager';
        }
        if (ua.includes('samsung')) return device.model ? `Samsung Pass (${device.model})` : 'Samsung Pass';
        return 'Platform Authenticator';
    }
    if (transports.includes('usb') || transports.includes('nfc')) return 'Hardware Security Key';
    if (transports.includes('hybrid')) return 'Cross-Device Passkey';
    return 'Passkey';
}

function getServerOrigin() {
    const useHttp = process.env.USE_NGINX_SSL === 'true' || process.env.ENABLE_HTTPS === 'false';
    const domain = process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost';
    return `${useHttp ? 'http' : 'https'}://${domain}`;
}

function getExpectedRPID() {
    return process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost';
}

function getExpectedOrigin() {
    const domain = process.env.EXPECTED_ORIGIN_DOMAIN;
    const isLocal = !domain || domain === 'localhost' || domain === '127.0.0.1';
    const port = process.env.PORT || '9090';
    return isLocal ? `${getServerOrigin()}:${port}` : getServerOrigin();
}

function getGoogleOAuthRedirectURL() {
    return `${getExpectedOrigin()}/api/auth/google/callback`;
}

module.exports = router;