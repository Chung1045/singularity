const express = require('express');
const session = require('express-session')
const uuid = require("uuid-v4")
const dbService = require('./public/services/accountDBService.js')
const credDBService = require('./public/services/credentialDBService.js')
const sessionDBService = require('./public/services/sessionDBService')
const {checkUsernameEmail} = require("./public/services/accountDBService");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = express.Router();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLEOAUTH_CALLBACK_URL,
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // let user = await User.findOne({ userEmail: profile.emails[0].value });
        //
        // if (!user) {
        //     // Create a new user if they don't exist
        //     let newUserUUID = uuidv4();
        //     let userName = profile.displayName;
        //     let userNameSuffix = 1;
        //
        //     // Check if username exists and append a number if it does
        //     while (await User.findOne({ userName: userName })) {
        //         userName = `${profile.displayName}${userNameSuffix}`;
        //         userNameSuffix++;
        //     }
        //
        //     user = new User({
        //         userUUID: newUserUUID,
        //         userName: userName,
        //         userEmail: profile.emails[0].value,
        //         userAuthenticateType: "google",
        //         googleId: profile.id
        //     });
        //     await user.save();
        // } else if (!user.googleId) {
        //     // If user exists but doesn't have a googleId, update it
        //     user.googleId = profile.id;
        //     user.userAuthenticateType = "google";
        //     await user.save();
        // }
        console.log("🔍 Google User Profile Info:");
        console.log(JSON.stringify(profile, null, 2));

        return done(null);
    } catch (error) {
        return done(error, null);
    }
}));

router.post('/signup', async (req, res) => {
    try{
        console.log("New requests /signup")
        let formData = req.body

        console.log(formData)

        const userData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            userType: formData,
            userEmail: formData.email,      // changed
            userName: formData.username     // changed
        };

        let uidResult = await dbService.insertUserAccount(userData)
        console.log("user Data is inserted")
        let uid = uidResult.uid; // extract the string value

        let data = {
            credentialID: uuid(),
            uid: uid,
            credentialPassword: formData.password, // changed
            changeDate: Date.now()
        };

        let result = await credDBService.insertCredentials(data)
        console.log(result)
        console.log("credentials is inserted")
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

                let sessionID = await sessionDBService.createSession(data)

                console.log(`UID: ${data.uid}`)
                console.log(`SessionID: ${sessionID}`)

                req.session.user = {
                    uid: uidResponse,
                    sessionID: sessionID
                };

                console.log(req.session);
                console.log(req.session.user);
                console.log("UID:", req.session.user.uid);
                console.log("Session ID:", req.session.user.sessionID);
                return res.status(200).json({ success: true, message: 'successful' });
            } else {
                console.log("Check your credentials again")
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
    if (!req.session.user || !req.session.user.sessionID) {
        return res.status(400).json({success:false, message: `Bad requests: Session ID not found`})
    }

    if (await sessionDBService.destroySession(req.session.user.sessionID)){
        // req.logout((error) => {
        //     if (error) {
        //         console.error(`Error when logout: ${error}`)
        //         return res.status(500).json({success: false, message: "Error while logout"});
        //     }
        //
        // });

        req.session.destroy((error) => {
            if (error) {
                console.error(`Error when destroying session: ${error}`)
                return res.status(500).json({success: false, message: "Error while logout"});
            }
        })

        res.redirect('/login');

    }
});

module.exports = router;
