const db = require("./db")
const uuid = require("uuid-v4")
const utils = require("./utlisService")

async function apiAuthUser(req, res, next) {

    console.log('Path:', req.path);           // e.g., '/api/users'
    console.log('URL:', req.url);             // e.g., '/api/users?id=123'
    console.log('Original URL:', req.originalUrl); // same as req.url
    console.log('Base URL:', req.baseUrl);    // e.g., '/api' (if router is mounted)
    console.log('Method:', req.method);       // e.g., 'GET', 'POST'
    console.log('Full path:', req.path);      // path without query string

    const clientInfo = await utils.getClientDeviceInfo(req)
    console.log(`Client Info: ${JSON.stringify(clientInfo)}`)

    if (process.env.ENABLE_USER_CHECKING === 'true') {
        const sessionID = req.cookies.session_id;
        if (!sessionID) {
            return res.status(403).json({successful: false, message: "Unauthorized"});
        }

        const userID = await findUserIDBySessionID(sessionID);
        if (!userID) {
            return res.status(403).json({successful: false, message: "Unauthorized"});
        }

        req.userID = userID;
        next();
    } else {

        let userID = await findUserIDBySessionID(req.cookies.session_id);
        if (!userID) {
            userID = ""
        }

        req.userID = userID
        next();
    }
}

async function findUserByUsername(username, selfUid) {
    const query = `
        SELECT userName, lastName, firstName, userAvatarPath, uid
        FROM user
        WHERE userName LIKE ?
          AND uid != ?
            LIMIT 20
    `;
    const params = [`%${username}%`, selfUid]; // Matches anywhere in the string

    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            if (rows && rows.length > 0) {
                console.log(`Found ${rows.length} users matching "${username}"`);
                resolve(rows); // Return array of matching users
            } else {
                resolve([]);
            }
        });
    });
}

async function findUserNameByUserID(uid) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT userName
                FROM user
                WHERE uid = ?`, [uid], (err, row) => {
            if (err) {
                console.error('Error in findUserNameByUserID:', err);
                return reject(err);
            }
            console.log(`🔍 findUserByUserNameID("${uid}"):`, row || 'NOT FOUND');
            resolve(row ? row.userName : null);
        });
    });
}

async function findUserIDBySessionID(sessionID) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT uid
                FROM session
                WHERE sessionID = ?`, [sessionID], (err, row) => {
            if (err) {
                console.error('Error in findUserIDBySessionID:', err);
                return reject(err);
            }
            console.log(`🔍 findUserIDBySessionID("${sessionID}"):`, row || 'NOT FOUND');
            resolve(row ? row.uid : null);
        });
    });
}

async function findUserIDByPasskeyID(passkeyID) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT uid
                FROM passkeys
                WHERE keyID = ?`, [passkeyID], (err, row) => {
            if (err) {
                console.error('Error in findUserIDByPasskeyID:', err);
                return reject(err);
            }
            console.log(`🔍 findUserIDBySessionID("${passkeyID}"):`, row || 'NOT FOUND');
            resolve(row ? row.uid : null);
        });
    });
}

async function getUserInfo(userID) {
    return new Promise((resolve, reject) => {
        // OLD: db.get(`SELECT uid, firstName, lastName, userEmail, userName, userType FROM user WHERE uid = ?`, [userID], (err, row) => {
        // NEW: Added more detailed logging and avatar fields
        const query = `SELECT uid, firstName, lastName, userEmail, userName, userType, userAvatarPath, googleAvatarUrl FROM user WHERE uid = ?`;
        console.log(`🔍 getUserInfo: Querying for uid="${userID}"`);
        db.get(query, [userID], (err, row) => {
            if (err) {
                console.error('❌ Error in getting user information:', err);
                return reject(err);
            }
            if (!row) {
                console.error(`❌ getUserInfo: NO USER FOUND for uid="${userID}"`);
            } else {
                console.log(`✅ getUserInfo result:`, row);
            }
            resolve(row);
        });
    });
}

async function getUIDfromOAuth(oAuthID) {
    const query = `
        SELECT uid
        FROM googleOauth_identity
        WHERE userGoogleId = ? LIMIT 1
    `;
    const params = [oAuthID];

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            if (row) {
                console.log("Found with uid", row.uid);
                resolve(row.uid);
            } else {
                resolve(false);
            }
        });
    });
}

async function isGoogleOAuthUserExist(oauthID) {
    const query = `
        SELECT COUNT(*) AS count
        FROM googleOauth_identity
        WHERE userGoogleId = ?
    `;
    const params = [oauthID];

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row.count > 0);
        });
    });
}

async function logLoginAttempts(data) {
    const attemptID = uuid();
    const sql = `
        INSERT INTO loginAttempts (attemptID, uid, attemptDate, attemptOS, attemptBrowser, attemptIP)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
        attemptID,
        data.uid,
        Date(),
        data.attemptOS,
        data.attemptBrowser,
        data.attemptIP
    ];

    try {
        console.log(`Insert value data.uid: ${data.uid}`)
        await db.run(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function listPasskey(data) {  // ✅ Just pass uid directly, not data object
    const query = `SELECT keyID, keyName, dateCreate
                   FROM passkeys
                   WHERE uid = ?
                   ORDER BY dateCreate DESC`;

    return new Promise((resolve, reject) => {
        db.all(query, [data], (err, rows) => {  // ✅ Use db.all() to get ALL rows
            if (err) {
                console.error('Error listing passkeys:', err);
                return reject(err);
            }
            console.log(`Found ${rows.length} passkey(s) for userID ${data}`);
            resolve(rows || []);  // ✅ Return array of all passkeys
        });
    });
}

async function getPasskey(data) {
    const query = `
        SELECT *
        FROM passkeys
        WHERE keyID = ?
    `;
    const params = [data];

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function deletePasskey(data) {
    const query = `DELETE
                   FROM passkeys
                   WHERE keyID = ?`;

    return new Promise((resolve, reject) => {
        db.run(query, [data], function (err) {
            if (err) {
                console.error('Error deleting passkey:', err);
                return reject(false);
            }
            console.log(`Passkey ${data} deleted`);
            resolve(true);
        });
    });
}

async function listSessions(data) {
    const query = `SELECT sessionID, lastSeenTime, sessionOS, sessionBrowser, sessionIP
                   FROM session
                   WHERE uid = ?
                   ORDER BY lastSeenTime DESC`;

    return new Promise((resolve, reject) => {
        db.all(query, [data], (err, rows) => {
            if (err) {
                console.error('Error listing sessions:', err);
                return reject(err);
            }
            console.log(`Found ${rows.length} sessions for userID ${data}`);
            resolve(rows || []);
        });
    });
}

async function logoutSession(data) {
    const query = `DELETE
                   FROM session
                   WHERE sessionID = ?`;

    return new Promise((resolve, reject) => {
        db.run(query, [data], function (err) {
            if (err) {
                console.error(`Error removing session ${data}:`, err);
                return reject(false);
            }
            console.log(`session ${data} have been removed`);
            resolve(true);
        });
    });
}

async function listLoginAttempts(data) {
    const query = `SELECT attemptID, attemptDate, attemptOS, attemptBrowser, attemptIP
                   FROM loginAttempts
                   WHERE uid = ?
                   ORDER BY attemptDate DESC`;

    return new Promise((resolve, reject) => {
        db.all(query, [data], (err, rows) => {
            if (err) {
                console.error('Error listing login attempts:', err);
                return reject(err);
            }
            console.log(`Found ${rows.length} login attempts for userID ${data}`);
            resolve(rows || []);
        });
    });
}

async function deleteAllLoginAttempts(data) {
    const query = `DELETE
                   FROM loginAttempts
                   WHERE uid = ?`;

    return new Promise((resolve, reject) => {
        db.run(query, [data], function (err) {
            if (err) {
                console.error('Error deleting login attempts record:', err);
                return reject(false);
            }
            console.log(`uid ${data} login attempts record deleted`);
            resolve(true);
        });
    });
}

async function testConnection() {
    return new Promise((resolve, reject) => {
        db.get("SELECT 1", (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
}

async function updateUserAvatar(userID, avatarPath) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE user SET userAvatarPath = ? WHERE uid = ?`,
            [avatarPath, userID],
            function(err) {
                if (err) {
                    console.error('Error updating user avatar:', err);
                    return reject(err);
                }
                console.log(`✅ Updated avatar for user ${userID}`);
                resolve({ changes: this.changes });
            }
        );
    });
}

module.exports = {
    isGoogleOAuthUserExist,
    getUIDfromOAuth,
    logLoginAttempts,
    findUserByUsername,
    findUserIDBySessionID,
    findUserNameByUserID,
    listPasskey,
    getPasskey,
    findUserIDByPasskeyID,
    deletePasskey,
    listSessions,
    listLoginAttempts,
    deleteAllLoginAttempts,
    logoutSession,
    getUserInfo,
    apiAuthUser,
    testConnection
}

