const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'application.log' })
    ],
});

const serverLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[SERVER][${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'log/application.log' })
    ],
});

const pathLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[PATH][${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'log/pathAccessLog.log' })
    ],
});

const dbLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[DB][${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'application.log' })
    ],
});

const serviceLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[SERVICE][${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'application.log' })
    ],
});

function logAccessedPath(req) {
    pathLogger.info(`\nIP: ${req.ip}\n${req.method} ${req.originalUrl}\nUser-Agent: ${req.get('user-agent')}`);
}

// Accept parameters for user info and result
function logLoginAttempt(userId, success, ip) {
    const status = success ? 'SUCCESS' : 'FAILED';
    logger.info(`Login attempt - User: ${userId}, Status: ${status}, IP: ${ip}`);
}

module.exports = {
    logAccessedPath,
    logLoginAttempt,
    logger,
    serverLogger,
    dbLogger,
    serviceLogger
}
