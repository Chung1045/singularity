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
        data.userType ? data.userType.trim() : null,
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

async function checkUsernameEmail(data) {
    const query = `
        SELECT uid
        FROM user
        WHERE username = ? OR userEmail = ?
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
                console.log("Username or email address is not found.")
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

module.exports = { insertUserAccount, checkUsernameEmail, checkPassword }
