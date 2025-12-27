const db = require("./db")
const uuid = require("uuid-v4")

// Helper function to promisify db.run
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

// Helper function to promisify db.get
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

// Helper function to promisify db.all
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function createNewChatThread(projectID) {
    let chatID = uuid()
    const sql = `INSERT INTO chat (chatID, projectID, threadName)
                 VALUES (?, ?, ?)`

    const params = [
        chatID,
        projectID,
        ""
    ];

    try {
        await dbRun(sql, params);
        return chatID;
    } catch (error) {
        throw error;
    }
}

async function renameChatThread(projectID, chatID, newChatThreadName) {
    const sql = `UPDATE chat SET threadName = ? WHERE chatID = ? AND projectID = ?`
    const param = [newChatThreadName, projectID, chatID]

    try {
        await dbRun(sql, param);
        return true
    } catch (error) {
        throw error;
    }
}

async function deleteChatThread(projectID, chatID) {
    const sql = `DELETE FROM chat WHERE projectID = ? AND chatID = ?`
    const param = [projectID, chatID]

    try {
        await dbRun(sql, param);
        return true
    } catch (error) {
        throw error;
    }
}

async function saveConversationRequest(data) {
    let chatID, nextSeq;
    if (!data.chatID){
        chatID = await createNewChatThread(data.projectID);
        nextSeq = 1;
    } else {
        chatID = data.chatID;
        const getNextSeq = `
            SELECT COALESCE(MAX(chatSeq), 0) + 1 as nextSeq
            FROM conversation
            WHERE chatID = ?
        `;
        const row = await dbGet(getNextSeq, [chatID]);
        nextSeq = row.nextSeq;
    }

    const sql = `
        INSERT INTO conversation
            (conversationID, chatSeq, chatID, conversationMessage)
        VALUES (?, ?, ?, ?)
    `;

    let conversationID = uuid();

    await dbRun(sql, [conversationID, nextSeq, chatID, data.requestMessage]);

    return { chatID: chatID, conversationID: conversationID, chatSeq: nextSeq };
}

async function saveConversationRequestRef(data, conversationID, conversationSeq) {
    const sql = `
        INSERT INTO conversationDocRef
            (refID, conversationID, conversationSeq, documentID, remarks)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        for (let i = 0; i < data.attachedDocumentIDs.length; i++) {
            const refID = uuid();
            const documentID = data.attachedDocumentIDs[i];
            console.log(`DocumentID to insert: ${documentID}`)
            const remark = null;

            const params = [refID, conversationID, conversationSeq, documentID, remark];
            await dbRun(sql, params);

            console.log(`Linked document ${documentID}`);
        }

        console.log("All document references linked successfully.");
        return true;
    } catch (error) {
        throw error;
    }
}

async function saveConversationResponse(chatSeq, conversationID, responseMessage) {
    const sql = `
        INSERT INTO response 
        (responseID, responseSeq, conversationID, conversationSeq, responseMessage, responseTimeDate, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [uuid(), 1, conversationID, chatSeq, responseMessage, Date(), 1];

    try {
        await dbRun(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function deleteConversation(conversationID) {
    const sql = `DELETE FROM conversation WHERE conversationID = ?`;
    const params = [conversationID];

    try {
        await dbRun(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function conversationEdit(conversationID, newConversationRequest) {
    const sql = `UPDATE conversation SET conversationMessage = ? WHERE conversationID = ?`
    const sql2 = `DELETE FROM response WHERE conversationID = ?`

    try {
        await dbRun(sql, [conversationID, newConversationRequest]);
        await dbRun(sql2, [conversationID])
        return true;
    } catch (error) {
        throw error;
    }
}

async function getConversationRecall(projectID, chatID) {
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

    const rows = await dbAll(sql, [chatID]);
    return rows.reverse();
}

async function getProjectRequirements(projectID) {
    const sql = `SELECT * FROM requirements WHERE projectID = ?`;
    const rows = await dbAll(sql, [projectID]);

    const requirementsWithSources = await Promise.all(
        rows.map(async (requirement) => {
            const sources = await getRequirementsSource(requirement.requirementsID);
            const stories = await getRequirementsStoryRef(requirement.requirementsID)

            return {
                requirementID: requirement.requirementsID,
                details: {
                    requirementType: requirement.requirementType,
                    requirementSeq: requirement.requirementSeq,
                    title: requirement.requirementTitle,
                    description: requirement.requirementContent,
                    role: requirement.requirementRole,
                    sourceReference: sources.map(src => ({
                        documentID: src.documentID,
                        documentName: src.documentName,
                        remarks: src.remarks,
                        location: src.location || ""
                    })),
                    referenceStory: stories.map(story => ({
                        storyID: story.storyID
                    }))
                }
            };
        })
    );

    return requirementsWithSources;
}

async function getRequirementsSource(requirementsID) {
    const sql = `
        SELECT d.documentID, d.documentName, d.documentExt, rs.location, rs.remarks
        FROM requirementsSource rs
                 JOIN documents d ON rs.documentID = d.documentID
        WHERE rs.requirementsID = ?
    `;

    return await dbAll(sql, [requirementsID]);
}

async function getRequirementsStoryRef(requirementsID) {
    const sql = `SELECT * FROM requirementsStoryRef WHERE requirementsID = ?`;
    return await dbAll(sql, [requirementsID]);
}

async function updateRequirements(projectID, jsonList) {
    console.log("Received******")
    console.log(jsonList)

    const updateSQL = `
        UPDATE requirements SET requirementSeq = ?, requirementType = ?,
                                requirementTitle = ?, requirementContent = ?, requirementRole = ?
        WHERE requirementsID = ? AND projectID = ?
    `

    const insertSQL = `INSERT INTO requirements (requirementsID, requirementSeq, projectID,
                                                 requirementType, requirementTitle, requirementContent, requirementRole)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`

    const deleteSQL = `DELETE FROM requirements WHERE requirementsID = ? AND projectID = ?`

    const getMaxSeqSQL = `SELECT MAX(requirementSeq) as maxSeq FROM requirements WHERE projectID = ? AND requirementType = ?`

    try {
        for (let data of jsonList) {
            switch (data.operation) {
                case 'UPDATE':
                    await dbRun(updateSQL, [
                        data.details.requirementSeq,
                        data.details.requirementType,
                        data.details.title,
                        data.details.description,
                        data.details.role,
                        data.requirementID,
                        projectID
                    ]);
                    break;

                case 'INSERT':
                    let requirementID = uuid();

                    const result = await dbGet(getMaxSeqSQL, [projectID, data.details.requirementType]);
                    const nextSeq = (result && result.maxSeq != null ? result.maxSeq : 0) + 1;

                    await dbRun(insertSQL, [
                        requirementID,
                        nextSeq,
                        projectID,
                        data.details.requirementType,
                        data.details.title,
                        data.details.description,
                        data.details.role
                    ]);
                    break;

                case 'DELETE':
                    await dbRun(`DELETE FROM requirementsSource WHERE requirementsID = ?`, [data.requirementID]);
                    await dbRun(`DELETE FROM requirementsStoryRef WHERE requirementsID = ?`, [data.requirementID]);
                    await dbRun(deleteSQL, [data.requirementID, projectID]);
                    break;
            }
        }
        return true;
    } catch (error) {
        console.error("Error updating requirements:", error);
        throw error;
    }
}

async function updateProjectUserStories(projectID, jsonList){
    const updateSQL = `UPDATE userStories SET storySeq = ?, storyRole = ?, storyTitle = ?, storyContent = ?, storySource = ? WHERE storyID = ? AND projectID = ?`;
    const insertSQL = `INSERT INTO userStories (storyID, projectID, storySeq, storyRole, storyTitle, storyContent, storySource) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const deleteSQL = `DELETE FROM userStories WHERE storyID = ? AND projectID = ?`;
    const getMaxSeqSQL = `SELECT COALESCE(MAX(storySeq), 0) as maxSeq FROM userStories WHERE projectID = ?`;

    try {
        for (let data of jsonList) {
            switch (data.operation) {
                case 'UPDATE':
                    await dbRun(updateSQL, [
                        data.storySeq,
                        data.details.role,
                        data.details.title,
                        data.details.description,
                        data.details.source,
                        data.storyID,
                        projectID
                    ]);
                    break;

                case 'INSERT':
                    let storySeq = data.storySeq;

                    if (storySeq === null || storySeq === undefined) {
                        const result = await dbGet(getMaxSeqSQL, [projectID]);
                        storySeq = result.maxSeq + 1;
                    }

                    await dbRun(insertSQL, [
                        uuid(),
                        projectID,
                        storySeq,
                        data.details.role,
                        data.details.title,
                        data.details.description,
                        data.details.source
                    ]);
                    break;

                case 'DELETE':
                    await dbRun(deleteSQL, [data.storyID, projectID]);
                    break;
            }
        }
        return true;
    } catch (error) {
        console.error("Error updating project user stories:", error);
        throw error;
    }
}

async function updateProjectRequirementSourceRef(jsonList){
    const updateSQL = `UPDATE requirementsSource SET remarks = ?, location = ? WHERE requirementsID = ? AND projectID = ? AND documentID = ?`
    const insertSQL = `INSERT INTO requirementsSource (refID, requirementsID, projectID, documentID, remarks, location) VALUES (?, ?, ?, ?, ?, ?)`
    const deleteSQL = `DELETE FROM requirementsSource WHERE requirementsID = ? AND projectID = ? AND documentID = ?`

    try {
        // Loop through each item in jsonList
        for (const data of jsonList) {
            const { projectID, requirementID, sourceReference } = data;

            for (const ref of sourceReference) {
                const { operation, documentID, remarks, location } = ref;

                switch (operation) {
                    case 'UPDATE':
                        await dbRun(updateSQL, [remarks, location, requirementID, projectID, documentID]);
                        break;

                    case 'INSERT':
                        const refID = uuid();
                        await dbRun(insertSQL, [refID, requirementID, projectID, documentID, remarks, location]);
                        break;

                    case 'DELETE':
                        await dbRun(deleteSQL, [requirementID, projectID, documentID]);
                        break;
                }
            }
        }

        return true;

    } catch (error) {
        console.error("Error in updateProjectRequirementSourceRef:", error);
        throw error;
    }
}

async function updateUserStorySourceRef(jsonList){
    const updateSQL = `UPDATE userStorySource SET remarks = ?, location = ? WHERE storyID = ? AND projectID = ? AND documentID = ?`
    const insertSQL = `INSERT INTO userStorySource (refID, storyID, projectID, documentID, remarks, location) VALUES (?, ?, ?, ?, ?, ?)`
    const deleteSQL = `DELETE FROM userStorySource WHERE storyID = ? AND projectID = ? AND documentID = ?`

    try {
        // Loop through each item in jsonList
        for (const data of jsonList) {
            const { projectID, storyID, sourceReference } = data;

            for (const ref of sourceReference) {
                const { operation, documentID, remarks, location } = ref;

                switch (operation) {
                    case 'UPDATE':
                        await dbRun(updateSQL, [remarks, location, storyID, projectID, documentID]);
                        break;

                    case 'INSERT':
                        const refID = uuid();
                        await dbRun(insertSQL, [refID, storyID, projectID, documentID, remarks, location]);
                        break;

                    case 'DELETE':
                        await dbRun(deleteSQL, [storyID, projectID, documentID]);
                        break;
                }
            }
        }

        return true;

    } catch (error) {
        console.error("Error in updateUserStorySourceRef:", error);
        throw error;
    }
}

async function getProjectUserStories(projectID) {
    const sql = `SELECT * FROM userStories WHERE projectID = ?`
    return await dbAll(sql, [projectID]);
}

async function updateProjectRequirementStoryRef(jsonList){
    const insertSQL = `INSERT INTO requirementsStoryRef (refID, requirementsID, projectID, storyID) VALUES (?, ?, ?, ?)`
    const deleteSQL = `DELETE FROM requirementsStoryRef WHERE requirementsID = ? AND projectID = ? AND storyID = ?`

    try {
        // Loop through each item in jsonList
        for (const data of jsonList) {
            const { projectID, requirementID, sourceReference } = data;

            // Process each source reference operation
            for (const ref of sourceReference) {
                const { operation, storyID } = ref;

                switch (operation) {
                    case 'INSERT':
                        const refID = uuid();
                        await dbRun(insertSQL, [refID, requirementID, projectID, storyID]);
                        break;

                    case 'DELETE':
                        await dbRun(deleteSQL, [requirementID, projectID, storyID]);
                        break;
                }
            }
        }

        return true;

    } catch (error) {
        console.error("Error in updateProjectRequirementStoryRef:", error);
        throw error;
    }
}

async function getUserStoriesSource(storyID){
    const sql = `
        SELECT d.documentID, d.documentName, d.documentExt
        FROM userStorySource uss
        JOIN documents d ON uss.documentID = d.documentID
        WHERE uss.storyID = ?
    `;

    return await dbAll(sql, [storyID]);
}

async function searchChatHistory(projectID, chatID, keyword){
    const sql = `
        SELECT chatSeq, conversationMessage
        FROM conversation con
        JOIN chat ch ON con.chatID = ch.chatID
        WHERE ch.projectID = ? AND con.chatID = ? AND conversationMessage like ?
    `;

    return await dbAll(sql, [projectID, chatID, `%${keyword}%`]);
}

module.exports = {
    conversationEdit,
    createNewChatThread,
    renameChatThread,
    deleteChatThread,
    deleteConversation,
    getProjectRequirements,
    getRequirementsSource,
    getProjectUserStories,
    getUserStoriesSource,
    saveConversationRequest,
    saveConversationRequestRef,
    saveConversationResponse,
    searchChatHistory,
    updateRequirements,
    updateProjectUserStories,
    updateProjectRequirementSourceRef,
    updateProjectRequirementStoryRef,
    updateUserStorySourceRef
}
