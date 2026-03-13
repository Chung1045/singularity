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
    if (!value) return 'Never';

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
        case 'plus':
            return e('svg', props,
                e('path', { d: 'M12 5v14' }),
                e('path', { d: 'M5 12h14' })
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
        case 'tag':
            return e('svg', props,
                e('path', { d: 'M4.5 7.5A2.5 2.5 0 0 1 7 5h5l7 7-7 7-7-7z' }),
                e('circle', { cx: '9', cy: '9', r: '1' })
            );
        case 'trash':
            return e('svg', props,
                e('path', { d: 'M4 7h16' }),
                e('path', { d: 'M10 11v5' }),
                e('path', { d: 'M14 11v5' }),
                e('path', { d: 'M6 7l1 12h10l1-12' }),
                e('path', { d: 'M9 7V4h6v3' })
            );
        case 'shield':
            return e('svg', props,
                e('path', { d: 'M12 3l7 3v5c0 5-3.4 8.1-7 10-3.6-1.9-7-5-7-10V6l7-3z' })
            );
        case 'key':
        default:
            return e('svg', props,
                e('circle', { cx: '8', cy: '12', r: '3.2' }),
                e('path', { d: 'M11.2 12H20' }),
                e('path', { d: 'M17 12v3' }),
                e('path', { d: 'M14.5 12v2' })
            );
    }
}

function getGuidanceIcon(note) {
    const value = String(note || '').toLowerCase();

    if (value.includes('backup') || value.includes('second passkey') || value.includes('another device')) {
        return 'key';
    }

    if (value.includes('name') || value.includes('recognize')) {
        return 'tag';
    }

    if (value.includes('remove') || value.includes('sold') || value.includes('reset')) {
        return 'trash';
    }

    return 'shield';
}

function getPasskeyTheme(label) {
    const value = String(label || '').toLowerCase();

    if (value.includes('icloud') || value.includes('apple') || value.includes('mac') || value.includes('iphone') || value.includes('ipad')) {
        return { iconClass: 'security-row-icon--apple', provider: 'Apple ecosystem', iconName: 'phone' };
    }

    if (value.includes('windows')) {
        return { iconClass: 'security-row-icon--windows', provider: 'Windows Hello', iconName: 'laptop' };
    }

    if (value.includes('google') || value.includes('android') || value.includes('chrome')) {
        return { iconClass: 'security-row-icon--google', provider: 'Google Password Manager', iconName: 'key' };
    }

    if (value.includes('samsung')) {
        return { iconClass: 'security-row-icon--samsung', provider: 'Samsung Pass', iconName: 'phone' };
    }

    return { iconClass: 'security-row-icon--generic', provider: 'Saved passkey', iconName: 'key' };
}

function getSetupStatus(total) {
    if (total === 0) {
        return {
            label: 'Not set up',
            note: 'Create your first passkey to start using passwordless sign-in.',
            chipClass: 'security-chip security-chip--warning'
        };
    }

    if (total === 1) {
        return {
            label: 'Needs backup',
            note: 'Add one more passkey on a different device for account recovery.',
            chipClass: 'security-chip security-chip--warning'
        };
    }

    return {
        label: 'Backup ready',
        note: 'You already have more than one passkey available.',
        chipClass: 'security-chip security-chip--success'
    };
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

const Passkey = ({ csrfToken, passkeys, userInfo }) => {
    window.csrfToken = csrfToken;

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [items, setItems] = useState(() => Array.isArray(passkeys) ? passkeys : []);
    const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
    const [toast, setToast] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [deletingPasskeyID, setDeletingPasskeyID] = useState(null);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const username = userInfo?.userName || userInfo?.email || 'User';

    const sortedItems = useMemo(() => {
        return [...items].sort((left, right) => {
            const leftDate = new Date(left.lastUsed || left.dateCreate || 0).getTime();
            const rightDate = new Date(right.lastUsed || right.dateCreate || 0).getTime();
            return rightDate - leftDate;
        });
    }, [items]);

    const lastUsedPasskey = useMemo(
        () => sortedItems.find((item) => item.lastUsed),
        [sortedItems]
    );

    const setupStatus = getSetupStatus(items.length);

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

    const registerPasskey = async () => {
        if (isRegistering) return;

        setIsRegistering(true);

        if (!csrfToken) {
            setIsRegistering(false);
            showAlert('Security token missing', 'Please refresh the page and try again.');
            return;
        }

        const webAuthn = window.SimpleWebAuthnBrowser || {};
        if (typeof webAuthn.browserSupportsWebAuthn !== 'function' || !webAuthn.browserSupportsWebAuthn()) {
            setIsRegistering(false);
            showAlert('Passkeys are not supported', 'This browser or device does not support passkeys.');
            return;
        }

        try {
            const optionsResponse = await fetch('/api/passkey/gen-option', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({})
            });

            if (!optionsResponse.ok) {
                throw new Error('Failed to prepare passkey registration.');
            }

            const options = await optionsResponse.json();
            const attResp = await webAuthn.startRegistration(options);

            const verificationResponse = await fetch('/api/passkey/verify-register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ attResp })
            });

            if (!verificationResponse.ok) {
                const errorData = await verificationResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Passkey registration failed.');
            }

            showToast('success', 'Passkey added', 'Refreshing your passkey list...');
            window.setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            let message = error?.message || 'Passkey registration failed. Please try again.';

            if (error?.name === 'AbortError') {
                message = 'Passkey setup was cancelled before it finished.';
            } else if (error?.name === 'InvalidStateError') {
                message = 'This passkey already appears to be registered to your account.';
            }

            showAlert('Unable to add passkey', message);
        } finally {
            setIsRegistering(false);
        }
    };

    const requestRemovePasskey = (passkey) => {
        showConfirm(
            'Remove passkey',
            `Remove ${passkey.keyName || 'this passkey'} from your account? You can add another passkey later.`,
            async () => {
                setDeletingPasskeyID(passkey.keyID);

                try {
                    const response = await fetch('/api/passkey/delete', {
                        method: 'POST',
                        headers: {
                            'CSRF-Token': csrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ passkeyID: passkey.keyID })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to remove the passkey.');
                    }

                    setItems((previous) => previous.filter((item) => item.keyID !== passkey.keyID));
                    showToast('success', 'Passkey removed', `${passkey.keyName || 'The passkey'} can no longer sign in.`);
                } catch (error) {
                    showAlert('Unable to remove passkey', error?.message || 'Failed to remove the passkey. Please try again.');
                } finally {
                    setDeletingPasskeyID(null);
                }
            }
        );
    };

    function handleProfileRoute() {
        window.location.href = '/profile';
    }

    const summaryItems = [
        {
            label: 'Saved passkeys',
            value: String(items.length),
            note: items.length === 1 ? '1 passkey is ready for sign-in.' : `${items.length} passkeys are available for sign-in.`
        },
        {
            label: 'Last used',
            value: lastUsedPasskey ? formatRelativeDate(lastUsedPasskey.lastUsed) : 'Never',
            note: lastUsedPasskey
                ? `${lastUsedPasskey.keyName || 'Unnamed passkey'} was used on ${formatDateTime(lastUsedPasskey.lastUsed)}.`
                : 'No passkey has been used yet.'
        },
        {
            label: 'Recommended',
            value: setupStatus.label,
            note: setupStatus.note
        }
    ];

    const guidanceItems = items.length > 1
        ? [
            'Keep at least one backup passkey on another device or in a password manager you trust.',
            'Remove passkeys for devices you sold, reset, or no longer control.'
        ]
        : [
            'Add a second passkey on another device so you still have access if this one is unavailable.',
            'Use names that help you recognize where the passkey lives, such as your phone or laptop.'
        ];

    const passkeyList = sortedItems.length > 0
        ? e('div', { className: 'security-row-list' },
            sortedItems.map((passkey) => {
                const theme = getPasskeyTheme(passkey.keyName);

                return e('div', {
                    key: passkey.keyID,
                    className: 'security-row'
                },
                    e('div', { className: 'security-row-main' },
                        e('div', {
                            className: `security-row-icon ${theme.iconClass}`
                        }, renderSecurityIcon(theme.iconName, 'security-row-icon-svg')),
                        e('div', { className: 'security-row-content' },
                            e('div', { className: 'security-row-title-line' },
                                e('h3', { className: 'security-row-title' }, passkey.keyName || 'Unnamed passkey'),
                                !passkey.lastUsed
                                    ? e('span', { className: 'security-chip security-chip--warning' }, 'Unused')
                                    : null
                            ),
                            e('p', { className: 'security-row-description' }, theme.provider),
                            e('div', { className: 'security-row-meta' },
                                e('span', { className: 'security-row-meta-item' }, `Created ${formatDateTime(passkey.dateCreate)}`),
                                e('span', { className: 'security-row-meta-item' },
                                    passkey.lastUsed
                                        ? `Last used ${formatRelativeDate(passkey.lastUsed)}`
                                        : 'Never used'
                                )
                            )
                        )
                    ),
                    e('div', { className: 'security-row-actions' },
                        e('button', {
                            className: 'security-button security-button--danger',
                            onClick: () => requestRemovePasskey(passkey),
                            disabled: deletingPasskeyID === passkey.keyID
                        }, deletingPasskeyID === passkey.keyID ? 'Removing...' : 'Remove')
                    )
                );
            })
        )
        : e('div', { className: 'security-empty' },
            e('h3', { className: 'security-empty-title' }, 'No passkeys yet'),
            e('p', { className: 'security-empty-copy' },
                'Add your first passkey to sign in with Face ID, Touch ID, Windows Hello, or your device PIN instead of typing a password.'
            ),
            e('div', { className: 'security-inline-row' },
                e('button', {
                    className: 'security-button security-button--primary',
                    onClick: registerPasskey,
                    disabled: isRegistering
                }, isRegistering ? 'Creating passkey...' : 'Create passkey')
            )
        );

    return e('div', {
        id: 'DIV_SIDEBAR_EXPANDER',
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
                                    e('h1', { className: 'security-header-title' }, 'Passkeys'),
                                    e('span', { className: setupStatus.chipClass }, setupStatus.label)
                                ),
                                e('p', { className: 'security-header-description' },
                                    'Manage the devices and password managers that can sign you in with a passkey.'
                                )
                            ),
                            e('div', { className: 'security-header-actions' },
                                e('button', {
                                    className: 'security-button security-button--secondary',
                                    onClick: handleProfileRoute
                                },
                                    e('span', { className: 'security-button-icon' }, renderSecurityIcon('arrowLeft', 'security-button-svg')),
                                    'Back to profile'
                                ),
                                e('button', {
                                    className: 'security-button security-button--primary',
                                    onClick: registerPasskey,
                                    disabled: isRegistering
                                },
                                    e('span', { className: 'security-button-icon' }, renderSecurityIcon('plus', 'security-button-svg')),
                                    isRegistering ? 'Creating passkey...' : 'Create passkey'
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
                                        e('h2', { className: 'security-section-title' }, 'Your passkeys'),
                                        e('p', { className: 'security-section-description' },
                                            'Only keep passkeys for devices and apps you still trust and actively use.'
                                        )
                                    ),
                                    e('div', { className: 'security-section-actions' },
                                        e('span', { className: 'security-chip security-chip--neutral' }, `${items.length} saved`)
                                    )
                                ),
                                e('div', { className: 'security-section-body' }, passkeyList)
                            ),
                            e('section', { className: 'security-section' },
                                e('div', { className: 'security-section-header' },
                                    e('div', { className: 'security-section-copy' },
                                        e('h2', { className: 'security-section-title' }, 'Before you leave'),
                                        e('p', { className: 'security-section-description' },
                                            'A couple of small habits make passkeys much easier to live with over time.'
                                        )
                                    )
                                ),
                                e('div', { className: 'security-section-body' },
                                    e('div', { className: 'security-callout' },
                                        e('div', { className: 'security-callout-list' },
                                            guidanceItems.map((item, index) => e('div', {
                                                key: `guidance-${index}`,
                                                className: 'security-callout-item'
                                            },
                                                e('div', { className: 'security-callout-item-icon' },
                                                    renderSecurityIcon(getGuidanceIcon(item), 'security-callout-icon-svg')
                                                ),
                                                e('p', { className: 'security-callout-item-copy' }, item)
                                            ))
                                        )
                                    )
                                )
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
    module.exports = Passkey;
}

window.Passkey = Passkey;
})();
