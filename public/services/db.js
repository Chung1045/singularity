const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbModel = require('./dbModel');

// Create or open a database file
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        return;
    }

    console.log("Connected to SQLite database.");

    try {
        await run(db, "PRAGMA foreign_keys = ON;");

        for (const [name, schemaFn] of Object.entries(dbModel)) {
            if (typeof schemaFn === "function") {
                const sql = schemaFn();
                console.log(`Creating table for ${name}...`);
                await run(db, sql);
            }
        }

        console.log("All tables created successfully.");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
});

function run(db, sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

module.exports = db;
