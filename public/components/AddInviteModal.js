(function () {
    const { useState, useEffect } = React;

    /**
     * AddInviteModal Component
     * Modal for adding new collaborators to a project
     * Allows searching users by username or email
     */
    window.AddInviteModal = function AddInviteModal({
        isOpen,
        onClose,
        projectID,
        onSuccess
    }) {
        const [searchQuery, setSearchQuery] = useState('');
        const [searchResults, setSearchResults] = useState([]);
        const [selectedUsers, setSelectedUsers] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        const [success, setSuccess] = useState('');

        // Clear state when modal closes
        useEffect(() => {
            if (!isOpen) {
                setSearchQuery('');
                setSearchResults([]);
                setSelectedUsers([]);
                setError('');
                setSuccess('');
            }
        }, [isOpen]);

        // Search for users
        const handleSearch = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const response = await fetch('/api/account/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery.trim() })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('[AddInviteModal] Search results:', data);
                    setSearchResults(data.users || []);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || `Failed to search users (${response.status})`;
                    console.error('[AddInviteModal] Search error:', response.status, errorData);
                    setError(errorMessage);
                }
            } catch (err) {
                console.error('[AddInviteModal] Search error:', err);
                setError('Failed to search users: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        // Debounced search - trigger search when user stops typing
        useEffect(() => {
            const timer = setTimeout(() => {
                if (searchQuery.trim()) {
                    handleSearch();
                } else {
                    setSearchResults([]);
                }
            }, 300);

            return () => clearTimeout(timer);
        }, [searchQuery]);

        const handleAddInvite = async (user) => {
            setLoading(true);
            setError('');
            setSuccess('');

            try {
                const response = await fetch('/api/project/editShare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID,
                        shareOptions: [{ uid: user.uid, operation: 'invite' }]
                    })
                });

                if (response.ok) {
                    setSuccess(`Invitation sent to ${user.displayName || user.username}`);
                    setSearchQuery('');
                    setSearchResults([]);
                    setTimeout(() => {
                        if (onSuccess) onSuccess();
                        onClose();
                    }, 1500);
                } else {
                    setError('Failed to send invitation');
                }
            } catch (err) {
                console.error('Invite error:', err);
                setError('Failed to send invitation');
            } finally {
                setLoading(false);
            }
        };

        if (!isOpen) return null;

        return React.createElement(
            'div',
            {
                className: 'add-invite-modal-overlay',
                onClick: onClose,
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
                    zIndex: 1001,
                    backdropFilter: 'blur(4px)'
                }
            },
            React.createElement(
                'div',
                {
                    className: 'add-invite-modal-content',
                    onClick: (e) => e.stopPropagation(),
                    style: {
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        width: '100%',
                        // maxWidth: '420px',
                        maxHeight: '70vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden'
                    }
                },
                // Header
                React.createElement(
                    'div',
                    {
                        style: {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e4e4e4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }
                    },
                    React.createElement(
                        'h2',
                        {
                            style: {
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#000',
                                margin: 0
                            }
                        },
                        'Add Invite'
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: onClose,
                            'aria-label': 'Close',
                            style: {
                                width: '32px',
                                height: '32px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                fontSize: '20px',
                                color: '#666',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                transition: 'all 0.2s'
                            },
                            onMouseEnter: (e) => {
                                // e.currentTarget.style.backgroundColor = '#f5f5f5';
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        },
                        '✕'
                    )
                ),
                // Content
                React.createElement(
                    'div',
                    {
                        style: {
                            padding: '24px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            overflowY: 'auto'
                        }
                    },
                    // Search Label
                    React.createElement(
                        'label',
                        {
                            style: {
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#666',
                                marginBottom: '-8px'
                            }
                        },
                        'Who do you want to invite?'
                    ),
                    // Search Input with Icon
                    React.createElement(
                        'div',
                        {
                            style: {
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center'
                            }
                        },
                        React.createElement('span', {
                            style: {
                                position: 'absolute',
                                left: '14px',
                                fontSize: '18px',
                                color: '#999',
                                pointerEvents: 'none'
                            }
                        }, '👥'),
                        React.createElement('input', {
                            type: 'text',
                            placeholder: 'Enter information of invitor(s)',
                            value: searchQuery,
                            onChange: (e) => setSearchQuery(e.target.value),
                            style: {
                                width: '100%',
                                padding: '12px 14px 12px 44px',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                border: '1px solid #e4e4e4',
                                borderRadius: '10px',
                                outline: 'none',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                boxSizing: 'border-box'
                            },
                            onFocus: (e) => {
                                e.currentTarget.style.borderColor = '#4a90e2';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.1)';
                            },
                            onBlur: (e) => {
                                e.currentTarget.style.borderColor = '#e4e4e4';
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        })
                    ),
                    // Error Message
                    error && React.createElement(
                        'div',
                        {
                            style: {
                                padding: '10px 14px',
                                backgroundColor: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: '8px',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '13px',
                                color: '#dc2626'
                            }
                        },
                        error
                    ),
                    // Success Message
                    success && React.createElement(
                        'div',
                        {
                            style: {
                                padding: '10px 14px',
                                backgroundColor: '#d1fae5',
                                border: '1px solid #6ee7b7',
                                borderRadius: '8px',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '13px',
                                color: '#065f46'
                            }
                        },
                        success
                    ),
                    // Loading State
                    loading && React.createElement(
                        'div',
                        {
                            style: {
                                textAlign: 'center',
                                padding: '20px',
                                color: '#999',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px'
                            }
                        },
                        'Searching...'
                    ),
                    // Search Results
                    !loading && searchResults.length > 0 && React.createElement(
                        'div',
                        {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginTop: '8px'
                            }
                        },
                        searchResults.map((user) =>
                            React.createElement(
                                'div',
                                {
                                    key: user.uid,
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        backgroundColor: '#fff',
                                        border: '1px solid #e4e4e4',
                                        borderRadius: '12px',
                                        // transition: 'all 0.2s'
                                    },

                                },
                                // Avatar
                                React.createElement(
                                    'div',
                                    {
                                        style: {
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: '#999',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontWeight: '600',
                                            fontSize: '16px',
                                            flexShrink: 0
                                        }
                                    },
                                    user.displayName?.charAt(0)?.toUpperCase() ||
                                    user.username?.charAt(0)?.toUpperCase() || 'U'
                                ),
                                // User Info
                                React.createElement(
                                    'div',
                                    { style: { flex: 1, minWidth: 0 } },
                                    React.createElement(
                                        'div',
                                        {
                                            style: {
                                                fontFamily: 'Inter, sans-serif',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#000',
                                                marginBottom: '2px'
                                            }
                                        },
                                        user.displayName || 'Invited User'
                                    ),
                                    React.createElement(
                                        'div',
                                        {
                                            style: {
                                                fontFamily: 'Inter, sans-serif',
                                                fontSize: '12px',
                                                color: '#999',
                                                marginBottom: '2px'
                                            }
                                        },
                                        user.username ? `@${user.username}` : ''
                                    ),
                                    React.createElement(
                                        'div',
                                        {
                                            style: {
                                                fontFamily: 'Inter, sans-serif',
                                                fontSize: '12px',
                                                color: '#666'
                                            }
                                        },
                                        user.email || 'example@example.com'
                                    )
                                ),
                                // Add Invite Button
                                React.createElement(
                                    'button',
                                    {
                                        onClick: () => handleAddInvite(user),
                                        disabled: loading,
                                        style: {
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            // color: '#4a90e2',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            transition: 'background-color 0.2s',
                                            opacity: loading ? 0.5 : 1
                                        },
                                        onMouseEnter: (e) => {
                                            if (!loading) {
                                                e.currentTarget.style.backgroundColor = 'rgba(193,193,193,0.53)';
                                            }
                                        },
                                        onMouseLeave: (e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    },
                                    'Add Invite'
                                )
                            )
                        )
                    ),
                    // No Results
                    !loading && searchQuery.trim() && searchResults.length === 0 && React.createElement(
                        'div',
                        {
                            style: {
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#999',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px'
                            }
                        },
                        'No users found matching your search'
                    ),
                    // Empty State
                    !loading && !searchQuery.trim() && React.createElement(
                        'div',
                        {
                            style: {
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#999',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px'
                            }
                        },
                        'Start typing to search for users...'
                    )
                )
            )
        );
    };

    console.log('[AddInviteModal] Component loaded');
})();
