const winston = require('winston');
const path = require("path");

const LOG_DIR = 'log';
const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

function createLogger(label, logFile, toConsole = false) {
    const transports = [
        new winston.transports.File({
            filename: path.join(LOG_DIR, logFile)
        })
    ];

    if (toConsole) {
        transports.push(new winston.transports.Console());
    }

    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
            winston.format.printf(({ timestamp, level, message, stack }) => {
                const base = `[${label}][${timestamp}] ${level.toUpperCase()}: ${message}`;
                return stack ? `${base}\n${stack}` : base; // ✅ include stack trace for errors
            })
        ),
        transports
    });
}

const logger = createLogger('APP', 'application.log', true);
const serverLogger = createLogger('SERVER', 'application.log', true);
const pathLogger = createLogger('PATH', 'pathAccessLog.log', false);
const dbLogger = createLogger('DB', 'application.log', false);
const serviceLogger = createLogger('SERVICE', 'application.log', false);

function logAccessedPath(req) {
    pathLogger.info(`IP: ${req.ip} | ${req.method} ${req.originalUrl} | User-Agent: ${req.get('user-agent')}`);
}

// Accept parameters for user info and result
function logLoginAttempt(userID, success, ip) {
    const status = success ? 'SUCCESS' : 'FAILED';
    logger.info(`Login attempt | User: ${userID} | Status: ${status} | IP: ${ip}`);
}

module.exports = {
    logger,
    serverLogger,
    pathLogger,
    dbLogger,
    serviceLogger,
    logAccessedPath,
    logLoginAttempt
}
