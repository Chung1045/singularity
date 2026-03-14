/**
 * SearchPanel Component
 * Displays search input and results panel next to the collapsed sidebar
 */

(function() {
    const { useState, useEffect, useRef } = React;

    const SearchPanel = ({ isOpen, onClose, sidebarCollapsed, isHomePage = false, isOverlay }) => {
        const [searchQuery, setSearchQuery] = useState('');
        const [sidebarWidth, setSidebarWidth] = useState(302);
        const [selectedItem, setSelectedItem] = useState(null);
        const [selectedType, setSelectedType] = useState(null);
        const [fileMetadata, setFileMetadata] = useState({ size: null, date: null });
        const panelRef = useRef(null);

        // Track sidebar width changes
        useEffect(() => {
            const updateSidebarWidth = () => {
                const savedWidth = localStorage.getItem('sidebarWidth');
                const expandedWidth = savedWidth ? parseInt(savedWidth, 10) : 302;
                const collapsedWidth = 77;
                // When collapsed, add offset to position after the ::after dark bar element
                const effectiveWidth = sidebarCollapsed ? collapsedWidth : expandedWidth + 5;
                setSidebarWidth(effectiveWidth);
            };

            // Initial update
            updateSidebarWidth();

            // Listen for localStorage changes (sidebar resize)
            window.addEventListener('storage', updateSidebarWidth);

            // Listen for custom event from sidebar resize
            window.addEventListener('sidebarResized', updateSidebarWidth);

            return () => {
                window.removeEventListener('storage', updateSidebarWidth);
                window.removeEventListener('sidebarResized', updateSidebarWidth);
            };
        }, [sidebarCollapsed]);

        // Reset when panel closes
        useEffect(() => {
            if (!isOpen) {
                setSearchQuery('');
                setSelectedItem(null);
                setSelectedType(null);
                setFileMetadata({ size: null, date: null });
            }
        }, [isOpen]);

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
                console.error('[SearchPanel] Error formatting date:', e, dateString);
                return 'Unknown';
            }
        };

        // Fetch file metadata when a file is selected
        useEffect(() => {
            const fetchFileMetadata = async () => {
                if (selectedType === 'file' && selectedItem?.documentID) {
                    try {
                        const projectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
                        if (!projectID) {
                            console.warn('[SearchPanel] No projectID available for file stats');
                            setFileMetadata({ size: null, date: null });
                            return;
                        }

                        console.log('[SearchPanel] Fetching file stats for:', selectedItem.documentID);

                        // Fetch file stats from dedicated endpoint
                        const response = await fetch('/api/project/file/stats', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken
                            },
                            body: JSON.stringify({ projectID, documentID: selectedItem.documentID })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            console.log('[SearchPanel] File stats response:', data);
                            if (data.successful) {
                                setFileMetadata({
                                    size: data.size || null,
                                    date: data.lastModified || null
                                });
                                console.log('[SearchPanel] Set file metadata:', { size: data.size, date: data.lastModified });
                            } else {
                                console.warn('[SearchPanel] Stats fetch unsuccessful:', data.message);
                                setFileMetadata({ size: null, date: null });
                            }
                        } else {
                            const errorText = await response.text();
                            console.error('[SearchPanel] Stats fetch failed:', response.status, errorText);
                            setFileMetadata({ size: null, date: null });
                        }
                    } catch (error) {
                        console.error('[SearchPanel] Error fetching file metadata:', error);
                        setFileMetadata({ size: null, date: null });
                    }
                } else {
                    setFileMetadata({ size: null, date: null });
                }
            };

            fetchFileMetadata();
        }, [selectedItem, selectedType]);

        // Close panel when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (panelRef.current && !panelRef.current.contains(event.target) &&
                    !event.target.closest('#sidebar-search-form') &&
                    !event.target.closest('.search-file-field')) {
                    onClose();
                }
            };

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
            }
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen, onClose]);

        // Handle result click
        const handleResultClick = (type, item) => {
            console.log('Search result clicked:', type, item);
            setSelectedItem(item);
            setSelectedType(type);
        };

        // Handle back button
        const handleBack = () => {
            setSelectedItem(null);
            setSelectedType(null);
            setFileMetadata({ size: null, date: null });
        };

        if (!isOpen) {
            return null;
        }

        const effectiveSidebarWidth = (isOverlay && !sidebarCollapsed) ? 320 : sidebarWidth;
        const panelLeft = `${effectiveSidebarWidth}px`;
        const backdropLeft = `${effectiveSidebarWidth + 400}px`; // sidebar + panel width

        return React.createElement(React.Fragment, null,
            // Backdrop (only on the right side, after the panel)
            React.createElement('div', {
                id: 'search-backdrop',
                onClick: onClose,
                style: {
                    position: 'fixed',
                    top: 0,
                    left: backdropLeft,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    zIndex: 9998
                }
            }),
            // Panel
            React.createElement('div', {
                ref: panelRef,
                id: 'search-panel',
                style: {
                    position: 'fixed',
                    top: '0',
                    left: panelLeft,
                    width: '400px',
                    height: '100vh',
                    backgroundColor: '#fff',
                    borderRadius: '0',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    fontFamily: "'Inter', Helvetica, sans-serif"
                }
            },
            // Header with title and close button (logo row)
            React.createElement('div', {
                id: 'search-panel-header',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '22px 20px 20px 20px',
                    backgroundColor: '#fff'
                }
            },
                React.createElement('h2', {
                    id: 'search-panel-title',
                    style: {
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#000'
                    }
                }, 'Search'),

                React.createElement('button', {
                    id: 'search-panel-close-btn',
                    onClick: onClose,
                    title: 'Close',
                    style: {
                        background: 'none',
                        border: '1px solid rgb(224, 224, 224)',
                        cursor: 'pointer',
                        padding: '0',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s',
                        color: '#666'
                    },
                    onMouseEnter: (e) => {
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                    },
                    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; }
                }, React.createElement('img', {
                    id: 'search-panel-close-btn-icon',
                    src: './img/close.svg',
                    alt: 'Close',
                    style: { width: '18px', height: '18px', pointerEvents: 'none' }
                }))
            ),

            // Search Input (at search button position - 73px from top)
            React.createElement('div', {
                id: 'search-panel-input-wrapper',
                style: {
                    padding: '0 20px',
                    marginBottom: '20px'
                }
            },
                React.createElement('form', {
                    id: 'search-panel-input-form',
                    onSubmit: (e) => e.preventDefault(),
                    style: {
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14.5px',
                        border: '1.67px solid #e4e4e4',
                        borderRadius: '10px',
                        padding: '0 14.5px',
                        backgroundColor: '#ffffff',
                        height: '38px',
                        boxSizing: 'border-box',
                        top: '0',
                    }
                },
                    React.createElement('img', {
                        id: 'search-panel-icon',
                        src: './img/search-1.svg',
                        alt: 'Search',
                        style: {
                            width: '15.5207px',
                            height: '15.57px'
                        }
                    }),
                    React.createElement('input', {
                        type: 'search',
                        id: 'search-panel-input',
                        value: searchQuery,
                        onChange: (e) => setSearchQuery(e.target.value),
                        placeholder: 'Search files, requirements, stories...',
                        autoFocus: true,
                        style: {
                            flex: '1',
                            border: 'none',
                            outline: 'none',
                            fontFamily: 'Inter, Helvetica',
                            fontSize: '13.3px',
                            color: '#1c1d21',
                            backgroundColor: 'transparent',
                            height: '100%'
                        }
                    }),
                    React.createElement('button', {
                        type: 'button',
                        id: 'search-panel-clear-btn',
                        title: 'Clear search',
                        onClick: () => setSearchQuery(''),
                        style: {
                            background: 'none',
                            border: 'none',
                            cursor: searchQuery ? 'pointer' : 'default',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'opacity 0.2s, background-color 0.2s',
                            width: '28px',
                            height: '28px',
                            opacity: searchQuery ? '1' : '0',
                            pointerEvents: searchQuery ? 'auto' : 'none',
                            flexShrink: 0,
                            color: '#666'
                        },
                        onMouseEnter: (e) => {
                            if (searchQuery) {
                                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#e8e8e8';
                            }
                        },
                        onMouseLeave: (e) => {
                            if (searchQuery) e.currentTarget.style.backgroundColor = 'transparent';
                        }
                    }, React.createElement('img', {
                        id: 'search-panel-clear-btn-icon',
                        src: './img/close.svg',
                        alt: 'Clear',
                        style: { width: '18px', height: '18px', pointerEvents: 'none' }
                    }))
                )
            ),

            // Search Results or Detail View
            React.createElement('div', {
                id: 'search-panel-results-wrapper',
                style: {
                    flex: '1',
                    overflowY: 'auto',
                    padding: '0 20px 20px 20px',
                    backgroundColor: '#fff'
                }
            },
                // Show detail view if item selected, otherwise show search results
                selectedItem ? React.createElement('div', {
                    id: 'search-panel-detail-view',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        overflowY: 'auto',
                        height: '100%'
                    }
                },
                    // Back button
                    React.createElement('button', {
                        id: 'search-panel-back-btn',
                        onClick: handleBack,
                        title: 'Back to results',
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
                        onMouseEnter: (e) => {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                        },
                        onMouseLeave: (e) => {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            e.currentTarget.style.backgroundColor = isDark ? 'transparent' : '#ffffff';
                        }
                    },
                        React.createElement('img', {
                            id: 'search-panel-back-btn-icon',
                            src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                            alt: '',
                            style: { width: '18px', height: '18px', flexShrink: 0 }
                        }),
                        'Back to results'
                    ),

                    // Detail content - macOS Quick Look style with sidebar theme
                    selectedType === 'file' ? React.createElement('div', {
                        id: 'search-panel-file-preview',
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
                            id: 'search-panel-file-header-section',
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
                                id: 'search-panel-file-icon',
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
                            }, selectedItem.documentExt.replace('.', '').toUpperCase()),
                            // File name with marquee
                            React.createElement('div', {
                                id: 'search-panel-file-name',
                                className: selectedItem.name.length > 30 ? 'file-name-marquee-container' : '',
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
                                    id: 'search-panel-file-name-text',
                                    className: selectedItem.name.length > 30 ? 'file-name-marquee' : '',
                                    style: {
                                        wordBreak: selectedItem.name.length <= 30 ? 'break-word' : 'normal'
                                    }
                                }, selectedItem.name)
                            )
                        ),

                        // File details section
                        React.createElement('div', {
                            id: 'search-panel-file-details',
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
                                id: 'search-panel-file-info',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'search-panel-file-info-type',
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }
                                },
                                    React.createElement('span', {
                                        id: 'search-panel-file-info-type-label',
                                        className: 'search-panel-meta-label',
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#666',
                                            fontWeight: '400'
                                        }
                                    }, 'File Type'),
                                    React.createElement('span', {
                                        id: 'search-panel-file-info-type-value',
                                        className: 'search-panel-meta-value',
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#1c1d21',
                                            fontWeight: '500'
                                        }
                                    }, `${selectedItem.documentExt.replace('.', '').toUpperCase()} Document`)
                                ),
                                React.createElement('div', {
                                    id: 'search-panel-file-info-size',
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }
                                },
                                    React.createElement('span', {
                                        id: 'search-panel-file-info-size-label',
                                        className: 'search-panel-meta-label',
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#666',
                                            fontWeight: '400'
                                        }
                                    }, 'File Size'),
                                    React.createElement('span', {
                                        id: 'search-panel-file-info-size-value',
                                        className: 'search-panel-meta-value',
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#1c1d21',
                                            fontWeight: '500'
                                        }
                                    }, fileMetadata.size ? formatFileSize(fileMetadata.size) : 'Unknown')
                                ),
                                React.createElement('div', {
                                    id: 'search-panel-file-info-date',
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }
                                },
                                    React.createElement('span', {
                                        id: 'search-panel-file-info-date-label',
                                        className: 'search-panel-meta-label',
                                        style: {
                                            fontFamily: 'Inter, Helvetica',
                                            fontSize: '13px',
                                            color: '#666',
                                            fontWeight: '400'
                                        }
                                    }, 'Upload Date'),
                                    React.createElement('span', {
                                        id: 'search-panel-file-info-date-value',
                                        className: 'search-panel-meta-value',
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
                                //     id: 'search-panel-file-info-id',
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
                                //     }, selectedItem.documentID.substring(0, 8) + '...')
                                // )
                            ),

                            // Divider
                            React.createElement('div', {
                                id: 'search-panel-file-divider',
                                className: 'search-panel-divider',
                                style: {
                                    height: '1px',
                                    backgroundColor: '#e4e4e4'
                                }
                            }),

                            // Action button
                            React.createElement('button', {
                                id: 'search-panel-file-download-btn',
                                onClick: () => {
                                    // Trigger download
                                    if (window.downloadFile) {
                                        window.downloadFile(selectedItem.documentID, selectedItem.name);
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
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                },
                                onMouseEnter: (e) => {
                                    e.target.style.backgroundColor = '#000000';
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                },
                                onMouseLeave: (e) => {
                                    e.target.style.backgroundColor = 'rgb(30, 41, 59)';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }
                            }, 'Download')
                        )
                    ) : React.createElement('div', {
                        id: 'search-panel-requirement-preview',
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
                            id: 'search-panel-requirement-header',
                            style: {
                                padding: '20px',
                            backgroundColor: '#f9f9f9',
                            borderBottom: '1px solid #e4e4e4'
                            }
                        },
                            React.createElement('div', {
                                id: 'search-panel-requirement-header-inner',
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '12px'
                                }
                            },
                                // Badge
                                React.createElement('div', {
                                    id: 'search-panel-requirement-badge',
                                    style: {
                                        padding: '4px 10px',
                                        backgroundColor: '#1c1d21',
                                        color: '#ffffff',
                                        borderRadius: '6px',
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        letterSpacing: '0.5px'
                                    }
                                }, selectedType === 'requirement'
                                    ? `${(selectedItem.details?.requirementType === 'functional' || selectedItem.details?.requirementType === 'FR') ? 'FR' : 'NFR'}-${String(selectedItem.details?.requirementSeq || 0).padStart(2, '0')}`
                                    : `US-${String(selectedItem.details?.storySeq || 0).padStart(2, '0')}`)
                            ),
                            // Title
                            React.createElement('div', {
                                id: 'search-panel-requirement-title',
                                style: {
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#1c1d21',
                                    lineHeight: '1.4'
                                }
                            }, selectedItem.title)
                        ),

                        // Details section
                        React.createElement('div', {
                            id: 'search-panel-requirement-details',
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
                            selectedItem.details?.description && React.createElement('div', {
                                id: 'search-panel-requirement-description-section',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'search-panel-requirement-description-label',
                                    className: 'search-panel-section-label',
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
                                    id: 'search-panel-requirement-description-body',
                                    className: 'search-panel-section-body',
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '13px',
                                        color: '#1c1d21',
                                        lineHeight: '1.6'
                                    }
                                }, selectedItem.details.description)
                            ),

                            // Role (for both requirements and user stories)
                            selectedItem.details?.role && React.createElement('div', {
                                id: 'search-panel-requirement-role-section',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'search-panel-requirement-role-label',
                                    className: 'search-panel-section-label',
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
                                    id: 'search-panel-requirement-role-body',
                                    className: 'search-panel-section-body',
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '13px',
                                        color: '#1c1d21',
                                        lineHeight: '1.6'
                                    }
                                }, selectedItem.details.role)
                            ),

                            // Source References
                            selectedItem.details?.sourceReference && selectedItem.details.sourceReference.length > 0 && React.createElement('div', {
                                id: 'search-panel-source-references-section',
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'search-panel-source-references-label',
                                    className: 'search-panel-section-label',
                                    style: {
                                        fontFamily: 'Inter, Helvetica',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#666',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }
                                }, 'Source References'),
                                React.createElement('div', {
                                    id: 'search-panel-source-references-list',
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }
                                },
                                    selectedItem.details.sourceReference.map((ref, idx) =>
                                        React.createElement('div', {
                                            key: idx,
                                            id: `search-panel-source-reference-card-${idx}`,
                                            className: 'search-panel-source-reference-card',
                                            style: {
                                                padding: '10px 12px',
                                                backgroundColor: '#f5f5f5',
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
                                                    id: `search-panel-source-reference-name-${idx}`,
                                                    className: 'search-panel-source-reference-name',
                                                    style: { fontWeight: '600' }
                                                }, ref.documentName),
                                                ref.location && React.createElement('div', {
                                                    id: `search-panel-source-reference-location-${idx}`,
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
                ) : React.createElement(window.sidebarInnerSearchResults, {
                    searchQuery: searchQuery,
                    onResultClick: handleResultClick,
                    onClose: () => {
                        setSearchQuery('');
                        setSelectedItem(null);
                        setSelectedType(null);
                    },
                    isHomePage: isHomePage,
                    sidebarCollapsed: false,
                    isPanel: true
                })
            )
        )
        );
    };

    window.SearchPanel = SearchPanel;
})();
