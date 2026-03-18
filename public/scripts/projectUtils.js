/**
 * IMPORTANT: This file must be loaded BEFORE Sidebar.js and page-specific scripts
 * It provides shared functions for loading project data (chats, files, reports)
 * across all pages that use the Sidebar component.
 *
 * Loading order on each page:
 * 1. projectUtils.js (THIS FILE - provides global functions)
 * 2. Sidebar.js (uses the functions provided by this file)
 * 3. Page-specific script (tempHome.js, tempPasskey.js, etc. - may override functions)
 *
 * Shared project utility functions for loading project data across all pages
 * This file should be loaded on all pages that use the Sidebar component
 */

/**
 * Inject shimmer skeleton rows into a sidebar list container.
 * @param {HTMLElement} container
 * @param {number} count
 */
function injectSidebarSkeleton(container, count = 3) {
    container.innerHTML = '';
    const widths = ['100%', '80%', '90%', '75%', '85%'];
    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'sk-sidebar-skeleton-row';
        row.style.cssText = 'padding: 4px 0;';
        const box = document.createElement('div');
        box.className = 'sk-box';
        box.style.cssText = `height:30px;border-radius:8px;width:${widths[i % widths.length]};display:block;`;
        row.appendChild(box);
        container.appendChild(row);
    }
}

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
    injectSidebarSkeleton(chatHistoryContainer, 4);

    let data = null;

    try {
        console.log("Fetching chat data from API...");
        const response = await fetch('/api/agent/all-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
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
                chatHistoryContainer.innerHTML = '';

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
 * Create a React element for a chat history item with full menu functionality
 * @param {string} threadName - The name of the chat thread
 * @param {string} chatID - The UUID of the chat
 */
function createChatHistoryItem(threadName, chatID) {
    const ChatHistoryItemComponent = () => {
        const [menuOpen, setMenuOpen] = React.useState(false);
        const [isChecked, setIsChecked] = React.useState(false);
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

            // Show warning confirmation
            const confirmed = await window.showNotification({
                type: 'warning',
                title: 'Warning',
                message: `Are you sure you want to delete this chat?`,
                actionText: 'Confirm'
            });

            if (!confirmed) return;

            try {
                const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
                if (!projectID) {
                    await window.showNotification({ type: 'error', title: 'Error', message: 'No project selected', actionText: 'OK' });
                    return;
                }

                const response = await fetch('/api/agent/chat-delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID, chatID })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    // Show success message using AlertModal for consistent styling
                    if (window.AlertModal) {
                        await window.AlertModal.show({
                            title: 'Chat Deleted',
                            message: 'Current chat successfully deleted',
                            autoClose: 3000
                        });
                    } else {
                        // Fallback to showNotification if AlertModal not available
                        await window.showNotification({
                            type: 'success',
                            title: 'Chat Deleted',
                            message: 'Current chat successfully deleted',
                            actionText: 'OK'
                        });
                    }

                    // Refresh chat history
                    if (typeof window.fetchProjectChats === 'function') {
                        await window.fetchProjectChats(projectID);
                    }

                    // If on home page and deleted chat was active, go back to initial screen
                    const isHomePage = window.location.pathname === '/home';
                    if (isHomePage && window.currentChatID === chatID) {
                        window.currentChatID = null;
                        localStorage.removeItem('activeChatID');
                        localStorage.removeItem('activeChatProjectID');
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
                    await window.showNotification({ type: 'error', title: 'Error', message: 'Failed to delete chat. Please try again.', actionText: 'OK' });
                }
            } catch (error) {
                console.error('Error deleting chat:', error);
                await window.showNotification({ type: 'error', title: 'Error', message: 'An error occurred while deleting the chat.', actionText: 'OK' });
            }
        };

        const handleChatExport = async (chatID) => {
            setMenuOpen(false);
            const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : document.getElementById('select-project-drop-down')?.value || localStorage.getItem('selectedProjectID');
            if (!projectID) {
                await window.showNotification?.({ type: 'error', title: 'Error', message: 'No project selected', actionText: 'OK' });
                return;
            }
            try {
                const response = await fetch('/api/agent/chat/export', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID, chatID })
                });
                if (response.ok) {
                    const contentDisposition = response.headers.get('Content-Disposition');
                    const filename = contentDisposition
                        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                        : `chat-export-${Date.now()}.docx`;
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    window.URL.revokeObjectURL(url);
                } else {
                    throw new Error('Export failed');
                }
            } catch (err) {
                console.error('Error exporting the chat:', err);
                await window.showNotification?.({ type: 'error', title: 'Error', message: 'Unable to export chat', actionText: 'OK' });
            }
        };

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
                if (e.target.tagName !== 'IMG' && e.target.tagName !== 'BUTTON' && e.target.type !== 'checkbox') {
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
                        window.loadChatThread(chatID);
                    } else {
                        console.log('Navigating to home page with chatID:', chatID);
                        window.location.href = `/home?chatID=${chatID}`;
                    }
                }
            }
        },
            // Checkbox - click to show/hide menu
            React.createElement('input', {
                type: 'checkbox',
                className: 'chat-checkbox',
                style: { width: "16px", height: "16px", flexShrink: 0, cursor: 'pointer' },
                onChange: (e) => {
                    e.stopPropagation();
                    const checked = e.target.checked;
                    console.log(`Chat checkbox ${checked ? 'checked' : 'unchecked'} for ${threadName}`);
                    setIsChecked(checked);
                    if (!checked) {
                        setMenuOpen(false);
                    }
                },
                onClick: (e) => e.stopPropagation()
            }),
            React.createElement('p', {
                style: {
                    flex: '1 1 0',
                    minWidth: 0,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '14px',
                    paddingLeft: '10px'
                },
                title: (threadName && threadName.trim() !== '') ? threadName : 'Untitled Chat' // Tooltip shows full name
            }, (threadName && threadName.trim() !== '') ? threadName : 'Untitled Chat'),
            // Menu container - only visible when checkbox is checked
            isChecked && React.createElement('div', {
                ref: menuRef,
                className: 'chat-menu',
                style: {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    width: '30px',
                    height: '30px'
                }
            },
                React.createElement('img', {
                    className: 'chat-menu-btn',
                    style: {
                        width: '30px',
                        height: '30px',
                        padding: '4px',
                        flexShrink: 0,
                        borderRadius: '5px',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                    },
                    src: './img/more_vert_24.svg',
                    alt: '',
                    onMouseEnter: (e) => {
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#8e8e8e';
                    },
                    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
                    onClick: (e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }
                }),
                menuOpen && React.createElement('div', {
                    id: `chat-history-item-dropdown-${chatID}`,
                    className: 'chat-menu-dropdown',
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
                        id: `chat-history-item-export-button-${chatID}`,
                        style: {
                            width: '100%',
                            padding: '12px 14.5px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13.3px',
                            fontWeight: '500',
                            fontFamily: '"Inter", Helvetica',
                            transition: 'background-color 0.2s ease',
                            borderBottom: '1px solid #f0f0f0'
                        },
                        onMouseEnter: (e) => {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
                        onClick: (e) => { e.stopPropagation(); handleChatExport(chatID); }
                    }, 'Export Chat'),
                    React.createElement('button', {
                        id: `chat-history-item-delete-button-${chatID}`,
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
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? 'rgba(127, 29, 29, 0.3)' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
                        onClick: (e) => { e.stopPropagation(); handleDelete(); }
                    }, 'Delete')
                )
            )
        );
    };

    return React.createElement(ChatHistoryItemComponent);
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

    injectSidebarSkeleton(sourceListContainer, 3);

    try {
        const response = await fetch('/api/project/file/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                projectID: projectID
            })
        });

        if (response.ok) {
            let data = await response.json();
            console.log(`fetchProjectFiles Response Data:`, data);

            sourceListContainer.innerHTML = '';

            if (data.files && data.files.length > 0) {
                for (let file of data.files) {
                    // Construct full filename with extension (same as tempHome)
                    const ext = file.documentExt || '';
                    let cleanName = (file.documentName || '').replace(/\.+$/, ''); // Remove trailing dots
                    const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;

                    const fileElement = createFileItem(fullFileName, file.documentID);
                    const wrapper = document.createElement('div');
                    sourceListContainer.appendChild(wrapper);
                    const root = ReactDOM.createRoot(wrapper);
                    root.render(fileElement);
                }
            }

            const noFilesLabel = document.getElementById("p-label-source-no-entry");
            if (noFilesLabel) {
                noFilesLabel.style.display = (data.files && data.files.length > 0) ? "none" : "block";
            }
        }
    } catch (error) {
        console.error("Error fetching project files:", error);
    }
}

/**
 * Create a React element for a file item with full menu functionality
 * @param {string} fileName - The name of the file
 * @param {string} documentID - The UUID of the document
 */
function createFileItem(fileName, documentID) {
    const FileItemComponent = () => {
        const [menuOpen, setMenuOpen] = React.useState(false);
        const [isChecked, setIsChecked] = React.useState(false);
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

        const handleRename = async () => {
            setMenuOpen(false);

            // Extract extension properly
            const lastDotIndex = fileName.lastIndexOf('.');
            let nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
            const ext = lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : '';
            nameWithoutExt = nameWithoutExt.replace(/\.+$/, '');

            // Show notification modal with input
            const newName = await window.showNotification({
                type: 'rename-input',
                title: 'File Rename',
                message: `Enter to rename current file: ${nameWithoutExt}.${ext}`,
                actionText: 'Confirm',
                showInput: true,
                inputValue: nameWithoutExt,
                inputPlaceholder: 'Input for new file name'
            });

            if (!newName || newName === nameWithoutExt) return;

            let finalName = newName.trim();
            if (finalName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
                finalName = finalName.slice(0, -(ext.length + 1));
            }
            finalName = finalName.replace(/\.+$/, '');

            try {
                const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
                if (!projectID) {
                    await window.showNotification({ type: 'error', title: 'Error', message: 'No project selected', actionText: 'OK' });
                    return;
                }

                const response = await fetch('/api/project/file/rename', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID, documentID, newFileName: `${finalName}.${ext}` })
                });

                const data = await response.json();
                if (data.successful) {
                    if (window.fetchProjectFiles) await window.fetchProjectFiles(projectID);
                    await window.showNotification({ type: 'rename-success', title: 'Warning', message: 'File has been renamed successfully', actionText: 'OK' });
                } else {
                    await window.showNotification({ type: 'error', title: 'Error', message: 'Failed to rename file: ' + (data.message || 'Unknown error'), actionText: 'OK' });
                }
            } catch (error) {
                console.error('Error renaming file:', error);
                await window.showNotification({ type: 'error', title: 'Error', message: 'An error occurred while renaming the file.', actionText: 'OK' });
            }
        };

        const handleDownload = async () => {
            setMenuOpen(false);
            try {
                const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
                if (!projectID) {
                    await window.showNotification({ type: 'error', title: 'Error', message: 'No project selected', actionText: 'OK' });
                    return;
                }

                const response = await fetch('/api/project/file/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID, documentID })
                });

                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Download error:', error);
                await window.showNotification({ type: 'error', title: 'Error', message: 'Failed to download file', actionText: 'OK' });
            }
        };

        const handleDelete = async () => {
            setMenuOpen(false);
            const confirmed = await window.showNotification({
                type: 'warning',
                title: 'Warning',
                message: `Are you sure you want to delete "${fileName}"?`,
                actionText: 'Confirm'
            });

            if (!confirmed) return;

            try {
                const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
                if (!projectID) {
                    await window.showNotification({ type: 'error', title: 'Error', message: 'No project selected', actionText: 'OK' });
                    return;
                }

                const response = await fetch('/api/project/file/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID, documentID })
                });

                const data = await response.json();
                if (data.successful) {
                    if (window.fetchProjectFiles) await window.fetchProjectFiles(projectID);
                    await window.showNotification({ type: 'success', title: 'File Deleted', message: 'File deleted successfully', actionText: 'OK' });
                } else {
                    await window.showNotification({ type: 'error', title: 'Error', message: 'Failed to delete file: ' + (data.message || 'Unknown error'), actionText: 'OK' });
                }
            } catch (error) {
                console.error('Error deleting file:', error);
                await window.showNotification({ type: 'error', title: 'Error', message: 'An error occurred while deleting the file.', actionText: 'OK' });
            }
        };

        return React.createElement('div', {
            id: `source-item-${documentID}`,
            className: 'sidebar-items source-item',
            'data-document-id': documentID,
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
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : '#f0f0f0';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: (e) => {
                if (e.target.type !== 'checkbox') {
                    console.log(`Clicked on ${fileName}`);
                }
            }
        },
            React.createElement('input', {
                id: `source-item-checkbox-${documentID}`,
                type: 'checkbox',
                className: 'source-checkbox',
                style: { width: "16px", height: "16px", flexShrink: 0, cursor: 'pointer' },
                onChange: (e) => {
                    e.stopPropagation();
                    const checked = e.target.checked;
                    console.log(`Source checkbox ${checked ? 'checked' : 'unchecked'} for ${fileName}`);
                    setIsChecked(checked);
                    if (!checked) {
                        setMenuOpen(false);
                    }
                    if (typeof window.getSelectedSource === 'function') window.getSelectedSource();
                },
                onClick: (e) => e.stopPropagation()
            }),
            React.createElement('p', {
                id: `source-file-name-${documentID}`,
                'aria-label': `File name: ${fileName}`,
                title: fileName,
                style: {
                    flexGrow: 1,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '13.3px',
                    cursor: 'default',
                    paddingLeft: '10px'
                }
            }, fileName),
            // Menu container - only visible when checkbox is checked
            isChecked && React.createElement('div', {
                id: `source-item-menu-wrapper-${documentID}`,
                ref: menuRef,
                style: {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    width: '30px',
                    height: '30px',
                    flexShrink: 0
                }
            },
                React.createElement('img', {
                    id: `source-file-menu-${documentID}`,
                    className: 'source-menu-btn',
                    'aria-label': `File options menu for ${fileName}`,
                    style: {
                        width: '30px',
                        height: '30px',
                        padding: "4px",
                        flexShrink: 0,
                        borderRadius: '5px',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                    },
                    src: './img/more_vert_24.svg',
                    alt: '',
                    onMouseEnter: (e) => {
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? 'var(--dm-surface-3)' : '#8e8e8e';
                    },
                    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
                    onClick: (e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }
                }),
                menuOpen && React.createElement('div', {
                    id: `source-file-menu-dropdown-${documentID}`,
                    'aria-label': `File options dropdown for ${fileName}`,
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
                        id: `source-file-rename-button-${documentID}`,
                        'aria-label': `Rename ${fileName}`,
                        style: {
                            width: '100%',
                            padding: '12px 14.5px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13.3px',
                            color: '#000',
                            fontWeight: '500',
                            fontFamily: '"Inter", Helvetica',
                            transition: 'background-color 0.2s ease'
                        },
                        onMouseEnter: (e) => {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
                        onClick: (e) => { e.stopPropagation(); handleRename(); }
                    }, 'Rename'),
                    React.createElement('button', {
                        id: `source-file-download-button-${documentID}`,
                        'aria-label': `Download ${fileName}`,
                        style: {
                            width: '100%',
                            padding: '12px 14.5px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13.3px',
                            color: '#000',
                            fontWeight: '500',
                            fontFamily: '"Inter", Helvetica',
                            transition: 'background-color 0.2s ease'
                        },
                        onMouseEnter: (e) => {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
                        onClick: (e) => { e.stopPropagation(); handleDownload(); }
                    }, 'Download'),
                    React.createElement('button', {
                        id: `source-file-delete-button-${documentID}`,
                        'aria-label': `Delete ${fileName}`,
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
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? 'rgba(127, 29, 29, 0.3)' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
                        onClick: (e) => { e.stopPropagation(); handleDelete(); }
                    }, 'Delete')
                )
            )
        );
    };

    return React.createElement(FileItemComponent);
}

/**
 * Fetch and display project reports categorized by type
 * @param {string} projectID - The UUID of the project
 */
async function fetchProjectReports(projectID) {
    console.log(` fetchProjectReports called with ProjectID: ${projectID}`);

    // Wait a bit for DOM to be ready if needed (especially for React-rendered components)
    let reportsListContainer = document.getElementById("div-requirements-list");
    let reportsListContainerRight = document.getElementById("div-requirements-list-right");

    if (!reportsListContainerRight) {
        console.log(" Right sidebar container not found, waiting for DOM...");
        await new Promise(resolve => setTimeout(resolve, 300));
        reportsListContainerRight = document.getElementById("div-requirements-list-right");
        if (!reportsListContainerRight) {
            console.warn(" Right sidebar container still not found after waiting");
        } else {
            console.log(" Right sidebar container found after waiting");
        }
    }

    if (!reportsListContainer && !reportsListContainerRight) {
        console.warn(" Reports list containers not found on this page");
        return;
    }

    if (reportsListContainer) injectSidebarSkeleton(reportsListContainer, 3);
    if (reportsListContainerRight) injectSidebarSkeleton(reportsListContainerRight, 3);

    console.log(` Found reportsListContainer (left):`, reportsListContainer ? 'yes' : 'no');
    console.log(` Found reportsListContainerRight:`, reportsListContainerRight ? 'yes' : 'no');

    const noReportsLabel = document.getElementById("p-label-requirements-no-entry");
    const noReportsLabelRight = document.getElementById("p-label-requirements-no-entry-right");
    console.log(` Found noReportsLabel (left):`, noReportsLabel ? 'yes' : 'no');
    console.log(` Found noReportsLabel (right):`, noReportsLabelRight ? 'yes' : 'no');

    try {
        console.log(` Fetching reports from API...`);
        const response = await fetch('/api/project/report/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            credentials: 'include', // Include cookies for authentication
            body: JSON.stringify({
                projectID: projectID
            })
        });

        console.log(` API response status: ${response.status}`);

        if (response.ok) {
            let data = await response.json();
            console.log(` Reports Response Data:`, data);
            console.log(` Number of reports: ${data.reports?.length || 0}`);

            // Re-check containers before clearing (they might have been recreated by React)
            const leftContainer = document.getElementById("div-requirements-list");
            const rightContainer = document.getElementById("div-requirements-list-right");

            // Clear containers carefully to avoid React re-render conflicts
            if (leftContainer) {
                // Remove all child nodes instead of using innerHTML to avoid React issues
                while (leftContainer.firstChild) {
                    leftContainer.removeChild(leftContainer.firstChild);
                }
            }
            if (rightContainer) {
                const childCountBefore = rightContainer.children.length;
                // Remove all child nodes instead of using innerHTML to avoid React issues
                while (rightContainer.firstChild) {
                    rightContainer.removeChild(rightContainer.firstChild);
                }
                console.log(` Cleared right sidebar reports container (had ${childCountBefore} children, now has ${rightContainer.children.length})`);
            } else {
                console.warn(` Right sidebar container not found when trying to clear`);
            }
            console.log(` Cleared reports containers`);

            if (data.reports && data.reports.length > 0) {
                // Categorize reports by type (including PDF versions)
                const requirementsReports = data.reports.filter(r =>
                    r.reportType === 'requirements' || r.reportType === 'Requirements' ||
                    r.reportType === 'requirements_pdf' || r.reportType === 'Requirements_pdf'
                );
                const userStoriesReports = data.reports.filter(r =>
                    r.reportType === 'userStories' || r.reportType === 'UserStories' || r.reportType === 'user_stories' ||
                    r.reportType === 'userStories_pdf' || r.reportType === 'UserStories_pdf'
                );

                let hasReports = false;

                // Requirements section
                if (requirementsReports.length > 0) {
                    hasReports = true;
                    console.log(` Rendering ${requirementsReports.length} requirements report(s)`);

                    // Render to left sidebar (if exists)
                    if (reportsListContainer) {
                        const reqHeader = document.createElement('div');
                        reqHeader.style.cssText = 'font-weight: 600; font-size: 13px; color: #1c1d21; margin-bottom: 8px; font-family: Inter, Helvetica;';
                        reqHeader.textContent = 'Requirements';
                        reportsListContainer.appendChild(reqHeader);

                        for (let report of requirementsReports) {
                            console.log(` Rendering report (left): ${report.reportName} (ID: ${report.reportID})`);
                            const reportElement = createReportItem(report.reportName, report.reportID, projectID, report.reportType);
                            const wrapper = document.createElement('div');
                            reportsListContainer.appendChild(wrapper);
                            const root = ReactDOM.createRoot(wrapper);
                            root.render(reportElement);
                        }
                    }

                    // Render to right sidebar (if exists) - re-check container before rendering
                    const containerRight = document.getElementById("div-requirements-list-right");
                    if (containerRight) {
                        console.log(` Rendering ${requirementsReports.length} requirements report(s) to right sidebar`);
                        const reqHeaderRight = document.createElement('div');
                        reqHeaderRight.style.cssText = 'font-weight: 600; font-size: 13px; color: #1c1d21; margin-bottom: 8px; font-family: Inter, Helvetica;';
                        reqHeaderRight.textContent = 'Requirements';
                        containerRight.appendChild(reqHeaderRight);

                        for (let report of requirementsReports) {
                            console.log(` Rendering report (right): ${report.reportName} (ID: ${report.reportID})`);
                            const reportElement = createReportItem(report.reportName, report.reportID, projectID, report.reportType);
                            const wrapper = document.createElement('div');
                            containerRight.appendChild(wrapper);
                            const root = ReactDOM.createRoot(wrapper);
                            root.render(reportElement);
                        }
                        console.log(` Successfully rendered ${requirementsReports.length} requirements reports to right sidebar. Container now has ${containerRight.children.length} children`);
                    } else {
                        console.warn(` reportsListContainerRight is null, cannot render requirements reports`);
                    }
                    console.log(` Requirements reports rendered`);
                }

                // User Stories section
                if (userStoriesReports.length > 0) {
                    hasReports = true;
                    console.log(` Rendering ${userStoriesReports.length} user stories report(s)`);

                    // Render to left sidebar (if exists)
                    if (reportsListContainer) {
                        const usHeader = document.createElement('div');
                        usHeader.style.cssText = 'font-weight: 600; font-size: 13px; color: #1c1d21; margin-top: 12px; margin-bottom: 8px; font-family: Inter, Helvetica;';
                        usHeader.textContent = 'User Stories';
                        reportsListContainer.appendChild(usHeader);

                        for (let report of userStoriesReports) {
                            console.log(` Rendering report (left): ${report.reportName} (ID: ${report.reportID})`);
                            const reportElement = createReportItem(report.reportName, report.reportID, projectID, report.reportType);
                            const wrapper = document.createElement('div');
                            reportsListContainer.appendChild(wrapper);
                            const root = ReactDOM.createRoot(wrapper);
                            root.render(reportElement);
                        }
                    }

                    // Render to right sidebar (if exists) - re-check container before rendering
                    const containerRightForUS = document.getElementById("div-requirements-list-right");
                    if (containerRightForUS) {
                        console.log(` Rendering ${userStoriesReports.length} user stories report(s) to right sidebar`);
                        const usHeaderRight = document.createElement('div');
                        usHeaderRight.style.cssText = 'font-weight: 600; font-size: 13px; color: #1c1d21; margin-top: 12px; margin-bottom: 8px; font-family: Inter, Helvetica;';
                        usHeaderRight.textContent = 'User Stories';
                        containerRightForUS.appendChild(usHeaderRight);

                        for (let report of userStoriesReports) {
                            console.log(` Rendering report (right): ${report.reportName} (ID: ${report.reportID})`);
                            const reportElement = createReportItem(report.reportName, report.reportID, projectID, report.reportType);
                            const wrapper = document.createElement('div');
                            containerRightForUS.appendChild(wrapper);
                            const root = ReactDOM.createRoot(wrapper);
                            root.render(reportElement);
                        }
                        console.log(` Successfully rendered ${userStoriesReports.length} user stories reports to right sidebar. Container now has ${containerRightForUS.children.length} children`);
                    } else {
                        console.warn(` reportsListContainerRight is null, cannot render user stories reports`);
                    }
                    console.log(` User stories reports rendered`);
                }

                if (noReportsLabel) noReportsLabel.style.display = hasReports ? 'none' : 'block';
                if (noReportsLabelRight) noReportsLabelRight.style.display = hasReports ? 'none' : 'block';
                console.log(` NoReportsLabel display: ${hasReports ? 'none' : 'block'}`);
            } else {
                console.log(` No reports found for this project`);
                if (noReportsLabel) {
                    noReportsLabel.style.display = 'block';
                }
                if (noReportsLabelRight) {
                    noReportsLabelRight.style.display = 'block';
                }
                console.log(` Showing "No requirements yet" labels`);
            }
        } else {
            console.error(` API request failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error(" Error fetching project reports:", error);
    }
}

/**
 * Create a React element for a report item with options menu
 * @param {string} reportName - The name of the report
 * @param {string} reportID - The UUID of the report
 * @param {string} projectID - The UUID of the project
 * @param {string} reportType - The type of report ('requirements' or 'userStories')
 */
function createReportItem(reportName, reportID, projectID, reportType) {
    const { useState, useRef, useEffect, useMemo } = React;

    const ReportItemComponent = () => {
        const [menuOpen, setMenuOpen] = useState(false);
        const [isChecked, setIsChecked] = useState(false);
        const menuRef = useRef(null);

        // Determine icon based on report type - use useMemo to ensure stability
        const iconSrc = useMemo(() => {
            const isUserStories = reportType && (
                reportType.toLowerCase().includes('userstories') ||
                reportType.toLowerCase().includes('user_stories') ||
                reportType.toLowerCase().includes('user stories')
            );
            return isUserStories ? './img/UserStoriesIcon.svg' : './img/RequirementsIcon.svg';
        }, [reportType]);

        // Close menu when clicking outside
        useEffect(() => {
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

        const handleDownload = async (e) => {
            e.stopPropagation();
            setMenuOpen(false);

            // Inline download logic to avoid function name conflicts with tempHome.js
            try {
                const response = await fetch('/api/project/report/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        projectID: projectID,
                        reportID: reportID
                    })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = reportName + '.docx';
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
        };

        const handleDelete = async (e) => {
            e.stopPropagation();
            setMenuOpen(false);

            // Use showNotification (available on all pages)
            const confirmDelete = await window.showNotification({
                type: 'confirm',
                title: 'Warning',
                message: `Are you sure you want to delete "${reportName}"?\nThis cannot be reversed!`,
                actionText: 'Delete',
                cancelText: 'Cancel'
            });

            if (!confirmDelete) {
                return;
            }

            try {
                const response = await fetch('/api/project/report/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    credentials: 'include', // Include cookies for authentication
                    body: JSON.stringify({
                        projectID: projectID,
                        reportID: reportID
                    })
                });

                if (response.ok) {
                    // Refresh the reports list
                    if (typeof window.fetchProjectReports === 'function') {
                        window.fetchProjectReports(projectID);
                    }
                    // Dispatch event to notify other components
                    window.dispatchEvent(new CustomEvent('reportGenerated', { detail: { projectID } }));
                } else {
                    console.error('Failed to delete report');
                    if (window.showNotification) {
                        window.showNotification({
                            type: 'error',
                            title: 'Delete Failed',
                            message: 'Failed to delete the report.',
                            actionText: 'OK'
                        });
                    }
                }
            } catch (error) {
                console.error('Error deleting report:', error);
            }
        };

        return React.createElement('div', {
            id: `sidebar-report-item-${reportID}`,
            'data-report-id': reportID,
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                cursor: 'default',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
                fontSize: '14px',
                color: '#1c1d21',
                marginBottom: '4px',
                fontFamily: 'Inter, Helvetica',
                position: 'relative',
                width: '100%',
                boxSizing: 'border-box'
            },
            onMouseEnter: (e) => {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : '#f5f5f5';
            },
            onMouseLeave: (e) => {
                if (!menuOpen) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }
            // onClick: (e) => {
            //     // Download the report on click (unless clicking checkbox or menu button)
            //     if (e.target.type !== 'checkbox' && e.target.tagName !== 'IMG' && e.target.tagName !== 'BUTTON') {
            //         handleDownload(e);
            //     }
            // }
        },
            // Checkbox - click to show/hide three-dot menu
            React.createElement('input', {
                id: `sidebar-report-checkbox-${reportID}`,
                type: 'checkbox',
                className: 'report-checkbox',
                checked: isChecked,
                style: {
                    width: '16px',
                    height: '16px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    marginRight: '12px'
                },
                onChange: (e) => {
                    e.stopPropagation();
                    const checked = e.target.checked;
                    setIsChecked(checked);
                    if (!checked) {
                        setMenuOpen(false);
                    }
                },
                onClick: (e) => e.stopPropagation()
            }),

            // Document icon - different for Requirements vs User Stories
            React.createElement('img', {
                id: `sidebar-report-icon-${reportID}`,
                className: 'report-icon',
                src: iconSrc,
                alt: '',
                style: {
                    width: '18px',
                    height: '18px',
                    flexShrink: 0,
                    marginRight: '12px'
                }
            }),

            // Report name with tooltip on hover
            React.createElement('span', {
                id: `sidebar-report-name-${reportID}`,
                style: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    fontSize: '14px',
                    color: '#1c1d21',
                    fontFamily: 'Inter, Helvetica'
                },
                title: reportName // Tooltip shows full name on hover
            }, reportName),

            // Options menu container - only visible when checkbox is checked
            isChecked && React.createElement('div', {
                id: `sidebar-report-menu-wrapper-${reportID}`,
                ref: menuRef,
                style: { position: 'relative', marginLeft: '8px' }
            },
                // Options button (three dots) - always visible
                React.createElement('img', {
                    id: `sidebar-report-options-btn-${reportID}`,
                    className: 'report-menu-btn',
                    src: './img/more_vert_24.svg',
                    alt: 'Options',
                    style: {
                        width: '28px',
                        height: '28px',
                        padding: '4px',
                        flexShrink: 0,
                        borderRadius: '4px',
                        transition: 'background-color 0.2s',
                        backgroundColor: 'transparent',
                        cursor: 'pointer'
                    },
                    onMouseEnter: (e) => {
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e4e4e4';
                    },
                    onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                    onClick: (e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }
                }),

                // Dropdown menu
                menuOpen && React.createElement('div', {
                    id: `sidebar-report-options-menu-${reportID}`,
                    style: {
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#ffffff',
                        border: '1.67px solid #e4e4e4',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        minWidth: '120px',
                        zIndex: 1000,
                        overflow: 'hidden'
                    }
                },
                    // Download option
                    React.createElement('button', {
                        id: `sidebar-report-download-btn-${reportID}`,
                        style: {
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#1c1d21',
                            fontWeight: '400',
                            fontFamily: 'Inter, Helvetica',
                            transition: 'background-color 0.2s',
                            borderBottom: '1px solid #f0f0f0'
                        },
                        onMouseEnter: (e) => {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                        onClick: handleDownload
                    }, 'Download'),

                    // Delete option
                    React.createElement('button', {
                        id: `sidebar-report-delete-btn-${reportID}`,
                        style: {
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            fontFamily: 'Inter, Helvetica',
                            transition: 'background-color 0.2s'
                        },
                        onMouseEnter: (e) => {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? 'rgba(127, 29, 29, 0.3)' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                        onClick: handleDelete
                    }, 'Delete')
                )
            )
        );
    };

    return React.createElement(ReportItemComponent);
}

/**
 * Download a report file
 * @param {string} reportID - The UUID of the report
 * @param {string} reportName - The name of the report
 * @param {string} projectID - The UUID of the project
 */
async function downloadReport(reportID, reportName, projectID) {
    try {
        const response = await fetch('/api/project/report/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            credentials: 'include', // Include cookies for authentication
            body: JSON.stringify({
                projectID: projectID,
                reportID: reportID
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = reportName + '.docx';
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

/**
 * Download a project file by documentID. Used by sidebar search and search panel file preview.
 * @param {string} documentID - The document UUID
 * @param {string} fileName - Filename for the download (e.g. "report.docx")
 */
async function downloadFile(documentID, fileName) {
    try {
        const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
        if (!projectID) {
            if (window.showNotification) {
                await window.showNotification({ type: 'error', title: 'Error', message: 'No project selected', actionText: 'OK' });
            }
            return;
        }

        const response = await fetch('/api/project/file/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ projectID, documentID })
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download error:', error);
        if (window.showNotification) {
            await window.showNotification({ type: 'error', title: 'Error', message: 'Failed to download file', actionText: 'OK' });
        }
    }
}

// Make functions available globally
window.fetchProjectChats = fetchProjectChats;
window.fetchProjectFiles = fetchProjectFiles;
window.fetchProjectReports = fetchProjectReports;
window.refreshProjectFiles = fetchProjectFiles; // Alias for refreshing files after upload
window.createChatHistoryItem = createChatHistoryItem;
window.createFileItem = createFileItem;
window.createReportItem = createReportItem;
window.downloadFile = downloadFile;

/**
 * Create a new chat thread
 * Works on all pages - on home page clears current chat, on other pages navigates to home
 */
window.createNewChat = function() {
    console.log('Creating new chat...');

    // Check if we're on the home page
    const isHomePage = window.location.pathname === '/home';

    if (isHomePage) {
        // On home page - clear selection and show welcome screen
        const allChatItems = document.querySelectorAll('.chat-history-item');
        allChatItems.forEach(item => {
            item.classList.remove('selected');
            item.style.backgroundColor = 'transparent';
        });

        // Clear the chat interface
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) messagesContainer.innerHTML = '';

        // Clear input field
        const input = document.getElementById('main-message-input');
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }

        // Remove chat-mode class from main screen
        const mainScreen = document.querySelector('.main-screen');
        if (mainScreen) mainScreen.classList.remove('chat-mode');

        // Hide chat interface, show welcome screen
        const chatInterface = document.getElementById('chat-interface');
        const chatTopBar = document.getElementById('chat-top-bar');
        const suggestionChips = document.getElementById('suggestion-chips');
        const mainScreenTitle = document.querySelector('.main-screen-title');
        const quickPromptsContainer = document.getElementById('quick-prompts-container');

        if (chatInterface) chatInterface.style.display = 'none';
        if (chatTopBar) chatTopBar.style.display = 'none';
        if (suggestionChips) suggestionChips.style.display = 'none';
        if (mainScreenTitle) mainScreenTitle.style.display = 'flex';
        if (quickPromptsContainer) quickPromptsContainer.style.display = 'flex';

        // Clear current chat ID tracking (both window and ChatController)
        window.currentChatID = null;
        if (window.ChatController) {
            window.ChatController.currentChatID = null;
        }
        localStorage.removeItem('activeChatID');
        localStorage.removeItem('activeChatProjectID');
        localStorage.setItem('wentBackToInitial', 'true');

        // Clear URL parameters
        const currentUrl = new URL(window.location);
        if (currentUrl.searchParams.has('chatID')) {
            currentUrl.searchParams.delete('chatID');
            window.history.pushState({}, '', currentUrl);
        }

        // Reset chat title
        const chatTitle = document.getElementById('chat-title');
        if (chatTitle) chatTitle.textContent = 'New Chat';

        console.log('New chat created - ready for first message');
    } else {
        // On other pages - clear chat state and navigate to home so welcome screen shows
        console.log('Navigating to home page for new chat...');
        window.currentChatID = null;
        localStorage.removeItem('activeChatID');
        localStorage.removeItem('activeChatProjectID');
        localStorage.setItem('wentBackToInitial', 'true');
        window.location.href = '/home';
    }
};

console.log("projectUtils.js loaded - functions available globally");
