const { useState } = React;

const TempPasskey = ({ csrfToken, passkeys, userInfo }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });

    const showAlert = (title, message, onConfirm = null) => {
        setModal({ isOpen: true, title, message, type: 'alert', onConfirm });
    };

    const showModal = (title, message, onConfirm) => {
        setModal({ isOpen: true, title, message, type: 'confirm', onConfirm });
    };

    const closeModal = () => {
        setModal({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });
    };

    const handleModalOk = () => {
        if (modal.onConfirm) {
            modal.onConfirm();
        }
        closeModal();
    };

    const handleModalCancel = () => {
        closeModal();
    };

    // Passkey registration function moved inside component
    const registerPasskey = async () => {
        console.log("Running");
        if (!csrfToken) {
            // Old: alert("CSRF token missing!");
            showAlert('Error', 'CSRF token missing!');
            return;
        }

        const { startRegistration, browserSupportsWebAuthn } = window.SimpleWebAuthnBrowser;

        if (!browserSupportsWebAuthn) {
            // Old: alert("This browser does not support passkey");
            showAlert('Error', 'This browser does not support passkey');
            return;
        }
        try {
            const resp = await fetch('/api/passkey/gen-option', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({})
            });

            if (!resp.ok) throw new Error("Failed to get registration options");

            const options = await resp.json();

            const attResp = await startRegistration(options);
            console.log("Attestation response:", attResp);

            const verificationResp = await fetch('/api/passkey/verify-register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ attResp })
            });

            const verificationJSON = await verificationResp.json();

            if (verificationResp.ok) {
                // Old: alert("Passkey registered successfully!");
                // Old: location.reload();
                showAlert('Success', 'Passkey registered successfully!', () => {
                    location.reload();
                });
            } else {
                // Old: alert("Registration failed: " + (verificationJSON.error || "Unknown error"));
                showAlert('Error', 'Registration failed: ' + (verificationJSON.error || "Unknown error"));
            }
        } catch (error) {
            console.error(error);
            // Old: alert("Error: " + error.message);
            showAlert('Error', 'Error: ' + error.message);
        }
    };

    // Passkey deletion function moved inside component
    const deletePasskey = async (passkeyID, passkeyName) => {
        // Old: if (confirm(`Are you sure you want to delete this passkey? (${passkeyName}`)) {
        showModal(
            'Delete Passkey',
            `Are you sure you want to delete this passkey? (${passkeyName})`,
            async () => {
                try {
                    console.log("PasskeyID: " + passkeyID);

                    const resp = await fetch("/api/passkey/delete", {
                        method: 'POST',
                        headers: {
                            'CSRF-Token': csrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ passkeyID })
                    });

                    if (resp.ok) {
                        // Old: alert("Passkey deleted");
                        // Old: location.reload();
                        showAlert('Success', 'Passkey deleted', () => {
                            location.reload();
                        });
                    } else {
                        // Old: alert("Failed to delete passkey");
                        showAlert('Error', 'Failed to delete passkey');
                    }
                } catch (e) {
                    // Old: alert("Error: " + e.message);
                    showAlert('Error', 'Error: ' + e.message);
                }
            }
        );
    };

    // Responsive breakpoints
    const isMobile = windowWidth <= 480;
    const isTablet = windowWidth > 480 && windowWidth <= 768;
    const isSmallLaptop = windowWidth > 768 && windowWidth <= 1024;
    const isLargeLaptop = windowWidth > 1024 && windowWidth <= 1440;
    const isDesktop = windowWidth > 1440;

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    console.log("Rendering TempPasskey with passkeys:", passkeys); // Debug

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
                // Old: window.location = "/login";
                showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.', () => {
                    window.location = "/login";
                });
                setTimeout(() => {
                    window.location = "/login";
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
            showAlert('Error', 'An error occurred during logout. Please try again.');
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

    // ADDED: Function to format ISO date to readable format (MM/DD/YYYY HH:MM am/pm)
    const formatDate = (isoDateString) => {
        if (!isoDateString) return 'Unknown date';
        
        try {
            const date = new Date(isoDateString);
            
            // Check if date is valid
            if (isNaN(date.getTime())) return 'Unknown date';
            
            const month = date.getMonth() + 1; // 0-indexed, so add 1
            const day = date.getDate();
            const year = date.getFullYear();
            
            let hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'pm' : 'am';
            
            // Convert to 12-hour format
            hours = hours % 12;
            hours = hours ? hours : 12; // 0 should be 12
            
            // Pad minutes with zero if needed
            const minutesStr = minutes < 10 ? '0' + minutes : minutes;
            
            return `${month}/${day}/${year} ${hours}:${minutesStr} ${ampm}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Unknown date';
        }
    };

    // MODIFIED: Passkey card design matching mockup exactly
    const passkeyElements = passkeys.map((passkey) => {
        const keyID = passkey.keyID;
        // ADDED: Format the date using the new function
        const formattedDate = formatDate(passkey.dateCreate);

        return React.createElement('div', {
            key: keyID,
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '10px' : (isTablet ? '12px' : '15px'),
                padding: isMobile ? '15px' : (isTablet ? '18px' : '20px'),
                width: '100%',
                borderRadius: isMobile ? '8px' : '10px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
            }
        },
            // Icon rectangle
            React.createElement('div', {
                style: {
                    width: isMobile ? '40px' : '48px',
                    height: isMobile ? '40px' : '48px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: isMobile ? '8px' : '10px',
                    flexShrink: 0
                }
            }),
            // Content wrapper
            React.createElement('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '6px' : '8px',
                    flex: 1
                }
            },
                // Passkey name
                React.createElement('div', {
                    style: {
                        fontFamily: 'SF Pro-Regular, Helvetica',
                        fontWeight: '600',
                        color: '#000000',
                        fontSize: isMobile ? '16px' : (isTablet ? '17px' : '18px'),
                        lineHeight: '1.2'
                    }
                }, passkey.keyName || 'Unnamed Passkey'),
                // Date Created row
                React.createElement('div', {
                    style: {
                        display: 'flex',
                        gap: isMobile ? '6px' : '8px',
                        fontSize: isMobile ? '12px' : '14px'
                    }
                },
                    React.createElement('span', {
                        style: {
                            fontFamily: 'SF Pro-Regular, Helvetica',
                            fontWeight: '400',
                            color: '#999999'
                        }
                    }, 'Date Created:'),
                    React.createElement('span', {
                        style: {
                            fontFamily: 'SF Pro-Regular, Helvetica',
                            fontWeight: '400',
                            color: '#999999'
                        }
                    }, formattedDate) // MODIFIED: Use formatted date instead of raw passkey.dateCreate
                ),
                // MODIFIED: Last Used row with date and device info
                React.createElement('div', {
                    style: {
                        display: 'flex',
                        gap: isMobile ? '6px' : '8px',
                        fontSize: isMobile ? '12px' : '14px'
                    }
                },
                    React.createElement('span', {
                        style: {
                            fontFamily: 'SF Pro-Regular, Helvetica',
                            fontWeight: '400',
                            color: '#999999'
                        }
                    }, 'Last Used:'),
                    React.createElement('span', {
                        style: {
                            fontFamily: 'SF Pro-Regular, Helvetica',
                            fontWeight: '400',
                            color: '#999999'
                        }
                    }, passkey.lastUsed ? `${formatDate(passkey.lastUsed)}` : 'Never')
                )
            ),
            // Delete button
            React.createElement('button', {
                onClick: () => deletePasskey(keyID, passkey.keyName),
                style: {
                    width: isMobile ? '20px' : '24px',
                    height: isMobile ? '20px' : '24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }
            },
                React.createElement('img', {
                    src: './img/delete_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                    alt: 'Delete',
                    style: {
                        width: isMobile ? '20px' : '24px',
                        height: isMobile ? '20px' : '24px'
                    }
                })
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

            // MODIFIED: Main content area with new design
            React.createElement('main', { className: 'right-container' },
                React.createElement('section', { className: 'main-screen' },
                    // Hidden CSRF
                    React.createElement("input", {
                        type: "hidden",
                        name: "_csrf",
                        id: "hidden-csrf",
                        value: csrfToken,
                    }),

                    // MODIFIED: Container for entire page content
                    React.createElement('div', {
                        style: {
                            // padding: isMobile ? '15px 12px' : (isTablet ? '20px 20px' : (isSmallLaptop ? '25px 30px' : (isLargeLaptop ? '30px 50px' : '40px 87px'))),
                            width: '100%',
                            boxSizing: 'border-box'
                        }
                    },
                        // Header with back button and title
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: isMobile ? '10px' : (isTablet ? '12px' : '15px'),
                                marginBottom: isMobile ? '25px' : (isTablet ? '30px' : '40px')
                            }
                        },
                            // Back button with square icon
                            React.createElement('button', {
                                onClick: () => window.location.href = '/profile',
                                style: {
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: isMobile ? '36px' : (isTablet ? '40px' : '44px'),
                                    height: isMobile ? '36px' : (isTablet ? '40px' : '44px'),
                                    padding: isMobile ? '8px' : '10px',
                                    borderRadius: isMobile ? '8px' : '10px',
                                    border: '1px solid #e0e0e0',
                                    background: '#fff',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('img', {
                                    src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                                    alt: 'Back',
                                    style: {
                                        width: isMobile ? '20px' : '24px',
                                        height: isMobile ? '20px' : '24px'
                                    }
                                })
                            ),
                            // Title
                            React.createElement('div', {
                                style: {
                                    fontFamily: 'SF Pro-Bold, Helvetica',
                                    fontWeight: '400',
                                    color: '#000000',
                                    fontSize: isMobile ? '20px' : (isTablet ? '22px' : '24px'),
                                    letterSpacing: '0',
                                    lineHeight: 'normal'
                                }
                            }, 'Manage Passkeys')
                        ),

                        // Content container with Create button and passkey list
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: isMobile ? '12px' : '15px',
                                minWidth: isMobile ? '0' : (isTablet ? '300px' : '400px')
                            }
                        },
                            // Create Passkey button aligned to right
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    justifyContent: isMobile ? 'flex-start' : 'flex-end'
                                }
                            },
                                React.createElement('button', {
                                    onClick: () => registerPasskey(),
                                    style: {
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: isMobile ? '6px' : '10px',
                                        padding: isMobile ? '8px 12px' : '8px 12px',
                                        borderRadius: isMobile ? '8px' : '10px',
                                        border: '1px solid #000000',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        fontFamily: 'Urbanist-SemiBold, Helvetica',
                                        fontWeight: '600',
                                        color: '#000000',
                                        fontSize: isMobile ? '14px' : '16px'
                                    }
                                },
                                    React.createElement('img', {
                                        src: './img/add_2_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                                        alt: 'Add',
                                        style: {
                                            width: isMobile ? '20px' : '24px',
                                            height: isMobile ? '20px' : '24px',
                                            marginRight: isMobile ? '2px' : '5px'
                                        }
                                    }),
                                    React.createElement('span', null, 'Create Passkey')
                                )
                            ),

                            // Passkey list or empty state message
                            passkeys.length === 0 
                                ? React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: isMobile ? '300px' : (isTablet ? '400px' : '550px'),
                                        textAlign: 'center',
                                        color: '#999999',
                                        fontFamily: 'SF Pro-Regular, Helvetica',
                                        fontSize: isMobile ? '16px' : '18px',
                                        lineHeight: '1.6'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontWeight: '600',
                                            fontSize: isMobile ? '18px' : '20px',
                                            color: '#666666',
                                            marginBottom: '10px'
                                        }
                                    }, 'No Passkey'),
                                    React.createElement('div', null, 
                                        'Create new passkey by clicking ',
                                        React.createElement('span', {
                                            onClick: () => registerPasskey(),
                                            style: {
                                                color: '#666666',
                                                cursor: 'pointer',
                                                fontWeight: '400'
                                            }
                                        }, 'Create Passkey')
                                    )
                                )
                                : passkeyElements
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
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10001
                },
                onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        closeModal();
                    }
                }
            },
                React.createElement('div', {
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '15px',
                        padding: '30px',
                        maxWidth: '450px',
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
                            fontSize: '24px',
                            color: '#000000',
                            lineHeight: 'normal'
                        }
                    }, modal.title),
                    React.createElement('div', {
                        style: {
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: 400,
                            fontSize: '16px',
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
                                padding: '12px 24px',
                                borderRadius: '10px',
                                border: '1px solid #000000',
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 600,
                                fontSize: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#f0f0f0',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#ffffff',
                            onClick: handleModalCancel
                        }, 'Cancel'),
                        React.createElement('button', {
                            style: {
                                padding: '12px 24px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 600,
                                fontSize: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#333333',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#000000',
                            onClick: handleModalOk
                        }, 'OK')
                    )
                )
            )
        )
    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TempPasskey;
}

window.TempPasskey = TempPasskey;
