(function () {
    const { useState, useEffect } = React;

    /**
     * CustomAlertModal Component
     * A themed alert modal that matches the site's design
     */
    window.CustomAlertModal = function CustomAlertModal({
        isOpen,
        onClose,
        title = 'Alert',
        message = '',
        confirmText = 'OK',
        onConfirm,
        showCancel = false,
        cancelText = 'Cancel',
        onCancel
    }) {
        // Handle escape key
        useEffect(() => {
            const handleEscape = (event) => {
                if (event.key === 'Escape' && isOpen) {
                    onClose();
                }
            };

            if (isOpen) {
                document.addEventListener('keydown', handleEscape);
            }

            return () => {
                document.removeEventListener('keydown', handleEscape);
            };
        }, [isOpen, onClose]);

        // Handle backdrop click
        const handleBackdropClick = (event) => {
            if (event.target === event.currentTarget) {
                onClose();
            }
        };

        const handleConfirm = () => {
            if (onConfirm) {
                onConfirm();
            }
            onClose();
        };

        const handleCancel = () => {
            if (onCancel) {
                onCancel();
            }
            onClose();
        };

        if (!isOpen) return null;

        return React.createElement(
            'div',
            {
                className: 'custom-alert-modal-overlay',
                onClick: handleBackdropClick,
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
                    zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }
            },
            React.createElement(
                'div',
                {
                    className: 'custom-alert-modal-content',
                    onClick: (e) => e.stopPropagation(),
                    style: {
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '400px',
                        padding: '24px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        fontFamily: 'Inter, sans-serif'
                    }
                },
                // Header
                React.createElement(
                    'div',
                    {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '16px'
                        }
                    },
                    React.createElement(
                        'h2',
                        {
                            style: {
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#000',
                                margin: 0
                            }
                        },
                        title
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: onClose,
                            'aria-label': 'Close',
                            style: {
                                width: '32px',
                                height: '32px',
                                border: '1px solid #e4e4e4',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                fontSize: '20px',
                                color: '#666',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px'
                            },
                            onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        },
                        '✕'
                    )
                ),

                // Message
                React.createElement(
                    'div',
                    {
                        style: {
                            marginBottom: '24px'
                        }
                    },
                    React.createElement(
                        'p',
                        {
                            style: {
                                fontSize: '14px',
                                color: '#666',
                                lineHeight: '1.5',
                                margin: 0
                            }
                        },
                        message
                    )
                ),

                // Buttons
                React.createElement(
                    'div',
                    {
                        style: {
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end'
                        }
                    },
                    showCancel && React.createElement(
                        'button',
                        {
                            onClick: handleCancel,
                            style: {
                                padding: '8px 16px',
                                border: '1px solid #e4e4e4',
                                backgroundColor: 'transparent',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#666',
                                fontFamily: 'Inter, sans-serif'
                            },
                            onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        },
                        cancelText
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: handleConfirm,
                            style: {
                                padding: '8px 16px',
                                border: 'none',
                                backgroundColor: '#000',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#fff',
                                fontFamily: 'Inter, sans-serif'
                            },
                            onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = '#333';
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = '#000';
                            }
                        },
                        confirmText
                    )
                )
            )
        );
    };

    console.log('[CustomAlertModal] Component loaded');
})();
