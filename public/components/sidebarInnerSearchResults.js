(function () {
    const { useState, useEffect } = React;

    window.sidebarInnerSearchResults = function sidebarInnerSearchResults({
        searchQuery,
        onResultClick,
        onClose,
        isHomePage = false,
        sidebarCollapsed = false,
        isPanel = false
    }) {
        const [results, setResults] = useState({
            files: [],
            requirements: [],
            userStories: []
        });
        const [loading, setLoading] = useState(false);

        // Fetch and filter results when searchQuery changes
        useEffect(() => {
            if (!searchQuery || searchQuery.trim().length < 1) {
                setResults({ files: [], requirements: [], userStories: [] });
                return;
            }

            setLoading(true);

            // Perform search across all data sources
            performSearch(searchQuery)
                .then(data => {
                    setResults(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Search error:', err);
                    setLoading(false);
                });
        }, [searchQuery]);

        const performSearch = async (query) => {
            const lowerQuery = query.toLowerCase();
            console.log('[SearchResults] Performing search for:', lowerQuery);

            try {
                // Get current project ID from global function
                const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;

                if (!projectID) {
                    console.warn('[SearchResults] No project selected for search');
                    return {
                        files: [],
                        requirements: [],
                        userStories: []
                    };
                }

                console.log('[SearchResults] Searching in project:', projectID);

                // Fetch all data in parallel
                const [filesData, requirementsData, userStoriesData] = await Promise.all([
                    fetchFiles(projectID, lowerQuery),
                    fetchRequirements(projectID, lowerQuery),
                    fetchUserStories(projectID, lowerQuery)
                ]);

                console.log('[SearchResults] Results:', {
                    files: filesData.length,
                    requirements: requirementsData.length,
                    userStories: userStoriesData.length
                });

                return {
                    files: filesData,
                    requirements: requirementsData,
                    userStories: userStoriesData
                };
            } catch (error) {
                console.error('[SearchResults] Search failed:', error);
                return {
                    files: [],
                    requirements: [],
                    userStories: []
                };
            }
        };

        const fetchFiles = async (projectID, query) => {
            try {
                const response = await fetch('/api/project/file/list', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID })
                });

                const data = await response.json();
                console.log('[SearchResults] Files API response:', data);

                if (response.ok) {
                    const files = data.files || [];
                    console.log('[SearchResults] Total files:', files.length);

                    // Filter files by name or extension
                    const filtered = files.filter(file => {
                        const fileName = (file.documentName || '').toLowerCase();
                        const fileExt = (file.documentExt || '').toLowerCase();
                        return fileName.includes(query) || fileExt.includes(query);
                    }).map(file => ({
                        id: file.documentID,
                        name: `${file.documentName}${file.documentExt}`,
                        documentID: file.documentID,
                        documentName: file.documentName,
                        documentExt: file.documentExt
                    }));

                    console.log('[SearchResults] Filtered files:', filtered.length);
                    return filtered;
                }
                return [];
            } catch (error) {
                console.error('[SearchResults] Error fetching files:', error);
                return [];
            }
        };

        const fetchRequirements = async (projectID, query) => {
            try {
                const response = await fetch('/api/project/list/requirements', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID })
                });

                const data = await response.json();
                console.log('[SearchResults] Requirements API response:', data);
                console.log('[SearchResults] Response OK:', response.ok);
                console.log('[SearchResults] Data successful:', data.successful);

                if (response.ok && data.successful) {
                    const requirements = data.reports || [];
                    console.log('[SearchResults] Total requirements:', requirements.length);
                    console.log('[SearchResults] Requirements data:', requirements);
                    console.log('[SearchResults] Search query:', query);

                    // Filter requirements by title, description, or ID
                    const filtered = requirements.filter(req => {
                        const title = (req.details?.title || req.title || '').toLowerCase();
                        const description = (req.details?.description || '').toLowerCase();
                        const reqId = (req.reportID || '').toLowerCase();
                        const requirementID = (req.details?.requirementID || '').toLowerCase();

                        // Check for formatted ID like FR-01, NFR-01
                        const reqType = req.details?.requirementType?.toLowerCase();
                        const reqSeq = req.details?.requirementSeq || 0;
                        const prefix = (reqType === 'functional' || reqType === 'fr') ? 'fr' : 'nfr';
                        const formattedId = `${prefix}-${String(reqSeq).padStart(2, '0')}`.toLowerCase();

                        const matchTitle = title.includes(query);
                        const matchDesc = description.includes(query);
                        const matchId = reqId.includes(query);
                        const matchReqId = requirementID.includes(query);
                        const matchFormattedId = formattedId.includes(query);

                        console.log(`[SearchResults] Checking requirement "${title}":`, {
                            title,
                            formattedId,
                            matchTitle,
                            matchDesc,
                            matchId,
                            matchReqId,
                            matchFormattedId
                        });

                        return matchTitle || matchDesc || matchId || matchReqId || matchFormattedId;
                    }).map(req => ({
                        id: req.reportID,
                        title: req.details?.title || req.title,
                        reportID: req.reportID,
                        details: req.details
                    }));

                    console.log('[SearchResults] Filtered requirements:', filtered.length);
                    console.log('[SearchResults] Filtered requirements data:', filtered);
                    return filtered;
                }
                console.log('[SearchResults] Requirements: response not ok or not successful');
                return [];
            } catch (error) {
                console.error('[SearchResults] Error fetching requirements:', error);
                return [];
            }
        };

        const fetchUserStories = async (projectID, query) => {
            try {
                const response = await fetch('/api/project/list/user-stories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ projectID })
                });

                const data = await response.json();
                console.log('[SearchResults] User Stories API response:', data);
                console.log('[SearchResults] User Stories response.ok:', response.ok);
                console.log('[SearchResults] User Stories data.successful:', data.successful);

                if (response.ok && data.successful) {
                    const stories = data.reports || [];
                    console.log('[SearchResults] Total user stories:', stories.length);
                    console.log('[SearchResults] User stories data:', stories);
                    console.log('[SearchResults] Search query for stories:', query);

                    // Filter user stories by title or description
                    const filtered = stories.filter(story => {
                        const title = (story.details?.title || story.title || '').toLowerCase();
                        const description = (story.details?.description || '').toLowerCase();
                        const storyId = (story.reportID || '').toLowerCase();
                        const storyID = (story.details?.storyID || '').toLowerCase();

                        // Check for formatted ID like US-01
                        const storySeq = story.details?.storySeq || 0;
                        const formattedId = `us-${String(storySeq).padStart(2, '0')}`.toLowerCase();

                        const matchTitle = title.includes(query);
                        const matchDesc = description.includes(query);
                        const matchStoryId = storyId.includes(query);
                        const matchStoryID = storyID.includes(query);
                        const matchFormattedId = formattedId.includes(query);

                        console.log(`[SearchResults] Checking story "${title}":`, {
                            title,
                            formattedId,
                            matchTitle,
                            matchDesc,
                            matchStoryId,
                            matchStoryID,
                            matchFormattedId
                        });

                        return matchTitle || matchDesc || matchStoryId || matchStoryID || matchFormattedId;
                    }).map(story => ({
                        id: story.reportID,
                        title: story.details?.title || story.title,
                        reportID: story.reportID,
                        details: story.details
                    }));

                    console.log('[SearchResults] Filtered user stories:', filtered.length);
                    console.log('[SearchResults] Filtered user stories data:', filtered);
                    return filtered;
                }
                console.log('[SearchResults] User stories: response not ok or not successful');
                return [];
            } catch (error) {
                console.error('[SearchResults] Error fetching user stories:', error);
                return [];
            }
        };

        if (!searchQuery || searchQuery.trim().length < 1 || sidebarCollapsed) {
            return null; // Don't render if no query or sidebar is collapsed
        }

        const hasResults = results.files.length > 0 ||
                          results.requirements.length > 0 ||
                          results.userStories.length > 0;

        return React.createElement('div', {
            className: isPanel ? 'search-results-panel-content' : 'search-results-overlay',
            id: 'sidebar-search-results'
        },
            // Loading state
            loading && React.createElement('div', {
                id: 'sidebar-search-results-loading',
                className: 'search-loading'
            }, 'Searching...'),

            // Results
            !loading && React.createElement('div', {
                id: 'sidebar-search-results-content',
                className: 'search-results-content'
            },

                // Files Section
                results.files.length > 0 && React.createElement('div', {
                    id: 'sidebar-search-files-group',
                    className: 'search-result-group'
                },
                    React.createElement('div', {
                        id: 'sidebar-search-files-header',
                        className: 'search-result-header'
                    }, `FILES (${results.files.length})`),

                    results.files.map((file, index) =>
                        React.createElement('div', {
                            key: file.id || index,
                            id: `sidebar-search-file-item-${index}`,
                            className: 'search-result-item',
                            onClick: () => onResultClick('file', file)
                        },
                            React.createElement('div', {
                                className: 'search-result-item-inner',
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    minWidth: 0
                                }
                            },
                                React.createElement('span', {
                                    className: 'search-result-item-title',
                                    style: { fontWeight: '500' },
                                    title: file.name
                                }, file.name)
                            )
                        )
                    )
                ),

                // Requirements Section
                results.requirements.length > 0 && React.createElement('div', {
                    id: 'sidebar-search-requirements-group',
                    className: 'search-result-group'
                },
                    React.createElement('div', {
                        id: 'sidebar-search-requirements-header',
                        className: 'search-result-header'
                    }, `Requirements (${results.requirements.length})`),

                    results.requirements.map((req, index) =>
                        React.createElement('div', {
                            key: req.id || index,
                            id: `sidebar-search-requirement-item-${index}`,
                            className: 'search-result-item',
                            onClick: () => onResultClick('requirement', req)
                        },
                            React.createElement('div', {
                                className: 'search-result-item-inner',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    minWidth: 0
                                }
                            },
                                React.createElement('div', {
                                    style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }
                                },
                                    React.createElement('span', {
                                        className: 'search-result-item-id',
                                        style: { fontSize: '11px', fontWeight: '600' }
                                    }, (() => {
                                        const reqType = req.details?.requirementType?.toLowerCase();
                                        const seq = req.details?.requirementSeq || 0;
                                        const prefix = (reqType === 'functional' || reqType === 'fr') ? 'FR' : 'NFR';
                                        return `${prefix}-${String(seq).padStart(2, '0')}`;
                                    })()),
                                    React.createElement('span', {
                                        className: 'search-result-item-title',
                                        style: { fontWeight: '500' },
                                        title: req.title
                                    }, req.title)
                                ),
                                req.details?.description && React.createElement('span', {
                                    className: 'search-result-item-desc',
                                    style: { fontSize: '11px' },
                                    title: req.details.description
                                }, req.details.description)
                            )
                        )
                    )
                ),

                // User Stories Section
                results.userStories.length > 0 && React.createElement('div', {
                    id: 'sidebar-search-stories-group',
                    className: 'search-result-group'
                },
                    React.createElement('div', {
                        id: 'sidebar-search-stories-header',
                        className: 'search-result-header'
                    }, `User Stories (${results.userStories.length})`),

                    results.userStories.map((story, index) =>
                        React.createElement('div', {
                            key: story.id || index,
                            id: `sidebar-search-story-item-${index}`,
                            className: 'search-result-item',
                            onClick: () => onResultClick('story', story)
                        },
                            React.createElement('div', {
                                className: 'search-result-item-inner',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    minWidth: 0
                                }
                            },
                                React.createElement('div', {
                                    style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }
                                },
                                    React.createElement('span', {
                                        className: 'search-result-item-id',
                                        style: { fontSize: '11px', fontWeight: '600' }
                                    }, `US-${String(story.details?.storySeq || 0).padStart(2, '0')}`),
                                    React.createElement('span', {
                                        className: 'search-result-item-title',
                                        style: { fontWeight: '500' },
                                        title: story.title
                                    }, story.title)
                                ),
                                story.details?.description && React.createElement('span', {
                                    className: 'search-result-item-desc',
                                    style: { fontSize: '11px' },
                                    title: story.details.description
                                }, story.details.description)
                            )
                        )
                    )
                ),

                // Clear button
                hasResults && React.createElement('div', {
                    id: 'sidebar-search-results-actions',
                    className: 'search-result-actions'
                },
                    React.createElement('button', {
                        id: 'sidebar-search-results-clear-btn',
                        className: 'search-clear-btn',
                        onClick: onClose
                    }, 'Clear')
                ),

                // Empty state
                !hasResults && React.createElement('div', {
                    id: 'sidebar-search-results-empty',
                    className: 'search-empty'
                }, `No results found for "${searchQuery}"`)
            )
        );
    };
})();
