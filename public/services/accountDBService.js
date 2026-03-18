const db = require("./db")
const uuid = require("uuid-v4")
const { serverLogger } = require("./loggingService");
const ServiceError = require("../errors/ServiceError");

const SERVICE_NAME = 'AccountDBService'

async function findUserByUsername(username, selfUid) {
    try {
        return await db.all(
            `SELECT userName, lastName, firstName, userAvatarPath, uid
             FROM user WHERE userName LIKE ? AND uid != ? LIMIT 20`,
            [`%${username}%`, selfUid]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'findUserByUsername', 'Failed to search users', err);
    }
}

async function findUserNameByUserID(uid) {
    try {
        const row = await db.get(`SELECT userName FROM user WHERE uid = ?`, [uid]);
        return row ? row.userName : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'findUserNameByUserID', 'Failed to find username', err);
    }
}

async function findUserIDBySessionID(sessionID) {
    try {
        const row = await db.get(`SELECT uid FROM session WHERE sessionID = ?`, [sessionID]);
        return row ? row.uid : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'findUserIDBySessionID', 'Failed to find user by session', err);
    }
}

async function findUserIDByPasskeyID(passkeyID) {
    try {
        const row = await db.get(`SELECT uid FROM passkeys WHERE keyID = ?`, [passkeyID]);
        return row ? row.uid : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'findUserIDByPasskeyID', 'Failed to find user by passkey', err);
    }
}

async function getUserInfo(userID) {
    try {
        return await db.get(
            `SELECT uid, firstName, lastName, userEmail, userName, userType, userAvatarPath, googleAvatarUrl
             FROM user WHERE uid = ?`,
            [userID]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getUserInfo', 'Failed to get user info', err);
    }
}

async function updateUserAvatar(userID, avatarPath) {
    try {
        const result = await db.run(
            `UPDATE user SET userAvatarPath = ? WHERE uid = ?`,
            [avatarPath, userID]
        );
        serverLogger.info(`[${SERVICE_NAME}] Updated avatar for user: ${userID}`);
        return { changes: result.changes };
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'updateUserAvatar', 'Failed to update avatar', err);
    }
}

async function getUIDfromOAuth(oAuthID) {
    try {
        const row = await db.get(
            `SELECT uid FROM googleOauth_identity WHERE userGoogleId = ? LIMIT 1`,
            [oAuthID]
        );
        return row ? row.uid : null;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getUIDfromOAuth', 'Failed to get UID from OAuth', err);
    }
}

async function isGoogleOAuthUserExist(oauthID) {
    try {
        const row = await db.get(
            `SELECT COUNT(*) AS count FROM googleOauth_identity WHERE userGoogleId = ?`,
            [oauthID]
        );
        return row.count > 0;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'isGoogleOAuthUserExist', 'Failed to check OAuth user', err);
    }
}

async function logLoginAttempts(data) {
    try {
        await db.run(
            `INSERT INTO loginAttempts (attemptID, uid, attemptDate, attemptOS, attemptBrowser, attemptIP)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuid(), data.uid, new Date().toISOString(), data.attemptOS, data.attemptBrowser, data.attemptIP]
        );
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'logLoginAttempts', 'Failed to log login attempt', err);
    }
}

async function listLoginAttempts(uid) {
    try {
        return await db.all(
            `SELECT attemptID, attemptDate, attemptOS, attemptBrowser, attemptIP
             FROM loginAttempts WHERE uid = ? ORDER BY attemptDate DESC`,
            [uid]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'listLoginAttempts', 'Failed to list login attempts', err);
    }
}

async function deleteAllLoginAttempts(uid) {
    try {
        await db.run(`DELETE FROM loginAttempts WHERE uid = ?`, [uid]);
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'deleteAllLoginAttempts', 'Failed to delete login attempts', err);
    }
}

async function listPasskey(uid) {
    try {
        return await db.all(
            `SELECT keyID, keyName, dateCreate FROM passkeys WHERE uid = ? ORDER BY dateCreate DESC`,
            [uid]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'listPasskey', 'Failed to list passkeys', err);
    }
}

async function getPasskey(keyID) {
    try {
        return await db.get(`SELECT * FROM passkeys WHERE keyID = ?`, [keyID]);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'getPasskey', 'Failed to get passkey', err);
    }
}

async function deletePasskey(keyID) {
    try {
        await db.run(`DELETE FROM passkeys WHERE keyID = ?`, [keyID]);
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'deletePasskey', 'Failed to delete passkey', err);
    }
}

async function listSessions(uid) {
    try {
        return await db.all(
            `SELECT sessionID, lastSeenTime, sessionOS, sessionBrowser, sessionIP
             FROM session WHERE uid = ? ORDER BY lastSeenTime DESC`,
            [uid]
        );
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'listSessions', 'Failed to list sessions', err);
    }
}

async function logoutSession(sessionID) {
    try {
        await db.run(`DELETE FROM session WHERE sessionID = ?`, [sessionID]);
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'logoutSession', 'Failed to logout session', err);
    }
}

async function deleteUserAccount(userID) {
    try {
        await db.run("BEGIN TRANSACTION");
        await db.run(`DELETE FROM project WHERE projectOwnerUid = ?`, [userID]);
        await db.run(`DELETE FROM notification WHERE receiveUid = ?`, [userID]);
        await db.run(`DELETE FROM projectShare WHERE collabUid = ?`, [userID]);
        await db.run(`DELETE FROM credential WHERE uid = ?`, [userID]);
        await db.run(`DELETE FROM user WHERE uid = ?`, [userID]);
        await db.run("COMMIT");

        serverLogger.info(`[${SERVICE_NAME}] Deleted account for user: ${userID}`);
        return true;
    } catch (err) {
        await db.run("ROLLBACK").catch(() => {});
        throw new ServiceError(SERVICE_NAME, 'deleteUserAccount', 'Failed to delete user account', err);
    }
}

async function testConnection() {
    try {
        await db.get("SELECT 1");
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'testConnection', 'Database connection test failed', err);
    }
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
    deleteUserAccount,
    logoutSession,
    getUserInfo,
    updateUserAvatar,  // ✅ was missing from exports
    testConnection
};