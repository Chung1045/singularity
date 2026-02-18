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

        // Refresh reports when selectedProjectID changes
        useEffect(() => {
            if (selectedProjectID && typeof window.fetchProjectReports === 'function') {
                console.log('[RightSidebar] Project changed, refreshing reports for:', selectedProjectID);
                // Wait a bit for React to render the container
                setTimeout(() => {
                    const container = document.getElementById("div-requirements-list-right");
                    if (container) {
                        console.log('[RightSidebar] Container found, fetching reports');
                        window.fetchProjectReports(selectedProjectID);
                    } else {
                        console.warn('[RightSidebar] Container not found, retrying...');
                        setTimeout(() => {
                            window.fetchProjectReports(selectedProjectID);
                        }, 300);
                    }
                }, 100);
            }
        }, [selectedProjectID]);

        // Listen for reportGenerated event to refresh reports list
        useEffect(() => {
            const handleReportGenerated = (event) => {
                const projectID = event.detail?.projectID || selectedProjectID;
                if (projectID && typeof window.fetchProjectReports === 'function') {
                    console.log('[RightSidebar] Report generated event received, refreshing reports for:', projectID);
                    // Add a delay to ensure database write completes and DOM is ready
                    setTimeout(() => {
                        const container = document.getElementById("div-requirements-list-right");
                        if (container) {
                            console.log('[RightSidebar] Container found, fetching reports after generation');
                            window.fetchProjectReports(projectID);
                        } else {
                            console.warn('[RightSidebar] Container not found after report generation, retrying...');
                            setTimeout(() => {
                                window.fetchProjectReports(projectID);
                            }, 500);
                        }
                    }, 500);
                }
            };

            window.addEventListener('reportGenerated', handleReportGenerated);
            return () => {
                window.removeEventListener('reportGenerated', handleReportGenerated);
            };
        }, [selectedProjectID]);

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
                id: 'right-sidebar-resizer',
                className: 'right-sidebar-resizer',
                onMouseDown: startResizing,
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    // zIndex: 9999,
                    backgroundColor: isResizing ? 'rgba(74,144,226,0)' : 'transparent',
                    transition: 'background-color 0.2s',
                    borderLeft: '1px solid transparent'
                },
                onMouseEnter: (e) => e.target.style.borderLeft = '2px solid #e4e4e4',
                onMouseLeave: (e) => e.target.style.borderLeft = '1px solid transparent'
            }),
            // Sidebar content
            React.createElement('div', {
                id: 'right-sidebar-content',
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
                            id: 'right-sidebar-reports-header',
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
                            id: 'btn-generate-user-stories-icon',
                            src: './img/UserStoriesIcon.svg',
                            alt: '',
                            style: { width: '18px', height: '18px', flexShrink: 0 }
                        }),
                        React.createElement('span', {
                            id: 'btn-generate-user-stories-text',
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
                            id: 'btn-generate-requirements-icon',
                            src: './img/RequirementsIcon.svg',
                            alt: '',
                            style: { width: '18px', height: '18px', flexShrink: 0 }
                        }),
                        React.createElement('span', {
                            id: 'btn-generate-requirements-text',
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
                        id: 'right-sidebar-divider',
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
                            id: 'right-sidebar-manage-requirements-icon',
                            src: './img/edit_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                            alt: '',
                            style: { width: '16px', height: '16px', filter: 'brightness(0) invert(1)', flexShrink: 0 }
                        }),
                        React.createElement('span', {
                            id: 'right-sidebar-manage-requirements-text'
                        }, 'Manage Requirements / Stories')
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
