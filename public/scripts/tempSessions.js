const { useState } = React;

const TempSession = ({ csrfToken, sessions, loginAttempts, userInfo }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);

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

    const sessionElements = sessions.map((session) => {
        // Safety: ensure key exists
        const keyID = session.sessionID;

        return React.createElement(
            "div",
            {
                key: keyID,
                className: "flex items-center justify-between border border-gray-300 rounded p-3 mt-3",
            },
            React.createElement(
                "div",
                null,
                React.createElement("h3", { className: "font-semibold text-lg" }, session.sessionOS),
                React.createElement("p", { className: "text-gray-600 text-sm" }, session.lastSeenTime)
            ),
            React.createElement(
                "button",
                {
                    className: "bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600",
                    onClick: () => handleSessionLogout(keyID)
                },
                "Logout this session"
            )
        );
    });

    const loginAttemptElement = loginAttempts.map((attempt) => {
        const keyID = attempt.attemptID;

        return React.createElement(
            "div",
            {
                key: keyID,
                className: "flex items-center justify-between border border-gray-300 rounded p-3 mt-3",
            },
            React.createElement(
                "div",
                null,
                React.createElement("h3", { className: "font-semibold text-lg" }, attempt.attemptIP),
                React.createElement("p", { className: "text-gray-600 text-sm" }, attempt.attemptBrowser),
                React.createElement("p", { className: "text-gray-600 text-sm" }, attempt.attemptOS),
                React.createElement("p", { className: "text-gray-600 text-sm" }, attempt.attemptDate)
            ),
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
                React.createElement('section', { className: 'main-screen' },
                    React.createElement(
                        "div",
                        { className: "flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8" },

                        // Hidden CSRF
                        React.createElement("input", {
                            type: "hidden",
                            name: "_csrf",
                            id: "hidden-csrf",
                            value: csrfToken,
                        }),

                        React.createElement("h2", { className: "text-xl font-semibold mb-2" }, "Manage Sessions"),

                        sessionElements,

                        React.createElement("h2", { className: "text-xl font-semibold mb-2" }, "Login attempts"),

                        loginAttempts.length > 0
                            ? React.createElement(
                                "button",
                                {
                                    className: "bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600",
                                    onClick: handleClearLoginAttempts
                                },
                                "Clear Login Attempts History"
                            )
                            : React.createElement("p", { className: "text-gray-600 text-sm" }, "No record"),

                        loginAttemptElement
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
