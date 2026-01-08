(function() {
    const { useState } = React;

    const Sidebar = ({ 
        sidebarCollapsed, 
        setSidebarCollapsed, 
        username, 
        onLogout, 
        onProfileRoute,
        userMenuOpen,
        setUserMenuOpen,
        userInfo
    }) => {
        const [historyExpanded, setHistoryExpanded] = useState(false);
        const [sourceExpanded, setSourceExpanded] = useState(false);
        const [requirementsExpanded, setRequirementsExpanded] = useState(false);

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

        // State to track if avatar failed to load
        const [avatarError, setAvatarError] = React.useState(false);
        const [googleAvatarError, setGoogleAvatarError] = React.useState(false);

        // Determine avatar URL: prioritize uploaded avatar, then Google avatar, then default
        // If uploaded avatar fails to load, fall back to Google avatar (if available) before using default
        // If Google avatar also fails, fall back to default
        const getAvatarUrl = () => {
            if (avatarError) {
                // If uploaded avatar failed and Google avatar exists and hasn't failed, use Google avatar
                if (userInfo?.googleAvatarUrl && !googleAvatarError) {
                    return userInfo.googleAvatarUrl;
                }
                return './img/user.svg';
            }
            if (userInfo?.userAvatarPath) {
                return userInfo.userAvatarPath;
            }
            if (userInfo?.googleAvatarUrl && !googleAvatarError) {
                return userInfo.googleAvatarUrl;
            }
            return './img/user.svg';
        };

        const avatarUrl = getAvatarUrl();

        // Reset avatar error when userInfo changes
        React.useEffect(() => {
            setAvatarError(false);
            setGoogleAvatarError(false);
        }, [userInfo?.userAvatarPath, userInfo?.googleAvatarUrl]);

        const handleAvatarError = () => {
            const currentUrl = getAvatarUrl();
            // If currently showing uploaded avatar, mark it as failed
            if (currentUrl === userInfo?.userAvatarPath) {
                setAvatarError(true);
            }
            // If currently showing Google avatar, mark it as failed too
            else if (currentUrl === userInfo?.googleAvatarUrl) {
                setGoogleAvatarError(true);
                setAvatarError(true); // Trigger re-render to use default
            }
        };

    return React.createElement('aside', { 
        id: 'sidebar',
        className: 'side-bar', 
        'aria-label': 'Sidebar navigation'
    },
        React.createElement('nav', null,
            // Icon at top
            React.createElement('button', {
                id: 'sidebar-icon',
                style: { 
                    background: 'none', 
                    border: 'none', 
                    padding: 0, 
                    cursor: 'pointer',
                    marginBottom: '20px'
                },
                onClick: () => window.location.href = '/home',
                'aria-label': 'Go to home'
            },
                React.createElement('img', { 
                    id: 'sidebar-icon-img',
                    className: 'union', 
                    src: './img/union.svg', 
                    alt: 'Singularity Icon' 
                })
            ),

            // Search bar
            React.createElement('form', { 
                id: 'sidebar-search',
                className: 'search-file-field', 
                role: 'search', 
                'aria-label': 'Search files',
                style: { marginBottom: '20px' }
            },
                React.createElement('img', { 
                    id: 'sidebar-search-icon',
                    className: 'search', 
                    src: './img/search-1.svg', 
                    alt: '' 
                }),
                React.createElement('label', { 
                    htmlFor: 'search-files-input', 
                    className: 'visually-hidden' 
                }, 'Search files'),
                React.createElement('input', {
                    type: 'search',
                    id: 'search-files-input',
                    className: 'text-wrapper-4',
                    placeholder: 'Search files',
                    'aria-label': 'Search files'
                })
            ),

            // History section with dropdown
            React.createElement('div', { 
                id: 'sidebar-history-wrapper',
                style: { marginBottom: '10px' } 
            },
                React.createElement('button', {
                    id: 'sidebar-history',
                    className: 'history',
                    type: 'button',
                    'aria-expanded': historyExpanded,
                    'aria-controls': 'history-submenu',
                    onClick: () => setHistoryExpanded(!historyExpanded)
                },
                    React.createElement('img', { 
                        className: 'slash-circle', 
                        src: './img/slash-circle-1.svg', 
                        alt: '' 
                    }),
                    React.createElement('span', { 
                        className: 'text-wrapper-2' 
                    }, 'History'),
                    React.createElement('span', { 
                        className: 'submenu', 
                        'aria-hidden': 'true' 
                    },
                        React.createElement('img', { 
                            className: 'text-wrapper-3',
                            src: './img/down-chevron-black-16112.svg',
                            alt: '',
                            style: { 
                                transform: historyExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                                transition: 'transform 0.2s',
                                width: '24px',
                                height: '24px',
                                marginRight: '4px'
                            }
                        })
                    )
                ),
                historyExpanded && !sidebarCollapsed && React.createElement('div', {
                    id: 'history-submenu',
                    style: {
                        paddingLeft: '40px',
                        paddingTop: '10px',
                        paddingBottom: '10px'
                    }
                },
                    React.createElement('div', { style: { fontSize: '14px', color: '#666' } }, 'No history items yet, you can replace this to show lists')
                )
            ),

            // Source section with dropdown
            React.createElement('div', { 
                id: 'sidebar-source-wrapper',
                style: { marginBottom: '10px' } 
            },
                React.createElement('button', {
                    id: 'sidebar-source',
                    className: 'history',
                    type: 'button',
                    'aria-expanded': sourceExpanded,
                    'aria-controls': 'source-submenu',
                    onClick: () => setSourceExpanded(!sourceExpanded)
                },
                    React.createElement('img', { 
                        className: 'slash-circle', 
                        src: './img/slash-circle-1.svg', 
                        alt: '' 
                    }),
                    React.createElement('span', { 
                        className: 'text-wrapper-2' 
                    }, 'Source'),
                    React.createElement('span', { 
                        className: 'submenu', 
                        'aria-hidden': 'true' 
                    },
                        React.createElement('img', { 
                            className: 'text-wrapper-3',
                            src: './img/down-chevron-black-16112.svg',
                            alt: '',
                            style: { 
                                transform: sourceExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                                transition: 'transform 0.2s',
                                width: '24px',
                                height: '24px',
                                marginRight: '4px'
                            }
                        })
                    )
                ),
                sourceExpanded && !sidebarCollapsed && React.createElement('div', {
                    id: 'source-submenu',
                    style: {
                        paddingLeft: '40px',
                        paddingTop: '10px',
                        paddingBottom: '10px'
                    }
                },
                    React.createElement('div', { style: { fontSize: '14px', color: '#666' } }, 'No source items yet, you can replace this to show lists')
                )
            ),

            // Requirements List section with dropdown
            React.createElement('div', { 
                id: 'sidebar-requirements-wrapper',
                style: { marginBottom: '10px' } 
            },
                React.createElement('button', {
                    id: 'sidebar-requirements',
                    className: 'history',
                    type: 'button',
                    'aria-expanded': requirementsExpanded,
                    'aria-controls': 'requirements-submenu',
                    onClick: () => setRequirementsExpanded(!requirementsExpanded)
                },
                    React.createElement('img', { 
                        className: 'slash-circle', 
                        src: './img/slash-circle-1.svg', 
                        alt: '' 
                    }),
                    React.createElement('span', { 
                        className: 'text-wrapper-2' 
                    }, 'Requirements List'),
                    React.createElement('span', { 
                        className: 'submenu', 
                        'aria-hidden': 'true' 
                    },
                        React.createElement('img', { 
                            className: 'text-wrapper-3',
                            src: './img/down-chevron-black-16112.svg',
                            alt: '',
                            style: { 
                                transform: requirementsExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                                transition: 'transform 0.2s',
                                width: '24px',
                                height: '24px',
                                marginRight: '4px'
                            }
                        })
                    )
                ),
                requirementsExpanded && !sidebarCollapsed && React.createElement('div', {
                    id: 'requirements-submenu',
                    style: {
                        paddingLeft: '40px',
                        paddingTop: '10px',
                        paddingBottom: '10px'
                    }
                },
                    React.createElement('div', { style: { fontSize: '14px', color: '#666' } }, 'No requirements yet, you can replace this to show lists')
                )
            ),

            // Spacer to push username and toggle to bottom
            React.createElement('div', { 
                style: { 
                    flex: 1,
                    minHeight: '20px'
                } 
            }),

            // Horizontal divider
            React.createElement('div', { 
                id: 'sidebar-divider-for-username-and-toggle',
                className: 'horizontal-inset', 
                role: 'separator',
                style: { marginBottom: '20px' }
            },
                React.createElement('hr', null)
            ),

            // Username section
            React.createElement('div', { 
                id: 'sidebar-username',
                style: { 
                    width: '100%',
                    marginBottom: '20px',
                    position: 'relative',
                    margin: '20px 0'
                },
                onClick: toggleUserMenu
            },
                // Expanded view: show username with icon
                !sidebarCollapsed && React.createElement('a', { 
                    id: 'sidebar-user-avatar-expanded',
                    href: '#',
                    className: 'username-display',
                    style: { 
                        cursor: 'pointer', 
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        width: 'auto',
                        padding: '0px',
                        margin: '20px 20px 0 0'
                    },
                    onClick: (e) => e.preventDefault()
                },
                    React.createElement('img', { 
                        id: 'sidebar-user-avatar-img',
                        className: 'user', 
                        src: avatarUrl, 
                        alt: 'User',
                        onError: handleAvatarError,
                        style: { 
                            width: '22px', 
                            height: '22px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                        } 
                    }),
                    React.createElement('span', { 
                        className: 'text-wrapper-6' 
                    }, username),
                    
                    // User menu dropdown - expanded
                    userMenuOpen && React.createElement('div', {
                        id: 'sidebar-user-menu-expanded',
                        style: {
                            position: 'absolute',
                            bottom: '100%',
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
                            gap: '25px'
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
                            onClick: (e) => { e.stopPropagation(); onProfileRoute(); }
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
                            onClick: (e) => { e.stopPropagation(); onLogout(); }
                        }, 'Log Out')
                    )
                ),

                // Collapsed view: show icon only
                sidebarCollapsed && React.createElement('button', {
                    id: 'sidebar-user-avatar-collapsed',
                    style: {
                        position: 'relative',
                        width: '48px',
                        height: '48px',
                        background: '#ffffff',
                        padding: '5px 5px 2px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 220ms ease',
                        margin: '50px auto'
                    }
                },
                    React.createElement('img', { 
                        src: avatarUrl, 
                        alt: 'User',
                        onError: handleAvatarError,
                        style: { 
                            width: '22px', 
                            height: '22px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                        } 
                    }),
                    
                    // User menu dropdown - collapsed (moved outside sidebar)
                    sidebarCollapsed && userMenuOpen && React.createElement('div', {
                        id: 'sidebar-user-menu-collapsed',
                        style: {
                            position: 'fixed',
                            bottom: 'calc(50px + 30px + 20px)',
                            left: '35px',
                            backgroundColor: '#eeeeee',
                            border: '1px solid #e4e4e4',
                            borderRadius: '10px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            zIndex: 9999,
                            minWidth: '160px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0'
                        }
                    },
                        // Username and email section
                        React.createElement('div', {
                            id: 'sidebar-username-collapsed',
                            style: {
                                borderBottom: '1px solid #d0d0d0',
                                marginBottom: '8px',
                                textAlign: 'left'
                            }
                        },
                            // Row 1: Username
                            React.createElement('div', {
                                id: 'sidebar-username-text-collapsed',
                                style: {
                                    
                                    fontSize: '14px',
                                    fontFamily: 'SF Pro-Semibold, Helvetica',
                                    fontWeight: '600',
                                    color: '#1c1d21',
                                    // padding: '8px 0'
                                }
                            }, username),
                            // Row 2: Email
                            React.createElement('div', {
                                id: 'sidebar-useremail-text-collapsed',
                                style: {
                                    
                                    fontSize: '12px',
                                    fontFamily: 'SF Pro-Regular, Helvetica',
                                    fontWeight: '400',
                                    color: '#666666',
                                    wordBreak: 'break-word',
                                    padding: '8px 0'
                                }
                            }, userInfo?.userEmail || userInfo?.email || '')
                        ),
                        // Row 3: Profile button
                        React.createElement('button', {
                            id: 'btn-profile-collapsed',
                            style: {
                                display: 'block',
                                width: '100%',
                                padding: '8px 0',
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
                            onClick: (e) => { e.stopPropagation(); onProfileRoute(); }
                        }, 'Profile'),
                        // Row 4: Logout button
                        React.createElement('button', {
                            id: 'btn-logout-collapsed',
                            style: {
                                display: 'block',
                                width: '100%',
                                // padding: '8px 0',
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
                            onClick: (e) => { e.stopPropagation(); onLogout(); }
                        }, 'Log Out')
                    )
                )
            ),

            // Toggle button at bottom
            React.createElement('button', {
                id: 'sidebar-toggle',
                className: 'trigger',
                type: 'button',
                'aria-label': 'Toggle sidebar',
                'aria-expanded': !sidebarCollapsed,
                onClick: toggleSidebar,
                style: { marginBottom: '20px' }
            },
                React.createElement('img', {
                    src: './img/double-arrow-right-svgrepo-com.svg',
                    alt: 'Toggle sidebar',
                    style: { width: '24px', height: '24px' }
                })
            )
        )
    );
    };

    // Make available globally
    window.Sidebar = Sidebar;
})();