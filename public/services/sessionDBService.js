const db = require("./db")
const uuid = require("uuid-v4");
const { serverLogger } = require("./loggingService");
const ServiceError = require("../errors/ServiceError");

const SERVICE_NAME = 'SessionDBService';
const SESSION_EXPIRY_DAYS = 7;

async function createSession(data) {
    const id = uuid();
    const sql = `
        INSERT INTO session (sessionID, uid, lastSeenTime, sessionOS, sessionBrowser, sessionIP)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
        id,
        data.uid,
        new Date().toISOString(),
        data.sessionOS,
        data.sessionBrowser,
        data.sessionIP
    ];

    try {
        await db.run(sql, params); // safe: values are bound, not interpolated
        serverLogger.info(`[${SERVICE_NAME}:createSession] Session created for uid: ${data.uid}`);
        return id;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'createSession', 'Failed to create session', err);
    }
}

async function destroySession(sessionID) {
    const sql = `
        DELETE
        FROM session
        WHERE sessionID = ?
    `;

    try {
        await db.run(sql, [sessionID]);
        return true
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'destroySession', 'Failed to destroy session', err);
    }
}

async function isSessionActive(sessionID) {
    const sql = `
        SELECT lastSeenTime
        FROM session
        WHERE sessionID = ?
        LIMIT 1
    `;

    try {
        const row = await db.get(sql, [sessionID]);

        if (!row) {
            serverLogger.info(`[${SERVICE_NAME}:isSessionActive] Session not found: ${sessionID}`);
            return false;
        }

        const diffDays = (new Date() - new Date(row.lastSeenTime)) / (1000 * 60 * 60 * 24);
        return diffDays <= SESSION_EXPIRY_DAYS;

    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'isSessionActive', 'Failed to check session', err);
    }
}

async function updateLastSeen(sessionID) {
    const sql = `UPDATE session
                 SET lastSeenTime = ?
                 WHERE sessionID = ?;`

    try {
        await db.run(sql, [new Date().toISOString(), sessionID]);
        return true;
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'updateLastSeen', 'Failed to update last seen', err);
    }
}

module.exports = {createSession, destroySession, isSessionActive, updateLastSeen}
