(function () {
    const { useState, useEffect } = React;

    window.CookieConsent = () => {
        const [visible, setVisible] = useState(true);

        const handleAcceptAll = () => {
            // Set cookie for "accepted all"
            setVisible(false);
        };

        const handleManageCookies = () => {
            // Open preferences modal
            console.log('Manage cookies clicked');
            // For now, just accept all
            handleAcceptAll();
        };

        if (!visible) return null;

        return React.createElement('div', {
                id: 'cookie-consent-root',
                style: {
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '666px',
                    maxWidth: '90%',
                    height: '135px',
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 30px',
                    zIndex: 10000,
                    fontFamily: '"SF Pro", "Noto Sans", Helvetica, sans-serif',
                    boxSizing: 'border-box'
                }
            },
            // Content group (left side)
            React.createElement('div', {
                    id: 'cookie-consent-content-group',
                    style: {
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        paddingRight: '30px'
                    }
                },
                React.createElement('div', {
                    id: 'cookie-consent-title',
                    style: {
                        fontFamily: '"Noto Sans-Bold", Helvetica',
                        fontWeight: 700,
                        fontSize: '20px',
                        color: '#333438',
                        marginBottom: '8px'
                    }
                }, 'We use cookies'),
                React.createElement('p', {
                    id: 'cookie-consent-description',
                    style: {
                        margin: 0,
                        fontFamily: '"SF Pro-Regular", Helvetica',
                        fontWeight: 400,
                        fontSize: '12px',
                        color: '#77777a',
                        lineHeight: '1.5'
                    }
                }, 'We use cookies and similar technologies from selected third parties for essential functions, analytics, and marketing.')
            ),
            // Divider
            React.createElement('div', {
                id: 'cookie-consent-divider',
                style: {
                    width: '1px',
                    height: '80%',
                    backgroundColor: '#E4E4E4',
                    margin: '0 20px'
                }
            }),
            // Button group (right side)
            React.createElement('div', {
                    id: 'cookie-consent-button-group',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        width: '175px'
                    }
                },
                // Accept All
                React.createElement('button', {
                    id: 'cookie-consent-accept-all-button',
                    onClick: handleAcceptAll,
                    style: {
                        width: '100%',
                        padding: '12px 0',
                        backgroundColor: '#1c1d21',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '5px',
                        fontFamily: '"SF Pro-Bold", Helvetica',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    },
                    onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#333333',
                    onMouseLeave: (e) => e.currentTarget.style.backgroundColor = '#1c1d21'
                }, 'Accept All'),
                // Manage cookies
                React.createElement('button', {
                    id: 'cookie-consent-manage-cookies-button',
                    onClick: handleManageCookies,
                    style: {
                        width: '100%',
                        padding: '12px 0',
                        backgroundColor: '#e4e4e4',
                        color: '#333438',
                        border: 'none',
                        borderRadius: '5px',
                        fontFamily: '"SF Pro-Bold", Helvetica',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    },
                    onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#d0d0d0',
                    onMouseLeave: (e) => e.currentTarget.style.backgroundColor = '#e4e4e4'
                }, 'Manage cookies')
            )
        );
    };

    console.log('[CookieConsent] Component loaded with IDs on all elements');
})();

// Render it somewhere in your main app (e.g., at the end of TempHome return)
//React.createElement(window.CookieConsent, null)