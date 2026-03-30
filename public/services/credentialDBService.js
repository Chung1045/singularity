const db = require("./db")
const uuid = require("uuid-v4")
const fss = require("./fsServices")
const argon2 = require('argon2');

// Import findUserByUsername for use in insertGoogleOAuthUserAccount
const { findUserByUsername } = require("./accountDBService")

async function insertCredentials(data){
    const id = uuid();
    const sql = `
    INSERT INTO credential (
      credentialID, uid, credentialPassword, changeDate
    ) VALUES (?, ?, ?, ?)
  `;

    const now = new Date();
    const dateIsoString = now.toISOString();

    const passwordHash = await argon2.hash(data.credentialPassword);

    const params = [
        id,
        data.uid,
        passwordHash,
        dateIsoString,
    ];

    await db.run(sql, params);
    return id;
}

async function insertUserAccount(data){
    const id = uuid();
    const sql = `
    INSERT INTO user (
      uid, firstName, lastName, userType, userEmail, userName
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;
    const userType =
        typeof data.userType === 'string' && data.userType.trim()
            ? data.userType.trim()
            : 'general';
    const params = [
        id,
        data.firstName.trim(),
        data.lastName.trim(),
        userType,
        data.userEmail ? data.userEmail.trim() : null,
        data.userName.trim()
    ];

    await db.run(sql, params);
    return { uid: id };
}

/**
 * Block signup when username or email is already registered (email compared case-insensitively).
 * If both are taken, throws once with field 'both' so the client shows a single message.
 */
async function assertSignupIdentifiersAvailable(userName, userEmail) {
    const name = String(userName || '').trim();
    const emailRaw = String(userEmail || '').trim();

    let nameTaken = false;
    let emailTaken = false;

    if (name.length > 0) {
        const existingName = await new Promise((resolve, reject) => {
            db.get(
                'SELECT uid FROM user WHERE userName = ?',
                [name],
                (err, row) => (err ? reject(err) : resolve(row || null))
            );
        });
        nameTaken = !!existingName;
    }

    if (emailRaw.length > 0) {
        const emailLower = emailRaw.toLowerCase();
        const existingEmail = await new Promise((resolve, reject) => {
            db.get(
                `SELECT uid FROM user
                 WHERE userEmail IS NOT NULL AND TRIM(userEmail) != ''
                   AND LOWER(TRIM(userEmail)) = ?`,
                [emailLower],
                (err, row) => (err ? reject(err) : resolve(row || null))
            );
        });
        emailTaken = !!existingEmail;
    }

    if (nameTaken && emailTaken) {
        const e = new Error('BOTH_TAKEN');
        e.code = 'SIGNUP_CONFLICT';
        e.field = 'both';
        throw e;
    }
    if (nameTaken) {
        const e = new Error('USERNAME_TAKEN');
        e.code = 'SIGNUP_CONFLICT';
        e.field = 'username';
        throw e;
    }
    if (emailTaken) {
        const e = new Error('EMAIL_TAKEN');
        e.code = 'SIGNUP_CONFLICT';
        e.field = 'email';
        throw e;
    }
}

async function insertGoogleOAuthUserAccount(profile) {
    const uid = uuid();
    const firstName = profile.name?.givenName?.trim() || "user";
    const lastName  = profile.name?.familyName?.trim() || "";
    const email     = profile.emails?.[0]?.value;
    const userType  = "google";

    console.log(`\n========================================`);
    console.log(` NEW OAUTH REQUEST`);
    console.log(`Profile ID: ${profile.id}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Email: ${email}`);
    console.log(`Generated UID: ${uid}`);
    console.log(`========================================\n`);

    let baseUsername = `${firstName}_${lastName}`
        .replace(/\s+/g, "_")
        .toLowerCase();
    if (baseUsername === "_" || !baseUsername.trim()) baseUsername = "user";

    let username = baseUsername;
    let attempt  = 0;

    while (!await findUserByUsername(username)) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        username = `${baseUsername}_${randomSuffix}`;
        attempt++;
        if (attempt > 50) {
            throw new Error("Error (Google Oauth Register) Failed to generate a unique username after 50 attempts");
        }
    }

    const sqlUser = `
        INSERT INTO user (uid, firstName, lastName, userType, userEmail, userName)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const paramsUser = [uid, firstName, lastName, userType, email, username];

    try {
        await new Promise((resolve, reject) => {
            db.run(sqlUser, paramsUser, function(err) {
                if (err) {
                    console.error(`Error code: ${err.code}`);
                    if (err.code === "SQLITE_CONSTRAINT") {
                        console.error("Error (Google Oauth Register) User info insert - Constraint violation - possible duplicate uid, userName, or userEmail");
                    }
                    return reject(err);
                }
                resolve(this);
            });
        });
    } catch (err) {
        console.error(`Error (Google Oauth Register) - Error occurred, abort account registration`)
        throw err;
    }

    try {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO googleOauth_identity (userGoogleId, uid) VALUES (?, ?)`,
                [profile.id, uid],
                function(err) {
                    if (err) return reject(err);
                    resolve(this);
                }
            );
        });
    } catch (err) {
        console.error(`Error (Google Oauth Register) OAuth insert error: ${err.message}`);
        throw err;
    }

    if (profile.photos?.[0]?.value) {
        try {
            const response = await fetch(profile.photos[0].value);

            if (!response.ok) {
                console.error(`Error (Google Oauth Register) Unable to fetch Google Avatar: ${response.status}`);
            } else {
                const arrayBuffer = await response.arrayBuffer();
                const imageBuffer = Buffer.from(arrayBuffer);

                const fileObj = {
                    buffer: imageBuffer,
                    mimetype: response.headers.get('content-type') || 'image/jpeg',
                    size: imageBuffer.length
                };

                await fss.updateProfilePic(uid, fileObj);
            }
        } catch (e) {
            console.error(`WARNING (Google Oauth Register) Failed to save Google avatar (non-critical):`, e.message);
        }
    }

    return { uid, userName: username };
}

async function savePasskey(data) {
    console.log("Data received: " + JSON.stringify(data))

    // MODIFIED: Include lastUsed set to NULL initially (will update on first use)
    const sql = `INSERT INTO passkeys (keyID, uid, keyName, transports, signCount, publicKey, dateCreate, lastUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    const now = new Date().toISOString();
    const params = [
        data.keyID,
        data.uid,
        data.keyName,
        data.transports,
        data.signCount,
        data.publicKey,
        now,
        null  // lastUsed starts as null
    ]

    console.log("Params: " + params)
    try {
        await db.run(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function checkPassword(data) {
    const query = `
        SELECT credentialPassword
        FROM credential
        WHERE uid = ?
    `;
    const params = [data.uid];

    return new Promise((resolve, reject) => {
        db.get(query, params, async (err, row) => {
            if (err) return reject(err);

            // No user found
            if (!row) return resolve(false);

            try {
                // Verify the password against the stored hash
                const isValid = await argon2.verify(row.credentialPassword, data.password);
                resolve(isValid);
            } catch (verifyErr) {
                reject(verifyErr);
            }
        });
    });
}

async function updatePassword(data) {
    const query = `
        UPDATE credential
        SET credentialPassword = ?, changeDate = ?
        WHERE uid = ?
    `;

    let passwordHash = await argon2.hash(data.password);
    const params = [passwordHash, Date.now(), data.uid];

    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                console.error("Error updating password:", err);
                return reject(err);
            }
            resolve(true);
        });
    });
}


async function checkUsernameEmail(data) {
    const query = `
        SELECT uid
        FROM user
        WHERE userName = ? OR userEmail = ?
        LIMIT 1
    `;
    const params = [data, data];

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            if (row) {
                console.log("Found with uid", row.uid);
                resolve(row.uid);
            } else {
                console.log("Username or email address is not found.");
                resolve(false);
            }
        });
    });
}

// TODO: Fix logic
// MODIFIED: Updated to include device information
async function updatePasskeyLastUsed(keyID) {
    const sql = `UPDATE passkeys SET lastUsed = ? WHERE keyID = ?`;
    const params = [new Date().toISOString(), keyID];

    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error(` Error updating passkey lastUsed:`, err);
                return reject(err);
            }
            // console.log(` Updated lastUsed for passkey: ${keyID} with device: ${deviceInfo}`);
            resolve(true);
        });
    });
}



module.exports = {
    insertCredentials,
    insertUserAccount,
    assertSignupIdentifiersAvailable,
    insertGoogleOAuthUserAccount,
    savePasskey,
    checkPassword,
    checkUsernameEmail,
    updatePassword,
    updatePasskeyLastUsed
}
