(function () {
    const { useState, useEffect, useRef, useCallback } = React;

    /**
     * RightSidebar Component
     * A draggable right sidebar with resizable width (matches left sidebar)
     */
    window.RightSidebar = function RightSidebar() {
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
                // Placeholder content - will be populated later
                React.createElement('div', {
                    style: {
                        fontFamily: 'Inter, Helvetica',
                        fontSize: '14px',
                        color: '#666',
                        textAlign: 'center',
                        marginTop: '40px'
                    }
                }, 'Right sidebar content will go here')
            )
        );
    };

    console.log('[RightSidebar] Component loaded');
})();
