const { useState, useEffect } = React;

const Message = ({ text, visible, onClose, showClose = true }) => {
    return React.createElement(
        'div',
        {
            id: 'message',
            className: visible ? '' : 'hidden'
        },
        React.createElement('span', { className: 'alert-icon' },
            React.createElement('img', { src: '/img/Info.svg', alt: 'alert' })
        ),
        React.createElement('span', { className: 'alert-text' }, text),
        showClose ? React.createElement(
            'span',
            {
                id: 'message-close-btn',
                onClick: onClose
            },
            React.createElement('img', { src: '/img/close.svg', alt: 'close' })
        ) : null
    );
};


const Login = ({ csrfToken }) => {
    const [usernameEmail, setUsernameEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ text: '', visible: false, showClose: true, emoji: undefined });

    const showSlideUpMessage = (text, showClose = true, autoHideDuration = 5000, emoji = undefined) => {
        setMessage({ text, visible: true, showClose, emoji });
        if (autoHideDuration > 0) {
            setTimeout(() => {
                hideSlideUpMessage();
            }, autoHideDuration);
        }
    };

    const hideSlideUpMessage = () => {
        setMessage(prev => ({ ...prev, visible: false }));
    };

    const handleLoginSuccess = () => {
        showSlideUpMessage('Login successful! Redirecting...', false, 0, '!');
        setTimeout(() => {
            window.location.href = '/home';
        }, 2000);
    };

    const handleLogin = async () => {
        if (!usernameEmail.trim()) {
            showSlideUpMessage('Please enter your username or email address', true, 5000, '!');
            return;
        }

        if (!password.trim()) {
            showSlideUpMessage('Please enter your password', true, 5000, '!');
            return;
        }

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
                handleLoginSuccess();
            } else {
                const data = await response.json();
                showSlideUpMessage(data.message || 'Login failed. Please try again.', true, 5000, '!');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Login error:', error);
            showSlideUpMessage('Login failed. Please try again.', true, 5000, '!');
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
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': csrfToken
                },
                body: JSON.stringify({})
            });

            const response = await resp.json();
            const credential = await startAuthentication(response);

            const verifyResp = await fetch('/api/passkey/verify-authentication', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': csrfToken
                },
                body: JSON.stringify({ credential })
            });

            const verifyResult = await verifyResp.json();
            if (verifyResult.successful) {
                handleLoginSuccess();
            } else {
                showSlideUpMessage(verifyResult.message || 'Passkey login failed. Please try again.');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Passkey login error:', error);
            showSlideUpMessage('Passkey login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return React.createElement('div', { className: 'frame', id: 'login-page-frame' },
        React.createElement(Message, { text: message.text, visible: message.visible, showClose: message.showClose, emoji: message.emoji, onClose: hideSlideUpMessage }),

        React.createElement('div', { className: 'login', id: 'login-component-container' },
            React.createElement('div', { className: 'content-background', id: 'login-background-overlay' }),

            // Right Content
            React.createElement('div', { className: 'right-content', id: 'right-content-panel' },
                React.createElement('div', { className: 'logo', id: 'singularity-logo-container' },
                    React.createElement('div', { className: 'logo-text', id: 'singularity-logo-text-wrapper' },
                        React.createElement('div', { className: 'text-wrapper', id: 'singularity-logo-text' }, 'Singularity')
                    ),
                    React.createElement('img', { className: 'union', src: 'img/union.svg', alt: 'Union', id: 'singularity-logo-icon' })
                ),

                React.createElement('div', { className: 'content', id: 'login-form-area' },
                    React.createElement('div', { className: 'slogan', id: 'slogan-container' },
                        React.createElement('div', { className: 'div', id: 'slogan-text-main' }, 'Requirements? Just got easier'),
                        React.createElement('div', { className: 'text-wrapper-2', id: 'slogan-text-sub' }, 'AI for Software Development')
                    ),

                    React.createElement('div', { className: 'div-2', id: 'form-input-group' },
                        // Username/Email Input
                        React.createElement('div', { className: 'div-3', id: 'username-field-container' },
                            React.createElement('div', { className: 'text-wrapper-3', id: 'label-username' }, 'Username or email address'),
                            React.createElement('div', { className: 'div-wrapper', id: 'username-input-wrapper' },
                                React.createElement('input', {
                                    id: 'input-username',
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
                                        fontSize: '14px',
                                        margin: '10px'
                                    }
                                })
                            )
                        ),

                        // Password Input
                        React.createElement('div', { className: 'div-3', id: 'password-field-container' },
                            React.createElement('div', { className: 'text-wrapper-3', id: 'label-password' }, 'Password'),
                            React.createElement('div', { className: 'div-wrapper', id: 'password-input-wrapper', style: { position: 'relative' } },
                                React.createElement('input', {
                                    id: 'input-password',
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
                                        fontSize: '14px',
                                        margin: '10px',
                                        paddingRight: '35px'
                                    }
                                }),
                                React.createElement('button', {
                                        id: 'btn-toggle-password',
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
                                        id: 'icon-toggle-password',
                                        src: showPassword ? './img/eye-open.svg' : './img/eye-closed.svg',
                                        alt: showPassword ? 'Hide password' : 'Show password',
                                        style: { width: '14px', height: '14px', opacity: 0.6 }
                                    })
                                )
                            )
                        ),

                        // Terms & Privacy
                        React.createElement('p', { className: 'by-continuing-you', id: 'text-legal-disclaimer-container' },
                            React.createElement('span', { className: 'span', id: 'text-legal-disclaimer' },
                                'By continuing, you agree to Singularity\u2019s ',
                                React.createElement('a', { href: '#', id: 'link-privacy-policy', style: { textDecoration: 'underline', color: 'inherit' } }, 'Privacy Policy'),
                                ' and ',
                                React.createElement('a', { href: '#', id: 'link-terms-of-use', style: { textDecoration: 'underline', color: 'inherit' } }, 'Terms of Use')
                            )
                        ),

                        // Login Button
                        React.createElement('div', {
                                id: 'btn-login-submit',
                                className: 'login-2',
                                onClick: handleLogin,
                                style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                            },
                            React.createElement('div', { className: 'text-wrapper-6', id: 'text-login-btn' }, isLoading ? 'Loading...' : 'Login')
                        ),

                        // Divider
                        React.createElement('hr', { className: 'divider', src: 'img/divider.svg', alt: 'Divider', id: 'divider-or' }),

                        // Continue with Google
                        React.createElement('div', {
                                id: 'btn-google-auth',
                                className: 'div-wrapper-2',
                                onClick: handleGoogleOAuth,
                                style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                            },
                            React.createElement('div', { className: 'text-wrapper-7', id: 'text-google-btn' }, 'Continue with Google')
                        ),

                        // Sign in with Passkey
                        React.createElement('div', {
                                id: 'btn-passkey-auth',
                                className: 'div-wrapper-2',
                                onClick: handlePasskeyLogin,
                                style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                            },
                            React.createElement('div', { className: 'text-wrapper-7', id: 'text-passkey-btn' }, 'Sign in with Passkey')
                        )
                    )
                )
            ),

            // Left Content (Sign Up)
            React.createElement('div', { className: 'left-content', id: 'left-content-panel' },
                React.createElement('div', { className: 'group', id: 'left-panel-content-group' },
                    React.createElement('div', { className: 'login-wrapper', id: 'wrapper-signup-btn' },
                        React.createElement('div', {
                                id: 'btn-signup-redirect',
                                className: 'sign-in-wrapper',
                                onClick: handleSignup,
                                style: { cursor: 'pointer' }
                            },
                            React.createElement('div', { className: 'sign-in', id: 'text-signup-btn' }, 'Sign Up')
                        )
                    ),
                    React.createElement('div', { className: 'if-you-already-have', id: 'text-no-account' }, "Don't have an account?"),
                    React.createElement('div', { className: 'welcome', id: 'text-greetings' }, 'Greetings!')
                )
            )
        )
    );
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Login;
}
window.Login = Login;
