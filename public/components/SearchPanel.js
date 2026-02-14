/**
 * SearchPanel Component
 * Displays search input and results panel next to the collapsed sidebar
 */

(function() {
    const { useState, useEffect, useRef } = React;

    const SearchPanel = ({ isOpen, onClose, sidebarCollapsed, isHomePage = false }) => {
        const [searchQuery, setSearchQuery] = useState('');
        const [sidebarWidth, setSidebarWidth] = useState(302);
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
            // TODO: Implement navigation/opening logic based on type
            // For files: open file viewer
            // For requirements: scroll to or open requirement
            // For user stories: navigate to story detail
            
            // Clear search and close panel after selection
            setSearchQuery('');
            onClose();
        };

        if (!isOpen) {
            return null;
        }

        const panelLeft = `${sidebarWidth}px`;
        const backdropLeft = `${sidebarWidth + 400}px`; // sidebar + panel width

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
                    style: {
                        background: 'none',
                        border: 'none',
                        fontSize: '30px',
                        cursor: 'pointer',
                        color: '#666',
                        padding: '0',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s',
                        border: '1px solid rgb(224, 224, 224)',
                    },
                    onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                    onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
                }, '×')
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
                        onClick: () => setSearchQuery(''),
                        style: {
                            background: 'none',
                            border: 'none',
                            cursor: searchQuery ? 'pointer' : 'default',
                            color: '#999',
                            fontSize: '25px',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'opacity 0.2s, background-color 0.2s',
                            width: '25px',
                            height: '25px',
                            opacity: searchQuery ? '1' : '0',
                            pointerEvents: searchQuery ? 'auto' : 'none',
                            flexShrink: 0
                        },
                        onMouseEnter: (e) => {
                            if (searchQuery) e.target.style.backgroundColor = '#e0e0e0';
                        },
                        onMouseLeave: (e) => {
                            if (searchQuery) e.target.style.backgroundColor = 'transparent';
                        }
                    }, '×')
                )
            ),

            // Search Results
            React.createElement('div', {
                id: 'search-panel-results-wrapper',
                style: {
                    flex: '1',
                    overflowY: 'auto',
                    padding: '0 20px 20px 20px',
                    backgroundColor: '#fff'
                }
            },
                React.createElement(window.sidebarInnerSearchResults, {
                    searchQuery: searchQuery,
                    onResultClick: handleResultClick,
                    onClose: () => setSearchQuery(''),
                    isHomePage: isHomePage,
                    sidebarCollapsed: false, // Always show results in panel
                    isPanel: true // Flag to indicate it's in a panel
                })
            )
        )
        );
    };

    window.SearchPanel = SearchPanel;
})();
