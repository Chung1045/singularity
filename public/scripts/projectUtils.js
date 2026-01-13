/**
 * Shared project utility functions for loading project data across all pages
 * This file should be loaded on all pages that use the Sidebar component
 */

/**
 * Fetch and display project chat history
 * @param {string} projectID - The UUID of the project
 */
async function fetchProjectChats(projectID) {
    console.log("fetchProjectChats called with ProjectID:", projectID);

    // Wait a bit for DOM to be ready if needed
    let chatHistoryContainer = document.getElementById("div-chat-history-list");

    if (!chatHistoryContainer) {
        console.log("Chat history container not found, waiting for DOM...");
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, 300));
        chatHistoryContainer = document.getElementById("div-chat-history-list");

        if (!chatHistoryContainer) {
            console.error("Chat history container still not found on this page after retry");
            return;
        }
        console.log("Chat history container found after waiting");
    } else {
        console.log("Chat history container found immediately");
    }

    console.log("Clearing chat history container...");
    chatHistoryContainer.innerHTML = '';

    let data = null;

    try {
        console.log("Fetching chat data from API...");
        const response = await fetch('/api/agent/all-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectID: projectID
            })
        });

        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);

        if (response.ok) {
            data = await response.json();
            console.log("Received data:", data);

            if (data.chats && Array.isArray(data.chats)) {
                console.log("Number of chats:", data.chats.length);

                if (data.chats.length > 0) {
                    for (let chat of data.chats) {
                        console.log("Creating chat item:", chat.threadName, chat.chatID);
                        const chatHistoryElement = createChatHistoryItem(chat.threadName, chat.chatID);

                        const wrapper = document.createElement('div');
                        chatHistoryContainer.appendChild(wrapper);

                        const root = ReactDOM.createRoot(wrapper);
                        root.render(chatHistoryElement);
                    }
                    console.log("Successfully rendered", data.chats.length, "chat items");
                } else {
                    console.log("No chats found in response");
                }
            } else {
                console.log("No chats array in response or invalid format");
            }
        } else {
            console.error("Response not OK:", response.status, response.statusText);
            const errorText = await response.text();
            console.error("Error response:", errorText);
        }

    } catch (error) {
        console.error("Error fetching project chats:", error);
    } finally {
        const noChatHistoryLabel = document.getElementById("p-label-chat-history-no-entry");
        if (noChatHistoryLabel) {
            const hasChats = data && data.chats && data.chats.length > 0;
            noChatHistoryLabel.style.display = hasChats ? "none" : "block";
            console.log("No chat history label display:", noChatHistoryLabel.style.display);
        } else {
            console.error("No chat history label element not found");
        }
    }
}

/**
 * Create a React element for a chat history item
 * @param {string} threadName - The name of the chat thread
 * @param {string} chatID - The UUID of the chat
 */
function createChatHistoryItem(threadName, chatID) {
    return React.createElement('div', {
        className: 'sidebar-items chat-history-item',
        'data-chat-id': chatID,
        style: {
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '5px',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        onMouseEnter: (e) => {
            if (!e.currentTarget.classList.contains('selected')) {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
            }
        },
        onMouseLeave: (e) => {
            if (!e.currentTarget.classList.contains('selected')) {
                e.currentTarget.style.backgroundColor = 'transparent';
            }
        },
        onClick: (e) => {
            if (e.target.tagName !== 'IMG') {
                // Deselect all chat history items
                const allChatItems = document.querySelectorAll('.chat-history-item');
                allChatItems.forEach(item => {
                    item.classList.remove('selected');
                    item.style.backgroundColor = 'transparent';
                });

                // Select this item
                e.currentTarget.classList.add('selected');
                e.currentTarget.style.backgroundColor = '#e0e0e0';

                console.log(`Selected chat: ${threadName}, ID: ${chatID}`);

                // Check if we're on the home page
                const isHomePage = window.location.pathname === '/home';

                if (isHomePage && typeof window.loadChatThread === 'function') {
                    // On home page - load the chat thread directly
                    window.loadChatThread(chatID);
                } else {
                    // On other pages - navigate to home with chatID to auto-load
                    console.log('Navigating to home page with chatID:', chatID);
                    window.location.href = `/home?chatID=${chatID}`;
                }
            }
        }
    },
        React.createElement('p', {
            style: {
                flexGrow: 1,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        }, threadName || 'Untitled Chat'),
        React.createElement('img', {
            style: {
                padding: "4px",
                flexShrink: 0,
                borderRadius: '5px',
                transition: 'background-color 0.2s',
            },
            src: './img/more_vert_24.svg',
            alt: '',
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = '#8e8e8e';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: (e) => {
                e.stopPropagation(); // Prevent the div's onClick from firing
                console.log(`Menu clicked for ${threadName}`);
                // Add your menu logic here
            }
        })
    );
}

/**
 * Fetch and display project files
 * @param {string} projectID - The UUID of the project
 */
async function fetchProjectFiles(projectID) {
    console.log(`fetchProjectFiles called with ProjectID: ${projectID}`);

    const sourceListContainer = document.getElementById("div-project-source-list");

    if (!sourceListContainer) {
        console.log("Source list container not found on this page");
        return;
    }

    try {
        const response = await fetch('/api/project/file/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectID: projectID
            })
        });

        if (response.ok) {
            let data = await response.json();
            console.log(`Response Data: ${JSON.stringify(data)}`);

            sourceListContainer.innerHTML = '';

            if (data.files && data.files.length > 0) {
                for (let file of data.files) {
                    const fileElement = createFileItem(file.documentName, file.documentID);
                    const wrapper = document.createElement('div');
                    sourceListContainer.appendChild(wrapper);
                    const root = ReactDOM.createRoot(wrapper);
                    root.render(fileElement);
                }
            }

            const noFilesLabel = document.getElementById("p-label-project-source-no-entry");
            if (noFilesLabel) {
                noFilesLabel.style.display = (data.files && data.files.length > 0) ? "none" : "block";
            }
        }
    } catch (error) {
        console.error("Error fetching project files:", error);
    }
}

/**
 * Create a React element for a file item
 * @param {string} fileName - The name of the file
 * @param {string} documentID - The UUID of the document
 */
function createFileItem(fileName, documentID) {
    return React.createElement('div', {
        className: 'sidebar-items source-item',
        'data-document-id': documentID,
        style: {
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '5px',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        onMouseEnter: (e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
        },
        onMouseLeave: (e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
        },
        onClick: (e) => {
            // Prevent the div click when clicking the checkbox
            if (e.target.type !== 'checkbox') {
                console.log(`Clicked on ${fileName}`);
            }
        }
    },
        React.createElement('input', {
            type: 'checkbox',
            style: {
                width: "16px",
                height: "16px",
                flexShrink: 0
            },
            onChange: (e) => {
                console.log(`Checkbox ${e.target.checked ? 'checked' : 'unchecked'} for ${fileName}`);
                // Call getSelectedSource if it exists
                if (typeof window.getSelectedSource === 'function') {
                    window.getSelectedSource();
                }
            },
            onClick: (e) => {
                e.stopPropagation();
            }
        }),
        React.createElement('p', {
            style: {
                flexGrow: 1,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        }, fileName),
        React.createElement('img', {
            style: {
                padding: "4px",
                flexShrink: 0,
                borderRadius: '5px',
                transition: 'background-color 0.2s',
            },
            src: './img/more_vert_24.svg',
            alt: '',
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = '#8e8e8e';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: (e) => {
                e.stopPropagation();
                console.log(`Menu clicked for ${fileName}`);
                // Add your menu logic here
            }
        })
    );
}

/**
 * Fetch and display project reports
 * @param {string} projectID - The UUID of the project
 */
async function fetchProjectReports(projectID) {
    console.log(`fetchProjectReports called with ProjectID: ${projectID}`);

    const reportsListContainer = document.getElementById("div-project-requirements-list");

    if (!reportsListContainer) {
        console.log("Reports list container not found on this page");
        return;
    }

    try {
        const response = await fetch('/api/project/report/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectID: projectID
            })
        });

        if (response.ok) {
            let data = await response.json();
            console.log(`Response Data: ${JSON.stringify(data)}`);

            reportsListContainer.innerHTML = '';

            if (data.reports && data.reports.length > 0) {
                for (let report of data.reports) {
                    const reportElement = createReportItem(report.reportName, report.reportID);
                    const wrapper = document.createElement('div');
                    reportsListContainer.appendChild(wrapper);
                    const root = ReactDOM.createRoot(wrapper);
                    root.render(reportElement);
                }
            }

            const noReportsLabel = document.getElementById("p-label-project-requirements-no-entry");
            if (noReportsLabel) {
                noReportsLabel.style.display = (data.reports && data.reports.length > 0) ? "none" : "block";
            }
        }
    } catch (error) {
        console.error("Error fetching project reports:", error);
    }
}

/**
 * Create a React element for a report item
 * @param {string} reportName - The name of the report
 * @param {string} reportID - The UUID of the report
 */
function createReportItem(reportName, reportID) {
    return React.createElement('div', {
        style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
            fontSize: '14px',
            color: '#1c1d21',
            marginBottom: '4px'
        },
        onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f5f5f5',
        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
        onClick: () => {
            console.log('Report clicked:', reportID);
            if (typeof window.viewReport === 'function') {
                window.viewReport(reportID);
            }
        }
    },
        React.createElement('span', {
            style: {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
            },
            title: reportName
        }, reportName),
        React.createElement('img', {
            src: './img/more_vert_24.svg',
            alt: 'Options',
            style: {
                width: '20px',
                height: '20px',
                marginLeft: '8px',
                flexShrink: 0
            },
            onClick: (e) => {
                e.stopPropagation();
                console.log('Report options clicked:', reportID);
            }
        })
    );
}

// Make functions available globally
window.fetchProjectChats = fetchProjectChats;
window.fetchProjectFiles = fetchProjectFiles;
window.fetchProjectReports = fetchProjectReports;

console.log("projectUtils.js loaded - functions available globally");

