const express = require('express');
const session = require('express-session')
const csrf = require("@dr.pogodin/csurf")
const cookieParser = require('cookie-parser');
const uuid = require('uuid-v4')
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// OPTIONAL: MinIO Configuration (S3-compatible object storage)
// ============================================================================
// To use MinIO instead of local file storage:
// 1. Uncomment the MinIO client import below
// 2. Run: npm install minio
// 3. Set environment variables in .env:
//    MINIO_ENDPOINT=localhost
//    MINIO_PORT=9000
//    MINIO_ACCESS_KEY=your-access-key
//    MINIO_SECRET_KEY=your-secret-key
//    MINIO_BUCKET=avatars
//    MINIO_USE_SSL=false
// 4. Set STORAGE_TYPE=minio in .env
// 5. Uncomment the MinIO client initialization below
// ============================================================================

// const Minio = require('minio');
// const minioClient = new Minio.Client({
//     endPoint: process.env.MINIO_ENDPOINT || 'localhost',
//     port: parseInt(process.env.MINIO_PORT) || 9000,
//     useSSL: process.env.MINIO_USE_SSL === 'true',
//     accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
//     secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
// });

// const MINIO_BUCKET = process.env.MINIO_BUCKET || 'avatars';

// // Ensure bucket exists
// (async () => {
//     try {
//         const exists = await minioClient.bucketExists(MINIO_BUCKET);
//         if (!exists) {
//             await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
//             // Set bucket policy to allow public read access for avatars
//             const policy = {
//                 Version: '2012-10-17',
//                 Statement: [{
//                     Effect: 'Allow',
//                     Principal: { AWS: ['*'] },
//                     Action: ['s3:GetObject'],
//                     Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
//                 }]
//             };
//             await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
//             console.log(`✅ MinIO bucket '${MINIO_BUCKET}' created and configured`);
//         } else {
//             console.log(`✅ MinIO bucket '${MINIO_BUCKET}' exists`);
//         }
//     } catch (err) {
//         console.error('❌ MinIO bucket setup error:', err);
//     }
// })();

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' or 'minio'

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

// ============================================================================
// File Upload Configuration
// ============================================================================
// Configure multer for profile picture uploads (Local File System)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'public', 'uploads', 'avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// For MinIO: Use memory storage instead of disk storage
// const storage = multer.memoryStorage();

// File filter to accept only image files
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

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

// Profile picture upload endpoint - MUST be before app.use('/api', accountManagerRouter)
app.post('/api/upload-profile-picture', (req, res) => {
    // Handle multer upload with custom error handling
    upload.single('profilePicture')(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ success: false, message: "File size exceeds 5MB limit" });
                }
                return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
            }
            return res.status(400).json({ success: false, message: err.message || "File upload failed" });
        }

        try {
            if (!req.cookies.session_id) {
                console.log('❌ No session cookie found');
                return res.status(401).json({ success: false, message: "Unauthorized - Please log in again" });
            }

            const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);
            if (!userID) {
                console.log('❌ Session not found for cookie:', req.cookies.session_id);
                return res.status(401).json({ success: false, message: "Unauthorized - Session expired" });
            }

            if (!req.file) {
                console.log('❌ No file in request');
                return res.status(400).json({ success: false, message: "No file uploaded" });
            }

            console.log(`📤 Uploading avatar for user ${userID}, file: ${req.file.filename || 'from memory'}`);

            // Get user's old avatar to delete it (if it exists and is not a Google avatar)
            const userInfo = await dbService.getUserInfo(userID);
            
            let avatarPath;

            // ============================================================
            // STORAGE LOGIC: Switch between local file system and MinIO
            // ============================================================
            if (STORAGE_TYPE === 'minio') {
                // ==================== MinIO Upload ====================
                // Uncomment this block when using MinIO:
                /*
                const fileName = `avatar-${userID}-${Date.now()}${path.extname(req.file.originalname)}`;
                const metaData = {
                    'Content-Type': req.file.mimetype,
                    'X-User-ID': userID
                };

                try {
                    // Upload to MinIO
                    await minioClient.putObject(
                        MINIO_BUCKET,
                        fileName,
                        req.file.buffer, // Use buffer from memory storage
                        req.file.size,
                        metaData
                    );

                    // Delete old avatar from MinIO if exists
                    if (userInfo && userInfo.userAvatarPath && userInfo.userAvatarPath.startsWith('minio://')) {
                        const oldFileName = userInfo.userAvatarPath.replace('minio://', '');
                        try {
                            await minioClient.removeObject(MINIO_BUCKET, oldFileName);
                            console.log(`🗑️ Deleted old MinIO avatar: ${oldFileName}`);
                        } catch (delErr) {
                            console.warn('⚠️ Could not delete old MinIO avatar:', delErr.message);
                        }
                    }

                    // Store MinIO path in database
                    avatarPath = `minio://${fileName}`;
                    
                    // Generate presigned URL for frontend (valid for 7 days)
                    const presignedUrl = await minioClient.presignedGetObject(MINIO_BUCKET, fileName, 7 * 24 * 60 * 60);
                    
                    await dbService.updateUserAvatar(userID, avatarPath);

                    console.log(`✅ Profile picture uploaded to MinIO: ${fileName}`);
                    
                    return res.json({ 
                        success: true, 
                        message: "Profile picture updated successfully",
                        avatarUrl: presignedUrl, // Return presigned URL for frontend
                        storageType: 'minio'
                    });
                } catch (minioErr) {
                    console.error('❌ MinIO upload error:', minioErr);
                    throw new Error(`MinIO upload failed: ${minioErr.message}`);
                }
                */
                return res.status(500).json({ 
                    success: false, 
                    message: "MinIO is configured but code is commented out. See server.js for implementation." 
                });
            } else {
                // ==================== Local File System Upload ====================
                // Delete old avatar from file system if exists
                if (userInfo && userInfo.userAvatarPath && !userInfo.userAvatarPath.startsWith('minio://')) {
                    const oldAvatarPath = path.join(__dirname, 'public', userInfo.userAvatarPath);
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);
                        console.log(`🗑️ Deleted old avatar: ${oldAvatarPath}`);
                    }
                }

                // Store relative path in database
                avatarPath = `/uploads/avatars/${req.file.filename}`;
                await dbService.updateUserAvatar(userID, avatarPath);

                console.log(`✅ Profile picture uploaded successfully for user ${userID}: ${avatarPath}`);
                
                res.json({ 
                    success: true, 
                    message: "Profile picture updated successfully",
                    avatarUrl: avatarPath,
                    storageType: 'local'
                });
            }
        } catch (error) {
            console.error('❌ Error in upload handler:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({ success: false, message: `Server error: ${error.message}` });
        }
    });
});

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
