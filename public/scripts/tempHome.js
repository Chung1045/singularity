const {useState} = React;

const TempHome = ({csrfToken, userInfo}) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: null,
        onCancel: null
    });

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // Add state for user avatar
    const [userAvatarUrl, setUserAvatarUrl] = useState('./img/user.svg');

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch user avatar on component mount
    React.useEffect(() => {
        async function fetchAvatar() {
            try {
                const response = await fetch('/api/profile-pic/fetch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });

                const profileImgData = await response.json();

                if (profileImgData.success && profileImgData.data) {
                    const imageData = profileImgData.data[0]?.image;
                    if (imageData) {
                        setUserAvatarUrl(imageData);
                        // Make it globally available for chat functions
                        window.userAvatarUrl = imageData;
                    }
                }
            } catch (error) {
                console.error('Error fetching avatar:', error);
                // Keep default avatar on error
            }
        }

        fetchAvatar();
    }, []);

    const isMobile = windowWidth <= 480;

    console.log("Inside TempHome component – userInfo:", userInfo);

    // Auto-load chat if navigating from another page with chatID parameter
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const chatID = params.get('chatID');

        if (chatID && typeof window.loadChatThread === 'function') {
            console.log('Auto-loading chat from URL parameter:', chatID);
            setTimeout(() => {
                window.loadChatThread(chatID);
            }, 500); // Wait for page to fully load
        }
    }, []);

    // Restore active chat from localStorage on page load
    React.useEffect(() => {
        // Only restore if no URL parameter was provided
        const params = new URLSearchParams(window.location.search);
        const urlChatID = params.get('chatID');

        if (!urlChatID) {
            // Check if user explicitly went back to initial state
            const wentBackToInitial = localStorage.getItem('wentBackToInitial');

            if (wentBackToInitial === 'true') {
                // User clicked back button, stay on initial screen
                console.log('[RESTORE] User went back to initial state, not restoring chat');
                return;
            }

            const savedChatID = localStorage.getItem('activeChatID');

            if (savedChatID) {
                console.log('[RESTORE] Chat restoration pending:', savedChatID);
                console.log('[RESTORE] Will restore after chat history loads');
                // Set a flag that restoration is pending
                window.pendingChatRestoration = savedChatID;
            } else {
                console.log('[RESTORE] No saved chat to restore. savedChatID:', savedChatID);
            }
        } else {
            console.log('[RESTORE] URL parameter provided, skipping localStorage restore');
        }
    }, []);

    const showAlert = (title, message) => {
        setModal({isOpen: true, title, message, type: 'alert', onConfirm: null, onCancel: null});
    };

    const closeModal = () => {
        setModal({isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null});
    };

    const logout = async () => {

        if (!csrfToken) {
            console.error('CSRF token not available');
            showAlert('Error', 'Security token missing. Please refresh the page.');
            return;
        }

        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: {'CSRF-Token': csrfToken},
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function (response) {
                showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.');
                setTimeout(() => {
                    window.location = "/login";
                }, 3000);
            },
            error: function (xhr) {
                const errorMessage = xhr.responseJSON?.message || "An error occurred. Please try again.";
                showAlert('Error', errorMessage);
            }
        });
    };

    function handleProfileRoute() {
        window.location.href = "/profile";
    }

    const username = userInfo?.userName || userInfo?.email || 'User';

    return React.createElement('div', {
            className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
            onClick: () => setUserMenuOpen(false) // Close menu when clicking outside
        },
        React.createElement('div', {className: 'group'},
            // Sidebar Component
            React.createElement(window.Sidebar, {
                sidebarCollapsed: sidebarCollapsed,
                setSidebarCollapsed: setSidebarCollapsed,
                username: username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen: userMenuOpen,
                setUserMenuOpen: setUserMenuOpen,
                userInfo: userInfo
            }),

            // Custom Modal
            modal.isOpen && React.createElement('div', {
                    style: {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10001,
                        padding: '20px'
                    },
                    onClick: (e) => {
                        if (e.target === e.currentTarget && modal.type === 'alert') {
                            closeModal();
                        }
                    }
                },
                React.createElement('div', {
                        style: {
                            backgroundColor: '#ffffff',
                            borderRadius: '15px',
                            padding: isMobile ? '25px' : '30px',
                            maxWidth: isMobile ? '90%' : '500px',
                            width: '100%',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        },
                        onClick: (e) => e.stopPropagation()
                    },
                    React.createElement('div', {
                        style: {
                            fontFamily: 'Urbanist, Helvetica',
                            fontWeight: 700,
                            fontSize: isMobile ? '20px' : '24px',
                            color: '#000000',
                            lineHeight: 'normal'
                        }
                    }, modal.title),
                    React.createElement('div', {
                        style: {
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: 400,
                            fontSize: isMobile ? '14px' : '16px',
                            color: '#000000',
                            lineHeight: '1.5'
                        }
                    }, modal.message),
                    React.createElement('div', {
                            style: {
                                display: 'flex',
                                gap: '10px',
                                justifyContent: 'flex-end',
                                marginTop: '10px'
                            }
                        },
                        React.createElement('button', {
                            style: {
                                padding: isMobile ? '10px 20px' : '12px 24px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 600,
                                fontSize: isMobile ? '14px' : '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#333333',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#000000',
                            onClick: closeModal
                        }, 'OK')
                    )
                )
            ),

            // Main content
            React.createElement('main', {className: 'right-container'},
                React.createElement('section', {className: 'main-screen'},
                    React.createElement('header', {
                        className: 'main-screen-title'
                        // Visible by default, hidden when chat starts
                    },
                        React.createElement('img', {
                            className: 'bouncy-logo',
                            src: './img/bouncy-logo-animation.svg',
                            alt: 'Singularity Logo'
                        }),
                        React.createElement('div', {className: 'logo-text'},
                            React.createElement('h1', {className: 'text-wrapper'}, 'Singularity')
                        )
                    ),
                    // Chat interface - hidden by default, shown when user submits first message
                    React.createElement('div', {
                        id: 'chat-interface',
                        className: 'chat-interface',
                        style: { display: 'none' }
                    },
                        // Top bar with chat title and back button
                        React.createElement('div', {
                            id: 'chat-top-bar',
                            className: 'chat-top-bar'
                        },
                            React.createElement('button', {
                                id: 'btn-back-to-initial',
                                className: 'btn-back-to-initial',
                                type: 'button',
                                'aria-label': 'Back to initial screen',

                                onClick: () => {
                                    if (typeof window.backToInitialScreen === 'function') {
                                        window.backToInitialScreen();
                                    }
                                },       onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                                    onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent',

                                },
                                React.createElement('img', {
                                    src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                                    alt: 'Back',
                                    style: {
                                        width: '20px',
                                        height: '20px'
                                    }
                                }),

                            ),
                            React.createElement('h2', {
                                id: 'chat-title',
                                className: 'chat-title'
                            }, 'Untitled Chat')
                        ),
                        React.createElement('div', {
                            id: 'chat-messages',
                            className: 'chat-messages'
                        })
                    ),
                    // Suggestion chips - positioned right above input field
                    React.createElement('div', {
                        id: 'suggestion-chips',
                        className: 'suggestion-chips',
                        style: { display: 'none' } // Hidden until chat starts
                    },
                        React.createElement('button', {
                            className: 'chip',
                            onClick: () => {
                                const input = document.getElementById('main-message-input');
                                if (input) input.value = 'Say Hello';
                            }
                        }, 'Say Hello'),
                        React.createElement('button', {
                            className: 'chip',
                            onClick: () => {
                                const input = document.getElementById('main-message-input');
                                if (input) input.value = 'Analyze Documents';
                            }
                        }, 'Analyze Documents')
                    ),
                    React.createElement('form', {
                            className: 'input-field', role: 'search', 'aria-label': 'Main search',
                            onSubmit: (e) => {
                                e.preventDefault();
                                submitConversationRequest();
                            }
                        },
                        React.createElement('button', {
                                type: 'button',
                                className: 'input-field-button',
                                'aria-label': 'Add new item'
                            },
                            React.createElement('img', {className: 'vector', src: './img/vector-2.svg', alt: ''})
                        ),
                        React.createElement('label', {
                            htmlFor: 'main-message-input',
                            className: 'visually-hidden'
                        }, 'Search'),
                        React.createElement('textarea', {
                            id: 'main-message-input',
                            className: 'div',
                            placeholder: "What's on your mind?",
                            'aria-label': "What's on your mind?",
                            rows: 1,
                            onKeyDown: (e) => {
                                // Allow Shift+Enter for new line
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitConversationRequest();
                                }
                                // Shift+Enter will naturally create a new line
                            },
                            onInput: (e) => {
                                // Auto-resize textarea based on content
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }
                        }),
                        React.createElement('button', {
                                type: 'submit',
                                className: 'input-field-button',
                                'aria-label': 'Submit search',
                                onClick: (e) => {
                                    e.preventDefault();
                                    submitConversationRequest();
                                }
                            },
                            React.createElement('img', {className: 'img', src: './img/vector-3.svg', alt: ''})
                        )
                    )
                )
            )
        )
    );
};

// COMMENTED OUT: Sidebar component now handles project initialization
// window.onload = async function () {
//     await fetchProjects()
// }

async function fetchProjects() {
    console.log("fetchProjects is triggered")
    const response = await fetch('/api/project/list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
    });

    if (response.ok) {
        let data = await response.json()
        console.log(`Project Data: ${JSON.stringify(data)}`)
        populateProjectDropdown(data.projects)
        let defaultProjectID = data.projects[0]?.projectID;

        if (defaultProjectID) {
            try {
                console.log("1. Starting fetchProjectFiles")
                await fetchProjectFiles(defaultProjectID)
                console.log("1. ✓ fetchProjectFiles completed")
            } catch (err) {
                console.error("1. ✗ fetchProjectFiles failed:", err)
            }

            try {
                console.log("2. Starting fetchProjectReports")
                await fetchProjectReports(defaultProjectID)
                console.log("2. ✓ fetchProjectReports completed")
            } catch (err) {
                console.error("2. ✗ fetchProjectReports failed:", err)
            }

            try {
                console.log("3. Starting fetchProjectChats")
                await fetchProjectChats(defaultProjectID)
                console.log("3. ✓ fetchProjectChats completed")
            } catch (err) {
                console.error("3. ✗ fetchProjectChats failed:", err)
            }
        }
    }
}

function populateProjectDropdown(projects) {
    const dropdown = document.getElementById('select-project-drop-down');

    const options = projects.map((project, index) =>
        `<option value="${project.projectID}" ${index === 0 ? 'selected' : ''}>${project.projectName}</option>`
    ).join('');

    dropdown.innerHTML = options;

    if (projects.length > 0) {
        dropdown.dispatchEvent(new Event('change'));
    }
}

async function fetchProjectFiles(projectID) {
    console.log(`Fetching ${projectID} files`)
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
        let data = await response.json()
        console.log(`Response Data: ${JSON.stringify(data)}`)
        const sourceContainer = document.getElementById("div-project-source-list");

        if (!sourceContainer) {
            console.error("Source container not found");
            return;
        }

        // Clear existing content
        sourceContainer.innerHTML = '';

        if (data.files && Array.isArray(data.files)) {
            for (let file of data.files) {
                const fileElement = createFileItem(`${file.documentName}.${file.documentExt}`, file.documentID);

                // Create a container div for this React element
                const wrapper = document.createElement('div');
                sourceContainer.appendChild(wrapper);

                const root = ReactDOM.createRoot(wrapper);
                root.render(fileElement);
            }
        }

        const noSourceLabel = document.getElementById("p-label-source-no-entry")
        if (noSourceLabel) {
            noSourceLabel.style.display = (data.files && data.files.length > 0) ? "none" : "block"
        }
    }
}

async function fetchProjectReports(projectID) {

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
        let data = await response.json()
        console.log(`Response Data: ${JSON.stringify(data)}`)
    }
}

async function fetchProjectChats(projectID) {
    console.log("ProjectID:", projectID)

    // Wait for DOM element if needed
    let chatHistoryContainer = document.getElementById("div-chat-history-list");

    if (!chatHistoryContainer) {
        console.log("Chat history container not found, waiting for DOM...");
        await new Promise(resolve => setTimeout(resolve, 300));
        chatHistoryContainer = document.getElementById("div-chat-history-list");

        if (!chatHistoryContainer) {
            console.error("Chat history container still not found");
            return;
        }
    }

    chatHistoryContainer.innerHTML = '';

    let data = null;

    try {
        const response = await fetch('/api/agent/all-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectID: projectID
            })
        });

        console.log("Response status:", response.status)
        console.log("Response ok:", response.ok)

        if (response.ok) {
            data = await response.json()

            if (data.chats) {
                console.log("Number of chats:", data.chats.length)

                for (let chat of data.chats) {
                    const chatHistoryElement = createChatHistoryItem(chat.threadName, chat.chatID)

                    const wrapper = document.createElement('div');
                    chatHistoryContainer.appendChild(wrapper);

                    const root = ReactDOM.createRoot(wrapper);
                    root.render(chatHistoryElement);
                }

                // Do NOT auto-load - user can click on chat history to view
                // Chat interface only shows when user submits a new message

                // Check if there's a pending chat restoration
                if (window.pendingChatRestoration) {
                    const chatIDToRestore = window.pendingChatRestoration;
                    const savedProjectID = localStorage.getItem('activeChatProjectID');

                    console.log('[RESTORE] Chat restoration pending:', chatIDToRestore);
                    console.log('[RESTORE] Saved project ID:', savedProjectID);
                    console.log('[RESTORE] Current project ID:', projectID);

                    // Validate that the chat belongs to the current project
                    if (savedProjectID && savedProjectID === projectID) {
                        // Check if the chat exists in the loaded chat history
                        const chatExists = data.chats.some(chat => chat.chatID === chatIDToRestore);

                        if (chatExists) {
                            window.pendingChatRestoration = null; // Clear the flag
                            console.log('[RESTORE] ✅ Chat belongs to current project. Restoring...');

                            // Small delay to ensure DOM is ready
                            setTimeout(() => {
                                if (typeof window.loadChatThread === 'function') {
                                    window.loadChatThread(chatIDToRestore);
                                }
                            }, 100);
                        } else {
                            console.log('[RESTORE] ❌ Chat not found in current project chat list. Clearing saved state.');
                            window.pendingChatRestoration = null;
                            localStorage.removeItem('activeChatID');
                            localStorage.removeItem('activeChatProjectID');
                        }
                    } else {
                        console.log('[RESTORE] ❌ Chat belongs to different project. Clearing saved state.');
                        console.log('[RESTORE] Saved chat was for project:', savedProjectID);
                        console.log('[RESTORE] Current project:', projectID);
                        window.pendingChatRestoration = null;
                        localStorage.removeItem('activeChatID');
                        localStorage.removeItem('activeChatProjectID');
                    }
                }
            }
        } else {
            console.error("Response not OK:", response.status, response.statusText)
            const errorText = await response.text()
            console.error("Error response:", errorText)
        }

    } catch (error) {
        console.error("Error:", error)
    } finally {
        const noChatHistoryLabel = document.getElementById("p-label-chat-history-no-entry")
        if (noChatHistoryLabel) {
            noChatHistoryLabel.style.display = (data && data.chats && data.chats.length > 0) ? "none" : "block"
        }
    }
}

// Create a function that returns a React element for a file item
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
                flexShrink: 0  // Prevent checkbox from shrinking
            },
            onChange: (e) => {
                console.log(`Checkbox ${e.target.checked ? 'checked' : 'unchecked'} for ${fileName}`);
                getSelectedSource()
                // Add your checkbox handler here
            },
            onClick: (e) => {
                e.stopPropagation(); // Prevent triggering the div's onClick
            }
        }),
        React.createElement('p', {
            style: {
                flexGrow: 1,
                margin: 0,  // Remove default paragraph margins
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'  // Prevent wrapping, show ellipsis instead
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
                // Prevent the div click when clicking the checkbox
                if (e.target.type !== 'checkbox') {
                    console.log(`Clicked on ${fileName}`);
                }
            }
        })
    );
}

// Old implementation commented out - replaced with new implementation below
// function createChatHistoryItem(chatThreadName, chatID) {
//     return React.createElement('div', {
//         ...existing code...
//     });
// }

function createChatHistoryItem(chatThreadName, chatID) {
    const ChatHistoryItemComponent = () => {
        const [menuOpen, setMenuOpen] = React.useState(false);
        const menuRef = React.useRef(null);

        // Close menu when clicking outside
        React.useEffect(() => {
            const handleClickOutside = (event) => {
                if (menuRef.current && !menuRef.current.contains(event.target)) {
                    setMenuOpen(false);
                }
            };

            if (menuOpen) {
                document.addEventListener('mousedown', handleClickOutside);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [menuOpen]);

        const handleDelete = async () => {
            setMenuOpen(false);

            // Show confirmation modal
            const confirmDelete = await new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    padding: 20px;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background-color: #ffffff;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                `;

                modalContent.innerHTML = `
                    <div style="
                        font-family: Urbanist, Helvetica;
                        font-weight: 700;
                        font-size: 24px;
                        color: #000000;
                        line-height: normal;
                    ">Warning</div>
                    <div style="
                        font-family: Inter, Helvetica;
                        font-weight: 400;
                        font-size: 16px;
                        color: #000000;
                        line-height: 1.5;
                    ">Are you sure you want to delete this chat? This cannot be reversed!</div>
                    <div style="
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                        margin-top: 10px;
                    ">
                        <button id="cancel-btn" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: 1px solid #e0e0e0;
                            background-color: #ffffff;
                            color: #000000;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Cancel</button>
                        <button id="delete-btn" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: none;
                            background-color: #000000;
                            color: #ffffff;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Delete</button>
                    </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                const deleteBtn = modalContent.querySelector('#delete-btn');
                const cancelBtn = modalContent.querySelector('#cancel-btn');

                deleteBtn.addEventListener('mouseenter', () => {
                    deleteBtn.style.backgroundColor = '#333333';
                });
                deleteBtn.addEventListener('mouseleave', () => {
                    deleteBtn.style.backgroundColor = '#000000';
                });

                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.backgroundColor = '#f5f5f5';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.backgroundColor = '#ffffff';
                });

                deleteBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(true);
                });

                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(false);
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                        resolve(false);
                    }
                });

                // Stop propagation on modal content
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });

            if (!confirmDelete) return;

            // Get projectID from localStorage
            const projectID = localStorage.getItem('selectedProjectID');

            if (!projectID) {
                console.error('No project selected');
                return;
            }

            try {
                const response = await fetch('/api/agent/chat-delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectID: projectID,
                        chatID: chatID
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Show success message
                    const successModal = document.createElement('div');
                    successModal.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10001;
                        padding: 20px;
                    `;

                    const successContent = document.createElement('div');
                    successContent.style.cssText = `
                        background-color: #ffffff;
                        border-radius: 15px;
                        padding: 30px;
                        max-width: 500px;
                        width: 100%;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                        display: grid;
                        grid-template-columns: 1fr auto;
                        gap: 20px;
                        align-items: start;
                    `;

                    successContent.innerHTML = `
                        <div style="
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                            grid-column: 1;
                        ">
                            <div style="
                                font-family: Urbanist, Helvetica;
                                font-weight: 700;
                                font-size: 24px;
                                color: #000000;
                                line-height: normal;
                            ">Delete Successful</div>
                            <div style="
                                font-family: Inter, Helvetica;
                                font-weight: 400;
                                font-size: 16px;
                                color: #000000;
                                line-height: 1.4;
                            ">Chat history successfully deleted.</div>
                        </div>
                        <button id="success-ok-btn" style="
                            padding: 12px 32px;
                            border-radius: 10px;
                            border: none;
                            background-color: #000000;
                            color: #ffffff;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                            grid-column: 2;
                            grid-row: 1;
                        ">OK</button>
                    `;

                    successModal.appendChild(successContent);
                    document.body.appendChild(successModal);

                    successContent.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });

                    const okBtn = successContent.querySelector('#success-ok-btn');

                    okBtn.addEventListener('mouseenter', () => {
                        okBtn.style.backgroundColor = '#333333';
                    });
                    okBtn.addEventListener('mouseleave', () => {
                        okBtn.style.backgroundColor = '#000000';
                    });

                    const closeSuccessModal = () => {
                        if (document.body.contains(successModal)) {
                            document.body.removeChild(successModal);
                        }
                    };

                    okBtn.addEventListener('click', closeSuccessModal);

                    // Auto close after 5 seconds (generous wait time)
                    setTimeout(closeSuccessModal, 5000);

                    // Refresh chat history
                    if (typeof window.fetchProjectChats === 'function') {
                        await window.fetchProjectChats(projectID);
                    }

                    // If the deleted chat was active, clear it
                    if (window.currentChatID === chatID) {
                        window.currentChatID = null;
                        localStorage.removeItem('activeChatID');
                        localStorage.removeItem('activeChatProjectID');

                        // Go back to initial screen
                        if (typeof window.backToInitialScreen === 'function') {
                            window.backToInitialScreen();
                        }

                        // Remove chatID from URL
                        const currentUrl = new URL(window.location);
                        if (currentUrl.searchParams.has('chatID')) {
                            currentUrl.searchParams.delete('chatID');
                            window.history.replaceState({}, '', currentUrl);
                        }
                    }
                } else {
                    console.error('Failed to delete chat:', data.message);
                    alert('Failed to delete chat. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting chat:', error);
                alert('An error occurred while deleting the chat.');
            }
        };

        return React.createElement('div', {
                className: 'sidebar-items chat-history-item',
                'data-chat-id': chatID,
                'data-thread-name': chatThreadName || 'Untitled Chat',
                style: {
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: '5px',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    position: 'relative'
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
                    if (e.target.tagName !== 'IMG' && !e.target.closest('.chat-menu')) {
                        const allChatItems = document.querySelectorAll('.chat-history-item');
                        allChatItems.forEach(item => {
                            item.classList.remove('selected');
                            item.style.backgroundColor = 'transparent';
                        });

                        e.currentTarget.classList.add('selected');
                        e.currentTarget.style.backgroundColor = '#e0e0e0';

                        console.log(`[CLICK] Selected chat: ${chatThreadName}, ID: ${chatID}`);

                        const newUrl = new URL(window.location);
                        newUrl.searchParams.set('chatID', chatID);
                        window.history.pushState({ chatID }, '', newUrl);

                        const chatTitleElement = document.getElementById('chat-title');
                        if (chatTitleElement) {
                            const displayName = (chatThreadName && chatThreadName.trim() !== '') ? chatThreadName : 'Untitled Chat';
                            chatTitleElement.textContent = displayName;
                        }

                        loadChatThread(chatID);
                    }
                }
            },
            React.createElement('p', {
                style: {
                    flexGrow: 1,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                }
            }, (chatThreadName && chatThreadName.trim() !== '') ? chatThreadName : 'Untitled Chat'),
            React.createElement('div', {
                ref: menuRef,
                className: 'chat-menu',
                style: {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }
            },
                React.createElement('img', {
                    style: {
                        padding: "4px",
                        flexShrink: 0,
                        borderRadius: '5px',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
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
                        setMenuOpen(!menuOpen);
                    }
                }),
                menuOpen && React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#ffffff',
                        border: '1.67px solid #e4e4e4',
                        borderRadius: '11.12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        minWidth: '120px',
                        zIndex: 1000,
                        overflow: 'hidden'
                    }
                },
                    React.createElement('button', {
                        style: {
                            width: '100%',
                            padding: '12px 14.5px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13.3px',
                            color: '#c1281e',
                            fontWeight: '500',
                            fontFamily: '"Inter", Helvetica',
                            transition: 'background-color 0.2s ease'
                        },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        },
                        onClick: (e) => {
                            e.stopPropagation();
                            handleDelete();
                        }
                    }, 'Delete')
                )
            )
        );
    };

    return React.createElement(ChatHistoryItemComponent);
}

function createReportItem(reportName, reportID) {
    return React.createElement('div', {
            className: 'sidebar-items report-item',
            'data-report-id': reportID,
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
            },
            onMouseLeave: (e) => {
            },
            onClick: (e) => {
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
        }, reportName),
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
                console.log(`Menu clicked for ${reportName}`);
                // Add your menu logic here
            }
        })
    );
}

function getSelectedSource() {
    let selectedSource = [];
    const sourceElements = document.querySelectorAll(".sidebar-items.source-item");

    for (let sourceElement of sourceElements) {
        const checkbox = sourceElement.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            selectedSource.push(sourceElement.dataset.documentId);
        }
    }

    console.log("Selected sources:", selectedSource);
    return selectedSource;
}

async function submitConversationRequest() {
    const input = document.getElementById("main-message-input");
    const userMessage = input?.value?.trim();

    if (!userMessage) return;

    // Get project and chat info
    const projectDropdown = document.getElementById("select-project-drop-down");
    const projectID = projectDropdown?.value;

    if (!projectID) {
        console.error("No project selected");
        return;
    }

    // Check if we're in edit mode
    if (window.editingMessage) {
        const { conversationID, chatSeq, originalText } = window.editingMessage;

        // Check if message actually changed
        if (userMessage === originalText) {
            console.log('Message unchanged, canceling edit');
            cancelEditMode();
            input.value = '';
            return;
        }

        console.log('Editing conversation:', { conversationID, chatSeq });

        // Get selected source documents
        const selectedSource = getSelectedSource();

        // Clear input immediately
        input.value = '';
        input.style.height = 'auto';

        // Remove the old message and subsequent messages from UI
        removeMessagesFromSeq(chatSeq);

        // Add the edited user message
        addMessage('user', userMessage, conversationID, chatSeq);

        // Show typing indicator
        const typingId = showTypingIndicator();

        try {
            const response = await fetch('/api/agent/conversation-edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectID: projectID,
                    chatID: window.currentChatID,
                    chatSeq: chatSeq,
                    conversationID: conversationID,
                    message: userMessage,
                    attachedDocumentIDs: selectedSource
                })
            });

            // Remove typing indicator
            removeTypingIndicator(typingId);

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Server returned non-JSON response:', text);
                addMessage('ai', 'Sorry, there was an error editing your message. Please check the console for details.');
                return;
            }

            const data = await response.json();

            if (response.ok && data.success) {
                // Add AI response
                addMessage('ai', data.response);
                console.log('Message edited successfully');
            } else {
                addMessage('ai', 'Sorry, there was an error editing your message.');
                console.error('Edit failed:', data.message);
            }
        } catch (error) {
            removeTypingIndicator(typingId);
            addMessage('ai', 'Sorry, there was an error editing your message.');
            console.error('Error editing message:', error);
        } finally {
            // Clear edit mode
            cancelEditMode();
        }

        return;
    }

    // Check if there's a current chat selected
    const selectedChatItem = document.querySelector('.chat-history-item.selected');
    let chatID = window.currentChatID || selectedChatItem?.dataset?.chatId || '';

    const selectedSource = getSelectedSource();

    // Prepare data
    const data = {
        projectID,
        chatID,
        message: userMessage,
        attachedDocumentIDs: selectedSource,
    };

    console.log("Sending message:", data);

    // Show chat interface
    showChatInterface();

    // Add user message
    addMessage('user', userMessage);

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    const typingId = showTypingIndicator();

    // Send request
    try {
        const result = await streamChatResponse(data, typingId);
        const newChatID = result?.chatID || result; // Handle both old and new return formats
        const conversationID = result?.conversationID;
        const chatSeq = result?.chatSeq;

        // Update the user message with conversation data for edit functionality
        if (conversationID && chatSeq) {
            const userMessages = document.querySelectorAll('.user-message');
            const lastUserMessage = userMessages[userMessages.length - 1];
            if (lastUserMessage) {
                lastUserMessage.dataset.conversationId = conversationID;
                lastUserMessage.dataset.chatSeq = chatSeq;
                console.log('✅ Updated user message with conversation data:', { conversationID, chatSeq });

                // Update the existing edit button with the real click handler
                const editBtn = lastUserMessage.querySelector('.message-edit-btn');
                if (editBtn) {
                    editBtn.onclick = () => handleEditMessage(userMessage, conversationID, chatSeq);
                    console.log('✅ Edit button click handler updated with conversation data');
                }
            }
        }

        // If a new chat was created, update tracking and refresh history
        if (newChatID && newChatID !== chatID) {
            window.currentChatID = newChatID;
            console.log('New chat created with ID:', newChatID);

            // Update URL with the new chatID
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('chatID', newChatID);
            window.history.pushState({ chatID: newChatID }, '', currentUrl);
            console.log(`[URL] Updated URL with new chatID: ${newChatID}`);

            // Persist the new chat ID and project ID to localStorage
            localStorage.setItem('activeChatID', newChatID);
            localStorage.setItem('activeChatProjectID', projectID);

            // Clear the "went back to initial" flag since user is now in an active chat
            localStorage.removeItem('wentBackToInitial');

            // Refresh chat history to show the new chat
            if (typeof fetchProjectChats === 'function') {
                await fetchProjectChats(projectID);

                // Select the newly created chat in the sidebar and update title
                setTimeout(() => {
                    const newChatItem = document.querySelector(`.chat-history-item[data-chat-id="${newChatID}"]`);
                    if (newChatItem) {
                        // Deselect all
                        const allChatItems = document.querySelectorAll('.chat-history-item');
                        allChatItems.forEach(item => {
                            item.classList.remove('selected');
                            item.style.backgroundColor = 'transparent';
                        });

                        // Select new one
                        newChatItem.classList.add('selected');
                        newChatItem.style.backgroundColor = '#e0e0e0';

                        // Update top bar title from the sidebar item
                        const chatTitleElement = document.getElementById('chat-title');
                        if (chatTitleElement) {
                            const threadName = newChatItem.dataset.threadName || 'Untitled Chat';
                            chatTitleElement.textContent = threadName;
                        }
                    }
                }, 100);
            }
        }
    } catch (error) {
        console.error("Error:", error);
        removeTypingIndicator(typingId);
        addMessage('ai', 'Sorry, there was an error processing your request.');
    }
}

// ==========================================
// CHAT FUNCTIONS - COMPLETELY REWRITTEN
// ==========================================

// Show chat interface
function showChatInterface() {
    const chatInterface = document.getElementById('chat-interface');
    const chatTopBar = document.getElementById('chat-top-bar');
    const suggestionChips = document.getElementById('suggestion-chips');
    const mainScreenTitle = document.querySelector('.main-screen-title');

    if (chatInterface) chatInterface.style.display = 'flex'; // Use flex for proper layout
    if (chatTopBar) chatTopBar.style.display = 'flex'; // Show top bar
    if (suggestionChips) suggestionChips.style.display = 'flex'; // Show chips above input
    if (mainScreenTitle) mainScreenTitle.style.display = 'none';
}

// Hide chat interface
function hideChatInterface() {
    const chatInterface = document.getElementById('chat-interface');
    const chatTopBar = document.getElementById('chat-top-bar');
    const suggestionChips = document.getElementById('suggestion-chips');
    const mainScreenTitle = document.querySelector('.main-screen-title');

    if (chatInterface) chatInterface.style.display = 'none';
    if (chatTopBar) chatTopBar.style.display = 'none'; // Hide top bar
    if (suggestionChips) suggestionChips.style.display = 'none'; // Hide chips too
    if (mainScreenTitle) mainScreenTitle.style.display = 'flex';
}

// Add a message to chat
function addMessage(role, text, conversationID = null, chatSeq = null) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = role === 'user' ? 'message user-message' : 'message ai-message';

    // Store conversation data for editing
    if (conversationID) {
        messageDiv.dataset.conversationId = conversationID;
    }
    if (chatSeq) {
        messageDiv.dataset.chatSeq = chatSeq;
    }

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';

    // Use profile picture for user, Union.svg for AI
    if (role === 'user') {
        const avatarUrl = window.userAvatarUrl || './img/user.svg';
        avatar.innerHTML = `<img src="${avatarUrl}" alt="User" style="width: 80%; height: 80%; object-fit: cover; border-radius: 50%;">`;
    } else {
        avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // Create text node for message
    const textNode = document.createTextNode(text);
    bubble.appendChild(textNode);

    // Add edit button to EVERY user message (inside the bubble)
    if (role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'message-edit-btn';
        editBtn.innerHTML = 'Edit';
        editBtn.title = 'Edit message';

        if (conversationID && chatSeq) {
            editBtn.onclick = () => handleEditMessage(text, conversationID, chatSeq);
            console.log('✏️ Edit button added with data:', { conversationID, chatSeq });
        } else {
            editBtn.onclick = () => alert('This message cannot be edited yet. Please wait for the message to finish sending.');
            console.log('⚠️ Edit button added without data (will be updated later)');
        }

        bubble.appendChild(editBtn); // Add button inside bubble
    }

    if (role === 'user') {
        // User: bubble first, avatar last (appears on right due to flex-direction: row-reverse)
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
    } else {
        // AI: avatar first, bubble last (normal left-to-right)
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
    }

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Handle editing a message
function handleEditMessage(text, conversationID, chatSeq) {
    const inputField = document.getElementById('message-input');
    if (!inputField) {
        // Try alternative input field ID
        const altInput = document.getElementById('main-message-input');
        if (altInput) {
            altInput.value = text;
            altInput.focus();
        } else {
            return;
        }
    } else {
        inputField.value = text;
        inputField.focus();
    }

    // Store editing state globally
    window.editingMessage = {
        conversationID: conversationID,
        chatSeq: chatSeq,
        originalText: text
    };

    // Update send button to show it's editing mode
    const sendBtn = document.querySelector('.btn-send') || document.getElementById('btn-send-message');
    if (sendBtn) {
        sendBtn.style.backgroundColor = '#ff9800'; // Orange to indicate edit mode
        sendBtn.title = 'Send edited message';
    }

    console.log('Editing message:', { conversationID, chatSeq });
}

// Cancel edit mode
function cancelEditMode() {
    window.editingMessage = null;

    // Reset send button appearance
    const sendBtn = document.querySelector('.btn-send') || document.getElementById('btn-send-message');
    if (sendBtn) {
        sendBtn.style.backgroundColor = ''; // Reset to default
        sendBtn.title = 'Send message';
    }
}

// Remove messages from a specific sequence onwards
function removeMessagesFromSeq(chatSeq) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const allMessages = messagesContainer.querySelectorAll('.message');
    let shouldRemove = false;

    allMessages.forEach(message => {
        const msgSeq = parseInt(message.dataset.chatSeq);
        if (msgSeq >= chatSeq) {
            shouldRemove = true;
        }
        if (shouldRemove) {
            message.remove();
        }
    });
}

// Show typing indicator
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return null;

    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = id;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble typing-bubble';
    bubble.innerHTML = `
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;

    typingDiv.appendChild(avatar);
    typingDiv.appendChild(bubble);
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();

    return id;
}

// Remove typing indicator
function removeTypingIndicator(id) {
    const typing = document.getElementById(id);
    if (typing) typing.remove();
}

// Scroll to bottom
function scrollToBottom() {
    const chatInterface = document.getElementById('chat-interface');
    if (chatInterface) {
        chatInterface.scrollTop = chatInterface.scrollHeight;
    }
}

// Stream chat response
async function streamChatResponse(data, typingId) {
    const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Remove typing indicator
    removeTypingIndicator(typingId);

    // Create AI message container
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);

    let fullResponse = '';
    let chatIDReceived = null;
    let conversationIDReceived = null;
    let chatSeqReceived = null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const jsonData = JSON.parse(line.slice(6));

                    if (jsonData.type === 'chatID') {
                        chatIDReceived = jsonData.chatID;
                        console.log('Chat ID:', chatIDReceived);

                        // Refresh chat history immediately to show "Untitled Chat"
                        if (data.chatID === '') {
                            console.log('New chat created, refreshing history...');
                            await fetchProjectChats(data.projectID);
                        }
                    } else if (jsonData.type === 'chunk') {
                        fullResponse += jsonData.content;
                        bubble.textContent = fullResponse;
                        scrollToBottom();
                    } else if (jsonData.type === 'done') {
                        console.log('Streaming complete');

                        // Capture conversation data from done event
                        if (jsonData.conversationID && jsonData.chatSeq) {
                            conversationIDReceived = jsonData.conversationID;
                            chatSeqReceived = jsonData.chatSeq;
                            console.log('📥 Received conversation data:', { conversationID: conversationIDReceived, chatSeq: chatSeqReceived });
                        }

                        // Refresh chat history again to show generated title
                        if (chatIDReceived && data.chatID === '') {
                            console.log('Streaming done, refreshing history to show generated title...');
                            setTimeout(async () => {
                                await fetchProjectChats(data.projectID);
                            }, 500); // Small delay to ensure title is generated
                        }
                    } else if (jsonData.type === 'error') {
                        console.error('Stream error:', jsonData.message);
                    }
                } catch (e) {
                    console.error('Error parsing SSE:', e);
                }
            }
        }
    }

    // Return the chatID and conversation data for tracking
    return {
        chatID: chatIDReceived,
        conversationID: conversationIDReceived,
        chatSeq: chatSeqReceived
    };
}

// Load chat thread
async function loadChatThread(chatID) {
    console.log('Loading chat thread:', chatID);

    try {
        const response = await fetch(`/api/agent/chat/thread/${chatID}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            // Chat doesn't exist (project was deleted or chat was removed)
            console.warn(`Chat ${chatID} not found (status: ${response.status})`);

            // Clear URL parameters
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.delete('chatID');

            // Clear localStorage
            localStorage.removeItem('activeChatID');
            localStorage.removeItem('activeChatProjectID');

            // Redirect to clean URL
            window.history.replaceState({}, '', currentUrl.pathname);

            // Show initial screen
            if (typeof window.backToInitialScreen === 'function') {
                window.backToInitialScreen();
            }

            return;
        }

        const data = await response.json();
        console.log('Chat thread data:', data);

        // Track the current chat ID
        window.currentChatID = chatID;

        // Update URL with chatID (only if not already there)
        const currentUrl = new URL(window.location);
        const currentChatIDInURL = currentUrl.searchParams.get('chatID');
        if (currentChatIDInURL !== chatID) {
            currentUrl.searchParams.set('chatID', chatID);
            window.history.pushState({ chatID }, '', currentUrl);
            console.log(`[URL] Updated URL to include chatID: ${chatID}`);
        }

        // Get the project ID from the chat data (now returned at top level)
        const projectID = data.projectID;
        console.log(`[LOAD] Chat ${chatID} belongs to project: ${projectID}`);

        // Persist the active chat ID AND project ID to localStorage
        console.log(`[LOAD] Saving to localStorage: activeChatID = ${chatID}, projectID = ${projectID}`);
        localStorage.setItem('activeChatID', chatID);
        if (projectID) {
            localStorage.setItem('activeChatProjectID', projectID);
        }

        // Clear the "went back to initial" flag since user is now viewing a chat
        localStorage.removeItem('wentBackToInitial');

        // Find the corresponding chat item in the sidebar and get its title
        const chatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatID}"]`);
        if (chatItem) {
            // Deselect all chat items
            const allChatItems = document.querySelectorAll('.chat-history-item');
            allChatItems.forEach(item => {
                item.classList.remove('selected');
                item.style.backgroundColor = 'transparent';
            });

            // Select this item
            chatItem.classList.add('selected');
            chatItem.style.backgroundColor = '#e0e0e0';

            // Update top bar title from the sidebar item's data attribute
            const chatTitleElement = document.getElementById('chat-title');
            if (chatTitleElement) {
                const threadName = chatItem.dataset.threadName || 'Untitled Chat';
                chatTitleElement.textContent = threadName;
            }
        } else {
            // If chat item not found in sidebar (edge case), use API data as fallback
            const chatTitleElement = document.getElementById('chat-title');
            if (chatTitleElement) {
                const title = data.chat?.threadName || data.threadName || 'Untitled Chat';
                chatTitleElement.textContent = title;
            }
        }

        // Clear current chat
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) messagesContainer.innerHTML = '';

        // Show chat interface (hide welcome screen)
        showChatInterface();

        // Display all conversations
        const conversations = data.conversations || [];

        // Even if empty, keep chat interface visible (user clicked to view this thread)
        conversations.forEach(conv => {
            // Add user message with conversation data for editing
            if (conv.conversationMessage) {
                addMessage('user', conv.conversationMessage, conv.conversationID, conv.chatSeq);
            }
            // Add AI response (no edit button for AI)
            if (conv.responseMessage) {
                addMessage('ai', conv.responseMessage);
            }
        });

        scrollToBottom();

    } catch (error) {
        console.error('Error loading chat thread:', error);
    }
}

async function generateUserStoryReport(projectID){
    // your logic here
    const response = await fetch('/api/agent/document-generation/user-stories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            projectID: projectID
        })
    });

    if (response.ok) {
        await fetchProjectReports()
    } else {

    }
}

async function generateRequirementsReport(projectID){
    // your logic here
    const response = await fetch('/api/agent/document-generation/requirements', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            projectID: projectID
        })
    });

    if (response.ok) {
        await fetchProjectReports()
    } else {

    }
}

async function downloadReport(projectID, reportID) {

    try {
        const response = await fetch('/api/project/report/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectID: projectID,
                reportID: reportID
            })
        });

        if (response.ok) {
            // Get the filename from the Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'report.docx';

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } else {
            const errorData = await response.json();
            console.error('Download failed:', errorData.message);
        }
    } catch (error) {
        console.error('Error downloading report:', error);
    }
}

function removeReport(reportID){
    // your logic here
}

function renameSourceDocument(documentID, newDocumentName) {
    // your logic here
}

function downloadSourceDocument(documentID) {
    // your logic here
}

function deleteSourceDocument(documentID) {
    // your logic here
}

// Back to initial screen function
function backToInitialScreen() {
    console.log('Returning to initial screen');

    // Clear current chat ID
    window.currentChatID = null;

    // Clear persisted chat ID and project ID from localStorage
    localStorage.removeItem('activeChatID');
    localStorage.removeItem('activeChatProjectID');

    // Remove chatID from URL
    const currentUrl = new URL(window.location);
    if (currentUrl.searchParams.has('chatID')) {
        currentUrl.searchParams.delete('chatID');
        window.history.pushState({}, '', currentUrl);
        console.log('[URL] Removed chatID from URL');
    }

    // Set flag to indicate user explicitly went back to initial state
    // This prevents chat restoration on page refresh
    localStorage.setItem('wentBackToInitial', 'true');

    // Hide chat interface and top bar
    const chatInterface = document.getElementById('chat-interface');
    const chatTopBar = document.getElementById('chat-top-bar');
    const suggestionChips = document.getElementById('suggestion-chips');
    const mainScreenTitle = document.querySelector('.main-screen-title');
    const inputField = document.querySelector('.input-field');

    if (chatInterface) {
        chatInterface.style.display = 'none';
    }

    if (chatTopBar) {
        chatTopBar.style.display = 'none';
    }

    if (suggestionChips) {
        suggestionChips.style.display = 'none';
    }

    // Show welcome screen
    if (mainScreenTitle) {
        mainScreenTitle.style.display = 'flex';
    }

    // Reset input field position to center
    const mainScreen = document.querySelector('.main-screen');
    if (mainScreen) {
        mainScreen.classList.remove('chat-mode');
    }

    // Clear chat messages
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }

    // Reset chat title
    const chatTitle = document.getElementById('chat-title');
    if (chatTitle) {
        chatTitle.textContent = 'Untitled Chat';
    }

    // Deselect all chat history items in sidebar
    const allChatItems = document.querySelectorAll('.chat-history-item');
    allChatItems.forEach(item => {
        item.classList.remove('selected');
        item.style.backgroundColor = 'transparent';
    });

    console.log('Returned to initial screen');
}

// Make functions available globally so Sidebar can call them
window.fetchProjectChats = fetchProjectChats;
window.fetchProjectFiles = fetchProjectFiles;
window.fetchProjectReports = fetchProjectReports;
window.loadChatThread = loadChatThread;
window.backToInitialScreen = backToInitialScreen;

// Make available globally
window.TempHome = TempHome;
