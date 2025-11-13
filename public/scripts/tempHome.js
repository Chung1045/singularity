const { useState } = React;

const TempHome = ({ csrfToken }) => {

    const logout = async () => {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'CSRF-Token': csrfToken },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function(response) {
                alert("Logout response: " + JSON.stringify(response));
                window.location = "/login";
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || "An error occurred. Please try again.";
                alert(errorMessage);
            }
        });
    };

    function handleProfileRoute() {
        window.location.href = "/profile"
    }

    return React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
        React.createElement('h2', {}, "Hello"),
        React.createElement('p', {}, "You have logged in"),
        React.createElement('input', { type: 'hidden', name: '_csrf', value: csrfToken }),
        React.createElement('button', {
            id: 'btn-logout',
            onClick: logout,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
        }, 'Logout'),
        React.createElement('button', {
            id: 'btn-passkeyRegister',
            onClick: handleProfileRoute,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
        }, 'Manage Profile')
    );
};

// Make available globally
window.TempHome = TempHome;

