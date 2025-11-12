const { useState } = React;

const TempSignup = ({ csrfToken }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const handleSubmit = async () => {
        // Check required fields
        const requiredFields = ["username", "email", "password", "confirmPassword"];
        const emptyFields = requiredFields.filter(field => !formData[field]);

        if (emptyFields.length > 0) {
            alert(`Please fill in: ${emptyFields.join(", ")}`);
            return;
        }

        // Check password match
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                // Optionally redirect to login or home
                window.location.href = '/home';
            } else {
                alert(result.message || "An error occurred. Please try again.");
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return React.createElement('div', {
            className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8'
        },
        React.createElement('input', {
            type: 'hidden',
            name: '_csrf',
            value: csrfToken
        }),

        React.createElement('div', null,
            React.createElement('label', {
                htmlFor: 'input-username',
                className: 'block mb-1 font-medium'
            }, 'Username'),
            React.createElement('input', {
                type: 'text',
                id: 'input-username',
                value: formData.username,
                onChange: handleChange('username'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        React.createElement('div', null,
            React.createElement('label', {
                htmlFor: 'input-email',
                className: 'block mb-1 font-medium'
            }, 'Email Address'),
            React.createElement('input', {
                type: 'email',
                id: 'input-email',
                value: formData.email,
                onChange: handleChange('email'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        React.createElement('div', null,
            React.createElement('label', {
                htmlFor: 'input-firstName',
                className: 'block mb-1 font-medium'
            }, 'First Name'),
            React.createElement('input', {
                type: 'text',
                id: 'input-firstName',
                maxLength: 50,
                value: formData.firstName,
                onChange: handleChange('firstName'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        React.createElement('div', null,
            React.createElement('label', {
                htmlFor: 'input-lastName',
                className: 'block mb-1 font-medium'
            }, 'Last Name'),
            React.createElement('input', {
                type: 'text',
                id: 'input-lastName',
                maxLength: 50,
                value: formData.lastName,
                onChange: handleChange('lastName'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        React.createElement('div', null,
            React.createElement('label', {
                htmlFor: 'input-password',
                className: 'block mb-1 font-medium'
            }, 'Password'),
            React.createElement('input', {
                type: 'password',
                id: 'input-password',
                value: formData.password,
                onChange: handleChange('password'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        React.createElement('div', null,
            React.createElement('label', {
                htmlFor: 'input-confirmPassword',
                className: 'block mb-1 font-medium'
            }, 'Confirm Password'),
            React.createElement('input', {
                type: 'password',
                id: 'input-confirmPassword',
                value: formData.confirmPassword,
                onChange: handleChange('confirmPassword'),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        React.createElement('button', {
            id: 'btn-signup',
            onClick: handleSubmit,
            disabled: isLoading,
            className: 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-2'
        }, isLoading ? 'Submitting...' : 'Submit')
    );
};

// Make available globally
window.TempSignup = TempSignup;
