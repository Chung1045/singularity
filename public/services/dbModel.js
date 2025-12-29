const USER_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS user (
                                        uid TEXT PRIMARY KEY UNIQUE,
                                        firstName TEXT,
                                        lastName TEXT,
                                        userType TEXT,
                                        userEmail TEXT,
                                        userName TEXT UNIQUE,
                                        userAvatarPath TEXT
    );
`;

const CREDENTIAL_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS credential (
                                              credentialID TEXT PRIMARY KEY UNIQUE,
                                              uid TEXT NOT NULL,
                                              credentialPassword TEXT,
                                              changeDate TEXT,
                                              FOREIGN KEY (uid) REFERENCES user(uid) ON DELETE CASCADE);
`;

const SESSION_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS session (
                                           sessionID TEXT PRIMARY KEY UNIQUE,
                                           uid TEXT NOT NULL,
                                           lastSeenTime TEXT,
                                           sessionOS TEXT,
                                           sessionBrowser TEXT,
                                           sessionIP TEXT,
                                           FOREIGN KEY (uid) REFERENCES user(uid) ON DELETE CASCADE);
`

const LOGINATTEMPTS_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS loginAttempts (
                                                 attemptID TEXT PRIMARY KEY UNIQUE,
                                                 uid TEXT NOT NULL,
                                                 attemptDate TEXT NOT NULL,
                                                 attemptOS TEXT NOT NULL,
                                                 attemptBrowser TEXT NOT NULL,
                                                 attemptIP TEXT NOT NULL,
                                                 FOREIGN KEY (uid) REFERENCES user(uid) ON DELETE CASCADE);
`

const GOOGLEOAUTH_IDENTITY_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS googleOauth_identity (
                                                        userGoogleId TEXT PRIMARY KEY,
                                                        uid TEXT UNIQUE,
                                                        FOREIGN KEY (uid) REFERENCES user(uid) ON DELETE CASCADE);
`

const PASSKEYS_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS passkeys (
                                            keyID TEXT PRIMARY KEY UNIQUE,
                                            uid TEXT NOT NULL,
                                            keyName TEXT,
                                            transports TEXT NOT NULL,
                                            signCount INTEGER NOT NULL DEFAULT 0,
                                            publicKey TEXT NOT NULL,
                                            dateCreate TEXT NOT NULL,
                                            lastUsed TEXT,
                                            lastUsedDevice TEXT,
                                            FOREIGN KEY (uid) REFERENCES user(uid) ON DELETE CASCADE);
`


module.exports = {USER_TABLE_SCHEMA, CREDENTIAL_TABLE_SCHEMA, SESSION_TABLE_SCHEMA,
    LOGINATTEMPTS_TABLE_SCHEMA, GOOGLEOAUTH_IDENTITY_TABLE_SCHEMA, PASSKEYS_SCHEMA}



