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

const { useState } = React;

const TempHome = ({ csrfToken, userInfo }) => {
    // const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);

    console.log("Inside TempHome component – userInfo:", userInfo);

    const logout = async () => {

        if (!csrfToken) {
        console.error('CSRF token not available');
        alert('Security token missing. Please refresh the page.');
        return;
    }

        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'CSRF-Token': csrfToken },
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

    // const toggleSidebar = () => {
    //     setSidebarCollapsed(!sidebarCollapsed);
    //     setUserMenuOpen(false); // Close menu when sidebar toggles
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

    return React.createElement('div', {
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false) // Close menu when clicking outside
    },
        React.createElement('div', { className: 'group' },
            // Sidebar
            React.createElement('aside', { className: 'side-bar', 'aria-label': 'Sidebar navigation' },
                React.createElement('nav', null,

                    React.createElement('button', {
                            style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
                            onClick: () => window.location.href = '/home',
                            'aria-label': 'Go to home'
                        },
                        React.createElement('img', { className: 'union', src: './img/union.svg', alt: 'Singularity Icon' })
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

                    testProjectInfoView(),

                    // React.createElement('img', { className: 'union', src: './img/union.svg', alt: 'Singularity Icon' }),
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

                    // User section - visible in both expanded and collapsed
                    React.createElement('div', {
                        style: {
                            // position: 'absolute',
                            // bottom: '80px',
                            // left: sidebarCollapsed ? '12px' : '0px',
                            // width: 'max-content',
                            width: "auto",
                            transition: 'left 220ms ease',
                            overflow: 'visible',
                            // zIndex: 1002
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

window.onload = async function() {
    await fetchProjects()
}

function testProjectInfoView() {
    return React.createElement('div', {
            id: "div-test-project-container",
            style: {
                backgroundColor: "snow",
                outline: "1px solid black",
                borderRadius: "5px",
                flexGrow: 1, // Keep this to fill remaining space
                overflow: "auto", // Add scrolling for content
                display: "flex",
                flexDirection: "column",
                gap: "10px"
            }
        },
        React.createElement('h3', {
            id: "p-test-project-container-label",
            style: { margin: 0, fontSize: "14px" }
        }, "Test Project Container"),
        React.createElement('select', {
            id: "select-project-drop-down",
            style: {
                padding: "5px",
                borderRadius: "5px",
                border: "1px solid #e4e4e4"
            },
            onChange: async (e) => {
                await fetchProjectFiles(e.target.value)
                await fetchProjectReports(e.target.value)
            }
        }),
        React.createElement('h3', {
            id: "p-project-source-list-label",
            style: { margin: 0, fontSize: "14px" }
        }, "Sources"),
        React.createElement('div', {
            id: "div-project-source-list",
            style: {
                display: "flex",
                flexDirection: "column",
                gap: "5px"
            }
        }),
        React.createElement('h3', {
            id: "p-project-report-list-label",
            style: { margin: 0, fontSize: "14px" }
        }, "Reports"),
        React.createElement('div', {
            id: "div-project-report-list",
            style: {
                display: "flex",
                flexDirection: "column",
                gap: "5px"
            }
        })
    )
}

async function fetchProjects() {
    const response = await fetch('/api/project/list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
    });

    if (response.ok) {
        let data = await response.json()
        console.log(`Project Data: ${JSON.stringify(data)}`)
        populateProjectDropdown(data.projects)
        let defaultProjectID = data.projects[0]?.projectID;

        if (defaultProjectID) {
            await fetchProjectFiles(defaultProjectID)
            await fetchProjectReports(defaultProjectID)
        }
    }
}

function populateProjectDropdown(projects) {
    const dropdown = document.getElementById('select-project-drop-down');

    const options = projects.map((project, index) =>
        `<option value="${project.projectID}" ${index === 0 ? 'selected' : ''}>${project.projectName}</option>`
    ).join('');

    dropdown.innerHTML = options;

    if (projects.length > 0) {
        dropdown.dispatchEvent(new Event('change'));
    }
}

async function fetchProjectFiles(projectID) {
    console.log(`Fetching ${projectID} files`)
    const response = await fetch('/api/project/file/list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            projectID: projectID
        })
    });

    if (response.ok) {
        let data = await response.json()
        console.log(`Response Data: ${JSON.stringify(data)}`)
        const sourceContainer = document.getElementById("div-project-source-list");
        for (file of data.files) {
            const documentEntry = document.createElement('p');
            documentEntry.innerHTML = `${file.documentName}.${file.documentExt}`
            sourceContainer.append(documentEntry);
        }
    }
}

async function fetchProjectReports(projectID) {

    const response = await fetch('/api/project/report/list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            projectID: projectID
        })
    });

    if (response.ok) {
        let data = await response.json()
        console.log(`Response Data: ${JSON.stringify(data)}`)
        const reportContainer = document.getElementById("div-project-report-list")
        for (report of data.reports) {
            const reportEntry = document.createElement('p');
            reportEntry.innerHTML = `${report.reportName}`
            reportContainer.append(reportEntry);
        }
    }
}

// Make available globally
window.TempHome = TempHome;
