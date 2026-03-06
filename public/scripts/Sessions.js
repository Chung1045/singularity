(function() {
const { useState } = React;

const Session = ({ csrfToken, sessions, loginAttempts, userInfo }) => {
    window.csrfToken = csrfToken;
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    const [currentLocation, setCurrentLocation] = useState('Detecting location...');

    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null });

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Geolocation detection for current session
    React.useEffect(() => {
        // Try to get user's location using browser geolocation API
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        // Use reverse geocoding API (free service)
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        const location = data.address?.city || data.address?.town || data.address?.state || data.address?.country || 'Unknown Location';
                        setCurrentLocation(location);
                    } catch (error) {
                        console.error('Error fetching location:', error);
                        setCurrentLocation('Unknown Location');
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setCurrentLocation('Location unavailable');
                }
            );
        } else {
            setCurrentLocation('Geolocation not supported');
        }
    }, []);

    // Responsive breakpoints
    const isMobile = windowWidth <= 480;
    const isTablet = windowWidth > 480 && windowWidth <= 768;
    const isSmallLaptop = windowWidth > 768 && windowWidth <= 1024;
    const isLargeLaptop = windowWidth > 1024 && windowWidth <= 1440;
    const isDesktop = windowWidth > 1440;

    console.log("Rendering TempSession with sessions:", sessions); // Debug

    const logout = async () => {
        if (!csrfToken) {
            console.error('CSRF token not available');
            // Old: alert('Security token missing. Please refresh the page.');
            showAlert('Error', 'Security token missing. Please refresh the page.');
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

            if (response.ok) {
                const data = await response.json();
                // Old: alert("Logout response: " + JSON.stringify(data));
                showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.');
                setTimeout(() => {
                    window.location = "/?loggedout=1";
                }, 3000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || "An error occurred. Please try again.";
                // Old: alert(errorMessage);
                showAlert('Error', errorMessage);
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Old: alert("An error occurred during logout. Please try again.");
            showAlert('Error', "An error occurred during logout. Please try again.");
        }
    };

    function handleProfileRoute() {
        window.location.href = "/profile";
    }

    const toggleUserMenu = (e) => {
        e.stopPropagation();
        setUserMenuOpen(!userMenuOpen);
    };

    const username = userInfo?.userName || userInfo?.email || 'User';

    const showModal = (title, message, onConfirm, onCancel = null) => {
        setModal({ isOpen: true, title, message, type: 'confirm', onConfirm, onCancel });
    };

    const showAlert = (title, message) => {
        setModal({ isOpen: true, title, message, type: 'alert', onConfirm: null, onCancel: null });
    };

    const closeModal = () => {
        setModal({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null });
    };

    const handleModalConfirm = async () => {
        closeModal();
        if (modal.onConfirm) {
            await modal.onConfirm();
        }
    };

    const handleModalCancel = () => {
        closeModal();
        if (modal.onCancel) {
            modal.onCancel();
        }
    };

    const handleClearLoginAttempts = async () => {
        // Old: if (confirm("Are you sure you want to clear all the login attempt history?")) { ... }
        showModal(
            'Clear Login Attempts',
            'Are you sure you want to clear all the login attempt history?',
            async () => {
                const resp = await fetch("/api/loginAttempts/deleteAll", {
                    method: 'POST',
                    headers: {
                        'CSRF-Token': csrfToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                if (resp.ok) {
                    // Old: alert("Login Attempt History deleted");
                    showAlert('Success', "Login Attempt History deleted");
                    setTimeout(() => location.reload(), 1500);
                } else {
                    // Old: alert("Failed to delete login attempt history");
                    showAlert('Error', "Failed to delete login attempt history");
                }
            }
        );
    }

    const handleSessionLogout = async (sessionID) => {
        // Old: if (confirm("Are you sure you want logout this session?")) { ... }
        showModal(
            'Logout Session',
            'Are you sure you want to logout this session?',
            async () => {
                const resp = await fetch("/api/session/logout", {
                    method: 'POST',
                    headers: {
                        'CSRF-Token': csrfToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({sessionID: sessionID})
                });

                if (resp.ok) {
                    // Old: alert("Session have been removed and logged out");
                    showAlert('Success', "Session has been removed and logged out");
                    setTimeout(() => location.reload(), 1500);
                } else {
                    // Old: alert("Failed to logout the session");
                    showAlert('Error', "Failed to logout the session");
                }
            }
        );
    }

    const sessionElements = sessions.map((session, index) => {
        const keyID = session.sessionID;
        const isCurrent = index === 0;

        return React.createElement(
            "div",
            {
                key: keyID,
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '10px 20px',
                    position: 'relative',
                    width: '100%',
                    borderRadius: '10px',
                    backgroundColor: '#fafafa',
                    transition: 'background-color 0.2s ease'
                }
            },
            React.createElement("div", {
                style: {
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#d9d9d9',
                    borderRadius: '10px',
                    flexShrink: 0
                }
            }),
            React.createElement(
                "div",
                { style: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 } },
                React.createElement(
                    "div",
                    { style: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' } },
                    React.createElement("div", {
                        style: {
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: 400,
                            fontSize: '20px',
                            color: '#000000'
                        }
                    }, session.sessionOS),
                    React.createElement(
                        "div",
                        { style: { display: 'flex', gap: '10px', width: '100%' } },
                        // OLD: React.createElement("div", {
                        // OLD:     style: {
                        // OLD:         fontFamily: 'Inter, Helvetica',
                        // OLD:         fontWeight: 400,
                        // OLD:         fontSize: '14px',
                        // OLD:         color: '#000000'
                        // OLD:     }
                        // OLD: }, session.sessionIP || "Unknown IP"),
                        // NEW: Format IP address with label
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, `IP: ${session.sessionIP === '::1' ? '127.0.0.1 (localhost)' : session.sessionIP || 'Unknown'}`),
                        // OLD: React.createElement("div", {
                        // OLD:     style: {
                        // OLD:         fontFamily: 'Inter, Helvetica',
                        // OLD:         fontWeight: 400,
                        // OLD:         fontSize: '14px',
                        // OLD:         color: '#000000'
                        // OLD:     }
                        // OLD: }, session.sessionLocation || "Unknown Location")
                        // NEW: Show current location for current session
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, isCurrent
                            ? (currentLocation === 'Detecting location...'
                                ? React.createElement('span', {
                                    className: 'sk-box',
                                    style: { display: 'inline-block', width: '120px', height: '14px', borderRadius: '4px' }
                                  })
                                : currentLocation)
                            : (session.sessionLocation || "Unknown Location"))
                    ),
                    React.createElement(
                        "div",
                        { style: { display: 'flex', gap: '10px', width: '100%' } },
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, isCurrent ? "Current" : session.lastSeenTime)
                    )
                )
            ),
            !isCurrent && React.createElement(
                "button",
                {
                    style: {
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    },
                    onClick: () => handleSessionLogout(keyID)
                },
                React.createElement('img', {
                    src: './img/logout_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                    alt: 'Logout',
                    style: { width: '24px', height: '24px' }
                })
            )
        );
    });

    const loginAttemptElement = loginAttempts.map((attempt) => {
    const keyID = attempt.attemptID;

        return React.createElement(
            "div",
            {
                key: keyID,
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '10px 20px',
                    position: 'relative',
                    width: '100%',
                    borderRadius: '10px',
                    backgroundColor: '#fafafa',
                    transition: 'background-color 0.2s ease'
                }
            },
            React.createElement("div", {
                style: {
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#d9d9d9',
                    borderRadius: '10px',
                    flexShrink: 0
                }
            }),
            React.createElement(
                "div",
                { style: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 } },
                React.createElement(
                    "div",
                    { style: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' } },
                    React.createElement("div", {
                        style: {
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: 400,
                            fontSize: '20px',
                            color: '#000000'
                        }
                    }, `${attempt.attemptOS} - ${attempt.attemptBrowser}`),
                    React.createElement(
                        "div",
                        { style: { display: 'flex', gap: '10px', width: '100%' } },
                        // OLD: React.createElement("div", {
                        // OLD:     style: {
                        // OLD:         fontFamily: 'Inter, Helvetica',
                        // OLD:         fontWeight: 400,
                        // OLD:         fontSize: '14px',
                        // OLD:         color: '#000000'
                        // OLD:     }
                        // OLD: }, attempt.attemptIP),
                        // NEW: Format IP address with label
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, `IP: ${attempt.attemptIP === '::1' ? '127.0.0.1 (localhost)' : attempt.attemptIP || 'Unknown'}`),
                        // OLD: React.createElement("div", {
                        // OLD:     style: {
                        // OLD:         fontFamily: 'Inter, Helvetica',
                        // OLD:         fontWeight: 400,
                        // OLD:         fontSize: '14px',
                        // OLD:         color: '#000000'
                        // OLD:     }
                        // OLD: }, attempt.attemptLocation || "Unknown Location")
                        // NEW: Keep location display
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, attempt.attemptLocation || "Unknown Location")
                    ),
                    React.createElement(
                        "div",
                        { style: { display: 'flex', gap: '10px', width: '100%' } },
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, attempt.attemptDate)
                    )
                )
            )
        );
    });

    return React.createElement('div', {
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false)
    },
        React.createElement('div', { className: 'group' },
            // Sidebar Component
            React.createElement(window.Sidebar, {
                sidebarCollapsed: sidebarCollapsed,
                setSidebarCollapsed: setSidebarCollapsed,
                username: username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen: userMenuOpen,
                setUserMenuOpen: setUserMenuOpen,
                userInfo: userInfo
            }),

            // Main content area
            React.createElement('main', { className: 'right-container' },
                React.createElement('section', {
                    className: 'main-screen',
                    style: {
                        backgroundColor: '#ffffff',
                        width: '100%',
                        height: '100vh',
                        maxHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 0,
                        alignItems: 'flex-start',
                        overflow: 'hidden'
                    }
                },
                    // Header with back button and title
                    React.createElement(
                        "div",
                        {
                            style: {
                                display: 'flex',
                                paddingLeft: isMobile ? '15px' : isTablet ? '20px' : '27px',
                                paddingRight: isMobile ? '15px' : isTablet ? '20px' : '33px',
                                width: '100%',
                                position: 'sticky',
                                top: '0',
                                backgroundColor: '#ffffff',
                                zIndex: window.ZIndex?.CHAT_TOPBAR || 12,
                                paddingTop: isMobile ? '20px' : isTablet ? '30px' : '38px',
                                paddingBottom: isMobile ? '10px' : isTablet ? '15px' : '20px',
                                alignItems: 'center',
                                gap: isMobile ? '10px' : '15px',
                                boxSizing: 'border-box'
                            }
                        },
                        React.createElement(
                            "button",
                            {
                                style: {
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: isMobile ? '36px' : '44px',
                                    height: isMobile ? '36px' : '44px',
                                    padding: isMobile ? '8px' : '10px',
                                    borderRadius: isMobile ? '8px' : '10px',
                                    border: '1px solid #e0e0e0',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                },
                                onClick: () => window.history.back(),
                                'aria-label': 'Go back'
                            },
                            React.createElement(
                                "div",
                                { style: { position: 'relative', width: '24px', height: '24px' } },
                                 React.createElement('img', {
                                    src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                                    alt: 'Back',
                                    style: {
                                        width: '24px',
                                        height: '24px'
                                    }
                                })
                            )
                        ),
                        React.createElement("div", {
                            style: {
                                position: 'relative',
                                flex: '1',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 700,
                                color: '#000000',
                                fontSize: isMobile ? '18px' : isTablet ? '20px' : '24px',
                                letterSpacing: 0,
                                lineHeight: 'normal',
                                textAlign: 'left',
                                whiteSpace: isMobile ? 'normal' : 'nowrap',
                                overflow: 'visible'
                            }
                        }, "Manage Login Sessions")
                    ),

                    // Main content container
                    React.createElement(
                        "div",
                        {
                            style: {
                                display: 'flex',
                                paddingLeft: isMobile ? '15px' : isTablet ? '20px' : '33px',
                                paddingRight: isMobile ? '15px' : isTablet ? '20px' : '33px',
                                width: '100%',
                                position: 'relative',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: isMobile ? '10px' : '15px',
                                marginTop: '0',
                                paddingBottom: isMobile ? '15px' : '20px',
                                boxSizing: 'border-box',
                                minHeight: 0,
                                height: '100vh',
                                overflowY: 'auto'
                            }
                        },

                        // Hidden CSRF
                        React.createElement("input", {
                            type: "hidden",
                            name: "_csrf",
                            id: "hidden-csrf",
                            value: csrfToken,
                        }),

                        // Clear all button
                        loginAttempts.length > 0 && React.createElement(
                            "button",
                            {
                                style: {
                                    display: 'flex',
                                    width: isMobile ? '110px' : '129px',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: isMobile ? '8px' : '10px',
                                    position: 'relative',
                                    flex: '0 0 auto',
                                    alignSelf: 'flex-end',
                                    borderRadius: isMobile ? '8px' : '10px',
                                    border: '1px solid #000000',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease'
                                },
                                onClick: handleClearLoginAttempts
                            },
                            React.createElement(
                                "div",
                                { style: { position: 'relative', width: '24px', height: '24px', marginRight: '10px' } },
                                React.createElement("img", {
                                    src: "./img/clear_all_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg",
                                    alt: "",
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        marginRight: '20px'
                                    }
                                })
                            ),
                            React.createElement("div", {
                                style: {
                                    position: 'relative',
                                    width: 'fit-content',
                                    marginTop: '-1px',
                                    fontFamily: 'Urbanist, Helvetica',
                                    fontWeight: 600,
                                    color: '#000000',
                                    fontSize: isMobile ? '16px' : '20px',
                                    letterSpacing: 0,
                                    lineHeight: 'normal',
                                    whiteSpace: 'nowrap'
                                }
                            }, "Clear all")
                        ),

                        // Content sections container
                        React.createElement(
                            "div",
                            {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    alignItems: 'flex-start',
                                    gap: isMobile ? '20px' : '26px',
                                    position: 'relative',
                                    flex: '1 1 auto',
                                    minHeight: 0
                                }
                            },

                            // Login attempts section
                            React.createElement(
                                "div",
                                {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '15px',
                                        position: 'relative',
                                        width: '100%',
                                        marginBottom: '20px'
                                    }
                                },
                                React.createElement("div", {
                                    style: {
                                        position: 'relative',
                                        width: '100%',
                                        marginTop: '-1px',
                                        fontFamily: 'Urbanist, Helvetica',
                                        fontWeight: 700,
                                        color: '#000000',
                                        fontSize: isMobile ? '18px' : isTablet ? '20px' : '24px',
                                        letterSpacing: 0,
                                        lineHeight: 'normal'
                                    }
                                }, "Log in attempts"),
                                // OPTION 1: Scrollable section wrapper (ACTIVE)
                                React.createElement(
                                    "div",
                                    {
                                        style: {
                                            width: '100%',
                                            maxHeight: '300px',
                                            overflowY: 'auto',

                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: isMobile ? '10px' : '15px',
                                            paddingRight: '5px'
                                        }
                                    },
                                    loginAttempts.length > 0
                                        ? loginAttemptElement
                                        : React.createElement("p", {
                                            style: {
                                                fontFamily: 'Inter, Helvetica',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                color: '#000000',
                                                padding: '10px 20px'
                                            }
                                        }, "No login attempts recorded")
                                )

                            ),

                            // Logged in sessions section
                            React.createElement(
                                "div",
                                {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '15px',
                                        width: '100%'
                                    }
                                },
                                React.createElement("div", {
                                    style: {
                                        position: 'relative',
                                        width: 'fit-content',
                                        marginTop: '-1px',
                                        fontFamily: 'Urbanist, Helvetica',
                                        fontWeight: 700,
                                        color: '#000000',
                                        fontSize: isMobile ? '18px' : isTablet ? '20px' : '24px',
                                        letterSpacing: 0,
                                        lineHeight: 'normal'
                                    }
                                }, "Logged in sessions"),
                                // OPTION 1: Scrollable section wrapper (ACTIVE)
                                React.createElement(
                                    "div",
                                    {
                                        style: {
                                            width: '100%',
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: isMobile ? '10px' : '15px',
                                            paddingRight: '5px'
                                        }
                                    },
                                    sessions.length > 0
                                        ? sessionElements
                                        : React.createElement("p", {
                                            style: {
                                                fontFamily: 'Inter, Helvetica',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                color: '#000000',
                                                padding: '10px 20px'
                                            }
                                        }, "No active sessions")
                                )

                            )
                        )
                    )
                )
            ),

            // Custom Modal
            modal.isOpen && React.createElement('div', {
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
                    zIndex: window.ZIndex?.MODAL_BACKDROP || 30,
                    padding: '20px'
                },
                onClick: (e) => {
                    if (e.target === e.currentTarget && modal.type === 'alert') {
                        closeModal();
                    }
                }
            },
                React.createElement('div', {
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '15px',
                        padding: isMobile ? '25px' : '30px',
                        maxWidth: isMobile ? '90%' : '500px',
                        width: '100%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    },
                    onClick: (e) => e.stopPropagation()
                },
                    React.createElement('div', {
                        style: {
                            fontFamily: 'Urbanist, Helvetica',
                            fontWeight: 700,
                            fontSize: isMobile ? '20px' : '24px',
                            color: '#000000',
                            lineHeight: 'normal'
                        }
                    }, modal.title),
                    React.createElement('div', {
                        style: {
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: 400,
                            fontSize: isMobile ? '14px' : '16px',
                            color: '#000000',
                            lineHeight: '1.5'
                        }
                    }, modal.message),
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end',
                            marginTop: '10px'
                        }
                    },
                        modal.type === 'confirm' && React.createElement('button', {
                            style: {
                                padding: isMobile ? '10px 20px' : '12px 24px',
                                borderRadius: '10px',
                                border: '1px solid #e0e0e0',
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 600,
                                fontSize: isMobile ? '14px' : '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#ffffff',
                            onClick: handleModalCancel
                        }, 'Cancel'),
                        React.createElement('button', {
                            style: {
                                padding: isMobile ? '10px 20px' : '12px 24px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 600,
                                fontSize: isMobile ? '14px' : '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#333333',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#000000',
                            onClick: modal.type === 'confirm' ? handleModalConfirm : closeModal
                        }, modal.type === 'confirm' ? 'Confirm' : 'OK')
                    )
                )
            )
        )
    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Session;
}

window.Session = Session;

})();
