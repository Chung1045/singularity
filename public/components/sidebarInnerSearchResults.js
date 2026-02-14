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
                    headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID })
                });

                const data = await response.json();
                console.log('[SearchResults] Requirements API response:', data);
                
                if (response.ok && data.successful) {
                    const requirements = data.reports || [];
                    console.log('[SearchResults] Total requirements:', requirements.length);
                    
                    // Filter requirements by title, description, or ID
                    const filtered = requirements.filter(req => {
                        const title = (req.title || '').toLowerCase();
                        const description = (req.details?.description || '').toLowerCase();
                        const reqId = (req.reportID || '').toLowerCase();
                        return title.includes(query) || description.includes(query) || reqId.includes(query);
                    }).map(req => ({
                        id: req.reportID,
                        title: req.title,
                        reportID: req.reportID,
                        details: req.details
                    }));
                    
                    console.log('[SearchResults] Filtered requirements:', filtered.length);
                    return filtered;
                }
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID })
                });

                const data = await response.json();
                console.log('[SearchResults] User Stories API response:', data);
                
                if (response.ok && data.successful) {
                    const stories = data.reports || [];
                    console.log('[SearchResults] Total user stories:', stories.length);
                    
                    // Filter user stories by title or description
                    const filtered = stories.filter(story => {
                        const title = (story.title || '').toLowerCase();
                        const description = (story.details?.description || '').toLowerCase();
                        const storyId = (story.reportID || '').toLowerCase();
                        return title.includes(query) || description.includes(query) || storyId.includes(query);
                    }).map(story => ({
                        id: story.reportID,
                        title: story.title,
                        reportID: story.reportID,
                        details: story.details
                    }));
                    
                    console.log('[SearchResults] Filtered user stories:', filtered.length);
                    return filtered;
                }
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
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }
                            },
                                React.createElement('span', {
                                    style: { fontWeight: '500' }
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
                    }, `REQUIREMENTS (${results.requirements.length})`),
                    
                    results.requirements.map((req, index) => 
                        React.createElement('div', {
                            key: req.id || index,
                            id: `sidebar-search-requirement-item-${index}`,
                            className: 'search-result-item',
                            onClick: () => onResultClick('requirement', req)
                        },
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }
                            },
                                React.createElement('span', {
                                    style: { fontWeight: '500' }
                                }, req.title),
                                req.details?.description && React.createElement('span', {
                                    style: {
                                        fontSize: '11px',
                                        color: '#666',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }
                                }, req.details.description)
                            )
                        )
                    )
                ),

                // User Stories Section (only on non-home pages)
                !isHomePage && results.userStories.length > 0 && React.createElement('div', {
                    id: 'sidebar-search-stories-group',
                    className: 'search-result-group'
                },
                    React.createElement('div', {
                        id: 'sidebar-search-stories-header',
                        className: 'search-result-header'
                    }, `USER STORIES (${results.userStories.length})`),
                    
                    results.userStories.map((story, index) => 
                        React.createElement('div', {
                            key: story.id || index,
                            id: `sidebar-search-story-item-${index}`,
                            className: 'search-result-item',
                            onClick: () => onResultClick('story', story)
                        },
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }
                            },
                                React.createElement('span', {
                                    style: { fontWeight: '500' }
                                }, story.title),
                                story.details?.description && React.createElement('span', {
                                    style: {
                                        fontSize: '11px',
                                        color: '#666',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }
                                }, story.details.description)
                            )
                        )
                    )
                ),

                // Clear button
                hasResults && React.createElement('div', {
                    id: 'sidebar-search-results-actions',
                    className: 'search-result-actions',
                    style: {
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '1px solid #e4e4e4'
                    }
                },
                    React.createElement('button', {
                        id: 'sidebar-search-results-clear-btn',
                        className: 'search-clear-btn',
                        onClick: onClose,
                        style: {
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e4',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            fontFamily: 'Inter, Helvetica',
                            fontSize: '12px',
                            color: '#1c1d21',
                            transition: 'all 0.2s'
                        }
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
