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
        // Old code: Show error every time errors change
        // const errorFields = Object.entries(errors)
        //     .filter(([_, value]) => value !== '')
        //     .map(([key, _]) => {
        //         const fieldNames = {
        //             username: 'Username',
        //             email: 'Email',
        //             firstName: 'First Name',
        //             lastName: 'Last Name',
        //             password: 'Password',
        //             confirmPassword: 'Password Confirmation'
        //         };
        //         return fieldNames[key] || key;
        //     });
        // 
        // const messageEl = document.getElementById('message');
        // const messageTextEl = document.getElementById('messageText');
        // 
        // if (errorFields.length > 0 && messageEl && messageTextEl) {
        //     const credentialsList = errorFields.join(', ');
        //     messageTextEl.textContent = `⚠️ Warning: Please fill in your credentials`;
        //     messageEl.classList.remove('hidden');
        // } else if (messageEl) {
        //     messageEl.classList.add('hidden');
        // }
        
        // New code: Show error only once
        const errorFields = Object.entries(errors)
            .filter(([_, value]) => value !== '');
        
        const messageEl = document.getElementById('message');
        const messageTextEl = document.getElementById('messageText');
        
        if (errorFields.length > 0 && !messageShown && messageEl && messageTextEl) {
            messageTextEl.textContent = `⚠️ Warning: Please fill in your credentials`;
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

        // Original logic (commented out):
        // // Clear error when user starts typing
        // if (errors[field]) {
        //     setErrors(prev => ({ ...prev, [field]: '' }));
        // }

        // New logic: Handle errors dynamically based on field state
        // If field has value, clear error; if empty, show appropriate error message
        let isValid = false;
        let errorMessage = '';

        if (field === 'email') {
            // isValid = value.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            isValid = value.trim() !== ''; // Only check if not empty
            if (!isValid) {
                errorMessage = 'Please provide a valid email.'; // Set error when empty
            }
        } else if (field === 'confirmPassword') {
            isValid = value.length > 0 && value === formData.password;
            if (!isValid) {
                if (value.length === 0) {
                    errorMessage = 'Please confirm your password.'; // Set error when empty
                } else {
                    errorMessage = 'Passwords do not match!'; // Set error when doesn't match
                }
            }
        } else if (field === 'password') {
            // isValid = value.length >= 6;
            isValid = value.length > 0; // Only check if not empty
            if (!isValid) {
                errorMessage = 'Please enter a password.'; // Set error when empty
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
                errorMessage = 'Please choose a username.'; // Set error when empty
            }
        } else if (field === 'firstName') {
            isValid = value.trim() !== '';
            if (!isValid) {
                errorMessage = 'Please provide your first name.'; // Set error when empty
            }
        } else if (field === 'lastName') {
            isValid = value.trim() !== '';
            if (!isValid) {
                errorMessage = 'Please provide your last name.'; // Set error when empty
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
        } // else if (formData.username.length < 3) {
        //     newErrors.username = 'Username must be at least 3 characters.';
        // }

        if (!formData.email.trim()) {
            newErrors.email = 'Please provide a valid email.';
        } // else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        //     newErrors.email = 'Please provide a valid email address.';
        // }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Please provide your first name.';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Please provide your last name.';
        }

        if (!formData.password) {
            newErrors.password = 'Please enter a password.';
        } // else if (formData.password.length < 6) {
        //     newErrors.password = 'Password must be at least 6 characters.';
        // }

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
                // Old: Show modal alert for success
                // showAlert('Success', result.message, () => {
                //     window.location.href = '/home';
                // });
                
                // New: Show success in message notification
                const messageEl = document.getElementById('message');
                const messageTextEl = document.getElementById('messageText');
                
                if (messageEl && messageTextEl) {
                    messageTextEl.textContent = `✓ ${result.message}, redirecting...`;
                    messageEl.classList.remove('hidden');
                    
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/home';
                    }, 2000);
                }
            } else {
                // Old: alert(result.message || "An error occurred. Please try again.");
                // Check if it's a field-specific error
                if (result.field && newErrors[result.field] !== undefined) {
                    setErrors(prev => ({ ...prev, [result.field]: result.message }));
                } else {
                    showAlert('Error', result.message || "An error occurred. Please try again.");
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            // Old: alert("An error occurred. Please try again.");
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

    // return React.createElement('div', {
    //         className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8'
    //     },
    //     React.createElement('input', {
    //         type: 'hidden',
    //         name: '_csrf',
    //         value: csrfToken
    //     }),

    //     React.createElement('div', null,
    //         React.createElement('label', {
    //             htmlFor: 'input-username',
    //             className: 'block mb-1 font-medium'
    //         }, 'Username'),
    //         React.createElement('input', {
    //             type: 'text',
    //             id: 'input-username',
    //             value: formData.username,
    //             onChange: handleChange('username'),
    //             onKeyPress: handleKeyPress,
    //             disabled: isLoading,
    //             className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
    //         })
    //     ),

    //     React.createElement('div', null,
    //         React.createElement('label', {
    //             htmlFor: 'input-email',
    //             className: 'block mb-1 font-medium'
    //         }, 'Email Address'),
    //         React.createElement('input', {
    //             type: 'email',
    //             id: 'input-email',
    //             value: formData.email,
    //             onChange: handleChange('email'),
    //             onKeyPress: handleKeyPress,
    //             disabled: isLoading,
    //             className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
    //         })
    //     ),

    //     React.createElement('div', null,
    //         React.createElement('label', {
    //             htmlFor: 'input-firstName',
    //             className: 'block mb-1 font-medium'
    //         }, 'First Name'),
    //         React.createElement('input', {
    //             type: 'text',
    //             id: 'input-firstName',
    //             maxLength: 50,
    //             value: formData.firstName,
    //             onChange: handleChange('firstName'),
    //             onKeyPress: handleKeyPress,
    //             disabled: isLoading,
    //             className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
    //         })
    //     ),

    //     React.createElement('div', null,
    //         React.createElement('label', {
    //             htmlFor: 'input-lastName',
    //             className: 'block mb-1 font-medium'
    //         }, 'Last Name'),
    //         React.createElement('input', {
    //             type: 'text',
    //             id: 'input-lastName',
    //             maxLength: 50,
    //             value: formData.lastName,
    //             onChange: handleChange('lastName'),
    //             onKeyPress: handleKeyPress,
    //             disabled: isLoading,
    //             className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
    //         })
    //     ),

    //     React.createElement('div', null,
    //         React.createElement('label', {
    //             htmlFor: 'input-password',
    //             className: 'block mb-1 font-medium'
    //         }, 'Password'),
    //         React.createElement('input', {
    //             type: 'password',
    //             id: 'input-password',
    //             value: formData.password,
    //             onChange: handleChange('password'),
    //             onKeyPress: handleKeyPress,
    //             disabled: isLoading,
    //             className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
    //         })
    //     ),

    //     React.createElement('div', null,
    //         React.createElement('label', {
    //             htmlFor: 'input-confirmPassword',
    //             className: 'block mb-1 font-medium'
    //         }, 'Confirm Password'),
    //         React.createElement('input', {
    //             type: 'password',
    //             id: 'input-confirmPassword',
    //             value: formData.confirmPassword,
    //             onChange: handleChange('confirmPassword'),
    //             onKeyPress: handleKeyPress,
    //             disabled: isLoading,
    //             className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
    //         })
    //     ),

    //     React.createElement('button', {
    //         id: 'btn-signup',
    //         onClick: handleSubmit,
    //         disabled: isLoading,
    //         className: 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-2'
    //     }, isLoading ? 'Submitting...' : 'Submit')
    // );

// test signup 

    // Check if any validation messages are visible
    const hasValidationMessages = Object.values(errors).some(error => error !== '') || 
                                   Object.values(validFields).some(valid => valid === true);

return React.createElement('div', { className: 'frame' },
        React.createElement('div', { className: hasValidationMessages ? 'sign-up expanded' : 'sign-up' },
            React.createElement('div', { className: 'login' },
                React.createElement('div', { className: 'content-background' }),

                // Right side group (already-have-account)
                React.createElement('div', { className: hasValidationMessages ? 'right-content expanded' : 'right-content' },
                    React.createElement('div', { className: 'group' },
                        React.createElement('div', { className: 'text-wrapper' }, 'Welcome!'),
                        React.createElement('p', { className: 'div' }, 'If you already have an account.'),
                        React.createElement('div', { className: 'div-wrapper', onClick: () => window.location.href = '/login', style: { cursor: 'pointer' } },
                            React.createElement('div', { className: 'text-wrapper-2' }, 'Sign In')
                        )
                    )
                ),

                // Left content (signup form)
                React.createElement('div', { className: 'left-content' },
                    React.createElement('div', { className: 'logo' },
                        React.createElement('div', { className: 'logo-text' },
                            React.createElement('div', { className: 'text-wrapper-3' }, 'Singularity')
                        ),
                        React.createElement('img', { className: 'union', src: 'img/union.svg', alt: 'Union' })
                    ),

                    React.createElement('div', { className: 'content' },
                        React.createElement('div', { className: 'slogan' },
                            React.createElement('div', { className: 'text-wrapper-4' }, 'New Joiner?'),
                            React.createElement('p', { className: 'p' }, 'Simply sign up to use the AI for Software Development')
                        ),

                        React.createElement('div', { className: 'div-2' },

                            // Username
                            React.createElement('div', { className: 'div-3', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-5' }, 'Username'),
                                React.createElement('div', { 
                                    className: 'div-wrapper-2',
                                    style: {
                                        borderColor: errors.username ? '#dc2626' : validFields.username ? '#22c55e' : '#e4e4e4',
                                        borderWidth: '2px',
                                        borderStyle: 'solid'
                                    }
                                },
                                    React.createElement('input', {
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
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.username),
                                validFields.username && !errors.username && React.createElement('div', {
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Email
                            React.createElement('div', { className: 'div-3', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-5' }, 'Email address'),
                                React.createElement('div', { 
                                    className: 'div-wrapper-2',
                                    style: {
                                        borderColor: errors.email ? '#dc2626' : validFields.email ? '#22c55e' : '#e4e4e4',
                                        borderWidth: '2px',
                                        borderStyle: 'solid'
                                    }
                                },
                                    React.createElement('input', {
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
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.email),
                                validFields.email && !errors.email && React.createElement('div', {
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // First name
                            React.createElement('div', { className: 'div-3', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8' }, 'First Name'),
                                React.createElement('div', { 
                                    className: 'div-wrapper-2',
                                    style: {
                                        borderColor: errors.firstName ? '#dc2626' : validFields.firstName ? '#22c55e' : '#e4e4e4',
                                        borderWidth: '2px',
                                        borderStyle: 'solid'
                                    }
                                },
                                    React.createElement('input', {
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
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.firstName),
                                validFields.firstName && !errors.firstName && React.createElement('div', {
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Last name
                            React.createElement('div', { className: 'div-3', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8' }, 'Last Name'),
                                React.createElement('div', { 
                                    className: 'div-wrapper-2',
                                    style: {
                                        borderColor: errors.lastName ? '#dc2626' : validFields.lastName ? '#22c55e' : '#e4e4e4',
                                        borderWidth: '2px',
                                        borderStyle: 'solid'
                                    }
                                },
                                    React.createElement('input', {
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
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.lastName),
                                validFields.lastName && !errors.lastName && React.createElement('div', {
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Password
                            React.createElement('div', { className: 'div-3', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8' }, 'Password'),
                                React.createElement('div', { 
                                    className: 'div-wrapper-2',
                                    style: {
                                        borderColor: errors.password ? '#dc2626' : validFields.password ? '#22c55e' : '#e4e4e4',
                                        borderWidth: '2px',
                                        borderStyle: 'solid'
                                    }
                                },
                                    React.createElement('input', {
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
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.password),
                                validFields.password && !errors.password && React.createElement('div', {
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Confirm password
                            React.createElement('div', { className: 'div-3', style: { position: 'relative', marginBottom: '8px' } },
                                React.createElement('div', { className: 'text-wrapper-8' }, 'Confirm Password'),
                                React.createElement('div', { 
                                    className: 'div-wrapper-2',
                                    style: {
                                        borderColor: errors.confirmPassword ? '#dc2626' : validFields.confirmPassword ? '#22c55e' : '#e4e4e4',
                                        borderWidth: '2px',
                                        borderStyle: 'solid'
                                    }
                                },
                                    React.createElement('input', {
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
                                    style: {
                                        color: '#dc2626',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, errors.confirmPassword),
                                validFields.confirmPassword && !errors.confirmPassword && React.createElement('div', {
                                    style: {
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        marginTop: '50px',
                                        fontFamily: 'SF Pro, sans-serif'
                                    }
                                }, 'Looks good!')
                            ),

                            // Terms
                            React.createElement('div', { className: 'by-continuing-you-wrapper' },
                                React.createElement('p', { className: 'by-continuing-you' },
                                    React.createElement('span', { className: 'span' },
                                        'By continuing, you agree to Singularity\u2019s ',
                                        React.createElement('a', { href: '#', style: { textDecoration: 'underline', color: 'inherit' } }, 'Privacy Policy'),
                                        ' and ',
                                        React.createElement('a', { href: '#', style: { textDecoration: 'underline', color: 'inherit' } }, 'Terms of Use')
                                    )
                                )
                            ),

                            React.createElement('hr', { style: { marginBottom: '1px', width: '100%', height: '0.3px', backgroundColor: '#E4E4E4' } }),

                            // Submit
                            React.createElement('div', { className: 'login-wrapper' },
                                React.createElement('div', {
                                    className: 'login-2',
                                    onClick: handleSubmit,
                                    style: { cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }
                                },
                                    React.createElement('div', { className: 'text-wrapper-10' }, isLoading ? 'Submitting...' : 'Sign Up')
                                )
                            )
                        )
                    )
                )
            )
        ),

        // Custom Modal
        modal.isOpen && React.createElement('div', {
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
                zIndex: 10001,
                padding: '20px'
            },
            onClick: (e) => {
                if (e.target === e.currentTarget) {
                    closeModal();
                }
            }
        },
            React.createElement('div', {
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
                    style: {
                        fontFamily: 'SF Pro, sans-serif',
                        fontWeight: 700,
                        fontSize: '24px',
                        color: '#000000',
                        lineHeight: 'normal'
                    }
                }, modal.title),
                React.createElement('div', {
                    style: {
                        fontFamily: 'SF Pro, sans-serif',
                        fontWeight: 400,
                        fontSize: '16px',
                        color: '#000000',
                        lineHeight: '1.5'
                    }
                }, modal.message),
                React.createElement('div', {
                    style: {
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'flex-end',
                        marginTop: '10px'
                    }
                },
                    React.createElement('button', {
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
