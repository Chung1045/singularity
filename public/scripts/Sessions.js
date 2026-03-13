(function() {
const { useEffect, useMemo, useState } = React;
const e = React.createElement;
const TOAST_DURATION_MS = 3200;

function formatDateTime(value) {
    if (!value) return 'Unknown';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);
}

function pluralize(value, unit) {
    return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

function formatRelativeDate(value) {
    if (!value) return 'Unknown';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';

    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if (diffMs < minute) return 'Just now';
    if (diffMs < hour) return pluralize(Math.max(1, Math.round(diffMs / minute)), 'minute');
    if (diffMs < day) return pluralize(Math.max(1, Math.round(diffMs / hour)), 'hour');
    if (diffMs < week) return pluralize(Math.max(1, Math.round(diffMs / day)), 'day');
    if (diffMs < month) return pluralize(Math.max(1, Math.round(diffMs / week)), 'week');
    if (diffMs < year) return pluralize(Math.max(1, Math.round(diffMs / month)), 'month');
    return pluralize(Math.max(1, Math.round(diffMs / year)), 'year');
}

function renderSecurityIcon(name, className = '') {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
        className,
        stroke: 'currentColor',
        strokeWidth: '1.9',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
    };

    switch (name) {
        case 'arrowLeft':
            return e('svg', props,
                e('path', { d: 'M15 18l-6-6 6-6' }),
                e('path', { d: 'M9 12h10' })
            );
        case 'logout':
            return e('svg', props,
                e('path', { d: 'M14 8l4 4-4 4' }),
                e('path', { d: 'M18 12H9' }),
                e('path', { d: 'M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10' })
            );
        case 'trash':
            return e('svg', props,
                e('path', { d: 'M4 7h16' }),
                e('path', { d: 'M10 11v5' }),
                e('path', { d: 'M14 11v5' }),
                e('path', { d: 'M6 7l1 12h10l1-12' }),
                e('path', { d: 'M9 7V4h6v3' })
            );
        case 'phone':
            return e('svg', props,
                e('rect', { x: '8', y: '3', width: '8', height: '18', rx: '2.2' }),
                e('path', { d: 'M11 17.5h2' })
            );
        case 'laptop':
            return e('svg', props,
                e('rect', { x: '4.5', y: '5', width: '15', height: '10.5', rx: '1.8' }),
                e('path', { d: 'M3 18.5h18' })
            );
        case 'globe':
            return e('svg', props,
                e('circle', { cx: '12', cy: '12', r: '8' }),
                e('path', { d: 'M4 12h16' }),
                e('path', { d: 'M12 4c2.4 2.3 3.5 5.1 3.5 8s-1.1 5.7-3.5 8' }),
                e('path', { d: 'M12 4c-2.4 2.3-3.5 5.1-3.5 8s1.1 5.7 3.5 8' })
            );
        case 'clock':
            return e('svg', props,
                e('circle', { cx: '12', cy: '12', r: '8' }),
                e('path', { d: 'M12 8v4l3 2' })
            );
        case 'shield':
        default:
            return e('svg', props,
                e('path', { d: 'M12 3l7 3v5c0 5-3.4 8.1-7 10-3.6-1.9-7-5-7-10V6l7-3z' })
            );
    }
}

function normalizeIP(value) {
    if (!value) return 'Unknown';
    if (value === '::1') return '127.0.0.1 (localhost)';
    return value;
}

function getDeviceTheme(osValue, browserValue) {
    const label = `${osValue || ''} ${browserValue || ''}`.toLowerCase();

    if (label.includes('iphone') || label.includes('ipad') || label.includes('mac') || label.includes('safari')) {
        return { iconClass: 'security-row-icon--apple', iconName: 'phone' };
    }

    if (label.includes('windows') || label.includes('edge')) {
        return { iconClass: 'security-row-icon--windows', iconName: 'laptop' };
    }

    if (label.includes('android') || label.includes('chrome') || label.includes('google')) {
        return { iconClass: 'security-row-icon--google', iconName: 'globe' };
    }

    if (label.includes('samsung')) {
        return { iconClass: 'security-row-icon--samsung', iconName: 'phone' };
    }

    return { iconClass: 'security-row-icon--generic', iconName: 'globe' };
}

function isRecent(value, hours = 24) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
}

function renderToast(toast) {
    if (!toast) return null;

    return e('div', { className: 'security-toast-stack' },
        e('div', { className: `security-toast security-toast--${toast.type || 'info'}` },
            e('div', { className: 'security-toast-title' }, toast.title),
            toast.message ? e('div', { className: 'security-toast-copy' }, toast.message) : null
        )
    );
}

function renderModal(modal, closeModal, handleConfirm) {
    if (!modal.isOpen) return null;

    return e('div', {
        className: 'security-modal-backdrop',
        onClick: (event) => {
            if (event.target === event.currentTarget) {
                closeModal();
            }
        }
    },
        e('div', {
            className: 'security-modal',
            onClick: (event) => event.stopPropagation()
        },
            e('h2', { className: 'security-modal-title' }, modal.title),
            e('p', { className: 'security-modal-copy' }, modal.message),
            e('div', { className: 'security-modal-actions' },
                modal.type === 'confirm'
                    ? e('button', {
                        className: 'security-button security-button--secondary',
                        onClick: closeModal
                    }, 'Cancel')
                    : null,
                e('button', {
                    className: `security-button ${modal.type === 'confirm' ? 'security-button--primary' : 'security-button--secondary'}`,
                    onClick: modal.type === 'confirm' ? handleConfirm : closeModal
                }, modal.type === 'confirm' ? 'Confirm' : 'OK')
            )
        )
    );
}

const Session = ({ csrfToken, sessions, loginAttempts, currentSessionID, userInfo }) => {
    window.csrfToken = csrfToken;

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [sessionItems, setSessionItems] = useState(() => Array.isArray(sessions) ? sessions : []);
    const [attemptItems, setAttemptItems] = useState(() => Array.isArray(loginAttempts) ? loginAttempts : []);
    const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
    const [toast, setToast] = useState(null);
    const [pendingSessionID, setPendingSessionID] = useState(null);
    const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
    const [isClearingHistory, setIsClearingHistory] = useState(false);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const username = userInfo?.userName || userInfo?.email || 'User';

    const activeSession = useMemo(() => {
        if (!sessionItems.length) return null;
        return sessionItems.find((session) => session.sessionID === currentSessionID) || sessionItems[0];
    }, [sessionItems, currentSessionID]);

    const activeSessionID = activeSession?.sessionID || '';

    const otherSessions = useMemo(() => {
        return sessionItems.filter((session) => session.sessionID !== activeSessionID);
    }, [sessionItems, activeSessionID]);

    const sortedAttempts = useMemo(() => {
        return [...attemptItems].sort((left, right) => {
            const leftDate = new Date(left.attemptDate || 0).getTime();
            const rightDate = new Date(right.attemptDate || 0).getTime();
            return rightDate - leftDate;
        });
    }, [attemptItems]);

    const pageStatusClass = otherSessions.length > 0
        ? 'security-chip security-chip--warning'
        : 'security-chip security-chip--success';
    const pageStatusLabel = otherSessions.length > 0 ? 'Review devices' : 'Only this device';

    const showToast = (type, title, message = '') => {
        setToast({ id: Date.now(), type, title, message });
    };

    const showAlert = (title, message, onConfirm = null) => {
        setModal({ isOpen: true, type: 'alert', title, message, onConfirm });
    };

    const showConfirm = (title, message, onConfirm) => {
        setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
    };

    const handleModalConfirm = async () => {
        const onConfirm = modal.onConfirm;
        closeModal();
        if (typeof onConfirm === 'function') {
            await onConfirm();
        }
    };

    const logout = async () => {
        if (!csrfToken) {
            showAlert('Security token missing', 'Please refresh the page and try again.');
            return;
        }

        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showAlert('Unable to sign out', errorData.message || 'An error occurred. Please try again.');
                return;
            }

            showToast('success', 'Signed out', 'Redirecting to the home page.');
            window.setTimeout(() => {
                window.location = '/?loggedout=1';
            }, 900);
        } catch (error) {
            showAlert('Unable to sign out', 'An error occurred during logout. Please try again.');
        }
    };

    const handleClearLoginAttempts = () => {
        showConfirm(
            'Clear sign-in activity',
            'Remove your recent sign-in attempt history from this page?',
            async () => {
                setIsClearingHistory(true);

                try {
                    const response = await fetch('/api/loginAttempts/deleteAll', {
                        method: 'POST',
                        headers: {
                            'CSRF-Token': csrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({})
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to clear the sign-in activity.');
                    }

                    setAttemptItems([]);
                    showToast('success', 'Activity cleared', 'Your recent sign-in activity has been removed from this page.');
                } catch (error) {
                    showAlert('Unable to clear activity', error?.message || 'Failed to clear the sign-in activity.');
                } finally {
                    setIsClearingHistory(false);
                }
            }
        );
    };

    const handleSessionLogout = (session) => {
        showConfirm(
            'Sign out this device',
            `Sign out ${session.sessionBrowser || 'this browser'} on ${session.sessionOS || 'this device'}?`,
            async () => {
                setPendingSessionID(session.sessionID);

                try {
                    const response = await fetch('/api/session/logout', {
                        method: 'POST',
                        headers: {
                            'CSRF-Token': csrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ sessionID: session.sessionID })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to sign out this session.');
                    }

                    setSessionItems((previous) => previous.filter((item) => item.sessionID !== session.sessionID));
                    showToast('success', 'Device signed out', 'The selected session has been removed.');
                } catch (error) {
                    showAlert('Unable to sign out device', error?.message || 'Failed to sign out this session.');
                } finally {
                    setPendingSessionID(null);
                }
            }
        );
    };

    const handleSignOutOtherSessions = () => {
        if (!otherSessions.length) return;

        showConfirm(
            'Sign out other sessions',
            'Keep only this browser signed in and remove every other active session?',
            async () => {
                setIsSigningOutOthers(true);

                try {
                    const targets = [...otherSessions];
                    const results = await Promise.allSettled(
                        targets.map(async (session) => {
                            const response = await fetch('/api/session/logout', {
                                method: 'POST',
                                headers: {
                                    'CSRF-Token': csrfToken,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ sessionID: session.sessionID })
                            });

                            if (!response.ok) {
                                throw new Error(session.sessionID);
                            }

                            return session.sessionID;
                        })
                    );

                    const removedIDs = results
                        .filter((result) => result.status === 'fulfilled')
                        .map((result) => result.value);

                    if (removedIDs.length) {
                        setSessionItems((previous) => previous.filter((item) => !removedIDs.includes(item.sessionID)));
                    }

                    if (removedIDs.length === targets.length) {
                        showToast('success', 'Other sessions signed out', 'Only this device remains signed in.');
                    } else if (removedIDs.length > 0) {
                        showAlert('Partial sign-out', 'Some sessions were removed, but at least one device could not be signed out.');
                    } else {
                        showAlert('Unable to sign out other devices', 'No other sessions were removed. Please try again.');
                    }
                } catch (error) {
                    showAlert('Unable to sign out other devices', 'No other sessions were removed. Please try again.');
                } finally {
                    setIsSigningOutOthers(false);
                }
            }
        );
    };

    function handleProfileRoute() {
        window.location.href = '/profile';
    }

    const summaryItems = [
        {
            label: 'Signed-in devices',
            value: String(sessionItems.length),
            note: sessionItems.length === 1
                ? 'Only this browser session is active.'
                : `${otherSessions.length} additional device${otherSessions.length === 1 ? '' : 's'} are still signed in.`
        },
        {
            label: 'Current session',
            value: activeSession ? formatRelativeDate(activeSession.lastSeenTime) : 'Unknown',
            note: activeSession
                ? `Last active on ${formatDateTime(activeSession.lastSeenTime)}.`
                : 'No active session was found.'
        },
        {
            label: 'Recent activity',
            value: String(sortedAttempts.length),
            note: sortedAttempts.length
                ? `Latest attempt was ${formatRelativeDate(sortedAttempts[0].attemptDate)}.`
                : 'No recent sign-in attempts recorded.'
        }
    ];

    const currentSessionPanel = activeSession
        ? e('div', { className: 'security-row-list' },
            e('div', { className: 'security-row' },
                e('div', { className: 'security-row-main' },
                    e('div', {
                        className: 'security-row-icon security-row-icon--current'
                    }, renderSecurityIcon('shield', 'security-row-icon-svg')),
                    e('div', { className: 'security-row-content' },
                        e('div', { className: 'security-row-title-line' },
                            e('h3', { className: 'security-row-title' }, activeSession.sessionBrowser || 'Unknown browser'),
                            e('span', { className: 'security-chip security-chip--neutral' }, 'Current session'),
                            isRecent(activeSession.lastSeenTime)
                                ? e('span', { className: 'security-chip security-chip--success' }, 'Active now')
                                : null
                        ),
                        e('p', { className: 'security-row-description' }, activeSession.sessionOS || 'Unknown operating system'),
                        e('div', { className: 'security-row-meta' },
                            e('span', { className: 'security-row-meta-item' }, `IP ${normalizeIP(activeSession.sessionIP)}`),
                            e('span', { className: 'security-row-meta-item' },
                                `Last active ${formatRelativeDate(activeSession.lastSeenTime)}`
                            )
                        )
                    )
                )
            )
        )
        : e('div', { className: 'security-empty' },
            e('h3', { className: 'security-empty-title' }, 'No active session found'),
            e('p', { className: 'security-empty-copy' },
                'We could not match the current browser session. Refresh the page or sign in again if this looks wrong.'
            )
        );

    const otherSessionList = otherSessions.length > 0
        ? e('div', { className: 'security-row-list' },
            otherSessions.map((session) => {
                const theme = getDeviceTheme(session.sessionOS, session.sessionBrowser);

                return e('div', {
                    key: session.sessionID,
                    className: 'security-row'
                },
                    e('div', { className: 'security-row-main' },
                        e('div', {
                            className: `security-row-icon ${theme.iconClass}`
                        }, renderSecurityIcon(theme.iconName, 'security-row-icon-svg')),
                        e('div', { className: 'security-row-content' },
                            e('div', { className: 'security-row-title-line' },
                                e('h3', { className: 'security-row-title' }, session.sessionBrowser || 'Unknown browser')
                            ),
                            e('p', { className: 'security-row-description' }, session.sessionOS || 'Unknown operating system'),
                            e('div', { className: 'security-row-meta' },
                                e('span', { className: 'security-row-meta-item' }, `IP ${normalizeIP(session.sessionIP)}`),
                                e('span', { className: 'security-row-meta-item' },
                                    `Last active ${formatRelativeDate(session.lastSeenTime)}`
                                )
                            )
                        )
                    ),
                    e('div', { className: 'security-row-actions' },
                        e('button', {
                            className: 'security-button security-button--danger',
                            onClick: () => handleSessionLogout(session),
                            disabled: pendingSessionID === session.sessionID
                        },
                            e('span', { className: 'security-button-icon' }, renderSecurityIcon('logout', 'security-button-svg')),
                            pendingSessionID === session.sessionID ? 'Signing out...' : 'Sign out'
                        )
                    )
                );
            })
        )
        : e('div', { className: 'security-empty' },
            e('h3', { className: 'security-empty-title' }, 'Only this device is signed in'),
            e('p', { className: 'security-empty-copy' },
                'That is a good sign. If another device appears here later and you do not recognize it, sign it out immediately.'
            )
        );

    const activityFeed = sortedAttempts.length > 0
        ? e('div', { className: 'security-row-list' },
            sortedAttempts.map((attempt) => {
                const recent = isRecent(attempt.attemptDate, 12);
                const theme = getDeviceTheme(attempt.attemptOS, attempt.attemptBrowser);

                return e('div', {
                    key: attempt.attemptID,
                    className: 'security-row'
                },
                    e('div', { className: 'security-row-main' },
                        e('div', {
                            className: `security-row-icon ${theme.iconClass}`
                        }, renderSecurityIcon(recent ? 'clock' : theme.iconName, 'security-row-icon-svg')),
                        e('div', { className: 'security-row-content' },
                            e('div', { className: 'security-row-title-line' },
                                e('h3', { className: 'security-row-title' }, attempt.attemptBrowser || 'Unknown browser'),
                                recent
                                    ? e('span', { className: 'security-chip security-chip--neutral' }, 'Recent')
                                    : null
                            ),
                            e('p', { className: 'security-row-description' }, attempt.attemptOS || 'Unknown operating system'),
                            e('div', { className: 'security-row-meta' },
                                e('span', { className: 'security-row-meta-item' }, `IP ${normalizeIP(attempt.attemptIP)}`),
                                e('span', { className: 'security-row-meta-item' }, formatDateTime(attempt.attemptDate))
                            )
                        )
                    )
                );
            })
        )
        : e('div', { className: 'security-empty' },
            e('h3', { className: 'security-empty-title' }, 'No recent activity'),
            e('p', { className: 'security-empty-copy' },
                'Recent sign-in attempts will show up here so you can spot devices and times that do not look familiar.'
            )
        );

    return e('div', {
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false)
    },
        e('div', { className: 'group' },
            e(window.Sidebar, {
                sidebarCollapsed,
                setSidebarCollapsed,
                username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen,
                setUserMenuOpen,
                userInfo
            }),
            e('main', { className: 'right-container' },
                e('section', { className: 'main-screen security-shell' },
                    e('input', {
                        type: 'hidden',
                        name: '_csrf',
                        id: 'hidden-csrf',
                        value: csrfToken
                    }),
                    e('div', { className: 'security-page' },
                        e('header', { className: 'security-header' },
                            e('div', { className: 'security-header-copy' },
                                e('p', { className: 'security-header-kicker' }, 'Security settings'),
                                e('div', { className: 'security-header-title-row' },
                                    e('h1', { className: 'security-header-title' }, 'Sessions'),
                                    e('span', { className: pageStatusClass }, pageStatusLabel)
                                ),
                                e('p', { className: 'security-header-description' },
                                    'Review the browsers that are signed into your account and keep the list limited to devices you recognize.'
                                )
                            ),
                            e('div', { className: 'security-header-actions' },
                                e('button', {
                                    className: 'security-button security-button--secondary',
                                    onClick: handleProfileRoute
                                },
                                    e('span', { className: 'security-button-icon' }, renderSecurityIcon('arrowLeft', 'security-button-svg')),
                                    'Back to profile'
                                )
                            )
                        ),
                        e('section', { className: 'security-summary' },
                            summaryItems.map((item) => e('div', {
                                key: item.label,
                                className: 'security-summary-item'
                            },
                                e('div', { className: 'security-summary-label' }, item.label),
                                e('div', { className: 'security-summary-value' }, item.value),
                                e('div', { className: 'security-summary-note' }, item.note)
                            ))
                        ),
                        e('div', { className: 'security-stack' },
                            e('section', { className: 'security-section' },
                                e('div', { className: 'security-section-header' },
                                    e('div', { className: 'security-section-copy' },
                                        e('h2', { className: 'security-section-title' }, 'Current device'),
                                        e('p', { className: 'security-section-description' },
                                            'This should match the browser and operating system you are using right now.'
                                        )
                                    )
                                ),
                                e('div', { className: 'security-section-body' }, currentSessionPanel)
                            ),
                            e('section', { className: 'security-section' },
                                e('div', { className: 'security-section-header' },
                                    e('div', { className: 'security-section-copy' },
                                        e('h2', { className: 'security-section-title' }, 'Other signed-in devices'),
                                        e('p', { className: 'security-section-description' },
                                            'Anything listed here can still access your account until you sign it out.'
                                        )
                                    ),
                                    e('div', { className: 'security-section-actions' },
                                        e('span', { className: 'security-chip security-chip--neutral' }, `${otherSessions.length} device${otherSessions.length === 1 ? '' : 's'}`),
                                        e('button', {
                                            className: 'security-button security-button--secondary',
                                            onClick: handleSignOutOtherSessions,
                                            disabled: !otherSessions.length || isSigningOutOthers
                                        },
                                            e('span', { className: 'security-button-icon' }, renderSecurityIcon('logout', 'security-button-svg')),
                                            isSigningOutOthers ? 'Signing out others...' : 'Sign out other sessions'
                                        )
                                    )
                                ),
                                e('div', { className: 'security-section-body' }, otherSessionList)
                            ),
                            e('section', { className: 'security-section' },
                                e('div', { className: 'security-section-header' },
                                    e('div', { className: 'security-section-copy' },
                                        e('h2', { className: 'security-section-title' }, 'Recent sign-in activity'),
                                        e('p', { className: 'security-section-description' },
                                            'Use this list to spot unfamiliar browsers, operating systems, or IP addresses.'
                                        )
                                    ),
                                    e('div', { className: 'security-section-actions' },
                                        e('button', {
                                            className: 'security-button security-button--ghost',
                                            onClick: handleClearLoginAttempts,
                                            disabled: !attemptItems.length || isClearingHistory
                                        },
                                            e('span', { className: 'security-button-icon' }, renderSecurityIcon('trash', 'security-button-svg')),
                                            isClearingHistory ? 'Clearing...' : 'Clear history'
                                        )
                                    )
                                ),
                                e('div', { className: 'security-section-body' }, activityFeed)
                            )
                        )
                    )
                )
            ),
            renderModal(modal, closeModal, handleModalConfirm),
            renderToast(toast)
        )
    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Session;
}

window.Session = Session;
})();
