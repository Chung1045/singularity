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

    // Add state for file upload modal
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [currentProjectID, setCurrentProjectID] = useState(null);

    // Add state for requirements panel modal
    const [showRequirementsPanel, setShowRequirementsPanel] = useState(false);
    const [requirementsPanelProjectID, setRequirementsPanelProjectID] = useState(null);

    // Add state for attachment menu and selected files
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);

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

    // Listen for file upload events from sidebar
    React.useEffect(() => {
        const handleOpenFileUpload = (event) => {
            console.log('[FileUpload] Event received from sidebar');

            // Check if FileUploadComponent is loaded
            if (!window.FileUploadComponent) {
                console.error('[FileUpload] FileUploadComponent not loaded!');
                alert('File upload component is not ready. Please refresh the page.');
                return;
            }

            const { projectID } = event.detail;
            console.log('[FileUpload] Opening upload modal for projectID:', projectID);
            setCurrentProjectID(projectID);
            setShowFileUpload(true);
        };

        window.addEventListener('openFileUpload', handleOpenFileUpload);
        return () => {
            window.removeEventListener('openFileUpload', handleOpenFileUpload);
        };
    }, []);

    // Listen for requirements panel events from sidebar
    React.useEffect(() => {
        const handleOpenRequirementsPanel = (event) => {
            console.log('[Requirements] Event received to open requirements panel');

            // Check if RequirementsPanel is loaded
            if (!window.RequirementsPanel) {
                console.error('[Requirements] RequirementsPanel not loaded!');
                alert('Requirements panel component is not ready. Please refresh the page.');
                return;
            }

            const { projectID } = event.detail;
            console.log('[Requirements] Opening requirements panel for projectID:', projectID);
            setRequirementsPanelProjectID(projectID);
            setShowRequirementsPanel(true);
        };

        window.addEventListener('openRequirementsPanel', handleOpenRequirementsPanel);
        return () => {
            window.removeEventListener('openRequirementsPanel', handleOpenRequirementsPanel);
        };
    }, []);

    // Close attachment menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (attachmentMenuOpen && !event.target.closest('#attachment-menu-button') && !event.target.closest('#attachment-dropdown-menu')) {
                setAttachmentMenuOpen(false);
            }
        };

        if (attachmentMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [attachmentMenuOpen]);

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

    // Debug logging
    console.log('[FileUpload] Render - showFileUpload:', showFileUpload, 'currentProjectID:', currentProjectID);

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

            // File Upload Modal
            showFileUpload && window.FileUploadComponent && React.createElement('div', {
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
                        zIndex: 10002,
                        padding: '20px'
                    },
                    onClick: (e) => {
                        if (e.target === e.currentTarget) {
                            setShowFileUpload(false);
                        }
                    }
                },
                React.createElement(window.FileUploadComponent, {
                    projectID: currentProjectID,
                    onClose: () => setShowFileUpload(false),
                    onFilesUploaded: (files) => {
                        console.log('Files uploaded:', files);
                        // Refresh the source list in sidebar
                        if (window.refreshProjectFiles) {
                            window.refreshProjectFiles(currentProjectID);
                        }
                        // Note: Success notification is already shown by the FileUploadComponent
                        // No need to show another one here
                    }
                })
            ),

            // Requirements Panel Modal
            showRequirementsPanel && window.RequirementsPanel && React.createElement('div', {
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
                        zIndex: 10002,
                        padding: '20px'
                    },
                    onClick: (e) => {
                        if (e.target === e.currentTarget) {
                            setShowRequirementsPanel(false);
                        }
                    }
                },
                React.createElement(window.RequirementsPanel, {
                    projectID: requirementsPanelProjectID,
                    onClose: () => setShowRequirementsPanel(false)
                })
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
                        React.createElement('div', {
                                style: { position: 'relative' }
                            },
                            // === CLIPPER MENU (PAPERCLIP ICON) ===
                            // This attachment menu provides two options:
                            // 1. Upload Files - Opens file upload modal to upload new files to project
                            // 2. Select Uploaded Files - Opens selection modal to choose from existing project files
                            // Both options are PROJECT-BASED and require an active project to function
                            // If no project is selected, a notification prompts user to create/select one
                            React.createElement('button', {
                                    id: 'attachment-menu-button',
                                    type: 'button',
                                    className: 'input-field-button',
                                    'aria-label': 'Attachment menu',
                                    onClick: (e) => {
                                        e.stopPropagation();
                                        setAttachmentMenuOpen(!attachmentMenuOpen);
                                    }
                                },
                                React.createElement('img', {className: 'vector', src: './img/paperclip.svg', alt: 'Attach', style: { width: '20px', height: '20px' }})
                            ),
                            attachmentMenuOpen && React.createElement('div', {
                                    id: 'attachment-dropdown-menu',
                                    'aria-label': 'Attachment options menu',
                                    style: {
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: '0',
                                        marginBottom: '8px',
                                        backgroundColor: '#ffffff',
                                        border: '1.67px solid #e4e4e4',
                                        borderRadius: '11.12px',
                                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                                        minWidth: '180px',
                                        zIndex: 1000,
                                        overflow: 'hidden'
                                    }
                                },
                                React.createElement('button', {
                                        id: 'attachment-menu-upload-files',
                                        'aria-label': 'Upload new files',
                                        type: 'button',
                                        style: {
                                            width: '100%',
                                            padding: '12px 14.5px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '13.3px',
                                            color: '#000',
                                            fontWeight: 500,
                                            fontFamily: '"Inter", Helvetica',
                                            transition: 'background-color 0.2s'
                                        },
                                        onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                                        onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent',
                                        onClick: async () => {
                                            setAttachmentMenuOpen(false);
                                            console.log('[FileUpload] Upload button clicked');

                                            // Check if project is selected (file uploads are project-based)
                                            const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
                                            console.log('[FileUpload] Current projectID:', projectID);

                                            if (!projectID) {
                                                // No project selected - show notification
                                                console.warn('[FileUpload] No project selected');
                                                if (window.showNotification) {
                                                    await window.showNotification({
                                                        type: 'info',
                                                        title: 'No Project Selected',
                                                        message: 'Please create or select a project before uploading files. File uploads are project-based.',
                                                        actionText: 'OK'
                                                    });
                                                } else {
                                                    alert('Please create or select a project before uploading files.');
                                                }
                                                return;
                                            }

                                            // Check if FileUploadComponent is loaded
                                            if (!window.FileUploadComponent) {
                                                console.error('[FileUpload] FileUploadComponent not loaded!');
                                                alert('File upload component is not ready. Please refresh the page.');
                                                return;
                                            }

                                            // Open file upload modal
                                            setCurrentProjectID(projectID);
                                            setShowFileUpload(true);
                                            console.log('[FileUpload] Modal should open now');
                                        }
                                    },
                                    'Upload Files'
                                ),
                                React.createElement('button', {
                                        id: 'attachment-menu-select-uploaded',
                                        'aria-label': 'Select from uploaded files',
                                        type: 'button',
                                        style: {
                                            width: '100%',
                                            padding: '12px 14.5px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '13.3px',
                                            color: '#000',
                                            fontWeight: 500,
                                            fontFamily: '"Inter", Helvetica',
                                            transition: 'background-color 0.2s'
                                        },
                                        onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                                        onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent',
                                        onClick: () => {
                                            setAttachmentMenuOpen(false);
                                            showUploadedFilesSelectionModal();
                                        }
                                    },
                                    'Select Uploaded Files'
                                )
                            )
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
                            inputMode: 'text',
                            rows: 1,
                            onKeyDown: (e) => {
                                // Detect if user is on a touch/mobile device
                                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

                                if (e.key === 'Enter') {
                                    if (isTouchDevice) {
                                        // On mobile/touch: Enter creates new line, use Send button to submit
                                        // Allow default behavior (new line)
                                        return;
                                    } else {
                                        // On desktop: Enter submits, Shift+Enter for new line
                                        if (!e.shiftKey) {
                                            e.preventDefault();
                                            submitConversationRequest();
                                        }
                                        // Shift+Enter will naturally create a new line
                                    }
                                }

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

// Function to show uploaded files selection modal
// This allows users to select from already uploaded files in the current project
// Note: File uploads and selection are project-based - user must have an active project
async function showUploadedFilesSelectionModal() {
    const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
    if (!projectID) {
        // No project selected - show notification instead of alert
        if (window.showNotification) {
            await window.showNotification({
                type: 'warning',
                title: 'Warning',
                message: 'Please create a project before selecting files.',
                actionText: 'OK'
            });
        } else {
            alert('Please create a project before selecting files.');
        }
        return;
    }

    // Fetch project files
    try {
        const response = await fetch('/api/project/file/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ projectID: projectID })
        });

        const data = await response.json();

        if (!data.files || data.files.length === 0) {
            await window.showNotification({
                type: 'info',
                title: 'No Files',
                message: 'No files uploaded yet. Please upload files first.',
                actionText: 'OK'
            });
            return;
        }

        // Create a modal to show files with checkboxes
        showFileSelectionDialog(data.files, projectID);
    } catch (error) {
        console.error('Error fetching files:', error);
        await window.showNotification({
            type: 'error',
            title: 'Error',
            message: 'Failed to fetch uploaded files.',
            actionText: 'OK'
        });
    }
}

// Function to show file selection dialog
function showFileSelectionDialog(files, projectID) {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'file-selection-modal-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10003;
        padding: 20px;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'file-selection-modal';
    modal.style.cssText = `
        background-color: #ffffff;
        border-radius: 10px;
        width: 100%;
        max-width: 600px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 18px 17px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #e4e4e4;
    `;
    header.innerHTML = `
        <div style="font-family: 'SF Pro-Bold', Helvetica; font-weight: 400; font-size: 18px; color: #000;">Select Files</div>
        <button id="close-file-selection-modal" style="width: 30px; height: 30px; border: none; background: transparent; cursor: pointer; font-size: 20px; color: #666;">×</button>
    `;

    // Create file list container
    const fileListContainer = document.createElement('div');
    fileListContainer.id = 'file-selection-list';
    fileListContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 10px 17px;
    `;

    const selectedFilesMap = new Map();

    files.forEach((file, index) => {
        // Construct filename - extension might already have a dot
        // Also clean documentName in case of old corrupted data (e.g., "file." in database)
        const ext = file.documentExt || '';
        let cleanName = (file.documentName || '').replace(/\.+$/, ''); // Remove trailing dots
        const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
        const fileItem = document.createElement('div');
        fileItem.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
        `;
        fileItem.onmouseenter = () => fileItem.style.backgroundColor = '#f5f5f5';
        fileItem.onmouseleave = () => fileItem.style.backgroundColor = 'transparent';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `file-checkbox-${index}`;
        checkbox.style.cssText = `
            width: 18px;
            height: 18px;
            margin-right: 12px;
            cursor: pointer;
        `;
        checkbox.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering the fileItem click
        };
        checkbox.onchange = (e) => {
            if (e.target.checked) {
                selectedFilesMap.set(file.documentID, { fileName, ...file });
            } else {
                selectedFilesMap.delete(file.documentID);
            }
        };

        const label = document.createElement('label');
        label.htmlFor = `file-checkbox-${index}`;
        label.style.cssText = `
            flex: 1;
            font-family: 'Inter', Helvetica;
            font-size: 13.3px;
            color: #000;
            cursor: pointer;
        `;
        label.textContent = fileName;
        label.onclick = (e) => {
            e.stopPropagation(); // Let the label's default behavior handle checkbox toggle
        };

        fileItem.appendChild(checkbox);
        fileItem.appendChild(label);
        // Remove the onclick from fileItem to prevent double-toggling
        fileItem.onclick = (e) => {
            // Only trigger checkbox if clicking on the row background (not checkbox or label)
            if (e.target === fileItem) {
                checkbox.click();
            }
        };

        fileListContainer.appendChild(fileItem);
    });

    // Create footer with buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 15px 17px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        border-top: 1px solid #e4e4e4;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        padding: 8px 24px;
        background-color: #e4e4e4;
        border-radius: 50px;
        border: none;
        font-family: 'Inter-Bold', Helvetica;
        font-weight: 700;
        font-size: 12px;
        color: #1c1d21;
        cursor: pointer;
    `;
    cancelBtn.onclick = () => document.body.removeChild(backdrop);

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Add to Chat';
    confirmBtn.style.cssText = `
        padding: 8px 24px;
        background-color: rgb(30, 41, 59);
        border-radius: 50px;
        border: none;
        font-family: 'Inter-Bold', Helvetica;
        font-weight: 700;
        font-size: 12px;
        color: #fff;
        cursor: pointer;
    `;
    confirmBtn.onclick = () => {
        const selectedFiles = Array.from(selectedFilesMap.values());

        // Get the container
        const container = document.getElementById('selected-files-container');

        // Remove files that were unchecked
        if (container) {
            const existingChips = container.querySelectorAll('[data-file-id]');
            existingChips.forEach(chip => {
                const fileId = chip.getAttribute('data-file-id');
                if (!selectedFilesMap.has(fileId)) {
                    // File was unchecked, remove it
                    chip.remove();
                }
            });

            // If container is now empty, remove the wrapper
            if (container.children.length === 0 && selectedFiles.length === 0) {
                const wrapper = document.getElementById('selected-files-wrapper');
                if (wrapper) {
                    wrapper.remove();
                }
            }
        }

        // Add newly selected files
        if (selectedFiles.length > 0) {
            addFilesToChatInput(selectedFiles);
        }

        document.body.removeChild(backdrop);
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(fileListContainer);
    modal.appendChild(footer);
    backdrop.appendChild(modal);

    // Close button handler
    header.querySelector('#close-file-selection-modal').onclick = () => document.body.removeChild(backdrop);

    // Append to body
    document.body.appendChild(backdrop);
}

// Function to add selected files to chat input
function addFilesToChatInput(files) {
    // Get or create wrapper and container
    let wrapper = document.getElementById('selected-files-wrapper');
    let container = document.getElementById('selected-files-container');

    if (!container) {
        // Create wrapper to hold container and cancel button side by side
        wrapper = document.createElement('div');
        wrapper.id = 'selected-files-wrapper';
        wrapper.style.cssText = `
            margin: 0 auto;
            width: 90%;
            max-width: 650px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        container = document.createElement('div');
        container.id = 'selected-files-container';
        container.style.cssText = `
            flex: 1;
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            padding: 10px 15px;
            background-color: #f9f9f9;
            border-radius: 16px 16px 0 0;
            align-items: center;
            justify-content: flex-start;
            overflow-x: auto;
            overflow-y: hidden;
            white-space: nowrap;
        `;

        wrapper.appendChild(container);

        // Insert before input field
        const inputField = document.querySelector('.input-field');
        if (inputField && inputField.parentNode) {
            inputField.parentNode.insertBefore(wrapper, inputField);
        }
    }

    // Update cancel edit button
    updateCancelEditButton();

    // Add files as chips
    files.forEach(file => {
        // Check if file already added - only check within the selected-files-container, not entire document
        // (Other elements like chat messages may have same data-file-id)
        if (container && container.querySelector(`[data-file-id="${file.documentID}"]`)) {
            return; // Skip if already added to container
        }

        const fileChip = document.createElement('div');
        fileChip.setAttribute('data-file-id', file.documentID);

        // Construct filename - extension might already have a dot
        // Also clean documentName in case of old corrupted data
        const ext = file.documentExt || '';
        let cleanName = (file.documentName || '').replace(/\.+$/, ''); // Remove trailing dots
        const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
        const displayFileName = file.fileName || fullFileName;

        // Store file name as data attribute for later retrieval
        fileChip.setAttribute('data-file-name', displayFileName);

        fileChip.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background-color: #fff;
            border: 1px solid #e4e4e4;
            border-radius: 20px;
            font-family: 'Inter', Helvetica;
            font-size: 13px;
            color: #000;
        `;

        const fileName = document.createElement('span');
        fileName.textContent = displayFileName;
        fileName.style.maxWidth = '200px';
        fileName.style.overflow = 'hidden';
        fileName.style.textOverflow = 'ellipsis';
        fileName.style.whiteSpace = 'nowrap';

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.style.cssText = `
            border: none;
            background: transparent;
            font-size: 18px;
            color: #666;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        removeBtn.onclick = () => {
            fileChip.remove();
            // Remove wrapper if no more files
            if (container.children.length === 0) {
                const wrapper = document.getElementById('selected-files-wrapper');
                if (wrapper) {
                    wrapper.remove();
                }
            }
        };

        fileChip.appendChild(fileName);
        fileChip.appendChild(removeBtn);
        container.appendChild(fileChip);
    });
}

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
                // Construct filename - extension might already have a dot
                // Also clean documentName in case of old corrupted data
                const ext = file.documentExt || '';
                let cleanName = (file.documentName || '').replace(/\.+$/, ''); // Remove trailing dots
                const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                const fileElement = createFileItem(fullFileName, file.documentID);

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

// Note: fetchProjectReports is defined in projectUtils.js and registered as window.fetchProjectReports

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

// NOTE: createFileItem is defined in projectUtils.js with checkbox toggle functionality for menu
// Do not define it here to avoid overwriting

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
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    `;

                    successContent.innerHTML = `
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
                            line-height: 1.4;
                        ">Current chat sucessfully deleted</div>
                        <div style="
                            display: flex;
                            justify-content: flex-end;
                        ">
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
                            ">OK</button>
                        </div>
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

// NOTE: createReportItem is defined in projectUtils.js with full menu functionality
// Do not define it here to avoid overwriting

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

function mergeAttachedDocuments(selectedSource = [], chipFileIDs = []) {
    // De-dupe and drop falsy IDs to avoid bad payloads when files are attached
    return Array.from(new Set([...selectedSource, ...chipFileIDs].filter(Boolean)));
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

        // Get selected source documents from sidebar
        const selectedSource = getSelectedSource();

        // Get selected files from chips
        const selectedFileChips = document.querySelectorAll('#selected-files-container [data-file-id]');
        const chipFileIDs = Array.from(selectedFileChips).map(chip => chip.getAttribute('data-file-id'));

        // Combine both sources
        const allAttachedDocuments = mergeAttachedDocuments(selectedSource, chipFileIDs);

        console.log('=== EDITING MESSAGE ===');
        console.log('Edited message:', userMessage);
        console.log('Sidebar selected files:', selectedSource);
        console.log('Chip files:', chipFileIDs);
        console.log('Total attached files:', allAttachedDocuments.length);
        console.log('Attached file IDs:', allAttachedDocuments);

        // Clear input immediately
        input.value = '';
        input.style.height = 'auto';

        // Clear selected file chips wrapper
        const wrapper = document.getElementById('selected-files-wrapper');
        if (wrapper) {
            wrapper.remove();
        }

        // Remove the old message and subsequent messages from UI
        removeMessagesFromSeq(chatSeq);

        // Add the edited user message with attached files (can be empty array)
        addMessage('user', userMessage, conversationID, chatSeq, allAttachedDocuments);

        // Show typing indicator
        const typingId = showTypingIndicator();

        try {
            console.log('📤 Sending edit request with', allAttachedDocuments.length, 'files');
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
                    attachedDocumentIDs: allAttachedDocuments
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

    // Get selected source documents from sidebar
    const selectedSource = getSelectedSource();

    // Get selected files from chips
    const selectedFileChips = document.querySelectorAll('#selected-files-container [data-file-id]');
    const chipFileIDs = Array.from(selectedFileChips).map(chip => chip.getAttribute('data-file-id'));

    // Combine both sources
    const allAttachedDocuments = mergeAttachedDocuments(selectedSource, chipFileIDs);

    // Prepare data
    const data = {
        projectID,
        chatID,
        message: userMessage,
        attachedDocumentIDs: allAttachedDocuments,
    };

    console.log("=== SENDING MESSAGE TO AI ===");
    console.log("Message:", userMessage);
    console.log("Attached files:", allAttachedDocuments);
    console.log("ProjectID:", projectID);
    console.log("ChatID:", chatID);
    console.log("Full data:", data);

    // Show chat interface
    showChatInterface();

    // Add user message with attached files
    addMessage('user', userMessage, null, null, allAttachedDocuments);

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Clear selected file chips wrapper
    const wrapper = document.getElementById('selected-files-wrapper');
    if (wrapper) {
        wrapper.remove();
    }

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

            // Select the newly created chat in the sidebar
            // Note: Title update is already handled in streamChatResponse when 'done' event is received
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
                }
            }, 100);
        }
    } catch (error) {
        console.error("❌ Error in submitConversationRequest:", error);
        console.error("Error stack:", error.stack);
        removeTypingIndicator(typingId);

        // Show more detailed error message
        const errorMsg = error.message || 'Unknown error';
        addMessage('ai', `Sorry, there was an error processing your request: ${errorMsg}`);
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

function renderMarkdownContent(text) {
    const source = text || '';
    if (window.marked && typeof window.marked.parse === 'function') {
        try {
            const rawHtml = window.marked.parse(source, { breaks: true });
            if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
                return window.DOMPurify.sanitize(rawHtml);
            }
            return rawHtml;
        } catch (e) {
            console.error('Error rendering markdown:', e);
            return source.replace(/\n/g, '<br>');
        }
    }
    return source.replace(/\n/g, '<br>');
}

/**
 * Post-process rendered content to make report download links clickable
 * @param {HTMLElement} bubble - The bubble element containing the rendered content
 */
function postProcessDownloadLinks(bubble) {
    if (!bubble) return;

    // Look for patterns like "Download link: filename.docx" or "filename.docx"
    const html = bubble.innerHTML;

    // Pattern to match .docx file references
    const docxPattern = /([A-Za-z0-9_\-\s]+\.docx)/gi;

    // Replace with clickable links
    const processedHtml = html.replace(docxPattern, (match) => {
        // Don't double-process if already in a link
        if (html.includes(`data-report-download="${match}"`)) {
            return match;
        }
        return `<a href="#" class="report-download-link" data-report-download="${match}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${match}</a>`;
    });

    if (processedHtml !== html) {
        bubble.innerHTML = processedHtml;

        // Add click handlers for download links
        const downloadLinks = bubble.querySelectorAll('.report-download-link');
        downloadLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const fileName = link.dataset.reportDownload;
                console.log('📥 Download link clicked:', fileName);

                // Try to find and download the matching report
                await downloadReportByName(fileName);
            });
        });
    }
}

/**
 * Find and download a report by its file name
 * @param {string} fileName - The name of the report file (e.g., "Requirements_Summary_Report.docx")
 */
async function downloadReportByName(fileName) {
    const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
    if (!projectID) {
        console.error('No project selected');
        return;
    }

    try {
        // Fetch the list of reports to find the matching one
        const response = await fetch('/api/project/report/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include cookies for authentication
            body: JSON.stringify({ projectID })
        });

        if (!response.ok) {
            console.error('Failed to fetch reports list');
            return;
        }

        const data = await response.json();
        if (!data.reports || data.reports.length === 0) {
            console.log('No reports found');
            // Show notification to user
            if (window.showNotification) {
                window.showNotification({
                    type: 'info',
                    title: 'Report Not Found',
                    message: 'The report is not yet available. Please check the Requirements List section in the sidebar.',
                    actionText: 'OK'
                });
            }
            return;
        }

        // Find a report that matches the file name
        const searchName = fileName.replace('.docx', '').toLowerCase();
        console.log('🔍 Searching for report matching:', searchName);
        console.log('🔍 Available reports:', data.reports.map(r => `${r.reportName} (${r.reportType})`));

        // Determine if user is looking for requirements or user stories based on keywords
        const isLookingForRequirements = searchName.includes('requirement') && !searchName.includes('user stor');
        const isLookingForUserStories = searchName.includes('user stor') || searchName.includes('stories');

        let matchingReport = null;

        // First try exact type match based on keywords
        if (isLookingForRequirements) {
            matchingReport = data.reports.find(r =>
                r.reportType === 'requirements' || r.reportType === 'Requirements'
            );
            console.log('🔍 Looking for requirements report, found:', matchingReport?.reportName);
        } else if (isLookingForUserStories) {
            matchingReport = data.reports.find(r =>
                r.reportType === 'userStories' || r.reportType === 'UserStories' || r.reportType === 'user_stories'
            );
            console.log('🔍 Looking for user stories report, found:', matchingReport?.reportName);
        }

        // If no type match, try name matching
        if (!matchingReport) {
            matchingReport = data.reports.find(r =>
                r.reportName.toLowerCase().includes(searchName) ||
                searchName.includes(r.reportName.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
        }

        // If still no match, show available options instead of downloading random report
        if (!matchingReport) {
            console.log('⚠️ No matching report found for:', searchName);
            if (window.showNotification) {
                window.showNotification({
                    type: 'info',
                    title: 'Report Not Found',
                    message: 'Could not find the specific report. Please check the Requirements List section in the sidebar to download available reports.',
                    actionText: 'OK'
                });
            }
            return;
        }

        console.log('📥 Downloading report:', matchingReport.reportName);

        // Download the report
        const downloadResponse = await fetch('/api/project/report/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include cookies for authentication
            body: JSON.stringify({
                projectID: projectID,
                reportID: matchingReport.reportID
            })
        });

        if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = matchingReport.reportName + '.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            console.error('Failed to download report');
            if (window.showNotification) {
                window.showNotification({
                    type: 'error',
                    title: 'Download Failed',
                    message: 'Failed to download the report.',
                    actionText: 'OK'
                });
            }
        }
    } catch (error) {
        console.error('Error downloading report:', error);
    }
}

function setBubbleContent(bubble, text, { allowMarkdown = false } = {}) {
    if (!bubble) return;
    if (allowMarkdown) {
        bubble.innerHTML = renderMarkdownContent(text);
        // Post-process to make download links clickable
        postProcessDownloadLinks(bubble);
    } else {
        bubble.textContent = text;
    }
}

// Add a message to chat
function addMessage(role, text, conversationID = null, chatSeq = null, attachedFileIDs = []) {
    console.log(`💬 addMessage called:`, {
        role,
        text: text?.substring(0, 50) + '...',
        conversationID,
        chatSeq,
        attachedFileIDs,
        fileCount: (attachedFileIDs || []).length
    });

    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageTimestamp = Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = `chat-message-${role}-${messageTimestamp}`;
    messageDiv.className = role === 'user' ? 'message user-message' : 'message ai-message';

    // Store conversation data for editing
    if (conversationID) {
        messageDiv.dataset.conversationId = conversationID;
    }
    if (chatSeq) {
        messageDiv.dataset.chatSeq = chatSeq;
    }

    const avatar = document.createElement('div');
    avatar.id = `chat-message-avatar-${role}-${messageTimestamp}`;
    avatar.className = 'message-avatar';

    // Use profile picture for user, Union.svg for AI
    if (role === 'user') {
        const avatarUrl = window.userAvatarUrl || './img/user.svg';
        avatar.innerHTML = `<img src="${avatarUrl}" alt="User" style="width: 80%; height: 80%; object-fit: cover; border-radius: 50%;">`;
    } else {
        avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;
    }

    const bubble = document.createElement('div');
    bubble.id = `chat-message-bubble-${role}-${messageTimestamp}`;
    bubble.className = 'message-bubble';

    // Create text node or HTML content for message
    if (role === 'ai') {
        bubble.dataset.role = 'ai';
        setBubbleContent(bubble, text, { allowMarkdown: true });
    } else {
        const textNode = document.createTextNode(text);
        bubble.appendChild(textNode);
    }

    // For user messages, create a content wrapper that includes bubble + files + edit button
    if (role === 'user') {
        // Create wrapper for bubble and additional elements
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 600px;
        `;

        // Add the bubble to wrapper
        contentWrapper.appendChild(bubble);

        // Create a row container for files and edit button (below bubble, same row)
        const bottomRow = document.createElement('div');
        bottomRow.className = 'message-bottom-row';
        bottomRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding-left: 12px;
            min-height: 24px;
        `;

        // Add attached files to the left side of bottom row
        if (attachedFileIDs && attachedFileIDs.length > 0) {
            const filesContainer = document.createElement('div');
            filesContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                flex: 1;
            `;

            // Get file information from the chips or source list
            attachedFileIDs.forEach(fileId => {
                // Try to find the file in chips first
                let fileName = fileId; // Default to ID
                const chipElement = document.querySelector(`[data-file-id="${fileId}"]`);
                if (chipElement) {
                    // Try to get file name from data attribute first
                    const storedFileName = chipElement.getAttribute('data-file-name');
                    if (storedFileName) {
                        fileName = storedFileName;
                    } else {
                        // Fallback to text content from span
                        const fileNameSpan = chipElement.querySelector('span');
                        if (fileNameSpan) {
                            fileName = fileNameSpan.textContent;
                        }
                    }
                } else {
                    // Try to find in source list
                    const sourceElement = document.getElementById(`source-file-name-${fileId}`);
                    if (sourceElement) {
                        fileName = sourceElement.textContent;
                    } else if (window.chatFileNameMap && window.chatFileNameMap.has(fileId)) {
                        // Use the global file name map from chat history loading
                        fileName = window.chatFileNameMap.get(fileId);
                    }
                }

                const fileChip = document.createElement('div');
                fileChip.dataset.fileId = fileId; // Store file ID for retrieval during edit
                fileChip.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    background-color: rgba(195, 171, 111, 0.15);
                    border: 1px solid rgba(195, 171, 111, 0.3);
                    border-radius: 12px;
                    font-size: 11px;
                    color: #666;
                    font-family: 'Inter', Helvetica;
                `;
                fileChip.innerHTML = `📎 ${fileName}`;
                filesContainer.appendChild(fileChip);
            });

            bottomRow.appendChild(filesContainer);
        } else {
            // Add spacer to push edit button to the left even when no files
            const spacer = document.createElement('div');
            spacer.style.flex = '1';
            bottomRow.appendChild(spacer);
        }

        // Add edit button to the right side of bottom row (only shows on hover via CSS)
        const editBtn = document.createElement('button');
        editBtn.className = 'message-edit-btn';
        editBtn.innerHTML = 'Edit';
        editBtn.title = 'Edit message';
        editBtn.style.cssText = `
            background: transparent;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            color: #999;
            transition: background-color 0.2s ease, color 0.2s ease;
            opacity: 0;
            flex-shrink: 0;
        `;

        editBtn.onmouseenter = () => {
            editBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            editBtn.style.color = '#666';
        };
        editBtn.onmouseleave = () => {
            editBtn.style.backgroundColor = 'transparent';
            editBtn.style.color = '#999';
        };

        if (conversationID && chatSeq) {
            editBtn.onclick = () => handleEditMessage(text, conversationID, chatSeq);
            console.log('✏️ Edit button added with data:', { conversationID, chatSeq });
        } else {
            editBtn.onclick = () => alert('This message cannot be edited yet. Please wait for the message to finish sending.');
            console.log('⚠️ Edit button added without data (will be updated later)');
        }

        bottomRow.appendChild(editBtn);

        // Add cancel button next to edit button (hidden by default, shown in edit mode)
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'message-cancel-btn';
        cancelBtn.innerHTML = 'Cancel';
        cancelBtn.title = 'Cancel edit';
        cancelBtn.style.cssText = `
            background: transparent;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            color: #e57373;
            transition: background-color 0.2s ease, color 0.2s ease;
            flex-shrink: 0;
            display: none;
        `;

        cancelBtn.onmouseenter = () => {
            cancelBtn.style.backgroundColor = 'rgba(229, 115, 115, 0.1)';
            cancelBtn.style.color = '#c62828';
        };
        cancelBtn.onmouseleave = () => {
            cancelBtn.style.backgroundColor = 'transparent';
            cancelBtn.style.color = '#e57373';
        };

        cancelBtn.onclick = () => cancelEditMode();

        bottomRow.appendChild(cancelBtn);
        contentWrapper.appendChild(bottomRow);

        // Now add avatar and contentWrapper to messageDiv
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentWrapper);
    } else {
        // AI message - simple structure (avatar + bubble)
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

    // Find the message element to get attached file IDs
    const messagesContainer = document.getElementById('chat-messages');
    let attachedFileIDs = [];

    if (messagesContainer) {
        const messageElements = messagesContainer.querySelectorAll('.message');
        messageElements.forEach(msg => {
            if (msg.dataset.conversationId === conversationID && parseInt(msg.dataset.chatSeq) === chatSeq) {
                // Found the message being edited
                // Extract file IDs from file chips in the message
                const fileChips = msg.querySelectorAll('[data-file-id]');
                if (fileChips.length > 0) {
                    attachedFileIDs = Array.from(fileChips).map(chip => chip.dataset.fileId);
                } else {
                    // Try to extract from file chip elements (alternative structure)
                    const bottomRow = msg.querySelector('.message-bottom-row');
                    if (bottomRow) {
                        // Parse file chips to get document IDs
                        // We need to match file names to document IDs from the project
                        // For now, store empty array - files will need to be reselected
                        // TODO: Store documentIDs in file chips for proper restoration
                    }
                }
            }
        });
    }

    // Store editing state globally including attached files
    window.editingMessage = {
        conversationID: conversationID,
        chatSeq: chatSeq,
        originalText: text,
        attachedFileIDs: attachedFileIDs
    };

    // Show cancel button and hide edit button on the message being edited
    showCancelButtonOnMessage(conversationID, chatSeq);

    // If files were attached, show them as chips
    if (attachedFileIDs.length > 0) {
        console.log('Restoring attached files for edit:', attachedFileIDs);
        // Re-create file chips for editing
        // This requires access to file metadata, so we'll need to fetch it
        restoreFileChipsForEdit(attachedFileIDs);
    }

    // Update send button to show it's editing mode
    const sendBtn = document.querySelector('.btn-send') || document.getElementById('btn-send-message');
    if (sendBtn) {
        sendBtn.style.backgroundColor = '#ff9800'; // Orange to indicate edit mode
        sendBtn.title = 'Send edited message';
    }

    // Show "On Edit" indicator
    showEditModeIndicator();

    // Update cancel edit button in file wrapper
    updateCancelEditButton();

    console.log('Editing message:', { conversationID, chatSeq, attachedFileIDs });
}

// Show edit mode indicator
function showEditModeIndicator() {
    // Remove existing indicator if present
    const existingIndicator = document.getElementById('edit-mode-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    const chatTitleElement = document.getElementById('chat-title');
    if (!chatTitleElement) return;

    // Create edit mode indicator container
    const editIndicator = document.createElement('span');
    editIndicator.id = 'edit-mode-indicator';
    editIndicator.style.cssText = `
        margin-left: 12px;
        margin-right: 12px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        vertical-align: middle;
    `;

    // Create ripple dot
    const rippleDot = document.createElement('span');
    rippleDot.className = 'edit-ripple-dot';
    rippleDot.style.cssText = `
        width: 8px;
        height: 8px;
        background-color: #ff9800;
        border-radius: 50%;
        display: inline-block;
        animation: ripple 1.5s ease-in-out infinite;
    `;

    // Add ripple animation style if not exists
    if (!document.getElementById('edit-ripple-style')) {
        const style = document.createElement('style');
        style.id = 'edit-ripple-style';
        style.textContent = `
            @keyframes ripple {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.3);
                    opacity: 0.7;
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Create text
    const textSpan = document.createElement('span');
    textSpan.textContent = 'On Edit';
    textSpan.style.cssText = `
        font-family: 'Inter', Helvetica;
        font-size: 13px;
        font-weight: 400;
        color: #999;
    `;

    editIndicator.appendChild(rippleDot);
    editIndicator.appendChild(textSpan);

    // Append inside chat title element so it appears next to the title text
    chatTitleElement.appendChild(editIndicator);
}

// Show cancel button on the message being edited
function showCancelButtonOnMessage(conversationID, chatSeq) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageElements = messagesContainer.querySelectorAll('.message');
    messageElements.forEach(msg => {
        const msgConvId = msg.dataset.conversationId;
        const msgChatSeq = parseInt(msg.dataset.chatSeq);

        if (msgConvId === conversationID && msgChatSeq === chatSeq) {
            // This is the message being edited - show cancel, hide edit
            const editBtn = msg.querySelector('.message-edit-btn');
            const cancelBtn = msg.querySelector('.message-cancel-btn');

            if (editBtn) editBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
        }
    });
}

// Hide cancel button and restore edit button on all messages
function hideCancelButtonOnMessages() {
    const cancelBtns = document.querySelectorAll('.message-cancel-btn');
    cancelBtns.forEach(btn => {
        btn.style.display = 'none';
        // Restore edit button visibility
        const editBtn = btn.parentNode?.querySelector('.message-edit-btn');
        if (editBtn) editBtn.style.display = '';
    });
}

// Restore file chips for edit mode
async function restoreFileChipsForEdit(fileIDs) {
    if (!fileIDs || fileIDs.length === 0) return;

    // Get current project ID
    const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
    if (!projectID) return;

    try {
        // Fetch project files to get metadata
        const response = await fetch('/api/project/file/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectID: projectID })
        });

        const data = await response.json();
        if (!data.files) return;

        // Create chips container if it doesn't exist
        let wrapper = document.getElementById('selected-files-wrapper');
        let chipsContainer = document.getElementById('selected-files-container');

        if (!chipsContainer) {
            // Create wrapper to hold container and cancel button
            wrapper = document.createElement('div');
            wrapper.id = 'selected-files-wrapper';
            wrapper.style.cssText = `
                margin: 0 auto;
                width: 90%;
                max-width: 650px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            chipsContainer = document.createElement('div');
            chipsContainer.id = 'selected-files-container';
            // chipsContainer.style.cssText = `
            //     flex: 1;
            //     display: flex;
            //     flex-wrap: nowrap;
            //     gap: 8px;
            //     padding: 10px 15px;
            //     background-color: rgb(249, 249, 249);
            //     border-radius: 16px 16px 0 0;
            //     align-items: center;
            //     justify-content: flex-start;
            //     overflow-x: auto;
            //     overflow-y: hidden;
            //     white-space: nowrap;
            // `;

            chipsContainer.style.cssText = `
                flex: 1;
                display: flex;
                flex-wrap: nowrap;
                gap: 8px;
                padding: 10px 15px;
                border-radius: 16px 16px 0 0;
                align-items: center;
                justify-content: flex-start;
                overflow-x: auto;
                overflow-y: hidden;
                white-space: nowrap;
            `;


            wrapper.appendChild(chipsContainer);

            // Insert between suggestion-chips and input-field form
            const inputForm = document.querySelector('.input-field');
            const suggestionChips = document.getElementById('suggestion-chips');

            if (inputForm && inputForm.parentNode) {
                inputForm.parentNode.insertBefore(wrapper, inputForm);
            } else if (suggestionChips && suggestionChips.parentNode) {
                if (suggestionChips.nextSibling) {
                    suggestionChips.parentNode.insertBefore(wrapper, suggestionChips.nextSibling);
                } else {
                    suggestionChips.parentNode.appendChild(wrapper);
                }
            }
        } else {
            // Ensure existing container uses horizontal scroll
            chipsContainer.style.display = 'flex';
            chipsContainer.style.flexWrap = 'nowrap';
            chipsContainer.style.overflowX = 'auto';
            chipsContainer.style.overflowY = 'hidden';
            chipsContainer.style.whiteSpace = 'nowrap';
        }

        // Clear existing chips
        chipsContainer.innerHTML = '';

        // Add chips for each attached file
        fileIDs.forEach(fileId => {
            const fileData = data.files.find(f => f.documentID === fileId);
            if (fileData) {
                // Construct filename with defensive cleaning
                const ext = fileData.documentExt || '';
                let cleanName = (fileData.documentName || '').replace(/\.+$/, '');
                const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;

                // Create file chip
                const fileChip = document.createElement('div');
                fileChip.setAttribute('data-file-id', fileId);
                // Store file name as data attribute for later retrieval
                fileChip.setAttribute('data-file-name', fileName);
                fileChip.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background-color: #fff;
                    border: 1px solid #e4e4e4;
                    border-radius: 20px;
                    font-family: 'Inter', Helvetica;
                    font-size: 13px;
                    color: #000;
                `;

                const fileNameSpan = document.createElement('span');
                fileNameSpan.textContent = fileName;
                fileNameSpan.style.maxWidth = '200px';
                fileNameSpan.style.overflow = 'hidden';
                fileNameSpan.style.textOverflow = 'ellipsis';
                fileNameSpan.style.whiteSpace = 'nowrap';

                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.style.cssText = `
                    border: none;
                    background: transparent;
                    font-size: 18px;
                    color: #666;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                removeBtn.onclick = () => {
                    fileChip.remove();
                    // Remove container if no more files
                    if (chipsContainer.children.length === 0) {
                        chipsContainer.remove();
                    }
                };

                fileChip.appendChild(fileNameSpan);
                fileChip.appendChild(removeBtn);
                chipsContainer.appendChild(fileChip);
            }
        });

        // Add cancel edit button
        updateCancelEditButton();

    } catch (error) {
        console.error('Error restoring file chips:', error);
    }
}

// Update or create cancel edit button in file wrapper (only when files are attached)
function updateCancelEditButton() {
    // Only add cancel button if in edit mode
    if (!window.editingMessage) return;

    let wrapper = document.getElementById('selected-files-wrapper');

    // Only add cancel button if wrapper exists (meaning files are attached)
    if (!wrapper) return;

    // Remove existing cancel button if present
    const existingBtn = wrapper.querySelector('.cancel-edit-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-edit-btn';
    cancelBtn.textContent = 'Cancel Edit';
    cancelBtn.style.cssText = `
        padding: 6px 12px;
        background: transparent;
        border: none;
        font-family: 'Inter', Helvetica;
        font-size: 13px;
        color: #666;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: color 0.2s;
    `;

    cancelBtn.onmouseover = () => {
        cancelBtn.style.color = '#333';
    };

    cancelBtn.onmouseout = () => {
        cancelBtn.style.color = '#666';
    };

    cancelBtn.onclick = () => {
        cancelEditMode();
    };

    // Add button to the wrapper
    wrapper.appendChild(cancelBtn);
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

    // Remove "On Edit" indicator
    const editIndicator = document.getElementById('edit-mode-indicator');
    if (editIndicator) {
        editIndicator.remove();
    }

    // Hide cancel button on messages and restore edit buttons
    hideCancelButtonOnMessages();

    // Clear input field
    const inputField = document.getElementById('message-input') || document.getElementById('main-message-input');
    if (inputField) {
        inputField.value = '';
    }

    // Clear selected files wrapper (which contains the cancel button)
    const wrapper = document.getElementById('selected-files-wrapper');
    if (wrapper) {
        wrapper.remove();
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

    const id = 'typing-indicator-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'message ai-message';

    const avatar = document.createElement('div');
    avatar.id = id + '-avatar';
    avatar.className = 'message-avatar';
    avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;

    const bubble = document.createElement('div');
    bubble.id = id + '-bubble';
    bubble.className = 'message-bubble typing-bubble';
    bubble.innerHTML = `
        <div id="${id}-dots" class="typing-indicator">
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
    console.log('=== STREAM CHAT RESPONSE ===');
    console.log('📤 Sending data to /api/agent/chat:', JSON.stringify(data, null, 2));
    console.log('typingId:', typingId);

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
    avatar.id = 'ai-message-avatar-' + Date.now();
    avatar.className = 'message-avatar';
    avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;

    const bubble = document.createElement('div');
    bubble.id = 'ai-message-bubble-' + Date.now();
    bubble.className = 'message-bubble';
    bubble.dataset.role = 'ai';

    // Stage progress indicator - COMMENTED OUT (not needed for now)

    const progressIndicator = document.createElement('div');
    progressIndicator.id = 'ai-progress-indicator';
    progressIndicator.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 12px;
        margin-bottom: 0;
        font-family: Inter, Helvetica, sans-serif;
        font-size: 13px;
        color: #495057;
    `;
    progressIndicator.innerHTML = `
<!--        <div style="display: flex; gap: 6px;">-->
<!--            <div id="stage-dot-1" style="width: 10px; height: 10px; border-radius: 50%; background: #dee2e6; transition: all 0.3s;"></div>-->
<!--            <div id="stage-dot-2" style="width: 10px; height: 10px; border-radius: 50%; background: #dee2e6; transition: all 0.3s;"></div>-->
<!--            <div id="stage-dot-3" style="width: 10px; height: 10px; border-radius: 50%; background: #dee2e6; transition: all 0.3s;"></div>-->
<!--        </div>-->
        <span id="stage-message" style="flex: 1;">Initializing...</span>
        <div class="spinner-small" style="width: 16px; height: 16px; border: 2px solid #dee2e6; border-top-color: #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    `;

    // Add spinner animation if not exists
    if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = `
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.2); } }
        `;
        document.head.appendChild(style);
    }

    bubble.appendChild(progressIndicator);


    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    let fullResponse = '';
    let chatIDReceived = null;
    let conversationIDReceived = null;
    let chatSeqReceived = null;
    let buffer = '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // Helper to update progress indicator - COMMENTED OUT (progress indicator disabled)
    /*
    const updateProgress = (stage, status, message) => {
        const indicator = document.getElementById('ai-progress-indicator');
        if (!indicator) return;

        const stageMessage = document.getElementById('stage-message');
        if (stageMessage && message) {
            stageMessage.textContent = message;
        }

        // Update dots
        for (let i = 1; i <= 3; i++) {
            const dot = document.getElementById(`stage-dot-${i}`);
            if (dot) {
                if (i < stage) {
                    dot.style.background = '#28a745'; // Completed - green
                } else if (i === stage && status === 'start') {
                    dot.style.background = '#007bff'; // Active - blue
                    dot.style.animation = 'pulse 1s infinite';
                } else if (i === stage && status === 'complete') {
                    dot.style.background = '#28a745'; // Just completed - green
                    dot.style.animation = 'none';
                } else {
                    dot.style.background = '#dee2e6'; // Pending - gray
                }
            }
        }

        // Remove indicator when stage 3 starts (content will stream)
        if (stage === 3 && status === 'start') {
            indicator.remove();
        }
    };
    */

    // Helper function to process a single SSE event
    const processSSEEvent = async (eventData) => {
        if (!eventData || !eventData.trim()) return;

        try {
            const jsonData = JSON.parse(eventData);

            if (jsonData.type === 'chatID') {
                chatIDReceived = jsonData.chatID;
                console.log('Chat ID:', chatIDReceived);

                if (data.chatID === '') {
                    console.log('New chat created, refreshing history...');
                    await fetchProjectChats(data.projectID);
                }
            } else if (jsonData.type === 'reportGenerated') {
                // Handle report generation event - refresh sidebar reports
                console.log('📊 Report generated event received:', jsonData);
                console.log('📊 Report type:', jsonData.reportType);
                const projectID = jsonData.projectID || data.projectID;
                console.log('📊 Project ID for refresh:', projectID);

                // Add a small delay to ensure database write completes
                console.log('📊 Waiting 500ms before fetching reports...');
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh the reports list in sidebar
                if (typeof window.fetchProjectReports === 'function') {
                    console.log('🔄 Calling fetchProjectReports for project:', projectID);
                    try {
                        await window.fetchProjectReports(projectID);
                        console.log('✅ fetchProjectReports completed');
                    } catch (err) {
                        console.error('❌ fetchProjectReports error:', err);
                    }
                } else {
                    console.warn('⚠️ window.fetchProjectReports is not a function');
                }

                // Also dispatch the event for other listeners
                window.dispatchEvent(new CustomEvent('reportGenerated', {
                    detail: { projectID, reportType: jsonData.reportType }
                }));
                console.log('📊 Dispatched reportGenerated custom event');
            } else if (jsonData.type === 'stage') {
                // Handle stage progress events from 3-stage processing (UI indicator disabled)
                console.log(`📊 Stage ${jsonData.stage}: ${jsonData.status}`, jsonData.message || '');

                // Stage UI update disabled - updateProgress(jsonData.stage, jsonData.status, jsonData.message);

                // When Stage 2 completes, refresh requirements panel data
                if (jsonData.stage === 2 && jsonData.status === 'complete' && jsonData.refreshRequirements) {
                    console.log('🔄 Stage 2 complete - refreshing requirements data...');

                    // Dispatch event to refresh requirements in the panel
                    window.dispatchEvent(new CustomEvent('requirementsUpdated', {
                        detail: { projectID: jsonData.projectID || data.projectID }
                    }));

                    // Also refresh the sidebar requirements section if available
                    if (typeof window.fetchProjectRequirements === 'function') {
                        window.fetchProjectRequirements(jsonData.projectID || data.projectID);
                    }
                    if (typeof window.fetchProjectUserStories === 'function') {
                        window.fetchProjectUserStories(jsonData.projectID || data.projectID);
                    }
                }
            } else if (jsonData.type === 'chunk') {
                const content = jsonData.content || '';
                console.log('📦 Received chunk:', content.substring(0, 50) + (content.length > 50 ? '...' : ''));
                fullResponse += content;
                console.log('📝 Full response length:', fullResponse.length);

                if (content.startsWith('\n\n') && fullResponse.length > content.length) {
                    console.log('🔧 Detected tool response continuation');
                }

                setBubbleContent(bubble, fullResponse, { allowMarkdown: true });
                scrollToBottom();
            } else if (jsonData.type === 'done') {
                console.log('Streaming complete');

                if (jsonData.conversationID && jsonData.chatSeq) {
                    conversationIDReceived = jsonData.conversationID;
                    chatSeqReceived = jsonData.chatSeq;
                    console.log('📥 Received conversation data:', { conversationID: conversationIDReceived, chatSeq: chatSeqReceived });
                }

                // Get thread name from the done event and update immediately
                const threadName = jsonData.threadName || 'Untitled Chat';
                console.log('📝 Thread name from server:', threadName);

                // Always update the chat title in the header immediately
                const chatTitleElement = document.getElementById('chat-title');
                if (chatTitleElement && threadName && threadName !== 'Untitled Chat') {
                    chatTitleElement.textContent = threadName;
                    console.log('📝 Updated header title to:', threadName);
                }

                // For new chats, also update the sidebar
                if (chatIDReceived) {
                    // Refresh sidebar to get the new chat entry
                    if (data.chatID === '') {
                        console.log('New chat created, refreshing sidebar...');
                        await fetchProjectChats(data.projectID);
                    }

                    // Find and update the chat item in sidebar
                    const chatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatIDReceived}"]`);
                    if (chatItem) {
                        // Deselect all and select this one
                        const allChatItems = document.querySelectorAll('.chat-history-item');
                        allChatItems.forEach(item => {
                            item.classList.remove('selected');
                            item.style.backgroundColor = 'transparent';
                        });

                        chatItem.classList.add('selected');
                        chatItem.style.backgroundColor = '#e0e0e0';

                        // Update the sidebar item's dataset and text
                        chatItem.dataset.threadName = threadName;

                        // Find the name element and update it
                        const nameElement = chatItem.querySelector('.chat-item-name') ||
                                           chatItem.querySelector('span:first-child') ||
                                           chatItem.querySelector('span');
                        if (nameElement && threadName && threadName !== 'Untitled Chat') {
                            nameElement.textContent = threadName;
                            console.log('📝 Updated sidebar title to:', threadName);
                        }
                    }
                }

                // Always refresh reports after stream completes (in case reports were generated)
                // Add a small delay to ensure database writes are complete
                if (typeof window.fetchProjectReports === 'function') {
                    console.log('🔄 Refreshing reports after stream complete (with 500ms delay)');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await window.fetchProjectReports(data.projectID);
                }
            } else if (jsonData.type === 'error') {
                console.error('❌ Stream error received from server:', jsonData.message);
                removeTypingIndicator(typingId);
                setBubbleContent(bubble, `Error: ${jsonData.message}`, { allowMarkdown: false });
                bubble.style.color = '#f44336';
                throw new Error(jsonData.message || 'Stream failed');
            }
        } catch (e) {
            console.error('Error parsing SSE event:', e.message);
            console.error('Event data was:', eventData.substring(0, 200) + (eventData.length > 200 ? '...' : ''));
        }
    };

    // Read and process stream
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE messages (separated by double newline)
        let separatorIndex;
        while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
            const message = buffer.substring(0, separatorIndex);
            buffer = buffer.substring(separatorIndex + 2);

            // Extract data from SSE message
            const lines = message.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const eventData = line.substring(6);
                    await processSSEEvent(eventData);
                }
            }
        }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                await processSSEEvent(line.substring(6));
            }
        }
    }

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

        // Clear any selected files from the input area (files are per-chat, not shared)
        const selectedFilesWrapper = document.getElementById('selected-files-wrapper');
        if (selectedFilesWrapper) {
            selectedFilesWrapper.remove();
            console.log('🗑️ Cleared selected files from input area (switching chats)');
        }

        // Clear input field text as well
        const inputField = document.getElementById('main-message-input');
        if (inputField) {
            inputField.value = '';
            inputField.style.height = 'auto';
        }

        // Show chat interface (hide welcome screen)
        showChatInterface();

        // Fetch project files to build a file name lookup map
        let fileNameMap = new Map();
        if (projectID) {
            try {
                const filesResponse = await fetch('/api/project/file/list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID: projectID })
                });

                if (filesResponse.ok) {
                    const filesData = await filesResponse.json();
                    if (filesData.files && Array.isArray(filesData.files)) {
                        filesData.files.forEach(file => {
                            const ext = file.documentExt || '';
                            let cleanName = (file.documentName || '').replace(/\.+$/, '');
                            const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                            fileNameMap.set(file.documentID, fullFileName);
                        });
                        console.log(`📁 Loaded ${fileNameMap.size} file names for chat history`);
                    }
                }
            } catch (error) {
                console.error('Error fetching file names:', error);
            }
        }

        // Store file name map globally for addMessage to use
        window.chatFileNameMap = fileNameMap;

        // Display all conversations
        const conversations = data.conversations || [];
        console.log(`📋 Loading ${conversations.length} conversations`);

        // Even if empty, keep chat interface visible (user clicked to view this thread)
        conversations.forEach((conv, index) => {
            console.log(`  Conversation ${index + 1}:`, {
                message: conv.conversationMessage?.substring(0, 50) + '...',
                conversationID: conv.conversationID,
                chatSeq: conv.chatSeq,
                documentIDs: conv.documentIDs,
                fileCount: (conv.documentIDs || []).length
            });

            // Add user message with conversation data and attached files for editing
            if (conv.conversationMessage) {
                addMessage('user', conv.conversationMessage, conv.conversationID, conv.chatSeq, conv.documentIDs || []);
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
            credentials: 'include', // Include cookies for authentication
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

    // Clear any selected files from the input area
    const selectedFilesWrapper = document.getElementById('selected-files-wrapper');
    if (selectedFilesWrapper) {
        selectedFilesWrapper.remove();
        console.log('🗑️ Cleared selected files from input area (back to initial)');
    }

    // Clear input field text
    const mainMessageInput = document.getElementById('main-message-input');
    if (mainMessageInput) {
        mainMessageInput.value = '';
        mainMessageInput.style.height = 'auto';
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
window.refreshProjectFiles = fetchProjectFiles; // Alias for refreshing files after upload
window.fetchProjectReports = fetchProjectReports;
window.loadChatThread = loadChatThread;
window.backToInitialScreen = backToInitialScreen;

// Function to open requirements panel
function openRequirementsPanel() {
    console.log('[Requirements] Opening requirements panel');
    
    const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
    
    if (!projectID) {
        console.error('[Requirements] No project selected');
        alert('Please select a project first');
        return;
    }
    
    // Create and show the requirements panel modal
    const event = new CustomEvent('openRequirementsPanel', { detail: { projectID } });
    window.dispatchEvent(event);
}

// Make openRequirementsPanel available globally
window.openRequirementsPanel = openRequirementsPanel;

// Make available globally
window.TempHome = TempHome;
