const express = require('express');
const session = require('express-session')
const csrf = require("@dr.pogodin/csurf")
const cookieParser = require('cookie-parser');
const uuid = require('uuid-v4')

const port = process.env.PORT || 9090;
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const passport = require('passport');


app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 * 7,
        sameSite: 'strict'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());

const csrfProtection = csrf({
    cookie: {
        httpOnly: true, // Edit to false to debug
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

app.use(csrfProtection)

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serves /scripts, /css, /images
app.set('views', __dirname + '/public/views');
const sessionDBService = require("./public/services/sessionDBService.js")
const accountManagerRouter = require('./public/managers/accountManager');
const dbService = require("./public/services/accountDBService");

app.use('/api', accountManagerRouter);

app.get('/', (req, res) => {
    if (req.cookies.session_id) {
        return res.redirect("/home")
    }
    res.redirect("/login");
});

app.get('/signup',(req, res) => {
    res.render("tempSignup", {csrfToken: req.csrfToken()})
})

app.get('/login', (req, res) => {
    res.render("tempLogin", {csrfToken: req.csrfToken()})
})


app.get('/home', async(req, res) => {
    console.log("New request from /home");

    // ✅ Use req.cookies instead of req.cookie or req.session
    console.log("Cookies:", req.cookies);

    const sessionID = req.cookies?.session_id; // match the name you set in res.cookie()
    console.log("Session ID from cookie:", sessionID);

    if (!sessionID) {
        console.log("❌ No session cookie found, redirecting to login");
        return res.redirect("/login");
    }

    console.log(`Checking if session ${sessionID} is active...`);
    const sessionData = await sessionDBService.isSessionActive(sessionID);

    console.log(`Is session active: ${!!sessionData}`);

    if (!sessionData) {
        console.log("❌ Session not active, redirecting to login");
        return res.redirect("/login");
    }

    console.log("✅ Session valid, rendering home page");

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (!userID){ 
        return res.redirect("/login");
    }

    let userInfo = await dbService.getUserInfo(userID)
    
    // NEW: Check if userInfo exists
    if (!userInfo) {
        console.error(`❌ User info not found for userID: ${userID}`);
        return res.redirect('/login');
    }
    
    console.log("Sending to tempHome:", userInfo); 
    res.render("tempHome", {
        csrfToken: req.csrfToken(),
        userInfo: userInfo 
    });

    // res.render("tempHome", { csrfToken: req.csrfToken() });
});

app.get('/passkeys', async (req, res) => {
    if (!req.cookies.session_id) {
        return res.status(400).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (!userID) {
        return res.redirect('/login');
    }

    let passkeys = await dbService.listPasskey(userID);

    // CRITICAL: Ensure it's always an array
    passkeys = Array.isArray(passkeys) ? passkeys : [];

    // MODIFIED: Include lastUsed and lastUsedDevice in the normalized fields
    passkeys = passkeys.map(pk => ({
        keyID: pk.keyID || '',
        keyName: pk.keyName || 'Unnamed Passkey',
        dateCreate: pk.dateCreate || new Date().toISOString(),
        lastUsed: pk.lastUsed || null,  // ADDED: Include lastUsed field
        lastUsedDevice: pk.lastUsedDevice || null  // ADDED: Include device info
    }));

    res.locals.passkeys = passkeys;

    let userInfo = await dbService.getUserInfo(userID);
    
    // NEW: Check if userInfo exists
    if (!userInfo) {
        console.error(`❌ User info not found for userID: ${userID}`);
        return res.redirect('/login');
    }

    res.render("tempPasskey", {
        csrfToken: req.csrfToken(),
        userInfo: userInfo
    });
});

app.get('/profile', async (req, res) => {
    if (!req.cookies.session_id) {
        return res.status(400).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    
    if (!userID) {
        return res.redirect('/login');
    }

    let userInfo = await dbService.getUserInfo(userID)
    
    // OLD: userInfo.hasPasskey = hasPasskey;
    // NEW: Check if userInfo exists before setting properties
    if (!userInfo) {
        console.error(`❌ User info not found for userID: ${userID}`);
        return res.redirect('/login');
    }
 
    //check if user has passkeys
    const hasPasskey = await dbService.hasUserPasskeys(userID);
    userInfo.hasPasskey = hasPasskey;

   

    // res.render("tempUserProfile", {userInfo: userInfo, csrfToken: req.csrfToken()});

    //i commented out the line above and added the lines below to handle potential csrfToken errors
    //to say in short term, i wanna add a logout function in the profile page but it seems that sometimes
    //the csrfToken is not found and it throws an error, by adding a let statement and try catch block
    //i can do logout without errors

    let csrfToken = '';
    try {
    csrfToken = req.csrfToken() || '';
    } catch (err) {
    console.error('CSRF token error:', err);
    }
    res.render("tempUserProfile", {userInfo: userInfo, csrfToken: csrfToken});
});

app.get('/session', async (req, res) => {
    if (!req.cookies.session_id) {
        return res.status(400).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (!userID) {
        return res.redirect('/login');
    }

    const sessions = await dbService.listSessions(userID)
    const loginAttempts = await dbService.listLoginAttempts(userID)
    
    // NEW: Get user info for sidebar
    let userInfo = await dbService.getUserInfo(userID);
    
    if (!userInfo) {
        console.error(`❌ User info not found for userID: ${userID}`);
        return res.redirect('/login');
    }

    res.render("tempSession", { 
        csrfToken: req.csrfToken(), 
        sessions: sessions, 
        loginAttempts: loginAttempts,
        userInfo: userInfo 
    });
});

app.get('/change-password', async (req, res) => {
    if (!req.cookies.session_id) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
    if (!userID) {
        return res.redirect('/login');
    }

    res.render("tempChangePassword", { csrfToken: req.csrfToken() });
});


// ✅ Example route that returns a CSRF token to the frontend
app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
