// Global utilities for all pages

(function() {
    // Custom alert function - available globally
    window.showCustomAlert = function(options) {
        // Create a container for the alert modal if it doesn't exist
        let alertContainer = document.getElementById('custom-alert-container');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'custom-alert-container';
            document.body.appendChild(alertContainer);
        }

        // Render the custom alert modal
        const root = ReactDOM.createRoot(alertContainer);
        root.render(React.createElement(window.CustomAlertModal, {
            isOpen: true,
            onClose: () => {
                root.unmount();
                alertContainer.remove();
            },
            ...options
        }));
    };

    // Global event dispatcher for refreshing various components
    window.dispatchGlobalEvent = function(eventName, detail = {}) {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    };

    // Socket.IO connection setup (if available)
    window.initializeSocketConnection = function(userInfo) {
        if (typeof io !== 'undefined' && userInfo && userInfo.uid) {
            const socket = io();

            // Join user-specific room for real-time updates
            socket.emit('join-user-room', userInfo.uid);
            console.log(`Joined user room: user_${userInfo.uid}`);

            // Listen for project share updates
            socket.on('project-share-updated', (data) => {
                console.log('Received project-share-updated:', data);

                // Dispatch custom event to refresh project share modal
                if (data.action === 'collaborator-accepted') {
                    window.dispatchGlobalEvent('refreshProjectShare', { projectID: data.projectID });
                }
            });

            // Listen for collaborator removal notifications
            socket.on('collaborator-removed', (data) => {
                console.log('Received collaborator-removed:', data);

                // Show custom alert modal instead of browser alert
                window.showCustomAlert({
                    title: 'Project Access Removed',
                    message: data.message,
                    confirmText: 'OK',
                    onConfirm: () => {
                        // Refresh notifications and projects after user acknowledges
                        window.dispatchGlobalEvent('refreshNotifications');
                        window.dispatchGlobalEvent('refreshProjects');
                    }
                });
            });

            // Make socket available globally
            window.socket = socket;
            return socket;
        }
        return null;
    };

    console.log('[GlobalUtils] Global utilities loaded');
})();
