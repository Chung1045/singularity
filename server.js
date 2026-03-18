require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const csrf = require('@dr.pogodin/csurf');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const passport = require('passport');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');

const {serverLogger, logAccessedPath, logger} = require("./public/services/loggingService");
const {startupCheck} = require("./public/services/startupCheck");
const routeManager = require("./public/managers/routesManager");
const accountManagerRouter = require("./public/managers/accountManager");
const aiAgentManagerRouter = require("./public/managers/aiAgentManager");
const projectManagerRouter = require("./public/managers/projectManager");
const notifManager = require("./public/managers/notificationManager");

const PORT = process.env.PORT || 9090;
const app = express();

function createServer() {
    if (process.env.USE_NGINX_SSL === 'true') {
        serverLogger.info("Starting HTTP Server with nginx https SSL");
        return http.createServer(app)
    }

    if (process.env.ENABLE_HTTPS === 'true') {
        serverLogger.info("Starting local HTTPS Server");

        if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH) {
            throw new Error("SSL Key or Certificate paths not found");
        }

        const httpsOptions = {
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        };

        return https.createServer(httpsOptions, app);
    }

    serverLogger.warn("Starting HTTP Server, TRAFFIC IS NOT ENCRYPTED!!!");
    serverLogger.warn("DO NOT USE THIS IN PRODUCTION!!");
    return http.createServer(app);
}

function setupSocketIo(server){
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
                serverLogger.warn(`Socket registration failed — no userID provided`);
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

    return {io, userSockets};
}

async function checkServerEnvironment() {
    // Enforce SESSION_SECRET in production
    if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
        throw new Error("SESSION_SECRET must be set in production!");
    }

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

        await new Promise(resolve => setTimeout(resolve, 15000));

        console.warn(`${yellow}Proceeding with server startup...${reset}\n`);
        serverLogger.info(`Server startup resumed.`);
    }
}

function serverSetUp() {
    // Security headers
    app.disable('x-powered-by');

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc:      ["'self'"],
                scriptSrc:       ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com", "unpkg.com", "cdnjs.cloudflare.com", "code.jquery.com"],
                styleSrc:        ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "cdn.jsdelivr.net"],
                fontSrc:         ["'self'", "fonts.gstatic.com", "anima-uploads.s3.amazonaws.com", "cdn.jsdelivr.net", "data:"],
                imgSrc:          ["'self'", "data:", "https:"],
                connectSrc:      ["'self'", "wss:", "ws:"],
                frameSrc:        ["'none'"],
                frameAncestors:  ["'none'"],
                formAction:      ["'self'"],
                objectSrc:       ["'none'"],
                baseUri:         ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));

    app.use((req, res, next) => {
        logAccessedPath(req)
        next();
    });

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
    app.use("/", routeManager);

    app.use((req, res) => {
        if (req.originalUrl.startsWith("/api/")) {
            return res.status(404).json({
                success: false,
                message: "API endpoint not found"
            });
        }

        res.status(404).render("Error", {
            statusCode: 404,
            errorMessage: "The page you are looking for does not exist."
        });
    });
}



async function startServer() {
    try {
        serverLogger.info('Server is starting...');
        await checkServerEnvironment()

        const server = createServer();
        setupSocketIo(server);

        await startupCheck(); // ensure DB + MinIO are ready
        serverSetUp()

        const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';

        server.listen(PORT, () => {
            serverLogger.info(`Server running on ${protocol}://localhost:${PORT}`);
            serverLogger.info('Server is now online');
        }).on('error', (err) => {
            serverLogger.error("Failed to bind port:", err);
            process.exit(1);
        });

    } catch (err) {
        serverLogger.error(`Server Startup Failed:`, err);
        console.error("Startup failed:", err);
        process.exit(1);
    }
}

startServer().catch((err) => {
    serverLogger.error("Unhandled startup error:", err);
    process.exit(1);
});
