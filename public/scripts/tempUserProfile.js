const { useState } = React;

const TempUserProfile = () => {


    function handleSessionManagement() {
        window.location.href = "/session"
    }

    function handlePasskeyManagement() {
        window.location.href = "/passkeys"
    }

    return React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
        React.createElement('h2', {}, "User Profile"),
        React.createElement('button', {
            id: 'btn-logout',
            onClick: handleSessionManagement,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
        }, 'Manage Sessions'),
        React.createElement('button', {
            id: 'btn-manageSessions',
            onClick: handlePasskeyManagement,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
        }, 'Manage Passkeys')
    );
};

// Make available globally
window.TempUserProfile = TempUserProfile;
