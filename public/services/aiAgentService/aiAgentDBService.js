const db = require("../db")
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
        null  // Set to null so that automatic naming triggers after first response
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
    const param = [newChatThreadName, chatID, projectID]

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

async function getChatThreadName(projectID, chatID) {
    const sql = `SELECT threadName FROM chat WHERE projectID = ? AND chatID = ?`
    const param = [projectID, chatID]

    return new Promise((resolve, reject) => {
        db.get(sql, param, (err, row) => {
            if (err) {
                console.error('Error in getChatThreadName:', err);
                return reject(err);
            }
            if (!row) {
                console.log('No chat thread found for projectID:', projectID, 'chatID:', chatID);
                return resolve(null);
            }
            console.log('Result:', row);
            resolve(row.threadName);
        });
    });
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
            (conversationID, chatSeq, chatID, conversationMessage, conversationTimeDate)
        VALUES (?, ?, ?, ?, ?)
    `;

    let conversationID = uuid();
    // Use timestamp from client if provided, otherwise create new one
    const conversationTimestamp = data.conversationTimeDate || new Date().toISOString();

    console.log('[DB saveConversationRequest] ===================================');
    console.log('[DB saveConversationRequest] data.conversationTimeDate from client:', data.conversationTimeDate);
    console.log('[DB saveConversationRequest] conversationTimestamp to save:', conversationTimestamp);
    console.log('[DB saveConversationRequest] conversationID:', conversationID, 'chatSeq:', nextSeq);
    console.log('[DB saveConversationRequest] timestamp source:', data.conversationTimeDate ? 'CLIENT DATE Correct' : 'SERVER (WRONG!)');

    await dbRun(sql, [conversationID, nextSeq, chatID, data.requestMessage, conversationTimestamp]);

    console.log('[DB saveConversationRequest] User message saved successfully with timestamp:', conversationTimestamp);
    console.log('[DB saveConversationRequest] ===================================');
    return { chatID: chatID, conversationID: conversationID, chatSeq: nextSeq, conversationTimeDate: conversationTimestamp };
}

async function saveConversationRequestRef(data, conversationID, conversationSeq) {
    const sql = `
        INSERT OR REPLACE INTO conversationDocRef
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

    // Store timestamp in ISO format and return it
    const responseTimestamp = new Date().toISOString();
    const params = [uuid(), 1, conversationID, chatSeq, responseMessage, responseTimestamp, 1];

    try {
        await dbRun(sql, params);
        console.log('[DB] Saved AI response with timestamp:', responseTimestamp);
        return { success: true, timestamp: responseTimestamp };
    } catch (error) {
        throw error;
    }
}

async function deleteConversation(chatID, conversationID) {
    const sql = `DELETE FROM conversation WHERE conversationID = ? AND chatID = ?`;
    const params = [conversationID, chatID];

    try {
        await dbRun(sql, params);
        return true;
    } catch (error) {
        throw error;
    }
}

async function conversationEdit(chatID, chatSeq, conversationID, newConversationRequest, conversationTimeDate = null) {
    // Update conversation message and optionally the timestamp
    const sql = conversationTimeDate
        ? `UPDATE conversation SET conversationMessage = ?, conversationTimeDate = ? WHERE conversationID = ?`
        : `UPDATE conversation SET conversationMessage = ? WHERE conversationID = ?`;
    const sql2 = `DELETE FROM conversation WHERE chatID = ? AND chatSeq > ?`
    const sql3 = `DELETE FROM response WHERE conversationID = ?`

    try {
        if (conversationTimeDate) {
            console.log('[DB] Updating conversation with new timestamp:', conversationTimeDate);
            await dbRun(sql, [newConversationRequest, conversationTimeDate, conversationID]);
        } else {
            await dbRun(sql, [newConversationRequest, conversationID]);
        }
        await dbRun(sql2, [chatID, chatSeq])
        await dbRun(sql3, [conversationID])
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Fetches all chatID and chat threadName in the project
 * @param {string} projectID - UUID of the project
 * @returns {Promise<Array<{chatID: string, threadName: string}>>} Array of chat objects with chatID and threadName
 */
async function fetchProjectChats(projectID) {
    console.log("Db fetchProjects is triggered")
    const sql = `SELECT chatID, projectID, threadName FROM chat WHERE projectID = ?`
    const param = [projectID]

    return new Promise((resolve, reject) => {
        db.all(sql, param, (err, rows) => {
            if (err) {
                console.error('Error in fetchProjectChats:', err);
                return reject(err);
            }
            if (!rows || rows.length === 0) {
                console.log('No chats found for projectID:', projectID);
                return resolve([]);
            }
            console.log('Chats found:', rows);
            // rows now include chatID, projectID, and threadName
            resolve(rows);
        });
    });
}

/**
 * Fetches complete chat thread with all conversations, responses, and document references
 * @param {string} projectID - UUID of the project (optional, will be fetched from DB if not provided)
 * @param {string} chatID - UUID of the chat thread
 * @returns {Promise<Object>} Chat thread data with nested conversations and projectID
 */
async function fetchChatThread(projectID, chatID) {
    // First, get the projectID from the chat table if not provided
    const chatInfoSql = `SELECT projectID FROM chat WHERE chatID = ?`;

    return new Promise((resolve, reject) => {
        db.get(chatInfoSql, [chatID], (err, chatInfo) => {
            if (err) {
                console.error(`Error fetching chat info: ${err}`);
                reject(err);
                return;
            }

            // Use the projectID from the database if found, otherwise use the parameter
            const actualProjectID = chatInfo ? chatInfo.projectID : projectID;

            // Now fetch the conversations
            const sql = `
                SELECT
                    c.conversationID,
                    c.chatSeq,
                    c.chatID,
                    c.conversationMessage,
                    c.conversationTimeDate,
                    GROUP_CONCAT(DISTINCT cdr.documentID) as documentIDs,
                    r.responseMessage,
                    r.responseTimeDate
                FROM conversation c
                         LEFT JOIN conversationDocRef cdr
                                   ON c.conversationID = cdr.conversationID
                                       AND c.chatSeq = cdr.conversationSeq
                         LEFT JOIN response r
                                   ON c.conversationID = r.conversationID
                                       AND c.chatSeq = r.conversationSeq
                                       AND r.isActive = 1
                WHERE c.chatID = ?
                GROUP BY c.conversationID, c.chatSeq
                ORDER BY c.chatSeq ASC
            `;

            db.all(sql, [chatID], (err, rows) => {
                if (err) {
                    console.error(`Error fetching chat thread: ${err}`);
                    reject(err);
                    return;
                }

                if (!Array.isArray(rows)) {
                    console.error('Expected rows to be an array, got:', typeof rows);
                    resolve({
                        chatID: chatID,
                        projectID: actualProjectID,
                        conversations: []
                    });
                    return;
                }

                // Transform flat rows into structured JSON
                const conversations = rows.map(row => {
                    console.log('[DB] Row from conversation table:');
                    console.log('  conversationID:', row.conversationID);
                    console.log('  chatSeq:', row.chatSeq);
                    console.log('  conversationMessage:', row.conversationMessage);
                    console.log('  conversationTimeDate:', row.conversationTimeDate);
                    console.log('  responseTimeDate:', row.responseTimeDate);

                    return {
                        conversationID: row.conversationID,
                        chatSeq: row.chatSeq,
                        message: row.conversationMessage,
                        timestamp: row.conversationTimeDate,
                        attachedDocuments: row.documentIDs ? row.documentIDs.split(',') : [],
                        response: row.responseMessage ? {
                            message: row.responseMessage,
                            timestamp: row.responseTimeDate
                        } : null
                    };
                });

                resolve({
                    chatID: chatID,
                    projectID: actualProjectID,
                    conversations: conversations
                });
            });
        });
    });
}

async function getProjectRequirements(projectID) {
    console.log(`[DB] getProjectRequirements called with projectID: ${projectID}`);
    const sql = `
        SELECT * FROM requirements
        WHERE projectID = ?
        ORDER BY requirementType ASC, requirementSeq ASC
    `;
    console.log(`[DB] Executing SQL: ${sql} with param: ${projectID}`);
    const rows = await dbAll(sql, [projectID]);
    console.log(`[DB] getProjectRequirements returned ${rows?.length || 0} rows`);

    return await Promise.all(
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

    // SQL for inserting source references
    const insertSourceSQL = `INSERT INTO requirementsSource (refID, requirementsID, projectID, documentID, remarks, location) VALUES (?, ?, ?, ?, ?, ?)`

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

                    // Also insert source references if provided
                    if (data.details.sourceReference && Array.isArray(data.details.sourceReference)) {
                        for (const srcRef of data.details.sourceReference) {
                            if (srcRef.documentID) {
                                const refID = uuid();
                                await dbRun(insertSourceSQL, [
                                    refID,
                                    requirementID,
                                    projectID,
                                    srcRef.documentID,
                                    srcRef.remarks || '',
                                    srcRef.location || ''
                                ]);
                                console.log(`📎 [DB] Linked source document ${srcRef.documentID} to requirement ${requirementID}`);
                            }
                        }
                    }
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

    // SQL for inserting source references
    const insertSourceSQL = `INSERT INTO userStorySource (refID, storyID, projectID, documentID, remarks, location) VALUES (?, ?, ?, ?, ?, ?)`;

    try {
        for (let data of jsonList) {
            switch (data.operation) {
                // case 'UPDATE':
                //     await dbRun(updateSQL, [
                //         data.storySeq,
                //         data.details.role,
                //         data.details.title,
                //         data.details.description,
                //         data.details.source,
                //         data.storyID,
                //         projectID
                //     ]);
                //     break;

                case 'INSERT':
                    let storySeq = data.storySeq;

                    if (storySeq === null || storySeq === undefined) {
                        const result = await dbGet(getMaxSeqSQL, [projectID]);
                        storySeq = result.maxSeq + 1;
                    }

                    // Generate storyID for the new story
                    const newStoryID = uuid();

                    await dbRun(insertSQL, [
                        newStoryID,
                        projectID,
                        storySeq,
                        data.details.role,
                        data.details.title,
                        data.details.description,
                        data.details.source
                    ]);

                    // Also insert source references if provided
                    if (data.details.sourceReference && Array.isArray(data.details.sourceReference)) {
                        for (const srcRef of data.details.sourceReference) {
                            if (srcRef.documentID) {
                                const refID = uuid();
                                await dbRun(insertSourceSQL, [
                                    refID,
                                    newStoryID,
                                    projectID,
                                    srcRef.documentID,
                                    srcRef.remarks || '',
                                    srcRef.location || ''
                                ]);
                                console.log(`📎 [DB] Linked source document ${srcRef.documentID} to user story ${newStoryID}`);
                            }
                        }
                    }
                    break;

                case 'DELETE':
                    // Also delete associated source references
                    await dbRun(`DELETE FROM userStorySource WHERE storyID = ? AND projectID = ?`, [data.storyID, projectID]);
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
    const sql = `SELECT * FROM userStories WHERE projectID = ? ORDER BY storySeq ASC`
    const rows = await dbAll(sql, [projectID]);

    return await Promise.all(
        rows.map(async (story) => {
            const sources = await getUserStoriesSource(story.storyID)
            return {
                storyID: story.storyID,
                details: {
                    storySeq: story.storySeq,
                    title: story.storyTitle,
                    description: story.storyContent,
                    role: story.storyRole,
                    sourceReference: sources.map(src => ({
                        documentID: src.documentID,
                        documentName: src.documentName,
                        remarks: src.remarks,
                        location: src.location || ""
                    })),
                }
            }
        })
    );
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

async function getStoryTitle(storyID, projectID) {
    const sql = `
        SELECT storyTitle, storySeq
        FROM userStories
        WHERE storyID = ? AND projectID = ?
    `;

    return new Promise((resolve, reject) => {
        console.log(`Passed in value ${storyID}, ${projectID}`);
        db.get(sql, [storyID, projectID], (err, row) => {
            if (err) {
                console.error('Error in getStoryTitle:', err);
                return reject(err);
            }
            console.log('Result:', row);
            resolve(row);
        });
    });
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

async function deleteRequirement(requirementID, projectID){

    try {
        console.log(`Attempting to delete requirement ${requirementID} in project ${projectID}`)
        const deleteSQL = `DELETE FROM requirements WHERE requirementsID = ? AND projectID = ?`;
        await dbRun(`DELETE FROM requirementsSource WHERE requirementsID = ? AND projectID = ?`, [requirementID, projectID]);
        await dbRun(deleteSQL, [requirementID, projectID]);
        console.log("Successfully deleted requirement")
        await reorderRequirements(projectID)
        console.log("Requirements re-ordered")
        return true;
    } catch (err) {
        console.error(`Unable to delete a requirement: ${err.message}`)
        return false
    }

}

async function deleteUserStory(storyID, projectID){

    try {
        console.log(`Attempting to delete user story ${storyID} in project ${projectID}`)
        const deleteSQL = `DELETE FROM userStories WHERE storyID = ? AND projectID = ?`;
        await dbRun(`DELETE FROM userStorySource WHERE storyID = ? AND projectID = ?`, [storyID, projectID]);
        await dbRun(deleteSQL, [storyID, projectID]);
        console.log("Successfully deleted requirement")
        await reorderUserStories(projectID)
        console.log("User stories re-ordered")
        return true;
    } catch (err) {
        console.error(`Unable to delete a user story: ${err.message}`)
        return false
    }

}


async function reorderRequirements(projectID) {
    try {

        let nonFunctionalRequirements = await dbAll(`SELECT *
                                                     FROM requirements
                                                     WHERE projectID = ?
                                                       AND requirementType = 'non-functional'`, [projectID])
        let functionalRequirements = await dbAll(`SELECT *
                                                  FROM requirements
                                                  WHERE projectID = ?
                                                    AND requirementType = 'functional'`, [projectID])

        console.log(nonFunctionalRequirements)
        console.log(functionalRequirements)

        for (let seq = 1; seq <= nonFunctionalRequirements.length; seq++) {
            await dbRun(`UPDATE requirements
                         SET requirementSeq = ?
                         WHERE requirementsID = ?
                           AND requirementType = 'non-functional'`, [seq, nonFunctionalRequirements[seq - 1].requirementsID])
        }

        for (let seq = 0; seq < functionalRequirements.length; seq++) {
            await dbRun(`UPDATE requirements
                         SET requirementSeq = ?
                         WHERE requirementsID = ?
                           AND requirementType = 'functional'`, [seq, functionalRequirements[seq - 1].requirementsID])
        }

        return true

    } catch (err) {
        console.error(`Unable to reorder requirements for project ${projectID}:`)
        return false
    }
}

async function reorderUserStories(projectID) {
    try {

        let userStories = await dbAll(`SELECT *
                                       FROM userStories
                                       WHERE projectID = ?`, [projectID])

        console.log(userStories)

        for (let seq = 1; seq <= userStories.length; seq++) {
            await dbRun(`UPDATE userStories
                         SET storySeq = ?
                         WHERE storyID = ?`, [seq, userStories[seq - 1].storyID])
        }
        return true
    } catch (err) {
        console.error(`Unable to reorder user stories for project ${projectID}:`)
        return false
    }
}

async function exportChat(chatID, projectID){

    try {
        let chatThread = await fetchChatThread(projectID, chatID);
        console.log(chatThread)

        let conversations = chatThread.conversations;
        let content = ""


    } catch (err) {

    }


}

// can it be removed or to make it be dynamic?
exportChat("109565be-5e85-4977-ba6b-a22b6c5561b5", "e719a12c-6831-4feb-8e9d-23c3cdcd5837")

module.exports = {
    conversationEdit,
    createNewChatThread,
    renameChatThread,
    deleteChatThread,
    deleteConversation,
    deleteRequirement,
    deleteUserStory,
    fetchChatThread,
    fetchProjectChats,
    getProjectRequirements,
    getRequirementsSource,
    getProjectUserStories,
    getUserStoriesSource,
    getStoryTitle,
    saveConversationRequest,
    saveConversationRequestRef,
    saveConversationResponse,
    searchChatHistory,
    updateRequirements,
    updateProjectUserStories,
    updateProjectRequirementSourceRef,
    updateProjectRequirementStoryRef,
    updateUserStorySourceRef,
    getChatThreadName
}
