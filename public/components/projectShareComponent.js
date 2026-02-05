/**
 * Project Share Component
 * Modal component for managing project collaborators and invitations
 * Accessible from the sidebar's Project options
 */

(function() {
    const {useState, useEffect, useRef, useCallback} = React;

    /**
     * ProjectShareModal Component
     * @param {Object} props
     * @param {boolean} props.isOpen - Whether the modal is open
     * @param {Function} props.onClose - Callback to close the modal
     * @param {string} props.projectID - Current project ID
     */
    const ProjectShareModal = ({ isOpen, onClose, projectID }) => {
        const [projectData, setProjectData] = useState(null);
        const [loading, setLoading] = useState(true);
        const [showAddInvite, setShowAddInvite] = useState(false);
        const [cancelledInvites, setCancelledInvites] = useState([]);
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

        // Fetch project collaboration data
        const fetchProjectData = useCallback(async () => {
            if (!projectID) return;

            setLoading(true);
            try {
                const response = await fetch('/api/project/collaborators', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID })
                });

                if (response.ok) {
                    const data = await response.json();
                    setProjectData(data);
                } else {
                    console.error('Failed to fetch project data');
                }
            } catch (error) {
                console.error('Error fetching project data:', error);
            } finally {
                setLoading(false);
            }
        }, [projectID]);

        // Load data when modal opens
        useEffect(() => {
            if (isOpen) {
                fetchProjectData();
            }
        }, [isOpen, fetchProjectData]);

        // Handle remove collaborator
        const handleRemoveCollaborator = async (userId, username) => {
            const confirmed = await window.showNotification({
                type: 'warning',
                title: 'Remove Collaborator',
                message: `Are you sure you want to remove @${username} from this project?`,
                actionText: 'Confirm'
            });

            if (!confirmed) return;

            try {
                const response = await fetch('/api/project/remove-collaborator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        projectID,
                        userId 
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        await window.showNotification({
                            type: 'success',
                            title: 'Collaborator Removed',
                            message: `Successfully removed @${username}`,
                            actionText: 'OK'
                        });
                        fetchProjectData();
                    } else {
                        throw new Error(data.message || 'Failed to remove collaborator');
                    }
                } else {
                    throw new Error('Failed to remove collaborator');
                }
            } catch (error) {
                console.error('Error removing collaborator:', error);
                await window.showNotification({
                    type: 'error',
                    title: 'Error',
                    message: error.message || 'Failed to remove collaborator',
                    actionText: 'OK'
                });
            }
        };

    // Handle remove invite
    const handleRemoveInvite = async (inviteId, username, userInfo) => {
        const confirmed = await window.showNotification({
            type: 'warning',
            title: 'Remove Invitation',
            message: `Are you sure you want to remove the invitation for @${username}?`,
            actionText: 'Confirm'
        });

        if (!confirmed) return;

        try {
            const response = await fetch('/api/project/remove-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    projectID,
                    inviteId 
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Add to cancelled invites list so user can reinvite
                    setCancelledInvites(prev => {
                        const exists = prev.find(u => u.userID === userInfo.userID);
                        if (!exists) {
                            return [...prev, { ...userInfo, status: 'cancelled' }];
                        }
                        return prev;
                    });

                    await window.showNotification({
                        type: 'success',
                        title: 'Invitation Removed',
                        message: `Successfully removed invitation for @${username}`,
                        actionText: 'OK'
                    });
                    fetchProjectData();
                } else {
                    throw new Error(data.message || 'Failed to remove invitation');
                }
            } else {
                throw new Error('Failed to remove invitation');
            }
        } catch (error) {
            console.error('Error removing invite:', error);
            await window.showNotification({
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to remove invitation',
                actionText: 'OK'
            });
        }
    };

    // Handle reinvite (for cancelled invitations)
    const handleReinvite = async (userId, username) => {
        try {
            const response = await fetch('/api/project/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    projectID,
                    invitedUserId: userId 
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Remove from cancelled list
                    setCancelledInvites(prev => prev.filter(u => u.userID !== userId));
                    
                    await window.showNotification({
                        type: 'success',
                        title: 'Invitation Sent',
                        message: `Successfully invited @${username}`,
                        actionText: 'OK'
                    });
                    fetchProjectData();
                } else {
                    throw new Error(data.message || 'Failed to send invitation');
                }
            } else {
                throw new Error('Failed to send invitation');
            }
        } catch (error) {
            console.error('Error sending invitation:', error);
            await window.showNotification({
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to send invitation',
                actionText: 'OK'
            });
        }
    };

    // Handle accept invite (for users who can accept pending invites)
    const handleAcceptInvite = async (inviteId, username) => {
            try {
                const response = await fetch('/api/project/accept-invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        projectID,
                        inviteId 
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        await window.showNotification({
                            type: 'success',
                            title: 'Invitation Accepted',
                            message: `@${username} is now a collaborator`,
                            actionText: 'OK'
                        });
                        fetchProjectData();
                    } else {
                        throw new Error(data.message || 'Failed to accept invitation');
                    }
                } else {
                    throw new Error('Failed to accept invitation');
                }
            } catch (error) {
                console.error('Error accepting invite:', error);
                await window.showNotification({
                    type: 'error',
                    title: 'Error',
                    message: error.message || 'Failed to accept invitation',
                    actionText: 'OK'
                });
            }
        };

        // Listen for project updates to refresh the modal
        useEffect(() => {
            const handleProjectUpdate = () => {
                if (isOpen) {
                    fetchProjectData();
                }
            };

            window.addEventListener('refreshProjects', handleProjectUpdate);
            return () => window.removeEventListener('refreshProjects', handleProjectUpdate);
        }, [isOpen, fetchProjectData]);

        if (!isOpen) return null;

        return React.createElement(React.Fragment, null,
            // Main Project Share Modal
            React.createElement('div', {
                id: 'project-share-modal-backdrop',
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
                    zIndex: 9999,
                    padding: '20px'
                }
            },
                // Modal content
                React.createElement('div', {
                    id: 'project-share-modal-content',
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden'
                    },
                    onClick: (e) => e.stopPropagation()
                },
                    // Header
                    React.createElement('div', {
                        id: 'project-share-modal-header',
                        style: {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px'
                        }
                    },
                        React.createElement('h2', {
                            id: 'project-share-modal-title',
                            style: {
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: '600',
                                color: '#1c1d21',
                                fontFamily: '"Inter", Helvetica'
                            }
                        }, 'Project Share'),

                        React.createElement('div', {
                            id: 'project-share-header-actions',
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }
                        },
                            // Invite Collaborators button - only show to owner
                            projectData && projectData.currentUserID === projectData.owner?.userID &&
                            React.createElement('button', {
                                id: 'project-share-invite-collaborators-btn',
                                style: {
                                    padding: '8px 16px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#1c1d21',
                                    // backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontFamily: '"Inter", Helvetica',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                },
                                onMouseEnter: (e) => {
                                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                                    e.currentTarget.style.borderColor = '#9ca3af';
                                },
                                onMouseLeave: (e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                },
                                onClick: () => setShowAddInvite(true)
                            },
                                // User add icon
                                React.createElement('svg', {
                                    width: '16',
                                    height: '16',
                                    viewBox: '0 0 24 24',
                                    fill: 'none',
                                    stroke: 'currentColor',
                                    strokeWidth: '2',
                                    strokeLinecap: 'round',
                                    strokeLinejoin: 'round'
                                },
                                    React.createElement('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
                                    React.createElement('circle', { cx: '8.5', cy: '7', r: '4' }),
                                    React.createElement('line', { x1: '20', y1: '8', x2: '20', y2: '14' }),
                                    React.createElement('line', { x1: '23', y1: '11', x2: '17', y2: '11' })
                                ),
                                'Invite Collaborators'
                            ),

                            // Close button
                            React.createElement('button', {
                                id: 'project-share-modal-close-btn',
                                style: {
                                    width: '38px',
                                    height: '38px',
                                    border: '1px solid rgb(209, 213, 219)',
                                    borderRadius: '6px',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    transition: 'background-color 0.2s',
                                    flexShrink: 0
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
                        )
                    ),

                    // Body
                    React.createElement('div', {
                        id: 'project-share-modal-body',
                        style: {
                            flex: 1,
                            overflowY: 'auto',
                            padding: '24px'
                        }
                    },
                        loading ? 
                            React.createElement('div', {
                                id: 'project-share-loading-state',
                                style: {
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    color: '#6b7280',
                                    fontSize: '14px'
                                }
                            }, 'Loading...') :
                        !projectData ?
                            React.createElement('div', {
                                id: 'project-share-error-state',
                                style: {
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    color: '#6b7280',
                                    fontSize: '14px'
                                }
                            }, 'Failed to load project data') :
                        React.createElement('div', {
                            id: 'project-share-content',
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px'
                            }
                        },
                            // Project Owner Section
                            React.createElement('div', {
                                id: 'project-share-owner-section'
                            },
                                React.createElement('h3', {
                                    id: 'project-share-owner-heading',
                                    style: {
                                        margin: '0 0 12px 0',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#000',
                                        fontFamily: '"Inter", Helvetica',
                                    }
                                }, 'Project Owner'),

                                projectData.owner && React.createElement('div', {
                                    id: 'project-share-owner-card',
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        backgroundColor: '#f9fafb'
                                    }
                                },
                                    // Avatar
                                    React.createElement('div', {
                                        style: {
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            backgroundColor: '#6b7280',
                                            flexShrink: 0
                                        }
                                    }),

                                    // Owner info
                                    React.createElement('div', {
                                        style: {
                                            flex: 1,
                                            minWidth: 0
                                        }
                                    },
                                        React.createElement('div', {
                                            style: {
                                                fontSize: '15px',
                                                fontWeight: '500',
                                                color: '#1c1d21',
                                                fontFamily: '"Inter", Helvetica',
                                                marginBottom: '2px'
                                            }
                                        }, projectData.owner.displayName || 'Owner'),
                                        
                                        React.createElement('div', {
                                            style: {
                                                fontSize: '13px',
                                                color: '#6b7280',
                                                fontFamily: '"Inter", Helvetica',
                                                marginBottom: '2px'
                                            }
                                        }, `@${projectData.owner.username || 'owner'}`),
                                        
                                        React.createElement('div', {
                                            style: {
                                                fontSize: '13px',
                                                color: '#6b7280',
                                                fontFamily: '"Inter", Helvetica'
                                            }
                                        }, projectData.owner.email || 'example@example.com')
                                    )
                                )
                            ),

                            // Collaborators Section
                            projectData.collaborators && projectData.collaborators.length > 0 && 
                            React.createElement('div', {
                                id: 'project-share-collaborators-section'
                            },
                                React.createElement('h3', {
                                    id: 'project-share-collaborators-heading',
                                    style: {
                                        margin: '0 0 12px 0',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#000000',
                                        fontFamily: '"Inter", Helvetica',
                                       
                                    }
                                }, 'Collaborators'),

                                React.createElement('div', {
                                    id: 'project-share-collaborators-list',
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }
                                },
                                    projectData.collaborators.map(collaborator => 
                                        React.createElement('div', {
                                            id: `project-share-collaborator-card-${collaborator.userID}`,
                                            key: collaborator.userID,
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: '1px solid #e5e7eb',
                                                transition: 'background-color 0.2s'
                                            }
                                        },
                                            // Avatar
                                            React.createElement('div', {
                                                style: {
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#6b7280',
                                                    flexShrink: 0
                                                }
                                            }),

                                            // Collaborator info
                                            React.createElement('div', {
                                                style: {
                                                    flex: 1,
                                                    minWidth: 0
                                                }
                                            },
                                                React.createElement('div', {
                                                    style: {
                                                        fontSize: '15px',
                                                        fontWeight: '500',
                                                        color: '#1c1d21',
                                                        fontFamily: '"Inter", Helvetica',
                                                        marginBottom: '2px'
                                                    }
                                                }, collaborator.displayName || 'Invited User'),
                                                
                                                React.createElement('div', {
                                                    style: {
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        fontFamily: '"Inter", Helvetica',
                                                        marginBottom: '2px'
                                                    }
                                                }, `@${collaborator.username || 'invited_user'}`),
                                                
                                                React.createElement('div', {
                                                    style: {
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        fontFamily: '"Inter", Helvetica'
                                                    }
                                                }, collaborator.email || 'example@example.com')
                                            ),

                                            // Remove button - only show to owner
                                            projectData.currentUserID === projectData.owner?.userID &&
                                            React.createElement('button', {
                                                id: `project-share-remove-collaborator-btn-${collaborator.userID}`,
                                                style: {
                                                    padding: '8px 16px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    color: '#dc2626',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    fontFamily: '"Inter", Helvetica',
                                                    transition: 'background-color 0.2s',
                                                    flexShrink: 0
                                                },
                                                // onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#fee2e2',
                                                onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                                                onClick: () => handleRemoveCollaborator(collaborator.userID, collaborator.username)
                                            }, 'Remove')
                                        )
                                    )
                                )
                            ),

                            // Added Collaboration Section (Pending Invites + Cancelled)
                            ((projectData.pendingInvites && projectData.pendingInvites.length > 0) || cancelledInvites.length > 0) &&
                            React.createElement('div', {
                                id: 'project-share-pending-section'
                            },
                                React.createElement('h3', {
                                    id: 'project-share-pending-heading',
                                    style: {
                                        margin: '0 0 12px 0',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#000000',
                                        fontFamily: '"Inter", Helvetica',
                                        
                                    }
                                }, 'Added Collaboration'),

                                React.createElement('div', {
                                    id: 'project-share-pending-list',
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }
                                },
                                    [...(projectData.pendingInvites || []), ...cancelledInvites].map(invite => 
                                        React.createElement('div', {
                                            id: `project-share-pending-card-${invite.inviteID || invite.userID}`,
                                            key: invite.inviteID || invite.userID,
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: '1px solid #e5e7eb',
                                                transition: 'background-color 0.2s'
                                            }
                                        },
                                            // Avatar
                                            React.createElement('div', {
                                                style: {
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#6b7280',
                                                    flexShrink: 0
                                                }
                                            }),

                                            // Invite info
                                            React.createElement('div', {
                                                style: {
                                                    flex: 1,
                                                    minWidth: 0
                                                }
                                            },
                                                React.createElement('div', {
                                                    style: {
                                                        fontSize: '15px',
                                                        fontWeight: '500',
                                                        color: '#1c1d21',
                                                        fontFamily: '"Inter", Helvetica',
                                                        marginBottom: '2px'
                                                    }
                                                }, invite.displayName || 'Invited User'),
                                                
                                                React.createElement('div', {
                                                    style: {
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        fontFamily: '"Inter", Helvetica',
                                                        marginBottom: '2px'
                                                    }
                                                }, `@${invite.username || 'invited_user'}`),
                                                
                                                React.createElement('div', {
                                                    style: {
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        fontFamily: '"Inter", Helvetica'
                                                    }
                                                }, invite.email || 'example@example.com')
                                            ),

                                            // Status badge and action button - only show to owner
                                            projectData.currentUserID === projectData.owner?.userID &&
                                            React.createElement('div', {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    flexShrink: 0
                                                }
                                            },
                                                // Show different UI based on status
                                                invite.status === 'pending' ?
                                                    React.createElement(React.Fragment, null,
                                                        React.createElement('span', {
                                                            id: `project-share-pending-badge-${invite.inviteID}`,
                                                            style: {
                                                                padding: '4px 10px',
                                                                fontSize: '12px',
                                                                fontWeight: '500',
                                                                color: '#d97706',
                                                                backgroundColor: '#fef3c7',
                                                                borderRadius: '6px',
                                                                fontFamily: '"Inter", Helvetica'
                                                            }
                                                        }, 'Pending'),
                                                        React.createElement('button', {
                                                            id: `project-share-remove-invite-btn-${invite.inviteID}`,
                                                            style: {
                                                                padding: '8px 12px',
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                color: '#dc2626',
                                                                backgroundColor: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                borderRadius: '6px',
                                                                fontFamily: '"Inter", Helvetica',
                                                                transition: 'background-color 0.2s'
                                                            },
                                                            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#fee2e2',
                                                            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                                                            onClick: () => handleRemoveInvite(invite.inviteID, invite.username, invite)
                                                        }, 'Remove Invite')
                                                    ) :
                                                    invite.status === 'cancelled' ?
                                                        React.createElement('button', {
                                                            id: `project-share-reinvite-btn-${invite.userID}`,
                                                            style: {
                                                                padding: '8px 16px',
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                color: '#1c1d21',
                                                                backgroundColor: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                borderRadius: '6px',
                                                                fontFamily: '"Inter", Helvetica',
                                                                transition: 'background-color 0.2s'
                                                            },
                                                            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f3f4f6',
                                                            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                                                            onClick: () => handleReinvite(invite.userID, invite.username)
                                                        }, 'Add Invite') :
                                                        // For 'ready' status or other statuses
                                                        React.createElement('button', {
                                                            id: `project-share-accept-invite-btn-${invite.inviteID}`,
                                                            style: {
                                                                padding: '8px 16px',
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                color: '#1c1d21',
                                                                backgroundColor: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                borderRadius: '6px',
                                                                fontFamily: '"Inter", Helvetica',
                                                                transition: 'background-color 0.2s'
                                                            },
                                                            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f3f4f6',
                                                            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent',
                                                            onClick: () => handleAcceptInvite(invite.inviteID, invite.username)
                                                        }, 'Add Invite')
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            ),

            // Add Invite Modal (nested)
            showAddInvite && window.AddInviteModal && 
            React.createElement(window.AddInviteModal, {
                isOpen: showAddInvite,
                onClose: () => {
                    setShowAddInvite(false);
                    fetchProjectData(); // Refresh data when closing add invite modal
                },
                projectID: projectID
            })
        );
    };

    // Export the component globally
    window.ProjectShareModal = ProjectShareModal;

    console.log('ProjectShareComponent loaded successfully');
})();
