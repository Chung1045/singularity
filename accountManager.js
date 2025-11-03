const express = require('express');
const uuid = require("uuid-v4")
const dbService = require('./public/services/accountDBService.js')
const credDBService = require('./public/services/credentialDBService.js')
const sessionDBService = require('./public/services/sessionDBService')
const {checkUsernameEmail} = require("./public/services/accountDBService");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = express.Router();
const UAParser = require('ua-parser-js');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLEOAUTH_CALLBACK_URL,
    scope: ['profile', 'email'],
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        console.log("🔍 Google User Profile Info:");
        console.log(JSON.stringify(profile, null, 2));
        console.log(`Checking if google oauth user exists for profile id: ${profile.id} and email: ${profile.emails[0].value}`)

        if (await dbService.isGoogleOAuthUserExist(profile.id)) {
            console.log("Found user account, proceeding to log in the user")
            const uidResponse = await dbService.getUIDfromOAuth(profile.id);

            // Add validation
            if (!uidResponse) {
                console.error("❌ UID not found despite user existing!");
                return done(new Error("Failed to retrieve user ID"), null);
            }

            console.log(`Retrieved UID: ${uidResponse}`);
            return done(null, { uid: uidResponse });
        } else {
            console.log("User is not found, proceeding to sign up the user")
            const newUser = await dbService.insertGoogleOAuthUserAccount(profile);

            if (!newUser || !newUser.uid) {
                console.error("❌ Failed to create new user!");
                return done(new Error("Failed to create user account"), null);
            }

            console.log("✅ New user created:", newUser.uid);
            return done(null, { uid: newUser.uid });
        }
    } catch (error) {
        console.error("❌ OAuth error:", error);
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
            attemptOS: `${osName} ${osVersion}`,
            attemptBrowser: `${browserName} ${browserVersion}`,
            attemptIP: ip
        }

        console.log(`Logging Login attempt for uid: ${uid}...`)

        await dbService.logLoginAttempts(data)

        return true
    } catch (e) {
        throw new Error("Failed to log login attempt record")
    }
}

router.post('/signup', async (req, res) => {
    try{
        console.log("New requests /signup")
        let formData = req.body

        console.log(formData)

        const userData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            userType: formData,
            userEmail: formData.email,
            userName: formData.username
        };

        let uidResult = await dbService.insertUserAccount(userData)
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

        if (await createSession(req, res, uid)){
            console.log("Successfully created session")
        }

    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }
    return res.status(200).json({ success: true, message: 'successful' });
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

        let uidResponse = await checkUsernameEmail(userData.usernameEmail)
        if (uidResponse) {
            console.log(`Found with uid ${uidResponse}`)
            console.log("Now verifying Password")

            const data = {
                uid: uidResponse,
                password: userData.password
            }

            if (await dbService.checkPassword(data)){
                console.log("Matched, now logging in")

                if (await createSession(req, res, uidResponse)) {
                    console.log("Session successfully created")
                }

                return res.status(200).json({ success: true, message: 'successful' });
            } else {
                console.log("Check your credentials again")
                if (uidResponse){
                    await logLoginAttempt(req, res, uidResponse)
                }
                return res.status(400).json({success: false, message: "Check your credentials again"})
            }

        } else {
            console.log("Username or Email address not found")
            return res.status(400).json({success: false, message: "Username or Email address not found"})
        }

    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }

});

router.post("/logout", async (req, res) => {
    console.log("New requests /logout")
    if (!req.cookies.session_id) {
        return res.status(400).json({success:false, message: `Bad requests: Session ID not found`})
    }

    if (await sessionDBService.destroySession(req.cookies.session_id)){
        req.session.destroy((error) => {
            if (error) {
                console.error(`Error when destroying session: ${error}`)
                return res.status(500).json({success: false, message: "Error while logout"});
            }
        })

        res.redirect('/login');

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

module.exports = router;
