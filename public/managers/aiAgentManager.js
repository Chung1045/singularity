const credDBService = require("../services/credentialDBService");
const uuid = require("uuid-v4");
const dbService = require("../services/accountDBService");
const projectDBService = require("../services/projectDBService");
const express = require('express');
const {json} = require("express");
const router = express.Router();
const aiDB = require("../services/aiAgentDBService")
const agent = require("../services/aiAgentService")


// TODO: Implement queue and rate limit feature
router.post('/agent/chat', async (req, res) => {
    try{
        console.log("New requests /agent/chat")

        if (!req.cookies.session_id) {
            console.log("❌ Unauthorized attempt for agent chat");
            return res.status(403).json({ successful: false, message: "Unauthorized" });
        }

        const userID = await dbService.findUserIDBySessionID(req.cookies.session_id);

        let chatData = req.body;
        const projectID = chatData.projectID;
        let chatID = chatData.chatID;
        const requestMessage = chatData.message;
        const attachedDocumentIDs = chatData.attachedDocumentIDs;

        if (!projectID || !requestMessage || !attachedDocumentIDs) {
            return res.status(400).json({success: false, message: `Missing required fields`})
        }

        if (!chatID) {
            try {
                chatID = await aiDB.createNewChatThread(projectID)
            } catch (error) {
                console.error(`Unable to create chat thread: ${error}`)
                return res.status(500).json({success: false, message: `Internal server error, unable to create new chat thread.`})
            }
        }

        console.log(chatData)

        const data = {
            projectID: projectID,
            chatID: chatID,
            requestMessage: requestMessage,
            attachedDocumentIDs: attachedDocumentIDs
        };

        // TODO: Implement chat history fetch function
        let conversationHistory = []
        let response = ""

        try {
            response = await agent.getResponse(data, conversationHistory)
        } catch (error) {
            console.error(`Unable to generate response: ${error}`)
            return res.status(500).json({success: false, message: `Internal server error, unable to generate response.`})
        }

        try {
            let {conversationID, chatSeq} = await aiDB.saveConversationRequest(data);

            if (attachedDocumentIDs && attachedDocumentIDs.length > 0) {
                await aiDB.saveConversationRequestRef(data, conversationID, chatSeq);
            }

            await aiDB.saveConversationResponse(chatSeq, conversationID, chatID, response.content);
            return res.status(200).json({ success: true, conversationID: conversationID, chatSeq: chatSeq, response: response.content });
        } catch (error) {
            console.error(`Unable to save message: ${error}`);
            return res.status(500).json({ success: false, message: `Internal server error, unable to save message.` });
        }

    } catch (error){
        console.log(error)
        return res.status(500).json({success: false, message: `Server Returned Error: ${error}`})
    }

});

module.exports = router;
