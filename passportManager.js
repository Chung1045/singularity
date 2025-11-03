const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');

passport.serializeUser((user, done) => {
    done(null, user.userUUID);
});

passport.deserializeUser(async (userUUID, done) => {
    try {
        const user = await User.findOne({ userUUID: userUUID });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLEOAUTH_CALLBACK_URL,
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ userEmail: profile.emails[0].value });

        if (!user) {
            // Create a new user if they don't exist
            let newUserUUID = uuidv4();
            let userName = profile.displayName;
            let userNameSuffix = 1;

            // Check if username exists and append a number if it does
            while (await User.findOne({ userName: userName })) {
                userName = `${profile.displayName}${userNameSuffix}`;
                userNameSuffix++;
            }

            user = new User({
                userUUID: newUserUUID,
                userName: userName,
                userEmail: profile.emails[0].value,
                userAuthenticateType: "google",
                googleId: profile.id
            });
            await user.save();
        } else if (!user.googleId) {
            // If user exists but doesn't have a googleId, update it
            user.googleId = profile.id;
            user.userAuthenticateType = "google";
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));
