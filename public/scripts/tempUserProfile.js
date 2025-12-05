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

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

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

    const logout = async () => {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken },
            data: JSON.stringify({}),
            contentType: 'application/json',

        // If you need to include credentials (cookies) in the request, uncomment the following lines
        
        //     xhrFields: {
        //     withCredentials: true
        // },

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

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
        setUserMenuOpen(false);
    };

    const toggleUserMenu = (e) => {
        e.stopPropagation();
        setUserMenuOpen(!userMenuOpen);
    };

    const username = userInfo?.userName || userInfo?.email || 'User';

    return React.createElement('div', { 
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false) // Close menu when clicking outside
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

                    React.createElement('img', { className: 'union', src: './img/union.svg', alt: 'Singularity Icon' }),

                    React.createElement('button', {
                        className: 'trigger',
                        type: 'button',
                        'aria-label': 'Toggle sidebar',
                        'aria-expanded': !sidebarCollapsed,
                        onClick: toggleSidebar
                    },
                        React.createElement('span', { className: 'close-side-bar' },
                            // React.createElement('span',  { className: 'text-wrapper-5' }, '􀆊􀆊')
                            React.createElement('span',  { className: 'text-wrapper-5' }, '>>')
                        )
                    ),

                    React.createElement('div', { className: 'horizontal-inset', role: 'separator' },
                        React.createElement('hr', null)
                    ),

                    // User section - visible in both expanded and collapsed
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
                        // Expanded view: show username with icon
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

                        // Collapsed view: show icon only
                        sidebarCollapsed && React.createElement('button', {
                            style: {
                                position: 'relative',
                                width: '48px',
                                height: '48px',
                                background: '#ffffff',
                                // border: '1px solid #e4e4e4',
                                // borderRadius: '11.12px',
                                padding: '0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 220ms ease'
                            },
                            // onMouseEnter: (e) => e.target.style.backgroundColor = '#eeeeee',
                            // onMouseLeave: (e) => e.target.style.backgroundColor = '#eeeeee'
                        },
                            React.createElement('img', { 
                                // src: 'https://c.animaapp.com/W03AeLaz/img/user.svg', 
                                src: './img/user.svg', 

                                alt: 'User', 
                                style: { width: '22px', height: '22px' } 
                            }),
                            
                            // User menu dropdown - collapsed (moved outside sidebar)
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
                            style: {
                                id: 'btn-logout-collapsed',
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


        React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
        React.createElement('h2', {}, "User Profile"),
        React.createElement('p', {}, `@${userInfo.userName}`),
        React.createElement('p', {}, `${userInfo.lastName} ${userInfo.firstName}`),
        React.createElement('p', {}, `${userInfo.userEmail}`),
        React.createElement('button', {
            id: 'btn-logout',
            onClick: handleSessionManagement,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
        }, 'Manage Sessions'),
        React.createElement('button', {
            id: 'btn-manageSessions',
            onClick: handlePasskeyManagement,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
        }, 'Manage Passkeys'),
        React.createElement('button', {
            id: 'btn-changePassword',
            onClick: handleChangePassword,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
        }, 'Change Password')
    )
    )
    );

};

// Make available globally
window.TempUserProfile = TempUserProfile;