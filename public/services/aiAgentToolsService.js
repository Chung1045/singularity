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

    // async get_chat_memory(projectID, chatID) {
    //     return await aiDB.getConversationRecall(projectID, chatID);
    // },

    async get_project_file_list(projectID) {
        return [{
            "documentName": "requirementsGathering.txt",
            "documentID": "0a0cf490-6408-49fc-a44d-b30063d804dc"
        }]
    },

    async get_project_file_content(projectID, documentID) {
        // for now return fake data first
        const content = `
        What are Functional Requirements?
Functional requirements define the specific features and operations a system must perform to meet business and user needs. They describe what the system should do and how it should interact with users or other systems.

Focus on system behavior and functionality.
Represent the features that can be directly observed and tested in the final product.
Common examples include user authentication, data processing, search, payment handling, and report generation.
Sample Questions
What features should the system include?
What edge cases must be considered in the design?
What are Non-Functional Requirements?
Non-functional requirements (NFRs) define how a system should operate, focusing on performance, reliability, and user experience rather than specific features. They ensure the system is efficient, secure, and maintainable over time.

Performance – speed and responsiveness
Security – protection against unauthorized access
Usability – ease of use
Reliability – system stability and availability
Scalability – ability to handle growth
Maintainability – ease of updates and fixes
Portability – ability to run in different environments
Sample Questions
How fast should the system respond to user actions?
How secure should it be against unauthorized access?
How available and reliable should the system be?
Extended Requirements.
Examples of Functional and Non-functional Requirements
Let's consider a couple of examples to illustrate both types of requirements:

1. Online Banking System
Functional Requirements:
Users should be able to log in with their username and password.
Users should be able to check their account balance.
Users should receive notifications after making a transaction.
Non-functional Requirements:
The system should respond to user actions in less than 2 seconds.
All transactions must be encrypted and comply with industry security standards.
The system should be able to handle 100 million users with minimal downtime.
2. Food Delivery App
Functional Requirements
Users can browse the menu and place an order.
Users can make payments and track their orders in real time.
Non-functional Requirements:
The app should load the restaurant menu in under 1 second.
The system should support up to 50,000 concurrent orders during peak hours.
The app should be easy to use for first-time users, with an intuitive interface.
Differences between Functional Requirements and Non-Functional Requirements:
Definition
Functional requirements define what the system should do, the exact features, tasks, or operations.
Non-functional requirements define how the system should perform, the qualities or attributes like speed, security, or usability.
Purpose

Functional Requirements focuses on the behavior and features of the system.
Non-Functional Requirements focuses on the performance, usability, and overall quality of the system.
Scope
Functional Requirements defines the actions and operations the system must support.
Non functional Requirements defines constraints or conditions under which those actions should occur.
Measurement
Functional requirements are easily measured by verifying outputs or results.
Non-functional requirements are harder to measure, often validated against benchmarks, metrics, or SLAs.
Impact on Development
Functional requirements drive the core design and features of the system.
Non-functional requirements influence the system architecture and performance optimization.
User Perspective
Functional requirements are directly visible to users and tied to business needs.
Non-functional requirements shape the user experience by ensuring efficiency, reliability, and smooth operation.
Documentation
Functional requirements are documented in use cases, user stories, or functional specifications.
Non-functional requirements are captured in performance criteria, technical specs, or design constraints.
Evaluation
Functional requirements are validated through functional testing (unit, integration, or acceptance tests).
Non-functional requirements are verified via performance, security, and usability testing.
Dependency
Functional requirements define what must be built to meet user needs.
Non-functional requirements define how well the system must operate once built.
Examples
Functional requirements: login authentication, data input/output, transaction processing.
Non-functional requirements: system scalability, security, response time, reliability, maintainability.
Importance of Balancing Both Functional and Non-Functional Requirements
Balancing functional and non-functional requirements ensures a system is both useful and reliable. Key benefits include:

Improves User Experience: Functional features alone may work but feel slow or hard to use. Non-functional aspects like performance, usability, and availability shape how users interact with the system.
Enhances System Performance: Scalability, reliability, and security ensure the system performs effectively under real-world conditions.
Prevents Bottlenecks and Failures: Proper attention to non-functional needs reduces outages, security breaches, and downtime.
Reduces Long-Term Costs: Addressing non-functional requirements early avoids expensive redesign, rework, or performance fixes later.
Supports System Evolution: Maintainability and extensibility allow the system to scale and adapt smoothly as business and user needs grow.
Common Challenges in Defining these Requirements
Defining functional and non-functional requirements can be complex due to several challenges:

Ambiguity in Requirements: Vague or incomplete requirements make it difficult to define what the system must do (functional) and how it should perform (non-functional).
Changing Requirements: Evolving business goals, market trends, or user expectations can shift requirements, making it harder to maintain stable design.
Difficulty in Prioritization: Functional requirements often take precedence, while critical non-functional aspects like security or scalability may be overlooked.
Measuring Non-Functional Requirements: Functional needs are easier to test; non-functional attributes like usability, scalability, or reliability are harder to quantify and validate.
Overlapping or Conflicting Requirements: Some requirements may conflict, such as stronger security potentially impacting system performance, requiring careful trade-offs.
How to Gather Functional and Non-functional Requirements
Gathering requirements involves multiple approaches and collaboration between the development team, stakeholders, and end-users:

1. Functional Requirements:
Interviews: Talk to stakeholders or users to understand their needs.
Surveys: Distribute questionnaires to gather input from a larger audience.
Workshops: Host sessions to brainstorm features and gather feedback.
2. Non-functional Requirements:
Performance Benchmarks: Consult with IT teams to set expectations for performance and load.
Security Standards: Consult with security experts to define the best practices for data protection.
Usability Testing: Test the system to find areas where users might struggle and refine the interface.`

        return content
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
