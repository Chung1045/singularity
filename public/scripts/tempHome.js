// const { useState } = React;

// const TempHome = ({csrfToken,userInfo}) => {
// console.log("Inside TempHome component – userInfo:", userInfo);


//     const logout = async () => {
//         $.ajax({
//             url: '/api/logout',
//             method: 'POST',
//             headers: { 'CSRF-Token': csrfToken },
//             data: JSON.stringify({}),
//             contentType: 'application/json',
//             success: function(response) {
//                 alert("Logout response: " + JSON.stringify(response));
//                 window.location = "/login";
//             },
//             error: function(xhr) {
//                 const errorMessage = xhr.responseJSON?.message || "An error occurred. Please try again.";
//                 alert(errorMessage);
//             }
//         });
//     };

//     function handleProfileRoute() {
//         window.location.href = "/profile"
//     }

//     return React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
//         // React.createElement('h2', {}, "Hello"),
//        React.createElement('h1', { },
//             `Hello, ${userInfo.userName}`  // ← This will show "Hello, loggedinusername"
//         ),
//         React.createElement('p', {}, "You have logged in"),
//         React.createElement('input', { type: 'hidden', name: '_csrf', value: csrfToken }),
//         React.createElement('button', {
//             id: 'btn-logout',
//             onClick: logout,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Logout'),
//         React.createElement('button', {
//             id: 'btn-passkeyRegister',
//             onClick: handleProfileRoute,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Manage Profile')
//     );
// };

// // Make available globally
// window.TempHome = TempHome;

(function() {
    const { useState } = React;

    const TempHome = ({ csrfToken, userInfo }) => {
    // const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null });

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth <= 480;

    console.log("Inside TempHome component – userInfo:", userInfo);

    const showAlert = (title, message) => {
        setModal({ isOpen: true, title, message, type: 'alert', onConfirm: null, onCancel: null });
    };

    const closeModal = () => {
        setModal({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null });
    };

    const logout = async () => {

        if (!csrfToken) {
        console.error('CSRF token not available');
        showAlert('Error', 'Security token missing. Please refresh the page.');
        return;
    }

        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'CSRF-Token': csrfToken },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function(response) {
                showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.');
                setTimeout(() => {
                    window.location = "/login";
                }, 3000);
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || "An error occurred. Please try again.";
                showAlert('Error', errorMessage);
            }
        });
    };

    function handleProfileRoute() {
        window.location.href = "/profile";
    }

    // const toggleSidebar = () => {
    //     setSidebarCollapsed(!sidebarCollapsed);
    //     setUserMenuOpen(false); // Close menu when sidebar toggles
    // };

    const username = userInfo?.userName || userInfo?.email || 'User';

    return React.createElement('div', { 
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false) // Close menu when clicking outside
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
                    zIndex: 10001,
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
                            onClick: closeModal
                        }, 'OK')
                    )
                )
            ),

            // Main content
            React.createElement('main', { className: 'right-container' },
                React.createElement('section', { className: 'main-screen' },
                    React.createElement('header', { className: 'main-screen-title' },
                        React.createElement('img', {
                            className: 'bouncy-logo',
                            // src: 'https://c.animaapp.com/W03AeLaz/img/bouncy-logo-animation.svg',
                            src: './img/bouncy-logo-animation.svg',

                            alt: 'Singularity Logo'
                        }),
                        React.createElement('div', { className: 'logo-text' },
                            React.createElement('h1', { className: 'text-wrapper' }, 'Singularity')
                        )
                    ),
                    React.createElement('form', { className: 'input-field', role: 'search', 'aria-label': 'Main search' },
                        React.createElement('button', {
                            type: 'button',
                            className: 'input-field-button',
                            'aria-label': 'Add new item'
                        },
                            // React.createElement('img', { className: 'vector', src: 'https://c.animaapp.com/W03AeLaz/img/vector-2.svg', alt: '' })
                            React.createElement('img', { className: 'vector', src: './img/vector-2.svg', alt: '' })

                        ),
                        React.createElement('label', { htmlFor: 'main-search-input', className: 'visually-hidden' }, 'Search'),
                        React.createElement('input', {
                            type: 'text',
                            id: 'main-search-input',
                            className: 'div',
                            placeholder: "What's on your mind?",
                            'aria-label': "What's on your mind?"
                        }),
                        React.createElement('button', {
                            type: 'submit',
                            className: 'input-field-button',
                            'aria-label': 'Submit search'
                        },
                            // React.createElement('img', { className: 'img', src: 'https://c.animaapp.com/W03AeLaz/img/vector-3.svg', alt: '' })
                            React.createElement('img', { className: 'img', src: './img/vector-3.svg', alt: '' })

                        )
                    )
                )
            )
        )
    );
    };

    // Make available globally
    window.TempHome = TempHome;
})();