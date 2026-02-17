// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');
// const dbModel = require('./dbModel');

// // Create or open a database file
// const dbPath = path.resolve(__dirname, 'database.db');
// const db = new sqlite3.Database(dbPath, async (err) => {
//     if (err) {
//         console.error('Error opening database:', err.message);
//     } else {
//         console.log('Connected to SQLite database.');

//         // Drop existing tables if they exist (prerequisites)
//         try {
//             await db.exec("DROP TABLE IF EXISTS passkeys;");
//             await db.exec("DROP TABLE IF EXISTS googleoauth_identity;");
//             await db.exec("DROP TABLE IF EXISTS login_attempts;");
//             await db.exec("DROP TABLE IF EXISTS sessions;");
//             await db.exec("DROP TABLE IF EXISTS credentials;");
//             await db.exec("DROP TABLE IF EXISTS users;");
//             console.log('Dropped existing tables.');
//         } catch (dropErr) {
//             console.error('Error dropping tables:', dropErr.message);
//         }



//         await db.exec(dbModel.USER_TABLE_SCHEMA());
//         await db.exec(dbModel.CREDENTIAL_TABLE_SCHEMA());
//         await db.exec(dbModel.SESSION_TABLE_SCHEMA());
//         await db.exec(dbModel.LOGINATTEMPTS_TABLE_SCHEMA());
//         await db.exec(dbModel.GOOGLEOAUTH_IDENTITY_TABLE_SCHEMA());
//         await db.exec(dbModel.PASSKEYS_SCHEMA());
//     }
// });


// module.exports = db;


const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbModel = require('./dbModel');

// Helper function to check and add missing columns
async function migrateDatabase(db) {
    return new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(user)", [], (err, columns) => {
            if (err) {
                console.error(' Error checking table schema:', err);
                return reject(err);
            }

            const operations = [];

            if (columns && columns.length > 0) {
                const hasUserAvatarPath = columns.some(col => col.name === 'userAvatarPath');
                const hasGoogleAvatarUrl = columns.some(col => col.name === 'googleAvatarUrl');

                if (!hasUserAvatarPath) {
                    console.log('  Adding missing column: userAvatarPath');
                    operations.push(new Promise((res, rej) => {
                        db.run('ALTER TABLE user ADD COLUMN userAvatarPath TEXT', (err) => {
                            if (err) {
                                console.error(' Error adding userAvatarPath:', err);
                                rej(err);
                            } else {
                                console.log(' Added userAvatarPath column');
                                res();
                            }
                        });
                    }));
                }

                if (!hasGoogleAvatarUrl) {
                    console.log('  Adding missing column: googleAvatarUrl');
                    operations.push(new Promise((res, rej) => {
                        db.run('ALTER TABLE user ADD COLUMN googleAvatarUrl TEXT', (err) => {
                            if (err) {
                                console.error(' Error adding googleAvatarUrl:', err);
                                rej(err);
                            } else {
                                console.log(' Added googleAvatarUrl column');
                                res();
                            }
                        });
                    }));
                }
            }

            // Also ensure conversationTimeDate exists on conversation table
            db.all("PRAGMA table_info(conversation)", [], (errConv, convColumns) => {
                if (!errConv && convColumns && convColumns.length > 0) {
                    const hasConversationTimeDate = convColumns.some(col => col.name === 'conversationTimeDate');
                    if (!hasConversationTimeDate) {
                        console.log('  Adding missing column: conversationTimeDate');
                        operations.push(new Promise((res, rej) => {
                            db.run('ALTER TABLE conversation ADD COLUMN conversationTimeDate TEXT', (err) => {
                                if (err) {
                                    console.error(' Error adding conversationTimeDate:', err);
                                    rej(err);
                                } else {
                                    console.log(' Added conversationTimeDate column');
                                    res();
                                }
                            });
                        }));
                    }
                }

                if (operations.length === 0) {
                    return resolve();
                }

                Promise.all(operations)
                    .then(() => {
                        console.log(' Database migration completed');
                        resolve();
                    })
                    .catch(reject);
            });
        });
    });
}

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
                await run(db, sql);
            }
        }

        await migrateDatabase(db);

        console.log("All tables initialized successfully.");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
});

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function get(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

module.exports = db;
