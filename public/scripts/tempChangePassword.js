const { useState } = React;

const TempChangePassword = ({ csrfToken }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    const handleSubmit = async () => {
        const requiredFields = ["currentPassword", "newPassword", "confirmPassword"];
        const emptyFields = requiredFields.filter(field => !formData[field]);

        if (emptyFields.length > 0) {
            alert(`Please fill in: ${emptyFields.join(", ")}`);
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            alert("New passwords do not match!");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/password/change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || "Password changed successfully!");
                window.location.href = '/profile';
            } else {
                alert(result.message || "Failed to change password.");
            }
        } catch (error) {
            console.error('Change password error:', error);
            alert("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return React.createElement(
        'div',
        { className: 'flex flex-col gap-3 p-4 max-w-md mx-auto mt-8' },

        // Hidden CSRF
        React.createElement('input', {
            type: 'hidden',
            name: '_csrf',
            value: csrfToken
        }),

        React.createElement("h2", { className: "text-xl font-semibold mb-3 text-center" }, "Change Password"),

        // Current password
        React.createElement('div', null,
            React.createElement('label', { htmlFor: 'current-password', className: 'block mb-1 font-medium' }, 'Current Password'),
            React.createElement('input', {
                type: 'password',
                id: 'current-password',
                value: formData.currentPassword,
                onChange: handleChange('currentPassword'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        // New password
        React.createElement('div', null,
            React.createElement('label', { htmlFor: 'new-password', className: 'block mb-1 font-medium' }, 'New Password'),
            React.createElement('input', {
                type: 'password',
                id: 'new-password',
                value: formData.newPassword,
                onChange: handleChange('newPassword'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        // Confirm password
        React.createElement('div', null,
            React.createElement('label', { htmlFor: 'confirm-password', className: 'block mb-1 font-medium' }, 'Confirm New Password'),
            React.createElement('input', {
                type: 'password',
                id: 'confirm-password',
                value: formData.confirmPassword,
                onChange: handleChange('confirmPassword'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        // Submit button
        React.createElement('button', {
            id: 'btn-change-password',
            onClick: handleSubmit,
            disabled: isLoading,
            className: 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-3'
        }, isLoading ? 'Changing...' : 'Change Password')
    );
};

// Make available globally
window.TempChangePassword = TempChangePassword;
