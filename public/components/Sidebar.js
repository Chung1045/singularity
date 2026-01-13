(function () {
    const {useState} = React;

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

        // Add state for avatar URL
        const [avatarUrl, setAvatarUrl] = useState('./img/user.svg');

        // Add state for create project modal
        const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
        const [newProjectName, setNewProjectName] = useState('');
        const [showSuccessNotification, setShowSuccessNotification] = useState(false);
        const [successMessage, setSuccessMessage] = useState('');
        const [showErrorNotification, setShowErrorNotification] = useState(false);
        const [errorMessage, setErrorMessage] = useState('');

        // Add state for selected project (persisted in localStorage)
        const [selectedProjectID, setSelectedProjectID] = useState(() => {
            return localStorage.getItem('selectedProjectID') || null;
        });

        // Fetch projects from API and populate dropdown
        const fetchProjects = React.useCallback(async () => {
            console.log("Fetching projects...");
            try {
                const response = await fetch('/api/project/list', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`Project Data: ${JSON.stringify(data)}`);

                    if (data.projects && data.projects.length > 0) {
                        populateProjectDropdown(data.projects);

                        // Return the project ID to use (saved or first)
                        const savedProjectID = localStorage.getItem('selectedProjectID');
                        const projectExists = data.projects.some(p => p.projectID === savedProjectID);
                        const defaultProjectID = (savedProjectID && projectExists)
                            ? savedProjectID
                            : data.projects[0]?.projectID;

                        return defaultProjectID;
                    } else {
                        console.warn("No projects found");
                        populateProjectDropdown([]);
                        return null;
                    }
                } else {
                    console.error("Failed to fetch projects:", response.status);
                    return null;
                }
            } catch (error) {
                console.error("Error fetching projects:", error);
                return null;
            }
        }, []);

        // Populate the project dropdown with projects
        const populateProjectDropdown = React.useCallback((projects) => {
            const dropdown = document.getElementById('select-project-drop-down');

            if (!dropdown) {
                console.warn("Project dropdown not found in DOM");
                return;
            }

            if (!projects || projects.length === 0) {
                dropdown.innerHTML = '<option value="">No projects available</option>';
                return;
            }

            const savedProjectID = localStorage.getItem('selectedProjectID');
            const projectExists = projects.some(p => p.projectID === savedProjectID);
            const selectedID = (savedProjectID && projectExists) ? savedProjectID : projects[0]?.projectID;

            const options = projects.map((project) =>
                `<option value="${project.projectID}" ${project.projectID === selectedID ? 'selected' : ''}>${project.projectName}</option>`
            ).join('');

            dropdown.innerHTML = options;

            // Update state and trigger change event if we have a selected project
            if (selectedID) {
                setSelectedProjectID(selectedID);
                dropdown.value = selectedID;
                dropdown.dispatchEvent(new Event('change'));
            }
        }, []);

        // Load projects when component mounts and restore selected project
        React.useEffect(() => {
            const loadProjectsAndHistory = async () => {
                const projectID = await fetchProjects();

                // Wait a bit to ensure DOM is fully rendered
                setTimeout(async () => {
                    // If we have a project ID and fetchProjectChats is available, load the chat history
                    if (projectID && typeof window.fetchProjectChats === 'function') {
                        console.log('Loading chat history for project:', projectID);
                        await window.fetchProjectChats(projectID);
                    }

                    // Also load files and reports if available
                    if (projectID && typeof window.fetchProjectFiles === 'function') {
                        console.log('Loading files for project:', projectID);
                        await window.fetchProjectFiles(projectID);
                    }

                    if (projectID && typeof window.fetchProjectReports === 'function') {
                        console.log('Loading reports for project:', projectID);
                        await window.fetchProjectReports(projectID);
                    }
                }, 100);
            };

            loadProjectsAndHistory();
        }, [fetchProjects]);

        // Make fetchProjects available globally for create project button
        React.useEffect(() => {
            window.fetchProjects = fetchProjects;
            return () => {
                delete window.fetchProjects;
            };
        }, [fetchProjects]);

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

        const showError = (message) => {
            setErrorMessage(message);
            setShowErrorNotification(true);
            setTimeout(() => {
                setShowErrorNotification(false);
            }, 3000);
        };

        const showSuccess = (message) => {
            setSuccessMessage(message);
            setShowSuccessNotification(true);
            setTimeout(() => {
                setShowSuccessNotification(false);
            }, 3000);
        };

        const handleCreateProject = async () => {
            if (!newProjectName.trim()) {
                showError('Please enter a project name');
                return;
            }

            try {
                const response = await fetch('/api/project/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectName: newProjectName.trim()
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Close modal and reset
                    setShowCreateProjectModal(false);
                    setNewProjectName('');

                    // Show success notification
                    showSuccess('Project created successfully!');

                    // Refresh the project list
                    if (typeof fetchProjects === 'function') {
                        await fetchProjects();
                    }
                } else {
                    showError(data.message || 'Failed to create project');
                }
            } catch (error) {
                console.error('Error creating project:', error);
                showError('Error creating project');
            }
        };

        const handleSkipCreateProject = () => {
            setShowCreateProjectModal(false);
            setNewProjectName('');
        };

        // Fetch avatar URL on component mount
        React.useEffect(() => {
            async function fetchAvatar() {
                try {
                    let response = await fetch('/api/profile-pic/fetch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({})
                    });

                    let profileImgData = await response.json();

                    if (profileImgData.success && profileImgData.data) {
                        const imageData = profileImgData.data[0]?.image;
                        if (imageData) {
                            setAvatarUrl(imageData);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching avatar:', error);
                    // Keep default avatar on error
                }
            }

            fetchAvatar();
        }, []); // Empty dependency array means this runs once on mount

        return React.createElement('aside', {
                id: 'sidebar',
                className: 'side-bar',
                'aria-label': 'Sidebar navigation'
            },
            React.createElement('nav', null,
                // Icon at top

                React.createElement('div', {
                        style: {
                            display: "flex"
                        }
                    },
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
                            className: 'union',
                            src: './img/union.svg',
                            alt: 'Singularity Icon'
                        }),
                    )
                ),

                // Project dropdown and create button container
                React.createElement('div', {
                    style: {
                        display: !sidebarCollapsed ? 'flex' : 'none',
                        alignItems: 'center',
                        gap: '10px',
                        marginLeft: '21px',
                        marginRight: '21px',
                        marginBottom: '15px'
                    }
                },
                    // Project dropdown
                    React.createElement('select', {
                        id: "select-project-drop-down",
                        style: {
                            position: 'relative',
                            flex: '1',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1.67px solid #e4e4e4',
                            cursor: 'pointer',
                            transition: 'all 220ms ease',
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#1c1d21',
                            backgroundColor: 'transparent'
                        },
                        onChange: async (e) => {
                            const projectID = e.target.value;
                            console.log('Project dropdown changed to:', projectID);

                            // Save selected project to localStorage and state
                            localStorage.setItem('selectedProjectID', projectID);
                            setSelectedProjectID(projectID);

                            // Only call these functions if they exist (Home page specific)
                            if (typeof fetchProjectFiles === 'function') {
                                console.log('Calling fetchProjectFiles...');
                                await fetchProjectFiles(projectID);
                            } else {
                                console.log('fetchProjectFiles not available on this page');
                            }
                            if (typeof fetchProjectReports === 'function') {
                                console.log('Calling fetchProjectReports...');
                                await fetchProjectReports(projectID);
                            } else {
                                console.log('fetchProjectReports not available on this page');
                            }
                            if (typeof fetchProjectChats === 'function') {
                                console.log('Calling fetchProjectChats...');
                                await fetchProjectChats(projectID);
                            } else {
                                console.log('fetchProjectChats not available on this page');
                            }
                        },
                        onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                        onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
                    }),

                    // Create project button
                    React.createElement('button', {
                        id: 'btn-create-project',
                        type: 'button',
                        'aria-label': 'Create new project',
                        onClick: () => setShowCreateProjectModal(true),
                        style: {
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1.67px solid #e4e4e4',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            transition: 'all 220ms ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px'
                        },
                        onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                        onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
                    },
                        React.createElement('img', {
                            src: './img/add_2_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                            alt: 'Create project',
                            style: {
                                width: '20px',
                                height: '20px'
                            }
                        })
                    )
                ),

                // Search bar
                React.createElement('form', {
                        id: 'sidebar-search',
                        className: 'search-file-field',
                        role: 'search',
                        'aria-label': 'Search files',
                        style: {marginBottom: '20px'}
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

// Scrollable wrapper for the three sections
                React.createElement('div', {
                        className: 'sidebar-scrollable-content',
                        id: 'sidebar-scrollable-wrapper'
                    },
                    // History section with dropdown
                    React.createElement('div', {
                            id: 'sidebar-history-wrapper',
                            style: {marginBottom: '10px'}
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
                        React.createElement('div', {
                                id: 'div-chat-history-submenu',
                                style: {
                                    paddingLeft: '40px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    display: historyExpanded && !sidebarCollapsed ? 'block' : 'none'
                                }
                            },
                            React.createElement('div', {
                                id: "div-chat-history-list",
                                style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "5px"
                                }
                            }),
                            React.createElement('p', {
                                id: "p-label-chat-history-no-entry",
                                style: {
                                    fontSize: '14px',
                                    color: '#666'
                                }
                            }, 'Chat history is empty.')
                        )
                    ),

                    // Source section with dropdown
                    React.createElement('div', {
                            id: 'sidebar-source-wrapper',
                            style: {marginBottom: '10px'}
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
                        React.createElement('div', {
                                id: 'source-submenu',
                                style: {
                                    paddingLeft: '40px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    display: sourceExpanded && !sidebarCollapsed ? 'block' : 'none'
                                }
                            },
                            React.createElement('div', {
                                id: "div-project-source-list",
                                style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "5px"
                                }
                            }),
                            React.createElement('p', {
                                id: "p-label-source-no-entry",
                                style: {
                                    fontSize: '14px',
                                    color: '#666'
                                }
                            }, 'No source yet.')
                        )
                    ),

                    // Requirements List section with dropdown
                    React.createElement('div', {
                            id: 'sidebar-requirements-wrapper',
                            style: {
                                marginBottom: '10px',
                                // display: 'none'
                            }
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
                        React.createElement('div', {
                                id: 'requirements-submenu',
                                style: {
                                    paddingLeft: '40px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    display: requirementsExpanded && !sidebarCollapsed ? 'block' : 'none'
                                }
                            },
                            React.createElement('p', {
                                style: {
                                    fontSize: '14px',
                                    color: '#666'
                                }
                            }, 'No requirements yet, you can replace this to show lists')
                        )
                    )
                ),

                // Horizontal divider
                React.createElement('div', {
                        id: 'sidebar-divider-for-username-and-toggle',
                        className: 'horizontal-inset',
                        role: 'separator',
                        style: {marginBottom: '20px'}
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
                                onClick: (e) => {
                                    e.stopPropagation();
                                    onProfileRoute();
                                }
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
                                onClick: (e) => {
                                    e.stopPropagation();
                                    onLogout();
                                }
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
                                bottom: '40px',
                                background: '#ffffff',
                                padding: '5px 5px 10px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 220ms ease',
                                margin: '0 auto'
                            }
                        },
                        React.createElement('img', {
                            src: avatarUrl,
                            alt: 'User',
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
                                onClick: (e) => {
                                    e.stopPropagation();
                                    onProfileRoute();
                                }
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
                                onClick: (e) => {
                                    e.stopPropagation();
                                    onLogout();
                                }
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
                        style: {marginBottom: '20px'}
                    },
                    React.createElement('img', {
                        src: './img/double-arrow-right-svgrepo-com.svg',
                        alt: 'Toggle sidebar',
                        style: {width: '24px', height: '24px'}
                    })
                )
            ),

            // Create Project Modal
            showCreateProjectModal && React.createElement('div', {
                id: 'create-new-project-modal',
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
                    zIndex: 10000
                },
                onClick: handleSkipCreateProject
            },
                React.createElement('div', {
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '15px',
                        padding: '30px',
                        minWidth: '400px',
                        maxWidth: '500px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                    },
                    onClick: (e) => e.stopPropagation()
                },
                    // Modal Header
                    React.createElement('h2', {
                        style: {
                            margin: '0 0 10px 0',
                            fontSize: '24px',
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: '600',
                            color: '#1c1d21'
                        }
                    }, 'Create New Project'),

                    // Modal Description
                    React.createElement('p', {
                        style: {
                            margin: '0 0 20px 0',
                            fontSize: '14px',
                            fontFamily: 'Inter, Helvetica',
                            color: '#666666'
                        }
                    }, 'Enter a name for your new project or skip to create it later.'),

                    // Input Field
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Project Name',
                        value: newProjectName,
                        onChange: (e) => setNewProjectName(e.target.value),
                        onKeyPress: (e) => {
                            if (e.key === 'Enter') {
                                handleCreateProject();
                            }
                        },
                        style: {
                            width: '100%',
                            padding: '12px 14px',
                            marginBottom: '20px',
                            borderRadius: '10px',
                            border: '1.67px solid #e4e4e4',
                            fontSize: '14px',
                            fontFamily: 'Inter, Helvetica',
                            boxSizing: 'border-box',
                            outline: 'none'
                        }
                    }),

                    // Button Container
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end'
                        }
                    },
                        // Skip Button
                        React.createElement('button', {
                            onClick: handleSkipCreateProject,
                            style: {
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: '1.67px solid #e4e4e4',
                                backgroundColor: 'transparent',
                                color: '#666666',
                                fontSize: '14px',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                            onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
                        }, 'Skip'),

                        // Create Button
                        React.createElement('button', {
                            onClick: handleCreateProject,
                            style: {
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#1c1d21',
                                color: '#ffffff',
                                fontSize: '14px',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#2c2d31',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#1c1d21'
                        }, 'Create Project')
                    )
                )
            ),

            // Success Notification
            showSuccessNotification && React.createElement('div', {
                style: {
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#4CAF50',
                    color: '#ffffff',
                    padding: '16px 24px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 10001,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontFamily: 'Inter, Helvetica',
                    fontSize: '14px',
                    fontWeight: '500',
                    animation: 'slideInRight 0.3s ease-out'
                }
            },
                // Success icon (checkmark)
                React.createElement('span', {
                    style: {
                        fontSize: '20px',
                        fontWeight: 'bold'
                    }
                }, '✓'),

                // Success message
                React.createElement('span', null, successMessage)
            ),

            // Error Notification
            showErrorNotification && React.createElement('div', {
                style: {
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#f44336',
                    color: '#ffffff',
                    padding: '16px 24px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 10001,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontFamily: 'Inter, Helvetica',
                    fontSize: '14px',
                    fontWeight: '500',
                    animation: 'slideInRight 0.3s ease-out'
                }
            },
                // Error icon (X)
                React.createElement('span', {
                    style: {
                        fontSize: '20px',
                        fontWeight: 'bold'
                    }
                }, '✕'),

                // Error message
                React.createElement('span', null, errorMessage)
            )
        );
    };

    // Make available globally
    window.Sidebar = Sidebar;
})();
