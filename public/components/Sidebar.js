(function () {
    const {useState, useEffect, useRef, useCallback} = React;
    
    // Project Options Button Component
    const ProjectOptionsButton = ({selectedProjectID, projects, onProjectDeleted, onProjectRenamed}) => {
        const [menuOpen, setMenuOpen] = useState(false);
        const menuRef = useRef(null);
        
        // Close menu when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (menuRef.current && !menuRef.current.contains(event.target)) {
                    setMenuOpen(false);
                }
            };
            
            if (menuOpen) {
                document.addEventListener('mousedown', handleClickOutside);
            }
            
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [menuOpen]);
        
        const currentProject = projects.find(p => p.projectID === selectedProjectID);
        
        const handleRename = async () => {
            setMenuOpen(false);
            
            // Rename modal
            const newName = await new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    padding: 20px;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background-color: #ffffff;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                `;

                modalContent.innerHTML = `
                    <div style="
                        font-family: Urbanist, Helvetica;
                        font-weight: 700;
                        font-size: 24px;
                        color: #000000;
                        line-height: normal;
                    ">Rename Project</div>
                    <div style="
                        font-family: Inter, Helvetica;
                        font-weight: 400;
                        font-size: 16px;
                        color: #000000;
                        line-height: 1.5;
                    ">Enter a new name for "${currentProject?.projectName}":</div>
                    <input type="text" id="project-rename-input" value="${currentProject?.projectName || ''}" style="
                        width: 100%;
                        padding: 12px;
                        border: 1.67px solid #e4e4e4;
                        border-radius: 10px;
                        font-family: Inter, Helvetica;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                    <div style="
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                        margin-top: 10px;
                    ">
                        <button id="cancel-rename-btn" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: 1px solid #e0e0e0;
                            background-color: #ffffff;
                            color: #000000;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Cancel</button>
                        <button id="save-rename-btn" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: none;
                            background-color: #000000;
                            color: #ffffff;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Save</button>
                    </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                const saveBtn = modalContent.querySelector('#save-rename-btn');
                const cancelBtn = modalContent.querySelector('#cancel-rename-btn');
                const input = modalContent.querySelector('#project-rename-input');

                saveBtn.addEventListener('mouseenter', () => {
                    saveBtn.style.backgroundColor = '#333333';
                });
                saveBtn.addEventListener('mouseleave', () => {
                    saveBtn.style.backgroundColor = '#000000';
                });

                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.backgroundColor = '#f5f5f5';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.backgroundColor = '#ffffff';
                });

                saveBtn.addEventListener('click', () => {
                    const value = input.value.trim();
                    document.body.removeChild(modal);
                    resolve(value);
                });

                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(null);
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                        resolve(null);
                    }
                });

                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                // Handle Enter key
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const value = input.value.trim();
                        document.body.removeChild(modal);
                        resolve(value);
                    }
                });

                // Focus input and select text
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 100);
            });

            if (!newName || newName === currentProject?.projectName) {
                return;
            }
            
            try {
                const response = await fetch('/api/project/rename', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectID: selectedProjectID,
                        newProjectName: newName
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Show success modal
                    const successModal = document.createElement('div');
                    successModal.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10001;
                        padding: 20px;
                    `;

                    const successContent = document.createElement('div');
                    successContent.style.cssText = `
                        background-color: #ffffff;
                        border-radius: 15px;
                        padding: 30px;
                        max-width: 500px;
                        width: 100%;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    `;

                    successContent.innerHTML = `
                        <div style="
                            font-family: Urbanist, Helvetica;
                            font-weight: 700;
                            font-size: 24px;
                            color: #000000;
                            line-height: normal;
                        ">Rename Successful</div>
                        <div style="
                            font-family: Inter, Helvetica;
                            font-weight: 400;
                            font-size: 14px;
                            color: #000000;
                            line-height: 1.4;
                        ">Project renamed successfully.</div>
                        <div style="
                            display: flex;
                            justify-content: flex-end;
                        ">
                            <button id="rename-success-ok-btn" style="
                                padding: 12px 32px;
                                border-radius: 10px;
                                border: none;
                                background-color: #000000;
                                color: #ffffff;
                                font-family: Urbanist, Helvetica;
                                font-weight: 600;
                                font-size: 16px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                white-space: nowrap;
                            ">OK</button>
                        </div>
                    `;

                    successModal.appendChild(successContent);
                    document.body.appendChild(successModal);

                    const okBtn = successContent.querySelector('#rename-success-ok-btn');

                    okBtn.addEventListener('mouseenter', () => {
                        okBtn.style.backgroundColor = '#333333';
                    });
                    okBtn.addEventListener('mouseleave', () => {
                        okBtn.style.backgroundColor = '#000000';
                    });

                    const closeAndRefresh = () => {
                        if (document.body.contains(successModal)) {
                            document.body.removeChild(successModal);
                        }
                        onProjectRenamed();
                    };

                    okBtn.addEventListener('click', closeAndRefresh);

                    // Auto-close after 3 seconds
                    setTimeout(closeAndRefresh, 3000);
                } else {
                    alert('Failed to rename project: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error renaming project:', error);
                alert('An error occurred while renaming the project.');
            }
        };
        
        const handleDelete = async () => {
            setMenuOpen(false);
            
            // First confirmation modal - Warning
            const firstConfirm = await new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    padding: 20px;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background-color: #ffffff;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                `;

                modalContent.innerHTML = `
                    <div style="
                        font-family: Urbanist, Helvetica;
                        font-weight: 700;
                        font-size: 24px;
                        color: #000000;
                        line-height: normal;
                    ">Warning</div>
                    <div style="
                        font-family: Inter, Helvetica;
                        font-weight: 400;
                        font-size: 16px;
                        color: #000000;
                        line-height: 1.5;
                    ">Are you sure you want to delete "${currentProject?.projectName}"?<br><br>
                    This will permanently delete:<br>
                    • All chat history<br>
                    • All uploaded documents<br>
                    • All requirements and user stories<br>
                    • All generated reports<br><br>
                    This action CANNOT be undone!</div>
                    <div style="
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                        margin-top: 10px;
                    ">
                        <button id="cancel-btn" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: 1px solid #e0e0e0;
                            background-color: #ffffff;
                            color: #000000;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Cancel</button>
                        <button id="continue-btn" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: none;
                            background-color: #000000;
                            color: #ffffff;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Continue</button>
                    </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                const continueBtn = modalContent.querySelector('#continue-btn');
                const cancelBtn = modalContent.querySelector('#cancel-btn');

                continueBtn.addEventListener('mouseenter', () => {
                    continueBtn.style.backgroundColor = '#333333';
                });
                continueBtn.addEventListener('mouseleave', () => {
                    continueBtn.style.backgroundColor = '#000000';
                });

                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.backgroundColor = '#f5f5f5';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.backgroundColor = '#ffffff';
                });

                continueBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(true);
                });

                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(false);
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                        resolve(false);
                    }
                });

                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });

            if (!firstConfirm) return;

            // Second confirmation modal - Type project name
            const secondConfirm = await new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    padding: 20px;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background-color: #ffffff;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                `;

                modalContent.innerHTML = `
                    <div style="
                        font-family: Urbanist, Helvetica;
                        font-weight: 700;
                        font-size: 24px;
                        color: #000000;
                        line-height: normal;
                    ">Final Confirmation</div>
                    <div style="
                        font-family: Inter, Helvetica;
                        font-weight: 400;
                        font-size: 16px;
                        color: #000000;
                        line-height: 1.5;
                    ">Type the project name to confirm deletion:<br><br>
                    <strong>${currentProject?.projectName}</strong></div>
                    <input type="text" id="project-name-input" placeholder="Type project name here" style="
                        width: 100%;
                        padding: 12px;
                        border: 1.67px solid #e4e4e4;
                        border-radius: 10px;
                        font-family: Inter, Helvetica;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                    <div style="
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                        margin-top: 10px;
                    ">
                        <button id="cancel-btn-2" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: 1px solid #e0e0e0;
                            background-color: #ffffff;
                            color: #000000;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Cancel</button>
                        <button id="delete-btn" style="
                            padding: 12px 24px;
                            border-radius: 10px;
                            border: none;
                            background-color: #000000;
                            color: #ffffff;
                            font-family: Urbanist, Helvetica;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            opacity: 0.5;
                            pointer-events: none;
                        ">Delete</button>
                    </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                const deleteBtn = modalContent.querySelector('#delete-btn');
                const cancelBtn = modalContent.querySelector('#cancel-btn-2');
                const input = modalContent.querySelector('#project-name-input');

                // Enable delete button only when project name matches
                input.addEventListener('input', (e) => {
                    if (e.target.value === currentProject?.projectName) {
                        deleteBtn.style.opacity = '1';
                        deleteBtn.style.pointerEvents = 'auto';
                    } else {
                        deleteBtn.style.opacity = '0.5';
                        deleteBtn.style.pointerEvents = 'none';
                    }
                });

                deleteBtn.addEventListener('mouseenter', () => {
                    if (input.value === currentProject?.projectName) {
                        deleteBtn.style.backgroundColor = '#333333';
                    }
                });
                deleteBtn.addEventListener('mouseleave', () => {
                    deleteBtn.style.backgroundColor = '#000000';
                });

                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.backgroundColor = '#f5f5f5';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.backgroundColor = '#ffffff';
                });

                deleteBtn.addEventListener('click', () => {
                    if (input.value === currentProject?.projectName) {
                        document.body.removeChild(modal);
                        resolve(true);
                    }
                });

                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(false);
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                        resolve(false);
                    }
                });

                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                // Focus input
                setTimeout(() => input.focus(), 100);
            });

            if (!secondConfirm) return;

            try {
                const response = await fetch('/api/project/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectID: selectedProjectID
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Show success modal
                    const successModal = document.createElement('div');
                    successModal.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10001;
                        padding: 20px;
                    `;

                    const successContent = document.createElement('div');
                    successContent.style.cssText = `
                        background-color: #ffffff;
                        border-radius: 15px;
                        padding: 30px;
                        max-width: 500px;
                        width: 100%;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    `;

                    successContent.innerHTML = `
                        <div style="
                            font-family: Urbanist, Helvetica;
                            font-weight: 700;
                            font-size: 24px;
                            color: #000000;
                            line-height: normal;
                        ">Delete Successful</div>
                        <div style="
                            font-family: Inter, Helvetica;
                            font-weight: 400;
                            font-size: 14px;
                            color: #000000;
                            line-height: 1.4;
                        ">Project successfully deleted.</div>
                        <div style="
                            display: flex;
                            justify-content: flex-end;
                        ">
                            <button id="success-ok-btn" style="
                                padding: 12px 32px;
                                border-radius: 10px;
                                border: none;
                                background-color: #000000;
                                color: #ffffff;
                                font-family: Urbanist, Helvetica;
                                font-weight: 600;
                                font-size: 16px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                white-space: nowrap;
                            ">OK</button>
                        </div>
                    `;

                    successModal.appendChild(successContent);
                    document.body.appendChild(successModal);

                    const okBtn = successContent.querySelector('#success-ok-btn');

                    okBtn.addEventListener('mouseenter', () => {
                        okBtn.style.backgroundColor = '#333333';
                    });
                    okBtn.addEventListener('mouseleave', () => {
                        okBtn.style.backgroundColor = '#000000';
                    });

                    const closeAndReload = () => {
                        if (document.body.contains(successModal)) {
                            document.body.removeChild(successModal);
                        }

                        // Clear localStorage
                        localStorage.removeItem('selectedProjectID');
                        localStorage.removeItem('activeChatID');
                        localStorage.removeItem('activeChatProjectID');

                        // Clear URL parameters (remove chatID)
                        const currentUrl = new URL(window.location);
                        currentUrl.searchParams.delete('chatID');

                        // Redirect to clean URL (without chatID)
                        window.location.href = currentUrl.pathname;
                    };

                    okBtn.addEventListener('click', closeAndReload);

                    // Auto-reload after 5 seconds
                    setTimeout(closeAndReload, 5000);
                } else {
                    alert('Failed to delete project: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error deleting project:', error);
                alert('An error occurred while deleting the project.');
            }
        };
        
        if (!selectedProjectID || !currentProject) {
            return null;
        }
        
        return React.createElement('div', {
            ref: menuRef,
            style: {
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
            }
        },
            React.createElement('button', {
                type: 'button',
                'aria-label': 'Project options',
                onClick: (e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                },
                style: {
                    padding: '6px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s'
                },
                onMouseEnter: (e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            },
                React.createElement('img', {
                    src: './img/more_vert_24.svg',
                    alt: 'Options',
                    style: {
                        width: '20px',
                        height: '20px'
                    }
                })
            ),
            
            menuOpen && React.createElement('div', {
                style: {
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#ffffff',
                    border: '1.67px solid #e4e4e4',
                    borderRadius: '11.12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    minWidth: '160px',
                    zIndex: 1000,
                    overflow: 'hidden'
                }
            },
                // Rename option
                React.createElement('button', {
                    style: {
                        width: '100%',
                        padding: '12px 14.5px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13.3px',
                        color: '#1c1d21',
                        fontWeight: '400',
                        fontFamily: '"Inter", Helvetica',
                        transition: 'background-color 0.2s ease',
                        borderBottom: '1px solid #f0f0f0'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    },
                    onClick: (e) => {
                        e.stopPropagation();
                        handleRename();
                    }
                }, 'Rename'),
                // Delete option
                React.createElement('button', {
                    style: {
                        width: '100%',
                        padding: '12px 14.5px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13.3px',
                        color: '#c1281e',
                        fontWeight: '500',
                        fontFamily: '"Inter", Helvetica',
                        transition: 'background-color 0.2s ease'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    },
                    onClick: (e) => {
                        e.stopPropagation();
                        handleDelete();
                    }
                }, 'Delete')
            )
        );
    };

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
        // Persist sidebar section states in localStorage
        const [historyExpanded, setHistoryExpanded] = useState(() => {
            const saved = localStorage.getItem('historyExpanded');
            return saved !== null ? JSON.parse(saved) : false;
        });
        const [sourceExpanded, setSourceExpanded] = useState(() => {
            const saved = localStorage.getItem('sourceExpanded');
            return saved !== null ? JSON.parse(saved) : false;
        });
        const [requirementsExpanded, setRequirementsExpanded] = useState(() => {
            const saved = localStorage.getItem('requirementsExpanded');
            return saved !== null ? JSON.parse(saved) : false;
        });

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

        // Expose getCurrentProjectID globally
        useEffect(() => {
            window.getCurrentProjectID = () => selectedProjectID;
            return () => {
                delete window.getCurrentProjectID;
            };
        }, [selectedProjectID]);

        // Add state to track if projects exist
        const [hasProjects, setHasProjects] = useState(false);

        // Add state to store projects array
        const [projects, setProjects] = useState([]);

        // Fetch projects from API and populate dropdown
        const fetchProjects = useCallback(async () => {
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
                        setHasProjects(true);
                        setProjects(data.projects);
                        populateProjectDropdown(data.projects);

                        const savedProjectID = localStorage.getItem('selectedProjectID');
                        const projectExists = data.projects.some(p => p.projectID === savedProjectID);
                        const defaultProjectID = (savedProjectID && projectExists)
                            ? savedProjectID
                            : data.projects[0]?.projectID;

                        return defaultProjectID;
                    } else {
                        console.warn("No projects found");
                        setHasProjects(false);
                        setProjects([]);
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
        const populateProjectDropdown = useCallback((projects) => {
            const dropdown = document.getElementById('select-project-drop-down');

            if (!dropdown) {
                console.warn("Project dropdown not found in DOM");
                return;
            }

            if (!projects || projects.length === 0) {
                dropdown.innerHTML = '<option value="">No projects available</option>';

                // Clear selected project when no projects exist
                setSelectedProjectID(null);
                localStorage.removeItem('selectedProjectID');
                console.log('Cleared selectedProjectID because no projects exist');

                return;
            }

            const savedProjectID = localStorage.getItem('selectedProjectID');
            const projectExists = projects.some(p => p.projectID === savedProjectID);
            const selectedID = (savedProjectID && projectExists) ? savedProjectID : projects[0]?.projectID;

            // Clear invalid saved project ID
            if (savedProjectID && !projectExists) {
                localStorage.removeItem('selectedProjectID');
                console.log('Cleared invalid selectedProjectID from localStorage');
            }

            const options = projects.map((project) =>
                `<option value="${project.projectID}" ${project.projectID === selectedID ? 'selected' : ''}>${project.projectName}</option>`
            ).join('');

            dropdown.innerHTML = options;

            if (selectedID) {
                setSelectedProjectID(selectedID);
                dropdown.value = selectedID;
                dropdown.dispatchEvent(new Event('change'));
            }
        }, []);

        // Load projects when component mounts and restore selected project
        useEffect(() => {
            const loadProjectsAndHistory = async () => {
                const projectID = await fetchProjects();

                if (!projectID) {
                    console.log('No project ID available, skipping history load');
                    return;
                }

                const waitForFunction = (funcName, maxAttempts = 50, delayMs = 100) => {
                    return new Promise((resolve) => {
                        let attempts = 0;
                        const interval = setInterval(() => {
                            if (typeof window[funcName] === 'function') {
                                clearInterval(interval);
                                resolve(true);
                            } else if (attempts >= maxAttempts) {
                                clearInterval(interval);
                                console.warn(`Function ${funcName} not available after ${maxAttempts * delayMs}ms`);
                                resolve(false);
                            }
                            attempts++;
                        }, delayMs);
                    });
                };

                const functionsToWait = ['fetchProjectChats', 'fetchProjectFiles', 'fetchProjectReports'];
                await Promise.all(functionsToWait.map(func => waitForFunction(func)));

                try {
                    if (typeof window.fetchProjectChats === 'function') {
                        console.log('Loading chat history for project:', projectID);
                        await window.fetchProjectChats(projectID);
                    }

                    if (typeof window.fetchProjectFiles === 'function') {
                        console.log('Loading files for project:', projectID);
                        await window.fetchProjectFiles(projectID);
                    }

                    if (typeof window.fetchProjectReports === 'function') {
                        console.log('Loading reports for project:', projectID);
                        await window.fetchProjectReports(projectID);
                    }
                } catch (error) {
                    console.error('Error loading project data:', error);
                }
            };

            loadProjectsAndHistory();
        }, [fetchProjects]);

        // Make fetchProjects available globally for create project button
        useEffect(() => {
            window.fetchProjects = fetchProjects;
            return () => {
                delete window.fetchProjects;
            };
        }, [fetchProjects]);

        // Listen for report generation events
        useEffect(() => {
            const handleReportGenerated = (event) => {
                console.log('📑 [Sidebar] Report generated event received');
                const projectID = selectedProjectID || event.detail?.projectID;
                if (projectID && typeof window.fetchProjectReports === 'function') {
                    console.log('📑 [Sidebar] Refreshing reports list for project:', projectID);
                    window.fetchProjectReports(projectID);
                }
            };

            window.addEventListener('reportGenerated', handleReportGenerated);
            return () => {
                window.removeEventListener('reportGenerated', handleReportGenerated);
            };
        }, [selectedProjectID]);

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
                    const newProjectID = data.projectID;
                    const newProjectName = data.projectName;

                    console.log(`✅ New project created: ${newProjectName} (ID: ${newProjectID})`);

                    setShowCreateProjectModal(false);
                    setNewProjectName('');

                    showSuccess('Project created successfully!');

                    setHasProjects(true);

                    window.currentChatID = null;
                    localStorage.removeItem('activeChatID');
                    localStorage.removeItem('activeChatProjectID');
                    localStorage.setItem('wentBackToInitial', 'true');

                    window.pendingChatRestoration = null;

                    const currentUrl = new URL(window.location);
                    if (currentUrl.searchParams.has('chatID')) {
                        currentUrl.searchParams.delete('chatID');
                        window.history.replaceState({}, '', currentUrl);
                        console.log('[URL] Removed chatID from URL due to new project creation');
                    }

                    if (typeof window.backToInitialScreen === 'function') {
                        window.backToInitialScreen();
                    } else {
                        const chatInterface = document.getElementById('chat-interface');
                        const chatTopBar = document.getElementById('chat-top-bar');
                        if (chatInterface) chatInterface.style.display = 'none';
                        if (chatTopBar) chatTopBar.style.display = 'none';
                    }

                    localStorage.setItem('selectedProjectID', newProjectID);
                    setSelectedProjectID(newProjectID);
                    console.log(`📌 Auto-selecting new project: ${newProjectID}`);

                    // Expand Source section for new project
                    setSourceExpanded(true);
                    localStorage.setItem('sourceExpanded', JSON.stringify(true));
                    console.log(`📂 Expanded Source section for new project`);

                    window.skipProjectDataLoad = true;

                    const clearSidebarLists = () => {
                        console.log('🧹 Clearing sidebar lists for new empty project...');

                        const chatHistoryList = document.getElementById('div-chat-history-list');
                        const noChatLabel = document.getElementById('p-label-chat-history-no-entry');

                        const sourceList = document.getElementById('div-project-source-list');
                        const noSourceLabel = document.getElementById('p-label-source-no-entry');

                        const requirementsList = document.getElementById('div-requirements-list');
                        const noRequirementsLabel = document.getElementById('p-label-requirements-no-entry');

                        if (chatHistoryList) {
                            chatHistoryList.innerHTML = '';
                            console.log('✅ Chat history list cleared');
                            if (noChatLabel) {
                                noChatLabel.style.display = 'block';
                            }
                        }

                        if (sourceList) {
                            sourceList.innerHTML = '';
                            console.log('✅ Source list cleared');
                            if (noSourceLabel) {
                                noSourceLabel.style.display = 'block';
                            }
                        }

                        if (requirementsList) {
                            requirementsList.innerHTML = '';
                            console.log('✅ Requirements list cleared');
                            if (noRequirementsLabel) {
                                noRequirementsLabel.style.display = 'block';
                            }
                        }
                    };

                    clearSidebarLists();
                    setTimeout(clearSidebarLists, 50);
                    setTimeout(clearSidebarLists, 200);

                    if (typeof fetchProjects === 'function') {
                        await fetchProjects();

                        const dropdown = document.getElementById('select-project-drop-down');
                        if (dropdown) {
                            dropdown.value = newProjectID;
                            console.log(`✅ Dropdown set to: ${newProjectID}`);
                        }
                    }

                    setTimeout(() => {
                        window.skipProjectDataLoad = false;
                        console.log('✅ Skip flag cleared, project data can load normally now');
                    }, 300);
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
        useEffect(() => {
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
                }
            }

            fetchAvatar();
        }, []);

        return React.createElement('aside', {
                id: 'sidebar',
                className: 'side-bar',
                'aria-label': 'Sidebar navigation'
            },
            React.createElement('nav', null,
                React.createElement('div', {
                        style: { display: "flex" }
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
                        })
                    )
                ),

                // Project dropdown and create button container
                React.createElement('div', {
                    style: {
                        display: !sidebarCollapsed ? 'flex' : 'none',
                        alignItems: 'center',
                        gap: '10px',
                        marginLeft: '21px',
                        marginRight: '25px',
                        marginBottom: '15px'
                    }
                },
                    React.createElement('div', {
                        style: {
                            position: 'relative',
                            flex: '1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    },
                        React.createElement('select', {
                            id: "select-project-drop-down",
                            style: {
                                flex: '1',
                                padding: '10px 14px',
                                paddingRight: '10px',
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

                                localStorage.setItem('selectedProjectID', projectID);
                                setSelectedProjectID(projectID);

                                window.currentChatID = null;
                                localStorage.removeItem('activeChatID');
                                localStorage.removeItem('activeChatProjectID');
                                localStorage.setItem('wentBackToInitial', 'true');

                                window.pendingChatRestoration = null;

                                const currentUrl = new URL(window.location);
                                if (currentUrl.searchParams.has('chatID')) {
                                    currentUrl.searchParams.delete('chatID');
                                    window.history.pushState({}, '', currentUrl);
                                    console.log('[URL] Removed chatID from URL due to project switch');
                                }

                                if (typeof window.backToInitialScreen === 'function') {
                                    window.backToInitialScreen();
                                } else {
                                    const chatInterface = document.getElementById('chat-interface');
                                    const chatTopBar = document.getElementById('chat-top-bar');
                                    if (chatInterface) chatInterface.style.display = 'none';
                                    if (chatTopBar) chatTopBar.style.display = 'none';
                                }

                                if (window.skipProjectDataLoad) {
                                    console.log('⏭️ Skipping project data load for new empty project');

                                    const chatHistoryList = document.getElementById('div-chat-history-list');
                                    const noChatLabel = document.getElementById('p-label-chat-history-no-entry');
                                    const sourceList = document.getElementById('div-project-source-list');
                                    const noSourceLabel = document.getElementById('p-label-source-no-entry');
                                    const requirementsList = document.getElementById('div-requirements-list');
                                    const noRequirementsLabel = document.getElementById('p-label-requirements-no-entry');

                                    if (chatHistoryList) {
                                        chatHistoryList.innerHTML = '';
                                        if (noChatLabel) noChatLabel.style.display = 'block';
                                    }
                                    if (sourceList) {
                                        sourceList.innerHTML = '';
                                        if (noSourceLabel) noSourceLabel.style.display = 'block';
                                    }
                                    if (requirementsList) {
                                        requirementsList.innerHTML = '';
                                        if (noRequirementsLabel) noRequirementsLabel.style.display = 'block';
                                    }

                                    return;
                                }

                                if (typeof fetchProjectFiles === 'function') {
                                    console.log('Calling fetchProjectFiles...');
                                    await fetchProjectFiles(projectID);
                                }
                                if (typeof fetchProjectReports === 'function') {
                                    console.log('Calling fetchProjectReports...');
                                    await fetchProjectReports(projectID);
                                }
                                if (typeof fetchProjectChats === 'function') {
                                    console.log('Calling fetchProjectChats...');
                                    await fetchProjectChats(projectID);
                                }
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                            onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
                        }),

                        hasProjects && React.createElement(ProjectOptionsButton, {
                            selectedProjectID: selectedProjectID,
                            projects: projects,
                            onProjectDeleted: () => fetchProjects(),
                            onProjectRenamed: () => fetchProjects()
                        })
                    ),

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
                            style: { width: '20px', height: '20px' }
                        })
                    )
                ),

                // New Chat Button - Only show when projects exist
                hasProjects && React.createElement('button', {
                    id: 'btn-new-chat',
                    type: 'button',
                    'aria-label': 'Create new chat',
                    onClick: () => {
                        if (typeof window.createNewChat === 'function') {
                            window.createNewChat();
                        }
                    },
                    style: {
                        display: !sidebarCollapsed ? 'flex' : 'none',
                        width: 'calc(100% - 46px)',
                        padding: '10px 14px',
                        marginLeft: '21px',
                        marginRight: '25px',
                        marginBottom: '15px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgb(30, 41, 59)',
                        cursor: 'pointer',
                        transition: 'all 220ms ease',
                        fontFamily: 'Inter, Helvetica',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)'
                    },
                    onMouseEnter: (e) => {
                        e.target.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.3)';
                    },
                    onMouseLeave: (e) => {
                        e.target.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.2)';
                    }
                },
                    React.createElement('img', {
                        src: './img/add_2_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                        alt: '',
                        style: {
                            width: '20px',
                            height: '20px',
                            position: 'absolute',
                            left: '14px',
                            filter: 'brightness(0) invert(1)'
                        }
                    }),
                    React.createElement('span', {
                        style: { flex: '1 1 0%', textAlign: 'center' }
                    }, 'New Chat')
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
                    // History section
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
                                onClick: () => {
                                    const newState = !historyExpanded;
                                    setHistoryExpanded(newState);
                                    localStorage.setItem('historyExpanded', JSON.stringify(newState));
                                }
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
                                style: { display: "flex", flexDirection: "column", gap: "5px" }
                            }),
                            React.createElement('p', {
                                id: "p-label-chat-history-no-entry",
                                style: { fontSize: '14px', color: '#666' }
                            }, 'Chat history is empty.')
                        )
                    ),

                    // Source section
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
                                onClick: () => {
                                    const newState = !sourceExpanded;
                                    setSourceExpanded(newState);
                                    localStorage.setItem('sourceExpanded', JSON.stringify(newState));
                                }
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
                            // Upload button - only when a project is selected
                            hasProjects && selectedProjectID && React.createElement('button', {
                                id: 'sidebar-source-upload-button',
                                'aria-label': 'Upload files to project',
                                onClick: async () => {
                                    console.log('[FileUpload] Sidebar upload button clicked');
                                    const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : selectedProjectID;
                                    console.log('[FileUpload] Sidebar projectID:', projectID);
                                    if (projectID) {
                                        const event = new CustomEvent('openFileUpload', { detail: { projectID } });
                                        window.dispatchEvent(event);
                                        console.log('[FileUpload] Event dispatched');
                                    }
                                },
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxSizing: 'border-box',
                                    padding: '8px 12px',
                                    backgroundColor: 'rgb(30, 41, 59)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    fontFamily: 'Inter, Helvetica',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    marginBottom: '10px',
                                    transition: 'background-color 0.2s',
                                    width: 'calc(100%)',
                                    marginLeft: '-20px'
                                },
                                onMouseEnter: (e) => {
                                    e.currentTarget.style.backgroundColor = 'rgb(51, 65, 85)';
                                },
                                onMouseLeave: (e) => {
                                    e.currentTarget.style.backgroundColor = 'rgb(30, 41, 59)';
                                }
                            },
                                React.createElement('img', {
                                    src: './img/add_2_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                                    style: { width: '16px', height: '16px', filter: 'brightness(0) invert(1)' }
                                }),
                                'Upload Files'
                            ),
                            React.createElement('div', {
                                id: "div-project-source-list",
                                style: { display: "flex", flexDirection: "column", gap: "5px" }
                            }),
                            React.createElement('p', {
                                id: "p-label-source-no-entry",
                                style: { fontSize: '14px', color: '#666' }
                            }, 'No source yet.')
                        )
                    ),

                    // Requirements section
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
                                onClick: () => {
                                    const newState = !requirementsExpanded;
                                    setRequirementsExpanded(newState);
                                    localStorage.setItem('requirementsExpanded', JSON.stringify(newState));
                                }
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
                            React.createElement('div', {
                                id: "div-requirements-list",
                                style: { display: "flex", flexDirection: "column", gap: "5px" }
                            }),
                            React.createElement('p', {
                                id: "p-label-requirements-no-entry",
                                style: { fontSize: '14px', color: '#666', display: 'block' }
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
                            React.createElement('div', {
                                    id: 'sidebar-username-collapsed',
                                    style: {
                                        borderBottom: '1px solid #d0d0d0',
                                        marginBottom: '8px',
                                        textAlign: 'left'
                                    }
                                },
                                React.createElement('div', {
                                    id: 'sidebar-username-text-collapsed',
                                    style: {
                                        fontSize: '14px',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: '600',
                                        color: '#1c1d21'
                                    }
                                }, username),
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
                            React.createElement('button', {
                                id: 'btn-logout-collapsed',
                                style: {
                                    display: 'block',
                                    width: '100%',
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
                    React.createElement('h2', {
                        style: {
                            margin: '0 0 10px 0',
                            fontSize: '24px',
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: '600',
                            color: '#1c1d21'
                        }
                    }, 'Create New Project'),
                    React.createElement('p', {
                        style: {
                            margin: '0 0 20px 0',
                            fontSize: '14px',
                            fontFamily: 'Inter, Helvetica',
                            color: '#666666'
                        }
                    }, 'Enter a name for your new project or skip to create it later.'),
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
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end'
                        }
                    },
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
                React.createElement('span', {
                    style: { fontSize: '20px', fontWeight: 'bold' }
                }, '✓'),
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
                React.createElement('span', {
                    style: { fontSize: '20px', fontWeight: 'bold' }
                }, '✕'),
                React.createElement('span', null, errorMessage)
            )
        );
    };

    // Make available globally
    window.Sidebar = Sidebar;
})();