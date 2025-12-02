const express = require('express');
const session = require('express-session');
const csrf = require('@dr.pogodin/csurf');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');

const startupCheck = require('./public/services/startupCheck');
const routeManager = require('./public/managers/routesManager');
const accountManagerRouter = require('./public/managers/accountManager');
const projectManagerRouter = require("./public/managers/projectManager");
const notifManager = require("./public/managers/notificationManager")

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

const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});
app.use(csrfProtection);

app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views');
app.use(express.static('public'));

app.use('/api', accountManagerRouter);
app.use('/api', projectManagerRouter);
app.use('/api', notifManager);
app.use("/", routeManager)

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
