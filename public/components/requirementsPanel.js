(function () {
    const { useState, useEffect, useCallback } = React;

    /**
     * Semicolons inside one citation (e.g. `Table 1; A. Demographic data…`) must NOT split.
     * Only split on `;` when it starts another citation (Page/Table/Section).
     */
    const SOURCE_SEMICOLON_BEFORE_NEXT_CITATION = /;\s*(?=(?:Page|Table)\s+\d+|Section\s)/i;

    /** Split API strings: citation boundaries (see regex), newlines, or bullet lines — one row each. */
    function splitSourceReferenceSegments(text) {
        if (text == null || text === '') {
            return [];
        }
        const raw = String(text).trim();
        if (!raw) {
            return [];
        }
        const parts = [];
        raw.split(SOURCE_SEMICOLON_BEFORE_NEXT_CITATION).forEach((seg) => {
            seg.split(/\n+/).forEach((line) => {
                const t = line.replace(/^\s*[•\-\*]\s*/, '').trim();
                if (t) {
                    parts.push(t);
                }
            });
        });
        return parts.length ? parts : [raw];
    }

    /**
     * One remark string may list several citations (`Page 2…; Page 3…` or `Table 1…; Table 2…`).
     * Same rule as splitSourceReferenceSegments: do not split on arbitrary `;`.
     */
    function splitCompoundRemarkLines(text) {
        if (text == null || text === '') {
            return [];
        }
        const raw = String(text).trim();
        if (!raw) {
            return [];
        }
        const pieces = raw.split(SOURCE_SEMICOLON_BEFORE_NEXT_CITATION);
        const trimmed = pieces.map((p) => p.trim()).filter(Boolean);
        return trimmed.length > 1 ? trimmed : [raw];
    }

    const getCurrentTheme = () => {
        if (window.themeManager && typeof window.themeManager.getTheme === 'function') {
            return window.themeManager.getTheme();
        }

        return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    };

    /**
     * RequirementsPanel Component
     * A comprehensive pop-up panel for managing requirements, user stories, and reports
     * Features:
     * - Close button on top left
     * - Two main tabs: Requirements and User Stories
     * - Sub-tabs for Requirements: Functional and Non-Functional
     * - Display list of requirements/user stories
     * - Two buttons for generating reports
     * - List of generated reports with download/delete options
     */
    const RequirementsPanel = ({ projectID, onClose }) => {
        // State management
        const [mainTab, setMainTab] = useState('requirements'); // 'requirements' or 'user-stories'
        const [subTab, setSubTab] = useState('functional'); // 'functional' or 'non-functional'
        const [requirements, setRequirements] = useState([]);
        const [userStories, setUserStories] = useState([]);
        const [reports, setReports] = useState([]);
        const [loading, setLoading] = useState(false);
        const [generating, setGenerating] = useState(false);
        const [error, setError] = useState(null);
        const [successMessage, setSuccessMessage] = useState(null);
        const [theme, setTheme] = useState(getCurrentTheme);
        const isDarkTheme = theme === 'dark';
        /** Counts for enabling report buttons (full project, not sub-tab filter). */
        const [reportableRequirementsCount, setReportableRequirementsCount] = useState(0);
        const [totalUserStoriesCount, setTotalUserStoriesCount] = useState(0);

        useEffect(() => {
            const handleThemeChanged = (event) => {
                setTheme(event.detail?.theme === 'dark' ? 'dark' : getCurrentTheme());
            };

            window.addEventListener('appThemeChanged', handleThemeChanged);
            return () => {
                window.removeEventListener('appThemeChanged', handleThemeChanged);
            };
        }, []);

        // Fetch data when component mounts or tabs change
        useEffect(() => {
            if (projectID) {
                fetchData();
            }
        }, [projectID, mainTab, subTab]);

        // Listen for requirementsUpdated event from chat (when AI creates/updates requirements)
        useEffect(() => {
            const handleRequirementsUpdated = (event) => {
                console.log(' [RequirementsPanel] Received requirementsUpdated event');
                const eventProjectID = event.detail?.projectID;
                // Refresh if it's for this project or no project specified
                if (!eventProjectID || eventProjectID === projectID) {
                    console.log(' [RequirementsPanel] Refreshing data...');
                    fetchData();
                }
            };

            window.addEventListener('requirementsUpdated', handleRequirementsUpdated);
            return () => {
                window.removeEventListener('requirementsUpdated', handleRequirementsUpdated);
            };
        }, [projectID, mainTab, subTab]);

        const refreshEligibilityCounts = useCallback(async () => {
            if (!projectID || typeof window.fetchProjectReportEligibilityCounts !== 'function') {
                setReportableRequirementsCount(0);
                setTotalUserStoriesCount(0);
                return;
            }
            const { requirements, userStories } = await window.fetchProjectReportEligibilityCounts(projectID);
            setReportableRequirementsCount(requirements);
            setTotalUserStoriesCount(userStories);
        }, [projectID]);

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                await refreshEligibilityCounts();
                if (mainTab === 'requirements') {
                    await fetchRequirements();
                } else {
                    await fetchUserStories();
                }
                await fetchReports();
            } finally {
                setLoading(false);
            }
        };

        const fetchRequirements = async () => {
            try {
                const response = await fetch('/api/project/list/requirements', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({ projectID: projectID })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    // Filter by functional/non-functional type
                    const allRequirements = data.reports || [];
                    const filteredRequirements = allRequirements.filter(req => {
                        const reqType = req.details?.requirementType?.toLowerCase();
                        if (subTab === 'functional') {
                            return reqType === 'functional' || reqType === 'fr';
                        } else {
                            return reqType === 'non-functional' || reqType === 'nfr';
                        }
                    });
                    setRequirements(filteredRequirements);
                } else {
                    setRequirements([]);
                }
            } catch (err) {
                console.error('Error fetching requirements:', err);
                setRequirements([]);
            }
        };

        const fetchUserStories = async () => {
            try {
                const response = await fetch('/api/project/list/user-stories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({ projectID: projectID })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    setUserStories(data.reports || []);
                } else {
                    setUserStories([]);
                }
            } catch (err) {
                console.error('Error fetching user stories:', err);
                setUserStories([]);
            }
        };

        const fetchReports = async () => {
            try {
                const response = await fetch('/api/project/report/list', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({ projectID: projectID })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    setReports(data.reports || []);
                } else {
                    setReports([]);
                }
            } catch (err) {
                console.error('Error fetching reports:', err);
                setReports([]);
            }
        };

        const generateRequirementsReport = async () => {
            if (!projectID) {
                return;
            }
            if (typeof window.fetchProjectReportEligibilityCounts === 'function') {
                const counts = await window.fetchProjectReportEligibilityCounts(projectID);
                if (counts.requirements === 0) {
                    window.showNotification?.({
                        type: 'error',
                        title: 'No requirements',
                        message: 'Add functional or non-functional requirements before generating a report.',
                        actionText: 'OK'
                    });
                    return;
                }
            }
            setGenerating(true);
            setError(null);
            setSuccessMessage(null);
            try {
                const response = await fetch('/api/agent/document-generation/requirements', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    credentials: 'include',
                    body: JSON.stringify({ projectID: projectID })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    await fetchReports();
                    setSuccessMessage('Requirements report generated successfully!');
                    // Dispatch event to refresh sidebar reports
                    window.dispatchEvent(new CustomEvent('reportGenerated', { detail: { projectID } }));
                    setTimeout(() => setSuccessMessage(null), 3000);
                } else {
                    setError(data.message || 'Failed to generate requirements report');
                }
            } catch (err) {
                console.error('Error generating requirements report:', err);
                setError('An error occurred while generating the report');
            } finally {
                setGenerating(false);
            }
        };

        const generateUserStoriesReport = async () => {
            if (!projectID) {
                return;
            }
            if (typeof window.fetchProjectReportEligibilityCounts === 'function') {
                const counts = await window.fetchProjectReportEligibilityCounts(projectID);
                if (counts.userStories === 0) {
                    window.showNotification?.({
                        type: 'error',
                        title: 'No user stories',
                        message: 'Add user stories before generating a report.',
                        actionText: 'OK'
                    });
                    return;
                }
            }
            setGenerating(true);
            setError(null);
            setSuccessMessage(null);
            try {
                const response = await fetch('/api/agent/document-generation/user-stories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    credentials: 'include',
                    body: JSON.stringify({ projectID: projectID })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    await fetchReports();
                    setSuccessMessage('User stories report generated successfully!');
                    // Dispatch event to refresh sidebar reports
                    window.dispatchEvent(new CustomEvent('reportGenerated', { detail: { projectID } }));
                    setTimeout(() => setSuccessMessage(null), 3000);
                } else {
                    setError(data.message || 'Failed to generate user stories report');
                }
            } catch (err) {
                console.error('Error generating user stories report:', err);
                setError('An error occurred while generating the report');
            } finally {
                setGenerating(false);
            }
        };

        const downloadReport = async (reportID, reportName) => {
            try {
                const response = await fetch('/api/project/report/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({
                        projectID: projectID,
                        reportID: reportID
                    })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = reportName + '.docx';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    setError('Failed to download report');
                }
            } catch (err) {
                console.error('Error downloading report:', err);
                setError('An error occurred while downloading the report');
            }
        };

        const deleteReport = async (reportID) => {
            const confirmDelete = await window.showNotification({
                type: 'confirm',
                title: 'Warning',
                message: 'Are you sure you want to delete this report?\nYou will not be able to recover the deleted report!',
                actionText: 'Delete',
                cancelText: 'Cancel'
            });

            if (!confirmDelete) return;

            try {
                const response = await fetch('/api/project/report/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({
                        projectID: projectID,
                        reportID: reportID
                    })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    await fetchReports();
                    setSuccessMessage('Report deleted successfully!');
                    // Dispatch event to refresh sidebar reports
                    window.dispatchEvent(new CustomEvent('reportGenerated', { detail: { projectID } }));
                    setTimeout(() => setSuccessMessage(null), 3000);
                } else {
                    setError(data.message || 'Failed to delete report');
                }
            } catch (err) {
                console.error('Error deleting report:', err);
                setError('An error occurred while deleting the report');
            }
        };

        const deleteEntry = async (id) => {
            const type = mainTab === "requirements" ? "requirement" : mainTab
            const confirmDelete = await window.ConfirmModal.show({
                title: 'Warning',
                message: `Are you sure you want to delete this ${type} forever?`,
                confirmText: 'Delete',
                cancelText: 'Cancel'
            });

            if (!confirmDelete) return;

            try {
                let response = null

                if (mainTab === "requirements") {
                    response = await fetch('/api/project/delete/requirements', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': window.csrfToken
                        },
                        body: JSON.stringify({
                            projectID: projectID,
                            requirementID: id
                        })
                    });
                } else if (mainTab === "user-stories") {
                    response = await fetch('/api/project/delete/user-stories', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': window.csrfToken
                        },
                        body: JSON.stringify({
                            projectID: projectID,
                            storyID: id
                        })
                    });
                } else {
                    console.error("How do you get to here?")
                    throw new Error("Invalid type")
                }

                const data = await response.json();
                const type = mainTab === "requirements" ? "Requirement" : "User story"
                if (response.ok && data.successful) {
                    await fetchRequirements();
                    await fetchUserStories();
                    await refreshEligibilityCounts();
                    setSuccessMessage(`${type} deleted successfully`);
                    setTimeout(() => setSuccessMessage(null), 3000);
                } else {
                    setError(data.message || 'Failed to delete entry');
                }

            } catch (err) {
                await window.ConfirmModal.show({
                    title: 'Error',
                    message: `Unable to delete entry`,
                    confirmText: 'OK',
                });
            }

        }

        const colors = isDarkTheme ? {
            panelSectionBg: '#162033',
            panelSectionBorder: '1px solid rgba(148, 163, 184, 0.18)',
            panelSectionShadow: 'none',
            text: '#f8fafc',
            muted: '#cbd5e1',
            softText: '#e2e8f0',
            rowBg: '#162033',
            rowBorder: '#23324a',
            rowHoverBg: '#1f2937',
            rowHoverBorder: '#1f2937',
            countBg: '#1e293b',
            countText: '#e2e8f0',
            badgeBg: '#f8fafc',
            badgeText: '#020817',
            roleBg: 'rgba(79, 70, 229, 0.18)',
            roleIcon: '#a5b4fc',
            roleText: '#c7d2fe',
            sourceBg: '#111827',
            sourceBorder: '1px solid rgba(71, 85, 105, 0.45)',
            sourceCardShadow: '0 4px 24px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            sourceDocBarBg: 'linear-gradient(180deg, rgba(30, 41, 59, 0.55) 0%, rgba(17, 24, 39, 0.85) 100%)',
            sourceDocBarDivider: '1px solid rgba(56, 189, 248, 0.12)',
            sourceDocBarText: '#94a3b8',
            sourceDocName: '#f1f5f9',
            sourceIcon: '#38bdf8',
            sourceIconWrapBg: 'rgba(56, 189, 248, 0.1)',
            sourceIconWrapBorder: '1px solid rgba(56, 189, 248, 0.22)',
            sourceSectionTitle: '#7dd3fc',
            sourceLocationPillBg: 'rgba(56, 189, 248, 0.12)',
            sourceLocationPillBorder: '1px solid rgba(56, 189, 248, 0.2)',
            sourceQuoteBg: 'rgba(15, 23, 42, 0.65)',
            sourceQuoteText: '#e2e8f0',
            sourceText: '#e2e8f0',
            sourceLocation: '#94a3b8',
            errorBg: 'rgba(127, 29, 29, 0.3)',
            errorText: '#fca5a5',
            successBg: 'rgba(20, 83, 45, 0.28)',
            successText: '#86efac',
            generateBg: '#374151',
            generateHoverBg: '#374151',
            generateDisabledBg: '#94a3b8',
            reportIconBg: 'rgba(2, 132, 199, 0.16)',
            reportIcon: '#38bdf8',
            iconButtonBg: '#1e293b',
            iconButtonHoverBg: '#1f2937',
            iconButtonIcon: '#f8fafc',
            dangerButtonBg: 'rgba(127, 29, 29, 0.3)',
            dangerButtonHoverBg: 'rgba(153, 27, 27, 0.38)',
            dangerText: '#f87171'
        } : {
            panelSectionBg: '#ffffff',
            panelSectionBorder: 'none',
            panelSectionShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
            text: '#1c1d21',
            muted: '#666',
            softText: '#999',
            rowBg: '#f9f9fb',
            rowBorder: '#f0f0f0',
            rowHoverBg: '#f5f5f7',
            rowHoverBorder: '#e8e8ed',
            countBg: '#f2f2f7',
            countText: '#666',
            badgeBg: '#1c1d21',
            badgeText: '#ffffff',
            roleBg: '#e0e7ff',
            roleIcon: '#4f46e5',
            roleText: '#4f46e5',
            sourceBg: '#ffffff',
            sourceBorder: '1px solid rgba(148, 163, 184, 0.35)',
            sourceCardShadow: '0 2px 12px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15, 23, 42, 0.04)',
            sourceDocBarBg: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            sourceDocBarDivider: '1px solid rgba(148, 163, 184, 0.28)',
            sourceDocBarText: '#64748b',
            sourceDocName: '#0f172a',
            sourceIcon: '#0284c7',
            sourceIconWrapBg: '#e0f2fe',
            sourceIconWrapBorder: '1px solid rgba(14, 165, 233, 0.35)',
            sourceSectionTitle: '#0369a1',
            sourceLocationPillBg: '#e0f2fe',
            sourceLocationPillBorder: '1px solid rgba(14, 165, 233, 0.35)',
            sourceQuoteBg: '#f8fafc',
            sourceQuoteText: '#334155',
            sourceText: '#0f172a',
            sourceLocation: '#64748b',
            errorBg: '#fee2e2',
            errorText: '#dc2626',
            successBg: '#dcfce7',
            successText: '#16a34a',
            generateBg: '#1e293b',
            generateHoverBg: '#334155',
            generateDisabledBg: '#94a3b8',
            reportIconBg: '#e0f2fe',
            reportIcon: '#0284c7',
            iconButtonBg: '#f2f2f7',
            iconButtonHoverBg: '#e8e8ed',
            iconButtonIcon: '#1c1d21',
            dangerButtonBg: '#fef2f2',
            dangerButtonHoverBg: '#fee2e2',
            dangerText: '#dc2626'
        };

        const canGenerateRequirementsReport = reportableRequirementsCount > 0;
        const canGenerateUserStoriesReport = totalUserStoriesCount > 0;
        const requirementsReportButtonDisabled = generating;
        const userStoriesReportButtonDisabled = generating;

        // Get current data to display
        const currentData = mainTab === 'requirements' ? requirements : userStories;

        // Render component
        return React.createElement('div', {
            id: 'requirements-panel-overlay',
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
                if (e.target.id === 'requirements-panel-overlay') {
                    onClose();
                }
            }
        },
            React.createElement('div', {
                id: 'requirements-panel-container',
                className: 'requirement-list',
                style: {
                    position: 'relative',
                    width: '720px',
                    maxWidth: '95%',
                    height: '85vh',
                    maxHeight: '85vh',
                    backgroundColor: '#f7f7f7',
                    borderRadius: '20px',
                    border: '1px solid #f0f0f080',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                },
                onClick: (e) => e.stopPropagation()
            },
                // Header Section
                React.createElement('div', {
                    id: 'requirements-panel-header',
                    className: 'header',
                    style: {
                        width: '100%',
                        minHeight: mainTab === 'requirements' ? '110px' : '70px',
                        position: 'relative',
                        backgroundColor: '#ffffff',
                        overflow: 'visible',
                        flexShrink: 0,
                        borderBottom: '1px solid #e4e4e4',
                        transition: 'min-height 0.2s ease'
                    }
                },
                    // Close button (top left)
                    React.createElement('button', {
                        id: 'requirements-panel-close-btn',
                        onClick: onClose,
                        'aria-label': 'Close panel',
                        style: {
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f2f2f7',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            zIndex: 10,
                            transition: 'background-color 0.2s'
                        },
                        onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#e8e8ed',
                        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = '#f2f2f7'
                    },
                        React.createElement('svg', {
                            id: 'requirements-panel-close-icon',
                            style: { width: '18px', height: '18px' },
                            viewBox: '0 0 24 24',
                            fill: 'none'
                        },
                            React.createElement('path', {
                                d: 'M6 6L18 18M6 18L18 6',
                                stroke: '#1c1d21',
                                strokeWidth: '2',
                                strokeLinecap: 'round'
                            })
                        )
                    ),

                    // Main tabs (Requirements / User Stories)
                    React.createElement('div', {
                        id: 'requirements-panel-main-tabs',
                        style: {
                            position: 'absolute',
                            top: '14px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '10px',
                            zIndex: 5
                        }
                    },
                        React.createElement('button', {
                            id: 'requirements-panel-tab-requirements',
                            onClick: () => {
                                setMainTab('requirements');
                                setSubTab('functional');
                            },
                            style: {
                                minWidth: '140px',
                                height: '36px',
                                padding: '0 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: mainTab === 'requirements' ? '#1c1d21' : '#f2f2f7',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                fontSize: '13px',
                                color: mainTab === 'requirements' ? '#ffffff' : '#1c1d21'
                            },
                            onMouseEnter: (e) => {
                                if (mainTab !== 'requirements') {
                                    e.currentTarget.style.backgroundColor = '#e8e8ed';
                                }
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = mainTab === 'requirements' ? '#1c1d21' : '#f2f2f7';
                            }
                        }, 'Requirements'),
                        React.createElement('button', {
                            id: 'requirements-panel-tab-user-stories',
                            onClick: () => setMainTab('user-stories'),
                            style: {
                                minWidth: '140px',
                                height: '36px',
                                padding: '0 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: mainTab === 'user-stories' ? '#1c1d21' : '#f2f2f7',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                fontSize: '13px',
                                color: mainTab === 'user-stories' ? '#ffffff' : '#1c1d21'
                            },
                            onMouseEnter: (e) => {
                                if (mainTab !== 'user-stories') {
                                    e.currentTarget.style.backgroundColor = '#e8e8ed';
                                }
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = mainTab === 'user-stories' ? '#1c1d21' : '#f2f2f7';
                            }
                        }, 'User Stories')
                    ),

                    // Sub-tabs (Functional / Non-Functional) - only for Requirements
                    mainTab === 'requirements' && React.createElement('div', {
                        id: 'requirements-panel-sub-tabs',
                        style: {
                            position: 'absolute',
                            top: '64px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    },
                        React.createElement('button', {
                            id: 'requirements-panel-subtab-functional',
                            onClick: () => setSubTab('functional'),
                            style: {
                                minWidth: '130px',
                                height: '32px',
                                padding: '0 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: subTab === 'functional' ? '#e8e8ed' : 'transparent',
                                border: '1px solid #e4e4e4',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '500',
                                fontSize: '12px',
                                color: '#1c1d21',
                                transition: 'all 0.2s'
                            },
                            onMouseEnter: (e) => {
                                if (subTab !== 'functional') {
                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = subTab === 'functional' ? '#e8e8ed' : 'transparent';
                            }
                        }, 'Functional'),
                        React.createElement('button', {
                            id: 'requirements-panel-subtab-non-functional',
                            onClick: () => setSubTab('non-functional'),
                            style: {
                                minWidth: '130px',
                                height: '32px',
                                padding: '0 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: subTab === 'non-functional' ? '#e8e8ed' : 'transparent',
                                border: '1px solid #e4e4e4',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '500',
                                fontSize: '12px',
                                color: '#1c1d21',
                                transition: 'all 0.2s'
                            },
                            onMouseEnter: (e) => {
                                if (subTab !== 'non-functional') {
                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = subTab === 'non-functional' ? '#e8e8ed' : 'transparent';
                            }
                        }, 'Non-Functional')
                    )
                ),

                // Content Area
                React.createElement('div', {
                    id: 'requirements-panel-content',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        overflow: 'hidden',
                        padding: '20px',
                        gap: '16px'
                    }
                },
                    // Error/Success Messages
                    error && React.createElement('div', {
                        id: 'requirements-panel-error',
                        style: {
                            padding: '12px 16px',
                            backgroundColor: colors.errorBg,
                            color: colors.errorText,
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontFamily: 'Inter, Helvetica',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    },
                        React.createElement('span', { id: 'requirements-panel-error-icon', style: { fontSize: '16px' } }, ''),
                        error
                    ),

                    successMessage && React.createElement('div', {
                        id: 'requirements-panel-success',
                        style: {
                            padding: '12px 16px',
                            backgroundColor: colors.successBg,
                            color: colors.successText,
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontFamily: 'Inter, Helvetica',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    },
                        React.createElement('span', { id: 'requirements-panel-success-icon', style: { fontSize: '16px' } }, '✓'),
                        successMessage
                    ),

                    // Requirements/User Stories List Section
                    React.createElement('div', {
                        id: 'requirements-panel-list-section',
                        style: {
                            backgroundColor: colors.panelSectionBg,
                            borderRadius: '16px',
                            padding: '16px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: colors.panelSectionShadow,
                            border: colors.panelSectionBorder
                        }
                    },
                        // Section Header
                        React.createElement('div', {
                            id: 'requirements-panel-list-header',
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '12px',
                                flexShrink: 0
                            }
                        },
                            React.createElement('h3', {
                                id: 'requirements-panel-list-title',
                                style: {
                                    margin: 0,
                                    fontFamily: 'Inter, Helvetica',
                                    fontWeight: '600',
                                    fontSize: '15px',
                                    color: colors.text
                                }
                            }, mainTab === 'requirements'
                                ? (subTab === 'functional' ? 'Functional Requirements' : 'Non-Functional Requirements')
                                : 'User Stories'),
                            React.createElement('span', {
                                id: 'requirements-panel-list-count',
                                style: {
                                    padding: '4px 10px',
                                    backgroundColor: colors.countBg,
                                    borderRadius: '12px',
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    color: colors.countText
                                }
                            }, `${currentData.length} items`)
                        ),

                        // Scrollable List
                        React.createElement('div', {
                            id: 'requirements-panel-list-scroll',
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                paddingRight: '4px'
                            }
                        },
                            loading ? React.createElement('div', {
                                id: 'requirements-panel-loading',
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '40px',
                                    color: colors.muted,
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '14px'
                                }
                            }, 'Loading...') :
                            currentData.length === 0 ? React.createElement('div', {
                                id: 'requirements-panel-empty-state',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '40px',
                                    color: colors.softText,
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '14px',
                                    textAlign: 'center'
                                }
                            },
                                React.createElement('div', {
                                    id: 'requirements-panel-empty-icon',
                                    style: { fontSize: '32px', marginBottom: '12px', opacity: 0.5 }
                                }, mainTab === 'requirements' ? '' : ''),
                                React.createElement('p', {
                                    id: 'requirements-panel-empty-text',
                                    style: { margin: 0 }
                                },
                                    mainTab === 'requirements'
                                        ? 'No requirements found. Chat with the AI to generate requirements.'
                                        : 'No user stories found. Chat with the AI to generate user stories.'
                                )
                            ) :
                            currentData.map((item, index) => {
                                const isRequirement = mainTab === 'requirements';
                                const seqNum = isRequirement
                                    ? (item.details?.requirementSeq || (index + 1))
                                    : (item.details?.storySeq || (index + 1));
                                const prefix = isRequirement
                                    ? (subTab === 'functional' ? 'FR' : 'NFR')
                                    : 'US';
                                const title = item.details?.title || 'Untitled';
                                const description = item.details?.description || 'No description';
                                const role = item.details?.role || null;
                                const sourceReferences = item.details?.sourceReference || [];
                                const itemId = item.requirementID || item.storyID || `item-${index}`;

                                return React.createElement('div', {
                                    id: `requirements-panel-item-${itemId}`,
                                    key: itemId,
                                    style: {
                                        backgroundColor: colors.rowBg,
                                        borderRadius: '12px',
                                        padding: '14px 16px',
                                        border: `1px solid ${colors.rowBorder}`,
                                        transition: 'all 0.2s'
                                    },
                                    onMouseEnter: (e) => {
                                        e.currentTarget.style.backgroundColor = colors.rowHoverBg;
                                        e.currentTarget.style.borderColor = colors.rowHoverBorder;
                                    },
                                    onMouseLeave: (e) => {
                                        e.currentTarget.style.backgroundColor = colors.rowBg;
                                        e.currentTarget.style.borderColor = colors.rowBorder;
                                    }
                                },
                                    //////
                                    React.createElement('div', {
                                        id: `requirements-panel-item-content-${itemId}`,
                                        style: {
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px'
                                        }
                                    },
                                        // Sequence badge
                                        React.createElement('div', {
                                            id: `requirements-panel-item-badge-${itemId}`,
                                            style: {
                                                padding: '4px 10px',
                                                    backgroundColor: colors.badgeBg,
                                                    color: colors.badgeText,
                                                borderRadius: '6px',
                                                fontFamily: 'Inter, Helvetica',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                flexShrink: 0
                                            }
                                        }, `${prefix}-${String(seqNum).padStart(2, '0')}`),
                                        // Content
                                        React.createElement('div', {
                                            id: `requirements-panel-item-body-${itemId}`,
                                            style: { flex: 1, minWidth: 0 }
                                        },
                                            React.createElement('h4', {
                                                id: `requirements-panel-item-title-${itemId}`,
                                                style: {
                                                    margin: '0 0 6px 0',
                                                    fontFamily: 'Inter, Helvetica',
                                                    fontWeight: '600',
                                                    fontSize: '13px',
                                                    color: colors.text
                                                }
                                            }, title),
                                            React.createElement('p', {
                                                id: `requirements-panel-item-description-${itemId}`,
                                                title: description,
                                                style: {
                                                    margin: '0 0 8px 0',
                                                    fontFamily: 'Inter, Helvetica',
                                                    fontSize: '12px',
                                                    color: colors.muted,
                                                    lineHeight: '1.5',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    cursor: 'help'
                                                }
                                            }, description),
                                            // Role badge (if available)
                                            role && React.createElement('div', {
                                                id: `requirements-panel-item-role-${itemId}`,
                                                style: {
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '3px 8px',
                                                    backgroundColor: colors.roleBg,
                                                    borderRadius: '4px',
                                                    marginBottom: '8px'
                                                }
                                            },
                                                React.createElement('svg', {
                                                    id: `requirements-panel-item-role-icon-${itemId}`,
                                                    width: '14',
                                                    height: '14',
                                                    viewBox: '0 0 24 24',
                                                    fill: 'none'
                                                },
                                                    React.createElement('path', {
                                                        d: 'M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z',
                                                        stroke: colors.roleIcon,
                                                        strokeWidth: '2',
                                                        strokeLinecap: 'round',
                                                        strokeLinejoin: 'round'
                                                    })
                                                ),
                                                React.createElement('span', {
                                                    id: `requirements-panel-item-role-label-${itemId}`,
                                                    style: {
                                                        fontFamily: 'Inter, Helvetica',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        color: colors.roleText
                                                    }
                                                }, role)
                                            ),
                                            // Source references
                                            sourceReferences.length > 0 && React.createElement('div', {
                                                id: `requirements-panel-item-sources-${itemId}`,
                                                style: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '10px',
                                                    marginTop: role ? '0' : '8px'
                                                }
                                            },
                                                sourceReferences.map((src, srcIndex) => {
                                                    const docLabel = src.documentName || 'Unknown Document';
                                                    const remarks = (src.remarks && String(src.remarks).trim()) || '';
                                                    const loc = (src.location && String(src.location).trim()) || '';
                                                    const sameBlob = Boolean(remarks && loc && remarks === loc);
                                                    const locSegments = splitSourceReferenceSegments(loc);
                                                    const remarkSegments = splitSourceReferenceSegments(remarks);
                                                    const rows = [];
                                                    if (sameBlob && remarks) {
                                                        rows.push({ location: null, remark: remarks });
                                                    } else if (remarks && loc && !sameBlob) {
                                                        if (locSegments.length === remarkSegments.length && locSegments.length > 0) {
                                                            locSegments.forEach((l, i) => {
                                                                rows.push({
                                                                    location: l,
                                                                    remark: remarkSegments[i] != null ? remarkSegments[i] : null
                                                                });
                                                            });
                                                        } else {
                                                            locSegments.forEach((l) => rows.push({ location: l, remark: null }));
                                                            remarkSegments.forEach((r) => rows.push({ location: null, remark: r }));
                                                        }
                                                    } else if (remarks) {
                                                        remarkSegments.forEach((r) => rows.push({ location: null, remark: r }));
                                                    } else if (loc) {
                                                        locSegments.forEach((l) => rows.push({ location: l, remark: null }));
                                                    }
                                                    if (rows.length === 0 && (loc || remarks)) {
                                                        if (remarks && loc && !sameBlob) {
                                                            rows.push({ location: loc, remark: remarks });
                                                        } else if (remarks) {
                                                            rows.push({ location: null, remark: remarks });
                                                        } else {
                                                            rows.push({ location: loc, remark: null });
                                                        }
                                                    }

                                                    return React.createElement('div', {
                                                        key: src.documentID || srcIndex,
                                                        'data-source-index': srcIndex,
                                                        id: `requirements-panel-source-${itemId}-${srcIndex}`,
                                                        style: {
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'stretch',
                                                            overflow: 'hidden',
                                                            backgroundColor: colors.sourceBg,
                                                            borderRadius: '10px',
                                                            border: colors.sourceBorder,
                                                            boxShadow: colors.sourceCardShadow
                                                        }
                                                    },
                                                        React.createElement('div', {
                                                            id: `requirements-panel-source-docbar-${itemId}-${srcIndex}`,
                                                            style: {
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                minWidth: 0,
                                                                padding: '10px 12px',
                                                                background: colors.sourceDocBarBg,
                                                                borderBottom: colors.sourceDocBarDivider
                                                            }
                                                        },
                                                            React.createElement('div', {
                                                                style: {
                                                                    width: '30px',
                                                                    height: '30px',
                                                                    borderRadius: '8px',
                                                                    flexShrink: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    backgroundColor: colors.sourceIconWrapBg,
                                                                    border: colors.sourceIconWrapBorder
                                                                }
                                                            },
                                                                React.createElement('svg', {
                                                                    id: `requirements-panel-source-icon-${itemId}-${srcIndex}`,
                                                                    width: '16',
                                                                    height: '16',
                                                                    viewBox: '0 0 24 24',
                                                                    fill: 'none',
                                                                    'aria-hidden': true
                                                                },
                                                                    React.createElement('path', {
                                                                        d: 'M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z',
                                                                        stroke: colors.sourceIcon,
                                                                        strokeWidth: '2',
                                                                        strokeLinecap: 'round',
                                                                        strokeLinejoin: 'round'
                                                                    }),
                                                                    React.createElement('path', {
                                                                        d: 'M14 2V8H20',
                                                                        stroke: colors.sourceIcon,
                                                                        strokeWidth: '2',
                                                                        strokeLinecap: 'round',
                                                                        strokeLinejoin: 'round'
                                                                    })
                                                                )
                                                            ),
                                                            React.createElement('div', {
                                                                style: {
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '2px',
                                                                    minWidth: 0,
                                                                    flex: 1
                                                                }
                                                            },
                                                                
                                                                React.createElement('span', {
                                                                    id: `requirements-panel-source-name-${itemId}-${srcIndex}`,
                                                                    style: {
                                                                        fontFamily: 'Inter, Helvetica',
                                                                        fontSize: '13px',
                                                                        fontWeight: '600',
                                                                        color: colors.sourceDocName,
                                                                        lineHeight: 1.4,
                                                                        letterSpacing: '-0.01em',
                                                                        wordBreak: 'break-word'
                                                                    },
                                                                    title: docLabel
                                                                }, docLabel)
                                                            )
                                                        ),
                                                        rows.length > 0 && React.createElement('div', {
                                                            id: `requirements-panel-source-citations-${itemId}-${srcIndex}`,
                                                            style: {
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '12px',
                                                                padding: '12px 10px 14px 10px'
                                                            }
                                                        },
                                                            rows.map((row, lineIdx) =>
                                                                React.createElement('div', {
                                                                    key: 'src-cite-' + lineIdx,
                                                                    style: {
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: row.location && row.remark ? '8px' : '0'
                                                                    }
                                                                },
                                                                    row.location
                                                                        ? React.createElement('div', {
                                                                            id: `requirements-panel-source-location-${itemId}-${srcIndex}-${lineIdx}`,
                                                                            style: {
                                                                                alignSelf: 'flex-start',
                                                                                maxWidth: '100%',
                                                                                fontFamily: 'Inter, Helvetica',
                                                                                fontSize: '11px',
                                                                                fontWeight: '600',
                                                                                letterSpacing: '0.02em',
                                                                                color: colors.sourceSectionTitle,
                                                                                padding: '5px 10px',
                                                                                lineHeight: 1.45,
                                                                                whiteSpace: 'normal',
                                                                                wordBreak: 'normal',
                                                                                overflowWrap: 'break-word',
                                                                                backgroundColor: colors.sourceLocationPillBg,
                                                                                border: colors.sourceLocationPillBorder,
                                                                                borderRadius: '999px'
                                                                            }
                                                                        }, row.location)
                                                                        : null,
                                                                    row.remark
                                                                        ? (() => {
                                                                            const remarkLines = splitCompoundRemarkLines(row.remark);
                                                                            const pStyle = {
                                                                                margin: 0,
                                                                                fontFamily: 'Inter, Helvetica',
                                                                                fontSize: '12px',
                                                                                lineHeight: 1.6,
                                                                                color: colors.sourceQuoteText,
                                                                                whiteSpace: 'normal',
                                                                                wordBreak: 'normal',
                                                                                overflowWrap: 'break-word'
                                                                            };
                                                                            return React.createElement('div', {
                                                                                id: `requirements-panel-source-quote-${itemId}-${srcIndex}-${lineIdx}`,
                                                                                style: {
                                                                                    margin: '0 2px',
                                                                                    padding: '12px 14px',
                                                                                    backgroundColor: colors.sourceQuoteBg,
                                                                                    border: '2px solid #6c5ccc',
                                                                                    borderRadius: '10px',
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    gap: '12px'
                                                                                }
                                                                            },
                                                                                remarkLines.map((line, subIdx) =>
                                                                                    React.createElement('p', {
                                                                                        key: 'rq-' + subIdx,
                                                                                        id: `requirements-panel-source-remark-${itemId}-${srcIndex}-${lineIdx}-${subIdx}`,
                                                                                        style: pStyle
                                                                                    }, '\u201c' + line + '\u201d')
                                                                                )
                                                                            );
                                                                        })()
                                                                        : null
                                                                )
                                                            )
                                                        )
                                                    );
                                                })
                                            )
                                        ),
                                        React.createElement('button', {
                                                id: `requirements-panel-item-delete-${itemId}`,
                                                onClick: () => deleteEntry(itemId),
                                                'aria-label': 'Delete entry',
                                                style: {
                                                    width: '32px',
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: colors.dangerButtonBg,
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                },
                                                onMouseEnter: (e) => {
                                                    e.currentTarget.style.backgroundColor = colors.dangerButtonHoverBg;
                                                },
                                                onMouseLeave: (e) => {
                                                    e.currentTarget.style.backgroundColor = colors.dangerButtonBg;
                                                }
                                            },
                                            React.createElement('svg', {
                                                    width: '16',
                                                    height: '16',
                                                    viewBox: '0 0 24 24',
                                                    fill: 'none'
                                                },
                                                React.createElement('path', {
                                                    d: 'M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z',
                                                    stroke: colors.dangerText,
                                                    strokeWidth: '2',
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round'
                                                })
                                            )
                                        )
                                    )
                                );
                            })
                        )
                    ),

                    // Report Generation Buttons
                    React.createElement('div', {
                        id: 'requirements-panel-report-buttons',
                        style: {
                            display: 'flex',
                            gap: '12px',
                            flexShrink: 0
                        }
                    },
                        React.createElement('button', {
                            id: 'requirements-panel-btn-generate-requirements',
                            onClick: generateRequirementsReport,
                            disabled: requirementsReportButtonDisabled,
                            title: !canGenerateRequirementsReport && !generating
                                ? 'Add functional or non-functional requirements first'
                                : undefined,
                            style: {
                                flex: 1,
                                padding: '12px 16px',
                                backgroundColor: requirementsReportButtonDisabled ? colors.generateDisabledBg : colors.generateBg,
                                border: 'none',
                                borderRadius: '12px',
                                color: '#ffffff',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: requirementsReportButtonDisabled ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            },
                            onMouseEnter: (e) => {
                                if (!requirementsReportButtonDisabled) {
                                    const dk = document.documentElement.getAttribute('data-theme') === 'dark';
                                    if (!dk) e.currentTarget.style.backgroundColor = colors.generateHoverBg;
                                }
                            },
                            onMouseLeave: (e) => {
                                if (!requirementsReportButtonDisabled) {
                                    const dk = document.documentElement.getAttribute('data-theme') === 'dark';
                                    if (!dk) e.currentTarget.style.backgroundColor = colors.generateBg;
                                }
                            }
                        },
                            React.createElement('img', {
                                id: 'requirements-panel-btn-generate-requirements-icon',
                                src: './img/RequirementsIcon.svg',
                                alt: '',
                                style: {
                                    width: '16px',
                                    height: '16px',
                                    filter: 'brightness(0) invert(1)'
                                }
                            }),
                            generating ? 'Generating...' : 'Generate Requirements Report'
                        ),
                        React.createElement('button', {
                            id: 'requirements-panel-btn-generate-userstories',
                            onClick: generateUserStoriesReport,
                            disabled: userStoriesReportButtonDisabled,
                            title: !canGenerateUserStoriesReport && !generating
                                ? 'Add user stories first'
                                : undefined,
                            style: {
                                flex: 1,
                                padding: '12px 16px',
                                backgroundColor: userStoriesReportButtonDisabled ? colors.generateDisabledBg : colors.generateBg,
                                border: 'none',
                                borderRadius: '12px',
                                color: '#ffffff',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: userStoriesReportButtonDisabled ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            },
                            onMouseEnter: (e) => {
                                if (!userStoriesReportButtonDisabled) {
                                    const dk = document.documentElement.getAttribute('data-theme') === 'dark';
                                    if (!dk) e.currentTarget.style.backgroundColor = colors.generateHoverBg;
                                }
                            },
                            onMouseLeave: (e) => {
                                if (!userStoriesReportButtonDisabled) {
                                    const dk = document.documentElement.getAttribute('data-theme') === 'dark';
                                    if (!dk) e.currentTarget.style.backgroundColor = colors.generateBg;
                                }
                            }
                        },
                            React.createElement('img', {
                                id: 'requirements-panel-btn-generate-userstories-icon',
                                src: './img/UserStoriesIcon.svg',
                                alt: '',
                                style: {
                                    width: '16px',
                                    height: '16px',
                                    filter: 'brightness(0) invert(1)'
                                }
                            }),
                            generating ? 'Generating...' : 'Generate User Stories Report'
                        )
                    ),

                    // Generated Reports Section
                    React.createElement('div', {
                        id: 'requirements-panel-reports-section',
                        style: {
                            backgroundColor: colors.panelSectionBg,
                            borderRadius: '16px',
                            padding: '16px',
                            flexShrink: 0,
                            maxHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: colors.panelSectionShadow,
                            border: colors.panelSectionBorder
                        }
                    },
                        // Section Header
                        React.createElement('div', {
                            id: 'requirements-panel-reports-header',
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '12px',
                                flexShrink: 0
                            }
                        },
                            React.createElement('h3', {
                                id: 'requirements-panel-reports-title',
                                style: {
                                    margin: 0,
                                    fontFamily: 'Inter, Helvetica',
                                    fontWeight: '600',
                                    fontSize: '15px',
                                    color: colors.text
                                }
                            }, 'Generated Reports'),
                            React.createElement('span', {
                                id: 'requirements-panel-reports-count',
                                style: {
                                    padding: '4px 10px',
                                    backgroundColor: colors.countBg,
                                    borderRadius: '12px',
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    color: colors.countText
                                }
                            }, `${reports.length} reports`)
                        ),

                        // Reports List
                        React.createElement('div', {
                            id: 'requirements-panel-reports-list',
                            style: {
                                flex: 1,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingRight: '4px'
                            }
                        },
                            reports.length === 0 ? React.createElement('div', {
                                id: 'requirements-panel-reports-empty',
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '20px',
                                    color: colors.softText,
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '13px'
                                }
                            }, 'No reports generated yet.') :
                            reports.map((report, index) => {
                                const reportTypeLabel = report.reportType === 'userStories'
                                    ? 'User Stories'
                                    : 'Requirements';
                                const reportId = report.reportID || `report-${index}`;

                                return React.createElement('div', {
                                    id: `requirements-panel-report-${reportId}`,
                                    key: reportId,
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        backgroundColor: colors.rowBg,
                                        borderRadius: '10px',
                                        border: `1px solid ${colors.rowBorder}`,
                                        transition: 'all 0.2s'
                                    },
                                    onMouseEnter: (e) => {
                                        e.currentTarget.style.backgroundColor = colors.rowHoverBg;
                                        e.currentTarget.style.borderColor = colors.rowHoverBorder;
                                    },
                                    onMouseLeave: (e) => {
                                        e.currentTarget.style.backgroundColor = colors.rowBg;
                                        e.currentTarget.style.borderColor = colors.rowBorder;
                                    }
                                },
                                    React.createElement('div', {
                                        id: `requirements-panel-report-info-${reportId}`,
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            flex: 1,
                                            minWidth: 0
                                        }
                                    },
                                        // Report icon wrapper
                                        React.createElement('div', {
                                            id: `requirements-panel-report-icon-wrapper-${reportId}`,
                                            style: {
                                                width: '32px',
                                                height: '32px',
                                                backgroundColor: colors.reportIconBg,
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }
                                        },
                                            React.createElement('svg', {
                                                id: `requirements-panel-report-icon-${reportId}`,
                                                width: '16',
                                                height: '16',
                                                viewBox: '0 0 24 24',
                                                fill: 'none'
                                            },
                                                React.createElement('path', {
                                                    d: 'M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z',
                                                    stroke: colors.reportIcon,
                                                    strokeWidth: '2',
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round'
                                                }),
                                                React.createElement('path', {
                                                    d: 'M14 2V8H20',
                                                    stroke: colors.reportIcon,
                                                    strokeWidth: '2',
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round'
                                                })
                                            )
                                        ),
                                        // Report info
                                        React.createElement('div', {
                                            id: `requirements-panel-report-details-${reportId}`,
                                            style: { flex: 1, minWidth: 0 }
                                        },
                                            React.createElement('div', {
                                                id: `requirements-panel-report-name-${reportId}`,
                                                style: {
                                                    fontFamily: 'Inter, Helvetica',
                                                    fontWeight: '500',
                                                    fontSize: '13px',
                                                    color: colors.text,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }
                                            }, report.reportName || 'Untitled Report'),
                                            React.createElement('div', {
                                                id: `requirements-panel-report-type-${reportId}`,
                                                style: {
                                                    fontFamily: 'Inter, Helvetica',
                                                    fontSize: '11px',
                                                    color: colors.muted
                                                }
                                            }, reportTypeLabel)
                                        )
                                    ),
                                    // Action buttons
                                    React.createElement('div', {
                                        id: `requirements-panel-report-actions-${reportId}`,
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }
                                    },
                                        // Download button
                                        React.createElement('button', {
                                            id: `requirements-panel-report-download-${reportId}`,
                                            onClick: () => downloadReport(report.reportID, report.reportName),
                                            'aria-label': 'Download report',
                                            style: {
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: colors.iconButtonBg,
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            },
                                            onMouseEnter: (e) => {
                                                e.currentTarget.style.backgroundColor = colors.iconButtonHoverBg;
                                            },
                                            onMouseLeave: (e) => {
                                                e.currentTarget.style.backgroundColor = colors.iconButtonBg;
                                            }
                                        },
                                            React.createElement('svg', {
                                                id: `requirements-panel-report-download-icon-${reportId}`,
                                                width: '16',
                                                height: '16',
                                                viewBox: '0 0 24 24',
                                                fill: 'none'
                                            },
                                                React.createElement('path', {
                                                    d: 'M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3',
                                                    stroke: colors.iconButtonIcon,
                                                    strokeWidth: '2',
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round'
                                                })
                                            )
                                        ),
                                        // Delete button
                                        React.createElement('button', {
                                            id: `requirements-panel-report-delete-${reportId}`,
                                            onClick: () => deleteReport(report.reportID),
                                            'aria-label': 'Delete report',
                                            style: {
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: colors.dangerButtonBg,
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            },
                                            onMouseEnter: (e) => {
                                                e.currentTarget.style.backgroundColor = colors.dangerButtonHoverBg;
                                            },
                                            onMouseLeave: (e) => {
                                                e.currentTarget.style.backgroundColor = colors.dangerButtonBg;
                                            }
                                        },
                                            React.createElement('svg', {
                                                id: `requirements-panel-report-delete-icon-${reportId}`,
                                                width: '16',
                                                height: '16',
                                                viewBox: '0 0 24 24',
                                                fill: 'none'
                                            },
                                                React.createElement('path', {
                                                    d: 'M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z',
                                                    stroke: colors.dangerText,
                                                    strokeWidth: '2',
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round'
                                                })
                                            )
                                        )
                                    )
                                );
                            })
                        )
                    )
                )
            )
        );
    };

    // Global function to open the requirements panel
    window.openRequirementsPanel = function() {
        const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : localStorage.getItem('selectedProjectID');

        if (!projectID) {
            console.error('[RequirementsPanel] No project selected');
            alert('Please select a project first');
            return;
        }

        // Check if panel already exists
        const existingPanel = document.getElementById('requirements-panel-root');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create container for the panel
        const container = document.createElement('div');
        container.id = 'requirements-panel-root';
        document.body.appendChild(container);

        // Render the panel
        const root = ReactDOM.createRoot(container);
        root.render(
            React.createElement(RequirementsPanel, {
                projectID: projectID,
                onClose: () => {
                    root.unmount();
                    container.remove();
                }
            })
        );

        console.log('[RequirementsPanel] Panel opened for project:', projectID);
    };

    // Make component available globally
    window.RequirementsPanel = RequirementsPanel;
})();
