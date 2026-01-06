const express = require('express');
const session = require('express-session');
const csrf = require('@dr.pogodin/csurf');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');

const startupCheck = require("./public/services/startupCheck");
const routeManager = require("./public/managers/routesManager");
const accountManagerRouter = require("./public/managers/accountManager");
const aiAgentManagerRouter = require("./public/managers/aiAgentManager");
const projectManagerRouter = require("./public/managers/projectManager");
const notifManager = require("./public/managers/notificationManager");
const testRouteManager = require("./public/managers/testRoutesManager");

const PORT = process.env.PORT || 9090;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'strict'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

console.log("Server is starting...")

if (process.env.ENABLE_USER_CHECKING === 'true') {
    const csrfProtection = csrf({
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }
    });
    app.use(csrfProtection);
} else {

    const red = '\x1b[31m';
    const yellow = '\x1b[33m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    console.warn(`\n${red}${bold}${"=".repeat(70)}`);
    console.warn(`WARNING: SECURITY FEATURES DISABLED`);
    console.warn(`${"=".repeat(70)}${reset}`);
    console.warn(`${yellow}User authentication and CSRF protection are NOT enforced!`);
    console.warn(`This should ONLY be used in development/testing.`);
    console.warn(`DO NOT run this configuration in production!${reset}`);

    console.warn(`${red}${bold}To enforce User and CSRF checking, set the value of ENABLE_USER_CHECKING environment variable to 'true'${reset}`);
    console.warn(`${red}${bold}${"=".repeat(70)}${reset}\n`);

    app.use((req, res, next) => {
        req.csrfToken = () => 'disabled';
        next();
    });
}

app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views');
app.use(express.static('public'));

app.use("/api", accountManagerRouter);
app.use("/api", projectManagerRouter);
app.use("/api", notifManager);
app.use("/api", aiAgentManagerRouter);
app.use("/test", testRouteManager);
app.use("/", routeManager);

async function startServer() {
    try {
        await startupCheck(); // ensure DB + MinIO are ready

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Startup failed:", err);
        process.exit(1);
    }
}

startServer();
