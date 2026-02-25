const { useState, useEffect } = React;

const TempSignup = ({ csrfToken }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        userType: "general"
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: ''
    });
    const [validFields, setValidFields] = useState({
        username: false,
        email: false,
        firstName: false,
        lastName: false,
        password: false,
        confirmPassword: false
    });
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });
    const [messageShown, setMessageShown] = useState(false);

    // Show validation errors in message notification
    useEffect(() => {
        const errorFields = Object.entries(errors)
            .filter(([_, value]) => value !== '');

        const messageEl = document.getElementById('message');
        const messageTextEl = document.getElementById('messageText');

        if (errorFields.length > 0 && !messageShown && messageEl && messageTextEl) {
            messageTextEl.textContent = `Warning: Please fill in your credentials`;
            messageEl.classList.remove('hidden');
            setMessageShown(true);
        }
    }, [errors, messageShown]);

    const showAlert = (title, message, onConfirm = null) => {
        setModal({ isOpen: true, title, message, type: 'alert', onConfirm });
    };

    const closeModal = () => {
        setModal({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });
    };

    const handleModalOk = () => {
        if (modal.onConfirm) {
            modal.onConfirm();
        }
        closeModal();
    };

    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        let isValid = false;
        let errorMessage = '';

        if (field === 'email') {
            isValid = value.trim() !== '';
            if (!isValid) {
                errorMessage = 'Please provide a valid email.';
            }
        } else if (field === 'confirmPassword') {
            isValid = value.length > 0 && value === formData.password;
            if (!isValid) {
                if (value.length === 0) {
                    errorMessage = 'Please confirm your password.';
                } else {
                    errorMessage = 'Passwords do not match!';
                }
            }
        } else if (field === 'password') {
            isValid = value.length > 0;
            if (!isValid) {
                errorMessage = 'Please enter a password.';
            }
            // Also revalidate confirmPassword when password changes
            if (formData.confirmPassword) {
                const confirmIsValid = formData.confirmPassword.length > 0 && formData.confirmPassword === value;
                setValidFields(prev => ({ ...prev, confirmPassword: confirmIsValid }));
                if (!confirmIsValid) {
                    if (formData.confirmPassword.length === 0) {
                        setErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your password.' }));
                    } else {
                        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match!' }));
                    }
                } else {
                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                }
            }
        } else if (field === 'username') {
            isValid = value.trim() !== '';
            if (!isValid) {
                errorMessage = 'Please choose a username.';
            }
        } else if (field === 'firstName') {
            isValid = value.trim() !== '';
            if (!isValid) {
                errorMessage = 'Please provide your first name.';
            }
        } else if (field === 'lastName') {
            isValid = value.trim() !== '';
            if (!isValid) {
                errorMessage = 'Please provide your last name.';
            }
        }

        // Update validation state
        setValidFields(prev => ({ ...prev, [field]: isValid }));

        // Clear error if field is valid, otherwise set/preserve error
        if (isValid) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        } else {
            setErrors(prev => ({ ...prev, [field]: errorMessage }));
        }
    };

    const handleSubmit = async () => {
        // Validate all fields
        const newErrors = {
            username: '',
            email: '',
            firstName: '',
            lastName: '',
            password: '',
            confirmPassword: ''
        };

        // Check required fields
        if (!formData.username.trim()) {
            newErrors.username = 'Please choose a username.';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Please provide a valid email.';
        }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Please provide your first name.';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Please provide your last name.';
        }

        if (!formData.password) {
            newErrors.password = 'Please enter a password.';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password.';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match!';
        }

        // If there are errors, set them and return
        if (Object.values(newErrors).some(error => error !== '')) {
            setErrors(newErrors);
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
                const messageEl = document.getElementById('message');
                const messageTextEl = document.getElementById('messageText');

                if (messageEl && messageTextEl) {
                    messageTextEl.textContent = `${result.message}, redirecting...`;
                    messageEl.classList.remove('hidden');

                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/home';
                    }, 2000);
                }
            } else {
                if (result.field && newErrors[result.field] !== undefined) {
                    setErrors(prev => ({ ...prev, [result.field]: result.message }));
                } else {
                    showAlert('Error', result.message || "An error occurred. Please try again.");
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            showAlert('Error', "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    // Check if any validation messages are visible
    const hasValidationMessages = Object.values(errors).some(error => error !== '') ||
        Object.values(validFields).some(valid => valid === true);

    return React.createElement('div', { className: 'frame', id: 'signup-page-frame' },
        React.createElement('div', {
                className: hasValidationMessages ? 'sign-up expanded' : 'sign-up',
                id: 'signup-wrapper'
            },
            React.createElement('div', { className: 'login', id: 'signup-main-container' },
                React.createElement('div', { className: 'content-background', id: 'signup-bg-overlay' }),

                // Right side group (already-have-account)
                React.createElement('div', {
                        className: hasValidationMessages ? 'right-content expanded' : 'right-content',
                        id: 'right-panel-welcome'
                    },
                    React.createElement('div', { className: 'group', id: 'welcome-group' },
                        React.createElement('div', { className: 'text-wrapper', id: 'welcome-header-text' }, 'Welcome!'),
                        React.createElement('p', { className: 'div', id: 'welcome-sub-text' }, 'If you already have an account.'),
                        React.createElement('div', {
                                className: 'div-wrapper',
                                id: 'btn-signin-redirect', // ID Added
                                onClick: () => window.location.href = '/login',
                                style: { cursor: 'pointer' }
                            },
                            React.createElement('div', { className: 'text-wrapper-2', id: 'text-signin-btn' }, 'Sign In')
                        )
                    )
                ),

                // Left content (signup form)
                React.createElement('div', { className: 'left-content', id: 'left-panel-form' },
                    React.createElement('div', { className: 'logo', id: 'logo-container' },
                        React.createElement('div', { className: 'logo-text', id: 'logo-text-wrapper' },
                            React.createElement('div', { className: 'text-wrapper-3', id: 'logo-text-singularity' }, 'Singularity')
                        ),
                        React.createElement('img', { className: 'union', src: 'img/union.svg', alt: 'Union', id: 'logo-icon' })
                    ),

                    React.createElement('div', { className: 'content', id: 'form-content-area' },
                        React.createElement('div', { className: 'slogan', id: 'slogan-container' },
                            React.createElement('div', { className: 'text-wrapper-4', id: 'slogan-header' }, 'New Joiner?'),
                            React.createElement('p', { className: 'p', id: 'slogan-sub' }, 'Simply sign up to use the AI for Software Development')
                        ),

                        React.createElement('div', { className: 'div-2', id: 'signup-form-inputs' },

                            // Username
                            React.createElement('div', { className: 'div-3', id: 'field-container-username', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-5', id: 'label-username' }, 'Username'),
                                React.createElement('div', {
                                        className: 'div-wrapper-2',
                                        id: 'input-wrapper-username',
                                        style: {
                                            borderColor: errors.username ? '#dc2626' : validFields.username ? '#22c55e' : '#e4e4e4',
                                            borderWidth: '2px',
                                            borderStyle: 'solid'
                                        }
                                    },
                                    React.createElement('input', {
                                        id: 'input-username', // ID Added
                                        type: 'text',
                                        placeholder: 'Username',
                                        value: formData.username,
                                        onChange: handleChange('username'),
                                        onKeyPress: handleKeyPress,
                                        disabled: isLoading,
                                        style: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '10px' , margin: '10px' }
                                    })
                                ),
                                errors.username && React.createElement('div', {
                                    id: 'error-msg-username', // ID Added
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.username),
                                validFields.username && !errors.username && React.createElement('div', {
                                    id: 'success-msg-username', // ID Added
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Email
                            React.createElement('div', { className: 'div-3', id: 'field-container-email', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-5', id: 'label-email' }, 'Email address'),
                                React.createElement('div', {
                                        className: 'div-wrapper-2',
                                        id: 'input-wrapper-email',
                                        style: {
                                            borderColor: errors.email ? '#dc2626' : validFields.email ? '#22c55e' : '#e4e4e4',
                                            borderWidth: '2px',
                                            borderStyle: 'solid'
                                        }
                                    },
                                    React.createElement('input', {
                                        id: 'input-email', // ID Added
                                        type: 'email',
                                        placeholder: 'someone@example.com',
                                        value: formData.email,
                                        onChange: handleChange('email'),
                                        onKeyPress: handleKeyPress,
                                        disabled: isLoading,
                                        style: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '10px' , margin: '10px' }
                                    })
                                ),
                                errors.email && React.createElement('div', {
                                    id: 'error-msg-email', // ID Added
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.email),
                                validFields.email && !errors.email && React.createElement('div', {
                                    id: 'success-msg-email', // ID Added
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // First name
                            React.createElement('div', { className: 'div-3', id: 'field-container-firstname', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8', id: 'label-firstname' }, 'First Name'),
                                React.createElement('div', {
                                        className: 'div-wrapper-2',
                                        id: 'input-wrapper-firstname',
                                        style: {
                                            borderColor: errors.firstName ? '#dc2626' : validFields.firstName ? '#22c55e' : '#e4e4e4',
                                            borderWidth: '2px',
                                            borderStyle: 'solid'
                                        }
                                    },
                                    React.createElement('input', {
                                        id: 'input-firstname', // ID Added
                                        type: 'text',
                                        placeholder: 'First Name',
                                        value: formData.firstName,
                                        onChange: handleChange('firstName'),
                                        onKeyPress: handleKeyPress,
                                        disabled: isLoading,
                                        style: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '10px' , margin: '10px' }
                                    })
                                ),
                                errors.firstName && React.createElement('div', {
                                    id: 'error-msg-firstname', // ID Added
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.firstName),
                                validFields.firstName && !errors.firstName && React.createElement('div', {
                                    id: 'success-msg-firstname', // ID Added
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Last name
                            React.createElement('div', { className: 'div-3', id: 'field-container-lastname', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8', id: 'label-lastname' }, 'Last Name'),
                                React.createElement('div', {
                                        className: 'div-wrapper-2',
                                        id: 'input-wrapper-lastname',
                                        style: {
                                            borderColor: errors.lastName ? '#dc2626' : validFields.lastName ? '#22c55e' : '#e4e4e4',
                                            borderWidth: '2px',
                                            borderStyle: 'solid'
                                        }
                                    },
                                    React.createElement('input', {
                                        id: 'input-lastname', // ID Added
                                        type: 'text',
                                        placeholder: 'Last Name',
                                        value: formData.lastName,
                                        onChange: handleChange('lastName'),
                                        onKeyPress: handleKeyPress,
                                        disabled: isLoading,
                                        style: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '10px' , margin: '10px' }
                                    })
                                ),
                                errors.lastName && React.createElement('div', {
                                    id: 'error-msg-lastname', // ID Added
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.lastName),
                                validFields.lastName && !errors.lastName && React.createElement('div', {
                                    id: 'success-msg-lastname', // ID Added
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Password
                            React.createElement('div', { className: 'div-3', id: 'field-container-password', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8', id: 'label-password' }, 'Password'),
                                React.createElement('div', {
                                        className: 'div-wrapper-2',
                                        id: 'input-wrapper-password',
                                        style: {
                                            borderColor: errors.password ? '#dc2626' : validFields.password ? '#22c55e' : '#e4e4e4',
                                            borderWidth: '2px',
                                            borderStyle: 'solid'
                                        }
                                    },
                                    React.createElement('input', {
                                        id: 'input-password', // ID Added
                                        type: 'password',
                                        placeholder: '',
                                        value: formData.password,
                                        onChange: handleChange('password'),
                                        onKeyPress: handleKeyPress,
                                        disabled: isLoading,
                                        style: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '10px' , margin: '10px' }
                                    })
                                ),
                                errors.password && React.createElement('div', {
                                    id: 'error-msg-password', // ID Added
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.password),
                                validFields.password && !errors.password && React.createElement('div', {
                                    id: 'success-msg-password', // ID Added
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Confirm password
                            React.createElement('div', { className: 'div-3', id: 'field-container-confirm-password', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8', id: 'label-confirm-password' }, 'Confirm Password'),
                                React.createElement('div', {
                                        className: 'div-wrapper-2',
                                        id: 'input-wrapper-confirm-password',
                                        style: {
                                            borderColor: errors.confirmPassword ? '#dc2626' : validFields.confirmPassword ? '#22c55e' : '#e4e4e4',
                                            borderWidth: '2px',
                                            borderStyle: 'solid'
                                        }
                                    },
                                    React.createElement('input', {
                                        id: 'input-confirm-password', // ID Added
                                        type: 'password',
                                        placeholder: '',
                                        value: formData.confirmPassword,
                                        onChange: handleChange('confirmPassword'),
                                        onKeyPress: handleKeyPress,
                                        disabled: isLoading,
                                        style: { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '10px' , margin: '10px' }
                                    })
                                ),
                                errors.confirmPassword && React.createElement('div', {
                                    id: 'error-msg-confirm-password', // ID Added
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.confirmPassword),
                                validFields.confirmPassword && !errors.confirmPassword && React.createElement('div', {
                                    id: 'success-msg-confirm-password', // ID Added
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Terms
                            React.createElement('div', { className: 'by-continuing-you-wrapper', id: 'terms-wrapper' },
                                React.createElement('p', { className: 'by-continuing-you', id: 'terms-text-container' },
                                    React.createElement('span', { className: 'span', id: 'terms-span' },
                                        'By continuing, you agree to Singularity\u2019s ',
                                        React.createElement('a', { href: '#', id: 'link-privacy-policy', style: { textDecoration: 'underline', color: 'inherit' } }, 'Privacy Policy'),
                                        ' and ',
                                        React.createElement('a', { href: '#', id: 'link-terms-of-use', style: { textDecoration: 'underline', color: 'inherit' } }, 'Terms of Use')
                                    )
                                )
                            ),

                            //React.createElement('hr', { id: 'divider-line', style: { marginBottom: '1px', width: '100%', height: '0.3px', backgroundColor: '#E4E4E4' } }),

                            // Submit
                            React.createElement('div', { className: 'login-wrapper', id: 'submit-btn-wrapper' },
                                React.createElement('div', {
                                        id: 'btn-signup-submit', // ID Added
                                        className: 'login-2',
                                        onClick: handleSubmit,
                                        style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                                    },
                                    React.createElement('div', { className: 'text-wrapper-10', id: 'text-signup-submit' }, isLoading ? 'Submitting...' : 'Sign Up')
                                )
                            )
                        )
                    )
                )
            )
        ),

        // Custom Modal
        modal.isOpen && React.createElement('div', {
                id: 'modal-overlay', // ID Added
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: window.ZIndex?.MODAL_BACKDROP || 30,
                    padding: '20px'
                },
                onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        closeModal();
                    }
                }
            },
            React.createElement('div', {
                    id: 'modal-content-box', // ID Added
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '15px',
                        padding: '30px',
                        maxWidth: '450px',
                        width: '100%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    },
                    onClick: (e) => e.stopPropagation()
                },
                React.createElement('div', {
                    id: 'modal-title', // ID Added
                    style: {
                        fontFamily: 'SF Pro, sans-serif',
                        fontWeight: 700,
                        fontSize: '24px',
                        color: '#000000',
                        lineHeight: 'normal'
                    }
                }, modal.title),
                React.createElement('div', {
                    id: 'modal-message', // ID Added
                    style: {
                        fontFamily: 'SF Pro, sans-serif',
                        fontWeight: 400,
                        fontSize: '16px',
                        color: '#000000',
                        lineHeight: '1.5'
                    }
                }, modal.message),
                React.createElement('div', {
                        id: 'modal-btn-container', // ID Added
                        style: {
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end',
                            marginTop: '10px'
                        }
                    },
                    React.createElement('button', {
                        id: 'btn-modal-ok', // ID Added
                        style: {
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            fontFamily: 'SF Pro, sans-serif',
                            fontWeight: 700,
                            fontSize: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        },
                        onMouseEnter: (e) => e.target.style.backgroundColor = '#333333',
                        onMouseLeave: (e) => e.target.style.backgroundColor = '#000000',
                        onClick: handleModalOk
                    }, 'OK')
                )
            )
        )
    );

};

// Make available globally
window.TempSignup = TempSignup;