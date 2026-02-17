const fs = require('fs')
const { OpenAI } = require('openai');
const {tools, toolImpls} = require("./aiAgentToolsService")
const aiDB = require("./aiAgentDBService");
const axios = require('axios');
const agentPrompts = require("./aiAgentPrompts")
const { groupMultipleFile } = require('../preprocessingService');
const {fetchChatThread} = require("./aiAgentDBService");

const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1'
});

const apiKey = process.env.XAI_API_KEY;
const model = "grok-4-fast-reasoning";

// Get functional and non-functional requirement analysis output
async function requirementAnalysisModel(documentData, title) {
    const prompt = agentPrompts.requirementAnalysisPrompt(title);
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

// parse the requirement output to json file
async function parseRequirementsToJSON(documentID, documentData) {
    const requirements = [];

    const blocks = documentData.split(/(?=Non-Functional Requirement|Functional Requirement)/i);

    let seqCounter = 1;

    blocks.forEach(block => {
        if (!block.trim() || block.includes('Title request:') || block.includes('No relevant functional requirements')) {
            return;
        }

        // Extract requirement ID first
        const idMatch = block.match(/Requirement ID:\s*(.+)/i);
        if (!idMatch) return;

        const requirementID = idMatch[1].trim();

        // Determine requirement type based on ID prefix
        let requirementType = 'non-functional';
        if (requirementID.startsWith('FR-')) {
            requirementType = 'functional';
        } else if (requirementID.startsWith('NFR-')) {
            requirementType = 'non-functional';
        }

        // Extract fields using regex
        const roleMatch = block.match(/Role:\s*(.+)/);
        const titleMatch = block.match(/Requirement Title:\s*(.+)/);
        const descriptionMatch = block.match(/Requirement Description:\s*(.+?)(?=\nCitation:)/s);
        const citationMatch = block.match(/Citation:\s*(.+)/);

        if (roleMatch && idMatch && titleMatch && descriptionMatch) {
            let sourceReference = [];

            if (citationMatch) {
                const citationText = citationMatch[1].trim();

                const citationParts = citationText.split(';').map(part => part.trim());

                const locations = [];
                const remarks = [];

                citationParts.forEach(part => {
                    if (part) {
                        const pageMatch = part.match(/Page\s+(\d+)/i);
                        const sectionMatch = part.match(/Section\s+([\d.]+)/i);
                        const locationText = pageMatch && sectionMatch
                            ? `Page ${pageMatch[1]}, Section ${sectionMatch[1]}`
                            : part;

                        let remark = "";
                        if (pageMatch && sectionMatch) {
                            // Remove page and section info to get remarks
                            remark = part.replace(new RegExp(`Page\\s+${pageMatch[1]},\\s*Section\\s+${sectionMatch[1]}\\s*`, 'i'), '').trim();
                        } else {
                            remark = part;
                        }

                        if (locationText) locations.push(locationText);
                        if (remark) remarks.push(remark);
                    }
                });

                // Create a single sourceReference entry with all locations and remarks
                if (locations.length > 0) {
                    sourceReference.push({
                        documentID: documentID,
                        remarks: remarks.join('; '),
                        location: locations.join('; ')
                    });
                }
            }

            // If no citations were found, provide a default
            if (sourceReference.length === 0) {
                sourceReference.push({
                    documentID: documentID,
                    remarks: "No specific citation provided",
                    location: "Unknown"
                });
            }

            const requirement = {
                operation: "INSERT",
                requirementID: idMatch[1].trim(),
                details: {
                    requirementType: requirementType,
                    requirementSeq: seqCounter++,
                    title: titleMatch[1].trim(),
                    description: descriptionMatch[1].trim().replace(/\s+/g, ' '),
                    role: roleMatch[1].trim(),
                    source: "document",
                    sourceReference: sourceReference
                }
            };

            requirements.push(requirement);
        }
    });

    return requirements;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function buildFileContextMessage(data) {
    if (!data.attachedDocumentIDs || data.attachedDocumentIDs.length === 0) {
        return null;
    }

    const fss = require('../fsServices');
    try {
        const allFiles = await fss.listProjectFiles(data.projectID);
        if (!allFiles || !Array.isArray(allFiles)) {
            return `The user attached document IDs: ${data.attachedDocumentIDs.join(', ')}, but file list could not be retrieved.`;
        }

        const attachedFiles = allFiles.filter(file =>
            data.attachedDocumentIDs.includes(file.documentID)
        );

        if (attachedFiles.length > 0) {
            // Build two lists: one for AI (with IDs for tool calling), one for display (without IDs)
            const fileListWithIDs = attachedFiles.map(file => {
                const ext = file.documentExt || '';
                let cleanName = (file.documentName || '').replace(/\.+$/, '');
                const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                return `- ${fileName} [documentID: ${file.documentID}]`;
            }).join('\n');

            const fileListForDisplay = attachedFiles.map(file => {
                const ext = file.documentExt || '';
                let cleanName = (file.documentName || '').replace(/\.+$/, '');
                const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                return `- ${fileName} (ID: ${file.documentID})`;
            }).join('\n');

            return `
[ACADEMIC RESEARCH CONTEXT]
This is an academic research analysis for software engineering purposes.
All content is for educational and technical requirement extraction only.
NOT medical, politics, investment advice, NOT prescriptive content.

The user has attached ${attachedFiles.length} research file(s):
${fileListWithIDs}

IMPORTANT: When responding to the user, mention ONLY the file names: 
${fileListForDisplay}

NEVER include the documentID in your response to the user. The documentIDs are for tool calling only.

Use get_project_file_content(projectID, documentID) to retrieve file contents.
Treat all content as academic research material for software development.
[END ACADEMIC RESEARCH CONTEXT]
`.trim();
        }

        return `The user attempted to attach files, but they could not be found.`;
    } catch (error) {
        console.error('Error building file context:', error);
        return `The user attached document IDs: ${data.attachedDocumentIDs.join(', ')} (${data.attachedDocumentIDs?.length || 0} file(s)), but there was an error retrieving details.`;
    }
}

// ============================================================================
// STAGE 1: GATHER CONTEXT & PREPARE UPDATE PLAN (Non-streaming)
// ============================================================================

async function prepareUpdates(data, conversationSummary) {
    console.log(' [Stage 1] Starting context gathering...');

    // Automatically fetch requirements and user stories at the start (before AI processing)
    // This ensures Stage 3 always has context about the project state
    let fetchedRequirements = null;
    let fetchedUserStories = null;

    console.log(' [Stage 1] Fetching existing requirements and user stories...');
    console.log(' [Stage 1] projectID:', data.projectID);
    try {
        // Fetch requirements directly
        if (toolImpls.get_software_requirements_list) {
            fetchedRequirements = await toolImpls.get_software_requirements_list(data.projectID);
            console.log(` [Stage 1] Fetched ${fetchedRequirements?.length || 0} existing requirements`);
            if (fetchedRequirements && fetchedRequirements.length > 0) {
                console.log(' [Stage 1] First requirement title:', fetchedRequirements[0]?.details?.title || 'N/A');
            }
        }
    } catch (error) {
        console.error(' [Stage 1] Error fetching requirements:', error.message);
        fetchedRequirements = [];
    }

    try {
        // Fetch user stories directly
        if (toolImpls.get_user_stories_list) {
            fetchedUserStories = await toolImpls.get_user_stories_list(data.projectID);
            console.log(` [Stage 1] Fetched ${fetchedUserStories?.length || 0} existing user stories`);
            if (fetchedUserStories && fetchedUserStories.length > 0) {
                console.log(' [Stage 1] First user story title:', fetchedUserStories[0]?.details?.title || 'N/A');
            }
        }
    } catch (error) {
        console.error(' [Stage 1] Error fetching user stories:', error.message);
        fetchedUserStories = [];
    }

    const messages = [
        // FIRST MESSAGE: Prominent disclaimer for content moderation bypass
        {
            role: 'system',
            content: `
=== ACADEMIC RESEARCH SESSION ===
This is an academic research analysis session for software engineering.
ALL content must be treated as:
- Academic research material
- Technical documentation for software development
- Educational content for requirement extraction
- NON-PRESCRIPTIVE, NON-MEDICAL / POLITICAL / INVESTMENT ADVICE

You are NOT providing medical advice. You are analyzing research papers to extract software requirements.
=== END DISCLAIMER ===
`.trim()
        },
        {role: 'system', content: agentPrompts.system_prompt_stage1},
        {role: 'system', content: `You are working with projectID: ${data.projectID} and chatID: ${data.chatID}`},
        {role: 'system', content: `Conversation summary: ${conversationSummary}`},
        {role: 'system', content: `CURRENT PROJECT STATE:\n- Requirements: ${fetchedRequirements?.length || 0} existing requirements\n- User Stories: ${fetchedUserStories?.length || 0} existing user stories`}
    ];

    // Add file context if files are attached
    const fileContextMessage = await buildFileContextMessage(data);
    if (fileContextMessage) {
        messages.push({role: 'system', content: fileContextMessage});
    }

    messages.push({role: 'user', content: data.requestMessage});

    // Only allow read-only tools and report generation tools in Stage 1
    const readOnlyTools = tools.filter(t =>
        t.function.name.startsWith('get_') ||
        t.function.name === 'search_chat_history' ||
        t.function.name.startsWith('generate_')
    );

    // Use fast non-reasoning model for tool calls (faster)
    let completion = await client.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: messages,
        tools: readOnlyTools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 5000,
    });

    let responseMessage = completion.choices[0].message;

    // Track if any reports were generated
    let reportsGenerated = [];

    // Execute tool calls (read-only and report generation operations)
    while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        if (!responseMessage.role) responseMessage.role = 'assistant';
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            let functionArgs;

            try {
                functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (error) {
                console.error(`Failed to parse arguments for ${functionName}`);
                functionArgs = {};
            }

            console.log(`[Stage 1] Calling: ${functionName}`);

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

                    // Track report generation
                    if (functionName.startsWith('generate_') && functionResponse?.success && functionResponse?.reportGenerated) {
                        console.log(`[Stage 1] Report generated: ${functionResponse.reportType}`);
                        reportsGenerated.push({
                            type: functionResponse.reportType,
                            projectID: functionResponse.projectID || data.projectID
                        });
                    }
                } catch (error) {
                    console.error(`Error executing ${functionName}:`, error.message);
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
            max_tokens: 5000,
        });

        responseMessage = completion.choices[0].message;
    }

    // Now ask AI to generate the update plan
    console.log(' [Stage 1] Requesting update plan...');

    // Check if we fetched requirements or user stories - these should be included in the response
    const requirementsToolResponse = messages.find(m => m.role === 'tool' && m.content?.includes('requirementID'));
    const storiesToolResponse = messages.find(m => m.role === 'tool' && m.content?.includes('storyID'));

    // For Testing:
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
        }
      },
      "summary": "Brief description of what will be updated"
    }
    
    ## OPERATION EXAMPLES:
    
    ### INSERT a NEW requirement:
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
    
    ### UPDATE an EXISTING requirement:
    {
      "operation": "UPDATE",
      "requirementID": "existing-requirement-uuid-from-get_software_requirements_list",
      "details": {
        "requirementType": "functional",
        "requirementSeq": 5,
        "title": "Updated Requirement Title",
        "description": "Updated description text here",
        "role": "End User",
        "source": "User Input"
      }
    }
    
    ### INSERT a NEW user story:
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
    
    ### UPDATE an EXISTING user story:
    {
      "operation": "UPDATE",
      "storyID": "existing-story-uuid-from-get_user_stories_list",
      "details": {
        "storySeq": 3,
        "role": "Admin",
        "title": "Updated Story Title",
        "description": "Updated user story description",
        "source": "User Input"
      }
    }
    
    ### DELETE a requirement or user story:
    {
      "operation": "DELETE",
      "requirementID": "existing-requirement-uuid-to-delete"
    }
    
    ## CRITICAL RULES:
    - **INSERT**: Use empty string "" for IDs, null for sequence numbers, DO NOT USE INSERT FOR UPDATING EXISTING REQUIREMENTS/USER STORIES, USE FOR NEW REQUIREMENTS/USER STORIES ONLY
    - **UPDATE**: You MUST provide the existing UUID from get_software_requirements_list or get_user_stories_list, USE WHEN ASKED FOR UPDATING/CONSOLIDATING EXITING REQUIREMENTS/USER STORIES
    - **DELETE**: You MUST provide the existing UUID to delete
    - When user says "update", "modify", "change", or "edit" an existing item → use UPDATE operation
    - When user says "add", "create", or "new" item → use INSERT operation
    - When user says "remove" or "delete" → use DELETE operation
    - For INSERT from documents, ALWAYS include sourceReference with the documentID
    - Set requiresUpdate to false if the user is just asking a question (no database changes needed)
    
    Return ONLY the JSON object, nothing else.`
    });


    // Use fast non-reasoning model for JSON plan generation (structured output)
    const planCompletion = await client.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: messages,
        temperature: 0.2,
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
        console.log(' [Stage 1] Update plan parsed successfully');
    } catch (error) {
        console.error('[Stage 1] Failed to parse update plan:', error.message);
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

    console.log(' [Stage 1] Plan:', JSON.stringify(updatePlan, null, 2));

    // Use the pre-fetched requirements and user stories for Stage 3
    // (already fetched at the start of this function)
    console.log(' [Stage 1] Using pre-fetched data for Stage 3:',
        fetchedRequirements?.length || 0, 'requirements,',
        fetchedUserStories?.length || 0, 'stories');

    return {
        updatePlan,
        conversationContext: messages,
        reportsGenerated,
        fetchedRequirements,
        fetchedUserStories
    };
}

// ============================================================================
// STAGE 2: EXECUTE UPDATES (Non-streaming)
// ============================================================================

async function executeUpdates(updatePlan, projectID) {
    console.log(' [Stage 2] Starting update execution...');

    if (!updatePlan.requiresUpdate) {
        console.log('[Stage 2] No updates required, skipping execution');
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
                console.log(`[Stage 2] Updating ${operations.update_software_requirements.jsonList.length} requirement(s)...`);
                results.requirements = await toolImpls.update_software_requirements(
                    projectID,
                    operations.update_software_requirements.jsonList
                );
                console.log('[Stage 2] Requirements updated');
            } catch (error) {
                console.error(' [Stage 2] Error updating requirements:', error.message);
                errors.push(`Requirements update failed: ${error.message}`);
            }
        }

        // 2. Update user stories
        if (operations.update_user_stories?.jsonList?.length > 0) {
            try {
                console.log(`[Stage 2] Updating ${operations.update_user_stories.jsonList.length} user story(ies)...`);
                results.userStories = await toolImpls.update_user_stories(
                    projectID,
                    operations.update_user_stories.jsonList
                );
                console.log('[Stage 2] User stories updated');
            } catch (error) {
                console.error(' [Stage 2] Error updating user stories:', error.message);
                errors.push(`User stories update failed: ${error.message}`);
            }
        }

        // 3. Link requirements to documents
        if (operations.update_requirements_source_ref?.jsonList?.length > 0) {
            try {
                console.log(`[Stage 2] Linking ${operations.update_requirements_source_ref.jsonList.length} requirement source(s)...`);
                results.requirementSources = await toolImpls.update_requirements_source_ref(
                    operations.update_requirements_source_ref.jsonList
                );
                console.log(' [Stage 2] Requirement sources linked');
            } catch (error) {
                console.error(' [Stage 2] Error linking requirement sources:', error.message);
                errors.push(`Requirement source linking failed: ${error.message}`);
            }
        }

        // 4. Link user stories to documents
        if (operations.update_user_stories_source_ref?.jsonList?.length > 0) {
            try {
                console.log(`[Stage 2] Linking ${operations.update_user_stories_source_ref.jsonList.length} user story source(s)...`);
                results.userStorySources = await toolImpls.update_user_stories_source_ref(
                    operations.update_user_stories_source_ref.jsonList
                );
                console.log('[Stage 2] User story sources linked');
            } catch (error) {
                console.error('[Stage 2] Error linking user story sources:', error.message);
                errors.push(`User story source linking failed: ${error.message}`);
            }
        }

        // 5. Link requirements to user stories
        if (operations.update_requirements_story_ref?.jsonList?.length > 0) {
            try {
                console.log(`[Stage 2] Linking ${operations.update_requirements_story_ref.jsonList.length} requirement-story link(s)...`);
                results.requirementStoryLinks = await toolImpls.update_requirements_story_ref(
                    operations.update_requirements_story_ref.jsonList
                );
                console.log(' [Stage 2] Requirements linked to user stories');
            } catch (error) {
                console.error(' [Stage 2] Error linking requirements to stories:', error.message);
                errors.push(`Requirement-story linking failed: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn(' [Stage 2] Completed with errors:', errors);
            return {
                success: false,
                message: 'Some updates failed',
                errors: errors,
                results
            };
        }

        console.log(' [Stage 2] All updates executed successfully');
        return {
            success: true,
            message: 'Database updated successfully',
            results
        };

    } catch (error) {
        console.error(' [Stage 2] Critical error during execution:', error.message);
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

async function* streamResponse(updatePlan, updateResults, originalMessage, conversationSummary, fetchedRequirements, fetchedUserStories) {
    console.log(' [Stage 3] Starting response generation (streaming)...');

    const messages = [
        {role: 'system', content: agentPrompts.system_prompt_stage3},
        {role: 'system', content: `Conversation summary: ${conversationSummary}`},
    ];

    // Add fetched requirements if available
    if (fetchedRequirements && fetchedRequirements.length > 0) {
        messages.push({
            role: 'system',
            content: `CURRENT PROJECT REQUIREMENTS (${fetchedRequirements.length} items):\n\n${JSON.stringify(fetchedRequirements, null, 2)}`
        });
    } else {
        messages.push({
            role: 'system',
            content: `CURRENT PROJECT REQUIREMENTS: No requirements have been added yet. This is a fresh project ready for document analysis.`
        });
    }

    // Add fetched user stories if available
    if (fetchedUserStories && fetchedUserStories.length > 0) {
        messages.push({
            role: 'system',
            content: `CURRENT USER STORIES (${fetchedUserStories.length} items):\n\n${JSON.stringify(fetchedUserStories, null, 2)}`
        });
    } else {
        messages.push({
            role: 'system',
            content: `CURRENT USER STORIES: No user stories have been added yet.`
        });
    }

    // full current state for comparison
    if (fetchedRequirements && fetchedRequirements.length > 0) {
        messages.push({
            role: 'system',
            content: `FULL CURRENT REQUIREMENTS (for comparison to avoid duplicates):\n${JSON.stringify(fetchedRequirements, null, 2)}`
        });
    } else {
        messages.push({
            role: 'system',
            content: `FULL CURRENT REQUIREMENTS: None exist yet.`
        });
    }

    if (fetchedUserStories && fetchedUserStories.length > 0) {
        messages.push({
            role: 'system',
            content: `FULL CURRENT USER STORIES (for comparison to avoid duplicates):\n${JSON.stringify(fetchedUserStories, null, 2)}`
        });
    } else {
        messages.push({
            role: 'system',
            content: `FULL CURRENT USER STORIES: None exist yet.`
        });
    }



    // Add user message
    messages.push({role: 'user', content: originalMessage});

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
        // When no updates are needed, provide better context about the project state
        const hasExistingRequirements = fetchedRequirements && fetchedRequirements.length > 0;
        const hasExistingUserStories = fetchedUserStories && fetchedUserStories.length > 0;

        let contextMessage = '';
        if (hasExistingRequirements || hasExistingUserStories) {
            contextMessage = `This project already has requirements and user stories from previous document analysis:\n`;
            if (hasExistingRequirements) {
                contextMessage += `- ${fetchedRequirements.length} requirement(s) already exist\n`;
            }
            if (hasExistingUserStories) {
                contextMessage += `- ${fetchedUserStories.length} user story(ies) already exist\n`;
            }
            contextMessage += `\nNo new requirements or user stories were identified in the attached documents that aren't already captured. The existing requirements and user stories remain up-to-date from your previous analysis.`;
        } else {
            contextMessage = `This is a fresh project with no requirements or user stories yet. No database updates were needed for this query. Context: ${updatePlan.summary}`;
        }

        messages.push({
            role: 'assistant',
            content: contextMessage
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
        max_tokens: 4500,
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

    console.log(' [Stage 3] Response streaming complete. Length:', fullResponse.length);
}

// ============================================================================
// MAIN ORCHESTRATOR: THREE-STAGE STREAMING
// ============================================================================

async function* getStreamingResponseThreeStage(data, conversationSummary) {
    try {
        console.log(' [Orchestrator] Starting 3-stage streaming process...');

        // STAGE 1: Prepare (non-streaming)
        yield '<!-- STAGE_1_START -->\n';
        console.log(' [Orchestrator] Executing Stage 1...');

        const { updatePlan, conversationContext, reportsGenerated, fetchedRequirements, fetchedUserStories } = await prepareUpdates(data, conversationSummary);

        // If reports were generated in Stage 1, send an event for each
        if (reportsGenerated && reportsGenerated.length > 0) {
            for (const report of reportsGenerated) {
                yield `<!-- REPORT_GENERATED: ${JSON.stringify(report)} -->\n`;
                console.log(`[Orchestrator] Report generated: ${report.type}`);
            }
        }

        yield `<!-- STAGE_1_COMPLETE: ${updatePlan.requiresUpdate ? 'Updates planned' : 'No updates needed'} -->\n`;
        console.log(' [Orchestrator] Stage 1 complete');

        // STAGE 2: Execute (non-streaming)
        yield '<!-- STAGE_2_START -->\n';
        console.log(' [Orchestrator] Executing Stage 2...');

        const updateResults = await executeUpdates(updatePlan, data.projectID);

        yield `<!-- STAGE_2_COMPLETE: ${updateResults.success ? 'Success' : 'Partial/Failed'} -->\n`;
        console.log(' [Orchestrator] Stage 2 complete');

        // STAGE 3: Respond (streaming)
        yield '<!-- STAGE_3_START -->\n';
        console.log(' [Orchestrator] Executing Stage 3 (streaming)...');

        for await (const chunk of streamResponse(updatePlan, updateResults, data.requestMessage, conversationSummary, fetchedRequirements, fetchedUserStories)) {
            yield chunk;
        }

        yield '\n<!-- STAGE_3_COMPLETE -->\n';
        console.log(' [Orchestrator] Stage 3 complete');
        console.log(' [Orchestrator] All stages complete!');

    } catch (error) {
        console.error(' [Orchestrator] Error in 3-stage process:', error.message);
        console.error('Stack:', error.stack);

        yield '\n\n---\n\n';

        // Handle specific error types
        if (error.message && error.message.includes('SAFETY_CHECK')) {
            yield ' **Content Moderation Notice**\n\n';
            yield 'The AI provider\'s content filter flagged something in this request or the document content.\n\n';
            yield 'This can happen when:\n';
            yield '- The document contains sensitive topics (medical, biological, etc.)\n';
            yield '- The content triggers automated safety filters\n\n';
            yield '**Suggestions:**\n';
            yield '- Try rephrasing your request\n';
            yield '- If analyzing a document, try asking about specific sections\n';
            yield '- Contact support if this continues\n';
        } else if (error.message && error.message.includes('403')) {
            yield ' **Access Denied**\n\n';
            yield 'The request was blocked by the AI provider.\n\n';
            yield `Details: ${error.message}\n\n`;
            yield 'Please try again with a different request.';
        } else {
            yield ' **An error occurred while processing your request.**\n\n';
            yield `Error: ${error.message}\n\n`;
            yield 'Please try again or contact support if the issue persists.';
        }
    }
}

async function* getStreamingResponse(data, conversationSummary) {
    // Validate API key before making requests
    if (!process.env.XAI_API_KEY) {
        const errorMsg = 'XAI_API_KEY is not configured. Please set the environment variable and restart the server.';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    // Build file context message if files are attached
    let fileContextMessage = '';
    if (data.attachedDocumentIDs && data.attachedDocumentIDs.length > 0) {
        console.log(`Processing ${data.attachedDocumentIDs.length} attached file(s)...`);
        console.log('Attached document IDs:', data.attachedDocumentIDs);

        // Fetch file metadata from database
        const fss = require('../fsServices');
        try {
            console.log('Fetching project files for projectID:', data.projectID);
            const allFiles = await fss.listProjectFiles(data.projectID);
            console.log(`Found ${allFiles?.length || 0} total files in project`);

            // Safety check for null/undefined
            if (!allFiles || !Array.isArray(allFiles)) {
                console.warn('listProjectFiles returned invalid data:', allFiles);
                throw new Error('Invalid file list returned from database');
            }

            const attachedFiles = allFiles.filter(file =>
                data.attachedDocumentIDs.includes(file.documentID)
            );
            console.log(`Matched ${attachedFiles.length} attached files`);

            if (attachedFiles.length > 0) {
                const fileList = attachedFiles.map(file => {
                    // Construct filename - extension might already have a dot
                    // Also clean documentName in case of old corrupted data
                    const ext = file.documentExt || '';
                    let cleanName = (file.documentName || '').replace(/\.+$/, ''); // Remove trailing dots
                    const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                    console.log(`Attached file: ${fileName} (${file.documentID})`);
                    return `- ${fileName} (ID: ${file.documentID})`;
                }).join('\n');

                fileContextMessage = `The user has attached ${attachedFiles.length} file(s) to this message:\n${fileList}\n\nYou can use the get_project_file_content tool to retrieve the contents of these files using their document IDs.`;
                console.log('File context message created');
            } else {
                console.warn(' No matching files found for attached document IDs');
                fileContextMessage = `The user attempted to attach files, but they could not be found in the project.`;
            }
        } catch (error) {
            console.error(' Error fetching file metadata:', error);
            console.error('Error stack:', error.stack);
            console.error('Error details:', {
                projectID: data.projectID,
                attachedDocumentIDs: data.attachedDocumentIDs
            });

            // Don't throw here - continue with a warning message instead
            fileContextMessage = `The user attached document IDs: ${data.attachedDocumentIDs.join(', ')}, but there was an error retrieving file details.`;
            console.log('Continuing with error message in context');
        }
    } else {
        console.log('No files attached to this message');
    }

    const messages = [
        {role: 'system', content: agentPrompts.system_prompt},
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

            console.log(`Collected ${responseMessage.tool_calls.length} tool call(s):`,
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
                console.log(`Parsing arguments for ${functionName}:`, toolCall.function.arguments);
                functionArgs = JSON.parse(toolCall.function.arguments);
                console.log(`Parsed successfully:`, functionArgs);
            } catch (parseError) {
                console.error(`Failed to parse tool arguments for ${functionName}:`, parseError.message);
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
                    console.error(`Error executing tool ${functionName}:`, error.message);
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
        console.log(' Messages array before final API call:');
        messages.forEach((msg, idx) => {
            if (!msg.role) {
                console.error(` Message at index ${idx} is missing role field:`, msg);
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
        console.log('Making final streaming API call with tool results...');
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

        console.log(' Final streaming completed. Total length:', finalContent.length);

        if (!finalContent || !finalContent.trim()) {
            console.warn('AI returned empty response after tool execution!');

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
                    fallbackResponse += ` ${result.error}\n\n`;
                } else if (Array.isArray(result)) {
                    // List of items (requirements, user stories, etc.)
                    fallbackResponse += `Found ${result.length} item(s).\n\n`;
                } else if (typeof result === 'object') {
                    // Other structured data
                    fallbackResponse += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n`;
                }
            });

            yield fallbackResponse;
            console.log('Yielded fallback with tool data');
        } else {
            console.log('Final Message Respond: ' + finalContent.substring(0, 100) + '...');
        }
    } else {
        console.log('Message Respond: ' + fullContent);
    }
}


async function getChatSummary(conversationHistory) {

    if (conversationHistory == null || conversationHistory === "") {
        return
    }

    try {
        const messages = [
            { role: 'system', content: agentPrompts.system_prompt },
            {
                role: 'user',
                content:
                    'Analyze the following chat history and summarize the chat between the user and the AI agent in two small paragraphs, output as plain text only:\n\n' +
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

async function createChatName(conversationHistory) {

    if (conversationHistory == null) {
        console.error("No chatHistory is given for function createChatName")
        return
    }

    try {
        const messages = [
            { role: 'system', content: agentPrompts.system_prompt },
            {
                role: 'user',
                content:
                    'Analyze the following chat thread and give a short chat name (at most 8 words) for user to identify, output only plain text:\n\n' +
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

async function getSuggestedNextAction(projectID, chatID) {

    let conversationHistory = await fetchChatThread(projectID, chatID)
    // Validate input
    if (!conversationHistory) {
        console.error("No conversation history provided for getSuggestedNextAction");
        return null;
    }

    try {
        const messages = [
            {
                role: 'system',
                content: agentPrompts.system_prompt
            },
            {
                role: 'user',
                content: `Analyze the following chat conversation and suggest three relevant next actions the user could take.

Return your response as a JSON array with this exact structure:
[
  {"seq": "1", "content": "Brief description of first action"},
  {"seq": "2", "content": "Brief description of second action"},
  {"seq": "3", "content": "Brief description of third action"}
]

Conversation history:
${conversationHistory}

Respond with only the JSON array, keep it short and no additional text.
No need to suggest for file upload and document analysis as this request can only be performed by user.
Keep the suggestion inline with requirements gathering topic.`
            }
        ];

        const completion = await client.chat.completions.create({
            model: 'grok-4-1-fast-non-reasoning',
            messages,
            temperature: 0.2,
            max_tokens: 1500,
        });

        const responseContent = completion.choices[0]?.message?.content;

        if (!responseContent) {
            console.error('No response content received from API');
            return null;
        }

        console.log('API Response:', responseContent);

        // Parse and validate JSON response
        try {
            const suggestions = JSON.parse(responseContent);

            if (!Array.isArray(suggestions) || suggestions.length === 0) {
                console.error('Invalid suggestions format received');
                return null;
            }

            await aiDB.updateSuggestedAction(projectID, chatID, suggestions)

            return suggestions;
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError.message);
            console.error('Raw response:', responseContent);
            return null;
        }

    } catch (error) {
        console.error('Error in getSuggestedNextAction:', error.message);

        if (error.response) {
            console.error('API Error Status:', error.response.status);
            console.error('API Error Data:', error.response.data);
        }

        // Re-throw if you want calling code to handle it, or return null
        return null;
    }
}

module.exports = {

    getChatSummary,
    createChatName,
    getStreamingResponse,
    getStreamingResponseThreeStage,
    parseRequirementsToJSON,
    // Requirement analysis
    requirementAnalysisModel,
    getSuggestedNextAction
}

