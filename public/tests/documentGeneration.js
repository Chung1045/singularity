const fs = require("fs");
const fss = require("../services/fsServices")
const aiDB = require("../services/aiAgentDBService")
const projectDB = require("../services/projectDBService")
const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    WidthType,
    TableLayoutType
} = require("docx");

const projectID = "a3548cc9-8756-424e-b05d-e11dc34be463";

const requirements =  [
    {
        id: 1,
        title: "Multi-modal LLM Chat Interface",
        description: "User can chat with the multimodal LLM agent with files as context within the project workspace. The system should support text, images, and document uploads.",
        source: "Requirements Specification v2.3.docx",
        referencedDocs: [
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 11, paragraph 3" },
            { documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", location: "Page 5, section 2.1" }
        ],
        storyReferences: [{
            storyID: "a76ce9d1-13be-430c-9377-b895224f8c1f", storySeq: 1
        }]
    },
    {
        id: 2,
        title: "Real-time Collaboration Features",
        description: "Multiple users should be able to work on the same project simultaneously with live updates and conflict resolution mechanisms.",
        source: "Stakeholder Interview Notes.docx",
        referencedDocs: [
            { documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", location: "Page 2, paragraph 7" },
            { documentID: "d4e5f6a7-b8c9-0123-def1-234567890123", location: "Section 3.4" }
        ],
        storyReferences: [

        ]
    },
    {
        id: 3,
        title: "Document Version Control",
        description: "System must maintain a complete history of all document changes with the ability to revert to previous versions and compare differences between versions.",
        source: "Technical Constraints.pdf",
        referencedDocs: [
            { documentID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", location: "Page 8, requirement TC-012" }
        ],
        storyReferences: [

        ]
    },
    {
        id: 4,
        title: "Advanced Search and Filtering",
        description: "Users need semantic search capabilities across all project documents with filters for date, type, author, and content relevance.",
        source: "User Research Findings.docx",
        referencedDocs: [
            { documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", location: "Page 15, user feedback section" },
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 22, paragraph 5" }
        ],
        storyReferences: [

        ]
    },
    {
        id: 5,
        title: "Export to Multiple Formats",
        description: "The system should support exporting requirements and user stories to PDF, Word, Markdown, and JSON formats with customizable templates.",
        source: "Requirements Specification v2.3.docx",
        referencedDocs: [
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 18, section 4.3" }
        ],
        storyReferences: [

        ]
    },
    {
        id: 6,
        title: "Role-Based Access Control",
        description: "Implement granular permissions system allowing administrators to control access at project, document, and feature levels based on user roles.",
        source: "System Architecture Design.pdf",
        referencedDocs: [
            { documentID: "d4e5f6a7-b8c9-0123-def1-234567890123", location: "Section 5.2, security requirements" },
            { documentID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", location: "Page 3, compliance section" }
        ],
        storyReferences: [
            {
                storyID: "a76ce9d1-13be-430c-9377-b895224f8c1f", storySeq: 2
            }
        ]
    },
    {
        id: 7,
        title: "Automated Requirement Validation",
        description: "AI-powered validation to check requirements for completeness, consistency, and adherence to best practices with suggestions for improvement.",
        source: "Requirements Specification v2.3.docx",
        referencedDocs: [
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 25, quality assurance" }
        ],
        storyReferences: [

        ]
    },
    {
        id: 8,
        title: "Integration with Project Management Tools",
        description: "Bi-directional sync with Jira, Asana, and Trello to keep requirements and tasks synchronized across platforms.",
        source: "Technical Constraints.pdf",
        referencedDocs: [
            { documentID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", location: "Page 12, integration requirements" },
            { documentID: "d4e5f6a7-b8c9-0123-def1-234567890123", location: "Section 6.1" }
        ],
        storyReferences: [

        ]
    },
    {
        id: 9,
        title: "Custom Reporting Dashboard",
        description: "Configurable dashboard displaying project metrics, requirement coverage, completion status, and team productivity analytics.",
        source: "Stakeholder Interview Notes.docx",
        referencedDocs: [
            { documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", location: "Page 8, stakeholder needs" },
            { documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", location: "Page 20, analytics requirements" }
        ],
        storyReferences: [

        ]
    },
    {
        id: 10,
        title: "Mobile Application Support",
        description: "Native mobile applications for iOS and Android with offline capability and sync functionality for reviewing and commenting on requirements.",
        source: "User Research Findings.docx",
        referencedDocs: [
            { documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", location: "Page 28, mobile user needs" },
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 30, platform requirements" }
        ],
        storyReferences: [

        ]
    }
]

const userStories = [
    {
        id: 1,
        title: "Chat with Context-Aware AI Assistant",
        storyRole: "Project Manager",
        content: "As a product manager, I want to chat with an AI assistant that has access to all my project documents so that I can quickly get answers without manually searching through files.",
        source: "User Research Findings.docx",
        referencedDocs: [
            { documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", location: "Page 5, interview transcript" },
            { documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", location: "Page 3, pain points" }
        ]
    },
    {
        id: 2,
        title: "Collaborate in Real-Time",
        storyRole: "End user",
        content: "As a team member, I want to see my colleagues' changes in real-time so that we can work together efficiently without stepping on each other's toes.",
        source: "Stakeholder Interview Notes.docx",
        referencedDocs: [
            { documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", location: "Page 6, collaboration needs" }
        ]
    },
    {
        id: 3,
        title: "Review Documents Offline",
        storyRole: "Field consultant",
        content: "As a field consultant, I want to download and review project requirements offline so that I can work during travel without internet connectivity.",
        source: "User Guide.pdf",
        referencedDocs: [
            { documentID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", location: "Page 12, mobile requirements" },
            { documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", location: "Page 15, offline capabilities" }
        ]
    },
    {
        id: 4,
        title: "Generate Custom Reports",
        storyRole: "Project Manager",
        content: "As a project manager, I want to generate customized reports with specific metrics and filters so that I can present progress to stakeholders in the format they prefer.",
        source: "Meeting Notes 2024-01.pdf",
        referencedDocs: [
            { documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", location: "Page 4, reporting needs" }
        ]
    },
    {
        id: 5,
        title: "Track Requirement Changes",
        storyRole: "Quality Assurance lead",
        content: "As a quality assurance lead, I want to see a history of all changes made to requirements so that I can ensure compliance and audit trail requirements are met.",
        source: "Test Plan.docx",
        referencedDocs: [
            { documentID: "d4e5f6a7-b8c9-0123-def1-234567890123", location: "Page 7, audit requirements" },
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 9, version control" }
        ]
    },
    {
        id: 6,
        title: "Export Requirements to Jira",
        storyRole: "Development team lead",
        content: "As a development team lead, I want to export requirements directly to Jira as user stories so that I can quickly create development tasks without manual re-entry.",
        source: "API Documentation.docx",
        referencedDocs: [
            { documentID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", location: "Page 22, integration APIs" }
        ]
    },
    {
        id: 7,
        title: "Search Across All Documents",
        storyRole: "Business analyst",
        content: "As a business analyst, I want to search for keywords across all project documents simultaneously so that I can find relevant information quickly without opening each file.",
        source: "Design Mockups.docx",
        referencedDocs: [
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 16, search interface design" }
        ]
    },
    {
        id: 8,
        title: "Set Permission Levels",
        storyRole: "Administrator",
        content: "As an administrator, I want to set granular permission levels for different user roles so that I can control who can view, edit, or delete specific requirements.",
        source: "User Guide.pdf",
        referencedDocs: [
            { documentID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", location: "Page 5, security settings" },
            { documentID: "d4e5f6a7-b8c9-0123-def1-234567890123", location: "Page 3, access control" }
        ]
    },
    {
        id: 9,
        title: "Validate Requirements Automatically",
        storyRole: "Requirements Engineer",
        content: "As a requirements engineer, I want the system to automatically check my requirements for completeness and consistency so that I can identify gaps before stakeholder review.",
        source: "Test Plan.docx",
        referencedDocs: [
            { documentID: "d4e5f6a7-b8c9-0123-def1-234567890123", location: "Page 11, validation criteria" }
        ]
    },
    {
        id: 10,
        title: "Receive Real-time Notifications",
        storyRole: "End user",
        content: "As a stakeholder, I want to receive notifications when requirements that affect my area are changed so that I can stay informed without constantly checking the system.",
        source: "Meeting Notes 2024-01.pdf",
        referencedDocs: [
            { documentID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", location: "Page 9, communication preferences" },
            { documentID: "550e8400-e29b-41d4-a716-446655440000", location: "Page 14, notification design" }
        ]
    }
]

async function createRequirementTable(requirement) {
    // Generate paragraphs for each document reference
    const referencedDocsParagraphs = [];

    if (requirement.referencedDocs && requirement.referencedDocs.length > 0) {
        for (const doc of requirement.referencedDocs) {
            const metadata = await fss.getFileMetadata(doc.documentID, "a3548cc9-8756-424e-b05d-e11dc34be463");
            referencedDocsParagraphs.push(
                new Paragraph({
                    text: `${metadata.documentName}.${metadata.documentExt} (${doc.location})`,
                    bullet: { level: 0 },
                })
            );
        }
    } else {
        referencedDocsParagraphs.push(new Paragraph("None"));
    }

    const referencedStoryParagraphs = [];
    if (requirement.storyReferences && requirement.storyReferences.length > 0) {
        for (const story of requirement.storyReferences) {
            const info = await aiDB.getStoryTitle(story.storyID, "a3548cc9-8756-424e-b05d-e11dc34be463")
            referencedStoryParagraphs.push(
                new Paragraph({
                    text: `Story ${story.storySeq} (${info.storyTitle})`,
                    bullet: { level: 0 },
                })
            );
        }
    } else {
        referencedStoryParagraphs.push(new Paragraph("None"));
    }


    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },

        // Fix column layout — keeps cells from resizing when text is long
        layout: TableLayoutType.FIXED,

        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Requirement ID")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [new Paragraph(`${requirement.id}`)],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Requirement Title")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                text: `${requirement.title}`,
                            }),
                        ],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Requirement Description")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                text: `${requirement.description}`,
                            }),
                        ],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Requirement Source")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [
                            new Paragraph("Document"),
                        ],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Referenced Documents")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: referencedDocsParagraphs,
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Referenced Story")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: referencedStoryParagraphs,
                    }),
                ],
            }),
        ],
    });
}

async function createUserStoryTable(story) {
    // Generate paragraphs for each document reference
    const referencedDocsParagraphs = [];

    if (story.referencedDocs && story.referencedDocs.length > 0) {
        for (const doc of story.referencedDocs) {
            const metadata = await fss.getFileMetadata(doc.documentID, "a3548cc9-8756-424e-b05d-e11dc34be463");
            referencedDocsParagraphs.push(
                new Paragraph({
                    text: `${metadata.documentName}.${metadata.documentExt} (${doc.location})`,
                    bullet: { level: 0 },
                })
            );
        }
    } else {
        referencedDocsParagraphs.push(new Paragraph("None"));
    }

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,

        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Story Sequence")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [new Paragraph(`Story ${story.id.toString().padStart(3, "0")}`)],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Story Role")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                text: `${story.storyRole}`,
                            }),
                        ],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Story Title")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                text: `${story.title}`,
                            }),
                        ],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Story Content")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                text: `${story.content}`,
                            }),
                        ],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Story Source")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: [
                            new Paragraph(story.source),
                        ],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3000, type: WidthType.DXA },
                        children: [new Paragraph("Referenced Documents")],
                    }),
                    new TableCell({
                        width: { size: 7000, type: WidthType.DXA },
                        children: referencedDocsParagraphs,
                    }),
                ],
            }),
        ],
    });
}

async function generateRequirementsDocument(projectID, requirements) {
    const projectName = await projectDB.fetchProjectName(projectID);

    const requirementDocContent = [
        new Paragraph({
            children: [
                new TextRun({
                    text: projectName,
                    size: 32,
                    bold: true
                })
            ]
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: "Project Requirements Report",
                    size: 24
                })
            ]
        }),
        new Paragraph(`Generated by Singularity AI: ${new Date().toLocaleString()}`),
        new Paragraph(""), // spacing
    ];

    for (const requirement of requirements) {
        requirementDocContent.push(await createRequirementTable(requirement));
        requirementDocContent.push(new Paragraph("")); // spacing
    }

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: requirementDocContent,
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("requirements.docx", buffer);
    console.log("Requirements document created successfully");
}

async function generateUserStoriesDocument(projectID, userStories) {
    const projectName = await projectDB.fetchProjectName(projectID);

    const userStoryDocContent = [
        new Paragraph({
            children: [
                new TextRun({
                    text: projectName,
                    size: 32,
                    bold: true
                })
            ]
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: "Project User Stories Report",
                    size: 24
                })
            ]
        }),
        new Paragraph(`Generated by Singularity AI: ${new Date().toLocaleString()}`),
        new Paragraph(""), // spacing
    ];

    for (const story of userStories) {
        userStoryDocContent.push(await createUserStoryTable(story));
        userStoryDocContent.push(new Paragraph("")); // spacing
    }

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: userStoryDocContent,
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("user_stories.docx", buffer);
    console.log("User stories document created successfully");
}

generateRequirementsDocument(projectID, requirements);
generateUserStoriesDocument(projectID, userStories);

module.exports = {
    generateRequirementsDocument,
    generateUserStoriesDocument
}
