const sessionDBService = require('../services/sessionDBService');
const accountDBService = require('../services/accountDBService');
const { serverLogger } = require('../services/loggingService');
const ServiceError = require('../errors/ServiceError');

async function requireLogin(req, res, next) {
    const sessionID = req.cookies?.session_id;
    if (!sessionID) {
        return res.status(401).json({ successful: false, message: 'Unauthorized' });
    }

    try {
        const active = await sessionDBService.isSessionActive(sessionID);
        if (!active) {
            return res.status(401).json({ successful: false, message: 'Session expired' });
        }

        const userID = await accountDBService.findUserIDBySessionID(sessionID);
        if (!userID) {
            return res.status(401).json({ successful: false, message: 'Unauthorized' });
        }

        req.userID = userID; // ✅ attach to request for downstream use
        next();

    } catch (err) {
        serverLogger.error(`[authMiddleware:requireLogin] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Authentication error' });
    }
}

async function attachUser(req, res, next) {
    const sessionID = req.cookies?.session_id;
    if (!sessionID) {
        req.userID = null;
        return next();
    }

    try {
        const active = await sessionDBService.isSessionActive(sessionID);
        if (active) {
            req.userID = await accountDBService.findUserIDBySessionID(sessionID);
        } else {
            req.userID = null;
        }
    } catch (err) {
        serverLogger.error(`[authMiddleware:attachUser] ${err.message}`);
        req.userID = null;
    }

    next();
}

async function requireProjectAccess(req, res, next) {
    const projectID = req.params.projectID || req.body.projectID;
    const userID = req.userID;

    if (!projectID) {
        return res.status(400).json({ successful: false, message: 'Project ID is required' });
    }

    try {
        const hasAccess = await projectDBService.isProjectCollaborator(projectID, userID);
        if (!hasAccess) {
            return res.status(403).json({ successful: false, message: 'Forbidden' });
        }
        next();
    } catch (err) {
        serverLogger.error(`[authMiddleware:requireProjectAccess] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Authorization error' });
    }
}

async function requireProjectOwner(req, res, next) {
    const projectID = req.params.projectID || req.body.projectID;
    const userID = req.userID;

    try {
        const ownerID = await projectDBService.queryProjectOwner(projectID);
        if (ownerID !== userID) {
            return res.status(403).json({ successful: false, message: 'Only the project owner can do this' });
        }
        next();
    } catch (err) {
        serverLogger.error(`[authMiddleware:requireProjectOwner] ${err.message}`);
        return res.status(500).json({ successful: false, message: 'Authorization error' });
    }
}

module.exports = { requireLogin, attachUser, requireProjectAccess, requireProjectOwner };