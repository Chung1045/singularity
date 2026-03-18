const db = require("./db");
const uuid = require("uuid-v4");
const fss = require("./fsServices");
const argon2 = require('argon2');
const { serverLogger } = require("./loggingService");
const ServiceError = require("../errors/ServiceError");
const { checkUsernameEmail } = require("./accountDBService");

const SERVICE_NAME = 'CredentialDBService';

async function insertUserAccount(data) {
    const id = uuid();
    try {
        await db.run(
            `INSERT INTO user (uid, firstName, lastName, userType, userEmail, userName)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, data.firstName.trim(), data.lastName.trim(), 'general',
                data.userEmail?.trim() || null, data.userName.trim()]
        );
        return { uid: id };
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            throw new ServiceError(SERVICE_NAME, 'insertUserAccount', 'Username or email already exists', err);
        }
        throw new ServiceError(SERVICE_NAME, 'insertUserAccount', 'Failed to insert user account', err);
    }
}

async function insertCredentials(data) {
    const id = uuid();
    try {
        const passwordHash = await argon2.hash(data.credentialPassword);
        await db.run(
            `INSERT INTO credential (credentialID, uid, credentialPassword, changeDate)
             VALUES (?, ?, ?, ?)`,
            [id, data.uid, passwordHash, new Date().toISOString()]
        );
        return id;
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            throw new ServiceError(SERVICE_NAME, 'insertCredentials', 'Credential already exists for this user', err);
        }
        throw new ServiceError(SERVICE_NAME, 'insertCredentials', 'Failed to insert credentials', err);
    }
}

async function insertGoogleOAuthUserAccount(profile) {
    const uid = uuid();
    const firstName = profile.name?.givenName?.trim() || 'user';
    const lastName = profile.name?.familyName?.trim() || '';
    const email = profile.emails?.[0]?.value;

    // ✅ Generate unique username
    let baseUsername = `${firstName}_${lastName}`.replace(/\s+/g, '_').toLowerCase();
    if (!baseUsername.trim() || baseUsername === '_') baseUsername = 'user';

    let username = baseUsername;
    let attempt = 0;

    while (await checkUsernameEmail(username)) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        username = `${baseUsername}_${suffix}`;
        attempt++;
        if (attempt > 50) {
            throw new ServiceError(SERVICE_NAME, 'insertGoogleOAuthUserAccount', 'Failed to generate unique username after 50 attempts');
        }
    }

    try {
        await db.run('BEGIN TRANSACTION');

        await db.run(
            `INSERT INTO user (uid, firstName, lastName, userType, userEmail, userName)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uid, firstName, lastName, 'google', email, username]
        );

        await db.run(
            `INSERT INTO googleOauth_identity (userGoogleId, uid) VALUES (?, ?)`,
            [profile.id, uid]
        );

        await db.run('COMMIT');
        serverLogger.info(`[${SERVICE_NAME}] Google OAuth user registered: ${uid}`);

    } catch (err) {
        await db.run('ROLLBACK').catch(() => {});
        if (err.code === 'SQLITE_CONSTRAINT') {
            throw new ServiceError(SERVICE_NAME, 'insertGoogleOAuthUserAccount', 'Duplicate user or OAuth identity', err);
        }
        throw new ServiceError(SERVICE_NAME, 'insertGoogleOAuthUserAccount', 'Failed to register Google OAuth user', err);
    }

    if (profile.photos?.[0]?.value) {
        try {
            const response = await fetch(profile.photos[0].value);
            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                await fss.updateProfilePic(uid, {
                    buffer,
                    mimetype: response.headers.get('content-type') || 'image/jpeg',
                    size: buffer.length
                });
            }
        } catch (e) {
            serverLogger.warn(`[${SERVICE_NAME}:insertGoogleOAuthUserAccount] Failed to save Google avatar (non-critical): ${e.message}`);
        }
    }

    return { uid, userName: username };
}

async function checkPassword(data) {
    try {
        const row = await db.get(
            `SELECT credentialPassword FROM credential WHERE uid = ?`,
            [data.uid]
        );
        if (!row) return false;
        return await argon2.verify(row.credentialPassword, data.password);
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'checkPassword', 'Failed to verify password', err);
    }
}

async function updatePassword(data) {
    try {
        const passwordHash = await argon2.hash(data.password);
        await db.run(
            `UPDATE credential SET credentialPassword = ?, changeDate = ? WHERE uid = ?`,
            [passwordHash, new Date().toISOString(), data.uid] // ✅ fixed: was Date.now()
        );
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'updatePassword', 'Failed to update password', err);
    }
}

async function checkUsernameEmailExists(data) {
    try {
        const row = await db.get(
            `SELECT uid FROM user WHERE userName = ? OR userEmail = ? LIMIT 1`,
            [data, data]
        );
        return row ? row.uid : false;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'checkUsernameEmailExists', 'Failed to check username/email', err);
    }
}

async function savePasskey(data) {
    try {
        await db.run(
            `INSERT INTO passkeys (keyID, uid, keyName, transports, signCount, publicKey, dateCreate, lastUsed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.keyID, data.uid, data.keyName, data.transports,
                data.signCount, data.publicKey, new Date().toISOString(), null]
        );
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'savePasskey', 'Failed to save passkey', err);
    }
}

async function updatePasskeyLastUsed(keyID) {
    try {
        await db.run(
            `UPDATE passkeys SET lastUsed = ? WHERE keyID = ?`,
            [new Date().toISOString(), keyID]
        );
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'updatePasskeyLastUsed', 'Failed to update passkey last used', err);
    }
}

module.exports = {
    insertCredentials,
    insertUserAccount,
    insertGoogleOAuthUserAccount,
    savePasskey,
    checkPassword,
    checkUsernameEmailExists,
    updatePassword,
    updatePasskeyLastUsed
};