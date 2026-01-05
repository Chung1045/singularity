const { useState } = React;

const TempSession = ({ csrfToken, sessions, loginAttempts, userInfo }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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
            alert('Security token missing. Please refresh the page.');
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
                alert("Logout response: " + JSON.stringify(data));
                window.location = "/login";
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || "An error occurred. Please try again.";
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert("An error occurred during logout. Please try again.");
        }
    };

    function handleProfileRoute() {
        window.location.href = "/profile";
    }

    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
        setUserMenuOpen(false);
    };

    const toggleUserMenu = (e) => {
        e.stopPropagation();
        setUserMenuOpen(!userMenuOpen);
    };

    const username = userInfo?.userName || userInfo?.email || 'User';

    const handleClearLoginAttempts = async () => {
        if (confirm("Are you sure you want to clear all the login attempt history?")) {
            const resp = await fetch("/api/loginAttempts/deleteAll", {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (resp.ok) {
                alert("Login Attempt History deleted");
                location.reload();
            } else {
                alert("Failed to delete login attempt history");
            }
        }
    }

    const handleSessionLogout = async (sessionID) => {
        if (confirm("Are you sure you want logout this session?")) {
            const resp = await fetch("/api/session/logout", {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({sessionID: sessionID})
            });

            if (resp.ok) {
                alert("Session have been removed and logged out");
                location.reload();
            } else {
                alert("Failed to logout the session");
            }
        }
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
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, session.sessionIP || "Unknown IP"),
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, session.sessionLocation || "Unknown Location")
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
                        React.createElement("div", {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: 400,
                                fontSize: '14px',
                                color: '#000000'
                            }
                        }, attempt.attemptIP),
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
            // Sidebar
            React.createElement('aside', { className: 'side-bar', 'aria-label': 'Sidebar navigation' },
                React.createElement('nav', null,
                    // History button
                    React.createElement('button', {
                        className: 'history',
                        type: 'button',
                        'aria-expanded': 'false',
                        'aria-controls': 'history-submenu'
                    },
                        React.createElement('img', { className: 'slash-circle', src: './img/slash-circle-1.svg', alt: '' }),
                        React.createElement('span', { className: 'text-wrapper-2' }, 'History'),
                        React.createElement('span', { className: 'submenu', 'aria-hidden': 'true' },
                            React.createElement('span', { className: 'text-wrapper-3' }, '􀆊')
                        )
                    ),

                    // Search file field
                    React.createElement('form', { className: 'search-file-field', role: 'search', 'aria-label': 'Search files' },
                        React.createElement('img', { className: 'search', src: './img/search-1.svg', alt: '' }),
                        React.createElement('label', { htmlFor: 'search-files-input', className: 'visually-hidden' }, 'Search files'),
                        React.createElement('input', {
                            type: 'search',
                            id: 'search-files-input',
                            className: 'text-wrapper-4',
                            placeholder: 'Search files',
                            'aria-label': 'Search files'
                        })
                    ),

                    React.createElement('button', {
                        style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
                        onClick: () => window.location.href = '/home',
                        'aria-label': 'Go to home'
                    },
                        React.createElement('img', { className: 'union', src: './img/union.svg', alt: 'Singularity Icon' })
                    ),

                    React.createElement('button', {
                        className: 'trigger',
                        type: 'button',
                        'aria-label': 'Toggle sidebar',
                        'aria-expanded': !sidebarCollapsed,
                        onClick: toggleSidebar
                    },
                        // OLD: Text version
                        // React.createElement('span', { className: 'close-side-bar' },
                        //     React.createElement('span',  { className: 'text-wrapper-5' }, '>>')
                        // )
                        // NEW: SVG version
                        React.createElement('img', {
                            src: './img/double-arrow-right-svgrepo-com.svg',
                            alt: 'Toggle sidebar',
                            style: { width: '24px', height: '24px' }
                        })
                    ),

                    React.createElement('div', { className: 'horizontal-inset', role: 'separator' },
                        React.createElement('hr', null)
                    ),

                    // User section
                    React.createElement('div', {
                        style: {
                            position: 'absolute',
                            bottom: '80px',
                            left: sidebarCollapsed ? '12px' : '0px',
                            width: 'max-content',
                            transition: 'left 220ms ease',
                            overflow: 'visible',
                            zIndex: 1002
                        },
                        onClick: toggleUserMenu
                    },
                        // Expanded view
                        !sidebarCollapsed && React.createElement('a', {
                            href: '#',
                            className: 'username-display',
                            style: {
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '13px',
                                bottom: '12px',
                                textDecoration: 'none',
                                width: 'auto'
                            },
                            onClick: (e) => e.preventDefault()
                        },
                            React.createElement('img', { className: 'user', src: './img/user.svg', alt: 'User', style: { width: '22px', height: '22px' } }),
                            React.createElement('span', { className: 'text-wrapper-6' }, username),

                            // User menu dropdown - expanded
                            userMenuOpen && React.createElement('div', {
                                style: {
                                    position: 'absolute',
                                    bottom: '150%',
                                    left: '0',
                                    marginBottom: '10px',
                                    backgroundColor: '#eeeeee',
                                    border: '1px solid #e4e4e4',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    zIndex: 3,
                                    minWidth: '234px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '25px',
                                    pointerEvents: 'auto'
                                }
                            },
                                React.createElement('button', {
                                    id: 'btn-profile-expanded',
                                    style: {
                                        display: 'block',
                                        width: '100%',
                                        padding: '0',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: '400',
                                        color: '#1c1d21',
                                        transition: 'background-color 0.2s'
                                    },
                                    onClick: (e) => { e.stopPropagation(); handleProfileRoute(); }
                                }, 'Profile'),
                                React.createElement('button', {
                                    id: 'btn-logout-expanded',
                                    style: {
                                        display: 'block',
                                        width: '100%',
                                        padding: '0',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontFamily: 'Urbanist-SemiBold, Helvetica',
                                        fontWeight: '600',
                                        color: '#b62e2e',
                                        transition: 'background-color 0.2s'
                                    },
                                    onClick: (e) => { e.stopPropagation(); logout(); }
                                }, 'Log Out')
                            )
                        ),

                        // Collapsed view
                        sidebarCollapsed && React.createElement('button', {
                            style: {
                                position: 'relative',
                                width: '48px',
                                height: '48px',
                                background: '#ffffff',
                                padding: '0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 220ms ease'
                            }
                        },
                            React.createElement('img', {
                                src: './img/user.svg',
                                alt: 'User',
                                style: { width: '22px', height: '22px' }
                            }),

                            // User menu dropdown - collapsed
                            sidebarCollapsed && userMenuOpen && React.createElement('div', {
                                style: {
                                    position: 'fixed',
                                    bottom: 'calc(50px + 30px + 20px)',
                                    left: '35px',
                                    backgroundColor: '#eeeeee',
                                    border: '1px solid #e4e4e4',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    zIndex: 10000,
                                    minWidth: '130px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px',
                                    pointerEvents: 'auto'
                                }
                            },
                                React.createElement('button', {
                                    id: 'btn-profile-collapsed',
                                    style: {
                                        display: 'block',
                                        width: '100%',
                                        padding: '0',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: '400',
                                        color: '#1c1d21',
                                        transition: 'background-color 0.2s'
                                    },
                                    onMouseEnter: (e) => e.target.style.backgroundColor = '#eeeeee',
                                    onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent',
                                    onClick: (e) => { e.stopPropagation(); handleProfileRoute(); }
                                }, 'Profile'),
                                React.createElement('button', {
                                    id: 'btn-logout-collapsed',
                                    style: {
                                        display: 'block',
                                        width: '100%',
                                        padding: '0',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontFamily: 'Urbanist-SemiBold, Helvetica',
                                        fontWeight: '600',
                                        color: '#b62e2e',
                                        transition: 'background-color 0.2s'
                                    },
                                    onMouseEnter: (e) => e.target.style.backgroundColor = '#eeeeee',
                                    onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent',
                                    onClick: (e) => { e.stopPropagation(); logout(); }
                                }, 'Log Out')
                            )
                        )
                    )
                )
            ),

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
                                zIndex: 100,
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
                                        minHeight: 0
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
                                            flex: '1 1 auto',
                                            minHeight: 0,
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
                                        position: 'relative',
                                        width: '100%',
                                        flex: '1 1 0',
                                        minHeight: 0
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
                                            flex: '1 1 auto',
                                            minHeight: 0,
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
            )
        )
    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TempSession;
}

window.TempSession = TempSession;
