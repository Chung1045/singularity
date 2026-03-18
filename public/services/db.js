const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbModel = require('./dbModel');
const { serverLogger } = require('./loggingService');
const ServiceError = require('../errors/ServiceError');

const SERVICE_NAME = 'Database';
const dbPath = path.resolve(__dirname, 'database.db');

const _db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        serverLogger.error(`[${SERVICE_NAME}] Failed to open database: ${err.message}`);
    }
});

// Helper function to check and add missing columns
async function migrateDatabase() {
    const migrations = [
        {
            table: 'user',
            column: 'userAvatarPath',
            sql: 'ALTER TABLE user ADD COLUMN userAvatarPath TEXT'
        },
        {
            table: 'user',
            column: 'googleAvatarUrl',
            sql: 'ALTER TABLE user ADD COLUMN googleAvatarUrl TEXT'
        },
        {
            table: 'conversation',
            column: 'conversationTimeDate',
            sql: 'ALTER TABLE conversation ADD COLUMN conversationTimeDate TEXT'
        }
    ];

    for (const { table, column, sql } of migrations) {
        try {
            const columns = await all(`PRAGMA table_info(${table})`);
            const exists = columns.some(col => col.name === column);
            if (!exists) {
                await run(sql);
                serverLogger.info(`[${SERVICE_NAME}:migrate] Added column: ${table}.${column}`);
            }
        } catch (err) {
            throw new ServiceError(SERVICE_NAME, 'migrateDatabase', `Failed to migrate ${table}.${column}`, err);
        }
    }
}

async function initialize() {
    try {
        await run("PRAGMA foreign_keys = ON;");

        for (const [name, sql] of Object.entries(dbModel)) {
            if (typeof sql === 'string') {
                await run(sql);
            }
        }

        await migrateDatabase();
        serverLogger.info(`[${SERVICE_NAME}] All tables initialized successfully`);

    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'initialize', 'Database initialization failed', err);
    }
}

async function testConnection() {
    try {
        await get('SELECT 1');
    } catch (err) {
        throw new ServiceError(SERVICE_NAME, 'testConnection', 'Database connection test failed', err);
    }
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        _db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this); // this.changes, this.lastID available
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        _db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        _db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

module.exports = { run, get, all, initialize, testConnection };
