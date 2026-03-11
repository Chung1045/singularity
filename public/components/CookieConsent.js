(function () {
    const { useState, useEffect } = React;

    const CONSENT_KEY = 'singularity_cookie_consent';

    
    const DARK   = '#1c1d21';
    const WARM   = 'rgba(248, 244, 237, 1)';
    const BORDER = '#e4e4e4';
    const MUTED  = '#77777a';

    function CookieRow({ title, description, checked, disabled, onChange }) {
        return React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '16px 0',
                borderBottom: '1px solid #f0ebe1'
            }
        },
            React.createElement('div', { style: { flex: 1, paddingRight: '20px' } },
                React.createElement('div', {
                    style: {
                        fontWeight: 600,
                        fontSize: '14px',
                        color: DARK,
                        marginBottom: '4px',
                        fontFamily: '"Inter", -apple-system, sans-serif'
                    }
                }, title),
                React.createElement('p', {
                    style: {
                        margin: 0,
                        fontSize: '12px',
                        color: MUTED,
                        lineHeight: '1.55',
                        fontFamily: '"Inter", -apple-system, sans-serif'
                    }
                }, description)
            ),
            React.createElement('div', {
                onClick: disabled ? null : () => onChange && onChange(!checked),
                title: disabled ? 'Always enabled' : (checked ? 'Enabled – click to disable' : 'Disabled – click to enable'),
                style: {
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: checked ? DARK : '#d0d0d0',
                    position: 'relative',
                    color: checked ? '#ffffff' : '#000000',
                    cursor: disabled ? 'default' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0,
                    opacity: disabled ? 0.65 : 1,
                    marginTop: '2px'
                }
            }, React.createElement('div', {
                style: {
                    position: 'absolute',
                    top: '3px',
                    left: checked ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                }
            }))
        );
    }

    window.CookieConsent = function CookieConsent() {
        const [visible,       setVisible]       = useState(false);
        const [bannerSlideIn, setBannerSlideIn] = useState(false);
        const [showModal,     setShowModal]     = useState(false);
        const [prefs,         setPrefs]         = useState({ analytics: true, marketing: true });

        useEffect(() => {
            try {
                const saved = localStorage.getItem(CONSENT_KEY);
                if (!saved) {
                    setVisible(true);
                    setTimeout(() => setBannerSlideIn(true), 60);
                }
            } catch (_) {
                // localStorage unavailable – show banner anyway
                setVisible(true);
                setTimeout(() => setBannerSlideIn(true), 60);
            }
        }, []);

        const saveConsent = (preferences) => {
            try {
                localStorage.setItem(CONSENT_KEY, JSON.stringify({
                    accepted: true,
                    preferences,
                    timestamp: new Date().toISOString()
                }));
            } catch (_) { /* storage unavailable */ }
            setBannerSlideIn(false);
            setTimeout(() => { setVisible(false); setShowModal(false); }, 320);
        };

        const handleAcceptAll  = () => saveConsent({ analytics: true, marketing: true });
        const handleSavePrefs  = () => saveConsent(prefs);

        if (!visible) return null;

        // ── Manage Cookies Modal ──────────────────────────────────────────
        const modal = showModal
            ? React.createElement('div', {
                id: 'cookie-modal-overlay',
                onClick: (e) => { if (e.target.id === 'cookie-modal-overlay') setShowModal(false); },
                style: {
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.32)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 10001,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            },
                React.createElement('div', {
                    id: 'cookie-modal-card',
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        width: '520px',
                        maxWidth: '92vw',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)',
                        overflow: 'hidden',
                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                    }
                },
                    // Header
                    React.createElement('div', {
                        style: { padding: '24px 28px 20px', borderBottom: `1px solid ${BORDER}` }
                    },
                        React.createElement('div', {
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }
                        },
                            React.createElement('h2', {
                                style: {
                                    margin: 0,
                                    fontFamily: '"Playfair Display", Georgia, serif',
                                    fontWeight: 700,
                                    fontSize: '20px',
                                    color: DARK
                                }
                            }, 'Cookie Preferences'),
                            React.createElement('button', {
                                onClick: () => setShowModal(false),
                                'aria-label': 'Close',
                                style: {
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#999',
                                    fontSize: '18px',
                                    lineHeight: 1,
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }
                            }, '✕')
                        ),
                        React.createElement('p', {
                            style: { margin: 0, fontSize: '13px', color: MUTED, lineHeight: '1.55' }
                        }, 'Manage your cookie preferences below. Essential cookies cannot be disabled as they are required for the site to function correctly.')
                    ),
                    // Cookie category rows
                    React.createElement('div', { style: { padding: '4px 28px 8px' } },
                        React.createElement(CookieRow, {
                            title: 'Essential Cookies',
                            description: 'Required for core functionality — authentication, security, and session management.',
                            checked: true,
                            disabled: true,
                            onChange: null
                        }),
                        React.createElement(CookieRow, {
                            title: 'Analytics Cookies',
                            description: 'Help us understand how visitors use the site so we can improve the experience.',
                            checked: prefs.analytics,
                            disabled: false,
                            onChange: (v) => setPrefs(p => ({ ...p, analytics: v }))
                        }),
                        React.createElement(CookieRow, {
                            title: 'Marketing Cookies',
                            description: 'Used to deliver personalised content and advertising relevant to your interests.',
                            checked: prefs.marketing,
                            disabled: false,
                            onChange: (v) => setPrefs(p => ({ ...p, marketing: v }))
                        })
                    ),
                    // Footer
                    React.createElement('div', {
                        style: {
                            padding: '16px 28px 24px',
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end'
                        }
                    },
                        React.createElement('button', {
                            onClick: handleSavePrefs,
                            style: {
                                padding: '11px 22px',
                                backgroundColor: WARM,
                                color: DARK,
                                border: `1px solid ${BORDER}`,
                                borderRadius: '8px',
                                fontFamily: '"Inter", sans-serif',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            },
                            onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#ece5d8'; },
                            onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = WARM; }
                        }, 'Save Preferences'),
                        React.createElement('button', {
                            onClick: handleAcceptAll,
                            style: {
                                padding: '11px 22px',
                                backgroundColor: DARK,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontFamily: '"Inter", sans-serif',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            },
                            onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#333333'; },
                            onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = DARK; }
                        }, 'Accept All')
                    )
                )
            )
            : null;

        const handleDismiss = () => {
            setBannerSlideIn(false);
            setTimeout(() => setVisible(false), 320);
        };

        // ── Banner ────────────────────────────────────────────────────────
        const banner = React.createElement('div', {
            id: 'cookie-consent-root',
            style: {
                position: 'fixed',
                bottom: bannerSlideIn ? '20px' : '-180px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '680px',
                maxWidth: '92vw',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: `1px solid ${BORDER}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                padding: '20px 24px',
                zIndex: 10000,
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                boxSizing: 'border-box',
                transition: 'bottom 0.38s cubic-bezier(0.34, 1.4, 0.64, 1)'
            }
        },
            // Close button
            React.createElement('button', {
                onClick: handleDismiss,
                'aria-label': 'Dismiss',
                style: {
                    position: 'absolute',
                     top: '2px',
                    //top: '5px',
                     right: '2px',
                    //left: '5px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#aaaaaa',
                    fontSize: '14px',
                    lineHeight: 1,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s'
                },
                onMouseEnter: (e) => { e.currentTarget.style.color = '#555555'; },
                onMouseLeave: (e) => { e.currentTarget.style.color = '#aaaaaa'; }
            }, '✕'),
            // Left: icon + text
            React.createElement('div', {
                id: 'cookie-consent-content-group',
                style: {
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    paddingRight: '20px',
                    minWidth: 0
                }
            },
                // React.createElement('div', {
                //     style: { fontSize: '24px', lineHeight: 1, marginTop: '3px', flexShrink: 0 }
                // }, '🍪'),
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', {
                        id: 'cookie-consent-title',
                        style: {
                            fontFamily: '"Playfair Display", Georgia, serif',
                            fontWeight: 700,
                            fontSize: '17px',
                            color: DARK,
                            marginBottom: '5px'
                        }
                    }, 'We use cookies'),
                    React.createElement('p', {
                        id: 'cookie-consent-description',
                        style: {
                            margin: 0,
                            fontWeight: 400,
                            fontSize: '12px',
                            color: MUTED,
                            lineHeight: '1.6'
                        }
                    }, 'We use cookies for essential functions, analytics, and marketing. You can manage your preferences at any time.')
                )
            ),
            // Divider
            React.createElement('div', {
                id: 'cookie-consent-divider',
                style: {
                    width: '1px',
                    alignSelf: 'stretch',
                    backgroundColor: BORDER,
                    margin: '0 20px',
                    flexShrink: 0
                }
            }),
            // Right: buttons
            React.createElement('div', {
                id: 'cookie-consent-button-group',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                    width: '168px',
                    flexShrink: 0
                }
            },
                React.createElement('button', {
                    id: 'cookie-consent-accept-all-button',
                    onClick: handleAcceptAll,
                    style: {
                        width: '100%',
                        padding: '11px 0',
                        backgroundColor: DARK,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        letterSpacing: '0.01em'
                    },
                    onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#333333'; },
                    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = DARK; }
                }, 'Accept All'),
                React.createElement('button', {
                    id: 'cookie-consent-manage-cookies-button',
                    onClick: () => setShowModal(true),
                    style: {
                        width: '100%',
                        padding: '11px 0',
                        backgroundColor: WARM,
                        color: '#333438',
                        border: `1px solid ${BORDER}`,
                        borderRadius: '8px',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        letterSpacing: '0.01em'
                    },
                    onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#ece5d8'; },
                    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = WARM; }
                }, 'Manage cookies')
            )
        );

        return React.createElement(React.Fragment, null, modal, banner);
    };

    console.log('[CookieConsent] Component loaded');
})();
