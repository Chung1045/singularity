/**
 * TempHome - Main home page component (Refactored)
 *
 * This file has been refactored from 3900+ lines to use modular components:
 * - ChatMessage.js - Message rendering
 * - homeModals.js - File selection and confirmation modals
 * - ChatService.js - API calls for chat
 * - ChatUtils.js - Utility functions
 * - EditMode.js - Message editing
 * - ReportService.js - Report generation/download
 * - FileChipsManager.js - File chip management
 */

const { useState } = React;

// ===== GLOBAL HANDLERS =====

/**
 * Handle Analyze Documents - analyzes selected documents from the Source panel and/or attachment dropdown
 */
window.handleAnalyzeDocuments = async function() {
    const projectDropdown = document.getElementById("select-project-drop-down");
    const projectID = projectDropdown?.value;

    if (!projectID) {
        window.showNotification?.({ type: 'error', title: 'No Project Selected', message: 'Please select a project first.', actionText: 'OK' });
        return;
    }

    // Get files from both sources: Source panel and attachment dropdown chips
    const selectedSource = ChatUtils.getSelectedSource() || [];

    // Try both methods to get chip file IDs (fallback)
    let chipFileIDs = [];
    try {
        chipFileIDs = ChatUtils.getChipFileIDs() || [];
    } catch (e) {
        console.warn('[Analyze Documents] Error getting chip file IDs from ChatUtils:', e);
    }

    // Fallback to FileChipsManager method if ChatUtils didn't return anything
    if (!chipFileIDs || chipFileIDs.length === 0) {
        try {
            chipFileIDs = FileChipsManager?.getSelectedIDs() || [];
        } catch (e) {
            console.warn('[Analyze Documents] Error getting chip file IDs from FileChipsManager:', e);
        }
    }

    // Also try direct DOM query as final fallback
    if (!chipFileIDs || chipFileIDs.length === 0) {
        try {
            const chips = document.querySelectorAll('#selected-files-container [data-file-id]');
            chipFileIDs = Array.from(chips).map(chip => chip.getAttribute('data-file-id')).filter(Boolean);
        } catch (e) {
            console.warn('[Analyze Documents] Error getting chip file IDs from DOM:', e);
        }
    }

    console.log('[Analyze Documents] Selected Source:', selectedSource);
    console.log('[Analyze Documents] Chip File IDs:', chipFileIDs);
    console.log('[Analyze Documents] Chips container exists:', !!document.getElementById('selected-files-container'));
    console.log('[Analyze Documents] Number of chips in DOM:', document.querySelectorAll('#selected-files-container [data-file-id]').length);

    const allAttachedDocuments = ChatUtils.mergeAttachedDocuments(selectedSource, chipFileIDs);

    console.log('[Analyze Documents] All Attached Documents:', allAttachedDocuments);

    if (!allAttachedDocuments?.length) {
        window.showNotification?.({ type: 'info', title: 'No Documents Selected', message: 'Please select documents from the Source panel or use the attachment dropdown to select files to analyze.', actionText: 'OK' });
        return;
    }

    const projectTitle = projectDropdown.options[projectDropdown.selectedIndex]?.text || 'Project Analysis';

    // Show chat interface first so messages are visible
    ChatUtils.showChatInterface();

    // Build file name map for displaying file names in chat
    let fileNameMap = new Map();
    try {
        const filesResponse = await fetch('/api/project/file/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({ projectID })
        });
        if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            filesData.files?.forEach(file => {
                const ext = file.documentExt || '';
                let cleanName = (file.documentName || '').replace(/\.+$/, '');
                const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                fileNameMap.set(file.documentID, fullFileName);
            });
        }
    } catch (error) {
        console.error('Error fetching file names:', error);
    }
    window.chatFileNameMap = fileNameMap;

    // Capture timestamp BEFORE sending to server
    const userMessageSendTime = new Date().toISOString();

    // Add user message with attached files
    // File names will be displayed as text in message-bottom-row (handled by addMessage)
    const userMessageText = allAttachedDocuments.length === 1
        ? 'Analyze Document'
        : `Analyze ${allAttachedDocuments.length} Documents`;
    console.log('[Analyze] User message sent at:', userMessageSendTime);
    addMessage('user', userMessageText, null, null, allAttachedDocuments, userMessageSendTime);

    // Remove the file chips container after adding the message to chat
    ChatUtils.clearSelectedFiles();

    // Show loading indicator
    ChatUtils.showLoadingIndicator();

    try {
        const response = await fetch('/api/agent/analyze-documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({
                projectID,
                documentIDs: allAttachedDocuments,
                title: projectTitle,
                chatID: localStorage.getItem("activeChatID"),
                conversationTimeDate: userMessageSendTime // Send client timestamp to server
            })
        });

        // Wait for response to be fully parsed before removing loading indicator
        const data = await response.json();

        if (response.ok && data.success) {
            // Handle chatID - update tracking and refresh chat history
            const chatID = data.chatID;
            if (chatID) {
                window.currentChatID = chatID;
                localStorage.setItem('activeChatID', chatID);
                localStorage.setItem('activeChatProjectID', projectID);
                localStorage.removeItem('wentBackToInitial');

                // Update URL with chatID
                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('chatID', chatID);
                window.history.pushState({ chatID }, '', currentUrl);

                // Wait a bit for database transaction to commit, then refresh chat history
                // This ensures the new chat is available when we fetch the list
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh chat history to show the new chat
                const refreshChatHistory = async () => {
                    if (typeof window.fetchProjectChats === 'function') {
                        console.log('[Analyze Documents] Refreshing chat history for project:', projectID);
                        await window.fetchProjectChats(projectID);
                        console.log('[Analyze Documents] Chat history refreshed');
                    } else {
                        console.warn('[Analyze Documents] fetchProjectChats function not available');
                    }
                };

                await refreshChatHistory();

                // Select the new chat item in sidebar after rendering
                // Try multiple times with increasing delays to ensure the DOM is updated
                const selectChatItem = async (attempt = 0) => {
                    const newChatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatID}"]`);
                    if (newChatItem) {
                        document.querySelectorAll('.chat-history-item').forEach(item => {
                            item.classList.remove('selected');
                            item.style.backgroundColor = 'transparent';
                        });
                        newChatItem.classList.add('selected');
                        newChatItem.style.backgroundColor = '#e0e0e0';
                        console.log('[Analyze Documents] Chat item selected in sidebar');
                    } else if (attempt < 5) {
                        // If not found and we haven't exceeded retries, refresh again and retry
                        if (attempt === 2 || attempt === 4) {
                            // Force refresh on attempts 2 and 4
                            console.log('[Analyze Documents] Chat item not found, refreshing history again...');
                            await refreshChatHistory();
                        }
                        // Retry with increasing delays
                        setTimeout(() => selectChatItem(attempt + 1), 300 * (attempt + 1));
                    } else {
                        console.warn('[Analyze Documents] Could not find chat item in sidebar after multiple attempts. ChatID:', chatID);
                        // Final attempt - refresh one more time
                        await refreshChatHistory();
                    }
                };

                // Start selecting after a short delay to allow React to render
                setTimeout(() => selectChatItem(), 500);
            }

            // Remove loading indicator before adding messages
            ChatUtils.removeLoadingIndicator();

            for (const analysis of data.analysis) {
                addMessage('ai', analysis || 'Analysis complete.');
            }

            window.showNotification?.({ type: 'success', title: 'Analysis Complete', message: `Successfully analyzed ${data.documentsAnalyzed} document(s).`, actionText: 'OK' });
        } else {
            // Remove loading indicator on error
            ChatUtils.removeLoadingIndicator();
            addMessage('ai', `Error: ${data.message || 'Analysis failed.'}`);
            window.showNotification?.({ type: 'error', title: 'Analysis Failed', message: data.message || 'Unable to analyze documents.', actionText: 'OK' });
        }
    } catch (error) {
        ChatUtils.removeLoadingIndicator();
        addMessage('ai', 'Sorry, there was an error analyzing the documents.');
        window.showNotification?.({ type: 'error', title: 'Error', message: 'An error occurred while analyzing documents.', actionText: 'OK' });
    }
};

// Alert Modal sub-component - defined first to ensure it's available
const AlertModalComponent = ({ modal, closeModal, isMobile }) => {
    return React.createElement('div', {
        style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: window.ZIndex?.MODAL_BACKDROP || 30, padding: '20px'
        },
        onClick: (e) => e.target === e.currentTarget && modal.type === 'alert' && closeModal()
    },
        React.createElement('div', {
            style: {
                backgroundColor: '#ffffff', borderRadius: '15px',
                padding: isMobile ? '25px' : '30px',
                maxWidth: isMobile ? '90%' : '500px', width: '100%',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                display: 'flex', flexDirection: 'column', gap: '20px'
            },
            onClick: (e) => e.stopPropagation()
        },
            React.createElement('div', { style: { fontFamily: 'Urbanist, Helvetica', fontWeight: 700, fontSize: isMobile ? '20px' : '24px', color: '#000' } }, modal.title),
            React.createElement('div', { style: { fontFamily: 'Inter, Helvetica', fontSize: isMobile ? '14px' : '16px', color: '#000', lineHeight: '1.5' } }, modal.message),
            React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' } },
                React.createElement('button', {
                    style: {
                        padding: isMobile ? '10px 20px' : '12px 24px', borderRadius: '10px', border: 'none',
                        backgroundColor: '#000', color: '#fff', fontFamily: 'Urbanist, Helvetica',
                        fontWeight: 600, fontSize: isMobile ? '14px' : '16px', cursor: 'pointer'
                    },
                    onClick: closeModal
                }, 'OK')
            )
        )
    );
};

const Home = ({ csrfToken, userInfo }) => {
    window.csrfToken = csrfToken;
    const shouldShowWelcomeOnLoad = new URLSearchParams(window.location.search).get('welcome') === '1';
    // ===== STATE =====
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (window.innerWidth <= 1040) return true;
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
    const [userAvatarUrl, setUserAvatarUrl] = useState('./img/user.svg');
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [currentProjectID, setCurrentProjectID] = useState(null);
    const [showRequirementsPanel, setShowRequirementsPanel] = useState(false);
    const [requirementsPanelProjectID, setRequirementsPanelProjectID] = useState(null);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [selectedProjectID, setSelectedProjectID] = useState(null);
    const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(shouldShowWelcomeOnLoad);

    const isMobile = windowWidth <= 480;
    const isOverlay = windowWidth <= 1040;

    // ===== EFFECTS =====

    // Window resize handler
    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Collapse sidebar when entering overlay breakpoint; restore saved state when leaving
    React.useEffect(() => {
        if (isOverlay) {
            setSidebarCollapsed(true);
        } else {
            const saved = localStorage.getItem('sidebarCollapsed');
            setSidebarCollapsed(saved !== null ? JSON.parse(saved) : false);
        }
    }, [isOverlay]);

    // Fetch user avatar
    React.useEffect(() => {
        async function fetchAvatar() {
            try {
                const response = await fetch('/api/profile-pic/fetch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({})
                });

                const data = await response.json();
                if (data.success && data.data?.[0]?.image) {
                    setUserAvatarUrl(data.data[0].image);
                    window.userAvatarUrl = data.data[0].image;
                }
            } catch (error) {
                console.error('Error fetching avatar:', error);
            }
        }
        fetchAvatar();
    }, []);

    // Sync project ID from sidebar via event instead of polling
    React.useEffect(() => {
        const handleProjectSelected = (event) => {
            const projectID = event.detail?.projectID;
            if (projectID) {
                console.log('[TempHome] Project selected event received:', projectID);
                setSelectedProjectID(projectID);
            }
        };

        // Initial sync on mount
        const initialProjectID = window.getCurrentProjectID?.();
        if (initialProjectID) {
            setSelectedProjectID(initialProjectID);
        }

        window.addEventListener('projectSelected', handleProjectSelected);
        return () => window.removeEventListener('projectSelected', handleProjectSelected);
    }, []);

    // Auto-load chat from URL parameter
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const chatID = params.get('chatID');
        if (chatID && typeof window.loadChatThread === 'function') {
            setTimeout(() => window.loadChatThread(chatID), 500);
        }
    }, []);

    // Restore active chat from localStorage
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (!params.get('chatID')) {
            if (localStorage.getItem('wentBackToInitial') !== 'true') {
                const savedChatID = localStorage.getItem('activeChatID');
                if (savedChatID) {
                    window.pendingChatRestoration = savedChatID;
                }
            }
        }
    }, []);

    // File upload event listener
    React.useEffect(() => {
        const handleOpenFileUpload = (event) => {
            if (!window.FileUploadComponent) {
                alert('File upload component is not ready. Please refresh the page.');
                return;
            }
            const { projectID } = event.detail;
            setCurrentProjectID(projectID);
            setShowFileUpload(true);
        };

        window.addEventListener('openFileUpload', handleOpenFileUpload);
        return () => window.removeEventListener('openFileUpload', handleOpenFileUpload);
    }, []);

    // Requirements panel event listener
    React.useEffect(() => {
        const handleOpenRequirementsPanel = (event) => {
            if (!window.RequirementsPanel) {
                alert('Requirements panel component is not ready. Please refresh the page.');
                return;
            }
            setRequirementsPanelProjectID(event.detail.projectID);
            setShowRequirementsPanel(true);
        };

        window.addEventListener('openRequirementsPanel', handleOpenRequirementsPanel);
        return () => window.removeEventListener('openRequirementsPanel', handleOpenRequirementsPanel);
    }, []);

    // Close attachment menu on outside click
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (attachmentMenuOpen &&
                !event.target.closest('#attachment-menu-button') &&
                !event.target.closest('#attachment-dropdown-menu')) {
                setAttachmentMenuOpen(false);
            }
        };

        if (attachmentMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [attachmentMenuOpen]);

    // Initialize quick prompts visibility on mount
    React.useEffect(() => {
        // Wait a bit for chat history to load
        const timer = setTimeout(() => {
            const quickPromptsContainer = document.getElementById('quick-prompts-container');
            const chatInterface = document.getElementById('chat-interface');

            if (quickPromptsContainer && chatInterface) {
                // Show quick prompts if on initial screen (chat interface is hidden)
                if (chatInterface.style.display !== 'flex') {
                    quickPromptsContainer.style.display = 'flex';
                } else {
                    quickPromptsContainer.style.display = 'none';
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // ===== HANDLERS =====

    const showAlert = (title, message) => {
        setModal({ isOpen: true, title, message, type: 'alert', onConfirm: null, onCancel: null });
    };

    const closeModal = () => {
        setModal({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null });
    };

    const logout = async () => {
        if (!csrfToken) {
            showAlert('Error', 'Security token missing. Please refresh the page.');
            return;
        }

        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'CSRF-Token': window.csrfToken },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: () => {
                showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.');
                setTimeout(() => window.location = "/login", 3000);
            },
            error: (xhr) => {
                showAlert('Error', xhr.responseJSON?.message || "An error occurred. Please try again.");
            }
        });
    };

    const handleProfileRoute = () => window.location.href = "/profile";

    // Use the global handleAnalyzeDocuments function
    const handleAnalyzeDocuments = window.handleAnalyzeDocuments;

    const handleUploadFiles = async () => {
        setAttachmentMenuOpen(false);
        const projectID = window.getCurrentProjectID?.();

        if (!projectID) {
            await window.showNotification?.({
                type: 'info',
                title: 'No Project Selected',
                message: 'Please create or select a project before uploading files.',
                actionText: 'OK'
            });
            return;
        }

        if (!window.FileUploadComponent) {
            alert('File upload component is not ready. Please refresh the page.');
            return;
        }

        setCurrentProjectID(projectID);
        setShowFileUpload(true);
    };

    const handleSelectUploadedFiles = () => {
        setAttachmentMenuOpen(false);
        showUploadedFilesSelectionModal();
    };

    const handleWelcomeGetStarted = () => {
        setShowWelcomeOverlay(false);
        const url = new URL(window.location.href);
        url.searchParams.delete('welcome');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    };

    const username = userInfo?.userName || userInfo?.email || 'User';
    console.log(`Home.js CSRF Token Value: ${window.csrfToken}`);

    // ===== RENDER =====
    return React.createElement('div', {
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false)
    },
        React.createElement('div', { className: 'group' },
            // Sidebar overlay backdrop (narrow screens only, when sidebar is open)
            isOverlay && !sidebarCollapsed && React.createElement('div', {
                className: 'sidebar-overlay-backdrop',
                style: {
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    zIndex: window.ZIndex?.SIDEBAR_OVERLAY_BACKDROP || 24,
                    animation: 'backdrop-fade-in 200ms ease forwards',
                },
                onClick: () => setSidebarCollapsed(true)
            }),

            // Sidebar
            React.createElement(window.Sidebar, {
                sidebarCollapsed,
                setSidebarCollapsed,
                isOverlay,
                username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen,
                setUserMenuOpen,
                userInfo,
                csrfToken: csrfToken,
            }),

            // Alert Modal
            modal.isOpen && React.createElement(AlertModalComponent, { modal, closeModal, isMobile }),

            // One-time signup welcome overlay
            showWelcomeOverlay && React.createElement(WelcomeOverlayComponent, { onGetStarted: handleWelcomeGetStarted }),

            // File Upload Modal
            showFileUpload && window.FileUploadComponent && React.createElement('div', {
                style: {
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: window.ZIndex?.MODAL || 31, padding: '20px'
                },
                onClick: (e) => e.target === e.currentTarget && setShowFileUpload(false)
            },

                React.createElement(window.FileUploadComponent, {
                    projectID: currentProjectID,
                    onClose: () => setShowFileUpload(false),
                    onFilesUploaded: (_files) => {
                        window.refreshProjectFiles?.(currentProjectID);
                    }
                })
            ),

            // Requirements Panel Modal
            showRequirementsPanel && window.RequirementsPanel && React.createElement('div', {
                style: {
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: window.ZIndex?.MODAL || 31, padding: '20px'
                },
                onClick: (e) => e.target === e.currentTarget && setShowRequirementsPanel(false)
            },
                React.createElement(window.RequirementsPanel, {
                    projectID: requirementsPanelProjectID,
                    onClose: () => setShowRequirementsPanel(false)
                })
            ),

            // Main content
            React.createElement('main', { className: 'right-container' },
                React.createElement('section', { className: 'main-screen' },
                    // Welcome header
                    React.createElement('header', { className: 'main-screen-title' },
                        React.createElement('img', { className: 'bouncy-logo', src: './img/bouncy-logo-animation.svg', alt: 'Singularity Logo' }),
                        React.createElement('div', { className: 'logo-text' },
                            React.createElement('h1', { className: 'text-wrapper' }, 'Singularity')
                        )
                    ),

                    // Chat interface
                    React.createElement('div', { id: 'chat-interface', className: 'chat-interface', style: { display: 'none' } },
                        React.createElement('div', { id: 'chat-top-bar', className: 'chat-top-bar' },
                            React.createElement('button', {
                                id: 'btn-back-to-initial',
                                className: 'btn-back-to-initial',
                                type: 'button',
                                onClick: () => window.backToInitialScreen?.()
                            },
                                React.createElement('img', { src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg', alt: 'Back', style: { width: '20px', height: '20px' } })
                            ),
                            React.createElement('h2', { id: 'chat-title', className: 'chat-title' }, 'New Chat')
                        ),
                        React.createElement('div', { id: 'chat-messages', className: 'chat-messages' })
                    ),

                    // Suggestion chips
                    React.createElement('div', { id: 'suggestion-chips', className: 'suggestion-chips', style: { display: 'none' } },
                        React.createElement('button', { className: 'chip', onClick: handleAnalyzeDocuments }, 'Analyze Documents')
                    ),

                    // Anchor for dynamic suggestion chips (injected above input)
                    React.createElement('div', { id: 'suggestion-chips-anchor' }),

                    // Input field
                    React.createElement('form', {
                        id: 'input-field-form',
                        className: 'input-field',
                        role: 'search',
                        onSubmit: (e) => { e.preventDefault(); submitConversationRequest(); }
                    },
                        React.createElement('div', { id: 'input-field-attachment-wrapper', style: { position: 'relative' } },
                            // Attachment menu button
                            React.createElement('button', {
                                id: 'attachment-menu-button',
                                type: 'button',
                                className: 'input-field-button',
                                onClick: (e) => { e.stopPropagation(); setAttachmentMenuOpen(!attachmentMenuOpen); }
                            },
                                React.createElement('img', { id: 'attachment-menu-icon', className: 'vector', src: './img/paperclip.svg', alt: 'Attach', style: { width: '20px', height: '20px' } })
                            ),

                            // Attachment dropdown
                            attachmentMenuOpen && React.createElement('div', {
                                id: 'attachment-dropdown-menu',
                                style: {
                                    position: 'absolute', bottom: '100%', left: '0', marginBottom: '7px',
                                    backgroundColor: '#ffffff', border: '1.67px solid #e4e4e4',
                                    borderRadius: '11.12px', boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                                    minWidth: '180px', zIndex: window.ZIndex?.DROPDOWN || 20, overflow: 'hidden'
                                }
                            },
                                React.createElement('button', {
                                    id: 'attachment-dropdown-upload-files',
                                    type: 'button',
                                    style: { width: '100%', padding: '12px 14.5px', border: 'none', backgroundColor: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '13.3px', color: '#000', fontWeight: 500 },
                                    onClick: handleUploadFiles
                                }, 'Upload Files'),
                                React.createElement('button', {
                                    id: 'attachment-dropdown-select-files',
                                    type: 'button',
                                    style: { width: '100%', padding: '12px 14.5px', border: 'none', backgroundColor: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '13.3px', color: '#000', fontWeight: 500 },
                                    onClick: handleSelectUploadedFiles
                                }, 'Select Uploaded Files')
                            )
                        ),

                        React.createElement('textarea', {
                            id: 'main-message-input',
                            className: 'div',
                            placeholder: "What's on your mind?",
                            rows: 1,
                            onKeyDown: (e) => {
                                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                                if (e.key === 'Enter' && !isTouchDevice && !e.shiftKey) {
                                    e.preventDefault();
                                    submitConversationRequest();
                                }
                            },
                            onInput: (e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }
                        }),

                        React.createElement('button', {
                            id: 'input-field-send-button',
                            type: 'submit',
                            className: 'input-field-button',
                            onClick: (e) => { e.preventDefault(); submitConversationRequest(); }
                        },
                            React.createElement('img', { id: 'input-field-send-icon', className: 'img', src: './img/Send.svg', alt: '' })
                        )
                    ),

                    // Quick Prompts Component
                    React.createElement(window.QuickPrompts)
                )
            ),

            // Right Sidebar
            React.createElement(window.RightSidebar, { selectedProjectID })
        )
    );
};

// Export
Object.assign(window, { Home });
