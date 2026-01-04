// const { useState } = React;

// const TempUserProfile = ({userInfo}) => {


//     function handleSessionManagement() {
//         window.location.href = "/session"
//     }

//     function handlePasskeyManagement() {
//         window.location.href = "/passkeys"
//     }

//     function handleChangePassword() {
//         window.location.href = "/change-password"
//     }

//     return React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
//         React.createElement('h2', {}, "User Profile"),
//         React.createElement('p', {}, `@${userInfo.userName}`),
//         React.createElement('p', {}, `${userInfo.lastName} ${userInfo.firstName}`),
//         React.createElement('p', {}, `${userInfo.userEmail}`),
//         React.createElement('button', {
//             id: 'btn-logout',
//             onClick: handleSessionManagement,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Manage Sessions'),
//         React.createElement('button', {
//             id: 'btn-manageSessions',
//             onClick: handlePasskeyManagement,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Manage Passkeys'),
//         React.createElement('button', {
//             id: 'btn-changePassword',
//             onClick: handleChangePassword,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Change Password')
//     );
// };

// // Make available globally
// window.TempUserProfile = TempUserProfile;

const { useState } = React;



const TempUserProfile = ({userInfo, csrfToken}) => {

    // const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    // Persist sidebar state in localStorage
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : true;
    });
    
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Define responsive breakpoints for MacBook compatibility
    const isSmallDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024 && window.innerWidth < 1440;

    console.log("Inside TempUserProfile component – userInfo:", userInfo);

    function handleSessionManagement() {
        window.location.href = "/session"
    }

    function handlePasskeyManagement() {
        window.location.href = "/passkeys"
    }

    function handleChangePassword() {
        window.location.href = "/change-password"
    }

    const getAccountType = () => {
    // Priority 1: Check if user has passkeys (this takes highest priority)
    if (userInfo?.hasPasskey) {
        return 'Passkey';
    }
    
    // Priority 2: Check if user type is Google OAuth
    if (userInfo?.userType === 'google') {
        return 'Google Sign-In';
    }
    
    // Priority 3: Default to Email login
    return 'Email login';
};



    const logout = async () => {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function(response) {
                alert("Logout response: " + JSON.stringify(response));
                window.location = "/login";
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || "An error occurred. Please try again.";
                alert(errorMessage);
            }
        });
    };

    function handleProfileRoute() {
        window.location.href = "/profile";
    }

    function handleDeleteAccount() {
        if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            console.log("Delete account requested");
        }
    }

    // const toggleSidebar = () => {
    //     setSidebarCollapsed(!sidebarCollapsed);
    //     setUserMenuOpen(false);
    // };

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
    const displayName = userInfo?.firstName && userInfo?.lastName 
        ? `${userInfo.firstName} ${userInfo.lastName}` 
        : userInfo?.userName || 'User';

    return React.createElement('div', { 
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false),
        style: {
            display: 'flex',
            width: '100%',
            height: '100vh',
            overflow: 'hidden'
        }
    },
        React.createElement('div', { 
            className: 'group',
            style: {
                display: 'flex',
                width: '100%',
                height: '100%'
            }
        },
            // SIDEBAR
            React.createElement('aside', { 
                className: 'side-bar', 
                'aria-label': 'Sidebar navigation',
                style: {
                    flexShrink: 0,
                    width: sidebarCollapsed ? '65px' : '256px',
                    transition: 'width 220ms ease',
                    height: '100vh',
                    position: 'relative'
                }
            },
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

                    // React.createElement('img', { className: 'union', src: './img/union.svg', alt: 'Singularity Icon' }),

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
                            
                            sidebarCollapsed && userMenuOpen && React.createElement('div', {
                                style: {
                                    position: 'fixed',
                                    bottom: 'calc(50px + 30px + 20px)',
                                    left: '35px',
                                    backgroundColor: '#eeeeee',
                                    border: '1px solid #e4e4e4',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    zIndex: 9999,
                                    minWidth: '130px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
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

            // MAIN CONTENT AREA
            React.createElement('div', {
                style: {
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '36px 30px 40px 30px',
                    backgroundColor: '#ffffff',
                    overflowY: 'auto',
                    minHeight: '100vh',
                    width: `calc(100vw - ${sidebarCollapsed ? '65px' : '256px'})`,
                    transition: 'width 220ms ease'
                }
            },
                // Header
                React.createElement('div', {
                    style: {
                        fontSize: '24px',
                        fontWeight: '500',
                        fontFamily: 'SF Pro-Bold, Helvetica',
                        color: '#000000',
                        marginBottom: isSmallDesktop ? '80px' : '131px',
                        width: '147px',
                        height: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        letterSpacing: '0',
                        lineHeight: '20px'
                    }
                }, 'User Profile'),

                // Profile Container
                React.createElement('div', {
                    style: {
                        width: isSmallDesktop ? '400px' : '450px',
                        maxWidth: isSmallDesktop ? '500px' : '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: isSmallDesktop ? '25px' : '31px',
                        marginLeft: isSmallDesktop ? '76px' : '30px'
                    }
                },
                    // Avatar Section
                    React.createElement('div', {
                        style: {
                            position: 'relative',
                            width: '163px',
                            height: '170px'
                        }
                    },
                        React.createElement('div', {
                            style: {
                                position: 'absolute',
                                top: '1px',
                                left: '0',
                                width: '153px',
                                height: '153px',
                                borderRadius: '76.5px',
                                backgroundColor: '#d9d9d9'
                            }
                        }),
                        React.createElement('img', {
                            src: './img/size-48.svg',
                            alt: 'User',
                            style: {
                                position: 'absolute',
                                top: '53px',
                                left: '53px',
                                width: '48px',
                                height: '48px'
                            }
                        }),
                        React.createElement('div', {
                            style: {
                                position: 'absolute',
                                top: '140px',
                                left: '90px',
                                width: '73px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                padding: '10px',
                                backgroundColor: '#1c1d21',
                                borderRadius: '10px',
                                cursor: 'pointer'
                            },
                            onClick: () => setIsEditingProfile(!isEditingProfile)
                        },
                            React.createElement('div', {
                                style: {
                                    position: 'relative',
                                    width: '18px',
                                    height: '19px',
                                    marginTop: '-4.67px',
                                    marginBottom: '-4.67px',
                                    marginLeft: '-4px'
                                }
                            },
                                React.createElement('img', {
                                    src: './img/Edit.svg',
                                    alt: '',
                                    style: {
                                        position: 'absolute',
                                        width: '83.84%',
                                        height: '83.84%',
                                        top: '5.20%',
                                        left: '5.56%'
                                    }
                                })
                            ),
                            React.createElement('span', {
                                style: {
                                    position: 'relative',
                                    width: 'fit-content',
                                    marginTop: '-6.17px',
                                    marginBottom: '-2.17px',
                                    fontFamily: 'SF Pro-Semibold, Helvetica',
                                    fontWeight: '400',
                                    color: '#ffffff',
                                    fontSize: '15px',
                                    letterSpacing: '0',
                                    lineHeight: 'normal',
                                    whiteSpace: 'nowrap'
                                }
                            }, 'Edit')
                        )
                    ),

                    // Profile Info Cards Container
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            width: isSmallDesktop ? '100%' : '433px',
                            maxWidth: isSmallDesktop ? '500px' : '100%',
                            alignItems: 'flex-start',
                            gap: '20px',
                            marginLeft: isSmallDesktop ? '-20px' : '-55px',
                            marginRight: isSmallDesktop ? '-20px' : '-55px'
                        }
                    },
                        // Info Card
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignSelf: 'stretch',
                                width: '100%',
                                position: 'relative',
                                backgroundColor: '#ffffff',
                                borderRadius: '10px'
                            }
                        },
                            // Username
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    height: '73px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Username'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    // }, `@${username}`)
                                    }, `${username}`)
                                ),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    // React.createElement('img', {
                                    //     src: './img/vector.svg',
                                    //     alt: '',
                                    //     style: {
                                    //         position: 'absolute',
                                    //         width: '75%',
                                    //         height: '75%',
                                    //         top: '12.50%',
                                    //         left: '12.50%'
                                    //     }
                                    // })
                                )
                            ),
                            // React.createElement('img', {
                            //     src: './img/vector-4.svg',
                            //     alt: '',
                            //     style: {
                            //         position: 'absolute',
                            //         top: '72px',
                            //         left: '0',
                            //         width: '412px',
                            //         height: '1px',
                            //         objectFit: 'cover'
                            //     }
                            // }),

                            React.createElement('hr', {
                                style: {
                                    margin: '0',
                                    border: 'none',
                                    borderTop: '1px solid #000000ff',
                                    width: '100%'
                                }
                            }),

                            // Display Name
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Display Name'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, displayName)
                                ),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    // React.createElement('img', {
                                    //     src: './img/image.svg',
                                    //     alt: '',
                                    //     style: {
                                    //         position: 'absolute',
                                    //         width: '75%',
                                    //         height: '75%',
                                    //         top: '12.50%',
                                    //         left: '12.50%'
                                    //     }
                                    // })
                                )
                            ),

                            // React.createElement('img', {
                            //     src: './img/vector-3.svg',
                            //     alt: '',
                            //     style: {
                            //         position: 'absolute',
                            //         top: '140px',
                            //         left: '0',
                            //         width: '412px',
                            //         height: '1px',
                            //         objectFit: 'cover'
                            //     }
                            // }),

                            React.createElement('hr', {
                                    style: {
                                    margin: '0',
                                    border: 'none',
                                    borderTop: '1px solid #000000ff',
                                    width: '100%'
                                }
                            }), 

                            // Email
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: '600',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Email address'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, userInfo?.userEmail || userInfo?.email || 'email@example.com')
                                ),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    // React.createElement('img', {
                                    //     src: './img/edit_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                    //     alt: '',
                                    //     style: {
                                    //         position: 'absolute',
                                    //         width: '75%',
                                    //         height: '75%',
                                    //         top: '12.50%',
                                    //         left: '12.50%'
                                    //     }
                                    // })
                                )
                            ),
                            // React.createElement('img', {
                            //     src: './img/vector-2-2.svg',
                            //     alt: '',
                            //     style: {
                            //         position: 'absolute',
                            //         top: '208px',
                            //         left: '0',
                            //         width: '412px',
                            //         height: '1px',
                            //         objectFit: 'cover'
                            //     }
                            // }),

                            React.createElement('hr', {
                                style: {
                                    margin: '0',
                                    border: 'none',
                                    borderTop: '1px solid #000000ff',
                                    width: '100%'
                                }
                            }),

                            // Account Type
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Account Type'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, getAccountType())
                                )
                            )
                        ),

                        // Actions Card
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignSelf: 'stretch',
                                width: '100%',
                                backgroundColor: '#ffffff',
                                borderRadius: '10px'
                            }
                        },
                            // Change Password
                            React.createElement('div', {
                                onClick: handleChangePassword,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Change Password'),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        src: './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                        alt: '',
                                        style: {
                                            position: 'absolute',
                                            width: '24px',
                                            height: '24px',
                                            top: '8.33%',
                                            left: '26.04%'
                                        }
                                    })
                                )
                            ),
                            // Manage Passkeys
                            React.createElement('div', {
                                onClick: handlePasskeyManagement,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Manage Passkeys'),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        src: './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                        alt: '',
                                        style: {
                                            position: 'absolute',
                                            width: '24px',
                                            height: '24px',
                                            top: '8.33%',
                                            left: '26.04%'
                                        }
                                    })
                                )
                            ),
                            // Manage Sessions
                            React.createElement('div', {
                                onClick: handleSessionManagement,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Manage Login Sessions'),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        src: './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                        alt: '',
                                        style: {
                                            position: 'absolute',
                                            width: '24px',
                                            height: '24px',
                                            top: '8.33%',
                                            left: '26.04%'
                                        }
                                    })
                                )
                            ),
                            // Delete Account
                            React.createElement('div', {
                                onClick: handleDeleteAccount,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#b62e2e',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Delete Account')
                            )
                        )
                    )
                )
            )
        )
    );
};

// Make available globally
window.TempUserProfile = TempUserProfile;