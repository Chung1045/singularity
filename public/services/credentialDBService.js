const db = require("./db")
const uuid = require("uuid-v4")

async function insertCredentials(data){
    const id = uuid();
    const sql = `
    INSERT INTO credential (
      credentialID, uid, credentialPassword, changeDate
    ) VALUES (?, ?, ?, ?)
  `;

    const now = new Date();
    const dateIsoString = now.toISOString();

    const params = [
        id,
        data.uid,
        data.credentialPassword,
        dateIsoString,
    ];

    try {
        await db.run(sql, params); // safe: values are bound, not interpolated
        return id;
    } catch (err) {
        // handle unique constraint / validation errors
        if (err.code === 'SQLITE_CONSTRAINT') {
            throw new Error('Unique constraint failed (uid or userName or userEmail already exists)');
        }
        throw err;
    }
}

module.exports = { insertCredentials }
