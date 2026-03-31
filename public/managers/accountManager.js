require('dotenv').config();

const express = require('express');
const uuid = require("uuid-v4")
const dbService = require('../services/accountDBService.js')
const credDBService = require('../services/credentialDBService.js')
const fss = require("../services/fsServices")
const sessionDBService = require('../services/sessionDBService')
const {checkUsernameEmail, findUserByUsername, apiAuthUser} = require("../services/accountDBService");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = express.Router();
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse} = require('@simplewebauthn/server');
const UAParser = require('ua-parser-js');
const multer = require("multer");
const {promises: fs} = require("fs");
const utils = require("../services/utlisService")

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = './temp/avatar';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        } catch (err) {
            console.error('Error creating upload directory:', err);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 3 * 1024 * 1024
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: getGoogleOAuthRedirectURL(),
    scope: ['profile', 'email'],
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        console.log(" Google User Profile Info:");
        console.log(JSON.stringify(profile, null, 2));
        console.log(`Checking if google oauth user exists for profile id: ${profile.id} and email: ${profile.emails[0].value}`)

        if (await dbService.isGoogleOAuthUserExist(profile.id)) {
            console.log("Found user account, proceeding to log in the user")
            const uidResponse = await dbService.getUIDfromOAuth(profile.id);

            // Add validation
            if (!uidResponse) {
                console.error(" UID not found despite user existing!");
                return done(new Error("Failed to retrieve user ID"), null);
            }

            console.log(`Retrieved UID: ${uidResponse}`);
            return done(null, { uid: uidResponse });
        } else {
            console.log("User is not found, proceeding to sign up the user")
            const newUser = await credDBService.insertGoogleOAuthUserAccount(profile);

            if (!newUser || !newUser.uid) {
                console.error(" Failed to create new user!");
                return done(new Error("Failed to create user account"), null);
            }

            console.log(" New user created:", newUser.uid);
            return done(null, { uid: newUser.uid });
        }
    } catch (error) {
        console.error(" OAuth error:", error);
        return done(error, null);
    }
}));

const createSession = async (req, res, uid) => {
    try {
        const parser = new UAParser(req.headers['user-agent']);
        const uaResult = parser.getResult();

        const ip =
            req.headers['x-forwarded-for']?.split(',').shift() ||
            req.socket?.remoteAddress;
        const osName = uaResult.os.name;          // e.g., "Mac OS"
        const osVersion = uaResult.os.version;    // e.g., "10.15.7"
        const browserName = uaResult.browser.name; // e.g., "Chrome"
        const browserVersion = uaResult.browser.version;

        const data = {
            uid: uid,
            sessionOS: `${osName} ${osVersion}`,
            sessionBrowser: `${browserName} ${browserVersion}`,
            sessionIP: ip
        }

        console.log("Creating sessionID...")
        const sessionID = await sessionDBService.createSession(data)

        res.cookie('session_id', sessionID, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 * 7
        });

        const data2 = {
            uid: uid,
            attemptOS: `${osName} ${osVersion}`,
            attemptBrowser: `${browserName} ${browserVersion}`,
            attemptIP: ip
        }

        await dbService.logLoginAttempts(data2)
        return true
    } catch (e) {
        throw new Error("Failed to create session")
    }
}

const logLoginAttempt = async (req, res, uid) => {
    try {
        const {clientOS, clientBrowser, clientIP} = await utils.getClientDeviceInfo(req)

        const data = {
            uid: uid,
            attemptOS: `${clientOS}`,
            attemptBrowser: `${clientBrowser}`,
            attemptIP: `${clientIP}`
        }

        console.log(`Logging Login attempt for uid: ${uid}...`)

        await dbService.logLoginAttempts(data)

        return true
    } catch (e) {
        throw new Error("Failed to log login attempt record")
    }
}

/** Single JSON shape for username/email already registered. */
function sendSignupTakenResponse(res, field) {
    if (field === 'both') {
        return res.status(400).json({
            success: false,
            fieldMessage:
                'An account with this username and email is already registered.',
            slideUpMessage:
                'An account already uses this username and email. Please choose a new one',
            field: 'both'
        });
    }
    const isEmail = field === 'email';
    return res.status(400).json({
        success: false,
        fieldMessage: isEmail
            ? 'An account with this email already exists.'
            : 'An account with this username already exists.',
        slideUpMessage: isEmail
            ? 'An account with this email already exists. Sign in or use a different email.'
            : 'An account with this username already exists. Enter a different one.',
        field: isEmail ? 'email' : 'username'
    });
}

/**
 * Same signup outcome ("already taken") from two places:
 * - SIGNUP_CONFLICT: assertSignupIdentifiersAvailable() before INSERT
 * - SQLITE_CONSTRAINT: UNIQUE on user row (e.g. race, or future unique on email in DB)
 */
function signupTakenFieldFromError(error) {
    if (
        error.code === 'SIGNUP_CONFLICT' &&
        (error.field === 'email' || error.field === 'username' || error.field === 'both')
    ) {
        return error.field;
    }
    if (error.code === 'SQLITE_CONSTRAINT' && error.message) {
        if (error.message.includes('user.userName')) return 'username';
        if (error.message.includes('user.userEmail')) return 'email';
    }
    return null;
}

router.post('/signup', async (req, res) => {
    try{
        console.log("New requests /signup")
        let formData = req.body

        console.log(formData)

        const userData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            userType: formData.userType || 'general',
            userEmail: formData.email,
            userName: formData.username
        };

        if (!await utils.checkValidEmail(userData.userEmail)) {
            return res.status(400).json({
                success: false,
                fieldMessage: 'Invalid email address format',
                slideUpMessage: 'Please enter a valid email address.',
                field: 'email'
            });
        }

        await credDBService.assertSignupIdentifiersAvailable(
            userData.userName,
            userData.userEmail
        );

        let uidResult = await credDBService.insertUserAccount(userData)
        console.log("user Data is inserted")
        let uid = uidResult.uid;

        let data = {
            credentialID: uuid(),
            uid: uid,
            credentialPassword: formData.password,
            changeDate: Date.now()
        };

        let result = await credDBService.insertCredentials(data)
        console.log(result)
        console.log("credentials is inserted")

        await createSession(req, res, uid)
        console.log("Successfully created session")
        return res.status(200).json({ success: true, message: 'Account created successfully' })

    } catch (error){
        console.log(error)

        const takenField = signupTakenFieldFromError(error);
        if (takenField) {
            return sendSignupTakenResponse(res, takenField);
        }

        // Generic error for other cases
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }
    return res.status(200).json({ success: true, message: 'Account created successfully' });
});

router.post("/login", async (req, res) => {
    try{
        console.log("New requests /login")
        let formData = req.body

        console.log(formData)

        const userData = {
            usernameEmail: formData.usernameEmail,
            password: formData.password
        };

        const requiredFields = ["usernameEmail", "password"];
        const emptyFields = requiredFields.filter(field => !formData[field]);

        if (emptyFields.length > 0) {
            alert(`Please fill in: ${emptyFields.join(", ")}`);
            return res.status(400).json({success: false, message: `Bad requests: Field(s) ${emptyFields.join(", ")} is/are required`});
        }

        let uidResponse = await credDBService.checkUsernameEmail(userData.usernameEmail)
        if (uidResponse) {
            console.log(`Found with uid ${uidResponse}`)
            console.log("Now verifying Password")

            const data = {
                uid: uidResponse,
                password: userData.password
            }

            if (await credDBService.checkPassword(data)){
                console.log("Matched, now logging in")

                if (await createSession(req, res, uidResponse)) {
                    console.log("Session successfully created")
                }

                return res.status(200).json({ success: true, message: 'successful' });
            } else {
                console.log("Password is incorrect")
                if (uidResponse){
                    await logLoginAttempt(req, res, uidResponse)
                }
                return res.status(401).json({success: false, message: "Please check your credentials and try again"})
            }

        } else {
            console.log("Username or Email address not found")
            return res.status(400).json({success: false, message: "Please check your credentials and try again"})
        }

    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }

});

router.post("/logout", apiAuthUser, async (req, res) => {
    console.log("New requests /logout")
    if (!req.cookies.session_id) {
        return res.status(403).json({success:false, message: `Bad requests: Session ID not found`})
    }

    if (await sessionDBService.destroySession(req.cookies.session_id)){
        res.clearCookie('session_id');
        req.session.destroy((error) => {
            if (error) {
                console.error(`Error when destroying session: ${error}`)
                return res.status(500).json({success: false, message: "Error while logout"});
            }
        })

        return res.status(200).json({success: true});

    }
});


router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', {
        session: false,  // Since you're managing sessions manually
        failureRedirect: '/login'
    }),
    async (req, res) => {
        try {
            console.log(req.user.uid)
            await createSession(req, res, req.user.uid)
            console.log("SessionID successfully created, redirecting to home")
            res.redirect("/home")
        } catch (e) {
            throw new Error("Unable to Login")
        }
    }
);

router.post("/passkey/gen-option", apiAuthUser, async (req, res) => {
    try {

        if (!req.cookies.session_id){
            res.status(403).json({successful: false, message: "Unauthorized"})
        }

        let userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

        let userInfo = {
            sessionID: req.cookies.session_id,
            userName: await dbService.findUserNameByUserID(userID)
        }

        console.log(`Attempting to add Passkey to uid: ${userID} username: ${userInfo.userName}`)

        if (!userInfo) return res.status(400).json({ error: "No user found" });

        const options = await generateRegistrationOptions({
            rpName: 'Singularity',
            rpID: process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost',
            userID: new TextEncoder().encode(userID),
            userName: userInfo.userName, // Required to have non-empty value :/
            userDisplayName: userInfo.userName, // Required to have non-empty value :/
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        req.session.challenge = options.challenge;

        console.log("Options:", options);
        console.log("Options JSON:", JSON.stringify(options, null, 2));

        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/passkey/gen-auth-option", async (req, res) => {
    try {
        const options = await generateAuthenticationOptions({
            rpID: process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost',
            allowCredentials: [],
            userVerification: 'required',
            timeout: 60000,
        });

        req.session.challenge = options.challenge;

        console.log(" Auth options generated");
        res.json(options);

    } catch (err) {
        console.error(' Error generating auth options:', err);
        res.status(500).json({ error: err.message });
    }
})

router.post("/passkey/verify-register", apiAuthUser, async (req, res) => {
    const { attResp } = req.body;
    const expectedChallenge = req.session.challenge;

    try {
        console.log("Verifying passkey register")

        const verification = await verifyRegistrationResponse({
            response: attResp,
            expectedChallenge,
            expectedOrigin: getExpectedOrigin(), // match your frontend
            expectedRPID: getExpectedRPID(),
        });
        console.log(`Credential: ${JSON.stringify(verification.registrationInfo.credential)}`)

        if (verification.verified) {
            console.log(" User passkey is verified");
            console.log(" Saving passkey information to database...");

            const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
            const keyID = verification.registrationInfo.credential.id;
            const publicKey = verification.registrationInfo.credential.publicKey;
            const signCount = verification.registrationInfo.credential.counter

            console.log(verification.registrationInfo)
            console.log("Credential ID:" + keyID)
            console.log("Credential Public Key:" + Buffer.from(publicKey).toString('base64'))

            const transports = attResp.response.transports || [];

            const providerName = inferProviderName(transports, req.headers['user-agent']);
            console.log("Provider: " + providerName)

            const data = {
                keyID: keyID,
                uid: userID,
                keyName: providerName,
                transports: JSON.stringify(transports),
                publicKey: publicKey,
                signCount: signCount
            };

            await credDBService.savePasskey(data);

            //  Clear challenge from session
            delete req.session.challenge;

            console.log(" Passkey saved successfully!");
        }

        res.json({ verified: verification.verified });
    } catch (err) {
        console.error(err);
        res.status(400).json({ verified: false, error: err.message });
    }
})

router.post("/passkey/verify-authentication", async (req, res) => {
    try {
        const { credential } = req.body;
        const expectedChallenge = req.session.challenge;

        if (!expectedChallenge || !credential) {
            return res.status(400).json({
                successful: false,
                message: "Bad request: Missing required Field",
            });
        }

        console.log("Credential:", credential);

        const passkey = await dbService.getPasskey(credential.id);
        if (!passkey) {
            console.log(" Passkey not found");
            return res.status(400).json({
                verified: false,
                error: "Passkey not found",
            });
        }

        try {
            let verification = await verifyAuthenticationResponse({
                response: credential,
                expectedChallenge: expectedChallenge,
                expectedOrigin: getExpectedOrigin(),
                expectedRPID: getExpectedRPID(),
                credential: {
                    id: passkey.keyID,
                    publicKey: passkey.publicKey,
                    counter: passkey.signCount,
                    transports: passkey.transports,
                },
                requireUserVerification: true,
            });

            console.log("Result: " + JSON.stringify(verification))

            // MODIFIED: Capture device info and update lastUsed
            if (verification.verified) {
                let uid = await dbService.findUserIDByPasskeyID(passkey.keyID)

                // Get device information from user agent
                const userAgent = req.headers['user-agent'] || 'Unknown';
                const parser = new UAParser(userAgent);
                const result = parser.getResult();
                const deviceInfo = `${result.browser.name || 'Unknown Browser'} on ${result.os.name || 'Unknown OS'}`;

                // Update lastUsed timestamp and device when passkey is successfully used
                try {
                    await credDBService.updatePasskeyLastUsed(passkey.keyID);
                    console.log("LastUsed timestamp and device updated successfully");
                } catch (updateError) {
                    console.error("Failed to update lastUsed:", updateError);
                }

                if (await createSession(req, res, uid)) {
                    console.log("Session successfully created")
                }

                return res.json({
                    successful: true
                });
            } else {
                console.log("Verification failed");
                return res.status(400).json({
                    successful: false,
                    message: "Verification failed"
                });
            }
        } catch (error) {
            console.error(error);
            return res.status(400).send({ successful:false, message: error.message });
        }

    } catch (err) {
        console.error("Authentication error:", err);
        res.status(500).json({
            verified: false,
            error: err.message,
        });
    }
});

router.post("/passkey/list", apiAuthUser, async (req, res) => {
    let userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    try {
        let passkeyList = await dbService.listPasskey(userID)
        console.log(passkeyList)
        return res.send(passkeyList)
    } catch (err) {
        console.error(err);
        return res.send("Could not fetch passkey List")
    }
})

router.post("/passkey/delete", apiAuthUser, async (req, res) => {
    console.log("Raw body:", req.body);

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    const passkeyID = req.body.passkeyID;

    console.log(`Received uid ${userID} for deleting passkeyID ${passkeyID}, checking`);

    const owner = await dbService.findUserIDByPasskeyID(passkeyID);

    if (owner !== userID) {
        console.log(`uid ${userID} does not own passkeyID ${passkeyID}, terminating`);
        return res.status(403).json({
            successful: false,
            message: "Unauthorized"
        });
    }

    const result = await dbService.deletePasskey(passkeyID);

    if (result) {
        console.log(`uid ${userID} deleted passkeyID ${passkeyID}`);
        return res.status(200).json({
            successful: true
        });
    } else {
        console.log(`uid ${userID} failed to delete passkeyID ${passkeyID}`);
        return res.status(500).json({
            successful: false,
            message: "Failed to delete passkey"
        });
    }
});

router.post("/session/list", apiAuthUser, async (req, res) => {
    let userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    try {
        let sessionList = await dbService.listSessions(userID)
        console.log(sessionList)
        return res.send(sessionList)
    } catch (err) {
        console.error(err);
        return res.send("Could not fetch passkey List")
    }
})

router.post("/session/logout", apiAuthUser, async(req, res) => {
    if (!req.cookies.session_id){
        res.status(403).json({successful: false, message: "Unauthorized"})
    }

    let userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    let sessionID = req.body.sessionID;
    let target = await dbService.findUserIDBySessionID(sessionID);

    if (userID !== target) {
        return res.status(403).json({successful: false, message: `Unauthorized`})
    }
    if( await dbService.logoutSession(sessionID) ){
        console.log(`Uid: ${userID} have logged out session ${sessionID}`);
        return res.status(200).json({successful: true})
    } else {
        return res.status(500).json({successful: false, message: `Failed to logout session ${sessionID} for uid ${userID}`})
    }

})

router.post("/loginAttempts/deleteAll", apiAuthUser, async(req, res) => {
    if (!req.cookies.session_id){
        res.status(403).json({successful: false, message: "Unauthorized"})
    }

    let userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    if( await dbService.deleteAllLoginAttempts(userID) ){
        console.log(`Uid: ${userID} have deleted all current login attempt history`);
        return res.status(200).json({successful: true})
    } else {
        console.log(`Failed to delete all login attempt history for Uid: ${userID}`);
        return res.status(500).json({successful: false, message: `Failed to delete all login attempt history for Uid: ${userID}`})
    }

})

router.post("/userInfo/query", apiAuthUser, async(req, res) => {
    if (!req.cookies.session_id){
        res.status(403).json({successful: false, message: "Unauthorized"})
    }

    let userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    let userinfo = await dbService.getUserInfo(userID);

    if( userinfo ){
        console.log(`Uid: ${userID} query for user info`);
        return res.send({successful: true, userinfo})
    } else {
        console.log(`Failed to query user info for Uid: ${userID}`);
        return res.status(500).json({successful: false, message: `Failed to query user info for Uid: ${userID}`})
    }

})

router.post("/user/search", apiAuthUser, async (req, res) => {
    if (!req.cookies.session_id){
        res.status(403).json({successful: false, message: "Unauthorized"})
    }

    let selfUID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (selfUID) {
        let { query } = req.body
        try {
            let users = await findUserByUsername(query, selfUID)
            return res.status(200).json({successful: true, users})
        } catch (err) {
            console.log(err)
            return res.status(500).json({successful: false, message: "Internal Server Error"})
        }

    } else {
        return res.status(403).json({successful: false, message: "Unauthorized"})
    }
})

router.post("/password/change", apiAuthUser, async (req, res) => {
    try {
        if (!req.cookies.session_id) {
            console.log(" Unauthorized attempt for changing password");
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
        const userInfo = await dbService.getUserInfo(userID);
        const { currentPassword, newPassword, confirmPassword } = req.body;

        console.log(` Attempting to change password for UID: ${userID}`);

        if (userInfo.userType === "google") {
            console.log(" Change Password not applicable for Google OAuth users");
            return res.status(400).json({
                successful: false,
                message: "Password change not available for Google OAuth users",
            });
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            console.log(" Missing required fields");
            return res.status(400).json({
                successful: false,
                message: "Please fill in all required fields",
            });
        }

        const validPassword = await credDBService.checkPassword({
            uid: userID,
            password: currentPassword,
        });

        if (!validPassword) {
            console.log(" Current password does not match");
            return res.status(400).json({
                successful: false,
                message: "Current password is incorrect",
            });
        }

        if (newPassword !== confirmPassword) {
            console.log(" New password and confirm password do not match");
            return res.status(400).json({
                successful: false,
                message: "New password and confirmation do not match",
            });
        }

        const updateResult = await credDBService.updatePassword({
            uid: userID,
            password: newPassword,
        });

        if (!updateResult) {
            console.log(" Failed to update password");
            return res.status(500).json({
                successful: false,
                message: "Failed to update user password",
            });
        }

        console.log(" Password changed successfully");
        return res.status(200).json({
            successful: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        console.error(" Error changing password:", error);
        return res.status(500).json({
            successful: false,
            message: "Internal server error",
        });
    }
});

/** POST Replace user's profile picture
 * @description Uploads and replaces the user's profile picture. The image is automatically cropped to a square and compressed.
 * @param {File} file - Image file to upload (multipart/form-data, required)
 */

router.post("/profile-pic/replace", apiAuthUser, upload.single('file'), async (req, res) => {
    const userID = req.userID;
    const uploadedFile = req.file;

    console.log(`User ID is ${userID}`);
    console.log(`Original file:`, uploadedFile);

    try {
        // Compress and get buffer
        let compressedBuffer = await utils.cropAndCompressImage(uploadedFile);

        console.log(`Compressed buffer size: ${compressedBuffer.length} bytes`);

        // Update the uploadedFile object with compressed data
        const compressedFile = {
            ...uploadedFile,
            buffer: compressedBuffer,
            size: compressedBuffer.length
        };

        console.log(`Passing to updateProfilePic:`, compressedFile);

        let result = await fss.updateProfilePic(userID, compressedFile);

        if (result) {
            return res.status(200).json({ success: true, message: "Profile picture updated" });
        } else {
            return res.status(500).json({ success: false, message: "Error in updating profile picture of the user" });
        }
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ success: false, message: "Unable to update profile picture of the user" });
    }
});

/** POST Removes user's profile picture
 * @description Removes the user profile picture.
 */
router.post("/profile-pic/remove", apiAuthUser, async(req, res) => {
    const userID = req.userID;
    try {
        await fss.removeProfilePic(userID);
        return res.status(200).json({ success: true, message: "Profile picture removed" });
    } catch(error) {
        return res.status(500).json({ success: false, message: "Unable to remove profile picture of the user" });
    }
})

/** POST Fetches user's profile picture
 * @description Fetches user profile picture.
 * @param {array} userIDs (optional) - The userIDs for fetching the profile image in batch, can be multiple
 * Defaults fetch current user profile picture when userIDs field is not given any value
 */

router.post("/profile-pic/fetch", apiAuthUser, async(req, res) => {
    let { userIDs } = req.body; // accept an array of userID to fetch their user profile picture

    if (!userIDs) {
        userIDs = [req.userID]; // Default to fetch the current user user profile picture if not supplied
    } else if (!Array.isArray(userIDs)) {
        return res.status(400).json({ success: false, message: "Error fetching user profile pictures, userIDs must be an array" })
    }

    console.log(`User IDs is / are: ${userIDs}`)

    try {
        let userProfilePicData = await fss.fetchProfilePics(userIDs)
        return res.status(200).json({ success: true, data: userProfilePicData })
    } catch(error) {
        return res.status(500).json({ success: false, message: "Unable to fetch user profile pictures" })
    }

})

router.post("/account/delete", apiAuthUser, async (req, res) => {
    const userID = req.userID;

    if (!userID) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        const result = await dbService.deleteUserAccount(userID);

        if (result) {
            req.session.destroy(() => {}); // destroy session after deletion
            return res.status(200).json({ success: true });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to delete account"
        });

    } catch (err) {
        console.error("Delete account error:", err);
        return res.status(500).json({
            success: false,
            message: "Unable to delete account"
        });
    }
});

function inferProviderName(transports, userAgent) {
    const ua = userAgent.toLowerCase();
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    if (transports.includes('internal')) {
        // Use UAParser for more detailed device info
        const osName = result.os.name || 'Unknown';
        const deviceModel = result.device.model || '';
        const deviceVendor = result.device.vendor || '';

        if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('mac')) {
            // Build descriptive name for Apple devices
            if (deviceModel) {
                return `iCloud Keychain (${deviceModel})`;
            } else if (ua.includes('iphone')) {
                return `iCloud Keychain (iPhone)`;
            } else if (ua.includes('ipad')) {
                return `iCloud Keychain (iPad)`;
            } else if (ua.includes('mac')) {
                return `iCloud Keychain (Mac)`;
            }
            return 'iCloud Keychain';
        } else if (ua.includes('windows')) {
            return `Windows Hello (${osName})`;
        } else if (ua.includes('android')) {
            if (deviceVendor && deviceModel) {
                return `Google Password Manager (${deviceVendor} ${deviceModel})`;
            } else if (deviceModel) {
                return `Google Password Manager (${deviceModel})`;
            }
            return 'Google Password Manager';
        } else if (ua.includes('samsung')) {
            if (deviceModel) {
                return `Samsung Pass (${deviceModel})`;
            }
            return 'Samsung Pass';
        } else {
            return 'Platform Authenticator';
        }
    } else if (transports.includes('usb') || transports.includes('nfc')) {
        return 'Hardware Security Key';
    } else if (transports.includes('hybrid')) {
        // For hybrid (cross-device), we can't detect the phone type from desktop browser
        // Return a generic clean name matching the mockup style
        return 'Cross-Device Passkey';
    } else {
        return 'Passkey';
    }
}

function getServerOrigin() {
    if (process.env.USE_NGINX_SSL === 'true' || process.env.ENABLE_HTTPS === 'false') {
        return `http://${process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost'}`;
    } else {
        return `https://${process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost'}`;
    }
}

function getExpectedRPID() {
    return process.env.EXPECTED_ORIGIN_DOMAIN || 'localhost';
}

function getExpectedOrigin() {
    if (process.env.EXPECTED_ORIGIN_DOMAIN === 'localhost' ||
        process.env.EXPECTED_ORIGIN_DOMAIN === '127.0.0.1' ||
        process.env.EXPECTED_ORIGIN_DOMAIN == null) {

        if (process.env.PORT != null) {
            return `${getServerOrigin()}:${process.env.PORT}`;
        } else {
            return `${getServerOrigin()}:9090`;
        }
    } else {
        return `${getServerOrigin()}`;
    }
}

function getGoogleOAuthRedirectURL() {

    if (process.env.EXPECTED_ORIGIN_DOMAIN === 'localhost' ||
        process.env.EXPECTED_ORIGIN_DOMAIN === '127.0.0.1' ||
        process.env.EXPECTED_ORIGIN_DOMAIN == null) {

        if (process.env.PORT != null) {
            return `${getServerOrigin()}:${process.env.PORT}/api/auth/google/callback`;
        } else {
            return `${getServerOrigin()}:9090/api/auth/google/callback`;
        }
    } else {
        return `${getServerOrigin()}/api/auth/google/callback`;
    }
}

console.log(getExpectedRPID())

module.exports = router;
