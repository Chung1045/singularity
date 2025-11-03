const db = require("./db")
const uuid = require("uuid-v4")

async function insertUserAccount(data){
    const id = uuid();
    const sql = `
    INSERT INTO user (
      uid, firstName, lastName, userType, userEmail, userName
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;
    const params = [
        id,
        data.firstName.trim(),
        data.lastName.trim(),
        data.userType ? data.userType : 'general',
        data.userEmail ? data.userEmail.trim() : null,
        data.userName.trim()
    ];

    try {
        await db.run(sql, params); // safe: values are bound, not interpolated
        return { uid: id };
    } catch (err) {
        // handle unique constraint / validation errors
        if (err.code === 'SQLITE_CONSTRAINT') {
            throw new Error('Unique constraint failed (uid or userName or userEmail already exists)');
        }
        throw err;
    }
}

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

async function insertGoogleOAuthUserAccount(profile) {
    const uid = uuid();
    const firstName = profile.name?.givenName?.trim() || "user";
    const lastName  = profile.name?.familyName?.trim() || "";
    const email     = profile.emails?.[0]?.value;
    const userType  = "google";

    console.log(`\n========================================`);
    console.log(`🔵 NEW OAUTH REQUEST`);
    console.log(`Profile ID: ${profile.id}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Email: ${email}`);
    console.log(`Generated UID: ${uid}`);
    console.log(`========================================\n`);

    // Insert OAuth mapping first
    try {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO googleOauth_identity (userGoogleId, uid) VALUES (?, ?)`,
                [profile.id, uid],
                function(err) {
                    if (err) return reject(err);
                    console.log(`✅ Step 1: OAuth identity inserted. Changes: ${this.changes}`);
                    resolve(this);
                }
            );
        });
    } catch (err) {
        console.log(`⚠️ Step 1: OAuth insert error: ${err.code}`);
        if (err.code === "SQLITE_CONSTRAINT") {
            const existing = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT uid FROM googleOauth_identity WHERE userGoogleId = ?`,
                    [profile.id],
                    (err, row) => {
                        if (err) return reject(err);
                        resolve(row);
                    }
                );
            });
            if (existing) {
                console.log(`✅ Returning existing user: ${existing.uid}`);
                return { uid: existing.uid, reused: true };
            }
        }
        throw err;
    }

    // Build username
    let baseUsername = `${firstName}_${lastName}`
        .replace(/\s+/g, "_")
        .toLowerCase();
    if (baseUsername === "_" || !baseUsername.trim()) baseUsername = "user";

    console.log(`\n🔍 Step 2: Finding unique username (base: "${baseUsername}")`);

    let username = baseUsername;
    let attempt  = 0;

    while (await findUserByUsername(username)) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        username = `${baseUsername}_${randomSuffix}`;
        attempt++;
        if (attempt > 50) {
            throw new Error("Failed to generate a unique username after 50 attempts");
        }
    }

    console.log(`✅ Step 2 complete: Final username = "${username}" (attempts: ${attempt})\n`);

    // Insert user
    const sqlUser = `
        INSERT INTO user (uid, firstName, lastName, userType, userEmail, userName)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const paramsUser = [uid, firstName, lastName, userType, email, username];

    console.log(`📝 Step 3: Inserting into user table...`);
    console.log(`   uid: ${uid}`);
    console.log(`   firstName: ${firstName}`);
    console.log(`   lastName: ${lastName}`);
    console.log(`   userType: ${userType}`);
    console.log(`   userEmail: ${email}`);
    console.log(`   userName: ${username}`);

    try {
        await new Promise((resolve, reject) => {
            db.run(sqlUser, paramsUser, function(err) {
                if (err) {
                    console.error(`\n❌❌❌ Step 3 FAILED:`, err.message);
                    console.error(`Error code: ${err.code}`);
                    if (err.code === "SQLITE_CONSTRAINT") {
                        console.error("Constraint violation - possible duplicate uid, userName, or userEmail");
                    }
                    return reject(err);
                }
                console.log(`✅ Step 3 complete: User inserted. Changes: ${this.changes}`);
                resolve(this);
            });
        });

        console.log(`\n✅✅✅ SUCCESS: New user created: ${username}\n`);
        return { uid, userName: username };
    } catch (err) {
        throw err;
    }
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

async function checkPassword(data) {
    const query = `
        SELECT COUNT(*) AS count
        FROM credential
        WHERE uid = ? AND credentialPassword = ?
    `;
    const params = [data.uid, data.password];

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row.count > 0);
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

module.exports = { insertUserAccount, checkUsernameEmail, checkPassword,
    isGoogleOAuthUserExist, insertGoogleOAuthUserAccount, getUIDfromOAuth, logLoginAttempts }
