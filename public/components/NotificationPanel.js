/**
 * NotificationPanel Component
 * Displays notifications panel next to the sidebar
 */

(function() {
    const { useState, useEffect, useRef } = React;

    const NotificationPanel = ({ isOpen, onClose, sidebarCollapsed }) => {
        const [notifications, setNotifications] = useState([]);
        const [loading, setLoading] = useState(false);
        const [sidebarWidth, setSidebarWidth] = useState(302);
        const [refreshKey, setRefreshKey] = useState(0); // Force re-render for time updates
        const panelRef = useRef(null);

        // Auto-refresh timestamps every 30 seconds
        useEffect(() => {
            if (!isOpen) return;

            const interval = setInterval(() => {
                setRefreshKey(prev => prev + 1); // Trigger re-render to update time displays
            }, 30000); // Update every 30 seconds

            return () => clearInterval(interval);
        }, [isOpen]);

        // Track sidebar width changes
        useEffect(() => {
            const updateSidebarWidth = () => {
                const savedWidth = localStorage.getItem('sidebarWidth');
                const expandedWidth = savedWidth ? parseInt(savedWidth, 10) : 302;
                const collapsedWidth = 77;
                // When expanded, add offset to position after the ::after dark bar element
                const effectiveWidth = sidebarCollapsed ? collapsedWidth : expandedWidth + 5;
                setSidebarWidth(effectiveWidth);
            };

            // Initial update
            updateSidebarWidth();

            // Listen for localStorage changes (sidebar resize)
            window.addEventListener('storage', updateSidebarWidth);

            // Listen for custom event from sidebar resize
            window.addEventListener('sidebarResized', updateSidebarWidth);

            return () => {
                window.removeEventListener('storage', updateSidebarWidth);
                window.removeEventListener('sidebarResized', updateSidebarWidth);
            };
        }, [sidebarCollapsed]);

        // Fetch notifications when panel opens
        useEffect(() => {
            if (isOpen) {
                fetchNotifications();
            }
        }, [isOpen]);

        // Close panel when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (panelRef.current && !panelRef.current.contains(event.target) &&
                    !event.target.closest('#notification-trigger-btn')) {
                    onClose();
                }
            };

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
            }
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen, onClose]);

        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/notifications/list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data.notifications || []);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        const handleAccept = async (notificationId, projectId) => {
            try {
                const response = await fetch('/api/notifications/accept-invitation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notificationId, projectId })
                });

                if (response.ok) {
                    // Remove from list
                    setNotifications(prev => prev.filter(n => n.notificationID !== notificationId));
                    window.showNotification?.({
                        type: 'success',
                        title: 'Accepted',
                        message: 'You have joined the project.',
                        actionText: 'OK'
                    });
                    // Refresh projects in sidebar
                    window.dispatchEvent(new CustomEvent('refreshProjects'));
                }
            } catch (error) {
                console.error('Error accepting invitation:', error);
            }
        };

        const handleDecline = async (notificationId) => {
            try {
                const response = await fetch('/api/notifications/decline-invitation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notificationId })
                });

                if (response.ok) {
                    setNotifications(prev => prev.filter(n => n.notificationID !== notificationId));
                }
            } catch (error) {
                console.error('Error declining invitation:', error);
            }
        };

        const handleClearAll = async () => {
            try {
                // Remove all notifications from UI
                const notificationIds = notifications.map(n => n.notificationID);

                // Call API to remove each notification
                const promises = notificationIds.map(id =>
                    fetch('/api/notification/remove', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notifID: id })
                    })
                );

                await Promise.all(promises);
                setNotifications([]);
            } catch (error) {
                console.error('Error clearing notifications:', error);
            }
        };

        const handleDismiss = async (notificationId) => {
            try {
                const response = await fetch('/api/notification/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notifID: notificationId })
                });

                if (response.ok) {
                    setNotifications(prev => prev.filter(n => n.notificationID !== notificationId));
                }
            } catch (error) {
                console.error('Error dismissing notification:', error);
            }
        };

        const formatTimeAgo = (timestamp) => {
            if (!timestamp) return '';
            const now = new Date();
            const date = new Date(timestamp);
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${diffDays}d ago`;
        };

        if (!isOpen) return null;

        const panelLeft = `${sidebarWidth}px`;
        const backdropLeft = `${sidebarWidth + 400}px`; // sidebar + panel width

        return React.createElement(React.Fragment, null,
            // Backdrop (only on the right side, after the panel)
            React.createElement('div', {
                id: 'notification-backdrop',
                onClick: onClose,
                style: {
                    position: 'fixed',
                    top: 0,
                    left: backdropLeft,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    zIndex: 9998
                }
            }),
            // Panel
            React.createElement('div', {
                ref: panelRef,
                id: 'notification-panel',
                style: {
                    position: 'fixed',
                    top: '0',
                    left: panelLeft,
                    width: '400px',
                    height: '100vh',
                    backgroundColor: '#fff',
                    borderRadius: '0',
                    // boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    fontFamily: "'Inter', Helvetica, sans-serif"
                }
            },
            // Header
            React.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px',
                    // borderBottom: '1px solid #e0e0e0',
                    backgroundColor: '#fff'
                }
            },
                React.createElement('h2', {
                    style: {
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#000'
                    }
                }, 'Notifications'),
                React.createElement('div', {
                    style: { display: 'flex', alignItems: 'center', gap: '8px' }
                },
                    // Clear All button
                    notifications.length > 0 && React.createElement('button', {
                        onClick: handleClearAll,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 10px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#333',
                            fontWeight: '500'
                        }
                    },
                        React.createElement('img', {
                            src: '/img/clear_all_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                            alt: 'Clear all',
                            style: { width: '16px', height: '16px' }
                        }),
                        'Clear All'
                    ),
                    // Close button
                    React.createElement('button', {
                        onClick: onClose,
                        style: {
                            width: '32px',
                            height: '32px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
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

            // Notifications list
            React.createElement('div', {
                style: {
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px'
                }
            },
                loading ? React.createElement('div', {
                    style: { textAlign: 'center', padding: '40px', color: '#666' }
                }, 'Loading...') :
                notifications.length === 0 ? React.createElement('div', {
                    style: { textAlign: 'center', padding: '40px', color: '#666' }
                }, 'No notifications') :
                notifications.map(notification =>
                    React.createElement(NotificationItem, {
                        key: `${notification.notificationID}-${refreshKey}`,
                        notification: notification,
                        onAccept: handleAccept,
                        onDecline: handleDecline,
                        onDismiss: handleDismiss,
                        formatTimeAgo: formatTimeAgo
                    })
                )
            )
        )
        );
    };

    // Individual notification item component
    const NotificationItem = ({ notification, onAccept, onDecline, onDismiss, formatTimeAgo }) => {
        // Check if notification is new (unread AND created within last 5 minutes)
        const notificationAge = new Date() - new Date(notification.createdAt);
        const isUnread = notification.isRead === 0 || notification.isRead === false;
        const isRecent = notificationAge < 5 * 60 * 1000; // 5 minutes in milliseconds
        const isNew = isUnread && isRecent;

        const isInvitation = notification.notificationType === 'collaboration_invite';

        return React.createElement('div', {
            style: {
                backgroundColor: 'rgb(242, 242, 242)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }
        },
            // Header with NEW badge and time
            React.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                }
            },
                isNew && React.createElement('span', {
                    style: {
                        backgroundColor: '#1a1a1a',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                    }
                }, 'NEW'),
                React.createElement('span', {
                    style: { fontSize: '12px', color: '#999' }
                }, formatTimeAgo(notification.createdAt))
            ),

            // Title
            React.createElement('h3', {
                style: {
                    margin: '0 0 6px 0',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#000'
                }
            }, notification.notificationTitle || 'Notification'),

            // Message
            React.createElement('p', {
                style: {
                    margin: '0 0 12px 0',
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: '1.4'
                }
            }, notification.notificationMessage),

            // Action buttons for invitations
            isInvitation && React.createElement('div', {
                style: {
                    display: 'flex',
                    gap: '16px',
                    marginTop: '12px'
                }
            },
                React.createElement('button', {
                    onClick: () => onAccept(notification.notificationID, notification.projectID),
                    style: {
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#000',
                        cursor: 'pointer'
                    }
                }, 'Accept'),
                React.createElement('button', {
                    onClick: () => onDecline(notification.notificationID),
                    style: {
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#e53935',
                        cursor: 'pointer'
                    }
                }, 'Decline')
            ),

            // Dismiss button for non-invitation notifications
            !isInvitation && React.createElement('button', {
                onClick: () => onDismiss(notification.notificationID),
                style: {
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    fontSize: '13px',
                    color: '#999',
                    cursor: 'pointer',
                    marginTop: '8px'
                }
            }, 'Dismiss')
        );
    };

    // Notification trigger button component (bell icon)
    const NotificationTrigger = ({ onClick, hasUnread, sidebarCollapsed }) => {
        return React.createElement('button', {
            id: 'notification-trigger-btn',
            onClick: onClick,
            title: 'Notifications',
            style: {
                position: 'relative',
                width: sidebarCollapsed ? '40px' : 'auto',
                height: '40px',
                padding: sidebarCollapsed ? '8px' : '8px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: '10px',
                outline: 'none',
                transition: 'background-color 0.2s',

            },
            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f0f0f0',
            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
        },
            // Bell icon (using SVG)
            React.createElement('svg', {
                width: '20',
                height: '20',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: '#333',
                strokeWidth: '2',
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
            },
                React.createElement('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }),
                React.createElement('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })
            ),
            // Unread indicator dot
            hasUnread && React.createElement('span', {
                style: {
                    position: 'absolute',
                    top: sidebarCollapsed ? '6px' : '8px',
                    right: sidebarCollapsed ? '8px' : 'auto',
                    left: sidebarCollapsed ? 'auto' : '24px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#e53935',
                    borderRadius: '50%'
                }
            }),
            // Label (only when expanded)
            !sidebarCollapsed && React.createElement('span', {
                style: {
                    fontSize: '14px',
                    color: '#333',
                    fontWeight: '500'
                }
            }, 'Notifications')
        );
    };

    // Export components
    Object.assign(window, {
        NotificationPanel,
        NotificationTrigger,
        NotificationItem
    });
})();
