(function () {
    const {useState, useEffect, useRef, useCallback} = React;

    /** Pages with Sidebar but no #message (e.g. profile) still need project-create feedback. */
    function injectSlideUpMessageHost() {
        if (document.getElementById('message')) return;
        if (!document.body) return;
        if (!document.querySelector('link[href*="slideUpMessage.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/stylesheets/slideUpMessage.css';
            document.head.appendChild(link);
        }
        const messageEl = document.createElement('div');
        messageEl.id = 'message';
        messageEl.className = 'hidden';

        const iconWrap = document.createElement('span');
        iconWrap.className = 'alert-icon';
        const iconImg = document.createElement('img');
        iconImg.src = '/img/Info.svg';
        iconImg.alt = '';
        iconWrap.appendChild(iconImg);

        const textEl = document.createElement('span');
        textEl.className = 'alert-text';
        textEl.id = 'messageText';

        const closeBtn = document.createElement('span');
        closeBtn.id = 'close';
        const closeImg = document.createElement('img');
        closeImg.src = '/img/close.svg';
        closeImg.alt = 'close';
        closeBtn.appendChild(closeImg);
        closeBtn.addEventListener('click', () => {
            messageEl.classList.add('hidden');
        });

        messageEl.appendChild(iconWrap);
        messageEl.appendChild(textEl);
        messageEl.appendChild(closeBtn);
        document.body.insertBefore(messageEl, document.body.firstChild);
    }

    window.injectSlideUpMessageHost = injectSlideUpMessageHost;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSlideUpMessageHost);
    } else {
        injectSlideUpMessageHost();
    }

    // Project Options Button Component
    const ProjectOptionsButton = ({selectedProjectID, projects, onProjectDeleted, onProjectRenamed}) => {
        const [menuOpen, setMenuOpen] = useState(false);
        const [showShareModal, setShowShareModal] = useState(false);
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
                modal.id = 'rename-project-modal-backdrop';
                modal.className = 'rename-project-modal-backdrop';
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
                    z-index: ${window.ZIndex?.MODAL_BACKDROP || 30};
                    padding: 20px;
                `;

                const modalContent = document.createElement('div');
                modalContent.id = 'rename-project-modal-content';
                modalContent.className = 'rename-project-modal-content';
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
                    <div class="rename-project-modal-title" style="
                        font-family: Urbanist, Helvetica;
                        font-weight: 700;
                        font-size: 24px;
                        color: #000000;
                        line-height: normal;
                    ">Rename Project</div>
                    <div class="rename-project-modal-message" style="
                        font-family: Inter, Helvetica;
                        font-weight: 400;
                        font-size: 16px;
                        color: #000000;
                        line-height: 1.5;
                    ">Enter a new name for "${currentProject?.projectName}":</div>
                    <input type="text" id="project-rename-input" class="rename-project-modal-input" value="${currentProject?.projectName || ''}" style="
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
                        <button id="cancel-rename-btn" class="rename-project-modal-cancel-btn" style="
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
                        <button id="save-rename-btn" class="rename-project-modal-save-btn" style="
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
                        'CSRF-Token': window.csrfToken
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
                    successModal.id = 'sidebar-success-modal-backdrop';
                    successModal.className = 'sidebar-success-modal-backdrop';
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
                    successContent.id = 'sidebar-success-modal-content';
                    successContent.className = 'sidebar-success-modal-content';
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
                        <div class="sidebar-success-modal-title" style="
                            font-family: Urbanist, Helvetica;
                            font-weight: 700;
                            font-size: 24px;
                            color: #000000;
                            line-height: normal;
                        ">Rename Successful</div>
                        <div class="sidebar-success-modal-message" style="
                            font-family: Inter, Helvetica;
                            font-weight: 400;
                            font-size: 14px;
                            color: #000000;
                            line-height: 1.4;
                        ">Project renamed successfully.</div>
                        <div class="sidebar-success-modal-actions" style="
                            display: flex;
                            justify-content: flex-end;
                        ">
                            <button id="rename-success-ok-btn" class="sidebar-success-modal-ok-btn" style="
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

        const handleShare = () => {
            setMenuOpen(false);
            setShowShareModal(true);
        };

        const handleDelete = async () => {
            setMenuOpen(false);

            // First confirmation modal - Warning
            const firstConfirm = await new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.id = 'delete-project-modal-backdrop';
                modal.className = 'delete-project-modal-backdrop';
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
                modalContent.id = 'delete-project-modal-content';
                modalContent.className = 'delete-project-modal-content';
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
                    <div class="delete-project-modal-title" style="
                        font-family: Urbanist, Helvetica;
                        font-weight: 700;
                        font-size: 24px;
                        color: #000000;
                        line-height: normal;
                    ">Warning</div>
                    <div class="delete-project-modal-message" style="
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
                    • All generated reports<br>
                    • Invited collaborator will be removed immediately<br><br>
                    This action CANNOT be undone!</div>
                    <div style="
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                        margin-top: 10px;
                    ">
                        <button id="cancel-btn" class="delete-project-modal-cancel-btn" style="
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
                        <button id="continue-btn" class="delete-project-modal-confirm-btn" style="
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
                modal.id = 'delete-project-modal-backdrop';
                modal.className = 'delete-project-modal-backdrop';
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
                modalContent.id = 'delete-project-modal-content';
                modalContent.className = 'delete-project-modal-content';
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
                    <div class="delete-project-modal-title" style="
                        font-family: Urbanist, Helvetica;
                        font-weight: 700;
                        font-size: 24px;
                        color: #000000;
                        line-height: normal;
                    ">Final Confirmation</div>
                    <div class="delete-project-modal-message" style="
                        font-family: Inter, Helvetica;
                        font-weight: 400;
                        font-size: 16px;
                        color: #000000;
                        line-height: 1.5;
                    ">Type the project name to confirm deletion:<br><br>
                    <strong>${currentProject?.projectName}</strong></div>
                    <input type="text" id="project-name-input" class="delete-project-modal-input" placeholder="Type project name here" style="
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
                        <button id="cancel-btn-2" class="delete-project-modal-cancel-btn" style="
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
                        <button id="delete-btn" class="delete-project-modal-confirm-btn delete-project-modal-delete-btn" style="
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
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({
                        projectID: selectedProjectID
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Show success modal
                    const successModal = document.createElement('div');
                    successModal.id = 'sidebar-success-modal-backdrop';
                    successModal.className = 'sidebar-success-modal-backdrop';
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
                    successContent.id = 'sidebar-success-modal-content';
                    successContent.className = 'sidebar-success-modal-content';
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
                        <div class="sidebar-success-modal-title" style="
                            font-family: Urbanist, Helvetica;
                            font-weight: 700;
                            font-size: 24px;
                            color: #000000;
                            line-height: normal;
                        ">Delete Successful</div>
                        <div class="sidebar-success-modal-message" style="
                            font-family: Inter, Helvetica;
                            font-weight: 400;
                            font-size: 14px;
                            color: #000000;
                            line-height: 1.4;
                        ">Project successfully deleted.</div>
                        <div class="sidebar-success-modal-actions" style="
                            display: flex;
                            justify-content: flex-end;
                        ">
                            <button id="success-ok-btn" class="sidebar-success-modal-ok-btn" style="
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

        return React.createElement(React.Fragment, null,
            React.createElement('div', {
                id: 'sidebar-project-options-wrapper',
                ref: menuRef,
                style: {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }
            },
            React.createElement('button', {
                    id: 'sidebar-project-options-button',
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
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f0f0f0';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                },
                React.createElement('img', {
                    id: 'sidebar-project-options-icon',
                    src: './img/more_vert_24.svg',
                    alt: 'Options',
                    style: {
                        width: '20px',
                        height: '20px'
                    }
                })
            ),

            menuOpen && React.createElement('div', {
                    id: 'sidebar-project-options-menu',
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
                    id: 'sidebar-project-option-rename',
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
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    },
                    onClick: (e) => {
                        e.stopPropagation();
                        handleRename();
                    }
                }, 'Rename'),

                // Share option
                React.createElement('button', {
                    id: 'sidebar-project-option-share',
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
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    },
                    onClick: (e) => {
                        e.stopPropagation();
                        handleShare();
                    }
                }, 'Share'),

                // Delete option
                React.createElement('button', {
                    id: 'sidebar-project-option-delete',
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
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(127, 29, 29, 0.3)' : '#f5f5f5';
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
            ),

            // Project Share Modal
            showShareModal && window.ProjectShareModal &&
            React.createElement(window.ProjectShareModal, {
                isOpen: showShareModal,
                onClose: () => setShowShareModal(false),
                projectID: selectedProjectID
            })
        );
    };

    const Sidebar = ({
                         sidebarCollapsed,
                         setSidebarCollapsed,
                         isOverlay,
                         username,
                         onLogout,
                         onProfileRoute,
                         userMenuOpen,
                         setUserMenuOpen,
                         userInfo,
                     }) => {
        // --- Resizing Logic ---
        const [sidebarWidth, setSidebarWidth] = useState(() => {
            const saved = localStorage.getItem('sidebarWidth');
            return saved ? parseInt(saved, 10) : 320;
        });
        const [isResizing, setIsResizing] = useState(false);
        const sidebarRef = useRef(null);

        const startResizing = useCallback((e) => {
            e.preventDefault();
            setIsResizing(true);
        }, []);

        const stopResizing = useCallback(() => {
            setIsResizing(false);
        }, []);

        const resize = useCallback((mouseEvent) => {
            if (isResizing) {
                // Limit width between 320px and 400px
                const newWidth = Math.max(320, Math.min(400, mouseEvent.clientX));
                setSidebarWidth(newWidth);
                localStorage.setItem('sidebarWidth', newWidth);
                // Dispatch event for other components to listen
                window.dispatchEvent(new CustomEvent('sidebarResized', { detail: { width: newWidth } }));
            }
        }, [isResizing]);

        useEffect(() => {
            if (isResizing) {
                window.addEventListener('mousemove', resize);
                window.addEventListener('mouseup', stopResizing);
            }
            return () => {
                window.removeEventListener('mousemove', resize);
                window.removeEventListener('mouseup', stopResizing);
            };
        }, [isResizing, resize, stopResizing]);
        // -----------------------


        // Persist sidebar section states
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

        const [avatarUrl, setAvatarUrl] = useState('./img/user.svg');

        // Create project modal state
        const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
        const [newProjectName, setNewProjectName] = useState('');
        const slideUpHideTimerRef = useRef(null);

        useEffect(() => () => {
            if (slideUpHideTimerRef.current) {
                clearTimeout(slideUpHideTimerRef.current);
            }
        }, []);

        // Notification panel state
        const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
        const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
        const [notificationCheckDisabled, setNotificationCheckDisabled] = useState(false);
        const notificationCheckStartTimeRef = useRef(null);
        const NOTIFICATION_CHECK_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds
        const [isDarkMode, setIsDarkMode] = useState(() => {
            return window.themeManager?.isDarkTheme?.() === true || document.documentElement.dataset.theme === 'dark';
        });

        // Search state
        const [searchQuery, setSearchQuery] = useState('');
        const [searchPanelOpen, setSearchPanelOpen] = useState(false);
        const [selectedSearchItem, setSelectedSearchItem] = useState(null);
        const [selectedSearchType, setSelectedSearchType] = useState(null);
        const [fileMetadata, setFileMetadata] = useState({ size: null, date: null });
        const isHomePage = window.location.pathname === '/' || window.location.pathname === '/home';

        // Reset search state when sidebar collapses
        useEffect(() => {
            if (sidebarCollapsed) {
                setSearchQuery('');
                setSelectedSearchItem(null);
                setSelectedSearchType(null);
            }
        }, [sidebarCollapsed]);

        // Product tour: expand Source + Requirements so Upload / Manage controls are in the layout
        useEffect(() => {
            const expandForTour = () => {
                setSourceExpanded(true);
                setRequirementsExpanded(true);
                try {
                    localStorage.setItem('sourceExpanded', JSON.stringify(true));
                    localStorage.setItem('requirementsExpanded', JSON.stringify(true));
                } catch (_) {}
            };
            document.addEventListener('singularity-tour-sidebar-prep', expandForTour);
            return () => document.removeEventListener('singularity-tour-sidebar-prep', expandForTour);
        }, []);

        // Selected project state
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

        // Projects state
        const [hasProjects, setHasProjects] = useState(false);
        const [projects, setProjects] = useState([]);
        const [projectsLoading, setProjectsLoading] = useState(true);

        // Fetch projects
        const fetchProjects = useCallback(async () => {
            console.log("[Sidebar] Fetching projects...");
            setProjectsLoading(true);
            try {

                const response = await fetch('/api/project/list', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({})
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.projects && data.projects.length > 0) {
                        console.log(`[Sidebar] Received ${data.projects.length} project(s):`,
                            data.projects.map(p => `${p.projectName} (${p.projectID})`));
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
                        setHasProjects(false);
                        setProjects([]);
                        populateProjectDropdown([]);
                        return null;
                    }
                } else {
                    return null;
                }
            } catch (error) {
                console.error("Error fetching projects:", error);
                return null;
            } finally {
                setProjectsLoading(false);
            }
        }, []);

        // Populate dropdown
        const populateProjectDropdown = useCallback((projects) => {
            const dropdown = document.getElementById('select-project-drop-down');
            if (!dropdown) return;

            if (!projects || projects.length === 0) {
                dropdown.innerHTML = '<option value="">No projects available</option>';
                setSelectedProjectID(null);
                localStorage.removeItem('selectedProjectID');
                return;
            }

            const savedProjectID = localStorage.getItem('selectedProjectID');
            const projectExists = projects.some(p => p.projectID === savedProjectID);
            const selectedID = (savedProjectID && projectExists) ? savedProjectID : projects[0]?.projectID;

            if (savedProjectID && !projectExists) {
                localStorage.removeItem('selectedProjectID');
                // If we're falling back to a different project, save it
                if (selectedID) {
                    localStorage.setItem('selectedProjectID', selectedID);
                }
            }

            const options = projects.map((project) =>
                `<option value="${project.projectID}" ${project.projectID === selectedID ? 'selected' : ''}>${project.projectName}</option>`
            ).join('');

            dropdown.innerHTML = options;

            if (selectedID) {
                localStorage.setItem('selectedProjectID', selectedID);
                setSelectedProjectID(selectedID);
                dropdown.value = selectedID;

                // Notify TempHome / RightSidebar so their selectedProjectID stays in sync
                window.dispatchEvent(new CustomEvent('projectSelected', { detail: { projectID: selectedID } }));
            }
        }, []);

        // Load projects & history
        useEffect(() => {
            const loadProjectsAndHistory = async () => {
                // Interactive tour: temp project is tracked in localStorage; refresh skips driver onDestroyed,
                // so delete the orphan and clear selection before rebuilding the project list.
                const pendingTourId = localStorage.getItem('singularityTourPendingProjectId');
                if (pendingTourId) {
                    if (window.csrfToken) {
                        try {
                            await fetch('/api/project/delete', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'CSRF-Token': window.csrfToken
                                },
                                body: JSON.stringify({
                                    projectID: pendingTourId,
                                    silentTourCleanup: true
                                })
                            });
                        } catch (err) {
                            console.warn('[Sidebar] Orphan tour project delete failed', err);
                        }
                    }
                    try {
                        localStorage.removeItem('singularityTourPendingProjectId');
                    } catch (_) {}
                    if (localStorage.getItem('selectedProjectID') === pendingTourId) {
                        localStorage.removeItem('selectedProjectID');
                    }
                    window.dispatchEvent(
                        new CustomEvent('projectSelected', {
                            detail: { projectID: localStorage.getItem('selectedProjectID') || null }
                        })
                    );
                }

                const projectID = await fetchProjects();
                if (!projectID) return;

                const waitForFunction = (funcName, maxAttempts = 50, delayMs = 100) => {
                    return new Promise((resolve) => {
                        let attempts = 0;
                        const interval = setInterval(() => {
                            if (typeof window[funcName] === 'function') {
                                clearInterval(interval);
                                resolve(true);
                            } else if (attempts >= maxAttempts) {
                                clearInterval(interval);
                                resolve(false);
                            }
                            attempts++;
                        }, delayMs);
                    });
                };

                const functionsToWait = ['fetchProjectChats', 'fetchProjectFiles', 'fetchProjectReports'];
                await Promise.all(functionsToWait.map(func => waitForFunction(func)));

                try {
                    if (typeof window.fetchProjectChats === 'function') await window.fetchProjectChats(projectID);
                    if (typeof window.fetchProjectFiles === 'function') await window.fetchProjectFiles(projectID);
                    if (typeof window.fetchProjectReports === 'function') await window.fetchProjectReports(projectID);
                } catch (error) {
                    console.error('Error loading project data:', error);
                }
            };
            loadProjectsAndHistory();
        }, [fetchProjects]);

        useEffect(() => {
            window.fetchProjects = fetchProjects;
            return () => { delete window.fetchProjects; };
        }, [fetchProjects]);

        // Live tour: homeTour.js creates a temp project, selects it here, then deletes it when the tour closes
        useEffect(() => {
            const clearListsForTourSwitch = () => {
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
            };

            const onTourDemoReady = async (e) => {
                const projectID = e.detail?.projectID;
                if (!projectID) return;

                window.currentChatID = null;
                localStorage.removeItem('activeChatID');
                localStorage.removeItem('activeChatProjectID');
                localStorage.setItem('wentBackToInitial', 'true');
                window.pendingChatRestoration = null;

                const currentUrl = new URL(window.location);
                if (currentUrl.searchParams.has('chatID')) {
                    currentUrl.searchParams.delete('chatID');
                    window.history.replaceState({}, '', currentUrl);
                }

                if (typeof window.backToInitialScreen === 'function') {
                    window.backToInitialScreen();
                } else {
                    const chatInterface = document.getElementById('chat-interface');
                    const chatTopBar = document.getElementById('chat-top-bar');
                    if (chatInterface) chatInterface.style.display = 'none';
                    if (chatTopBar) chatTopBar.style.display = 'none';
                }

                localStorage.setItem('selectedProjectID', projectID);
                setSelectedProjectID(projectID);
                setHasProjects(true);
                window.dispatchEvent(new CustomEvent('projectSelected', { detail: { projectID } }));

                window.skipProjectDataLoad = true;
                clearListsForTourSwitch();
                setTimeout(clearListsForTourSwitch, 50);
                setTimeout(clearListsForTourSwitch, 200);

                await fetchProjects();
                const dropdown = document.getElementById('select-project-drop-down');
                if (dropdown) dropdown.value = projectID;
                setTimeout(() => {
                    window.skipProjectDataLoad = false;
                }, 300);
            };

            const onTourDemoDeleted = async () => {
                await fetchProjects();
                const nextId = localStorage.getItem('selectedProjectID');
                window.dispatchEvent(
                    new CustomEvent('projectSelected', { detail: { projectID: nextId || null } })
                );
            };

            document.addEventListener('singularity-tour-demo-project-ready', onTourDemoReady);
            document.addEventListener('singularity-tour-demo-deleted', onTourDemoDeleted);
            return () => {
                document.removeEventListener('singularity-tour-demo-project-ready', onTourDemoReady);
                document.removeEventListener('singularity-tour-demo-deleted', onTourDemoDeleted);
            };
        }, [fetchProjects]);

        useEffect(() => {
            const handleReportGenerated = (event) => {
                const projectID = event.detail?.projectID || selectedProjectID;
                if (projectID && typeof window.fetchProjectReports === 'function') {
                    window.fetchProjectReports(projectID);
                }
            };

            window.addEventListener('reportGenerated', handleReportGenerated);
            return () => {
                window.removeEventListener('reportGenerated', handleReportGenerated);
            };
        }, [selectedProjectID]);

        // Listen for refreshProjects event (e.g., when accepting invitation or project renamed)
        useEffect(() => {
            const handleRefreshProjects = () => {
                console.log('[Sidebar] Received refreshProjects event - updating project list...');
                fetchProjects().then(() => {
                    console.log('[Sidebar] Project list refreshed successfully');
                });
            };

            window.addEventListener('refreshProjects', handleRefreshProjects);
            return () => {
                window.removeEventListener('refreshProjects', handleRefreshProjects);
            };
        }, [fetchProjects]);

        // Check for NEW notifications (unread AND recent)
        const checkUnreadNotifications = useCallback(async () => {
            try {
                // If checking is disabled, don't proceed
                if (notificationCheckDisabled) {
                    console.log('[Sidebar] Notification checking is disabled - skipping check');
                    return;
                }

                // Check if we've exceeded the timeout duration
                if (notificationCheckStartTimeRef.current) {
                    const elapsedTime = Date.now() - notificationCheckStartTimeRef.current;
                    if (elapsedTime > NOTIFICATION_CHECK_TIMEOUT) {
                        console.log('[Sidebar] Notification check timeout reached - disabling checks');
                        setNotificationCheckDisabled(true);
                        return;
                    }
                }

                console.log('[Sidebar] Checking for unread notifications...');
                const response = await fetch('/api/notifications/list', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({})
                });

                if (response.ok) {
                    const data = await response.json();
                    /** Match notificationManager + NotificationPanel: hide driver tour project rows */
                    const hideTourNotif = (n) => {
                        const msg = String((n && n.notificationMessage) || '')
                            .replace(/\u201c/g, '"')
                            .replace(/\u201d/g, '"')
                            .trim();
                        if (!msg.includes('Singularity tour')) return false;
                        if (/"Singularity tour(?: \u00b7 [^"]*)?"/i.test(msg)) return true;
                        if (/^You deleted project\s+/i.test(msg)) return true;
                        if (/^Project\s+"Singularity tour(?: \u00b7 [^"]*)?"\s+has been deleted/i.test(msg)) return true;
                        if (/^You are invited to join Singularity tour/i.test(msg)) return true;
                        if (/^You have been removed from the project Singularity tour/i.test(msg)) return true;
                        if (/\bSingularity tour(?: \u00b7 [A-Za-z0-9]+)?[.!?'"]*\s*$/i.test(msg)) return true;
                        return false;
                    };
                    const notifications = (data.notifications || []).filter((n) => !hideTourNotif(n));

                    console.log(`[Sidebar] Fetched ${notifications.length} notifications total`);

                    // Check if there are any unread notifications (regardless of age)
                    const hasUnread = notifications.some(n => {
                        const isUnread = n.isRead === 0 || n.isRead === false;
                        const notificationAge = new Date() - new Date(n.createdAt);
                        const isRecent = notificationAge < 5 * 60 * 1000; // 5 minutes

                        if (isUnread) {
                            console.log(`[Sidebar] Unread notification found:`, {
                                type: n.notificationType,
                                message: n.notificationMessage,
                                isUnread: isUnread,
                                age: Math.round(notificationAge / 1000) + 's',
                                isRecent: isRecent,
                                willShowBadge: isUnread // Show badge for any unread notification
                            });
                        }

                        return isUnread; // Show red dot for any unread notification, regardless of age
                    });

                    setHasUnreadNotifications(hasUnread);
                    console.log('[Sidebar] Notification badge status:', hasUnread ? 'SHOW RED BADGE' : 'NO BADGE');
                }
            } catch (error) {
                console.error('[Sidebar] Error checking unread notifications:', error);
            }
        }, [notificationCheckDisabled]);

        // Check for unread notifications on mount and listen for refresh events
        useEffect(() => {
            // Initialize the start time on first mount
            if (!notificationCheckStartTimeRef.current) {
                notificationCheckStartTimeRef.current = Date.now();
                console.log('[Sidebar] Notification checking started - will disable after certain minutes');
            }

            // Initial check
            checkUnreadNotifications();

            // Listen for notification refresh events from socket
            const handleRefreshNotifications = () => {
                console.log('[Sidebar] Received refreshNotifications event - checking for unread...');
                checkUnreadNotifications();
            };

            window.addEventListener('refreshNotifications', handleRefreshNotifications);

            // Auto-refresh every 2 minutes as backup for socket failures
            const pollInterval = setInterval(() => {
                console.log('[Sidebar] Auto-polling for new notifications (2 minute interval)');
                checkUnreadNotifications();
            }, 2 * 60 * 1000); // 2 minutes

            return () => {
                window.removeEventListener('refreshNotifications', handleRefreshNotifications);
                clearInterval(pollInterval);
            };
        }, [checkUnreadNotifications]);

        useEffect(() => {
            const syncThemeState = (event) => {
                if (event?.detail?.theme) {
                    setIsDarkMode(event.detail.theme === 'dark');
                    return;
                }

                setIsDarkMode(
                    window.themeManager?.isDarkTheme?.() === true ||
                    document.documentElement.dataset.theme === 'dark'
                );
            };

            syncThemeState();
            window.addEventListener('appThemeChanged', syncThemeState);

            return () => {
                window.removeEventListener('appThemeChanged', syncThemeState);
            };
        }, []);

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

        const handleThemeToggle = useCallback((event) => {
            event?.stopPropagation();

            if (window.themeManager?.toggleTheme) {
                const nextTheme = window.themeManager.toggleTheme();
                setIsDarkMode(nextTheme === 'dark');
                return;
            }

            setIsDarkMode((currentValue) => !currentValue);
        }, []);

        const themeButtonLabel = isDarkMode ? 'Light mode' : 'Dark mode';
        const themeButtonAriaLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';

        const renderThemeIcon = () => {
            if (isDarkMode) {
                return React.createElement('svg', {
                        className: 'sidebar-theme-icon',
                        viewBox: '0 0 24 24',
                        fill: 'none',
                        stroke: 'currentColor',
                        strokeWidth: '2',
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        'aria-hidden': 'true'
                    },
                    React.createElement('circle', { cx: '12', cy: '12', r: '4' }),
                    React.createElement('path', { d: 'M12 2v2' }),
                    React.createElement('path', { d: 'M12 20v2' }),
                    React.createElement('path', { d: 'm4.93 4.93 1.41 1.41' }),
                    React.createElement('path', { d: 'm17.66 17.66 1.41 1.41' }),
                    React.createElement('path', { d: 'M2 12h2' }),
                    React.createElement('path', { d: 'M20 12h2' }),
                    React.createElement('path', { d: 'm6.34 17.66-1.41 1.41' }),
                    React.createElement('path', { d: 'm19.07 4.93-1.41 1.41' })
                );
            }

            return React.createElement('svg', {
                    className: 'sidebar-theme-icon',
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '2',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    'aria-hidden': 'true'
                },
                React.createElement('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' })
            );
        };

        /** Same bottom slide-up as Signup.js (#message, #messageText); host may be injected for non-Home shells. */
        const showSlideUpMessage = (text, autoHideMs = 5000) => {
            injectSlideUpMessageHost();
            const messageEl = document.getElementById('message');
            const messageTextEl = document.getElementById('messageText');
            if (!messageEl || !messageTextEl || !text) return;
            if (slideUpHideTimerRef.current) {
                clearTimeout(slideUpHideTimerRef.current);
                slideUpHideTimerRef.current = null;
            }
            messageTextEl.textContent = text;
            messageEl.classList.add('hidden');
            void messageEl.offsetHeight;
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    messageEl.classList.remove('hidden');
                });
            });
            if (autoHideMs > 0) {
                slideUpHideTimerRef.current = setTimeout(() => {
                    messageEl.classList.add('hidden');
                    slideUpHideTimerRef.current = null;
                }, autoHideMs);
            }
        };

        const handleCreateProject = async () => {
            if (!newProjectName.trim()) {
                showSlideUpMessage('Please enter a project name', 6000);
                return;
            }
            try {
                const response = await fetch('/api/project/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({ projectName: newProjectName.trim() })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    const newProjectID = data.projectID;
                    setShowCreateProjectModal(false);
                    setNewProjectName('');
                    showSlideUpMessage('Project created successfully!');
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
                    setSourceExpanded(true);
                    localStorage.setItem('sourceExpanded', JSON.stringify(true));
                    window.skipProjectDataLoad = true;

                    // Dispatch event to notify other components (RightSidebar, etc.)
                    window.dispatchEvent(new CustomEvent('projectSelected', { detail: { projectID: newProjectID } }));

                    const clearSidebarLists = () => {
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
                    };

                    clearSidebarLists();
                    setTimeout(clearSidebarLists, 50);
                    setTimeout(clearSidebarLists, 200);

                    if (typeof fetchProjects === 'function') {
                        await fetchProjects();
                        const dropdown = document.getElementById('select-project-drop-down');
                        if (dropdown) dropdown.value = newProjectID;
                    }

                    setTimeout(() => { window.skipProjectDataLoad = false; }, 300);
                } else {
                    showSlideUpMessage(data.message || 'Failed to create project', 6000);
                }
            } catch (error) {
                console.error('Error creating project:', error);
                showSlideUpMessage('Error creating project', 6000);
            }
        };

        const handleSkipCreateProject = () => {
            setShowCreateProjectModal(false);
            setNewProjectName('');
        };

        // Search result handler
        const handleSearchResultClick = (type, item) => {
            console.log('Search result clicked:', type, item);
            setSelectedSearchItem(item);
            setSelectedSearchType(type);
        };

        // Handle back from detail view
        const handleBackToSearchResults = () => {
            setSelectedSearchItem(null);
            setSelectedSearchType(null);
            setFileMetadata({ size: null, date: null });
        };

        // Helper functions for file metadata
        const formatFileSize = (bytes) => {
            if (!bytes || bytes === 0) return 'Unknown';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };

        const formatDate = (dateString) => {
            if (!dateString) return 'Unknown';
            try {
                const d = new Date(dateString);
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const year = d.getFullYear();
                let hours = d.getHours();
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                return `${month}-${day}-${year} ${hours}:${minutes}${ampm}`;
            } catch (e) {
                console.error('[Sidebar] Error formatting date:', e, dateString);
                return 'Unknown';
            }
        };

        // Fetch file metadata when a file is selected
        useEffect(() => {
            const fetchFileMetadata = async () => {
                if (selectedSearchType === 'file' && selectedSearchItem?.documentID) {
                    try {
                        const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
                        if (!projectID) {
                            console.warn('[Sidebar] No projectID available for file stats');
                            setFileMetadata({ size: null, date: null });
                            return;
                        }

                        console.log('[Sidebar] Fetching file stats for:', selectedSearchItem.documentID);

                        // Fetch file stats from dedicated endpoint
                        const response = await fetch('/api/project/file/stats', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': window.csrfToken
                            },
                            body: JSON.stringify({ projectID, documentID: selectedSearchItem.documentID })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            console.log('[Sidebar] File stats response:', data);
                            if (data.successful) {
                                setFileMetadata({
                                    size: data.size || null,
                                    date: data.lastModified || null
                                });
                                console.log('[Sidebar] Set file metadata:', { size: data.size, date: data.lastModified });
                            } else {
                                console.warn('[Sidebar] Stats fetch unsuccessful:', data.message);
                                setFileMetadata({ size: null, date: null });
                            }
                        } else {
                            const errorText = await response.text();
                            console.error('[Sidebar] Stats fetch failed:', response.status, errorText);
                            setFileMetadata({ size: null, date: null });
                        }
                    } catch (error) {
                        console.error('[Sidebar] Error fetching file metadata:', error);
                        setFileMetadata({ size: null, date: null });
                    }
                } else {
                    setFileMetadata({ size: null, date: null });
                }
            };

            fetchFileMetadata();
        }, [selectedSearchItem, selectedSearchType]);

        // Fetch avatar URL
        useEffect(() => {
            async function fetchAvatar() {
                try {
                    let response = await fetch('/api/profile-pic/fetch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': window.csrfToken
                        },
                        body: JSON.stringify({})
                    });

                    let profileImgData = await response.json();
                    if (profileImgData.success && profileImgData.data) {
                        const imageData = profileImgData.data[0]?.image;
                        if (imageData) setAvatarUrl(imageData);
                    }
                } catch (error) {
                    console.error('Error fetching avatar:', error);
                }
            }
            fetchAvatar();
        }, []);

        const overlayOpen = isOverlay && !sidebarCollapsed;

        return React.createElement('aside', {
                id: 'sidebar',
                ref: sidebarRef,
                className: 'side-bar' + (overlayOpen ? ' side-bar--overlay' : ''),
                'aria-label': 'Sidebar navigation',
                style: overlayOpen ? {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    height: '100vh',
                    width: '360px',
                    minWidth: '360px',
                    zIndex: window.ZIndex?.SIDEBAR_OVERLAY || 25,
                } : {
                    width: sidebarCollapsed ? 'auto' : `${sidebarWidth}px`,
                    minWidth: sidebarCollapsed ? 'auto' : `${sidebarWidth}px`,
                    position: 'relative',
                }
            },
            // Resizing Handle — hidden in overlay mode
            !sidebarCollapsed && !isOverlay && React.createElement('div', {
                id: 'sidebar-resizer',
                className: 'sidebar-resizer',
                onMouseDown: startResizing,
                style: {
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 9999,
                    backgroundColor: isResizing ? 'rgba(74,144,226,0)' : 'transparent',
                    transition: 'background-color 0.2s',
                    borderRight: '1px solid transparent'
                },
                onMouseEnter: (e) => e.target.style.borderRight = '2px solid #e4e4e4',
                onMouseLeave: (e) => e.target.style.borderRight = '1px solid transparent'
            }),

            React.createElement('nav', { id: 'sidebar-nav' },
                React.createElement('div', {
                        id: 'sidebar-header-wrapper',
                        style: { display: "flex" }
                    },
                    React.createElement('button', {
                            id: 'sidebar-header-logo',
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
                            id: 'sidebar-header-logo-img',
                            className: 'union',
                            src: './img/union.svg',
                            alt: 'Singularity Icon'
                        })
                    )
                ),

                // Project dropdown (with skeleton while loading)
                projectsLoading && !sidebarCollapsed && React.createElement('div', {
                    className: 'sk-sidebar-inline',
                    style: { marginLeft: '21px', marginRight: '25px', marginBottom: '15px' }
                },
                    React.createElement('div', { className: 'sk-box', style: { width: '100%', height: '36px', borderRadius: '8px' } }),
                    React.createElement('div', { className: 'sk-box w-3-4', style: { height: '28px', borderRadius: '8px' } }),
                    React.createElement('div', { className: 'sk-box w-1-2', style: { height: '28px', borderRadius: '8px' } })
                ),

                React.createElement('div', {
                        id: 'sidebar-project-dropdown-wrapper',
                        style: {
                            display: !sidebarCollapsed && !projectsLoading ? 'flex' : 'none',
                            alignItems: 'center',
                            gap: '10px',
                            marginLeft: '21px',
                            marginRight: '25px',
                            marginBottom: '15px'
                        }
                    },
                    React.createElement('div', {
                            id: 'sidebar-project-select-wrapper',
                            style: {
                                position: 'relative',
                                flex: '1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                minWidth: 0
                            }
                        },
                        React.createElement('select', {
                            id: 'select-project-drop-down',
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
                                backgroundColor: 'transparent',
                                // Text truncation
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                maxWidth: '100%'
                            },
                            onChange: async (e) => {
                                const projectID = e.target.value;
                                localStorage.setItem('selectedProjectID', projectID);
                                setSelectedProjectID(projectID);

                                // Notify TempHome / RightSidebar so their selectedProjectID stays in sync
                                window.dispatchEvent(new CustomEvent('projectSelected', { detail: { projectID } }));

                                // ... reset logic ...
                                window.currentChatID = null;
                                localStorage.removeItem('activeChatID');
                                localStorage.removeItem('activeChatProjectID');
                                localStorage.setItem('wentBackToInitial', 'true');
                                window.pendingChatRestoration = null;

                                const currentUrl = new URL(window.location);
                                if (currentUrl.searchParams.has('chatID')) {
                                    currentUrl.searchParams.delete('chatID');
                                    window.history.pushState({}, '', currentUrl);
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
                                    // ... clear lists ...
                                    const chatHistoryList = document.getElementById('div-chat-history-list');
                                    if (chatHistoryList) chatHistoryList.innerHTML = '';
                                    const sourceList = document.getElementById('div-project-source-list');
                                    if (sourceList) sourceList.innerHTML = '';
                                    const requirementsList = document.getElementById('div-requirements-list');
                                    if (requirementsList) requirementsList.innerHTML = '';
                                    return;
                                }

                                if (typeof fetchProjectFiles === 'function') await fetchProjectFiles(projectID);
                                if (typeof fetchProjectReports === 'function') await fetchProjectReports(projectID);
                                if (typeof fetchProjectChats === 'function') await fetchProjectChats(projectID);
                            },
                            onMouseEnter: (e) => { const dk = document.documentElement.getAttribute('data-theme') === 'dark'; e.target.style.backgroundColor = dk ? '#1e293b' : '#f5f5f5'; },
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
                            id: 'sidebar-create-project-button',
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
                                height: '40px',
                                flexShrink: 0
                            },
                            onMouseEnter: (e) => { const dk = document.documentElement.getAttribute('data-theme') === 'dark'; e.target.style.backgroundColor = dk ? '#1e293b' : '#f5f5f5'; },
                            onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
                        },
                        React.createElement('img', {
                            id: 'sidebar-create-project-icon',
                            src: './img/add_2_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                            alt: 'Create project',
                            style: { width: '20px', height: '20px' }
                        })
                    )
                ),

                // New Chat Button
                hasProjects && React.createElement('button', {
                        id: 'sidebar-new-chat-button',
                        type: 'button',
                        'aria-label': 'Create new chat',
                        onClick: () => {
                            if (typeof window.createNewChat === 'function') window.createNewChat();
                        },
                        style: {
                            display: !sidebarCollapsed ? 'flex' : 'none',
                            width: 'calc(100% - 46px)', // Match margins
                            marginLeft: '21px',
                            marginRight: '25px',
                            padding: '10px 14px',
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
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.3)';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.2)';
                        }
                    },
                    React.createElement('img', {
                        id: 'sidebar-new-chat-icon',
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
                        id: 'sidebar-new-chat-label',
                        style: { flex: '1 1 0%', textAlign: 'center' }
                    }, 'New Chat')
                ),

                // Search bar
                React.createElement('form', {
                        id: 'sidebar-search-form',
                        className: 'search-file-field',
                        role: 'search',
                        'aria-label': 'Search files',
                        onSubmit: (e) => e.preventDefault(),
                        onClick: sidebarCollapsed ? () => setSearchPanelOpen(true) : undefined,
                        style: {
                            marginBottom: '20px',
                            // --- Collapsed: let CSS handle positioning ---
                            ...(sidebarCollapsed ? {} : {
                                width: 'calc(100% - 46px)',
                                marginLeft: '21px'
                            }),
                            marginRight: '25px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            cursor: sidebarCollapsed ? 'pointer' : 'default'
                        }
                    },
                    React.createElement('img', {
                        id: 'sidebar-search-icon',
                        className: 'search',
                        src: './img/search-1.svg',
                        alt: ''
                    }),
                    React.createElement('label', {
                        id: 'sidebar-search-label',
                        htmlFor: 'sidebar-search-input',
                        className: 'visually-hidden'
                    }, 'Search files, requirements, stories...'),
                    React.createElement('input', {
                        type: 'search',
                        id: 'sidebar-search-input',
                        className: 'text-wrapper-4',
                        placeholder: 'Search files, requirements, stories...',
                        'aria-label': 'Search files',
                        value: searchQuery,
                        onChange: (e) => setSearchQuery(e.target.value),
                        style: {
                            // --- NEW: Input Stretches ---
                            width: '100%',
                            flex: 1,
                            minWidth: 0,
                            boxSizing: 'border-box'
                        }
                    })
                ),

                // Search Results or Detail View Component (hidden when collapsed)
                !sidebarCollapsed && selectedSearchItem ? React.createElement('div', {
                    id: 'sidebar-search-detail-view',
                    className: 'search-results-overlay',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        padding: '15px 20px',
                        overflowY: 'auto'
                    }
                },
                    // Back button
                    React.createElement('button', {
                        id: 'sidebar-search-back-btn',
                        onClick: handleBackToSearchResults,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            border: '1px solid #e4e4e4',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            fontFamily: 'Inter, Helvetica',
                            fontSize: '13px',
                            color: '#1c1d21',
                            width: 'fit-content',
                            transition: 'background-color 0.2s'
                        },
                        onMouseEnter: (e) => { const dk = document.documentElement.getAttribute('data-theme') === 'dark'; e.currentTarget.style.backgroundColor = dk ? '#1e293b' : '#f5f5f5'; },
                        onMouseLeave: (e) => { const dk = document.documentElement.getAttribute('data-theme') === 'dark'; e.currentTarget.style.backgroundColor = dk ? 'transparent' : '#ffffff'; }
                    },
                        React.createElement('img', {
                            src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                            alt: '',
                            style: { width: '18px', height: '18px', flexShrink: 0 }
                        }),
                        'Back to results'
                    ),

                    // Detail content - macOS Quick Look style with sidebar theme
                    selectedSearchType === 'file' ? React.createElement('div', {
                        id: 'sidebar-search-file-preview',
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid #e4e4e4'
                        }
                    },
                        // File header with icon and name
                        React.createElement('div', {
                            id: 'sidebar-search-file-header-section',
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '20px',
                                backgroundColor: '#f9f9f9',
                                borderBottom: '1px solid #e4e4e4'
                            }
                        },
                            React.createElement('div', {
                                id: 'sidebar-search-file-icon',
                                style: {
                                    width: '60px',
                                    height: '60px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: '#333333',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    border: '2px solid #e4e4e4',
                                    flexShrink: 0
                                }
                            }, selectedSearchItem.documentExt.replace('.', '').toUpperCase()),
                            // File name with marquee
                            React.createElement('div', {
                                id: 'sidebar-search-file-name',
                                className: selectedSearchItem.name.length > 30 ? 'file-name-marquee-container' : '',
                                style: {
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#1c1d21',
                                    textAlign: 'left',
                                    flex: '1',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }
                            },
                                React.createElement('div', {
                                    className: selectedSearchItem.name.length > 30 ? 'file-name-marquee' : '',
                                    style: {
                                        wordBreak: selectedSearchItem.name.length <= 30 ? 'break-word' : 'normal'
                                    }
                                }, selectedSearchItem.name)
                            )
                        ),

                        // File details section
                        React.createElement('div', {
                            id: 'sidebar-search-file-details',
                            style: {
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                overflowY: 'auto',
                                flex: '1'
                            }
                        },

                            // Divider
                            // React.createElement('div', {
                            //     style: {
                            //         height: '1px',
                            //         backgroundColor: '#e4e4e4'
                            //     }
                            // }),

                            // Info rows
                            React.createElement('div', {
                                id: 'sidebar-search-file-info',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'sidebar-search-file-info-type',
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }
                                },
                                    React.createElement('span', {
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#666',
                                            fontWeight: '400'
                                        }
                                    }, 'File Type'),
                                    React.createElement('span', {
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#1c1d21',
                                            fontWeight: '500'
                                        }
                                    }, `${selectedSearchItem.documentExt.replace('.', '').toUpperCase()} Document`)
                                ),
                                React.createElement('div', {
                                    id: 'sidebar-search-file-info-size',
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }
                                },
                                    React.createElement('span', {
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#666',
                                            fontWeight: '400'
                                        }
                                    }, 'File Size'),
                                    React.createElement('span', {
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#1c1d21',
                                            fontWeight: '500'
                                        }
                                    }, fileMetadata.size ? formatFileSize(fileMetadata.size) : 'Unknown')
                                ),
                                React.createElement('div', {
                                    id: 'sidebar-search-file-info-date',
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }
                                },
                                    React.createElement('span', {
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#666',
                                            fontWeight: '400'
                                        }
                                    }, 'Upload Date'),
                                    React.createElement('span', {
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#1c1d21',
                                            fontWeight: '500'
                                        }
                                    }, fileMetadata.date ? formatDate(fileMetadata.date) : 'Unknown')
                                ),
                                // Document ID row - commented out
                                // React.createElement('div', {
                                //     id: 'sidebar-search-file-info-id',
                                //     style: {
                                //         display: 'flex',
                                //         justifyContent: 'space-between',
                                //         alignItems: 'center'
                                //     }
                                // },
                                //     React.createElement('span', {
                                //         style: {
                                //             fontFamily: 'Inter, Helvetica',
                                //             fontSize: '13px',
                                //             color: '#666',
                                //             fontWeight: '400'
                                //         }
                                //     }, 'Document ID'),
                                //     React.createElement('span', {
                                //         style: {
                                //             fontFamily: 'monospace',
                                //             fontSize: '11px',
                                //             color: '#1c1d21',
                                //             fontWeight: '500'
                                //         }
                                //     }, selectedSearchItem.documentID.substring(0, 8) + '...')
                                // )
                            ),

                            // Divider
                            React.createElement('div', {
                                style: {
                                    height: '1px',
                                    backgroundColor: '#e4e4e4'
                                }
                            }),

                            // Action button
                            React.createElement('button', {
                                id: 'sidebar-search-file-download-btn',
                                onClick: () => {
                                    // Trigger download
                                    if (window.downloadFile) {
                                        window.downloadFile(selectedSearchItem.documentID, selectedSearchItem.name);
                                    }
                                },
                                style: {
                                    width: '100%',
                                    padding: '12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgb(30, 41, 59)',
                                    color: '#ffffff',
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    // transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                },
                                onMouseEnter: (e) => {
                                    e.target.style.backgroundColor = '#000000';
                                    // e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                },
                                onMouseLeave: (e) => {
                                    e.target.style.backgroundColor = 'rgb(30, 41, 59)';
                                    // e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }
                            }, 'Download')
                        )
                    ) : React.createElement('div', {
                        id: 'sidebar-search-requirement-preview',
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid #e4e4e4',
                            maxHeight: '100%'
                        }
                    },
                        // Header with badge
                        React.createElement('div', {
                            id: 'sidebar-search-requirement-header',
                            style: {
                                // padding: '15px',
                                padding: '20px',

                                backgroundColor: '#f9f9f9',
                                borderBottom: '1px solid #e4e4e4'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '12px'
                                }
                            },
                                // Badge (matches requirements-panel-item-badge)
                                React.createElement('div', {
                                    id: 'sidebar-search-requirement-badge',
                                    className: 'sidebar-search-requirement-badge',
                                    style: {
                                        padding: '4px 10px',
                                        backgroundColor: 'rgb(28, 29, 33)',
                                        color: 'rgb(255, 255, 255)',
                                        borderRadius: '6px',
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        letterSpacing: '0.5px'
                                    }
                                }, selectedSearchType === 'requirement'
                                    ? `${(selectedSearchItem.details?.requirementType === 'functional' || selectedSearchItem.details?.requirementType === 'FR') ? 'FR' : 'NFR'}-${String(selectedSearchItem.details?.requirementSeq || 0).padStart(2, '0')}`
                                    : `US-${String(selectedSearchItem.details?.storySeq || 0).padStart(2, '0')}`)
                            ),
                            // Title
                            React.createElement('div', {
                                id: 'sidebar-search-requirement-title',
                                style: {
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#1c1d21',
                                    lineHeight: '1.4'
                                }
                            }, selectedSearchItem.title)
                        ),

                        // Details section
                        React.createElement('div', {
                            id: 'sidebar-search-requirement-details',
                            style: {
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                overflowY: 'auto',
                                flex: '1'
                            }
                        },
                            // Description
                            selectedSearchItem.details?.description && React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#666',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }
                                }, 'Description'),
                                React.createElement('div', {
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '13px',
                                        color: '#1c1d21',
                                        lineHeight: '1.6'
                                    }
                                }, selectedSearchItem.details.description)
                            ),

                            // Role (for both requirements and user stories)
                            selectedSearchItem.details?.role && React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#666',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }
                                }, 'Role'),
                                React.createElement('div', {
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '13px',
                                        color: '#1c1d21',
                                        lineHeight: '1.6'
                                    }
                                }, selectedSearchItem.details.role)
                            ),

                            // Source References
                            selectedSearchItem.details?.sourceReference && selectedSearchItem.details.sourceReference.length > 0 && React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }
                            },
                                React.createElement('div', {
                                    className: 'sidebar-source-references-header',
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }
                                }, 'Source References'),
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }
                                },
                                    selectedSearchItem.details.sourceReference.map((ref, idx) =>
                                        React.createElement('div', {
                                            key: idx,
                                            className: 'search-panel-source-reference-card',
                                            style: {
                                                padding: '10px 12px',
                                                borderRadius: '6px',
                                                fontFamily: 'Inter, Helvetica',
                                                fontSize: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px'
                                            }
                                        },
                                            typeof ref === 'string' ? ref : React.createElement(React.Fragment, null,
                                                ref.documentName && React.createElement('div', {
                                                    className: 'search-panel-source-reference-name',
                                                    style: { fontWeight: '600' }
                                                }, ref.documentName),
                                                ref.location && React.createElement('div', {
                                                    className: 'search-panel-source-reference-location',
                                                    style: { fontSize: '11px' }
                                                }, `Location: ${ref.location}`)
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ) : !sidebarCollapsed && React.createElement(window.sidebarInnerSearchResults, {
                    searchQuery: searchQuery,
                    onResultClick: handleSearchResultClick,
                    onClose: () => {
                        setSearchQuery('');
                        setSelectedSearchItem(null);
                        setSelectedSearchType(null);
                    },
                    isHomePage: isHomePage,
                    sidebarCollapsed: sidebarCollapsed
                }),

                // Scrollable wrapper
                React.createElement('div', {
                        id: 'sidebar-scrollable-wrapper',
                        className: 'sidebar-scrollable-content',
                        style: {
                            visibility: searchQuery ? 'hidden' : 'visible'
                        }
                    },
                    // History section
                    React.createElement('div', {
                            id: 'sidebar-history-section',
                            style: {marginBottom: '10px', width: 'calc(100% - 40px)'}
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
                                },
                                // --- Collapsed: center content, Expanded: space-between ---
                                style: sidebarCollapsed ? {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxSizing: 'border-box'
                                } : {
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxSizing: 'border-box',
                                    paddingRight: '20px',
                                    outline: 'none'
                                }
                            },
                            React.createElement('div', { id: 'sidebar-history-button-content', style: { display: 'flex', alignItems: 'center', ...(sidebarCollapsed ? {} : { flex: 1 }), minWidth: 0, overflow: 'hidden' } },
                                React.createElement('img', {
                                    id: 'sidebar-history-icon',
                                    className: 'slash-circle',
                                    src: './img/history-svgrepo-com.svg',
                                    alt: ''
                                }),
                                React.createElement('span', {
                                    id: 'sidebar-history-label',
                                    className: 'text-wrapper-2',
                                    // --- NEW: Text Truncation ---
                                    style: {
                                        flex: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textAlign: 'left'
                                    }
                                }, 'History')
                            ),
                            React.createElement('span', {
                                    id: 'sidebar-history-chevron-wrapper',
                                    className: 'submenu',
                                    'aria-hidden': 'true',
                                    style: { flexShrink: 0 }
                                },
                                React.createElement('img', {
                                    id: 'sidebar-history-chevron',
                                    className: 'text-wrapper-3',
                                    src: './img/down-chevron-black-16112.svg',
                                    alt: '',
                                    style: {
                                        transform: historyExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                                        transition: 'transform 0.2s',
                                        width: '24px',
                                        height: '24px',
                                        marginRight: '0'
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
                                    display: historyExpanded && !sidebarCollapsed ? 'block' : 'none',
                                    width: '100%', // Ensure submenu takes width
                                    boxSizing: 'border-box'
                                }
                            },
                            React.createElement('div', {
                                id: 'div-chat-history-list',
                                style: { display: "flex", flexDirection: "column", gap: "5px", width: 'calc(100% + 40px)', margin: '0 50px 0 -20px' }
                            }),
                            React.createElement('p', {
                                id: 'p-label-chat-history-no-entry',
                                style: { fontSize: '14px', color: '#666' }
                            }, 'Chat history is empty.')
                        )
                    ),

                    // Source section
                    React.createElement('div', {
                            id: 'sidebar-source-section',
                            style: {marginBottom: '10px', width: 'calc(100% - 40px)'}
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
                                },
                                // --- Collapsed: center content, Expanded: space-between ---
                                style: sidebarCollapsed ? {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxSizing: 'border-box'
                                } : {
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxSizing: 'border-box',
                                    paddingRight: '20px',
                                    outline: 'none'
                                }
                            },
                            React.createElement('div', { id: 'sidebar-source-button-content', style: { display: 'flex', alignItems: 'center', ...(sidebarCollapsed ? {} : { flex: 1 }), minWidth: 0, overflow: 'hidden' } },
                                React.createElement('img', {
                                    id: 'sidebar-source-icon',
                                    className: 'slash-circle',
                                    src: './img/documents-outline-svgrepo-com.svg',
                                    alt: ''
                                }),
                                React.createElement('span', {
                                    id: 'sidebar-source-label',
                                    className: 'text-wrapper-2',
                                    style: {
                                        flex: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textAlign: 'left'
                                    }
                                }, 'Source')
                            ),
                            React.createElement('span', {
                                    id: 'sidebar-source-chevron-wrapper',
                                    className: 'submenu',
                                    'aria-hidden': 'true',
                                    style: { flexShrink: 0 }
                                },
                                React.createElement('img', {
                                    id: 'sidebar-source-chevron',
                                    className: 'text-wrapper-3',
                                    src: './img/down-chevron-black-16112.svg',
                                    alt: '',
                                    style: {
                                        transform: sourceExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                                        transition: 'transform 0.2s',
                                        width: '24px',
                                        height: '24px',
                                        marginRight: '0'
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
                                    display: sourceExpanded && !sidebarCollapsed ? 'block' : 'none',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }
                            },
                            hasProjects && selectedProjectID && React.createElement('button', {
                                    id: 'sidebar-source-upload-button',
                                    'aria-label': 'Upload files to project',
                                    onClick: async () => {
                                        const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : selectedProjectID;
                                        if (projectID) {
                                            const event = new CustomEvent('openFileUpload', { detail: { projectID } });
                                            window.dispatchEvent(event);
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
                                        width: 'calc(40px + 100%)',
                                        marginLeft: '-20px'
                                    },
                                    onMouseEnter: (e) => {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        if (!isDark) e.currentTarget.style.backgroundColor = 'rgb(51, 65, 85)';
                                    },
                                    onMouseLeave: (e) => {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        if (!isDark) e.currentTarget.style.backgroundColor = 'rgb(30, 41, 59)';
                                    }
                                },
                                React.createElement('img', {
                                    id: 'sidebar-source-upload-icon',
                                    src: './img/add_2_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                                    style: { width: '16px', height: '16px', filter: 'brightness(0) invert(1)' }
                                }),
                                'Upload Files'
                            ),
                            React.createElement('div', {
                                id: "div-project-source-list",
                                style: { display: "flex", flexDirection: "column", gap: "5px", width: 'calc(100% + 40px)', margin: '0 -20px 0 -20px' }
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
                            style: { marginBottom: '10px', width: 'calc(100% - 40px)' }
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
                                },
                                // --- Collapsed: center content, Expanded: space-between ---
                                style: sidebarCollapsed ? {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxSizing: 'border-box'
                                } : {
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxSizing: 'border-box',
                                    paddingRight: '20px'
                                }
                            },
                            React.createElement('div', { id: 'sidebar-requirements-button-content', style: { display: 'flex', alignItems: 'center', ...(sidebarCollapsed ? {} : { flex: 1 }), minWidth: 0, overflow: 'hidden' } },
                                React.createElement('img', {
                                    id: 'sidebar-requirements-icon',
                                    className: 'slash-circle',
                                    src: './img/RequirementsIcon.svg',
                                    alt: ''
                                }),
                                React.createElement('span', {
                                    id: 'sidebar-requirements-label',
                                    className: 'text-wrapper-2',
                                    style: {
                                        flex: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textAlign: 'left'
                                    }
                                }, 'Report')
                            ),
                            React.createElement('span', {
                                    id: 'sidebar-requirements-chevron-wrapper',
                                    className: 'submenu',
                                    'aria-hidden': 'true',
                                    style: { flexShrink: 0 }
                                },
                                React.createElement('img', {
                                    id: 'sidebar-requirements-chevron',
                                    className: 'text-wrapper-3',
                                    src: './img/down-chevron-black-16112.svg',
                                    alt: '',
                                    style: {
                                        transform: requirementsExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                                        transition: 'transform 0.2s',
                                        width: '24px',
                                        height: '24px',
                                        marginRight: '0'
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
                                    display: requirementsExpanded && !sidebarCollapsed ? 'block' : 'none',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }
                            },
                            hasProjects && selectedProjectID && React.createElement('button', {
                                    id: 'sidebar-manage-requirements-button',
                                    'aria-label': 'Manage requirement / stories',
                                    onClick: async () => {
                                        if (typeof window.openRequirementsPanel === 'function') {
                                            window.openRequirementsPanel();
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
                                        width: 'calc(40px + 100%)',
                                        marginLeft: '-20px'
                                    },
                                    onMouseEnter: (e) => {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        if (!isDark) e.currentTarget.style.backgroundColor = 'rgb(51, 65, 85)';
                                    },
                                    onMouseLeave: (e) => {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        if (!isDark) e.currentTarget.style.backgroundColor = 'rgb(30, 41, 59)';
                                    }
                                },
                                React.createElement('img', {
                                    id: 'sidebar-manage-requirements-icon',
                                    src: './img/add_2_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                                    style: { width: '16px', height: '16px', filter: 'brightness(0) invert(1)' }
                                }),
                                'Manage Requirements / Stories'
                            ),
                            React.createElement('div', {
                                id: "div-requirements-list",
                                style: { display: "flex", flexDirection: "column", gap: "0", margin: '0 -20px 0 -20px' }
                            }),
                            React.createElement('p', {
                                id: "p-label-requirements-no-entry",
                                style: { fontSize: '14px', color: '#666', display: 'block' }
                            }, 'No report available')
                        )
                    )
                ),

                // Horizontal divider
                React.createElement('div', {
                        id: 'sidebar-divider-wrapper',
                        className: 'horizontal-inset',
                        role: 'separator',
                        style: {marginBottom: '20px'}
                    },
                    React.createElement('hr', { id: 'sidebar-divider-line' })
                ),

                !sidebarCollapsed && React.createElement('div', {
                        id: 'sidebar-theme-wrapper-expanded'
                    },
                    React.createElement('button', {
                            id: 'sidebar-theme-button',
                            className: 'sidebar-theme-button',
                            type: 'button',
                            title: themeButtonAriaLabel,
                            'aria-label': themeButtonAriaLabel,
                            'aria-pressed': isDarkMode,
                            onClick: handleThemeToggle
                        },
                        React.createElement('span', { className: 'sidebar-theme-icon-wrapper' }, renderThemeIcon()),
                        React.createElement('span', { className: 'sidebar-theme-button-label' }, themeButtonLabel)
                    )
                ),

                sidebarCollapsed && React.createElement('div', {
                        id: 'sidebar-theme-wrapper-collapsed'
                    },
                    React.createElement('button', {
                            id: 'sidebar-theme-button-collapsed',
                            className: 'sidebar-theme-button sidebar-theme-button--collapsed',
                            type: 'button',
                            title: themeButtonAriaLabel,
                            'aria-label': themeButtonAriaLabel,
                            'aria-pressed': isDarkMode,
                            onClick: handleThemeToggle
                        },
                        React.createElement('span', { className: 'sidebar-theme-icon-wrapper' }, renderThemeIcon())
                    )
                ),

                // Notification trigger (expanded view)
                !sidebarCollapsed && React.createElement('div', {
                        id: 'sidebar-notification-wrapper-expanded',
                        style: {
                            padding: '0 0 0 0',
                            marginLeft: '0',
                            marginBottom: '0'
                        }
                    },
                    React.createElement('button', {
                        id: 'sidebar-notification-button',
                        onClick: () => {
                            setNotificationPanelOpen(!notificationPanelOpen);
                            // Badge will be cleared automatically when notifications are marked as read
                        },
                        style: {
                            position: 'relative',
                            width: '100%',
                            height: '40px',
                            padding: '8px 0',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '10px',
                            outline: 'none',
                            marginLeft: '0',
                            transition: 'background-color 0.2s'
                        },
                        onMouseEnter: (e) => { const dk = document.documentElement.getAttribute('data-theme') === 'dark'; e.currentTarget.style.backgroundColor = dk ? '#1e293b' : '#f0f0f0'; },
                        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
                    },
                        React.createElement('div', {
                            id: 'sidebar-notification-icon-wrapper',
                            style: {
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '30px'
                            }
                        },
                            React.createElement('svg', {
                                id: 'sidebar-notification-icon',
                                width: '20',
                                height: '20',
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: '#333',
                                strokeWidth: '2',
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round'
                            },
                                React.createElement('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }),
                                React.createElement('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })
                            ),
                            // Red dot indicator for unread notifications
                            hasUnreadNotifications && React.createElement('span', {
                                id: 'sidebar-notification-unread-badge',
                                style: {
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: '#e53935',
                                    borderRadius: '50%',
                                    border: '1px solid #fff'
                                }
                            })
                        ),
                        React.createElement('span', {
                            id: 'sidebar-notification-label',
                            style: {
                                fontSize: '14px',
                                color: '#333',
                                fontWeight: '500'
                            }
                        }, 'Notifications')
                    )
                ),

                // Notification trigger (collapsed view)
                sidebarCollapsed && React.createElement('div', {
                        id: 'sidebar-notification-wrapper-collapsed',
                        style: {
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '0 0 10px 0'
                        }
                    },
                    React.createElement('button', {
                        id: 'sidebar-notification-button-collapsed',
                        onClick: () => {
                            setNotificationPanelOpen(!notificationPanelOpen);
                            // Badge will be cleared automatically when notifications are marked as read
                        },
                        title: 'Notifications',
                        style: {
                            position: 'relative',
                            width: '100%',
                            height: '40px',
                            padding: '8px 0px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '10px',
                            outline: 'none',
                            marginLeft: '-5px',
                            // transition: 'background-color 0.2s'
                        },
                        // onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f0f0f0',
                        // onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
                    },
                        React.createElement('div', {
                            id: 'sidebar-notification-icon-wrapper-collapsed',
                            style: {
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '30px'
                            }
                        },
                            React.createElement('svg', {
                                id: 'sidebar-notification-icon-collapsed',
                                width: '20',
                                height: '20',
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: '#333',
                                strokeWidth: '2',
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round'
                            },
                                React.createElement('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }),
                                React.createElement('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })
                            ),
                            // Red dot indicator for unread notifications
                            hasUnreadNotifications && React.createElement('span', {
                                id: 'sidebar-notification-unread-badge-collapsed',
                                style: {
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-4px',
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: '#e53935',
                                    borderRadius: '50%',
                                    border: '1px solid #fff'
                                }
                            })
                        )
                    )
                ),

                // Notification Panel
                window.NotificationPanel && React.createElement(window.NotificationPanel, {
                    isOpen: notificationPanelOpen,
                    onClose: () => {
                        setNotificationPanelOpen(false);
                    },
                    sidebarCollapsed: sidebarCollapsed,
                    isOverlay: isOverlay
                }),

                // Search Panel (for collapsed sidebar)
                window.SearchPanel && React.createElement(window.SearchPanel, {
                    isOpen: searchPanelOpen,
                    onClose: () => {
                        setSearchPanelOpen(false);
                    },
                    sidebarCollapsed: sidebarCollapsed,
                    isHomePage: isHomePage,
                    isOverlay: isOverlay
                }),

                // Profile section
                React.createElement('div', {
                        id: 'sidebar-profile-section',
                        style: {
                            width: '100%',
                            marginBottom: '20px',
                            position: 'relative',
                            margin: '20px 0'
                        },
                        onClick: toggleUserMenu
                    },
                    !sidebarCollapsed && React.createElement('a', {
                            id: 'sidebar-profile-avatar',
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
                                outline: 'none'
                            },
                            onClick: (e) => e.preventDefault()
                        },
                        React.createElement('img', {
                            id: 'sidebar-profile-avatar-img',
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
                        React.createElement('span', { id: 'sidebar-profile-username', className: 'text-wrapper-6' }, username),

                        userMenuOpen && React.createElement('div', {
                                id: 'sidebar-profile-dropdown',
                                style: {
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '0',
                                    marginBottom: '10px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #e4e4e4',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    zIndex: 20,
                                    minWidth: 'calc(100% - 35px)',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '25px',
                                    pointerEvents: 'auto'
                                },
                                onMouseEnter: (e) => {
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '#fff';
                                },
                                onMouseLeave: (e) => {
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '#fff';
                                }
                            },
                            React.createElement('button', {
                                id: 'btn-profile-expanded',
                                style: {
                                    display: 'block',
                                    width: '100%',
                                    padding: '0',
                                    border: 'none',
                                    // backgroundColor: 'transparent',
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
                                    // backgroundColor: 'transparent',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontFamily: 'Urbanist-SemiBold, Helvetica',
                                    fontWeight: '600',
                                    color: '#b62e2e',
                                    // transition: 'background-color 0.2s'
                                },
                                onClick: (e) => {
                                    e.stopPropagation();
                                    onLogout();
                                }
                            }, 'Log Out')
                        )
                    ),

                    sidebarCollapsed && React.createElement('button', {
                            id: 'sidebar-profile-avatar-collapsed',
                            style: {
                                position: 'relative',
                                width: '48px',
                                height: '48px',
                                bottom: '40px',
                                background: '#ffffff',
                                padding: '5px 5px 10px 6px',
                                // cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 220ms ease',
                                // margin: '9.5px auto',
                                // border: 'none',
                                margin: '20px 0 9.5px 12px',
                                outline: 'none'
                            }
                        },
                        React.createElement('img', {
                            id: 'sidebar-profile-avatar-img-collapsed',
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
                                id: 'sidebar-profile-dropdown-collapsed',
                                style: {
                                    position: 'fixed',
                                    bottom: '10px',
                                    left: '70px',
                                    backgroundColor: '#fff',
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
                                // onMouseEnter: (e) => e.target.style.backgroundColor = '#eeeeee',
                                // onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent',
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
                                    // transition: 'background-color 0.2s'
                                },
                                // onMouseEnter: (e) => e.target.style.backgroundColor = '#eeeeee',
                                // onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent',
                                onClick: (e) => {
                                    e.stopPropagation();
                                    onLogout();
                                }
                            }, 'Log Out')
                        )
                    )
                ),

                // Toggle/collapse button at bottom
                React.createElement('button', {
                        id: 'sidebar-collapse-button',
                        className: 'trigger',
                        type: 'button',
                        'aria-label': 'Toggle sidebar',
                        'aria-expanded': !sidebarCollapsed,
                        onClick: toggleSidebar,
                        style: {marginBottom: '20px', outline: 'none'}
                    },
                    React.createElement('img', {
                        id: 'sidebar-collapse-icon',
                        src: './img/double-arrow-right-svgrepo-com.svg',
                        alt: 'Toggle sidebar',
                        style: {width: '24px', height: '24px'}
                    })
                )
            ),

            // Create Project Modal
            showCreateProjectModal && React.createElement('div', {
                    id: 'sidebar-create-project-modal-overlay',
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
                        id: 'sidebar-create-project-modal-content',
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
                        id: 'sidebar-create-project-modal-title',
                        style: {
                            margin: '0 0 10px 0',
                            fontSize: '24px',
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: '600',
                            color: '#1c1d21'
                        }
                    }, 'Create New Project'),
                    React.createElement('p', {
                        id: 'sidebar-create-project-modal-description',
                        style: {
                            margin: '0 0 20px 0',
                            fontSize: '14px',
                            fontFamily: 'Inter, Helvetica',
                            color: '#666666'
                        }
                    }, 'Enter a name for your new project or skip to create it later.'),
                    React.createElement('input', {
                        id: 'sidebar-create-project-modal-input',
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
                            id: 'sidebar-create-project-modal-actions',
                            style: {
                                display: 'flex',
                                gap: '10px',
                                justifyContent: 'flex-end'
                            }
                        },
                        React.createElement('button', {
                            id: 'sidebar-create-project-modal-skip',
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
                            onMouseEnter: (e) => { const dk = document.documentElement.getAttribute('data-theme') === 'dark'; e.target.style.backgroundColor = dk ? '#1e293b' : '#f5f5f5'; },
                            onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
                        }, 'Skip'),
                        React.createElement('button', {
                            id: 'sidebar-create-project-modal-submit',
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
            )
        );
    };

    // Make available globally
    window.Sidebar = Sidebar;
})();
