const fs = require('fs')
const { OpenAI } = require('openai');
const {tools, toolImpls} = require("./aiAgentToolsService")
const aiDB = require("./aiAgentDBService");
const axios = require('axios');
const { groupMultipleFile } = require('./preprocessingService');

const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1'
});

const apiKey = process.env.XAI_API_KEY;
const model = "grok-4-fast-reasoning";

function requirementAnalysisPrompt(title) {
    return `
    You are an expert in software requirements specification and structured extraction.

    Analyze the attached text document completely.

    First, check if the document is related to the ${title} topic.

    If NOT related → output only this exact line and nothing else:
    null

    If related → extract ALL functional (if any) and non-functional (if any) requirements relevant to the topic.

    Output them in this strict order and format ONLY:

    1. ALL Functional Requirements first, sorted by Requirement ID ascending
    2. ALL Non-Functional Requirements second, sorted by Requirement ID ascending

    Use exact this format for each requirement (no extra spaces, no line breaks within a requirement):

    Title request: ${title}

    Functional Requirement 
    Role: [User/System/Other] 
    Requirement ID: [ID] 
    Requirement Title: [title]
    Requirement Description: [full description] 
    Citation: [source or reference in the text document] 

    Non-Functional Requirement 
    Role: [User/System/Other] 
    Requirement ID: [ID] 
    Requirement Title: [title]
    Requirement Description: [full description]
    Citation: [source or reference in the text document] 

    Strict rules:
    - Generate sequential IDs if missing
    - NO Acceptance Criteria field
    - Accuracy field must contain detailed, testable expectations
    - No extra text, headings, blank lines or markdown
    - Each requirement on its own single line
    - If none → output only: No relevant requirements found
    - If no citation available, ignore that requirement

    Start immediately.`;
}

// Get functional and non-functional requirement analysis output
async function requirementAnalysisModel(documentData, title) {
    const prompt = requirementAnalysisPrompt(title);
    try {
        const res = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: model,
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: documentData
                }
            ],
            temperature: 0.0
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data.choices[0].message.content;
    } catch (err) {
        console.error('analysisModel failed:', err.message);
    }
}


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
        // Validate API key before making requests
        if (!process.env.XAI_API_KEY) {
            const errorMsg = 'XAI_API_KEY is not configured. Please set the environment variable and restart the server.';
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }

        // Build file context message if files are attached
        let fileContextMessage = '';
        if (data.attachedDocumentIDs && data.attachedDocumentIDs.length > 0) {
            console.log(`📎 [Non-streaming] Processing ${data.attachedDocumentIDs.length} attached file(s)...`);

            // Fetch file metadata from database
            const fss = require('./fsServices');
            try {
                console.log('📂 Fetching project files for projectID:', data.projectID);
                const allFiles = await fss.listProjectFiles(data.projectID);
                console.log(`📂 Found ${allFiles?.length || 0} total files in project`);

                // Safety check for null/undefined
                if (!allFiles || !Array.isArray(allFiles)) {
                    console.warn('⚠️  listProjectFiles returned invalid data:', allFiles);
                    throw new Error('Invalid file list returned from database');
                }

                const attachedFiles = allFiles.filter(file =>
                    data.attachedDocumentIDs.includes(file.documentID)
                );
                console.log(`📎 Matched ${attachedFiles.length} attached files`);

                if (attachedFiles.length > 0) {
                    const fileList = attachedFiles.map(file => {
                        // Construct filename - extension might already have a dot
                        // Also clean documentName in case of old corrupted data
                        const ext = file.documentExt || '';
                        let cleanName = (file.documentName || '').replace(/\.+$/, ''); // Remove trailing dots
                        const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                        console.log(`  ✅ Attached file: ${fileName} (${file.documentID})`);
                        return `- ${fileName} (ID: ${file.documentID})`;
                    }).join('\n');

                    fileContextMessage = `The user has attached ${attachedFiles.length} file(s) to this message:\n${fileList}\n\nYou can use the get_project_file_content tool to retrieve the contents of these files using their document IDs.`;
                } else {
                    console.warn('⚠️  No matching files found for attached document IDs');
                    fileContextMessage = `The user attempted to attach files, but they could not be found in the project.`;
                }
            } catch (error) {
                console.error('❌ Error fetching file metadata:', error);
                console.error('❌ Error stack:', error.stack);
                fileContextMessage = `The user attached document IDs: ${data.attachedDocumentIDs.join(', ')}, but there was an error retrieving file details.`;
                console.log('⚠️  Continuing with error message in context');
            }
        } else {
            console.log('📎 No files attached to this message');
        }

        const messages = [
            {role: 'system', content: system_prompt},
            {role: 'system', content: `You are now working with projectID: ${data.projectID} and chatID: ${data.chatID}`},
            {role: 'system', content: `Summary of what the chat have gone so far: ${conversationSummary}`}
        ];

        // Add file context if files are attached
        if (fileContextMessage) {
            messages.push({role: 'system', content: fileContextMessage});
        }

        // Add user message
        messages.push({role: 'user', content: data.requestMessage});

        let completion = await client.chat.completions.create({
            model: 'grok-4-fast-reasoning',
            messages: messages,
            tools: tools,
            tool_choice: "auto",  // Let the AI decide when to use tools
            temperature: 0.7,
            max_tokens: 1500,
        });

        let responseMessage = completion.choices[0].message;

        // Handle tool calls if the AI wants to use them
        while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            // Add assistant's message with tool calls to history
            // Ensure the message has a role field
            if (!responseMessage.role) {
                responseMessage.role = 'assistant';
            }
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
                // model: 'grok-4-1-fast-non-reasoning',
                model: 'grok-4-1-fast-reasoning',

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

async function* getStreamingResponse(data, conversationSummary) {
    // Validate API key before making requests
    if (!process.env.XAI_API_KEY) {
        const errorMsg = 'XAI_API_KEY is not configured. Please set the environment variable and restart the server.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
    }

    // Build file context message if files are attached
    let fileContextMessage = '';
    if (data.attachedDocumentIDs && data.attachedDocumentIDs.length > 0) {
        console.log(`📎 Processing ${data.attachedDocumentIDs.length} attached file(s)...`);
        console.log('📎 Attached document IDs:', data.attachedDocumentIDs);

        // Fetch file metadata from database
        const fss = require('./fsServices');
        try {
            console.log('📂 Fetching project files for projectID:', data.projectID);
            const allFiles = await fss.listProjectFiles(data.projectID);
            console.log(`📂 Found ${allFiles?.length || 0} total files in project`);

            // Safety check for null/undefined
            if (!allFiles || !Array.isArray(allFiles)) {
                console.warn('⚠️  listProjectFiles returned invalid data:', allFiles);
                throw new Error('Invalid file list returned from database');
            }

            const attachedFiles = allFiles.filter(file =>
                data.attachedDocumentIDs.includes(file.documentID)
            );
            console.log(`📎 Matched ${attachedFiles.length} attached files`);

            if (attachedFiles.length > 0) {
                const fileList = attachedFiles.map(file => {
                    // Construct filename - extension might already have a dot
                    // Also clean documentName in case of old corrupted data
                    const ext = file.documentExt || '';
                    let cleanName = (file.documentName || '').replace(/\.+$/, ''); // Remove trailing dots
                    const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                    console.log(`  ✅ Attached file: ${fileName} (${file.documentID})`);
                    return `- ${fileName} (ID: ${file.documentID})`;
                }).join('\n');

                fileContextMessage = `The user has attached ${attachedFiles.length} file(s) to this message:\n${fileList}\n\nYou can use the get_project_file_content tool to retrieve the contents of these files using their document IDs.`;
                console.log('✅ File context message created');
            } else {
                console.warn('⚠️  No matching files found for attached document IDs');
                fileContextMessage = `The user attempted to attach files, but they could not be found in the project.`;
            }
        } catch (error) {
            console.error('❌ Error fetching file metadata:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Error details:', {
                projectID: data.projectID,
                attachedDocumentIDs: data.attachedDocumentIDs
            });

            // Don't throw here - continue with a warning message instead
            fileContextMessage = `The user attached document IDs: ${data.attachedDocumentIDs.join(', ')}, but there was an error retrieving file details.`;
            console.log('⚠️  Continuing with error message in context');
        }
    } else {
        console.log('📎 No files attached to this message');
    }

    const messages = [
        {role: 'system', content: system_prompt},
        {role: 'system', content: `You are now working with projectID: ${data.projectID} and chatID: ${data.chatID}`},
        {role: 'system', content: `Summary of what the chat have gone so far: ${conversationSummary}`}
    ];

    // Add file context if files are attached
    if (fileContextMessage) {
        messages.push({role: 'system', content: fileContextMessage});
    }

    // Add user message
    messages.push({role: 'user', content: data.requestMessage});

    const stream = await client.chat.completions.create({
        // model: 'grok-4-1-fast-non-reasoning',
        model: 'grok-4-1-fast-reasoning',

        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1500,
        stream: true  // Enable streaming
    });

    let fullContent = '';
    let responseMessage = { content: '', tool_calls: [] };
    let toolCalls = [];

    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
            fullContent += delta.content;
            yield delta.content;  // Yield chunk for real-time UI updates
        }
        if (delta?.tool_calls?.length > 0) {
            // Accumulate tool calls across chunks
            delta.tool_calls.forEach((tcDelta, idx) => {
                const tc = toolCalls[idx] || { id: '', function: { name: '', arguments: '' } };
                tc.id ||= tcDelta.id;
                tc.function.name += tcDelta.function?.name || '';
                tc.function.arguments += tcDelta.function?.arguments || '';
                toolCalls[idx] = tc;
            });
        }
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
            responseMessage.tool_calls = toolCalls.map(tc => ({
                id: tc.id,
                function: { name: tc.function.name, arguments: tc.function.arguments }
            }));
        }
    }

    responseMessage.content = fullContent;

    // Handle tool calls if present (non-streaming follow-up calls)
    if (responseMessage.tool_calls?.length > 0) {
        // Ensure responseMessage has role before adding to messages
        if (!responseMessage.role) {
            responseMessage.role = 'assistant';
        }

        // Ensure responseMessage has content field (required by API)
        if (!responseMessage.content) {
            responseMessage.content = '';
        }

        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            console.log(`AI is calling tool: ${functionName} with args:`, functionArgs);

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

            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResponse),
            });
        }

        // Validate messages array before final API call
        console.log('📋 Messages array before final API call:');
        messages.forEach((msg, idx) => {
            if (!msg.role) {
                console.error(`❌ Message at index ${idx} is missing role field:`, msg);
            } else {
                console.log(`  [${idx}] role: ${msg.role}, has content: ${!!msg.content}, has tool_calls: ${!!msg.tool_calls}`);
            }
        });

        // Final non-streaming call after tools
        console.log('🔄 Making final API call with tool results...');
        const completion = await client.chat.completions.create({
            // model: 'grok-4-1-fast-non-reasoning',
            model: 'grok-4-1-fast-reasoning',
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 1500,
        });

        const finalMessage = completion.choices[0].message;
        yield `\n\n${finalMessage.content}`;  // Yield final tool response
        console.log('Final Message Respond: ' + finalMessage.content);
    } else {
        console.log('Message Respond: ' + fullContent);
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
            // model: 'grok-4-1-fast-non-reasoning',
            model: 'grok-4-1-fast-reasoning',
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

async function createChatName(conversationHistory) {

    if (conversationHistory == null) {
        console.error("No chatHistory is given for function createChatName")
        return
    }

    try {
        const messages = [
            { role: 'system', content: system_prompt },
            {
                role: 'user',
                content:
                    'Analyze the following chat thread and give a short chat name (at most 8 words) for user to identify:\n\n' +
                    conversationHistory,
            },
        ];

        const completion = await client.chat.completions.create({
            // model: 'grok-4-1-fast-non-reasoning',
            model: 'grok-4-1-fast-reasoning',
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

async function test(){
    let data = {
        requestMessage: "What is time complexity?",
    };

    console.log('Streaming test...\n');

    // Iterate over the generator
    for await (const chunk of getStreamingResponse(data, "")) {
        process.stdout.write(chunk);
    }
    console.log('\n--- Stream complete ---');
}



module.exports = {
    getResponse,
    getChatSummary,
    createChatName,
    getStreamingResponse
}


