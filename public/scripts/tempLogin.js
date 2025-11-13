// tempLogin2.jsx - Rename to tempLogin2.js
const { useState } = React;

const TempLogin = ({ csrfToken }) => {
    const [usernameEmail, setUsernameEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    usernameEmail,
                    password
                })
            });

            if (response.ok) {
                window.location.href = '/home';
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleOAuth = () => {
        window.location.href = '/api/auth/google';
    };

    const handleSignup = () => {
        window.location.href = '/signup';
    };

    const handlePasskeyLogin = async () => {
        setIsLoading(true);
        try {
            const { startAuthentication } = window.SimpleWebAuthnBrowser;

            const resp = await fetch('/api/passkey/gen-auth-option', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({})
            });

            const response = await resp.json();
            const credential = await startAuthentication(response);

            const verifyResp = await fetch('/api/passkey/verify-authentication', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ credential })
            });

            const verifyResult = await verifyResp.json();
            console.log('Verification result:', verifyResult);

            if (verifyResult.successful) {
                alert('Verification is successful');
                window.location.href = '/home';
            }
        } catch (error) {
            console.error('Passkey login error:', error);
            alert('Passkey login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
        React.createElement('input', { type: 'hidden', name: '_csrf', value: csrfToken }),

        React.createElement('div', null,
            React.createElement('label', {
                htmlFor: 'input-usernameEmail',
                className: 'block mb-1 font-medium'
            }, 'Username or email address'),
            React.createElement('input', {
                type: 'text',
                id: 'input-usernameEmail',
                value: usernameEmail,
                onChange: (e) => setUsernameEmail(e.target.value),
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
                value: password,
                onChange: (e) => setPassword(e.target.value),
                onKeyPress: handleKeyPress,
                disabled: isLoading,
                className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            })
        ),

        React.createElement('button', {
            id: 'btn-login',
            onClick: handleLogin,
            disabled: isLoading,
            className: 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
        }, isLoading ? 'Loading...' : 'Login'),

        React.createElement('hr', { className: 'my-2' }),

        React.createElement('button', {
            id: 'btn-googleOAuth',
            onClick: handleGoogleOAuth,
            disabled: isLoading,
            className: 'w-full px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors'
        }, 'Continue with Google'),

        React.createElement('button', {
            id: 'btn-signup',
            onClick: handleSignup,
            disabled: isLoading,
            className: 'w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
        }, 'Signup'),

        React.createElement('button', {
            id: 'btn-passkeyLogin',
            onClick: handlePasskeyLogin,
            disabled: isLoading,
            className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
        }, 'Login with Passkey')
    );
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TempLogin;
}

// Make available globally
window.TempLogin = TempLogin;
