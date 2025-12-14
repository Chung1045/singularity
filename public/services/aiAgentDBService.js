const db = require("./db")
const uuid = require("uuid-v4")

async function createNewChatThread(projectID) {
    let chatID = uuid()
    const sql = `INSERT INTO chat (chatID, projectID)
                 VALUES (?, ?)`

    const params = [
        chatID,
        projectID
    ];

    try {
        await db.run(sql, params);
        return chatID;
    } catch (error) {
        throw error;
    }

}

async function renameChatThread(projectID, chatID, newChatThreadName) {
    const sql = `UPDATE chat SET threadName = ? WHERE chatID = ? AND projectID = ?`

    const param = [newChatThreadName, projectID, chatID]

    try {
        await db.run(sql, param);
        return true
    } catch (error) {
        throw error;
    }

}

async function deleteChatThread(projectID, chatID) {
    const sql = `DELETE FROM chat WHERE projectID = ? AND chatID = ?`
    const param = [projectID, chatID]

    try {
        await db.run(sql, param);
        return true
    } catch (error) {
        throw error;
    }

}

async function saveConversationRequest(conversationID, conversationSeq, chatID, conversationMessage) {
    const sql = `
        INSERT INTO conversation
            (conversationID, chatSeq, chatID, conversationMessage)
        VALUES (?, ?, ?, ?)
    `;

    const params = [conversationID, conversationSeq, chatID, conversationMessage];

    try {
        await db.run(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function saveConversationRequestRef(conversationID, conversationSeq, documentIDs, remarks) {
    const sql = `
        INSERT INTO conversationDocRef
            (refID, conversationID, conversationSeq, documentID, remarks)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        for (let i = 0; i < documentIDs.length; i++) {
            const refID = uuid();
            const documentID = documentIDs[i];
            const remark = remarks[i] ?? null; // fallback if missing

            const params = [
                refID,
                conversationID,
                conversationSeq,
                documentID,
                remark
            ];

            await db.run(sql, params);

            console.log(`Linked document ${documentID} with remark "${remark}"`);
        }

        console.log("All document references linked successfully.");
        return true;
    } catch (error) {
        throw error;
    }
}


async function saveConversationResponse(responseID, responseSeq, conversationID, conversationSeq, responseMessage, responseTimeDate) {
    const sql = `
        INSERT INTO response 
        (responseID, responseSeq, conversationID, conversationSeq, responseMessage, responseTimeDate)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [responseID, responseSeq, conversationID, conversationSeq, responseMessage, responseTimeDate];

    try {
        await db.run(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function deleteConversation(conversationID) {
    const sql = `DELETE FROM conversation WHERE conversationID = ?`;
    const params = [conversationID];

    try {
        await db.run(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function conversationEdit(conversationID, newConversationRequest) {
    // This will wipe out all the existing response from the AI agent
    const sql = `UPDATE conversation SET conversationMessage = ? WHERE conversationID = ?`
    const sql2 = `DELETE FROM response WHERE conversationID = ?`

    try {
        await db.run(sql, [conversationID, newConversationRequest]);
        await db.run(sql2, [conversationID])
        return true;
    } catch (error) {
        throw error;
    }

}

async function getConversationRecall(projectID, chatID) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                c.conversationID,
                c.chatSeq,
                c.conversationMessage,
                r.responseMessage
            FROM conversation c
            LEFT JOIN response r
                ON c.conversationID = r.conversationID
            WHERE c.chatID = ? AND r.isActive = 1 
            ORDER BY c.chatSeq DESC
            LIMIT 5
        `;
        // ensure that the response is the one the user choose

        db.all(sql, [chatID], (err, rows) => {
            if (err) {
                console.error('Error in getConversationRecall:', err);
                return reject(err);
            }

            resolve(rows.reverse());
        });
    });
}

async function getProjectRequirements(projectID) {

    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM requirements WHERE projectID = ?`

        db.all(sql, [projectID], (err, rows) => {
            if (err) {
                console.error('Error in getFileMetadata:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });

}

async function getRequirementsSource(requirementsID) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT d.documentID, d.documentName, d.documentExt
            FROM requirementsSource rs
            JOIN documents d ON rs.documentID = d.documentID
            WHERE rs.requirementsID = ?
        `;

        db.all(sql, [requirementsID], (err, rows) => {
            if (err) {
                console.error('Error in getRequirementSource:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

async function updateRequirements(requirements, references) {

}


async function getProjectUserStories(projectID) {

    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM userStories WHERE projectID = ?`

        db.all(sql, [projectID], (err, rows) => {
            if (err) {
                console.error('Error in getFileMetadata:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

async function updateProjectUserStories() {

}

async function getUserStoriesSource(storyID){
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT d.documentID, d.documentName, d.documentExt
            FROM userStorySource uss
            JOIN documents d ON uss.documentID = d.documentID
            WHERE uss.storyID = ?
        `;

        db.all(sql, [storyID], (err, rows) => {
            if (err) {
                console.error('Error in getUserStoriesSource:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}


module.exports = {
    conversationEdit,
    createNewChatThread,
    renameChatThread,
    deleteChatThread,
    deleteConversation,
    saveConversationRequest,
    saveConversationRequestRef,
    saveConversationResponse
}


