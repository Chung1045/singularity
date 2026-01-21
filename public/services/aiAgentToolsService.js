const fss = require("./fsServices")

const tools = [
    {
        type: "function",
        function: {
            name: "get_project_file_list",
            description: "Retrieve file list from a project",
            parameters: {
                type: "object",
                properties: {
                    projectID: {
                        type: "string",
                        description: "The ID of the project"
                    },
                },
                required: ["projectID"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_project_file_content",
            description: "Retrieve a file from a project",
            parameters: {
                type: "object",
                properties: {
                    projectID: {
                        type: "string",
                        description: "The ID of the project"
                    },
                    documentID: {
                        type: "string",
                        description: "The ID of the document file to retrieve"
                    },
                },
                required: ["projectID", "documentID"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_software_requirements_list",
            description: "Get the list of current software requirements list of the project",
            parameters: {
                type: "object",
                properties: {
                    projectID: {
                        type: "string",
                        description: "The ID of the project"
                    },
                },
                required: ["projectID"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_user_stories_list",
            description: "Get the list of current user stories of the project",
            parameters: {
                type: "object",
                properties: {
                    projectID: {
                        type: "string",
                        description: "The ID of the project"
                    },
                },
                required: ["projectID"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_software_requirements_return_format",
            description: "Get the exact JSON format structure that should be used when creating or updating software requirements",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_requirement_source_update_format",
            description: "Get the exact JSON format structure that should be used when inserting updating software requirements document source reference",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_requirement_story_update_format",
            description: "Get the exact JSON format structure that should be used when inserting updating software requirements story source reference",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_user_stories_return_format",
            description: "Get the exact JSON format structure that should be used when creating or updating user stories",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_story_source_update_format",
            description: "Get the exact JSON format structure that should be used when inserting or updating user stories document source reference",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "search_chat_history",
            description: "Search for chat history with the given keyword within the chat",
            parameters: {
                type: "object",
                properties: {
                    keyword: {
                        type: "string",
                        description: "The keyword or string to search for the chat history"
                    },
                },
                required: ["keyword"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_software_requirements",
            description: "Create, update, or delete software requirements in a project. Accepts a list of requirement operations (INSERT, UPDATE, or DELETE). Use get_software_requirements_format tool to see the exact format required.",
            parameters: {
                type: "object",
                properties: {
                    projectID: {
                        type: "string",
                        description: "The ID of the project"
                    },
                    jsonList: {
                        type: "array",
                        description: "Array of requirement operations to perform. please refer to get_software_requirements_format to see the required format."
                    }
                },
                required: ["projectID", "jsonList"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_requirements_source_ref",
            description: "Insert, update, or delete software requirements document reference in a project. Accepts a list of requirement operations (INSERT, UPDATE, or DELETE). Use get_requirement_source_update_format() tool to see the exact format required.",
            parameters: {
                type: "object",
                properties: {
                    jsonList: {
                        type: "array",
                        description: "Array of requirement document source operations to perform. please refer to get_requirement_source_update_format() to see the required format."
                    }
                },
                required: ["jsonList"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_requirements_story_ref",
            description: "Insert, or delete software requirements story reference in a project. Accepts a list of requirement operations (INSERT, or DELETE). Use get_requirement_story_update_format() tool to see the exact format required.",
            parameters: {
                type: "object",
                properties: {
                    jsonList: {
                        type: "array",
                        description: "Array of requirement document source operations to perform. please refer to get_requirement_story_update_format() to see the required format."
                    }
                },
                required: ["jsonList"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_user_stories",
            description: "Create, update, or delete user stories in a project. Accepts a list of user story operations (INSERT, UPDATE, or DELETE) in the specified JSON format.",
            parameters: {
                type: "object",
                properties: {
                    projectID: {
                        type: "string",
                        description: "The ID of the project"
                    },
                    jsonList: {
                        type: "array",
                        description: "Array of user story operations to perform, please refer to get_user_stories_return_format to see the required format."
                    }
                },
                required: ["projectID", "jsonList"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_user_stories_source_ref",
            description: "Insert, update, or delete user stories document reference in a project. Accepts a list of requirement operations (INSERT, UPDATE, or DELETE). Use get_story_source_update_format() tool to see the exact format required.",
            parameters: {
                type: "object",
                properties: {
                    jsonList: {
                        type: "array",
                        description: "Array of user stories document source operations to perform. please refer to get_story_source_update_format() to see the required format."
                    }
                },
                required: ["jsonList"]
            }
        }
    }
];

// Local implementations mapped by name
const aiDB = require("./aiAgentDBService")
const toolImpls = {

    async get_project_file_list(projectID) {
        const files = await fss.listProjectFiles(projectID);

        return files.map(file => ({
            documentName: file.documentName + file.documentExt,
            documentID: file.documentID
        }));
    },

    async get_project_file_content(projectID, documentID) {
        try {
            console.log(`🔍 Fetching file content: projectID=${projectID}, documentID=${documentID}`);
            const content = await fss.getFileContext(projectID, documentID);

            if (!content || content === "Context is not available.") {
                console.warn(`⚠️  File content not available for documentID: ${documentID}`);
                return {
                    error: "File content is not available. The file may not have been processed yet, or it may be in an unsupported format.",
                    documentID: documentID
                };
            }

            console.log(`✅ Successfully retrieved file content (${content.length} characters)`);
            return {
                documentID: documentID,
                content: content,
                contentLength: content.length
            };
        } catch (error) {
            console.error(`❌ Error in get_project_file_content:`, error.message);
            return {
                error: `Failed to retrieve file content: ${error.message}`,
                documentID: documentID
            };
        }
    },

    async get_software_requirements_list(projectID) {
        return await aiDB.getProjectRequirements(projectID)
    },

    async get_user_stories_list(projectID) {
        return await aiDB.getProjectUserStories(projectID)
    },

    async get_software_requirements_return_format() {
        return {
            description: "This is the required JSON format for software requirements",
            format: {
                operation: "string ('UPDATE', 'INSERT' or 'DELETE')",
                requirementID: "string (UUID format, empty string when operation is 'INSERT')",
                details: {
                    requirementType: "string (either 'functional' or 'non-functional')",
                    requirementSeq: "integer (Sequence number of the functional / non-functional requirement, empty when operation is 'INSERT')",
                    title: "string (brief title of the requirement)",
                    description: "string (detailed description)",
                    role: "string (Role of the user which likely to come up with the requirement)",
                    source: "string (either 'Document' or 'User Input')",
                },
            },
            examples: [
                {
                    operation: "INSERT",
                    requirementID: "",  // Empty for INSERT
                    details: {
                        requirementType: "functional",
                        requirementSeq: null, // Empty for INSERT
                        title: "User Login Authentication",
                        description: "Users should be able to log in with their username and password",
                        role: "End User",
                        source: "Document",
                    }
                },
                {
                    operation: "UPDATE",
                    requirementID: "550e8400-e29b-41d4-a716-446655440000",
                    details: {
                        requirementType: "functional",
                        requirementSeq: 5,
                        title: "Enhanced User Login Authentication",
                        description: "Users should be able to log in with username, password, and 2FA",
                        role: "End User",
                        source: "User Input",
                    }
                },
                {
                    operation: "DELETE",
                    requirementID: "550e8400-e29b-41d4-a716-446655440000",
                    details: null  // Details not needed for DELETE
                }
            ]
        };
    },

    async get_user_stories_return_format() {
        return {
            description: "This is the required JSON format for user stories",
            format: {
                operation: "string ('UPDATE', 'INSERT' or 'DELETE')",
                storyID: "string (UUID format, empty string when operation is 'INSERT')",
                details: {
                    storySeq: "integer (The sequence number of the user story, empty when the operation is 'INSERT')",
                    role: "string (The role that the user story likely to come up with)",
                    title: "string (brief title of the user story)",
                    description: "string (detailed description in user story format: 'As a [role], I want [goal] so that [benefit]')",
                    source: "string (either 'Document' or 'User Input')",
                    sourceReference: [{
                        operation: "string ('UPDATE, 'INSERT' or 'DELETE')",
                        documentID: "string (UUID of source document if source is 'Document')",
                        remarks: "string",
                        location: "string (page number, line number, or section where requirement was found)"
                    }],
                },
            },
            examples: [
                {
                    operation: "INSERT",
                    storyID: "",  // Empty for INSERT
                    details: {
                        storySeq: "",  // Empty for INSERT
                        role: "End User",
                        title: "Login to Access Account",
                        description: "As an end user, I want to log in with my username and password so that I can access my personal account securely",
                        source: "Document",
                        sourceReference: [{
                            operation: "INSERT",
                            documentID: "0a0cf490-6408-49fc-a44d-b30063d804dc",
                            remarks: "",
                            location: "Line 45-48"
                        }]
                    }
                },
                {
                    operation: "UPDATE",
                    storyID: "660e8400-e29b-41d4-a716-446655440001",
                    details: {
                        storySeq: 3,
                        role: "End User",
                        title: "Login with Two-Factor Authentication",
                        description: "As an end user, I want to log in with username, password, and 2FA so that my account has enhanced security",
                        source: "User Input",
                        sourceReference: [{
                            operation: "UPDATE",
                            documentID: "9fe99745-b68c-45a9-9709-8bafaa527b9b",
                            remarks: "Was from document, and updated from user request",
                            location: "Page 43, line 5"
                        }]
                    }
                },
                {
                    operation: "DELETE",
                    storyID: "660e8400-e29b-41d4-a716-446655440001",
                    details: null  // Details not needed for DELETE
                }
            ]
        };
    },

    async get_requirement_source_update_format() {
        return {
            description: "This is the required JSON format for updating requirement document source",
            format: {
                projectID: "string (UUID format, projectID)",
                requirementID: "string (UUID format, ID of the requirement to link with the story source)",
                sourceReference: [
                    {
                        operation: "string (UPDATE, 'INSERT', or 'DELETE')",
                        documentID: "string (documentID of the source reference in uuid format)",
                        remarks: "string (remarks of the source reference, empty for 'DELETE')",
                        location: "string (Location of the source reference, empty for 'DELETE')"
                    }
                ]
            },
            examples: [
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    requirementID: "12345678-1234-5678-1234-567812345678",
                    sourceReference: [
                        {
                            operation: "INSERT",
                            documentID: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                            remarks: "Section 3.2 defines the authentication requirements",
                            location: "Page 15, Section 3.2"
                        }
                    ]
                },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    requirementID: "23456789-2345-6789-2345-678923456789",
                    sourceReference: [
                        {
                            operation: "UPDATE",
                            documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
                            remarks: "Updated to reflect the revised API endpoint requirements discussed in Q1 meeting",
                            location: "Section 4, Bullet point 3"
                        }
                    ]
                },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    requirementID: "34567890-3456-7890-3456-789034567890",
                    sourceReference: [
                        {
                            operation: "DELETE",
                            documentID: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                            remarks: "",
                            location: ""
                        }
                    ]
                },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    requirementID: "45678901-4567-8901-4567-890145678901",
                    sourceReference: [
                        {
                            operation: "INSERT",
                            documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            remarks: "New API endpoint documented for user authentication",
                            location: "Line 45-67"
                        },
                        {
                            operation: "UPDATE",
                            documentID: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                            remarks: "Updated table schema to include new fields",
                            location: "Table: users, Lines 12-15"
                        },
                        {
                            operation: "DELETE",
                            documentID: "550e8400-e29b-41d4-a716-446655440000",
                            remarks: "",
                            location: ""
                        }
                    ]
                }
            ]
        }
    },

    async get_requirement_story_update_format() {
        return {
            description: "This is the required JSON format for updating requirement story source",
            format: {
                projectID: "string (UUID format, projectID)",
                requirementID: "string (UUID format, ID of the requirement to link with the source)",
                sourceReference: [
                    {
                        operation: "string ('INSERT' or 'DELETE')",
                        storyID: "string (ID of the story ID that references it)"
                    }
                ]
            },
            examples: [
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    requirementID: "12345678-1234-5678-1234-567812345678",
                    sourceReference: [
                        {
                            operation: "INSERT",
                            storyID: "9223ed5d-7bc8-419e-826d-22de5741c1b7"
                        }
                    ]
                },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    requirementID: "23456789-2345-6789-2345-678923456789",
                    sourceReference: [
                        {
                            operation: "DELETE",
                            storyID: "72fb74b8-bf02-4660-ba1c-0e4bc235e0d0"
                        }
                    ]
                },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    requirementID: "45678901-4567-8901-4567-890145678901",
                    sourceReference: [
                        {
                            operation: "INSERT",
                            storyID: "72fb74b8-bf02-4660-ba1c-0e4bc235e0d0"
                        },
                        {
                            operation: "INSERT",
                            storyID: "f8a814f2-aa39-4780-af70-f8979fbaf8dc"
                        },
                        {
                            operation: "DELETE",
                            storyID: "c7692d4b-f837-4114-b313-b6b13ac9a0b0"
                        }
                    ]
                }
            ]
        }
    },

    async get_story_source_update_format() {
        return {
            description: "This is the required JSON format for updating user story document source",
            format: {
                projectID: "string (UUID format, projectID)",
                storyID: "string (UUID format, ID of the requirement to link with the story source)",
                sourceReference: [
                    {
                        operation: "string ('UPDATE', 'INSERT', or 'DELETE')",
                        documentID: "string (documentID of the source reference in uuid format)",
                        remarks: "string (remarks of the source reference, empty for 'DELETE')",
                        location: "string (Location of the source reference, empty for 'DELETE')"
                    }
                ]
            },
            example: [{
                projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                storyID: "b1234567-89ab-cdef-0123-456789abcdef",
                sourceReference: [
                    {
                        operation: "INSERT",
                        documentID: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                        remarks: "User authentication flow described in requirements document",
                        location: "Page 12, Section 2.3"
                    }
                ]
            },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    storyID: "c2345678-9abc-def0-1234-56789abcdef0",
                    sourceReference: [
                        {
                            operation: "UPDATE",
                            documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
                            remarks: "Updated based on revised acceptance criteria from sprint planning",
                            location: "Section 5, Updated Notes"
                        }
                    ]
                },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    storyID: "d3456789-abcd-ef01-2345-6789abcdef01",
                    sourceReference: [
                        {
                            operation: "DELETE",
                            documentID: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                            remarks: "",
                            location: ""
                        }
                    ]
                },
                {
                    projectID: "a3548cc9-8756-424e-b05d-e11dc34be463",
                    storyID: "e4567890-bcde-f012-3456-789abcdef012",
                    sourceReference: [
                        {
                            operation: "INSERT",
                            documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            remarks: "API endpoint specifications for user profile management",
                            location: "Lines 89-112"
                        },
                        {
                            operation: "UPDATE",
                            documentID: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                            remarks: "Database schema updated to reflect new user fields",
                            location: "Table: user_profiles"
                        },
                        {
                            operation: "DELETE",
                            documentID: "550e8400-e29b-41d4-a716-446655440000",
                            remarks: "",
                            location: ""
                        }
                    ]
                }
            ]
        }
    },

    async update_software_requirements(projectID, jsonList) {
        return await aiDB.updateRequirements(projectID, jsonList);
    },

    async update_requirements_source_ref(jsonList) {
        return await aiDB.updateProjectRequirementSourceRef(jsonList);
    },

    async update_requirements_story_ref(jsonList) {
        return await aiDB.updateProjectRequirementStoryRef(jsonList)
    },

    async update_user_stories(projectID, jsonList) {
        return await aiDB.updateProjectUserStories(projectID, jsonList)
    },

    async update_user_stories_source_ref(jsonList) {
        return await aiDB.updateUserStorySourceRef(jsonList)
    },

    async search_chat_history(projectID, chatID, keyword) {
        return await aiDB.searchChatHistory(projectID, chatID, keyword)
    }

};

module.exports = {
    tools, toolImpls
}
