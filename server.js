require('dotenv').config(); // currently used in cursor AI

const express = require('express');
const session = require('express-session');
const csrf = require('@dr.pogodin/csurf');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');
const {serverLogger, logAccessedPath} = require("./public/services/loggingService");

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

async function serverSetUp() {
    app.use((req, res, next) => {
        logAccessedPath(req)
        next();
    });

    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));

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

    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/public/views');

    app.use(express.static('public'));

    app.use("/api", accountManagerRouter);
    app.use("/api", projectManagerRouter);
    app.use("/api", notifManager);
    app.use("/api", aiAgentManagerRouter);
    app.use("/test", testRouteManager);
    app.use("/", routeManager);
}

async function checkServerEnvironment() {

    if (process.env.ENABLE_USER_CHECKING === 'true') {
        const csrfProtection = csrf({
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            }
        });
        app.use(csrfProtection);
        serverLogger.warn(`The server is started in production mode with user checking enabled.`)
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

        console.warn(`${yellow}Waiting 15 seconds before starting server...${reset}`);

        serverLogger.warn(`SERVER STARTED IN DEVELOPMENT MODE - SECURITY FEATURES DISABLED!`);
        serverLogger.warn(`User authentication and CSRF protection are NOT enforced.`);

        const start = Date.now();
        while (Date.now() - start < 15000) {
        }

        console.warn(`${yellow}Proceeding with server startup...${reset}\n`);
        serverLogger.info(`Server startup resumed.`);

        app.use((req, res, next) => {
            req.csrfToken = () => 'disabled';
            next();
        });
    }
    // Add cache control for static files in development
    if (process.env.NODE_ENV !== 'production') {
        app.use((req, res, next) => {
            // Disable caching for JS, CSS, and other static files in development
            if (req.url.match(/\.(js|css|json)$/)) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
            next();
        });
    }
}

async function startServer() {
    try {
        serverLogger.info('Server is starting...');
        await checkServerEnvironment()
        await startupCheck(); // ensure DB + MinIO are ready
        await serverSetUp()

        server.listen(PORT, () => {
            serverLogger.info(`Server running on http://localhost:${PORT}`);
            serverLogger.info('Server is now online');
        });

    } catch (err) {
        serverLogger.error(`Server Startup Failed:`, err);
        console.error("Startup failed:", err);
        process.exit(1);
    }
}

startServer();
