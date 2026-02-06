/**
 * Socket.io Initialization for Real-time Notifications
 * This script sets up socket connection and listens for real-time events
 */

(function() {
    console.log('[Socket.io Init] Checking dependencies...');
    console.log('  - io available?', typeof io !== 'undefined');
    console.log('  - window.userInfo available?', !!window.userInfo);
    console.log('  - userInfo.uid available?', window.userInfo?.uid);
    
    // Initialize Socket.io for real-time notifications
    if (typeof io !== 'undefined' && window.userInfo && window.userInfo.uid) {
        console.log('[Socket.io Init] Starting connection for user:', window.userInfo.uid);
        const socket = io();
        
        // Register this user's socket connection
        socket.on('connect', () => {
            console.log('[Socket.io] Connected with socket ID:', socket.id);
            console.log('[Socket.io] Registering user:', window.userInfo.uid);
            socket.emit('register', window.userInfo.uid);
        });
        
        // Listen for project renamed events
        socket.on('projectRenamed', (data) => {
            console.log('[Socket.io] Project renamed event received:', data);
            
            const { projectID, oldProjectName, newProjectName, changedByUserID } = data;
            
            // Only show alert to OTHER users (not the person who renamed it)
            // The renamer already gets a success modal from the rename action
            if (changedByUserID !== window.userInfo.uid) {
                const message = `Project "${oldProjectName}" has been renamed to "${newProjectName}"`;
                
                if (window.showNotification) {
                    window.showNotification({
                        type: 'info',
                        title: 'Project Renamed',
                        message: message,
                        actionText: 'OK'
                    });
                } else {
                    alert(message);
                }
            }
            
            // Update the project name in the current view if this is the selected project
            const currentProjectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
            if (currentProjectID === projectID) {
                console.log('[Socket.io] Currently viewing renamed project - updating display');
                
                // Update any displayed project name in the UI
                const projectNameElements = document.querySelectorAll('[data-project-name]');
                projectNameElements.forEach(el => {
                    if (el.getAttribute('data-project-id') === projectID) {
                        el.textContent = newProjectName;
                    }
                });
            }
            
            // Refresh project list in sidebar (this will update the sidebar immediately)
            console.log('[Socket.io] Triggering project list refresh');
            window.dispatchEvent(new CustomEvent('refreshProjects'));
            
            // Refresh notification panel badge
            window.dispatchEvent(new CustomEvent('refreshNotifications'));
        });
        
        // Listen for being removed from project events
        socket.on('removedFromProject', (data) => {
            console.log('[Socket.io] Removed from project event received:', data);
            
            const { projectID, projectName, removedByOwner } = data;
            
            // Show instant alert
            const message = `You have been removed from project "${projectName}"`;
            
            if (window.showNotification) {
                window.showNotification({
                    type: 'error',
                    title: 'Removed from Project',
                    message: message,
                    actionText: 'OK'
                }).then(() => {
                    // After user acknowledges the alert, refresh and show in notification
                    console.log('[Socket.io] User acknowledged removal - refreshing...');
                    
                    // Clear current project if it's the one they were removed from
                    if (window.getCurrentProjectID && window.getCurrentProjectID() === projectID) {
                        localStorage.setItem('wentBackToInitial', 'true');
                        localStorage.removeItem('activeChatID');
                    }
                    
                    // Refresh project list (removes the project from sidebar)
                    window.dispatchEvent(new CustomEvent('refreshProjects'));
                    
                    // Refresh notification panel (shows the removal notification)
                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                    
                    // If they were viewing the removed project, reload the page
                    if (window.getCurrentProjectID && window.getCurrentProjectID() === projectID) {
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                });
            } else {
                alert(message);
                // Fallback if showNotification not available
                window.dispatchEvent(new CustomEvent('refreshProjects'));
                window.dispatchEvent(new CustomEvent('refreshNotifications'));
            }
        });
        
        // Listen for project deleted events
        socket.on('projectDeleted', (data) => {
            console.log('[Socket.io] Project deleted event received:', data);
            
            const { projectID, projectName, deletedByOwner } = data;
            
            // Check if the user is currently working on this deleted project
            const currentProjectID = window.getCurrentProjectID ? window.getCurrentProjectID() : null;
            const isWorkingOnDeletedProject = currentProjectID === projectID;
            
            // Only show popup if user is actively working on the deleted project
            if (isWorkingOnDeletedProject) {
                // Show instant alert and wait for user acknowledgment
                const message = `Project "${projectName}" has been deleted by the owner`;
                
                if (window.showNotification) {
                    window.showNotification({
                        type: 'warning',
                        title: 'Project Deleted',
                        message: message,
                        actionText: 'OK'
                    }).then(() => {
                        // After user clicks OK, then kick them
                        console.log('[Socket.io] User acknowledged project deletion - processing kick...');
                        
                        // Clear the selected project
                        if (window.clearCurrentProject) {
                            window.clearCurrentProject();
                        }
                        // Go back to home/initial state
                        localStorage.setItem('wentBackToInitial', 'true');
                        localStorage.removeItem('activeChatID');
                        
                        // Reload page to clear state after user acknowledges
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                        
                        // Refresh notification panel
                        window.dispatchEvent(new CustomEvent('refreshNotifications'));
                    });
                } else {
                    // Fallback for browsers without promise support
                    alert(message);
                    
                    // Same logic as above
                    if (window.clearCurrentProject) {
                        window.clearCurrentProject();
                    }
                    localStorage.setItem('wentBackToInitial', 'true');
                    localStorage.removeItem('activeChatID');
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    
                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                }
            } else {
                // User is not working on the deleted project - just refresh the project list silently
                console.log('[Socket.io] User not working on deleted project - refreshing list silently');
                window.dispatchEvent(new CustomEvent('refreshProjects'));
                window.dispatchEvent(new CustomEvent('refreshNotifications'));
            }
        });
        
        socket.on('disconnect', () => {
            console.log('[Socket.io] Disconnected');
        });
        
        socket.on('connect_error', (error) => {
            console.error('[Socket.io] Connection error:', error);
        });
        
        // Make socket globally available
        window.socket = socket;
        
        console.log('[Socket.io Init] Initialization complete for user:', window.userInfo.uid);
    } else {
        if (typeof io === 'undefined') {
            console.error('[Socket.io Init] Socket.io library not loaded!');
        } else if (!window.userInfo) {
            console.error('[Socket.io Init] window.userInfo not available!');
        } else if (!window.userInfo.uid) {
            console.error('[Socket.io Init] window.userInfo.uid not available!');
        }
    }
})();
