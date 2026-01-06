const { xai } = require('@ai-sdk/xai');
const { OpenAI } = require('openai');
const fs = require('fs')
const {tools, toolImpls} = require("./aiAgentToolsService")
const aiDB = require("./aiAgentDBService");

const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

const system_prompt = `
    You are an assistant for the software engineering project,
    you will be working on text files / word documents / transcribed audio to summarize all the functional and non functional requirements,
    as well as summarizing the user stories and identify the possible user role of the user stories.
      
    You will need to link the reference of the documentID and the location of where the user story or requirements identified,
    you will also need to specify whether the requirement or user story were summarized from the document as "Document",
    or "User Input" if the user request to add / modify the software requirements or user stories.
    
    You will have access to tools for operations like getting the document list with documentID in the project,
    getting the contents of the documents, searching for chat history with keyword,
    getting the data structure for software requirements / user stories,
    as well as reading and editing the software requirements / user stories. Only call the tools when needed.
    If tools keep failing, stop the tool after 3 attempts.
    To insert / delete linkage to the user story for each requirements, the user story must be exist first before performing the action.
    
    You will also be supply with the summary of what is going on with the current chat each time the user interacts with you.
    Do not answer any questions that is not related to the project or not related to software engineering.
    Do not disclose the chatID, conversationID, the documentID, requirementsID, user story ID, projectID in the chat response message. 
`

async function getResponse(data, conversationSummary) {
    try {
        const messages = [
            {role: 'system', content: system_prompt},
            {role: 'system', content: `You are now working with projectID: ${data.projectID} and chatID: ${data.chatID}`},
            {role: 'system', content: `Summary of what the chat have gone so far: ${conversationSummary}`},
            {role: 'user', content: data.requestMessage},
            {role: 'system', content: `User have attached these document ID: ${data.attachedDocumentIDs}`}
        ];

        let completion = await client.chat.completions.create({
            model: 'grok-4-1-fast-non-reasoning',
            messages: messages,
            tools: tools,  // Pass your tools here
            tool_choice: "auto",  // Let the AI decide when to use tools
            temperature: 0.7,
            max_tokens: 1500,
        });

        let responseMessage = completion.choices[0].message;

        // Handle tool calls if the AI wants to use them
        while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            // Add assistant's message with tool calls to history
            messages.push(responseMessage);

            // Execute each tool call
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`AI is calling tool: ${functionName} with args:`, functionArgs);

                // Execute the tool
                const toolImpl = toolImpls[functionName];
                let functionResponse;

                if (toolImpl) {
                    try {
                        functionResponse = await toolImpl(...Object.values(functionArgs));
                    } catch (error) {
                        functionResponse = {error: error.message};
                    }
                } else {
                    functionResponse = {error: `Unknown function: ${functionName}`};
                }

                // Add tool response to messages
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(functionResponse),
                });
            }

            // Get AI's next response with tool results
            completion = await client.chat.completions.create({
                model: 'grok-4',
                messages: messages,
                tools: tools,
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 1500,
            });

            responseMessage = completion.choices[0].message;
        }

        console.log('Message Respond: ' + responseMessage.content);
        return responseMessage.content;
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        throw error;
    }
}

async function getChatSummary(conversationHistory) {

    if (conversationHistory == null) {
        return
    }

    try {
        const messages = [
            { role: 'system', content: system_prompt },
            {
                role: 'user',
                content:
                    'Analyze the following chat history and summarize the chat between the user and the AI agent in two small paragraphs:\n\n' +
                    conversationHistory,
            },
        ];

        const completion = await client.chat.completions.create({
            model: 'grok-4-1-fast-non-reasoning',
            messages,
            temperature: 0.2,
            max_tokens: 1500,
        });

        const responseMessage = completion.choices[0].message;
        console.log('Message Respond: ' + responseMessage.content);
        return responseMessage.content;
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        throw error;
    }
}

function readFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
    } catch (error) {
        // Try with different encoding if UTF-8 fails
        try {
            const content = fs.readFileSync(filePath, 'latin1');
            return content;
        } catch (err) {
            throw new Error(`Failed to read file: ${err.message}`);
        }
    }
}


async function test() {
    // const userInput = `
    //     Can you summarize all the functional and non-functional requirements of the Food Delivery app, with the name requirementsGathering.txt, then update to my software requirements and user stories?
    // `;
    //
    // const data = {
    //     projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
    //     chatID: "55d35d9e-85c1-4ea4-9b63-c9def448bda1",
    //     requestMessage: userInput,
    //     attachedDocumentIDs: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"]
    // };
    //
    // let response = await getResponse(data, [])
    //
    // let {conversationID, chatSeq} = await aiDB.saveConversationRequest(data);
    // console.log(`Data returned: conversationID: ${conversationID}, chatSeq: ${chatSeq}`);
    // console.log(`data to pass in: ${data}`)
    // if (data.attachedDocumentIDs && data.attachedDocumentIDs.length > 0) {
    //     await aiDB.saveConversationRequestRef(data, conversationID, chatSeq);
    // }
    //
    // await aiDB.saveConversationResponse(chatSeq, conversationID, response);
    //
    // console.log(await aiDB.getConversationRecall(data.projectID, data.chatID))

    // let result = await aiDB.fetchChatThread("a3548cc9-8756-424e-b05d-e11dc34be463", "55d35d9e-85c1-4ea4-9b63-c9def448bda1")
    // console.log(JSON.stringify(result));

    // const filePath = "../tests/sample-conversation-json.rtf";
    //
    // // Check if file exists
    // if (!fs.existsSync(filePath)) {
    //     console.error(`Error: File '${filePath}' not found.`);
    //     return;
    // }
    //
    // // Read the file
    // console.log("\nReading file...");
    // const chatContent = readFile(filePath);
    // console.log(`File read successfully! (${chatContent.length} characters)\n`);
    //
    // console.log(`Response: ${await getChatSummary(chatContent)} END___`)

}

test()

module.exports = {
    getResponse,
    getChatSummary
}


