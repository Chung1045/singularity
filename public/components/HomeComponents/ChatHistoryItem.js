/**
 * ChatHistoryItem Component
 * Renders a chat history item in the sidebar
 */

function createChatHistoryItem(chatThreadName, chatID) {
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
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [menuOpen]);

        const handleDelete = async () => {
            setMenuOpen(false);

            const confirmDelete = await window.showNotification({
                type: 'confirm',
                title: 'Warning',
                message: 'Are you sure you want to delete this chat?\nThis cannot be reversed!',
                actionText: 'Delete',
                cancelText: 'Cancel'
            });

            if (!confirmDelete) return;

            const projectID = document.getElementById('select-project-drop-down')?.value;
            if (!projectID) {
                console.error('No project selected');
                return;
            }

            try {
                const data = await ChatService.deleteChat(projectID, chatID);

                if (data.success) {
                    await AlertModal.show({
                        title: 'Chat Deleted',
                        message: 'Chat successfully deleted',
                        autoClose: 7000
                    });

                    await window.fetchProjectChats?.(projectID);

                    if (window.currentChatID === chatID) {
                        window.currentChatID = null;
                        localStorage.removeItem('activeChatID');
                        localStorage.removeItem('activeChatProjectID');
                        window.backToInitialScreen?.();

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

        const handleChatExport = async (chatID) => {
            try {
                const projectID = localStorage.getItem('selectedProjectID');

                const response = await fetch('/api/agent/chat/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID, chatID })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `chat-export-${Date.now()}.md`;
                    a.click();
                    window.URL.revokeObjectURL(url);

                    setMenuOpen(false);
                } else {
                    throw new Error('Export failed');
                }
            } catch (err) {
                console.error('Error exporting the chat:', err);
                await window.showNotification({
                    type: 'confirm',
                    title: 'Error',
                    message: 'Unable to export chat',
                    actionText: 'OK',
                });
            }
        }

        const handleClick = (e) => {
            if (e.target.type === 'checkbox' || e.target.tagName === 'IMG' || e.target.closest('.chat-menu')) return;

            document.querySelectorAll('.chat-history-item').forEach(item => {
                item.classList.remove('selected');
                item.style.backgroundColor = 'transparent';
            });

            e.currentTarget.classList.add('selected');
            e.currentTarget.style.backgroundColor = '#e0e0e0';

            const newUrl = new URL(window.location);
            newUrl.searchParams.set('chatID', chatID);
            window.history.pushState({ chatID }, '', newUrl);

            const chatTitleElement = document.getElementById('chat-title');
            if (chatTitleElement) {
                chatTitleElement.textContent = (chatThreadName?.trim() || 'New Chat');
            }

            window.loadChatThread?.(chatID);
        };

        const displayName = (chatThreadName?.trim() || 'New Chat');

        return React.createElement('div', {
            id: `chat-history-item-${chatID}`,
            className: 'sidebar-items chat-history-item',
            'data-chat-id': chatID,
            'data-thread-name': displayName,
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
            onClick: handleClick
        },
            // Checkbox - click to show/hide three-dot menu
            React.createElement('input', {
                id: `chat-history-item-checkbox-${chatID}`,
                type: 'checkbox',
                className: 'chat-history-checkbox',
                checked: isChecked,
                style: {
                    width: '16px',
                    height: '16px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    marginRight: '8px'
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
            React.createElement('p', {
                id: `chat-history-item-name-${chatID}`,
                className: 'chat-item-name',
                style: {
                    flexGrow: 1,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                }
            }, displayName),
            // Menu wrapper - only visible when checkbox is checked
            isChecked && React.createElement('div', {
                id: `chat-history-item-menu-wrapper-${chatID}`,
                ref: menuRef,
                className: 'chat-menu',
                style: {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }
            },
                React.createElement('img', {
                    id: `chat-history-item-menu-button-${chatID}`,
                    className: 'chat-menu-button',
                    style: {
                        padding: "4px",
                        flexShrink: 0,
                        borderRadius: '5px',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                    },
                    src: './img/more_vert_24.svg',
                    alt: '',
                    onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#8e8e8e',
                    onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
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
                        className: 'chat-menu-export-button',
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
                            transition: 'background-color 0.2s ease'
                        },
                        onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f5f5f5',
                        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                        onClick: (e) => {
                            e.stopPropagation();
                            handleChatExport(chatID);
                        }
                    }, 'Export Chat'),
                    React.createElement('button', {
                        id: `chat-history-item-delete-button-${chatID}`,
                        className: 'chat-menu-delete-button',
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
                        onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f5f5f5',
                        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
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

// Export
Object.assign(window, { createChatHistoryItem });
