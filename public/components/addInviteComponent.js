/**
 * Add Invite Component
 * Modal component for inviting collaborators to a project
 * Accessed via "Invite Collaborators" button in Project Share modal
 */

(function() {
    const {useState, useEffect, useRef, useCallback} = React;

    /**
     * AddInviteModal Component
     * @param {Object} props
     * @param {boolean} props.isOpen - Whether the modal is open
     * @param {Function} props.onClose - Callback to close the modal
     * @param {string} props.projectID - Current project ID
     */
    const AddInviteModal = ({ isOpen, onClose, projectID }) => {
        const [searchQuery, setSearchQuery] = useState('');
        const [searchResults, setSearchResults] = useState([]);
        const [invitedUsers, setInvitedUsers] = useState(new Set());
        const [loading, setLoading] = useState(false);
        const modalRef = useRef(null);

        // Close modal when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (modalRef.current && event.target === modalRef.current) {
                    onClose();
                }
            };

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [isOpen, onClose]);

        // Search for users to invite
        const handleSearch = useCallback(async (query) => {
            if (!query.trim()) {
                setSearchResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await fetch('/api/project/search-users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({
                        projectID: projectID,
                        query: query.trim()
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(data.users || []);
                } else {
                    console.error('Failed to search users');
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Error searching users:', error);
                setSearchResults([]);
            } finally {
                setLoading(false);
            }
        }, [projectID]);

        // Debounced search
        useEffect(() => {
            const timer = setTimeout(() => {
                handleSearch(searchQuery);
            }, 300);

            return () => clearTimeout(timer);
        }, [searchQuery, handleSearch]);

        // Handle invite user
        const handleInvite = async (userId, username, email) => {
            try {
                const response = await fetch('/api/project/invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({
                        projectID: projectID,
                        invitedUserId: userId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // Add to invited set
                        setInvitedUsers(prev => new Set(prev).add(userId));

                        // Refresh notification badge
                        window.dispatchEvent(new CustomEvent('refreshNotifications'));

                        // Show success notification
                        if (window.showNotification) {
                            await window.showNotification({
                                type: 'success',
                                title: 'Invitation Sent',
                                message: `Successfully invited ${username}`,
                                actionText: 'OK'
                            });
                        }
                    } else {
                        throw new Error(data.message || 'Failed to send invite');
                    }
                } else {
                    throw new Error('Failed to send invite');
                }
            } catch (error) {
                console.error('Error inviting user:', error);
                if (window.showNotification) {
                    await window.showNotification({
                        type: 'error',
                        title: 'Invitation Failed',
                        message: error.message || 'Failed to send invitation',
                        actionText: 'OK'
                    });
                }
            }
        };

        if (!isOpen) return null;

        return React.createElement('div', {
            id: 'add-invite-modal-backdrop',
            ref: modalRef,
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
                zIndex: 10000,
                padding: '20px'
            }
        },
            // Modal content
            React.createElement('div', {
                id: 'add-invite-modal-content',
                style: {
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    overflow: 'hidden'
                },
                onClick: (e) => e.stopPropagation()
            },
                // Header
                React.createElement('div', {
                    id: 'add-invite-modal-header',
                    style: {
                        padding: '24px 28px',
                        borderBottom: '1px solid #e4e4e4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }
                },
                    React.createElement('h2', {
                        id: 'add-invite-modal-title',
                        style: {
                            margin: 0,
                            fontSize: '24px',
                            fontWeight: '600',
                            color: '#1c1d21',
                            fontFamily: '"Inter", Helvetica'
                        }
                    }, 'Add invite'),

                    // Close button
                    React.createElement('button', {
                        id: 'add-invite-modal-close-btn',
                        style: {
                            width: '40px',
                            height: '40px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            transition: 'background-color 0.2s'
                        },
                        onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f0f0f0',
                        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                        onClick: onClose
                    },
                        React.createElement('svg', {
                            width: '20',
                            height: '20',
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: '#666',
                            strokeWidth: '2',
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round'
                        },
                            React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
                            React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
                        )
                    )
                ),

                // Body
                React.createElement('div', {
                    id: 'add-invite-modal-body',
                    style: {
                        padding: '24px 28px',
                        flex: 1,
                        overflowY: 'auto'
                    }
                },
                    // Question text
                    React.createElement('p', {
                        id: 'add-invite-question-text',
                        style: {
                            margin: '0 0 16px 0',
                            fontSize: '16px',
                            fontWeight: '400',
                            color: '#1c1d21',
                            fontFamily: '"Inter", Helvetica'
                        }
                    }, 'Who do you want to invite?'),

                    // Search input with icon
                    React.createElement('div', {
                        id: 'add-invite-search-container',
                        style: {
                            position: 'relative',
                            marginBottom: '24px'
                        }
                    },
                        // User icon
                        React.createElement('div', {
                            style: {
                                position: 'absolute',
                                left: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none'
                            }
                        },
                            React.createElement('svg', {
                                width: '20',
                                height: '20',
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: '#6b7280',
                                strokeWidth: '2',
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round'
                            },
                                React.createElement('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
                                React.createElement('circle', { cx: '12', cy: '7', r: '4' })
                            )
                        ),

                        // Input field
                        React.createElement('input', {
                            id: 'add-invite-search-input',
                            type: 'text',
                            placeholder: 'Enter information of invitor(s)',
                            value: searchQuery,
                            onChange: (e) => setSearchQuery(e.target.value),
                            style: {
                                width: '100%',
                                padding: '14px 16px 14px 48px',
                                fontSize: '15px',
                                border: '1.5px solid #d1d5db',
                                borderRadius: '10px',
                                outline: 'none',
                                fontFamily: '"Inter", Helvetica',
                                color: '#1c1d21',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            },
                            onFocus: (e) => e.currentTarget.style.borderColor = '#3b82f6',
                            onBlur: (e) => e.currentTarget.style.borderColor = '#d1d5db'
                        })
                    ),

                    // Search results / User list
                    loading ?
                        React.createElement('div', {
                            id: 'add-invite-loading-state',
                            style: {
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#6b7280',
                                fontSize: '14px'
                            }
                        }, 'Searching...') :
                    searchResults.length === 0 && searchQuery.trim() ?
                        React.createElement('div', {
                            id: 'add-invite-no-results',
                            style: {
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#6b7280',
                                fontSize: '14px'
                            }
                        }, 'No users found') :
                    searchResults.length === 0 ?
                        React.createElement('div', {
                            id: 'add-invite-empty-state',
                            style: {
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#6b7280',
                                fontSize: '14px'
                            }
                        }, 'Start typing to search for users') :
                    React.createElement('div', {
                        id: 'add-invite-results-list',
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }
                    },
                        searchResults.map(user =>
                            React.createElement('div', {
                                id: `add-invite-user-card-${user.userID}`,
                                key: user.userID,
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                    transition: 'background-color 0.2s'
                                },
                                onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f9fafb',
                                onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
                            },
                                // Avatar
                                user.profilePicture
                                    ? React.createElement('img', {
                                        src: user.profilePicture,
                                        alt: user.displayName,
                                        style: {
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            flexShrink: 0
                                        }
                                    })
                                    : React.createElement('div', {
                                        style: {
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            backgroundColor: '#6b7280',
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }
                                    },
                                        React.createElement('img', {
                                            src: './img/user.svg',
                                            alt: 'Default avatar',
                                            style: {
                                                width: '24px',
                                                height: '24px',
                                                filter: 'brightness(0) invert(1)'
                                            }
                                        })
                                    ),

                                // User info
                                React.createElement('div', {
                                    id: `add-invite-user-info-${user.userID}`,
                                    style: {
                                        flex: 1,
                                        minWidth: 0
                                    }
                                },
                                    React.createElement('div', {
                                        id: `add-invite-user-name-${user.userID}`,
                                        style: {
                                            fontSize: '15px',
                                            fontWeight: '500',
                                            color: '#1c1d21',
                                            fontFamily: '"Inter", Helvetica',
                                            marginBottom: '2px'
                                        }
                                    }, user.displayName || 'Invited User'),

                                    React.createElement('div', {
                                        id: `add-invite-user-username-${user.userID}`,
                                        style: {
                                            fontSize: '14px',
                                            color: '#6b7280',
                                            fontFamily: '"Inter", Helvetica',
                                            marginBottom: '2px'
                                        }
                                    }, `@${user.username || 'invited_user'}`),

                                    React.createElement('div', {
                                        id: `add-invite-user-email-${user.userID}`,
                                        style: {
                                            fontSize: '14px',
                                            color: '#6b7280',
                                            fontFamily: '"Inter", Helvetica'
                                        }
                                    }, user.email || 'example@example.com')
                                ),

                                // Add Invite button
                                React.createElement('button', {
                                    id: `add-invite-btn-${user.userID}`,
                                    disabled: invitedUsers.has(user.userID),
                                    style: {
                                        padding: '10px 20px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: invitedUsers.has(user.userID) ? '#9ca3af' : '#1c1d21',
                                        // backgroundColor: 'transparent',
                                        border: 'none',
                                        cursor: invitedUsers.has(user.userID) ? 'default' : 'pointer',
                                        borderRadius: '6px',
                                        fontFamily: '"Inter", Helvetica',
                                        // transition: 'background-color 0.2s',
                                        flexShrink: 0
                                    },
                                    onMouseEnter: (e) => {
                                        if (!invitedUsers.has(user.userID)) {
                                            // e.currentTarget.style.backgroundColor = '#f3f4f6';
                                        }
                                    },
                                    onMouseLeave: (e) => {
                                        // e.currentTarget.style.backgroundColor = 'transparent';
                                    },
                                    onClick: () => {
                                        if (!invitedUsers.has(user.userID)) {
                                            handleInvite(user.userID, user.username, user.email);
                                        }
                                    }
                                }, invitedUsers.has(user.userID) ? 'Invited' : 'Add Invite')
                            )
                        )
                    )
                )
            )
        );
    };

    // Export the component globally
    window.AddInviteModal = AddInviteModal;

    console.log('AddInviteComponent loaded successfully');
})();
