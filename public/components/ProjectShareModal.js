(function () {
    const { useState, useEffect } = React;

    /**
     * ProjectShareModal Component
     * Modal for managing project collaborators and invitations
     * Shows project owner, current collaborators, and pending invitations
     */
    window.ProjectShareModal = function ProjectShareModal({
        isOpen,
        onClose,
        projectID,
        projectName
    }) {
        const [projectOwner, setProjectOwner] = useState(null);
        const [collaborators, setCollaborators] = useState([]);
        const [pendingInvites, setPendingInvites] = useState([]);
        const [loading, setLoading] = useState(false);
        const [showAddInviteModal, setShowAddInviteModal] = useState(false);
        const [isOwner, setIsOwner] = useState(false);
        const [hiddenRemovedBadges, setHiddenRemovedBadges] = useState(new Set());
        const [freshlyRemovedUIDs, setFreshlyRemovedUIDs] = useState(new Set());

        // Fetch project share data
        useEffect(() => {
            if (isOpen && projectID) {
                fetchProjectShareData();
            }
        }, [isOpen, projectID]);


        // Listen for custom refresh events
        useEffect(() => {
            const handleRefreshShareModal = (event) => {
                const eventProjectID = event.detail?.projectID;
                if (isOpen && projectID && (!eventProjectID || eventProjectID === projectID)) {
                    fetchProjectShareData();
                }
            };

            window.addEventListener('refreshProjectShare', handleRefreshShareModal);
            return () => {
                window.removeEventListener('refreshProjectShare', handleRefreshShareModal);
            };
        }, [isOpen, projectID]);

        // Auto-hide "Removed" badges after 3 seconds (only for freshly removed)
        useEffect(() => {
            const removedInvites = pendingInvites.filter(invite =>
                invite.status === 'removed' && freshlyRemovedUIDs.has(invite.uid)
            );
            if (removedInvites.length > 0) {
                const timers = removedInvites.map(invite => {
                    return setTimeout(() => {
                        setHiddenRemovedBadges(prev => new Set([...prev, invite.uid]));
                    }, 3000); // Hide badge after 3 seconds
                });

                return () => {
                    timers.forEach(timer => clearTimeout(timer));
                };
            }
        }, [pendingInvites, freshlyRemovedUIDs]);

        const fetchProjectShareData = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/project/share/details', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('[ProjectShareModal] Fetched data:', data);
                    console.log('[ProjectShareModal] Owner:', data.owner);
                    console.log('[ProjectShareModal] Collaborators:', data.collaborators);
                    console.log('[ProjectShareModal] Pending invites:', data.pendingInvites);
                    setProjectOwner(data.owner);
                    setCollaborators(data.collaborators || []);
                    setPendingInvites(data.pendingInvites || []);
                    setIsOwner(data.isOwner || false);
                    setHiddenRemovedBadges(new Set()); // Reset hidden badges on refresh
                } else {
                    console.error('[ProjectShareModal] API error:', response.status, response.statusText);
                    const errorData = await response.json().catch(() => ({}));
                    console.error('[ProjectShareModal] Error details:', errorData);
                }
            } catch (error) {
                console.error('[ProjectShareModal] Failed to fetch project share data:', error);
            } finally {
                setLoading(false);
            }
        };

        const handleRemoveCollaborator = async (uid) => {
            try {
                const response = await fetch('/api/project/editShare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID,
                        shareOptions: [{ uid, operation: 'remove' }]
                    })
                });

                if (response.ok) {
                    await fetchProjectShareData();
                }
            } catch (error) {
                console.error('Failed to remove collaborator:', error);
            }
        };

        const handleRemoveInvite = async (uid) => {
            try {
                const response = await fetch('/api/project/editShare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID,
                        shareOptions: [{ uid, operation: 'cancel-invite' }]
                    })
                });

                if (response.ok) {
                    // Mark this user as freshly removed so badge shows
                    setFreshlyRemovedUIDs(prev => new Set([...prev, uid]));
                    await fetchProjectShareData();
                }
            } catch (error) {
                console.error('Failed to remove invite:', error);
            }
        };

        const handleResendInvite = async (user) => {
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
                    await fetchProjectShareData();
                }
            } catch (error) {
                console.error('Failed to send invite:', error);
            }
        };

        const handleOpenInviteModal = () => {
            setShowAddInviteModal(true);
        };

        const handleInviteSuccess = () => {
            setShowAddInviteModal(false);
            fetchProjectShareData();
        };

        if (!isOpen) return null;

        return React.createElement(
            'div',
            {
                className: 'project-share-modal-overlay',
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
                    zIndex: 1000,
                    borderColor: '1px solid rgb(228, 228, 228)',
                    backdropFilter: 'blur(4px)'
                }
            },
            React.createElement(
                'div',
                {
                    className: 'project-share-modal-content',
                    onClick: (e) => e.stopPropagation(),
                    style: {
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '480px',
                        maxHeight: '80vh',
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
                        'Project Share'
                    ),
                    React.createElement(
                        'div',
                        { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
                        // Invite Collaborators Button (only show for owner)
                        isOwner && React.createElement(
                            'button',
                            {
                                onClick: handleOpenInviteModal,
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #e4e4e4',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#000',
                                    height : '32px'
                                    // transition: 'all 0.2s'
                                },
                                onMouseEnter: (e) => {
                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                    e.currentTarget.style.borderColor = '#d0d0d0';
                                },
                                onMouseLeave: (e) => {
                                    e.currentTarget.style.backgroundColor = '#fff';
                                    e.currentTarget.style.borderColor = '#e4e4e4';
                                }
                            },
                            React.createElement('span', {
                                style: { fontSize: '16px' }
                            }, '👥'),
                            'Invite Collaborators'
                        ),
                        // Close Button
                        React.createElement(
                            'button',
                            {
                                onClick: onClose,
                                'aria-label': 'Close',
                                style: {
                                    width: '32px',
                                    height: '32px',
                                    border: '1px solid rgb(228, 228, 228)',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    color: '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    // transition: 'all 0.2s'
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
                    )
                ),
                // Content
                React.createElement(
                    'div',
                    {
                        style: {
                            padding: '24px',
                            overflowY: 'auto',
                            flex: 1
                        }
                    },
                    loading ? React.createElement(
                        'div',
                        {
                            style: {
                                textAlign: 'center',
                                padding: '40px',
                                color: '#999',
                                fontFamily: 'Inter, sans-serif'
                            }
                        },
                        'Loading...'
                    ) : React.createElement(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '24px' } },
                        // Project Owner Section
                        projectOwner && React.createElement(
                            'div',
                            null,
                            React.createElement(
                                'h3',
                                {
                                    style: {
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#666',
                                        marginBottom: '12px'
                                    }
                                },
                                'Project Owner'
                            ),
                            React.createElement(
                                'div',
                                {
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        backgroundColor: '#f9f9f9',
                                        borderRadius: '12px'
                                    }
                                },
                                // Avatar
                                React.createElement(
                                    'div',
                                    {
                                        style: {
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: '#666',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontWeight: '600',
                                            fontSize: '16px',
                                            flexShrink: 0
                                        }
                                    },
                                    projectOwner.displayName?.charAt(0)?.toUpperCase() || 'O'
                                ),
                                // Owner Info
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
                                        projectOwner.displayName || 'Owner'
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
                                        projectOwner.username ? `@${projectOwner.username}` : ''
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
                                        projectOwner.email || 'example@example.com'
                                    )
                                )
                            )
                        ),
                        // Collaborators Section
                        React.createElement(
                            'div',
                            null,
                            React.createElement(
                                'h3',
                                {
                                    style: {
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#666',
                                        marginBottom: '12px'
                                    }
                                },
                                'Collaborators'
                            ),
                            collaborators.length === 0 ? React.createElement(
                                'p',
                                {
                                    style: {
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: '14px',
                                        color: '#999',
                                        fontStyle: 'italic'
                                    }
                                },
                                'No collaborators yet'
                            ) : React.createElement(
                                'div',
                                { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                                collaborators.map((collab) =>
                                    React.createElement(
                                        'div',
                                        {
                                            key: collab.uid,
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                backgroundColor: '#fff',
                                                border: '1px solid #e4e4e4',
                                                borderRadius: '12px'
                                            }
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
                                            collab.displayName?.charAt(0)?.toUpperCase() || 'U'
                                        ),
                                        // Collaborator Info
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
                                                collab.displayName || 'Invited User'
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
                                                collab.username ? `@${collab.username}` : ''
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
                                                collab.email || 'example@example.com'
                                            )
                                        ),
                                        // Remove Button (only show for owner)
                                        isOwner && React.createElement(
                                            'button',
                                            {
                                                onClick: () => handleRemoveCollaborator(collab.uid),
                                                style: {
                                                    fontFamily: 'Inter, sans-serif',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    color: '#dc2626',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    transition: 'background-color 0.2s'
                                                },
                                                onMouseEnter: (e) => {
                                                    e.currentTarget.style.backgroundColor = '#fee';
                                                },
                                                onMouseLeave: (e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            },
                                            'Remove'
                                        )
                                    )
                                )
                            )
                        ),
                        // Pending Invitations Section
                        pendingInvites.length > 0 && React.createElement(
                            'div',
                            null,
                            React.createElement(
                                'h3',
                                {
                                    style: {
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#666',
                                        marginBottom: '12px'
                                    }
                                },
                                'Added Collaboration'
                            ),
                            React.createElement(
                                'div',
                                { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                                pendingInvites.map((invite) =>
                                    React.createElement(
                                        'div',
                                        {
                                            key: invite.uid,
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                backgroundColor: '#fffbeb',
                                                border: '1px solid #969696',
                                                borderRadius: '12px'
                                            }
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
                                            invite.displayName?.charAt(0)?.toUpperCase() || 'U'
                                        ),
                                        // Invite Info
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
                                                invite.displayName || 'Invited User'
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
                                                invite.username ? `@${invite.username}` : ''
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
                                                invite.email || 'example@example.com'
                                            )
                                        ),
                                        // Status Badge (only show for freshly removed)
                                        !hiddenRemovedBadges.has(invite.uid) &&
                                        (invite.status === 'pending' || invite.status === 'declined' ||
                                         (invite.status === 'removed' && freshlyRemovedUIDs.has(invite.uid))) &&
                                        React.createElement(
                                            'span',
                                            {
                                                style: {
                                                    fontFamily: 'Inter, sans-serif',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    color: invite.status === 'declined' ? '#dc2626' :
                                                           invite.status === 'removed' ? '#dc2626' : '#969696',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    marginRight: '8px',
                                                    opacity: 1,
                                                    transition: 'opacity 0.5s ease-out'
                                                }
                                            },
                                            invite.status === 'declined' ? 'Declined' :
                                            invite.status === 'removed' ? 'Removed' : 'Pending'
                                        ),
                                        // Button (only show for owner)
                                        isOwner && React.createElement(
                                            'button',
                                            {
                                                onClick: () => (invite.status === 'declined' || invite.status === 'removed')
                                                    ? handleResendInvite(invite)  // Re-invite declined or removed user
                                                    : handleRemoveInvite(invite.uid),  // Cancel pending invite
                                                style: {
                                                    fontFamily: 'Inter, sans-serif',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    color: (invite.status === 'declined' || invite.status === 'removed') ? '#000000' : '#dc2626',
                                                    // backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    // transition: 'background-color 0.2s'
                                                },
                                                onMouseEnter: (e) => {
                                                    e.currentTarget.style.backgroundColor = (invite.status === 'declined' || invite.status === 'removed') ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0)';
                                                },
                                                onMouseLeave: (e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            },
                                            (invite.status === 'declined' || invite.status === 'removed') ? 'Add Invite' : 'Remove Invite'
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                // Add Invite Modal
                showAddInviteModal && React.createElement(window.AddInviteModal, {
                    isOpen: showAddInviteModal,
                    onClose: () => setShowAddInviteModal(false),
                    projectID: projectID,
                    onSuccess: handleInviteSuccess
                })
            )
        );
    };

    console.log('[ProjectShareModal] Component loaded');
})();
