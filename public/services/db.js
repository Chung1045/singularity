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

// Create or open a database file
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');

        // Drop existing tables if they exist (prerequisites)
        try {
            await db.exec("DROP TABLE IF EXISTS passkeys;");
            await db.exec("DROP TABLE IF EXISTS googleoauth_identity;");
            await db.exec("DROP TABLE IF EXISTS login_attempts;");
            await db.exec("DROP TABLE IF EXISTS sessions;");
            await db.exec("DROP TABLE IF EXISTS credentials;");
            await db.exec("DROP TABLE IF EXISTS users;");
            console.log('Dropped existing tables.');
        } catch (dropErr) {
            console.error('Error dropping tables:', dropErr.message);
        }

        // Create fresh tables
        try {
            await db.exec(dbModel.USER_TABLE_SCHEMA());
            await db.exec(dbModel.CREDENTIAL_TABLE_SCHEMA());
            await db.exec(dbModel.SESSION_TABLE_SCHEMA());
            await db.exec(dbModel.LOGINATTEMPTS_TABLE_SCHEMA());
            await db.exec(dbModel.GOOGLEOAUTH_IDENTITY_TABLE_SCHEMA());
            await db.exec(dbModel.PASSKEYS_SCHEMA());
            console.log('All tables created successfully.');
        } catch (createErr) {
            console.error('Error creating tables:', createErr.message);
        }
    }
});

module.exports = db;