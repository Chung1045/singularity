const USER_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS user
    (
        uid            TEXT PRIMARY KEY NOT NULL UNIQUE,
        firstName      TEXT             NOT NULL,
        lastName       TEXT             NOT NULL,
        userType       TEXT             NOT NULL,
        userEmail      TEXT             NOT NULL,
        userName       TEXT             NOT NULL UNIQUE,
        userAvatarPath TEXT
    );
`;

const CREDENTIAL_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS credential
    (
        credentialID       TEXT PRIMARY KEY NOT NULL UNIQUE,
        uid                TEXT             NOT NULL,
        credentialPassword TEXT             NOT NULL,
        changeDate         TEXT             NOT NULL,
        FOREIGN KEY (uid) REFERENCES user (uid) ON DELETE CASCADE
    );
`;

const SESSION_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS session
    (
        sessionID      TEXT PRIMARY KEY NOT NULL UNIQUE,
        uid            TEXT             NOT NULL,
        lastSeenTime   TEXT             NOT NULL,
        sessionOS      TEXT             NOT NULL,
        sessionBrowser TEXT             NOT NULL,
        sessionIP      TEXT             NOT NULL,
        FOREIGN KEY (uid) REFERENCES user (uid) ON DELETE CASCADE
    );
`

const LOGINATTEMPTS_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS loginAttempts
    (
        attemptID      TEXT PRIMARY KEY NOT NULL UNIQUE,
        uid            TEXT             NOT NULL,
        attemptDate    TEXT             NOT NULL,
        attemptOS      TEXT             NOT NULL,
        attemptBrowser TEXT             NOT NULL,
        attemptIP      TEXT             NOT NULL,
        FOREIGN KEY (uid) REFERENCES user (uid) ON DELETE CASCADE
    );
`

const GOOGLEOAUTH_IDENTITY_TABLE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS googleOauth_identity
    (
        userGoogleId TEXT PRIMARY KEY NOT NULL UNIQUE,
        uid          TEXT             NOT NULL UNIQUE,
        FOREIGN KEY (uid) REFERENCES user (uid) ON DELETE CASCADE
    );
`

const PASSKEYS_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS passkeys
    (
        keyID      TEXT PRIMARY KEY NOT NULL UNIQUE,
        uid        TEXT             NOT NULL,
        keyName    TEXT,
        transports TEXT             NOT NULL,
        signCount  INTEGER          NOT NULL DEFAULT 0,
        publicKey  TEXT             NOT NULL,
        dateCreate TEXT             NOT NULL,
        lastUsed   TEXT,
        FOREIGN KEY (uid) REFERENCES user (uid) ON DELETE CASCADE
    );
`

const PROJECT_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS project
    (
        projectID       TEXT PRIMARY KEY NOT NULL UNIQUE,
        projectOwnerUid TEXT             NOT NULL,
        projectName     TEXT             NOT NULL,
        dateCreate      TEXT             NOT NULL,
        FOREIGN KEY (projectOwnerUid) REFERENCES user (uid) ON DELETE CASCADE
    );

`

const PROJECT_SHARE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS projectShare
    (
        shareID   TEXT PRIMARY KEY NOT NULL UNIQUE,
        projectID TEXT             NOT NULL,
        collabUid TEXT             NOT NULL,
        confirmed INTEGER          NOT NULL DEFAULT 0,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE,
        FOREIGN KEY (collabUid) REFERENCES user (uid) ON DELETE CASCADE
    );
`
// kind: invitation / removal / leaving project / delete
const NOTIFICATION_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS notification
    (
        notifID     TEXT PRIMARY KEY NOT NULL UNIQUE,
        receiveUid  TEXT             NOT NULL,
        dateReceive TEXT             NOT NULL,
        kind        TEXT             NOT NULL CHECK (kind IN ('invitation', 'removal', 'leaving', 'delete')),
        projectID   TEXT,
        message     TEXT,
        isRead      INTEGER          NOT NULL DEFAULT 0,
        FOREIGN KEY (receiveUid) REFERENCES user (uid) ON DELETE CASCADE,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE
    );
`

const DOCUMENTS_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS documents
    (
        documentID   TEXT PRIMARY KEY NOT NULL UNIQUE,
        projectID    TEXT             NOT NULL,
        documentName TEXT             NOT NULL,
        documentExt  TEXT             NOT NULL,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE
    );
`

const USERSTORIES_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS userStories
    (
        storyID      TEXT    NOT NULL UNIQUE,
        projectID    TEXT    NOT NULL,
        storySeq     INTEGER NOT NULL,
        storyRole    TEXT    NOT NULL,
        storyTitle   TEXT    NOT NULL,
        storyContent TEXT    NOT NULL,
        storySource  TEXT    NOT NULL,
        PRIMARY KEY (storyID, storySeq),
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE
    );
`

const USERSTORIES_SOURCE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS userStorySource
    (
        refID      TEXT PRIMARY KEY NOT NULL UNIQUE,
        storyID    INTEGER          NOT NULL,
        projectID  TEXT NOT NULL,
        documentID TEXT             NOT NULL,
        remarks    TEXT,
        location TEXT,
        FOREIGN KEY (storyID) REFERENCES userStories ON DELETE CASCADE,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE,
        FOREIGN KEY (documentID) REFERENCES documents
    )
`

const REQUIREMENTS_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS requirements
    (
        requirementsID     TEXT PRIMARY KEY NOT NULL UNIQUE,
        requirementSeq     INTEGER          NOT NULL,
        projectID          TEXT             NOT NULL,
        requirementType    TEXT             NOT NULL CHECK ( requirementType in ('functional', 'non-functional') ),
        requirementTitle   TEXT             NOT NULL,
        requirementContent TEXT             NOT NULL,
        requirementRole    TEXT             NOT NULL,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE
    );
`

const REQUIREMENTS_STORY_REF_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS requirementsStoryRef
    (
        refID          TEXT PRIMARY KEY NOT NULL UNIQUE,
        requirementsID TEXT             NOT NULL,
        projectID      TEXT             NOT NULL,
        storyID        TEXT             NOT NULL,
        FOREIGN KEY (requirementsID) REFERENCES requirements (requirementsID) ON DELETE CASCADE,
        FOREIGN KEY (storyID) REFERENCES userStories (storyID)
    )
`

const REQUIREMENTS_SOURCE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS requirementsSource
    (
        refID          TEXT PRIMARY KEY NOT NULL UNIQUE,
        requirementsID TEXT             NOT NULL,
        projectID      TEXT             NOT NULL,
        documentID     TEXT             NOT NULL,
        remarks        TEXT,
        location       TEXT,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE,
        FOREIGN KEY (requirementsID) REFERENCES requirements (requirementsID) ON DELETE CASCADE,
        FOREIGN KEY (documentID) REFERENCES documents (documentID)
    )
`

const VOICEANALYSIS_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS voiceAnalysis
    (
        voiceAnalysisID    TEXT PRIMARY KEY NOT NULL UNIQUE,
        projectID          TEXT             NOT NULL,
        analysisType       TEXT             NOT NULL CHECK ( analysisType in ('userStories', 'requirements') ),
        analysisID         INTEGER          NOT NULL,
        analysisTranscribe TEXT             NOT NULL,
        analysisTitle      TEXT             NOT NULL,
        analysisContent    TEXT             NOT NULL,
        analysisSource     TEXT             NOT NULL,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE
    );
`

const CHAT_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS chat
    (
        chatID     TEXT PRIMARY KEY NOT NULL UNIQUE,
        projectID  TEXT             NOT NULL,
        threadName TEXT,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE
    );
`

// Rename conversationID to chatID
const CONVERSATION_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS conversation
    (
        conversationID      TEXT    NOT NULL UNIQUE,
        chatSeq             INTEGER NOT NULL,
        chatID              TEXT    NOT NULL,
        conversationMessage TEXT    NOT NULL,
        PRIMARY KEY (conversationID, chatSeq),
        FOREIGN KEY (chatID) REFERENCES chat ON DELETE CASCADE
    );
`

const CONVERSATION_DOC_REF_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS conversationDocRef
    (
        refID           TEXT PRIMARY KEY NOT NULL UNIQUE,
        conversationID  TEXT             NOT NULL,
        conversationSeq INTEGER          NOT NULL,
        documentID      TEXT             NOT NULL,
        remarks         TEXT,
        FOREIGN KEY (conversationID, conversationSeq) REFERENCES conversation ON DELETE CASCADE,
        FOREIGN KEY (documentID) REFERENCES documents
    )
`

const RESPONSE_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS response
    (
        responseID       TEXT PRIMARY KEY NOT NULL UNIQUE,
        responseSeq      INTEGER          NOT NULL,
        conversationID   TEXT             NOT NULL,
        conversationSeq  INTEGER          NOT NULL,
        responseMessage  TEXT             NOT NULL,
        responseTimeDate TEXT             NOT NULL,
        isActive         INTEGER          NOT NULL,
        FOREIGN KEY (conversationID, conversationSeq) REFERENCES conversation ON DELETE CASCADE
    );
`

const REPORTS_SCHEMA = () => `
    CREATE TABLE IF NOT EXISTS reports
    (
        reportID   TEXT PRIMARY KEY NOT NULL UNIQUE,
        projectID  TEXT             NOT NULL,
        reportName TEXT             NOT NULL,
        reportType TEXT             NOT NULL CHECK ( reportType in ('userStories', 'requirements') ),
        reportDate TEXT             NOT NULL,
        FOREIGN KEY (projectID) REFERENCES project (projectID) ON DELETE CASCADE
    );
`

module.exports = {
    USER_TABLE_SCHEMA,
    CREDENTIAL_TABLE_SCHEMA,
    SESSION_TABLE_SCHEMA,
    LOGINATTEMPTS_TABLE_SCHEMA,
    GOOGLEOAUTH_IDENTITY_TABLE_SCHEMA,
    PASSKEYS_SCHEMA,
    PROJECT_SCHEMA,
    PROJECT_SHARE_SCHEMA,
    DOCUMENTS_SCHEMA,
    NOTIFICATION_SCHEMA,
    USERSTORIES_SOURCE_SCHEMA,
    USERSTORIES_SCHEMA,
    REPORTS_SCHEMA,
    REQUIREMENTS_SCHEMA,
    REQUIREMENTS_SOURCE_SCHEMA,
    RESPONSE_SCHEMA,
    CHAT_SCHEMA,
    CONVERSATION_SCHEMA,
    CONVERSATION_DOC_REF_SCHEMA,
    VOICEANALYSIS_SCHEMA,
    REQUIREMENTS_STORY_REF_SCHEMA
}



