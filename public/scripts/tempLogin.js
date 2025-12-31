// // tempLogin2.jsx - Rename to tempLogin2.js
// const { useState } = React;

// const TempLogin = ({ csrfToken }) => {
//     const [usernameEmail, setUsernameEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [isLoading, setIsLoading] = useState(false);

//     const handleLogin = async () => {
//         setIsLoading(true);
//         try {
//             const response = await fetch('/api/login', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'CSRF-Token': csrfToken
//                 },
//                 body: JSON.stringify({
//                     usernameEmail,
//                     password
//                 })
//             });

//             if (response.ok) {
//                 window.location.href = '/home';
//             }
//         } catch (error) {
//             console.error('Login error:', error);
//             alert('Login failed. Please try again.');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleGoogleOAuth = () => {
//         window.location.href = '/api/auth/google';
//     };

//     const handleSignup = () => {
//         window.location.href = '/signup';
//     };

//     const handlePasskeyLogin = async () => {
//         setIsLoading(true);
//         try {
//             const { startAuthentication } = window.SimpleWebAuthnBrowser;

//             const resp = await fetch('/api/passkey/gen-auth-option', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'CSRF-Token': csrfToken
//                 },
//                 body: JSON.stringify({})
//             });

//             const response = await resp.json();
//             const credential = await startAuthentication(response);

//             const verifyResp = await fetch('/api/passkey/verify-authentication', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'CSRF-Token': csrfToken
//                 },
//                 body: JSON.stringify({ credential })
//             });

//             const verifyResult = await verifyResp.json();
//             console.log('Verification result:', verifyResult);

//             if (verifyResult.successful) {
//                 alert('Verification is successful');
//                 window.location.href = '/home';
//             }
//         } catch (error) {
//             console.error('Passkey login error:', error);
//             alert('Passkey login failed. Please try again.');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleKeyPress = (e) => {
//         if (e.key === 'Enter') {
//             handleLogin();
//         }
//     };

//     return React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
//         React.createElement('input', { type: 'hidden', name: '_csrf', value: csrfToken }),

//         React.createElement('div', null,
//             React.createElement('label', {
//                 htmlFor: 'input-usernameEmail',
//                 className: 'block mb-1 font-medium'
//             }, 'Username or email address'),
//             React.createElement('input', {
//                 type: 'text',
//                 id: 'input-usernameEmail',
//                 value: usernameEmail,
//                 onChange: (e) => setUsernameEmail(e.target.value),
//                 onKeyPress: handleKeyPress,
//                 disabled: isLoading,
//                 className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
//             })
//         ),

//         React.createElement('div', null,
//             React.createElement('label', {
//                 htmlFor: 'input-password',
//                 className: 'block mb-1 font-medium'
//             }, 'Password'),
//             React.createElement('input', {
//                 type: 'password',
//                 id: 'input-password',
//                 value: password,
//                 onChange: (e) => setPassword(e.target.value),
//                 onKeyPress: handleKeyPress,
//                 disabled: isLoading,
//                 className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
//             })
//         ),

//         React.createElement('button', {
//             id: 'btn-login',
//             onClick: handleLogin,
//             disabled: isLoading,
//             className: 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
//         }, isLoading ? 'Loading...' : 'Login'),

//         React.createElement('hr', { className: 'my-2' }),

//         React.createElement('button', {
//             id: 'btn-googleOAuth',
//             onClick: handleGoogleOAuth,
//             disabled: isLoading,
//             className: 'w-full px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors'
//         }, 'Continue with Google'),

//         React.createElement('button', {
//             id: 'btn-signup',
//             onClick: handleSignup,
//             disabled: isLoading,
//             className: 'w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
//         }, 'Signup'),

//         React.createElement('button', {
//             id: 'btn-passkeyLogin',
//             onClick: handlePasskeyLogin,
//             disabled: isLoading,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
//         }, 'Login with Passkey')
//     );
// };

// // Export for module usage
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = TempLogin;
// }

// // Make available globally
// window.TempLogin = TempLogin;


// for testing the code

const { useState } = React;

const TempLogin = ({ csrfToken }) => {
    const [usernameEmail, setUsernameEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ usernameEmail, password })
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

    return React.createElement('div', { className: 'frame' },
        React.createElement('div', { className: 'login' },
            React.createElement('div', { className: 'content-background' }),
            
            // Right Content
            React.createElement('div', { className: 'right-content' },
                React.createElement('div', { className: 'logo' },
                    React.createElement('div', { className: 'logo-text' },
                        React.createElement('div', { className: 'text-wrapper' }, 'Singularity')
                    ),
                    React.createElement('img', { className: 'union', src: 'img/Union.svg', alt: 'Union' })
                ),

                React.createElement('div', { className: 'content' },
                    React.createElement('div', { className: 'slogan' },
                        React.createElement('div', { className: 'div' }, 'Requirements? Just got easier'),
                        React.createElement('div', { className: 'text-wrapper-2' }, 'AI for Software Development')
                    ),

                    React.createElement('div', { className: 'div-2' },
                        // Username/Email Input
                        React.createElement('div', { className: 'div-3' },
                            React.createElement('div', { className: 'text-wrapper-3' }, 'Username or email address'),
                            React.createElement('div', { className: 'div-wrapper' },
                                React.createElement('input', {
                                    type: 'text',
                                    className: 'text-wrapper-4',
                                    value: usernameEmail,
                                    onChange: (e) => setUsernameEmail(e.target.value),
                                    onKeyPress: handleKeyPress,
                                    disabled: isLoading,
                                    placeholder: 'someone@example.com',
                                    style: {
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        width: '100%',
                                        fontSize: '10px',
                                        margin: '10px'
                                    }
                                })
                            )
                        ),

                        // Password Input
                        React.createElement('div', { className: 'div-3' },
                            React.createElement('div', { className: 'text-wrapper-3' }, 'Password'),
                            React.createElement('div', { className: 'div-wrapper', style: { position: 'relative' } },
                                React.createElement('input', {
                                    type: showPassword ? 'text' : 'password',
                                    className: 'text-wrapper-4',
                                    value: password,
                                    onChange: (e) => setPassword(e.target.value),
                                    onKeyPress: handleKeyPress,
                                    disabled: isLoading,
                                    // placeholder: '********',
                                    style: {
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        width: '100%',
                                        fontSize: '10px',
                                        margin: '10px',
                                        paddingRight: '35px'
                                    }
                                }),
                                React.createElement('button', {
                                    type: 'button',
                                    onClick: () => setShowPassword(!showPassword),
                                    style: {
                                        position: 'absolute',
                                        right: '1px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    },
                                    'aria-label': showPassword ? 'Hide password' : 'Show password'
                                },
                                    React.createElement('img', {
                                        src: showPassword ? './img/eye-open.svg' : './img/eye-closed.svg',
                                        alt: showPassword ? 'Hide password' : 'Show password',
                                        style: { width: '14px', height: '14px', opacity: 0.6 }
                                    })
                                )
                            )
                        ),

                        // Terms & Privacy
                        React.createElement('p', { className: 'by-continuing-you' },
                                    React.createElement('span', { className: 'span' },
                                        'By continuing, you agree to Singularity\u2019s ',
                                        React.createElement('a', { href: '#', style: { textDecoration: 'underline', color: 'inherit' } }, 'Privacy Policy'),
                                        ' and ',
                                        React.createElement('a', { href: '#', style: { textDecoration: 'underline', color: 'inherit' } }, 'Terms of Use')
                                    )
                        ),

                        // Login Button
                        React.createElement('div', { 
                            className: 'login-2',
                            onClick: handleLogin,
                            style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                        },
                            React.createElement('div', { className: 'text-wrapper-6' }, isLoading ? 'Loading...' : 'Login')
                        ),

                        // Divider
                        React.createElement('hr', { className: 'divider', src: 'img/divider.svg', alt: 'Divider' }),

                        // Continue with Google
                        React.createElement('div', { 
                            className: 'div-wrapper-2',
                            onClick: handleGoogleOAuth,
                            style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                        },
                            React.createElement('div', { className: 'text-wrapper-7' }, 'Continue with Google')
                        ),

                        // Sign in with Passkey
                        React.createElement('div', { 
                            className: 'div-wrapper-2',
                            onClick: handlePasskeyLogin,
                            style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                        },
                            React.createElement('div', { className: 'text-wrapper-7' }, 'Sign in with Passkey')
                        )
                    )
                )
            ),

            // Left Content (Sign Up)
            React.createElement('div', { className: 'left-content' },
                React.createElement('div', { className: 'group' },
                    React.createElement('div', { className: 'login-wrapper' },
                        React.createElement('div', { 
                            className: 'sign-in-wrapper',
                            onClick: handleSignup,
                            style: { cursor: 'pointer' }
                        },
                            React.createElement('div', { className: 'sign-in' }, 'Sign Up')
                        )
                    ),
                    React.createElement('div', { className: 'if-you-already-have' }, "Didn't have an account?"),
                    React.createElement('div', { className: 'welcome' }, 'Greetings!')
                )
            )
        )
    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TempLogin;
}
window.TempLogin = TempLogin;