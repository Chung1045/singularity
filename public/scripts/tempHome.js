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

const TempHome = ({ csrfToken, userInfo }) => {
    // ===== STATE =====
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
    const [userAvatarUrl, setUserAvatarUrl] = useState('./img/user.svg');
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [currentProjectID, setCurrentProjectID] = useState(null);
    const [showRequirementsPanel, setShowRequirementsPanel] = useState(false);
    const [requirementsPanelProjectID, setRequirementsPanelProjectID] = useState(null);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [selectedProjectID, setSelectedProjectID] = useState(null);

    const isMobile = windowWidth <= 480;

    // ===== EFFECTS =====

    // Window resize handler
    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch user avatar
    React.useEffect(() => {
        async function fetchAvatar() {
            try {
                const response = await fetch('/api/profile-pic/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
            headers: { 'CSRF-Token': csrfToken },
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

    const handleAnalyzeDocuments = async () => {
        const projectDropdown = document.getElementById("select-project-drop-down");
        const projectID = projectDropdown?.value;

        if (!projectID) {
            window.showNotification?.({ type: 'error', title: 'No Project Selected', message: 'Please select a project first.', actionText: 'OK' });
            return;
        }

        const selectedSource = ChatUtils.getSelectedSource();
        if (!selectedSource?.length) {
            window.showNotification?.({ type: 'info', title: 'No Documents Selected', message: 'Please select documents from the Source panel to analyze.', actionText: 'OK' });
            return;
        }

        const projectTitle = projectDropdown.options[projectDropdown.selectedIndex]?.text || 'Project Analysis';
        ChatUtils.showLoadingIndicator();

        try {
            const response = await fetch('/api/agent/analyze-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectID,
                    documentIDs: selectedSource,
                    title: projectTitle,
                    chatID: localStorage.getItem("activeChatID")
                })
            });

            ChatUtils.removeLoadingIndicator();
            const data = await response.json();

            if (response.ok && data.success) {
                ChatUtils.showChatInterface();
                for (const analysis of data.analysis) {
                    addMessage('ai', analysis || 'Analysis complete.');
                }
                window.showNotification?.({ type: 'success', title: 'Analysis Complete', message: `Successfully analyzed ${data.documentsAnalyzed} document(s).`, actionText: 'OK' });
            } else {
                addMessage('ai', `Error: ${data.message || 'Analysis failed.'}`);
                window.showNotification?.({ type: 'error', title: 'Analysis Failed', message: data.message || 'Unable to analyze documents.', actionText: 'OK' });
            }
        } catch (error) {
            ChatUtils.removeLoadingIndicator();
            addMessage('ai', 'Sorry, there was an error analyzing the documents.');
            window.showNotification?.({ type: 'error', title: 'Error', message: 'An error occurred while analyzing documents.', actionText: 'OK' });
        }
    };

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

    const username = userInfo?.userName || userInfo?.email || 'User';

    // ===== RENDER =====
    return React.createElement('div', {
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false)
    },
        React.createElement('div', { className: 'group' },
            // Sidebar
            React.createElement(window.Sidebar, {
                sidebarCollapsed,
                setSidebarCollapsed,
                username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen,
                setUserMenuOpen,
                userInfo
            }),

            // Alert Modal
            modal.isOpen && React.createElement(AlertModalComponent, { modal, closeModal, isMobile }),

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
                                    position: 'absolute', bottom: '100%', left: '0', marginBottom: '8px',
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
                    )
                )
            ),

            // Right Sidebar
            React.createElement(window.RightSidebar, { selectedProjectID })
        )
    );
};

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

// Alert Modal sub-component
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

// Export
Object.assign(window, { TempHome });
