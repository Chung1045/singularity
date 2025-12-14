const db = require("./db")
const uuid = require("uuid-v4");

async function createSession(data) {
    const id = uuid();
    const sql = `
        INSERT INTO session (sessionID, uid, lastSeenTime, sessionOS, sessionBrowser, sessionIP)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
        id,
        data.uid,
        Date(),
        data.sessionOS,
        data.sessionOS,
        data.sessionIP
    ];

    try {
        console.log(`Insert value data.uid: ${data.uid}`)
        await db.run(sql, params); // safe: values are bound, not interpolated
        return id;
    } catch (error) {
        throw error;
    }
}

async function destroySession(data) {
    const sql = `
        DELETE
        FROM session
        WHERE sessionID = ?
    `;

    const param = [data]

    try {
        await db.run(sql, param);
        return true
    } catch (error) {
        throw error;
    }
}

async function isSessionActive(sessionID) {
    const query = `
        SELECT lastSeenTime
        FROM session
        WHERE sessionID = ?
        LIMIT 1
    `;
    const param = [sessionID];

    return new Promise((resolve, reject) => {
        db.get(query, param, (err, row) => {
            if (err) return reject(err);

            if (!row) {
                console.log("Session not found.");
                return resolve(false);
            }

            console.log("Found with date:", row.lastSeenTime);

            // Convert stored time to Date object
            const lastSeen = new Date(row.lastSeenTime);
            const now = new Date();

            // Calculate difference in milliseconds → days
            const diffDays = (now - lastSeen) / (1000 * 60 * 60 * 24);

            // Check if within 7 days
            if (diffDays <= 7) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

async function updateLastSeen(sessionID) {
    const sql = `UPDATE session
                 SET lastSeenTime = ?
                 WHERE sessionID = ?;`

    return new Promise((resolve, reject) => {
        db.run(sql, [sessionID], (err) => {
            if (err) {
                console.error("Error updating last seen time:", err);
                return reject(err);
            }
            resolve(true);
        });
    });
}

module.exports = {createSession, destroySession, isSessionActive, updateLastSeen}
