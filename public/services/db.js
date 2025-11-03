const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbModel = require('./dbModel');


// Create or open database file
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        await db.exec(dbModel.USER_TABLE_SCHEMA());
        await db.exec(dbModel.CREDENTIAL_TABLE_SCHEMA());
        await db.exec(dbModel.SESSION_TABLE_SCHEMA());
        await db.exec(dbModel.LOGINATTEMPTS_TABLE_SCHEMA());
    }
});


module.exports = db;
