const db = require("./db")
const uuid = require("uuid-v4")

async function findUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT uid FROM user WHERE userName = ?`, [username], (err, row) => {
            if (err) {
                console.error('Error in findUserByUsername:', err);
                return reject(err);
            }
            console.log(`🔍 findUserByUsername("${username}"):`, row || 'NOT FOUND');
            resolve(row);
        });
    });
}

async function findUserNameByUserID(uid) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT userName FROM user WHERE uid = ?`, [uid], (err, row) => {
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
        db.get(`SELECT uid FROM session WHERE sessionID = ?`, [sessionID], (err, row) => {
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
        db.get(`SELECT uid FROM passkeys WHERE keyID = ?`, [passkeyID], (err, row) => {
            if (err) {
                console.error('Error in findUserIDByPasskeyID:', err);
                return reject(err);
            }
            console.log(`🔍 findUserIDBySessionID("${passkeyID}"):`, row || 'NOT FOUND');
            resolve(row ? row.uid : null);
        });
    });
}

async function getUIDfromOAuth(oAuthID) {
    const query = `
        SELECT uid
        FROM googleOauth_identity
        WHERE userGoogleId = ?
        LIMIT 1
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

async function isGoogleOAuthUserExist(oauthID){
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
    INSERT INTO loginAttempts (attemptID, uid, attemptDate, attemptOS, attemptBrowser, attemptIP
    ) VALUES (?, ?, ?, ?, ?, ?)
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
    const query = `SELECT keyID, keyName, dateCreate FROM passkeys WHERE uid = ? ORDER BY dateCreate DESC`;

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
    const query = `DELETE FROM passkeys WHERE keyID = ?`;

    return new Promise((resolve, reject) => {
        db.run(query, [data], function(err) {
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
    const query = `SELECT sessionID, lastSeenTime, sessionOS, sessionBrowser, sessionIP FROM session WHERE uid = ? ORDER BY lastSeenTime DESC`;

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
    const query = `DELETE FROM session WHERE sessionID = ?`;

    return new Promise((resolve, reject) => {
        db.run(query, [data], function(err) {
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
    const query = `SELECT attemptID, attemptDate, attemptOS, attemptBrowser, attemptIP FROM loginAttempts WHERE uid = ? ORDER BY attemptDate DESC`;

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
    const query = `DELETE FROM loginAttempts WHERE uid = ?`;

    return new Promise((resolve, reject) => {
        db.run(query, [data], function(err) {
            if (err) {
                console.error('Error deleting login attempts record:', err);
                return reject(false);
            }
            console.log(`uid ${data} login attempts record deleted`);
            resolve(true);
        });
    });
}


module.exports = { isGoogleOAuthUserExist, getUIDfromOAuth,
    logLoginAttempts, findUserIDBySessionID, findUserNameByUserID, listPasskey, getPasskey, findUserIDByPasskeyID, deletePasskey, listSessions, listLoginAttempts, deleteAllLoginAttempts, logoutSession }
