(function () {
    const { useState } = React;

    console.log('[FileUploadNotification] fileUploadNotificationModal.js loaded');

    // Custom File Upload Notification Modal Component
    window.FileUploadNotificationModal = ({ type, title, message, onClose, actionText, cancelText, backText, onAction, onBack, showInput, inputValue, inputPlaceholder }) => {
        const [inputText, setInputText] = useState(inputValue || '');

        return React.createElement('div', {
                id: 'file-upload-notification-backdrop',
                role: 'dialog',
                'aria-modal': 'true',
                'aria-labelledby': 'file-upload-notification-title',
                'aria-describedby': 'file-upload-notification-message',
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
                    animation: 'fadeIn 0.2s ease'
                },
                onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }
            },
            // Modal container
            React.createElement('div', {
                    id: 'file-upload-notification-modal',
                    role: 'document',
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
                        animation: 'slideUp 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }
                },
                // Title
                React.createElement('div', {
                    id: 'file-upload-notification-title',
                    style: {
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1c1d21',
                        fontFamily: '"Inter-Bold", Helvetica'
                    }
                }, title),
                // Message
                message && React.createElement('div', {
                    id: 'file-upload-notification-message',
                    style: {
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.5',
                        fontFamily: '"Inter-Regular", Helvetica',
                        whiteSpace: 'pre-line'
                    }
                }, message),
                // Input field
                showInput && React.createElement('input', {
                    id: 'file-upload-notification-input',
                    type: 'text',
                    value: inputText,
                    placeholder: inputPlaceholder || 'Enter new name',
                    onChange: (e) => setInputText(e.target.value),
                    onKeyPress: (e) => {
                        if (e.key === 'Enter' && inputText.trim()) {
                            const action = onAction || onClose;
                            action(inputText.trim());
                        }
                    },
                    autoFocus: true,
                    style: {
                        width: '100%',
                        padding: '12px',
                        border: '1.67px solid #e4e4e4',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontFamily: '"Inter-Regular", Helvetica',
                        boxSizing: 'border-box',
                        outline: 'none'
                    }
                }),
                // Buttons Container
                React.createElement('div', {
                        id: 'file-upload-notification-actions',
                        style: {
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end',
                            marginTop: '10px',
                            flexWrap: 'wrap'
                        }
                    },
                    // 1. GO BACK BUTTON
                    // Renders if onBack is passed (which is now guaranteed if backText exists)
                    onBack && React.createElement('button', {
                        id: 'file-upload-notification-back-button',
                        'aria-label': backText || 'Go Back',
                        type: 'button',
                        onClick: onBack,
                        style: {
                            padding: '10px 20px',
                            backgroundColor: 'transparent',
                            border: '1px solid #e4e4e4',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#666',
                            cursor: 'pointer',
                            fontFamily: '"Inter-Bold", Helvetica',
                            transition: 'all 0.2s',
                            marginRight: 'auto' // Pushes this button to the far left
                        },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#f9f9f9';
                            e.currentTarget.style.borderColor = '#ccc';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = '#e4e4e4';
                        }
                    }, backText || 'Go Back'),

                    // 2. CANCEL BUTTON
                    ((type === 'confirm' || (showInput && type === 'rename-input'))) && React.createElement('button', {
                        id: 'file-upload-notification-cancel-button',
                        'aria-label': cancelText || 'Cancel',
                        type: 'button',
                        onClick: onClose,
                        style: {
                            padding: '10px 20px',
                            backgroundColor: '#f5f5f5',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#666',
                            cursor: 'pointer',
                            fontFamily: '"Inter-Bold", Helvetica',
                            transition: 'all 0.2s'
                        },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#e0e0e0';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                    }, cancelText || 'Cancel'),

                    // 3. ACTION BUTTON (Confirm/OK)
                    React.createElement('button', {
                        id: 'file-upload-notification-action-button',
                        'aria-label': actionText || 'Close notification',
                        type: 'button',
                        onClick: () => {
                            if (showInput) {
                                if (onAction && inputText.trim()) {
                                    onAction(inputText.trim());
                                } else {
                                    onClose();
                                }
                            } else {
                                (onAction || onClose)();
                            }
                        },
                        disabled: showInput && !inputText.trim(),
                        style: {
                            padding: '10px 20px',
                            backgroundColor: (showInput && !inputText.trim()) ? '#cccccc' : 'rgb(30, 41, 59)',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#ffffff',
                            cursor: (showInput && !inputText.trim()) ? 'not-allowed' : 'pointer',
                            fontFamily: '"Inter-Bold", Helvetica',
                            transition: 'all 0.2s'
                        },
                        onMouseEnter: (e) => {
                            if (!showInput || inputText.trim()) {
                                e.currentTarget.style.backgroundColor = 'rgb(51, 65, 85)';
                            }
                        },
                        onMouseLeave: (e) => {
                            if (!showInput || inputText.trim()) {
                                e.currentTarget.style.backgroundColor = 'rgb(30, 41, 59)';
                            }
                        }
                    }, actionText || 'OK')
                )
            )
        );
    };

    // Helper function to show file upload notifications
    window.showNotification = ({ type, title, message, actionText, cancelText, backText, onAction, onBack, showInput, inputValue, inputPlaceholder }) => {
        return new Promise((resolve) => {
            const container = document.createElement('div');
            container.id = 'file-upload-notification-container';
            document.body.appendChild(container);

            const cleanup = () => {
                ReactDOM.unmountComponentAtNode(container);
                document.body.removeChild(container);
            };

            const handleClose = () => {
                cleanup();
                resolve(null);
            };

            const handleAction = (value) => {
                if (onAction) onAction(value);
                cleanup();
                resolve(showInput ? value : true);
            };

            // Handle Back logic
            const handleBack = () => {
                cleanup();
                if (onBack) {
                    onBack(); // Execute the back logic passed in if it exists
                }
                resolve('back'); // Always resolve 'back' string
            };

            ReactDOM.render(
                React.createElement(window.FileUploadNotificationModal, {
                    type: type,
                    title: title,
                    message: message,
                    actionText: actionText,
                    cancelText: cancelText,
                    backText: backText,
                    onClose: handleClose,
                    onAction: handleAction,
                    // FIX: Pass handleBack if onBack OR backText exists
                    onBack: (onBack || backText) ? handleBack : null,
                    showInput: showInput,
                    inputValue: inputValue,
                    inputPlaceholder: inputPlaceholder
                }),
                container
            );
        });
    };

    // Add CSS animations
    const style = document.createElement('style');
    style.id = 'file-upload-notification-styles';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    if (!document.getElementById('file-upload-notification-styles')) {
        document.head.appendChild(style);
    }

    console.log('[FileUploadNotification] Custom file upload notification system ready');
})();