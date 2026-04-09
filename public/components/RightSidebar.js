(function () {
    const { useState, useEffect, useRef, useCallback } = React;
    const COLLAPSED_WIDTH = 72;
    const MIN_SIDEBAR_WIDTH = 320;
    const MAX_SIDEBAR_WIDTH = 400;
    const TOGGLE_ICON = './img/double-arrow-right-svgrepo-com.svg';

    function readStoredBoolean(key, fallbackValue) {
        try {
            const saved = localStorage.getItem(key);
            return saved !== null ? JSON.parse(saved) : fallbackValue;
        } catch (error) {
            console.error(`[RightSidebar] Failed to parse "${key}" from localStorage.`, error);
            return fallbackValue;
        }
    }

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
        const [isCollapsed, setIsCollapsed] = useState(() =>
            readStoredBoolean('rightSidebarCollapsed', false)
        );
        const [isResizing, setIsResizing] = useState(false);
        const sidebarRef = useRef(null);
        const effectiveWidth = isCollapsed ? COLLAPSED_WIDTH : sidebarWidth;

        const [reportEligibility, setReportEligibility] = useState({
            requirements: 0,
            userStories: 0,
            loading: true
        });

        console.log('[RightSidebar] selectedProjectID:', selectedProjectID);

        // Refresh reports when selectedProjectID changes
        useEffect(() => {
            if (!isCollapsed && selectedProjectID && typeof window.fetchProjectReports === 'function') {
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
        }, [selectedProjectID, isCollapsed]);

        useEffect(() => {
            let cancelled = false;

            async function loadEligibility() {
                if (!selectedProjectID || typeof window.fetchProjectReportEligibilityCounts !== 'function') {
                    if (!cancelled) {
                        setReportEligibility({ requirements: 0, userStories: 0, loading: false });
                    }
                    return;
                }
                if (!cancelled) {
                    setReportEligibility((prev) => ({ ...prev, loading: true }));
                }
                const { requirements, userStories } = await window.fetchProjectReportEligibilityCounts(selectedProjectID);
                if (!cancelled) {
                    setReportEligibility({ requirements, userStories, loading: false });
                }
            }

            loadEligibility();
            return () => {
                cancelled = true;
            };
        }, [selectedProjectID]);

        useEffect(() => {
            const refreshEligibility = () => {
                if (!selectedProjectID || typeof window.fetchProjectReportEligibilityCounts !== 'function') {
                    return;
                }
                window.fetchProjectReportEligibilityCounts(selectedProjectID).then(({ requirements, userStories }) => {
                    setReportEligibility({ requirements, userStories, loading: false });
                });
            };

            window.addEventListener('requirementsUpdated', refreshEligibility);
            window.addEventListener('reportGenerated', refreshEligibility);
            return () => {
                window.removeEventListener('requirementsUpdated', refreshEligibility);
                window.removeEventListener('reportGenerated', refreshEligibility);
            };
        }, [selectedProjectID]);

        // Listen for reportGenerated event to refresh reports list
        useEffect(() => {
            const handleReportGenerated = (event) => {
                const projectID = event.detail?.projectID || selectedProjectID;
                if (!isCollapsed && projectID && typeof window.fetchProjectReports === 'function') {
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
        }, [selectedProjectID, isCollapsed]);

        const startResizing = useCallback((e) => {
            if (isCollapsed) {
                return;
            }
            e.preventDefault();
            setIsResizing(true);
        }, [isCollapsed]);

        const stopResizing = useCallback(() => {
            setIsResizing(false);
        }, []);

        const resize = useCallback((mouseEvent) => {
            if (isResizing) {
                // Calculate width from right edge
                const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - mouseEvent.clientX));
                setSidebarWidth(newWidth);
                localStorage.setItem('rightSidebarWidth', newWidth);
            }
        }, [isResizing]);

        const toggleCollapsed = useCallback(() => {
            setIsCollapsed((currentValue) => {
                const nextValue = !currentValue;
                localStorage.setItem('rightSidebarCollapsed', JSON.stringify(nextValue));
                return nextValue;
            });
        }, []);

        useEffect(() => {
            if (isCollapsed && isResizing) {
                setIsResizing(false);
            }
        }, [isCollapsed, isResizing]);

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

        useEffect(() => {
            const expandForTour = () => {
                setIsCollapsed(false);
                try {
                    localStorage.setItem('rightSidebarCollapsed', JSON.stringify(false));
                } catch (_) {}
            };
            window.addEventListener('singularity-tour-expand-right', expandForTour);
            return () => window.removeEventListener('singularity-tour-expand-right', expandForTour);
        }, []);
        // -----------------------

        const reportActionsBlocked = !selectedProjectID || reportEligibility.loading;

        return React.createElement(
            'aside',
            {
                ref: sidebarRef,
                id: 'right-sidebar',
                className: 'right-sidebar',
                'aria-label': 'Right sidebar',
                style: {
                    width: `${effectiveWidth}px`,
                    minWidth: `${effectiveWidth}px`,
                    height: '100vh',
                    backgroundColor: '#fff',
                    borderRadius: '0 5.56px 5.56px 0',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    flexShrink: 0
                    // borderLeft: '1px solid rgba(15, 23, 42, 0.08)',
                    // transition: 'width 220ms ease'
                }
            },
            !isCollapsed && React.createElement('div', {
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
                    backgroundColor: isResizing ? 'rgba(74,144,226,0)' : 'transparent',
                    transition: 'background-color 0.2s',
                    borderLeft: '1px solid transparent'
                },
                onMouseEnter: (e) => e.target.style.borderLeft = '2px solid #e4e4e4',
                onMouseLeave: (e) => e.target.style.borderLeft = '1px solid transparent'
            }),
            isCollapsed
                ? React.createElement('div', { className: 'right-sidebar-collapsed-shell' },
                    React.createElement('div', { className: 'right-sidebar-collapsed-label' }, 'Reports'),
                    React.createElement('div', { className: 'right-sidebar-footer' },
                        React.createElement('button', {
                                id: 'right-sidebar-toggle',
                                className: 'right-sidebar-toggle right-sidebar-toggle--collapsed',
                                type: 'button',
                                title: 'Expand right sidebar',
                                'aria-label': 'Expand right sidebar',
                                'aria-expanded': false,
                                onClick: toggleCollapsed
                            },
                            React.createElement('img', {
                                className: 'right-sidebar-toggle-icon',
                                src: TOGGLE_ICON,
                                alt: 'Expand right sidebar'
                            })
                        )
                    )
                )
                : React.createElement(React.Fragment, null,
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
                        React.createElement('div', {
                                id: 'right-sidebar-requirements-wrapper',
                                style: { width: '100%', display: 'flex', flexDirection: 'column', gap: '0px' }
                            },
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
                            React.createElement('div', {
                                id: 'right-sidebar-tour-reports-spotlight',
                                style: {
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0
                                }
                            },
                            selectedProjectID && React.createElement('div', {
                                    id: 'right-sidebar-tour-report-actions',
                                    style: {
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0
                                    }
                                },
                            React.createElement('button', {
                                    id: 'btn-generate-user-stories',
                                    type: 'button',
                                    disabled: reportActionsBlocked,
                                    'aria-label': 'Generate User Stories Report',
                                    title: reportEligibility.loading
                                        ? 'Loading…'
                                        : reportEligibility.userStories === 0
                                            ? 'Add user stories before generating a report'
                                            : undefined,
                                    onClick: async () => {
                                        if (reportActionsBlocked) {
                                            return;
                                        }
                                        const pid = selectedProjectID;
                                        const counts =
                                            typeof window.fetchProjectReportEligibilityCounts === 'function'
                                                ? await window.fetchProjectReportEligibilityCounts(pid)
                                                : { userStories: 0, requirements: 0 };
                                        if (counts.userStories === 0) {
                                            window.showNotification?.({
                                                type: 'error',
                                                title: 'No user stories',
                                                message: 'Add user stories before generating a report.',
                                                actionText: 'OK'
                                            });
                                            return;
                                        }
                                        if (typeof window.generateUserStoryReport === 'function') {
                                            await window.generateUserStoryReport(pid);
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
                                        cursor: reportActionsBlocked ? 'not-allowed' : 'pointer',
                                        marginBottom: '10px',
                                        transition: 'background-color 0.2s, border-color 0.2s',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    },
                                    onMouseEnter: (e) => {
                                        if (reportActionsBlocked) {
                                            return;
                                        }
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : '#f5f5f5';
                                        e.currentTarget.style.borderColor = isDark ? 'rgba(148, 163, 184, 0.3)' : '#d0d0d0';
                                    },
                                    onMouseLeave: (e) => {
                                        if (reportActionsBlocked) {
                                            return;
                                        }
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? 'var(--dm-surface-2, #162033)' : '#ffffff';
                                        e.currentTarget.style.borderColor = isDark ? 'rgba(148, 163, 184, 0.3)' : '#e4e4e4';
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
                            React.createElement('button', {
                                    id: 'btn-generate-requirements',
                                    type: 'button',
                                    disabled: reportActionsBlocked,
                                    'aria-label': 'Generate Requirement Report',
                                    title: reportEligibility.loading
                                        ? 'Loading…'
                                        : reportEligibility.requirements === 0
                                            ? 'Add requirements before generating a report'
                                            : undefined,
                                    onClick: async () => {
                                        if (reportActionsBlocked) {
                                            return;
                                        }
                                        const pid = selectedProjectID;
                                        const counts =
                                            typeof window.fetchProjectReportEligibilityCounts === 'function'
                                                ? await window.fetchProjectReportEligibilityCounts(pid)
                                                : { userStories: 0, requirements: 0 };
                                        if (counts.requirements === 0) {
                                            window.showNotification?.({
                                                type: 'error',
                                                title: 'No requirements',
                                                message: 'Add functional or non-functional requirements before generating a report.',
                                                actionText: 'OK'
                                            });
                                            return;
                                        }
                                        if (typeof window.generateRequirementsReport === 'function') {
                                            await window.generateRequirementsReport(pid);
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
                                        cursor: reportActionsBlocked ? 'not-allowed' : 'pointer',
                                        marginBottom: '20px',
                                        transition: 'background-color 0.2s, border-color 0.2s',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    },
                                    onMouseEnter: (e) => {
                                        if (reportActionsBlocked) {
                                            return;
                                        }
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : '#f5f5f5';
                                        e.currentTarget.style.borderColor = isDark ? 'rgba(148, 163, 184, 0.3)' : '#d0d0d0';
                                    },
                                    onMouseLeave: (e) => {
                                        if (reportActionsBlocked) {
                                            return;
                                        }
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? 'var(--dm-surface-2, #162033)' : '#ffffff';
                                        e.currentTarget.style.borderColor = isDark ? 'rgba(148, 163, 184, 0.3)' : '#e4e4e4';
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
                            React.createElement('hr', {
                                    id: 'right-sidebar-divider',
                                    style: {
                                        width: '100%',
                                        border: 'none',
                                        borderTop: '2px solid #e4e4e4',
                                        margin: '0 0 20px 0'
                                    }
                                }),
                            React.createElement('button', {
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
                                    id: 'right-sidebar-manage-requirements-icon',
                                    src: './img/edit_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                    alt: '',
                                    style: { width: '16px', height: '16px', filter: 'brightness(0) invert(1)', flexShrink: 0 }
                                }),
                                React.createElement('span', {
                                    id: 'right-sidebar-manage-requirements-text'
                                }, 'Manage Requirements / Stories')
                            )
                            ),
                            React.createElement('div', {
                                id: 'div-requirements-list-right',
                                style: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }
                            }),
                            React.createElement('p', {
                                id: 'p-label-requirements-no-entry-right',
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
                    ),
                    React.createElement('div', { className: 'right-sidebar-footer' },
                        React.createElement('button', {
                                id: 'right-sidebar-toggle',
                                className: 'right-sidebar-toggle',
                                type: 'button',
                                title: 'Collapse right sidebar',
                                'aria-label': 'Collapse right sidebar',
                                'aria-expanded': true,
                                onClick: toggleCollapsed
                            },
                            React.createElement('img', {
                                className: 'right-sidebar-toggle-icon',
                                src: TOGGLE_ICON,
                                alt: 'Collapse right sidebar'
                            })
                        )
                    )
                )
        );
    };

    console.log('[RightSidebar] Component loaded');
})();
