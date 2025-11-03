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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serves /scripts, /css, /images
app.set('views', __dirname + '/views');
const sessionDBService = require("./public/services/sessionDBService.js")
const accountManagerRouter = require('./accountManager');

app.use('/api', accountManagerRouter);

app.get('/', (req, res) => {
    res.redirect("/login");
});

app.get('/signup',(req, res) => {
    res.render("tempSignup", {csrfToken: req.csrfToken()})
})

app.get('/login', (req, res) => {
    res.render("tempLogin", {csrfToken: req.csrfToken()})
})

app.get('/home', async (req, res) => {
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

    res.render("tempHome", { csrfToken: req.csrfToken() });
});

// ✅ Example route that returns a CSRF token to the frontend
app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
