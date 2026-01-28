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
const {apiAuthUser} = require("../services/accountDBService");
const fss = require('../services/fsServices');

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
        const attachedDocumentIDs = chatData.attachedDocumentIDs || [];

        if (!projectID || !requestMessage) {
            return res.status(400).json({success: false, message: `Missing required fields: projectID and message are required`})
        }

        // Ensure attachedDocumentIDs is an array
        if (!Array.isArray(attachedDocumentIDs)) {
            return res.status(400).json({success: false, message: `attachedDocumentIDs must be an array`})
        }

        if (!await projectDBService.isProjectCollaborator(projectID, req.userID)) {
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

        // Check if client wants streaming
        const acceptHeader = req.headers.accept || '';
        const wantsStream = acceptHeader.includes('text/event-stream');

        if (wantsStream) {
            // Set up SSE headers for streaming
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            });

            let fullResponse = '';

            // Use legacy mode only if explicitly requested (default is 3-stage for reliable DB updates)
            const useLegacy = req.query.legacy === 'true' || req.body.legacy === true;

            try {
                // Send chatID immediately
                res.write(`data: ${JSON.stringify({ type: 'chatID', chatID: chatID })}\n\n`);

                // Default: Use 3-stage streaming for reliable database updates
                const streamGenerator = useLegacy
                    ? agent.getStreamingResponse(data, conversationSummary)
                    : agent.getStreamingResponseThreeStage(data, conversationSummary);

                // Stream the response
                for await (const chunk of streamGenerator) {
                    // Handle stage markers from 3-stage process (check trimmed content)
                    const trimmedChunk = chunk.trim();
                    if (!useLegacy && trimmedChunk.startsWith('<!--') && trimmedChunk.endsWith('-->')) {
                        // Log stage markers but don't send to client as content
                        console.log(`📊 Stage marker: ${trimmedChunk}`);

                        // Handle report generation events
                        if (trimmedChunk.includes('REPORT_GENERATED:')) {
                            try {
                                // Extract JSON - handle quotes and special characters
                                const startIdx = trimmedChunk.indexOf('{');
                                const endIdx = trimmedChunk.lastIndexOf('}');
                                if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                                    const jsonStr = trimmedChunk.substring(startIdx, endIdx + 1);
                                    console.log(`📊 Report generation marker found, JSON string:`, jsonStr);
                                    const reportInfo = JSON.parse(jsonStr);
                                    console.log(`📊 Parsed reportInfo:`, reportInfo);
                                    console.log(`📊 Sending reportGenerated event to client`);
                                    res.write(`data: ${JSON.stringify({ 
                                        type: 'reportGenerated', 
                                        reportType: reportInfo.type,
                                        projectID: reportInfo.projectID || projectID
                                    })}\n\n`);
                                } else {
                                    console.error('📊 Could not find JSON in REPORT_GENERATED marker:', trimmedChunk);
                                }
                            } catch (parseErr) {
                                console.error('Failed to parse report info:', parseErr);
                                console.error('Chunk was:', trimmedChunk);
                            }
                            continue;
                        }

                        // Send stage events to client for progress indication
                        if (trimmedChunk.includes('STAGE_1_START')) {
                            res.write(`data: ${JSON.stringify({ type: 'stage', stage: 1, status: 'start', message: 'Analyzing your request...' })}\n\n`);
                        } else if (trimmedChunk.includes('STAGE_1_COMPLETE')) {
                            res.write(`data: ${JSON.stringify({ type: 'stage', stage: 1, status: 'complete' })}\n\n`);
                        } else if (trimmedChunk.includes('STAGE_2_START')) {
                            res.write(`data: ${JSON.stringify({ type: 'stage', stage: 2, status: 'start', message: 'Updating database...' })}\n\n`);
                        } else if (trimmedChunk.includes('STAGE_2_COMPLETE')) {
                            // Stage 2 complete - database updated, tell client to refresh requirements
                            res.write(`data: ${JSON.stringify({ 
                                type: 'stage', 
                                stage: 2, 
                                status: 'complete',
                                refreshRequirements: true,
                                projectID: projectID
                            })}\n\n`);
                        } else if (trimmedChunk.includes('STAGE_3_START')) {
                            res.write(`data: ${JSON.stringify({ type: 'stage', stage: 3, status: 'start', message: 'Generating response...' })}\n\n`);
                        } else if (trimmedChunk.includes('STAGE_3_COMPLETE')) {
                            res.write(`data: ${JSON.stringify({ type: 'stage', stage: 3, status: 'complete' })}\n\n`);
                        }
                        continue;
                    }

                    fullResponse += chunk;
                    console.log(` Sending chunk (${chunk.length} chars):`, chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
                    res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
                }

                // Save to database
                let {conversationID, chatSeq} = await aiDB.saveConversationRequest(data);

                if (attachedDocumentIDs && attachedDocumentIDs.length > 0) {
                    await aiDB.saveConversationRequestRef(data, conversationID, chatSeq);
                }

                // Save the complete streamed response
                await aiDB.saveConversationResponse(chatSeq, conversationID, fullResponse);

                // Generate thread name if it doesn't exist
                let threadName = await aiDB.getChatThreadName(projectID, chatID);
                if (threadName == null) {
                    threadName = await agent.createChatName(JSON.stringify(await aiDB.fetchChatThread(projectID, chatID)));
                    await aiDB.renameChatThread(projectID, chatID, threadName);
                    console.log(' Generated thread name:', threadName);
                }

                // Send completion event with threadName
                res.write(`data: ${JSON.stringify({ 
                    type: 'done', 
                    chatSeq: chatSeq,
                    conversationID: conversationID,
                    threadName: threadName || 'Untitled Chat',
                    refreshReports: true,
                    projectID: projectID
                })}\n\n`);
                res.end();

            } catch (error) {
                console.error(` Streaming error in /agent/chat:`, error);
                console.error(`Error stack:`, error.stack);
                console.error(`Error details - projectID: ${projectID}, chatID: ${chatID}`);

                let errorMessage = error.message || 'Stream failed';
                let userFriendlyMessage = errorMessage;

                // Provide user-friendly messages for specific error types
                if (errorMessage.includes('SAFETY_CHECK') || errorMessage.includes('content') && errorMessage.includes('violates')) {
                    userFriendlyMessage = 'The AI provider\'s content filter flagged this request. This can happen with certain document types (medical, biological topics, etc.). Try rephrasing your request or analyzing specific sections.';
                } else if (errorMessage.includes('403')) {
                    userFriendlyMessage = 'Access was denied by the AI provider. Please try again with a different request.';
                } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
                    userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
                }

                res.write(`data: ${JSON.stringify({ type: 'error', message: userFriendlyMessage })}\n\n`);
                res.end();
            }
        } else {
            // Regular non-streaming response
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
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }

});

// Get a complete chat thread with all conversations
router.get('/agent/chat/thread/:chatID', async (req, res) => {
    try {
        const chatID = req.params.chatID;

        if (!chatID) {
            return res.status(400).json({
                success: false,
                message: 'Missing chatID'
            });
        }

        console.log('Fetching chat thread for chatID:', chatID);

        // Get the chat thread data - fetchChatThread returns an object with conversations array
        const chatThreadData = await aiDB.fetchChatThread(null, chatID);

        console.log('chatThreadData type:', typeof chatThreadData);
        console.log('chatThreadData:', JSON.stringify(chatThreadData, null, 2));
        console.log(`✅ Chat ${chatID} belongs to project: ${chatThreadData?.projectID}`);

        if (!chatThreadData) {
            console.log('No chat thread data returned');
            return res.status(200).json({
                success: true,
                chatID: chatID,
                projectID: null,  //  Include projectID even if null
                conversations: []
            });
        }

        if (!chatThreadData.conversations) {
            console.log('chatThreadData.conversations is missing');
            return res.status(200).json({
                success: true,
                chatID: chatID,
                projectID: chatThreadData.projectID || null,  //  Include projectID
                conversations: []
            });
        }

        if (chatThreadData.conversations.length === 0) {
            console.log('No conversations in thread');
            return res.status(200).json({
                success: true,
                chatID: chatID,
                projectID: chatThreadData.projectID || null,  //  Include projectID
                conversations: []
            });
        }

        console.log('Number of conversations:', chatThreadData.conversations.length);

        // Format the data for the frontend
        const conversations = chatThreadData.conversations.map(conv => ({
            conversationID: conv.conversationID,
            chatSeq: conv.chatSeq,
            conversationMessage: conv.message,
            responseMessage: conv.response ? conv.response.message : null,
            responseTimeDate: conv.response ? conv.response.timestamp : null,
            documentIDs: conv.attachedDocuments || []
        }));

        console.log('Formatted conversations:', conversations.length);

        return res.status(200).json({
            success: true,
            chatID: chatID,
            projectID: chatThreadData.projectID,  //  Include projectID
            conversations: conversations
        });

    } catch (error) {
        console.error('Error fetching chat thread:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/agent/chat/stream', async (req, res) => {
    let chatData = req.body;
    const requestMessage = chatData.message;

    const data = {
        requestMessage: requestMessage,
    };

    if (!requestMessage){
        return res.status(500).json({message: "Missing field"})
    }

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
        // Collect full response for DB save while streaming
        let fullResponse = '';

        // Stream chunks and accumulate full content
        for await (const chunk of agent.getStreamingResponse(data)) {
            fullResponse += chunk;
            res.write(`data: ${chunk}\n\n`); // SSE format
        }

        res.write('data: [DONE]\n\n'); // Signal stream end

    } catch (error) {
        console.error(`Streaming error: ${error}`);
        res.write(`data: ${JSON.stringify({error: 'Stream failed'})}\n\n`);
        res.end();
    }
});


router.post('/agent/all-chat', async (req, res) => {

    const { projectID } = req.body;

    console.log("all-chat request - projectID:", projectID, "userID:", req.userID);

    if (!projectID) {
        return res.status(400).json({success: false, message: `Missing required fields`})
    }

    const isCollaborator = await projectDBService.isProjectCollaborator(projectID, req.userID);
    console.log("isProjectCollaborator result:", isCollaborator);

    if (!isCollaborator) {
        return res.status(403).json({ successful: false, message: "Unauthorized" });
    }

    try {
        let response = await aiDB.fetchProjectChats(projectID)
        return res.status(200).json({success: true, chats: response})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `Internal server error, unable to fetch all chat.` });
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
        console.log(" Unauthorized attempt for agent chat fetch");
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
    const userID = req.userID; // Get userID from auth middleware

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

            await aiDB.saveConversationResponse(chatSeq, conversationID, response);
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

/**
 * Document Analysis API - Analyze documents using requirementAnalysisModel
 *
 * @param {string} projectID - UUID of the current project (required)
 * @param {string[]} documentIDs - Array of document UUIDs to analyze (required)
 * @param {string} title - Project title for context (required)
 *
 * @example
 * {
 *   "projectID": "550e8400-e29b-41d4-a716-446655440000",
 *   "documentIDs": ["f53db65b-2dd1-4293-85b6-a67fefec2951"],
 *   "title": "E-Commerce Platform Requirements"
 * }
 */
router.post('/agent/analyze-documents', async (req, res) => {
    try {
        console.log("New request /agent/analyze-documents");

        const { projectID, documentIDs, title } = req.body;

        // Validate required fields
        if (!projectID || !documentIDs || !Array.isArray(documentIDs) || documentIDs.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: projectID and documentIDs array are required'
            });
        }

        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: title is required for analysis context'
            });
        }

        // Check authorization
        if (!await projectDBService.isProjectCollaborator(projectID, req.userID)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        console.log(`Analyzing ${documentIDs.length} document(s) for project ${projectID}`);
        console.log(`Project title: ${title}`);

        // Get document contents
        let analyzedDocument = [];

        for (const docID of documentIDs) {
            try {
                console.log(`  Reading document: ${docID}`);
                const docData = await fss.getFileContext(projectID, docID);
                const analysisResult = await agent.requirementAnalysisModel(docData, title);
                const fileMeta = await fss.getFileMetadata(docID, projectID);
                const documentName = fileMeta.documentName;
                if (analysisResult.trim() == "null"){
                    console.log(`Document ${docID} doesn't match the document ${title}`);
                    analyzedDocument.push(`Document ${documentName} doesn't match the document ${title}`);
                    continue;
                }
                analyzedDocument.push(analysisResult);

                // Need to jsonify the document and send back to minio server
                const analyzedDocumentJSON = await agent.parseRequirementsToJSON(docID, analysisResult);
                await aiDB.updateRequirements(projectID, analyzedDocumentJSON);
            } catch (error) {
                console.error(`  Error reading document ${docID}:`, error.message);
            }
        }

        return res.status(200).json({
            success: true,
            analysis: analyzedDocument,
            documentsAnalyzed: documentIDs.length
        });

    } catch (error) {
        console.error('Error in /agent/analyze-documents:', error);
        return res.status(500).json({
            success: false,
            message: `Server error: ${error.message}`
        });
    }
});

// Get a complete chat thread with all conversations

module.exports = router;
