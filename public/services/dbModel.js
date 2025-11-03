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
                                           ipAddress TEXT,
                                           attemptOS TEXT,
                                           attemptBrowser TEXT,
                                           attemptIP TEXT,
                                           FOREIGN KEY (uid) REFERENCES user(uid) ON DELETE CASCADE);
`



module.exports = {USER_TABLE_SCHEMA, CREDENTIAL_TABLE_SCHEMA, SESSION_TABLE_SCHEMA, LOGINATTEMPTS_TABLE_SCHEMA}



