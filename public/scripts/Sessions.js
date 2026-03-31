(function() {
const { useEffect, useMemo, useState, useRef, useCallback } = React;
const reactCreateElm = React.createElement;

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

function readStoredBoolean(key, fallbackValue) {
    try {
        const saved = localStorage.getItem(key);
        return saved !== null ? JSON.parse(saved) : fallbackValue;
    } catch (error) {
        console.error('Failed to parse localStorage value for', key, error);
        return fallbackValue;
    }
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
            return reactCreateElm('img', {
                src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                alt: 'Back',
                className,
                'aria-hidden': 'true',
                style: { width: '20px', height: '20px', objectFit: 'contain' }
            });
        case 'logout':
            return reactCreateElm('svg', props,
                reactCreateElm('path', { d: 'M14 8l4 4-4 4' }),
                reactCreateElm('path', { d: 'M18 12H9' }),
                reactCreateElm('path', { d: 'M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10' })
            );
        case 'trash':
            return reactCreateElm('svg', props,
                reactCreateElm('path', { d: 'M4 7h16' }),
                reactCreateElm('path', { d: 'M10 11v5' }),
                reactCreateElm('path', { d: 'M14 11v5' }),
                reactCreateElm('path', { d: 'M6 7l1 12h10l1-12' }),
                reactCreateElm('path', { d: 'M9 7V4h6v3' })
            );
        case 'phone':
            return reactCreateElm('svg', props,
                reactCreateElm('rect', { x: '8', y: '3', width: '8', height: '18', rx: '2.2' }),
                reactCreateElm('path', { d: 'M11 17.5h2' })
            );
        case 'laptop':
            return reactCreateElm('svg', props,
                reactCreateElm('rect', { x: '4.5', y: '5', width: '15', height: '10.5', rx: '1.8' }),
                reactCreateElm('path', { d: 'M3 18.5h18' })
            );
        case 'globe':
            return reactCreateElm('svg', props,
                reactCreateElm('circle', { cx: '12', cy: '12', r: '8' }),
                reactCreateElm('path', { d: 'M4 12h16' }),
                reactCreateElm('path', { d: 'M12 4c2.4 2.3 3.5 5.1 3.5 8s-1.1 5.7-3.5 8' }),
                reactCreateElm('path', { d: 'M12 4c-2.4 2.3-3.5 5.1-3.5 8s1.1 5.7 3.5 8' })
            );
        case 'clock':
            return reactCreateElm('svg', props,
                reactCreateElm('circle', { cx: '12', cy: '12', r: '8' }),
                reactCreateElm('path', { d: 'M12 8v4l3 2' })
            );
        case 'shield':
        default:
            return reactCreateElm('svg', props,
                reactCreateElm('path', { d: 'M12 3l7 3v5c0 5-3.4 8.1-7 10-3.6-1.9-7-5-7-10V6l7-3z' })
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

function renderModal(modal, closeModal, handleConfirm) {
    if (!modal.isOpen) return null;

    return reactCreateElm('div', {
        className: 'security-modal-backdrop',
        onClick: (event) => {
            if (event.target === event.currentTarget) {
                closeModal();
            }
        }
    },
        reactCreateElm('div', {
            className: 'security-modal',
            onClick: (event) => event.stopPropagation()
        },
            reactCreateElm('h2', { className: 'security-modal-title' }, modal.title),
            reactCreateElm('p', { className: 'security-modal-copy' }, modal.message),
            reactCreateElm('div', { className: 'security-modal-actions' },
                modal.type === 'confirm'
                    ? reactCreateElm('button', {
                        className: 'security-button security-button--secondary',
                        onClick: closeModal
                    }, 'Cancel')
                    : null,
                reactCreateElm('button', {
                    className: 'security-button security-button--primary',
                    style: modal.type === 'confirm' ? undefined : { minWidth: '70px' },
                    onClick: modal.type === 'confirm' ? handleConfirm : closeModal
                }, modal.type === 'confirm' ? 'Confirm' : 'OK')
            )
        )
    );
}

const Session = ({ csrfToken, sessions, loginAttempts, currentSessionID, userInfo }) => {
    window.csrfToken = csrfToken;

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
        readStoredBoolean('sidebarCollapsed', window.innerWidth <= 1040)
    );
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const isOverlay = windowWidth <= 1040;

    useEffect(() => {
        let rafId = 0;
        const handleResize = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => setWindowWidth(window.innerWidth));
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(rafId);
        };
    }, []);

    useEffect(() => {
        if (isOverlay) {
            setSidebarCollapsed(true);
        } else {
            setSidebarCollapsed(readStoredBoolean('sidebarCollapsed', false));
        }
    }, [isOverlay]);
    const [sessionItems, setSessionItems] = useState(() => Array.isArray(sessions) ? sessions : []);
    const [attemptItems, setAttemptItems] = useState(() => Array.isArray(loginAttempts) ? loginAttempts : []);
    const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
    const [pendingSessionID, setPendingSessionID] = useState(null);
    const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
    const [isClearingHistory, setIsClearingHistory] = useState(false);
    const slideUpTimerRef = useRef(null);

    const showSlideUpMessage = useCallback((text, autoHideMs = 5000) => {
        const messageEl = document.getElementById('message');
        const messageTextEl = document.getElementById('messageText');
        if (!messageEl || !messageTextEl || !text) return;
        if (slideUpTimerRef.current) {
            window.clearTimeout(slideUpTimerRef.current);
            slideUpTimerRef.current = null;
        }
        messageTextEl.textContent = text;
        messageEl.classList.add('hidden');
        void messageEl.offsetHeight;
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                messageEl.classList.remove('hidden');
            });
        });
        if (autoHideMs > 0) {
            slideUpTimerRef.current = window.setTimeout(() => {
                messageEl.classList.add('hidden');
                slideUpTimerRef.current = null;
            }, autoHideMs);
        }
    }, []);

    useEffect(() => () => {
        if (slideUpTimerRef.current) {
            window.clearTimeout(slideUpTimerRef.current);
        }
    }, []);

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

    const showToast = (type, title, message = '', autoHideMs) => {
        const text = message ? `${title} ${message}` : title;
        const ms = autoHideMs !== undefined ? autoHideMs : (type === 'danger' ? 6000 : 5000);
        showSlideUpMessage(text, ms);
    };

    const showAlert = (title, message, onConfirm = null) => {
        if (onConfirm) {
            setModal({ isOpen: true, type: 'alert', title, message, onConfirm });
        } else {
            showToast('danger', title, message);
        }
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

            if (typeof window.showLogoutSuccessSlideUpAndRedirect === 'function') {
                window.showLogoutSuccessSlideUpAndRedirect();
            } else {
                showToast('success', 'Signed out', 'Redirecting to the home page.', 0);
                window.setTimeout(() => {
                    window.location = '/?loggedout=1';
                }, 3000);
            }
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
                    showToast('success', 'Your recent sign-in activity has been removed from this page.');
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
            // `Sign out ${session.sessionBrowser || 'this browser'} on ${session.sessionOS || 'this device'}?`,
            `Do you want to sign out from this device?`,

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
        ? reactCreateElm('div', { className: 'security-row-list' },
            reactCreateElm('div', { className: 'security-row' },
                reactCreateElm('div', { className: 'security-row-main' },
                    reactCreateElm('div', {
                        className: 'security-row-icon security-row-icon--current'
                    }, renderSecurityIcon('shield', 'security-row-icon-svg')),
                    reactCreateElm('div', { className: 'security-row-content' },
                        reactCreateElm('div', { className: 'security-row-title-line' },
                            reactCreateElm('h3', { className: 'security-row-title' }, activeSession.sessionBrowser || 'Unknown browser'),
                            reactCreateElm('span', { className: 'security-chip security-chip--neutral' }, 'Current session'),
                            isRecent(activeSession.lastSeenTime)
                                ? reactCreateElm('span', { className: 'security-chip security-chip--success' }, 'Active now')
                                : null
                        ),
                        reactCreateElm('p', { className: 'security-row-description' }, activeSession.sessionOS || 'Unknown operating system'),
                        reactCreateElm('div', { className: 'security-row-meta' },
                            reactCreateElm('span', { className: 'security-row-meta-item' }, `IP ${normalizeIP(activeSession.sessionIP)}`),
                            reactCreateElm('span', { className: 'security-row-meta-item' },
                                `Last active ${formatRelativeDate(activeSession.lastSeenTime)}`
                            )
                        )
                    )
                )
            )
        )
        : reactCreateElm('div', { className: 'security-empty' },
            reactCreateElm('h3', { className: 'security-empty-title' }, 'No active session found'),
            reactCreateElm('p', { className: 'security-empty-copy' },
                'We could not match the current browser session. Refresh the page or sign in again if this looks wrong.'
            )
        );

    const otherSessionList = otherSessions.length > 0
        ? reactCreateElm('div', { className: 'security-row-list' },
            otherSessions.map((session) => {
                const theme = getDeviceTheme(session.sessionOS, session.sessionBrowser);

                return reactCreateElm('div', {
                    key: session.sessionID,
                    className: 'security-row'
                },
                    reactCreateElm('div', { className: 'security-row-main' },
                        reactCreateElm('div', {
                            className: `security-row-icon ${theme.iconClass}`
                        }, renderSecurityIcon(theme.iconName, 'security-row-icon-svg')),
                        reactCreateElm('div', { className: 'security-row-content' },
                            reactCreateElm('div', { className: 'security-row-title-line' },
                                reactCreateElm('h3', { className: 'security-row-title' }, session.sessionBrowser || 'Unknown browser')
                            ),
                            reactCreateElm('p', { className: 'security-row-description' }, session.sessionOS || 'Unknown operating system'),
                            reactCreateElm('div', { className: 'security-row-meta' },
                                reactCreateElm('span', { className: 'security-row-meta-item' }, `IP ${normalizeIP(session.sessionIP)}`),
                                reactCreateElm('span', { className: 'security-row-meta-item' },
                                    `Last active ${formatRelativeDate(session.lastSeenTime)}`
                                )
                            )
                        )
                    ),
                    reactCreateElm('div', { className: 'security-row-actions' },
                        reactCreateElm('button', {
                            className: 'security-button security-button--danger',
                            onClick: () => handleSessionLogout(session),
                            disabled: pendingSessionID === session.sessionID
                        },
                            reactCreateElm('span', { className: 'security-button-icon' }, renderSecurityIcon('logout', 'security-button-svg')),
                            pendingSessionID === session.sessionID ? 'Signing out...' : 'Sign out'
                        )
                    )
                );
            })
        )
        : reactCreateElm('div', { className: 'security-empty' },
            reactCreateElm('h3', { className: 'security-empty-title' }, 'Only this device is signed in'),
            reactCreateElm('p', { className: 'security-empty-copy' },
                'That is a good sign. If another device appears here later and you do not recognize it, sign it out immediately.'
            )
        );

    const activityFeed = sortedAttempts.length > 0
        ? reactCreateElm('div', { className: 'security-row-list' },
            sortedAttempts.map((attempt) => {
                const recent = isRecent(attempt.attemptDate, 12);
                const theme = getDeviceTheme(attempt.attemptOS, attempt.attemptBrowser);

                return reactCreateElm('div', {
                    key: attempt.attemptID,
                    className: 'security-row'
                },
                    reactCreateElm('div', { className: 'security-row-main' },
                        reactCreateElm('div', {
                            className: `security-row-icon ${theme.iconClass}`
                        }, renderSecurityIcon(recent ? 'clock' : theme.iconName, 'security-row-icon-svg')),
                        reactCreateElm('div', { className: 'security-row-content' },
                            reactCreateElm('div', { className: 'security-row-title-line' },
                                reactCreateElm('h3', { className: 'security-row-title' }, attempt.attemptBrowser || 'Unknown browser'),
                                recent
                                    ? reactCreateElm('span', { className: 'security-chip security-chip--neutral' }, 'Recent')
                                    : null
                            ),
                            reactCreateElm('p', { className: 'security-row-description' }, attempt.attemptOS || 'Unknown operating system'),
                            reactCreateElm('div', { className: 'security-row-meta' },
                                reactCreateElm('span', { className: 'security-row-meta-item' }, `IP ${normalizeIP(attempt.attemptIP)}`),
                                reactCreateElm('span', { className: 'security-row-meta-item' }, formatDateTime(attempt.attemptDate))
                            )
                        )
                    )
                );
            })
        )
        : reactCreateElm('div', { className: 'security-empty' },
            reactCreateElm('h3', { className: 'security-empty-title' }, 'No recent activity'),
            reactCreateElm('p', { className: 'security-empty-copy' },
                'Recent sign-in attempts will show up here so you can spot devices and times that do not look familiar.'
            )
        );

    return reactCreateElm('div', {
        className: 'sidebar-expand profile-shell' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false)
    },
        reactCreateElm('div', { className: 'group profile-layout' },
            isOverlay && !sidebarCollapsed && reactCreateElm('div', {
                className: 'profile-sidebar-backdrop',
                onClick: () => setSidebarCollapsed(true)
            }),
            reactCreateElm(window.Sidebar, {
                sidebarCollapsed,
                setSidebarCollapsed,
                isOverlay,
                username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen,
                setUserMenuOpen,
                userInfo
            }),
            reactCreateElm('main', { className: 'right-container profile-right-container' },
                reactCreateElm('section', { className: 'main-screen profile-main-screen security-shell' },
                    reactCreateElm('input', {
                        type: 'hidden',
                        name: '_csrf',
                        id: 'hidden-csrf',
                        value: csrfToken
                    }),
                    reactCreateElm('div', { className: 'security-page' },
                        reactCreateElm('header', { className: 'security-header' },
                            reactCreateElm('button', {
                                className: 'security-button security-button--secondary',
                                onClick: handleProfileRoute
                            },
                                reactCreateElm('span', { className: 'security-button-icon' }, renderSecurityIcon('arrowLeft', 'security-button-svg')),
                                'Back to profile'
                            ),
                            reactCreateElm('div', { className: 'security-header-main' },
                                reactCreateElm('div', { className: 'security-header-copy' },
                                    // reactCreateElm('p', { className: 'security-header-kicker' }, 'Security settings'),
                                    reactCreateElm('div', { className: 'security-header-title-row' },
                                        reactCreateElm('h1', { className: 'security-header-title' }, 'Sessions')
                                    ),
                                    // reactCreateElm('p', { className: 'security-header-description' },
                                    //     'Review the browsers that are signed into your account and keep the list limited to devices you recognize.'
                                    // )
                                )
                            )
                        ),
                        reactCreateElm('section', { className: 'security-summary' },
                            summaryItems.map((item) => reactCreateElm('div', {
                                key: item.label,
                                className: 'security-summary-item'
                            },
                                reactCreateElm('div', { className: 'security-summary-label' }, item.label),
                                reactCreateElm('div', { className: 'security-summary-value' }, item.value),
                                reactCreateElm  ('div', { className: 'security-summary-note' }, item.note)
                            ))
                        ),
                        reactCreateElm('div', { className: 'security-stack' },
                            reactCreateElm('section', { className: 'security-section' },
                                reactCreateElm('div', { className: 'security-section-header' },
                                    reactCreateElm('div', { className: 'security-section-copy' },
                                        reactCreateElm('h2', { className: 'security-section-title' }, 'Current device'),
                                        reactCreateElm('p', { className: 'security-section-description' },
                                            'This should match the browser and operating system you are using right now.'
                                        )
                                    )
                                ),
                                reactCreateElm('div', { className: 'security-section-body' }, currentSessionPanel)
                            ),
                            reactCreateElm('section', { className: 'security-section' },
                                reactCreateElm('div', { className: 'security-section-header' },
                                    reactCreateElm('div', { className: 'security-section-copy' },
                                        reactCreateElm('h2', { className: 'security-section-title' }, 'Other signed-in devices'),
                                        reactCreateElm('p', { className: 'security-section-description' },
                                            'Anything listed here can still access your account until you sign it out.'
                                        )
                                    ),
                                    reactCreateElm('div', { className: 'security-section-actions' },
                                        reactCreateElm('button', {
                                            className: 'security-button security-button--secondary',
                                            onClick: handleSignOutOtherSessions,
                                            disabled: !otherSessions.length || isSigningOutOthers
                                        },
                                            reactCreateElm('span', { className: 'security-button-icon' }, renderSecurityIcon('logout', 'security-button-svg')),
                                            isSigningOutOthers ? 'Signing out others...' : 'Sign out other sessions'
                                        )
                                    )
                                ),
                                reactCreateElm('div', { className: 'security-section-body' }, otherSessionList)
                            ),
                            reactCreateElm('section', { className: 'security-section' },
                                reactCreateElm('div', { className: 'security-section-header' },
                                    reactCreateElm  ('div', { className: 'security-section-copy' },
                                        reactCreateElm('h2', { className: 'security-section-title' }, 'Recent sign-in activity'),
                                        reactCreateElm('p', { className: 'security-section-description' },
                                            'Use this list to spot unfamiliar browsers, operating systems, or IP addresses.'
                                        )
                                    ),
                                    reactCreateElm('div', { className: 'security-section-actions' },
                                        reactCreateElm('button', {
                                            className: 'security-button security-button--ghost',
                                            onClick: handleClearLoginAttempts,
                                            disabled: !attemptItems.length || isClearingHistory
                                        },
                                            reactCreateElm('span', { className: 'security-button-icon' }, renderSecurityIcon('trash', 'security-button-svg')),
                                            isClearingHistory ? 'Clearing...' : 'Clear history'
                                        )
                                    )
                                ),
                                reactCreateElm('div', { className: 'security-section-body' }, activityFeed)
                            )
                        )
                    )
                )
            ),
            renderModal(modal, closeModal, handleModalConfirm)
        )
    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Session;
}

window.Session = Session;
})();
