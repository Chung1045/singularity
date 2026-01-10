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
                setUserMenuOpen: setUserMenuOpen
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
    console.log("fetchProjects is triggered")
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
            try {
                console.log("1. Starting fetchProjectFiles")
                await fetchProjectFiles(defaultProjectID)
                console.log("1. ✓ fetchProjectFiles completed")
            } catch (err) {
                console.error("1. ✗ fetchProjectFiles failed:", err)
            }

            try {
                console.log("2. Starting fetchProjectReports")
                await fetchProjectReports(defaultProjectID)
                console.log("2. ✓ fetchProjectReports completed")
            } catch (err) {
                console.error("2. ✗ fetchProjectReports failed:", err)
            }

            try {
                console.log("3. Starting fetchProjectChats")
                await fetchProjectChats(defaultProjectID)
                console.log("3. ✓ fetchProjectChats completed")
            } catch (err) {
                console.error("3. ✗ fetchProjectChats failed:", err)
            }
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

        // Clear existing content
        sourceContainer.innerHTML = '';

        for (let file of data.files) {
            const fileElement = createFileItem(`${file.documentName}.${file.documentExt}`, file.documentID);

            // Create a container div for this React element
            const wrapper = document.createElement('div');
            sourceContainer.appendChild(wrapper);

            const root = ReactDOM.createRoot(wrapper);
            root.render(fileElement);
        }

        const noSourceLabel = document.getElementById("p-label-source-no-entry")
        if (noSourceLabel) {
            noSourceLabel.style.display = data.files.length > 0 ? "none" : "block"
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
        for (let report of data.reports) {
            const reportEntry = document.createElement('p');
            reportEntry.innerHTML = `${report.reportName}`
            reportContainer.append(reportEntry);
        }
    }
}

async function fetchProjectChats(projectID) {
    console.log("ProjectID:", projectID)
    const chatHistoryContainer = document.getElementById("div-chat-history-list");
    chatHistoryContainer.innerHTML = '';

    let data = null;

    try {
        const response = await fetch('/api/agent/all-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectID: projectID
            })
        });

        console.log("Response status:", response.status)
        console.log("Response ok:", response.ok)

        if (response.ok) {
            data = await response.json()

            if (data.chats) {
                console.log("Number of chats:", data.chats.length)

                for (let chat of data.chats) {
                    const chatHistoryElement = createChatHistoryItem(chat.threadName, chat.chatID)

                    const wrapper = document.createElement('div');
                    chatHistoryContainer.appendChild(wrapper);

                    const root = ReactDOM.createRoot(wrapper);
                    root.render(chatHistoryElement);
                }
            }
        } else {
            console.error("Response not OK:", response.status, response.statusText)
            const errorText = await response.text()
            console.error("Error response:", errorText)
        }

    } catch (error) {
        console.error("Error:", error)
    } finally {
        const noChatHistoryLabel = document.getElementById("p-label-chat-history-no-entry")
        if (noChatHistoryLabel) {
            noChatHistoryLabel.style.display = (data && data.chats && data.chats.length > 0) ? "none" : "block"
        }
    }
}

// Create a function that returns a React element for a file item
function createFileItem(fileName, documentID) {
    return React.createElement('div', {
            className: 'sidebar-items',
            'data-document-id': documentID,
            style: {
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '5px',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            },
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: (e) => {
                // Prevent the div click when clicking the checkbox
                if (e.target.type !== 'checkbox') {
                    console.log(`Clicked on ${fileName}`);
                }
            }
        },
        React.createElement('input', {
            type: 'checkbox',
            style: {
                width: "16px",
                height: "16px",
                flexShrink: 0  // Prevent checkbox from shrinking
            },
            onChange: (e) => {
                console.log(`Checkbox ${e.target.checked ? 'checked' : 'unchecked'} for ${fileName}`);
                // Add your checkbox handler here
            },
            onClick: (e) => {
                e.stopPropagation(); // Prevent triggering the div's onClick
            }
        }),
        React.createElement('p', {
            style: {
                flexGrow: 1,
                margin: 0,  // Remove default paragraph margins
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'  // Prevent wrapping, show ellipsis instead
            }
        }, fileName),
        React.createElement('img', {
            style: {
                padding: "4px",
                flexShrink: 0,
                borderRadius: '5px',
                transition: 'background-color 0.2s',
            },
            src: './img/more_vert_24.svg',
            alt: '',
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = '#8e8e8e';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: (e) => {
                // Prevent the div click when clicking the checkbox
                if (e.target.type !== 'checkbox') {
                    console.log(`Clicked on ${fileName}`);
                }
            }
        })
    );
}

function createChatHistoryItem(chatThreadName, chatID) {
    return React.createElement('div', {
            className: 'sidebar-items',
            'data-chat-id': chatID,
            style: {
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '5px',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            },
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: (e) => {
                // Prevent the div click when clicking the checkbox
                if (e.target.type !== 'checkbox') {
                    console.log(`Clicked on ${chatThreadName}`);
                }
            }
        },
        React.createElement('p', {
            style: {
                flexGrow: 1,
                margin: 0,  // Remove default paragraph margins
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'  // Prevent wrapping, show ellipsis instead
            }
        }, chatThreadName),
        React.createElement('img', {
            style: {
                padding: "4px",
                flexShrink: 0,
                borderRadius: '5px',
                transition: 'background-color 0.2s',
            },
            src: './img/more_vert_24.svg',
            alt: '',
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = '#8e8e8e';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: (e) => {
                // Prevent the div click when clicking the checkbox
                if (e.target.type !== 'checkbox') {
                    console.log(`Clicked on ${chatThreadName}`);
                }
            }
        })
    );
}


// Make available globally
window.TempHome = TempHome;
