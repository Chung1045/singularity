(function () {
    const { useState, useEffect, useRef, useCallback } = React;

    /**
     * RightSidebar Component
     * A draggable right sidebar with resizable width (matches left sidebar)
     * Contains the Requirements/Report section moved from left sidebar
     */
    window.RightSidebar = function RightSidebar({ selectedProjectID }) {
        // --- Resizing Logic (matching left sidebar) ---
        const [sidebarWidth, setSidebarWidth] = useState(() => {
            const saved = localStorage.getItem('rightSidebarWidth');
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
                // Calculate width from right edge
                const newWidth = Math.max(320, Math.min(400, window.innerWidth - mouseEvent.clientX));
                setSidebarWidth(newWidth);
                localStorage.setItem('rightSidebarWidth', newWidth);
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

        return React.createElement(
            'aside',
            {
                ref: sidebarRef,
                id: 'right-sidebar',
                className: 'right-sidebar',
                'aria-label': 'Right sidebar',
                style: {
                    width: `${sidebarWidth}px`,
                    minWidth: `${sidebarWidth}px`,
                    height: '100vh',
                    backgroundColor: '#fff',
                    borderRadius: '0 5.56px 5.56px 0',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'visible',
                    flexShrink: 0,
                    // transition: 'width 220ms ease',
                    // zIndex: window.ZIndex?.SIDEBAR || 10
                }
            },
            // Resizing Handle (matching left sidebar exactly)
            React.createElement('div', {
                className: 'right-sidebar-resizer',
                onMouseDown: startResizing,
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 9999,
                    backgroundColor: isResizing ? '#4a90e2' : 'transparent',
                    transition: 'background-color 0.2s',
                    borderLeft: '1px solid transparent'
                },
                onMouseEnter: (e) => e.target.style.borderLeft = '2px solid #e4e4e4',
                onMouseLeave: (e) => e.target.style.borderLeft = '1px solid transparent'
            }),
            // Sidebar content
            React.createElement('div', {
                className: 'right-sidebar-content',
                style: {
                    flex: 1,
                    padding: '26px 20px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }
            },
                // Reports section (moved from left sidebar, redesigned)
                React.createElement('div', {
                        id: 'right-sidebar-requirements-wrapper',
                        style: { width: '100%', display: 'flex', flexDirection: 'column', gap: '0px' }
                    },
                    // Header "Reports"
                    React.createElement('h2', {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '700',
                                fontSize: '14px',
                                color: '#000000',
                                margin: '0 0 20px 0',
                                padding: '0'
                            }
                        }, 'Reports'
                    ),

                    // Generate User Stories Report Button
                    selectedProjectID && React.createElement('button', {
                            id: 'btn-generate-user-stories',
                            'aria-label': 'Generate User Stories Report',
                            onClick: async () => {
                                if (typeof window.generateUserStoryReport === 'function') {
                                    await window.generateUserStoryReport();
                                }
                            },
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                backgroundColor: '#ffffff',
                                border: '1.67px solid #e4e4e4',
                                borderRadius: '15px',
                                cursor: 'pointer',
                                marginBottom: '10px',
                                transition: 'background-color 0.2s, border-color 0.2s',
                                width: '100%',
                                boxSizing: 'border-box'
                            },
                            onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                e.currentTarget.style.borderColor = '#d0d0d0';
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e4e4e4';
                            }
                        },
                        React.createElement('img', {
                            src: './img/UserStoriesIcon.svg',
                            alt: '',
                            style: { width: '18px', height: '18px', flexShrink: 0 }
                        }),
                        React.createElement('span', {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                fontSize: '14px',
                                color: '#000000',
                                flex: 1,
                                textAlign: 'left'
                            }
                        }, 'Generate User Stories Report')
                    ),

                    // Generate Requirement Report Button
                    selectedProjectID && React.createElement('button', {
                            id: 'btn-generate-requirements',
                            'aria-label': 'Generate Requirement Report',
                            onClick: async () => {
                                if (typeof window.generateRequirementsReport === 'function') {
                                    await window.generateRequirementsReport();
                                }
                            },
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                backgroundColor: '#ffffff',
                                border: '1.67px solid #e4e4e4',
                                borderRadius: '15px',
                                cursor: 'pointer',
                                marginBottom: '20px',
                                transition: 'background-color 0.2s, border-color 0.2s',
                                width: '100%',
                                boxSizing: 'border-box'
                            },
                            onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                e.currentTarget.style.borderColor = '#d0d0d0';
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e4e4e4';
                            }
                        },
                        React.createElement('img', {
                            src: './img/RequirementsIcon.svg',
                            alt: '',
                            style: { width: '18px', height: '18px', flexShrink: 0 }
                        }),
                        React.createElement('span', {
                            style: {
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                fontSize: '14px',
                                color: '#000000',
                                flex: 1,
                                textAlign: 'left'
                            }
                        }, 'Generate Requirement Report')
                    ),

                    // Horizontal divider
                    React.createElement('hr', {
                        style: {
                            width: '100%',
                            border: 'none',
                            borderTop: '2px solid #e4e4e4',
                            margin: '0 0 20px 0'
                        }
                    }),

                    // Manage Requirements Panel Button
                    selectedProjectID && React.createElement('button', {
                            id: 'right-sidebar-manage-requirements-button',
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
                                padding: '10px 14px',
                                backgroundColor: 'rgb(30, 41, 59)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginBottom: '15px',
                                transition: 'background-color 0.2s',
                                width: '100%',
                                boxSizing: 'border-box'
                            },
                            onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = 'rgb(51, 65, 85)'; },
                            onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'rgb(30, 41, 59)'; }
                        },
                        React.createElement('img', {
                            src: './img/edit_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                            alt: '',
                            style: { width: '16px', height: '16px', filter: 'brightness(0) invert(1)', flexShrink: 0 }
                        }),
                        'Manage Requirements / Stories'
                    ),

                    // Requirements List
                    React.createElement('div', {
                        id: "div-requirements-list-right",
                        style: { display: "flex", flexDirection: "column", gap: "8px", width: '100%' }
                    }),

                    // No requirements label
                    React.createElement('p', {
                        id: "p-label-requirements-no-entry-right",
                        style: {
                            fontSize: '14px',
                            color: '#999',

                            textAlign: 'left',
                            marginTop: '20px',
                            fontFamily: 'Inter, Helvetica'
                        }
                    }, 'No reports yet')
                )
            )
        );
    };

    console.log('[RightSidebar] Component loaded');
})();
