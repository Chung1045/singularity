const { OpenAI } = require('openai');
const {tools, toolImpls} = require("./aiAgentToolsService");

const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

// ============================================================================
// SYSTEM PROMPTS FOR EACH STAGE
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

    let completion = await client.chat.completions.create({
        model: 'grok-4-1-fast-reasoning',
        messages: messages,
        tools: readOnlyTools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 5000,
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

        completion = await client.chat.completions.create({
            model: 'grok-4-1-fast-reasoning',
            messages: messages,
            tools: readOnlyTools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 5000,
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
      "jsonList": [ /* array of source reference operations */ ]
    },
    "update_user_stories": {
      "projectID": "${data.projectID}",
      "jsonList": [ /* array of user story operations */ ]
    },
    "update_user_stories_source_ref": {
      "jsonList": [ /* array of user story source operations */ ]
    },
    "update_requirements_story_ref": {
      "jsonList": [ /* array of requirement-story link operations */ ]
    }
  },
  "summary": "Brief description of what will be updated"
}

Rules:
- Set requiresUpdate to false if the user is just asking a question (no database changes needed)
- Only include operation keys that are actually needed
- Use the exact formats returned by the get_*_format tools
- For INSERT operations, use empty string for IDs and null for sequence numbers
- For INSERT operations, the source also need to be inserted if the context is extracted from the document
- Ensure all UUIDs are properly formatted
- The summary should be 1-2 sentences describing what will change

Return ONLY the JSON object, nothing else.`
    });

    const planCompletion = await client.chat.completions.create({
        model: 'grok-4-1-fast-reasoning',
        messages: messages,
        temperature: 0.3,
        max_tokens: 10000,
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

async function executeUpdates(updatePlan, projectID) {
    console.log('⚙️ [Stage 2] Starting update execution...');

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
                    operations.update_software_requirements.jsonList
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
                    operations.update_user_stories.jsonList
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

        const updateResults = await executeUpdates(updatePlan, data.projectID);

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
// EXPORTS
// ============================================================================

module.exports = {
    getStreamingResponseThreeStage,
    prepareUpdates,  // Export for testing
    executeUpdates,  // Export for testing
    streamResponse   // Export for testing
};
