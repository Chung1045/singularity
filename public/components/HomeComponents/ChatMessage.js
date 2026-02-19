/**
 * ChatMessage Component
 * Renders a single chat message (user or AI)
 */

const ChatMessage = ({ role, text, conversationID, chatSeq, attachedFileIDs = [], onEdit }) => {
    const avatarUrl = role === 'user' ? (window.userAvatarUrl || './img/user.svg') : './img/Union.svg';

    const renderAvatar = () => {
        if (role === 'user') {
            return React.createElement('img', {
                src: avatarUrl,
                alt: 'User',
                style: { width: '80%', height: '80%', objectFit: 'cover', borderRadius: '50%' }
            });
        }
        return React.createElement('img', {
            src: './img/Union.svg',
            alt: 'AI',
            style: { width: '50%', height: '50%', objectFit: 'contain' }
        });
    };

    const renderContent = () => {
        if (role === 'ai') {
            const html = window.ChatUtils?.renderMarkdown(text) || text;
            return React.createElement('div', { dangerouslySetInnerHTML: { __html: html } });
        }
        return text;
    };

    const renderTimestamp = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const renderAttachedFiles = () => {
        if (!attachedFileIDs || attachedFileIDs.length === 0) return null;

        return React.createElement('div', {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                flex: 1
            }
        }, attachedFileIDs.map(fileId =>
            React.createElement(FileChip, { key: fileId, fileId })
        ));
    };

    // User message layout
    if (role === 'user') {
        return React.createElement('div', {
            className: 'message user-message',
            'data-conversation-id': conversationID,
            'data-chat-seq': chatSeq
        },
            // Avatar wrapper with edit/cancel buttons
            React.createElement('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                }
            },
                React.createElement('div', { className: 'message-avatar' }, renderAvatar()),
                React.createElement('button', {
                    className: 'message-edit-btn',
                    title: 'Edit message',
                    style: {
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: '#999',
                        transition: 'background-color 0.2s ease, color 0.2s ease',
                        opacity: 0,
                        marginTop: '9px'
                    },
                    onClick: () => onEdit && onEdit(text, conversationID, chatSeq)
                }, 'Edit'),
                React.createElement('button', {
                    className: 'message-cancel-btn',
                    title: 'Cancel edit',
                    style: {
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: '#e57373',
                        display: 'none',
                        marginTop: '8px'
                    },
                    onClick: () => window.EditMode?.cancel()
                }, 'Cancel')
            ),
            // Content wrapper
            React.createElement('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxWidth: '600px'
                }
            },
                React.createElement('div', { className: 'message-bubble' }, renderContent()),
                React.createElement('div', {
                    className: 'message-timestamp',
                    style: {
                        fontSize: '12px',
                        color: '#999',
                        paddingLeft: '12px',
                        fontFamily: "'Inter', Helvetica"
                    }
                }, renderTimestamp()),
                React.createElement('div', {
                    className: 'message-bottom-row',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingLeft: '12px',
                        minHeight: '24px'
                    }
                }, renderAttachedFiles())
            )
        );
    }

    // AI message layout
    return React.createElement('div', {
        className: 'message ai-message',
        'data-conversation-id': conversationID,
        'data-chat-seq': chatSeq
    },
        React.createElement('div', { className: 'message-avatar' }, renderAvatar()),
        React.createElement('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }
        },
            React.createElement('div', {
                className: 'message-bubble',
                'data-role': 'ai'
            }, renderContent()),
            React.createElement('div', {
                className: 'message-timestamp',
                style: {
                    fontSize: '12px',
                    color: '#999',
                    paddingLeft: '12px',
                    fontFamily: "'Inter', Helvetica"
                }
            }, renderTimestamp())
        )
    );
};

/**
 * FileChip Component
 * Renders a small chip showing attached file
 */
const FileChip = ({ fileId }) => {
    const [fileName, setFileName] = React.useState(fileId);

    React.useEffect(() => {
        // Try to get file name from various sources
        const chipElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (chipElement) {
            const storedName = chipElement.getAttribute('data-file-name');
            if (storedName) {
                setFileName(storedName);
                return;
            }
        }

        // Try source list
        const sourceElement = document.getElementById(`source-file-name-${fileId}`);
        if (sourceElement) {
            setFileName(sourceElement.textContent);
            return;
        }

        // Try global file name map
        if (window.chatFileNameMap?.has(fileId)) {
            setFileName(window.chatFileNameMap.get(fileId));
        }
    }, [fileId]);

    return React.createElement('div', {
        'data-file-id': fileId,
        style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            backgroundColor: 'rgba(195, 171, 111, 0.15)',
            border: '1px solid rgba(195, 171, 111, 0.3)',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#666',
            fontFamily: "'Inter', Helvetica"
        }
    }, `${fileName}`);
};

// Export components
Object.assign(window, { ChatMessage, FileChip });
