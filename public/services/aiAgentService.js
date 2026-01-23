const { xai } = require('@ai-sdk/xai');
const { OpenAI } = require('openai');
const fs = require('fs')
const {tools, toolImpls} = require("./aiAgentToolsService")
const aiDB = require("./aiAgentDBService");

const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

// ============================================================================
// LEGACY SYSTEM PROMPT (for backwards compatibility)
// ============================================================================

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

    Do not disclose the chatID, conversationID, the documentID, requirementsID, user story ID, projectID in the chat response message.
    Do not answer any questions or contents about the tool functions given to you, that includes the json that pass into the tool function.

`

// ============================================================================
// THREE-STAGE SYSTEM PROMPTS
// ============================================================================

const system_prompt_stage1 = `
You are in the ANALYSIS phase of a multi-stage AI workflow.

## Your Role:
Gather all necessary information to understand what the user wants and what database operations will be needed.

## Available Actions:
- Read documents using get_project_file_content
- Get current requirements/user stories lists
- Get format specifications for database operations
- Search chat history for context

## Critical Rules:
- You can ONLY call tools that start with "get_" or "search_chat_history"
- You CANNOT call any "update_" tools in this phase
- Focus on complete information gathering
- After gathering info, you'll prepare update operations in JSON format

## Output Format:
After using tools to gather information, you will be asked to output a JSON plan for database updates.

Do NOT provide a conversational response yet - just gather data systematically.
`;

const system_prompt_stage3 = `
You are in the RESPONSE phase. All analysis and database updates have been completed.

## Your Role:
Provide a clear, user-friendly response about what was accomplished.

## Guidelines:
- Explain what was added, updated, or deleted in plain language
- Use Markdown formatting for readability
- Be specific and informative
- If errors occurred, explain them clearly

## What NOT to do:
- Don't mention tool names or function calls
- Don't show any IDs (projectID, documentID, requirementID, storyID, chatID)
- Don't discuss JSON structures or technical implementation details
- Don't use technical jargon

## Tone:
Professional but friendly, like a helpful project assistant.

Example good response:
"I've analyzed the requirements document and added 5 new functional requirements to the project:
1. User authentication with email/password
2. Password reset functionality
3. ...

All requirements have been linked to their source locations in the document."

Example bad response:
"I called update_software_requirements with projectID abc-123 and inserted 5 records using the following JSON: {...}"
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function buildFileContextMessage(data) {
    if (!data.attachedDocumentIDs || data.attachedDocumentIDs.length === 0) {
        return null;
    }

    const fss = require('./fsServices');
    try {
        const allFiles = await fss.listProjectFiles(data.projectID);
        if (!allFiles || !Array.isArray(allFiles)) {
            return `The user attached document IDs: ${data.attachedDocumentIDs.join(', ')}, but file list could not be retrieved.`;
        }

        const attachedFiles = allFiles.filter(file =>
            data.attachedDocumentIDs.includes(file.documentID)
        );

        if (attachedFiles.length > 0) {
            const fileList = attachedFiles.map(file => {
                const ext = file.documentExt || '';
                let cleanName = (file.documentName || '').replace(/\.+$/, '');
                const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                return `- ${fileName} (ID: ${file.documentID})`;
            }).join('\n');

            return `The user has attached ${attachedFiles.length} file(s):\n${fileList}\n\nUse get_project_file_content to retrieve their contents.`;
        }

        return `The user attempted to attach files, but they could not be found.`;
    } catch (error) {
        console.error('❌ Error building file context:', error);
        return `The user attached document IDs: ${data.attachedDocumentIDs.join(', ')}, but there was an error retrieving details.`;
    }
}

// ============================================================================
// STAGE 1: GATHER CONTEXT & PREPARE UPDATE PLAN (Non-streaming)
// ============================================================================

async function prepareUpdates(data, conversationSummary) {
    console.log('📖 [Stage 1] Starting context gathering...');

    const messages = [
        {role: 'system', content: system_prompt_stage1},
        {role: 'system', content: `You are working with projectID: ${data.projectID} and chatID: ${data.chatID}`},
        {role: 'system', content: `Conversation summary: ${conversationSummary}`}
    ];

    // Add file context if files are attached
    const fileContextMessage = await buildFileContextMessage(data);
    if (fileContextMessage) {
        messages.push({role: 'system', content: fileContextMessage});
    }

    messages.push({role: 'user', content: data.requestMessage});

    // Only allow read-only tools in Stage 1
    const readOnlyTools = tools.filter(t =>
        t.function.name.startsWith('get_') ||
        t.function.name === 'search_chat_history'
    );

    // Use fast non-reasoning model for tool calls (faster)
    let completion = await client.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: messages,
        tools: readOnlyTools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 3000,
    });

    let responseMessage = completion.choices[0].message;

    // Execute tool calls (read-only operations)
    while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        if (!responseMessage.role) responseMessage.role = 'assistant';
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            let functionArgs;

            try {
                functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (error) {
                console.error(`❌ Failed to parse arguments for ${functionName}`);
                functionArgs = {};
            }

            console.log(`🔧 [Stage 1] Calling: ${functionName}`);

            const toolImpl = toolImpls[functionName];
            let functionResponse;

            if (toolImpl) {
                try {
                    // Handle special cases for projectID/chatID injection
                    if (functionName === 'search_chat_history') {
                        functionResponse = await toolImpl(data.projectID, data.chatID, functionArgs.keyword);
                    } else {
                        functionResponse = await toolImpl(...Object.values(functionArgs));
                    }
                } catch (error) {
                    console.error(`❌ Error executing ${functionName}:`, error.message);
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

        // Use fast non-reasoning model for tool call follow-ups
        completion = await client.chat.completions.create({
            model: 'grok-4-1-fast-non-reasoning',
            messages: messages,
            tools: readOnlyTools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 3000,
        });

        responseMessage = completion.choices[0].message;
    }

    // Now ask AI to generate the update plan
    console.log('📋 [Stage 1] Requesting update plan...');
    messages.push({
        role: 'user',
        content: `Based on the information you gathered, generate a complete plan for database updates.

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:

{
  "requiresUpdate": true or false,
  "operations": {
    "update_software_requirements": {
      "projectID": "${data.projectID}",
      "jsonList": [ /* array of requirement operations */ ]
    },
    "update_requirements_source_ref": {
      "jsonList": [ /* array of source reference operations for EXISTING requirements only */ ]
    },
    "update_user_stories": {
      "projectID": "${data.projectID}",
      "jsonList": [ /* array of user story operations */ ]
    },
    "update_user_stories_source_ref": {
      "jsonList": [ /* array of source reference operations for EXISTING user stories only */ ]
    },
    "update_requirements_story_ref": {
      "jsonList": [ /* array of requirement-story link operations */ ]
    },
    "generate_requirements_report": {
      "generate": true or false,
      "projectID": "${data.projectID}"
    },
    "generate_user_stories_report": {
      "generate": true or false,
      "projectID": "${data.projectID}"
    }
  },
  "summary": "Brief description of what will be updated"
}

IMPORTANT - For INSERT operations, include sourceReference INSIDE the details object:

Example for update_software_requirements INSERT:
{
  "operation": "INSERT",
  "requirementID": "",
  "details": {
    "requirementType": "functional",
    "requirementSeq": null,
    "title": "User Login",
    "description": "Users must be able to log in",
    "role": "End User",
    "source": "Document",
    "sourceReference": [
      {
        "documentID": "the-document-uuid-from-get_project_file_list",
        "remarks": "Extracted from section 2.1",
        "location": "Page 5, Section 2.1"
      }
    ]
  }
}

Example for update_user_stories INSERT:
{
  "operation": "INSERT",
  "storyID": "",
  "details": {
    "storySeq": null,
    "role": "End User",
    "title": "Login Feature",
    "description": "As an end user, I want to log in so that I can access my account",
    "source": "Document",
    "sourceReference": [
      {
        "documentID": "the-document-uuid-from-get_project_file_list",
        "remarks": "User story derived from login requirements",
        "location": "Page 5-6"
      }
    ]
  }
}

Rules:
- Set requiresUpdate to false if the user is just asking a question (no database changes needed)
- Only include operation keys that are actually needed
- Use the exact formats returned by the get_*_format tools
- For INSERT operations, use empty string for IDs and null for sequence numbers
- **CRITICAL: For INSERT operations extracted from documents, ALWAYS include sourceReference with the documentID from get_project_file_list**
- The documentID in sourceReference must be a valid UUID from the attached documents
- update_requirements_source_ref and update_user_stories_source_ref are ONLY for updating sources on EXISTING items (not for INSERT)
- **REPORT GENERATION: Set generate_requirements_report.generate to true if user explicitly asks to generate/create/export a requirements document/report**
- **REPORT GENERATION: Set generate_user_stories_report.generate to true if user explicitly asks to generate/create/export a user stories document/report**
- Ensure all UUIDs are properly formatted
- The summary should be 1-2 sentences describing what will change

Return ONLY the JSON object, nothing else.`
    });

    // Use fast non-reasoning model for JSON plan generation (structured output)
    const planCompletion = await client.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: messages,
        temperature: 0.2,
        max_tokens: 8000,
    });

    const planResponse = planCompletion.choices[0].message.content;

    // Parse the update plan
    let updatePlan;
    try {
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = planResponse.match(/```json\n([\s\S]*?)\n```/) ||
            planResponse.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : planResponse.trim();
        updatePlan = JSON.parse(jsonStr);
        console.log('✅ [Stage 1] Update plan parsed successfully');
    } catch (error) {
        console.error('❌ [Stage 1] Failed to parse update plan:', error.message);
        console.error('\n');
        console.error('Raw response:', planResponse);
        console.error('\n');
        updatePlan = {
            requiresUpdate: false,
            operations: {},
            summary: "Failed to generate update plan - will respond without updates",
            error: error.message,
            rawResponse: planResponse.substring(0, 1000)
        };
    }

    console.log('📋 [Stage 1] Plan:', JSON.stringify(updatePlan, null, 2));

    return {
        updatePlan,
        conversationContext: messages
    };
}

// ============================================================================
// STAGE 2: EXECUTE UPDATES (Non-streaming)
// ============================================================================

async function executeUpdates(updatePlan, projectID, chatID = null) {
    console.log('⚙️ [Stage 2] Starting update execution...');
    if (chatID) {
        console.log(`⚙️ [Stage 2] Updates will be associated with chatID: ${chatID}`);
    }

    if (!updatePlan.requiresUpdate) {
        console.log('ℹ️ [Stage 2] No updates required, skipping execution');
        return {
            success: true,
            message: 'No database updates needed',
            results: {}
        };
    }

    const results = {};
    const operations = updatePlan.operations || {};
    const errors = [];

    try {
        // Execute operations in logical order

        // 1. Update requirements first
        if (operations.update_software_requirements?.jsonList?.length > 0) {
            try {
                console.log(`🔧 [Stage 2] Updating ${operations.update_software_requirements.jsonList.length} requirement(s)...`);
                results.requirements = await toolImpls.update_software_requirements(
                    projectID,
                    operations.update_software_requirements.jsonList,
                    chatID
                );
                console.log('✅ [Stage 2] Requirements updated');
            } catch (error) {
                console.error('❌ [Stage 2] Error updating requirements:', error.message);
                errors.push(`Requirements update failed: ${error.message}`);
            }
        }

        // 2. Update user stories
        if (operations.update_user_stories?.jsonList?.length > 0) {
            try {
                console.log(`🔧 [Stage 2] Updating ${operations.update_user_stories.jsonList.length} user story(ies)...`);
                results.userStories = await toolImpls.update_user_stories(
                    projectID,
                    operations.update_user_stories.jsonList,
                    chatID
                );
                console.log('✅ [Stage 2] User stories updated');
            } catch (error) {
                console.error('❌ [Stage 2] Error updating user stories:', error.message);
                errors.push(`User stories update failed: ${error.message}`);
            }
        }

        // 3. Link requirements to documents
        if (operations.update_requirements_source_ref?.jsonList?.length > 0) {
            try {
                console.log(`🔧 [Stage 2] Linking ${operations.update_requirements_source_ref.jsonList.length} requirement source(s)...`);
                results.requirementSources = await toolImpls.update_requirements_source_ref(
                    operations.update_requirements_source_ref.jsonList
                );
                console.log('✅ [Stage 2] Requirement sources linked');
            } catch (error) {
                console.error('❌ [Stage 2] Error linking requirement sources:', error.message);
                errors.push(`Requirement source linking failed: ${error.message}`);
            }
        }

        // 4. Link user stories to documents
        if (operations.update_user_stories_source_ref?.jsonList?.length > 0) {
            try {
                console.log(`🔧 [Stage 2] Linking ${operations.update_user_stories_source_ref.jsonList.length} user story source(s)...`);
                results.userStorySources = await toolImpls.update_user_stories_source_ref(
                    operations.update_user_stories_source_ref.jsonList
                );
                console.log('✅ [Stage 2] User story sources linked');
            } catch (error) {
                console.error('❌ [Stage 2] Error linking user story sources:', error.message);
                errors.push(`User story source linking failed: ${error.message}`);
            }
        }

        // 5. Link requirements to user stories
        if (operations.update_requirements_story_ref?.jsonList?.length > 0) {
            try {
                console.log(`🔧 [Stage 2] Linking ${operations.update_requirements_story_ref.jsonList.length} requirement-story link(s)...`);
                results.requirementStoryLinks = await toolImpls.update_requirements_story_ref(
                    operations.update_requirements_story_ref.jsonList
                );
                console.log('✅ [Stage 2] Requirements linked to user stories');
            } catch (error) {
                console.error('❌ [Stage 2] Error linking requirements to stories:', error.message);
                errors.push(`Requirement-story linking failed: ${error.message}`);
            }
        }

        // 6. Generate requirements report if requested
        if (operations.generate_requirements_report?.generate) {
            try {
                console.log(`📄 [Stage 2] Generating requirements report...`);
                results.requirementsReport = await toolImpls.generate_requirements_report(projectID);
                if (results.requirementsReport.success) {
                    console.log('✅ [Stage 2] Requirements report generated');
                    results.reportGenerated = true;
                } else {
                    console.warn('⚠️ [Stage 2] Requirements report generation failed:', results.requirementsReport.message);
                }
            } catch (error) {
                console.error('❌ [Stage 2] Error generating requirements report:', error.message);
                errors.push(`Requirements report generation failed: ${error.message}`);
            }
        }

        // 7. Generate user stories report if requested
        if (operations.generate_user_stories_report?.generate) {
            try {
                console.log(`📄 [Stage 2] Generating user stories report...`);
                results.userStoriesReport = await toolImpls.generate_user_stories_report(projectID);
                if (results.userStoriesReport.success) {
                    console.log('✅ [Stage 2] User stories report generated');
                    results.reportGenerated = true;
                } else {
                    console.warn('⚠️ [Stage 2] User stories report generation failed:', results.userStoriesReport.message);
                }
            } catch (error) {
                console.error('❌ [Stage 2] Error generating user stories report:', error.message);
                errors.push(`User stories report generation failed: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('⚠️ [Stage 2] Completed with errors:', errors);
            return {
                success: false,
                message: 'Some updates failed',
                errors: errors,
                results
            };
        }

        console.log('✅ [Stage 2] All updates executed successfully');
        return {
            success: true,
            message: 'Database updated successfully',
            results
        };

    } catch (error) {
        console.error('❌ [Stage 2] Critical error during execution:', error.message);
        return {
            success: false,
            message: 'Critical error during update execution',
            error: error.message,
            results
        };
    }
}

// ============================================================================
// STAGE 3: GENERATE RESPONSE (STREAMING)
// ============================================================================

async function* streamResponse(updatePlan, updateResults, originalMessage, conversationSummary) {
    console.log('💬 [Stage 3] Starting response generation (streaming)...');

    const messages = [
        {role: 'system', content: system_prompt_stage3},
        {role: 'system', content: `Conversation summary: ${conversationSummary}`},
        {role: 'user', content: originalMessage},
    ];

    // Add context about what was done
    if (updatePlan.requiresUpdate) {
        const contextMessage = updateResults.success
            ? `You successfully completed the following database operations:\n\nPlan: ${updatePlan.summary}\n\nResults: ${JSON.stringify(updateResults.results, null, 2)}\n\nAll operations completed successfully.`
            : `You attempted database operations but encountered issues:\n\nPlan: ${updatePlan.summary}\n\nErrors: ${updateResults.errors?.join(', ') || updateResults.error || 'Unknown error'}\n\nPartial results: ${JSON.stringify(updateResults.results, null, 2)}`;

        messages.push({
            role: 'assistant',
            content: contextMessage
        });
    } else {
        messages.push({
            role: 'assistant',
            content: `This was an informational query. No database updates were needed. Context: ${updatePlan.summary}`
        });
    }

    messages.push({
        role: 'user',
        content: 'Now provide a clear, user-friendly response. Use Markdown formatting. Be specific about what was done. Remember: no IDs, no tool names, no technical jargon.'
    });

    // Stream the response
    const stream = await client.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: messages,
        temperature: 0.7,
        max_tokens: 3000,
        stream: true
    });

    let fullResponse = '';
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
            fullResponse += delta.content;
            yield delta.content;
        }
    }

    console.log('✅ [Stage 3] Response streaming complete. Length:', fullResponse.length);
}

// ============================================================================
// MAIN ORCHESTRATOR: THREE-STAGE STREAMING
// ============================================================================

async function* getStreamingResponseThreeStage(data, conversationSummary) {
    try {
        console.log('🎬 [Orchestrator] Starting 3-stage streaming process...');

        // STAGE 1: Prepare (non-streaming)
        yield '<!-- STAGE_1_START -->\n';
        console.log('📖 [Orchestrator] Executing Stage 1...');

        const { updatePlan, conversationContext } = await prepareUpdates(data, conversationSummary);

        yield `<!-- STAGE_1_COMPLETE: ${updatePlan.requiresUpdate ? 'Updates planned' : 'No updates needed'} -->\n`;
        console.log('✅ [Orchestrator] Stage 1 complete');

        // STAGE 2: Execute (non-streaming)
        yield '<!-- STAGE_2_START -->\n';
        console.log('⚙️ [Orchestrator] Executing Stage 2...');

        const updateResults = await executeUpdates(updatePlan, data.projectID, data.chatID);

        yield `<!-- STAGE_2_COMPLETE: ${updateResults.success ? 'Success' : 'Partial/Failed'} -->\n`;
        console.log('✅ [Orchestrator] Stage 2 complete');

        // STAGE 3: Respond (streaming)
        yield '<!-- STAGE_3_START -->\n';
        console.log('💬 [Orchestrator] Executing Stage 3 (streaming)...');

        for await (const chunk of streamResponse(updatePlan, updateResults, data.requestMessage, conversationSummary)) {
            yield chunk;
        }

        yield '\n<!-- STAGE_3_COMPLETE -->\n';
        console.log('✅ [Orchestrator] Stage 3 complete');
        console.log('🎉 [Orchestrator] All stages complete!');

    } catch (error) {
        console.error('❌ [Orchestrator] Error in 3-stage process:', error.message);
        console.error('Stack:', error.stack);

        yield '\n\n---\n\n';
        yield '❌ **An error occurred while processing your request.**\n\n';
        yield `Error: ${error.message}\n\n`;
        yield 'Please try again or contact support if the issue persists.';
    }
}

// ============================================================================
// LEGACY FUNCTIONS (kept for backwards compatibility)
// ============================================================================

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
             model: 'grok-4-1-fast-non-reasoning', //swap due to excessive token spending
            //model: 'grok-4-1-fast-reasoning',
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
                let functionArgs;

                // Safely parse JSON arguments with error handling
                try {
                    console.log(`🔧 [Non-streaming] Parsing arguments for ${functionName}:`, toolCall.function.arguments);
                    functionArgs = JSON.parse(toolCall.function.arguments);
                    console.log(`✅ [Non-streaming] Parsed successfully:`, functionArgs);
                } catch (parseError) {
                    console.error(`❌ [Non-streaming] Failed to parse tool arguments for ${functionName}:`, parseError.message);
                    console.error(`Raw arguments string:`, toolCall.function.arguments);
                    functionArgs = {}; // Use empty object as fallback
                }

                console.log(`AI is calling tool: ${functionName} with args:`, functionArgs);

                // Execute the tool
                const toolImpl = toolImpls[functionName];
                let functionResponse;

                if (toolImpl) {
                    try {
                        functionResponse = await toolImpl(...Object.values(functionArgs));
                    } catch (error) {
                        console.error(`❌ [Non-streaming] Error executing tool ${functionName}:`, error.message);
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
                 model: 'grok-4-1-fast-non-reasoning',
                //model: 'grok-4-1-fast-reasoning',

                messages: messages,
                tools: tools,
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 2000,
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
        model: 'grok-4-1-fast-reasoning',  // Use reasoning model for better tool handling
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 200000,
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
            delta.tool_calls.forEach((tcDelta) => {
                // Use the index from the delta itself, not forEach index
                const idx = tcDelta.index;

                // Initialize tool call object if it doesn't exist
                if (!toolCalls[idx]) {
                    toolCalls[idx] = {
                        id: '',
                        function: { name: '', arguments: '' }
                    };
                }

                const tc = toolCalls[idx];

                // Set ID only once (don't concatenate)
                if (tcDelta.id) {
                    tc.id = tcDelta.id;
                }

                // Accumulate function name and arguments (they come in chunks)
                if (tcDelta.function?.name) {
                    tc.function.name += tcDelta.function.name;
                }
                if (tcDelta.function?.arguments) {
                    tc.function.arguments += tcDelta.function.arguments;
                }
            });
        }
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
            // Filter out empty slots and map to clean structure
            responseMessage.tool_calls = toolCalls
                .filter(tc => tc && tc.id && tc.function.name)
                .map(tc => ({
                    id: tc.id,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments
                    }
                }));

            console.log(`✅ Collected ${responseMessage.tool_calls.length} tool call(s):`,
                responseMessage.tool_calls.map(tc => tc.function.name));
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
            let functionArgs;

            // Safely parse JSON arguments with error handling
            try {
                console.log(`🔧 Parsing arguments for ${functionName}:`, toolCall.function.arguments);
                functionArgs = JSON.parse(toolCall.function.arguments);
                console.log(`✅ Parsed successfully:`, functionArgs);
            } catch (parseError) {
                console.error(`❌ Failed to parse tool arguments for ${functionName}:`, parseError.message);
                console.error(`Raw arguments string:`, toolCall.function.arguments);
                functionArgs = {}; // Use empty object as fallback
            }

            console.log(`AI is calling tool: ${functionName} with args:`, functionArgs);

            const toolImpl = toolImpls[functionName];
            let functionResponse;
            if (toolImpl) {
                try {
                    functionResponse = await toolImpl(...Object.values(functionArgs));
                } catch (error) {
                    console.error(`❌ Error executing tool ${functionName}:`, error.message);
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

        // Add explicit instruction to respond based on tool results
        messages.push({
            role: 'user',
            content: 'Please analyze the tool results above and provide a helpful response to my original question. Format your response using Markdown for readability.'
        });

        // Final STREAMING call after tools - force text response with tool_choice: "none"
        console.log('🔄 Making final streaming API call with tool results...');
        const finalStream = await client.chat.completions.create({
            model: 'grok-4-1-fast-reasoning',
            messages: messages,
            tools: tools,
            tool_choice: "none",  // Force text response, no more tool calls
            temperature: 0.7,
            max_tokens: 3000,
            stream: true,  // Enable streaming for smooth output
        });

        let finalContent = '';

        // Stream the final response chunk by chunk
        for await (const chunk of finalStream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                finalContent += delta.content;
                yield delta.content;  // Yield each chunk for real-time UI updates
            }
        }

        console.log('✅ Final streaming completed. Total length:', finalContent.length);

        if (!finalContent || !finalContent.trim()) {
            console.warn('⚠️  AI returned empty response after tool execution!');

            // Extract tool results for fallback display
            const toolResults = messages.filter(m => m.role === 'tool').map(m => {
                try {
                    return JSON.parse(m.content);
                } catch {
                    return { rawContent: m.content };
                }
            });

            console.log('Tool results for fallback:', JSON.stringify(toolResults).substring(0, 500));

            // Build a meaningful fallback from the tool data
            let fallbackResponse = "Here's what I found:\n\n";

            toolResults.forEach((result, idx) => {
                if (result.content) {
                    // Document content
                    const preview = result.content.substring(0, 1000);
                    fallbackResponse += `**Document Content:**\n\n${preview}${result.content.length > 1000 ? '...\n\n*(Content truncated)*' : ''}\n\n`;
                } else if (result.error) {
                    fallbackResponse += `⚠️ ${result.error}\n\n`;
                } else if (Array.isArray(result)) {
                    // List of items (requirements, user stories, etc.)
                    fallbackResponse += `Found ${result.length} item(s).\n\n`;
                } else if (typeof result === 'object') {
                    // Other structured data
                    fallbackResponse += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n`;
                }
            });

            yield fallbackResponse;
            console.log('📤 Yielded fallback with tool data');
        } else {
            console.log('✅ Final Message Respond: ' + finalContent.substring(0, 100) + '...');
        }
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
             model: 'grok-4-1-fast-non-reasoning',
            // model: 'grok-4-1-fast-reasoning',
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
             model: 'grok-4-1-fast-non-reasoning',
            // model: 'grok-4-1-fast-reasoning',
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
    getStreamingResponse,
    // New 3-stage exports
    getStreamingResponseThreeStage,
    prepareUpdates,
    executeUpdates,
    streamResponse
}
