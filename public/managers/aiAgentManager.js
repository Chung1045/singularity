const credDBService = require("../services/credentialDBService");
const uuid = require("uuid-v4");
const dbService = require("../services/accountDBService");
const projectDBService = require("../services/projectDBService");
const express = require('express');
const {json} = require("express");
const router = express.Router();
const aiDB = require("../services/aiAgentDBService");
const agent = require("../services/aiAgentService");
const {getProjectRequirements, getProjectUserStories} = require("../services/aiAgentDBService");
const docGen = require("../services/docGenerationService");

router.use(dbService.apiAuthUser);

/**
 * Chat API Request Body
 *
 * @param {string} projectID - UUID of the current project (required)
 * @param {string} [chatID] - UUID of existing chat thread (optional, omit or leave empty for new chat)
 * @param {string} message - User's message/question (required)
 * @param {string[]} attachedDocumentIDs - Array of document UUIDs to reference (required, can be empty array)
 *
 * @example
 * // New conversation
 * {
 *   "projectID": "550e8400-e29b-41d4-a716-446655440000",
 *   "message": "What does the document say about revenue?",
 *   "attachedDocumentIDs": ["f53db65b-2dd1-4293-85b6-a67fefec2951", "eec66346-d50f-4283-bda1-85443fab5c45"]
 * }
 *
 * @example
 * // Continue existing conversation
 * {
 *   "projectID": "550e8400-e29b-41d4-a716-446655440000",
 *   "chatID": "660e8400-e29b-41d4-a716-446655440000",
 *   "message": "Can you elaborate on that?",
 *   "attachedDocumentIDs": []
 * }
 */
// TODO: Implement queue and rate limit feature
router.post('/agent/chat', async (req, res) => {
    try {
        console.log("New requests /agent/chat")

        let chatData = req.body;
        const projectID = chatData.projectID;
        let chatID = chatData.chatID;
        const requestMessage = chatData.message;
        const attachedDocumentIDs = chatData.attachedDocumentIDs;

        if (!projectID || !requestMessage || !attachedDocumentIDs) {
            return res.status(400).json({success: false, message: `Missing required fields`})
        }

        if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
            return res.status(403).json({successful: false, message: "Unauthorized"});
        }

        if (!chatID) {
            try {
                chatID = await aiDB.createNewChatThread(projectID)
            } catch (error) {
                console.error(`Unable to create chat thread: ${error}`)
                return res.status(500).json({
                    success: false,
                    message: `Internal server error, unable to create new chat thread.`
                })
            }
        }

        console.log(chatData)

        const data = {
            projectID: projectID,
            chatID: chatID,
            requestMessage: requestMessage,
            attachedDocumentIDs: attachedDocumentIDs
        };

        let conversationSummary = ""
        let conversationHistory = JSON.stringify(await aiDB.fetchChatThread(projectID, chatID));
        console.log(`History: ${conversationHistory}`)
        let response = ""

        if (conversationHistory !== null && conversationHistory !== "null") {
            conversationSummary = await agent.getChatSummary(conversationHistory)
            console.log(`Memory: \n ${conversationSummary}`)
        }

        try {
            response = await agent.getResponse(data, conversationSummary)
        } catch (error) {
            console.error(`Unable to generate response: ${error}`)
            return res.status(500).json({
                success: false,
                message: `Internal server error, unable to generate response.`
            })
        }

        try {
            let {conversationID, chatSeq} = await aiDB.saveConversationRequest(data);

            if (attachedDocumentIDs && attachedDocumentIDs.length > 0) {
                await aiDB.saveConversationRequestRef(data, conversationID, chatSeq);
            }

            await aiDB.saveConversationResponse(chatSeq, conversationID, response);

            if (await aiDB.getChatThreadName(projectID, chatID) == null) {
                let threadName = await agent.createChatName(JSON.stringify(await aiDB.fetchChatThread(projectID, chatID)))
                await aiDB.renameChatThread(projectID, chatID, threadName)
            }

            return res.status(200).json({
                success: true,
                chatID: chatID,
                chatSeq: chatSeq,
                conversationID: conversationID,
                response: response
            });

        } catch (error) {
            console.error(`Unable to save message: ${error}`);
            return res.status(500).json({success: false, message: `Internal server error, unable to save message.`});
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }

});

/** Chat fetch Request Body
 *
 * @param {string} projectID - UUID of the current project (required)
 * @param {string} [chatID] - UUID of chat thread (required)
 *
 * Sample output:
 * {
 *      "chatID":"55d35d9e-85c1-4ea4-9b63-c9def448bda1",
 *      "projectID":"a3548cc9-8756-424e-b05d-e11dc34be463",
 *      "conversations":[
 *          {
 *          "conversationID":"df1301d8-e3dd-4f43-b6e1-c8ab8ca12d76",
 *          "chatSeq":1,
 *          "message":"\n            Can you summarize all the functional and non-functional requirements of the Food Delivery app, with the name requirementsGathering.txt, then update to my software requirements and user stories?\n        ",
 *          "attachedDocuments":["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
 *          "response":{
 *              "message":"Here is a sample result",
 *              "timestamp":"Sat Dec 27 2025 09:19:25 GMT+0800 (Hong Kong Standard Time)"}
 *          },
 *          ...
 *      ]
 * }
 */

router.post('/agent/chat-fetch', async (req, res) => {

    if (!req.cookies.session_id) {
        console.log("❌ Unauthorized attempt for agent chat fetch");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    let chatData = req.body;
    const projectID = chatData.projectID;
    let chatID = chatData.chatID;

    if (!projectID || !chatID) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let response = await aiDB.fetchChatThread(projectID, chatID)
        return res.status(200).json({success: true, response: JSON.stringify(response)})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `Internal server error, unable to fetch chat messages.` });
    }
});

/** Chat delete request body
 * @param {string} projectID - UUID of the current project (required)
 * @param {string} [chatID] - UUID of chat thread (required)
 */
router.post('/agent/chat-delete', async (req, res) => {

    if (!req.cookies.session_id) {
        console.log("❌ Unauthorized attempt for agent chat delete");
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    let data = req.body;
    const projectID = data.projectID;
    const chatID = data.chatID;

    if (!projectID || !chatID) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let success = await aiDB.deleteChatThread(projectID, chatID)

        if (success) {
            return res.status(200).json({success: true, message: "Chat have been deleted"})
        } else {
            return res.status(500).json({ success: false, message: `Internal server error, unable to delete chat.` });
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `Internal server error, unable to delete chat.` });
    }
})

/** Chat delete request body
 * @param {string} projectID - UUID of the current project (required)
 * @param {string} [chatID] - UUID of chat thread (required)
 * @param {string} [conversationID] - UUID of chat conversationID of the message (required)
 */
// TODO: Test functionality
router.post('/agent/conversation-delete', async(req, res) => {

    const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

    let data = req.body;
    const projectID = data.projectID;
    const chatID = data.chatID;
    const conversationID = data.conversationID;

    if (!projectID || !chatID || !conversationID) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let success = await aiDB.deleteConversation(chatID, conversationID)

        if (success) {
            return res.status(200).json({success: true, message: "Chat have been deleted"})
        } else {
            return res.status(500).json({ success: false, message: `Internal server error, unable to delete conversation message.` });
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `Internal server error, unable to delete conversation message.` });
    }
})

/**
 * Chat Conversation Edit API Request Body
 * Edits an existing conversation message, deletes all subsequent conversations,
 * and generates a new AI response based on the edited message.
 *
 * @param {string} projectID - UUID of the current project (required)
 * @param {string} chatID - UUID of existing chat thread (required)
 * @param {number} chatSeq - Sequence number of the conversation to edit (required)
 * @param {string} conversationID - UUID of the conversation to edit (required)
 * @param {string} message - New/edited user message (required)
 * @param {string[]} attachedDocumentIDs - Array of document UUIDs to reference (optional, can be empty array)
 *
 * @example
 * // Edit a conversation at sequence 3
 * {
 *   "projectID": "a3548cc9-8756-424e-b05d-e11dc34be463",
 *   "chatID": "14380bae-d14e-4928-be08-1e754edd9d8d",
 *   "chatSeq": 3,
 *   "conversationID": "397b3fe9-b928-4f80-bda6-8b88c8487d6e",
 *   "message": "Actually, can you explain the revenue breakdown in more detail?",
 *   "attachedDocumentIDs": ["f53db65b-2dd1-4293-85b6-a67fefec2951"]
 * }
 *
 * @returns {Object} Response object
 * @returns {boolean} response.success - Whether the operation succeeded
 * @returns {string} response.conversationID - ID of the edited conversation
 * @returns {number} response.chatSeq - Sequence number of the edited conversation
 * @returns {string} response.response - New AI-generated response
 *
 * @note This operation will:
 * 1. Update the conversation message at the specified chatSeq
 * 2. Delete all conversations after this chatSeq
 * 3. Delete all responses for the edited and subsequent conversations
 * 4. Generate a new AI response based on the edited message and conversation history
 */
router.post('/agent/conversation-edit', async(req, res) => {

    let chatData = req.body;
    const projectID = chatData.projectID;
    const chatID = chatData.chatID;
    const chatSeq = chatData.chatSeq;
    const conversationID = chatData.conversationID;
    const message = chatData.message;
    const attachedDocumentIDs = chatData.attachedDocumentIDs;

    if (!projectID || !chatID || !conversationID || !chatSeq || !message) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    if (!await projectDBService.isProjectCollaborator(projectID, userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let success = await aiDB.conversationEdit(chatID, chatSeq, conversationID, message)

        if (success) {
            const data = {
                projectID: projectID,
                chatID: chatID,
                requestMessage: message,
                attachedDocumentIDs: attachedDocumentIDs
            };

            let conversationSummary = ""
            let conversationHistory = JSON.stringify(await aiDB.fetchChatThread(projectID, chatID));
            console.log(`History: ${conversationHistory}`)

            if (conversationHistory !== null && conversationHistory !== "null") {
                conversationSummary = await agent.getChatSummary(conversationHistory)
                console.log(`Memory: \n ${conversationSummary}`)
            }

            let response = await agent.getResponse(data, conversationSummary)

            if (attachedDocumentIDs && attachedDocumentIDs.length > 0) {
                await aiDB.saveConversationRequestRef(data, conversationID, chatSeq);
            }

            await aiDB.saveConversationResponse(chatSeq, conversationID, chatID, response);
            return res.status(200).json({
                success: true,
                conversationID: conversationID,
                chatSeq: chatSeq,
                response: response
            });
        } else {
            return res.status(500).json({ success: false, message: `Internal server error, unable to complete edit conversation message procedure.` });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `Internal server error, unable to complete edit conversation message procedure.` });
    }
})

/** Generate user stories report
 * @param {string} projectID - UUID of the current project (required)
 */

router.post("/agent/document-generation/requirements", async (req, res) => {

    let data = req.body;
    let projectID = data.projectID;

    if (!projectID) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    if (!await projectDBService.isProjectCollaborator(projectID, req.userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    let requirementsData = await getProjectRequirements(projectID)
    console.log(`Requirement data : ${requirementsData}`)
    let result = await docGen.generateRequirementsDocument(projectID, requirementsData)

    if (result) {
        return res.status(200).json({ successful: true });
    } else {
        return res.status(500).json({ successful: false, message: "Error generating requirements document" });
    }

});

/** Generate user stories report
 * @param {string} projectID - UUID of the current project (required)
 */

router.post("/agent/document-generation/user-stories", async (req, res) => {

    let data = req.body;
    let projectID = data.projectID;

    if (projectID == null) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    if (!await projectDBService.isProjectCollaborator(projectID, req.userID)) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    let userStoriesData = await getProjectUserStories(projectID)
    console.log(`User stories data : ${JSON.stringify(userStoriesData)}`)
    let result = await docGen.generateUserStoriesDocument(projectID, userStoriesData)

    if (result) {
        return res.status(200).json({ successful: true });
    } else {
        return res.status(500).json({ successful: false, message: "Error generating user stories document" });
    }

});



module.exports = router;
