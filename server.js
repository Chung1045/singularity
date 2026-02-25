require('dotenv').config();

const express = require('express');
const session = require('express-session');
const csrf = require('@dr.pogodin/csurf');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const passport = require('passport');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const {serverLogger, logAccessedPath, logger} = require("./public/services/loggingService");

const startupCheck = require("./public/services/startupCheck");
const routeManager = require("./public/managers/routesManager");
const accountManagerRouter = require("./public/managers/accountManager");
const aiAgentManagerRouter = require("./public/managers/aiAgentManager");
const projectManagerRouter = require("./public/managers/projectManager");
const notifManager = require("./public/managers/notificationManager");
const testRouteManager = require("./public/managers/testRoutesManager");

const PORT = process.env.PORT || 9090;

const app = express();
let server = null

async function createServer() {
    try {
        if (process.env.ENABLE_HTTPS === 'true') {
            serverLogger.info("Starting HTTPS Server");

            if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH) {
                throw new Error("SSL Key or Certificate paths not found");
            }

            const httpsOptions = {
                key: fs.readFileSync(process.env.SSL_KEY_PATH),
                cert: fs.readFileSync(process.env.SSL_CERT_PATH),
            };

            server = https.createServer(httpsOptions, app);
        } else {
            serverLogger.warn("Starting HTTP Server, TRAFFIC IS NOT ENCRYPTED!!!");
            serverLogger.warn("DO NOT USE THIS IN PRODUCTION!!");
            server = http.createServer(app);
        }

    } catch (error) {
        serverLogger.error("UNABLE TO START SERVER:", error);
        serverLogger.warn("Please check if the server key and certificate files exist and are correctly configured.");
        process.exit(1);
    }
}

createServer()

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store user socket connections (userID -> socketID)
const userSockets = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`\n[Socket.io] Client connected: ${socket.id}`);
    serverLogger.info(`Socket connected: ${socket.id}`);

    // Register user socket
    socket.on('register', (userID) => {
        if (userID) {
            userSockets.set(userID, socket.id);
            console.log(`[Socket.io] User registered: ${userID} → socket ${socket.id}`);
            console.log(`[Socket.io] Total connected users: ${userSockets.size}`);
            console.log(`[Socket.io] Active users: [${Array.from(userSockets.keys()).join(', ')}]\n`);
            serverLogger.info(`User ${userID} registered with socket ${socket.id}`);
        } else {
            console.log(`[Socket.io] ✗ Registration failed - no userID provided`);
        }
    });

    socket.on('disconnect', () => {
        // Remove user from map
        for (const [userID, socketID] of userSockets.entries()) {
            if (socketID === socket.id) {
                userSockets.delete(userID);
                console.log(`\n[Socket.io] User disconnected: ${userID}`);
                console.log(`[Socket.io] Total connected users: ${userSockets.size}\n`);
                serverLogger.info(`User ${userID} disconnected`);
                break;
            }
        }
    });
});

// Make io and userSockets globally available
global.io = io;
global.userSockets = userSockets;

async function serverSetUp() {
    // Security Headers Middleware
    app.use((req, res, next) => {
        // Remove X-Powered-By header to prevent information leakage
        res.removeHeader('X-Powered-By');
        
        // Set X-Content-Type-Options to prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Set X-Frame-Options to prevent clickjacking attacks
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        
        // Content Security Policy header
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'");
        
        // Remove Server header or obscure it
        res.setHeader('Server', 'WebServer');
        
        next();
    });

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

    app.set('trust proxy', 1);

    // CSRF protection setup (moved here from checkServerEnvironment)
    if (process.env.ENABLE_USER_CHECKING === 'true') {
        const csrfProtection = csrf({
            cookie: {
                httpOnly: true,
                secure: false,
                sameSite: 'lax'
            }
        });
        app.use(csrfProtection);
        serverLogger.warn(`The server is started in production mode with user checking enabled.`)
    } else {
        // Mock CSRF token for development
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
}

async function checkServerEnvironment() {
    if (process.env.ENABLE_USER_CHECKING !== 'true') {
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
            const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
            serverLogger.info(`Server running on ${protocol}://localhost:${PORT}`);
            serverLogger.info('Server is now online');
        });

    } catch (err) {
        serverLogger.error(`Server Startup Failed:`, err);
        console.error("Startup failed:", err);
        process.exit(1);
    }
}

startServer();
