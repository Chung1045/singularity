const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.resolve(__dirname, 'public/services/database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connected to SQLite database.');
    }
});

// Check if columns exist and add them if they don't
async function addAvatarColumns() {
    return new Promise((resolve, reject) => {
        // First, check the current schema
        db.all("PRAGMA table_info(user)", [], (err, columns) => {
            if (err) {
                console.error('❌ Error checking table schema:', err);
                return reject(err);
            }

            console.log('\n📋 Current user table columns:');
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
            });

            const hasUserAvatarPath = columns.some(col => col.name === 'userAvatarPath');
            const hasGoogleAvatarUrl = columns.some(col => col.name === 'googleAvatarUrl');

            const operations = [];

            if (!hasUserAvatarPath) {
                console.log('\n⚠️  userAvatarPath column missing - will add it');
                operations.push(new Promise((res, rej) => {
                    db.run('ALTER TABLE user ADD COLUMN userAvatarPath TEXT', (err) => {
                        if (err) {
                            console.error('❌ Error adding userAvatarPath:', err);
                            rej(err);
                        } else {
                            console.log('✅ Added userAvatarPath column');
                            res();
                        }
                    });
                }));
            } else {
                console.log('✅ userAvatarPath column already exists');
            }

            if (!hasGoogleAvatarUrl) {
                console.log('\n⚠️  googleAvatarUrl column missing - will add it');
                operations.push(new Promise((res, rej) => {
                    db.run('ALTER TABLE user ADD COLUMN googleAvatarUrl TEXT', (err) => {
                        if (err) {
                            console.error('❌ Error adding googleAvatarUrl:', err);
                            rej(err);
                        } else {
                            console.log('✅ Added googleAvatarUrl column');
                            res();
                        }
                    });
                }));
            } else {
                console.log('✅ googleAvatarUrl column already exists');
            }

            if (operations.length === 0) {
                console.log('\n✅ All required columns exist. No changes needed.');
                return resolve();
            }

            Promise.all(operations)
                .then(() => {
                    console.log('\n✅ All columns added successfully!');
                    resolve();
                })
                .catch(reject);
        });
    });
}

// Run the migration
addAvatarColumns()
    .then(() => {
        console.log('\n🎉 Migration completed successfully!');
        db.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Migration failed:', err);
        db.close();
        process.exit(1);
    });
