// const { useState } = React;

// const TempChangePassword = ({ csrfToken }) => {
//     const [formData, setFormData] = useState({
//         currentPassword: '',
//         newPassword: '',
//         confirmPassword: '',
//     });
//     const [isLoading, setIsLoading] = useState(false);

//     const handleChange = (field) => (e) => {
//         setFormData({ ...formData, [field]: e.target.value });
//     };

//     const handleSubmit = async () => {
//         const requiredFields = ["currentPassword", "newPassword", "confirmPassword"];
//         const emptyFields = requiredFields.filter(field => !formData[field]);

//         if (emptyFields.length > 0) {
//             alert(`Please fill in: ${emptyFields.join(", ")}`);
//             return;
//         }

//         if (formData.newPassword !== formData.confirmPassword) {
//             alert("New passwords do not match!");
//             return;
//         }

//         setIsLoading(true);

//         try {
//             const response = await fetch('/api/password/change', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'CSRF-Token': csrfToken
//                 },
//                 body: JSON.stringify(formData)
//             });

//             const result = await response.json();

//             if (response.ok) {
//                 alert(result.message || "Password changed successfully!");
//                 window.location.href = '/profile';
//             } else {
//                 alert(result.message || "Failed to change password.");
//             }
//         } catch (error) {
//             console.error('Change password error:', error);
//             alert("An unexpected error occurred. Please try again.");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleKeyPress = (e) => {
//         if (e.key === 'Enter') {
//             handleSubmit();
//         }
//     };

//     return React.createElement(
//         'div',
//         { className: 'flex flex-col gap-3 p-4 max-w-md mx-auto mt-8' },

//         // Hidden CSRF
//         React.createElement('input', {
//             type: 'hidden',
//             name: '_csrf',
//             value: csrfToken
//         }),

//         React.createElement("h2", { className: "text-xl font-semibold mb-3 text-center" }, "Change Password"),

//         // Current password
//         React.createElement('div', null,
//             React.createElement('label', { htmlFor: 'current-password', className: 'block mb-1 font-medium' }, 'Current Password'),
//             React.createElement('input', {
//                 type: 'password',
//                 id: 'current-password',
//                 value: formData.currentPassword,
//                 onChange: handleChange('currentPassword'),
//                 onKeyPress: handleKeyPress,
//                 disabled: isLoading,
//                 className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
//             })
//         ),

//         // New password
//         React.createElement('div', null,
//             React.createElement('label', { htmlFor: 'new-password', className: 'block mb-1 font-medium' }, 'New Password'),
//             React.createElement('input', {
//                 type: 'password',
//                 id: 'new-password',
//                 value: formData.newPassword,
//                 onChange: handleChange('newPassword'),
//                 onKeyPress: handleKeyPress,
//                 disabled: isLoading,
//                 className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
//             })
//         ),

//         // Confirm password
//         React.createElement('div', null,
//             React.createElement('label', { htmlFor: 'confirm-password', className: 'block mb-1 font-medium' }, 'Confirm New Password'),
//             React.createElement('input', {
//                 type: 'password',
//                 id: 'confirm-password',
//                 value: formData.confirmPassword,
//                 onChange: handleChange('confirmPassword'),
//                 onKeyPress: handleKeyPress,
//                 disabled: isLoading,
//                 className: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
//             })
//         ),

//         // Submit button
//         React.createElement('button', {
//             id: 'btn-change-password',
//             onClick: handleSubmit,
//             disabled: isLoading,
//             className: 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-3'
//         }, isLoading ? 'Changing...' : 'Change Password')
//     );
// };

// // Make available globally
// window.TempChangePassword = TempChangePassword;

const { useState } = React;

const TempChangePassword = ({ csrfToken }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });

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
        setFormData({ ...formData, [field]: e.target.value });
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const handleSubmit = async () => {
        // Clear previous errors
        const newErrors = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        };

        // Validate required fields
        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Current password is required';
        }
        if (!formData.newPassword) {
            newErrors.newPassword = 'New password is required';
        }
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your new password';
        }

        // Check if passwords match
        if (formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        // If there are errors, set them and return
        if (newErrors.currentPassword || newErrors.newPassword || newErrors.confirmPassword) {
            setErrors(newErrors);
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
                // Old: alert(result.message || "Password changed successfully!");
                // Old: window.location.href = '/profile';
                showAlert('Success', result.message || "Password changed successfully!", () => {
                    window.location.href = '/profile';
                });
            } else {
                // Check if it's a field-specific error
                if (result.field) {
                    setErrors({ ...errors, [result.field]: result.message || 'An error occurred' });
                } else if (result.message && result.message.toLowerCase().includes('current password')) {
                    setErrors({ ...errors, currentPassword: result.message });
                } else {
                    // Old: alert(result.message || "Failed to change password.");
                    showAlert('Error', result.message || "Failed to change password.");
                }
            }
        } catch (error) {
            console.error('Change password error:', error);
            // Old: alert("An unexpected error occurred. Please try again.");
            showAlert('Error', "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        window.location.href = '/profile';
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return React.createElement('div', {
        className: 'login-screen-big-screen-ver',
        style: {
            borderRadius: '5.36px',
            height: '900px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }
    },
        React.createElement('div', {
            className: 'content',
            style: {
                background: '#ffffff',
                borderRadius: '10px',
                padding: '10px 20px 10px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                position: 'absolute'
            }
        },
            // Hidden CSRF
            React.createElement('input', {
                type: 'hidden',
                name: '_csrf',
                value: csrfToken
            }),

            // Title
            React.createElement('div', {
                className: 'title',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0px',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    flexShrink: 0,
                    position: 'relative'
                }
            },
                React.createElement('div', {
                    className: 'change-password',
                    style: {
                        color: '#333438',
                        textAlign: 'left',
                        fontFamily: 'SfPro-Bold, sans-serif',
                        fontSize: '24px',
                        fontWeight: '700',
                        position: 'relative'
                    }
                }, 'Change Password')
            ),

            // Form Container
            React.createElement('div', {
                className: 'frame-5',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    alignSelf: 'stretch',
                    flexShrink: 0,
                    height: '334px',
                    position: 'relative'
                }
            },
                // Old Password
                React.createElement('div', {
                    className: 'old-password',
                    style: {
                        flexShrink: 0,
                        width: '400px',
                        height: '60px',
                        position: 'static'
                    }
                },
                    React.createElement('div', {
                        className: 'old-password2',
                        style: {
                            color: '#333438',
                            textAlign: 'left',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            fontSize: '13px',
                            lineHeight: '16px',
                            fontWeight: '400',
                            position: 'absolute',
                            left: '0px',
                            top: '0px',
                            width: '397.79px',
                            height: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start'
                        }
                    }, 'Old Password'),
                    React.createElement('input', {
                        type: 'password',
                        id: 'current-password',
                        value: formData.currentPassword,
                        onChange: handleChange('currentPassword'),
                        onKeyPress: handleKeyPress,
                        disabled: isLoading,
                        style: {
                            borderRadius: '8px',
                            borderStyle: 'solid',
                            borderColor: errors.currentPassword ? '#dc2626' : '#e4e4e4',
                            borderWidth: '2px',
                            width: '400px',
                            height: '35px',
                            position: 'absolute',
                            left: '0px',
                            top: '25px',
                            padding: '0 10px',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            fontSize: '13px'
                        }
                    }),
                    errors.currentPassword && React.createElement('div', {
                        style: {
                            color: '#dc2626',
                            fontSize: '12px',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            position: 'absolute',
                            left: '0px',
                            top: '62px',
                            width: '400px'
                        }
                    }, errors.currentPassword)
                ),

                // New Password
                React.createElement('div', {
                    className: 'password',
                    style: {
                        alignSelf: 'stretch',
                        flexShrink: 0,
                        height: '60px',
                        position: 'static'
                    }
                },
                    React.createElement('div', {
                        className: 'new-password',
                        style: {
                            color: '#333438',
                            textAlign: 'left',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            fontSize: '13px',
                            lineHeight: '16px',
                            fontWeight: '400',
                            position: 'absolute',
                            left: '0px',
                            top: '80px',
                            width: '400px',
                            height: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start'
                        }
                    }, 'New Password'),
                    React.createElement('input', {
                        type: 'password',
                        id: 'new-password',
                        value: formData.newPassword,
                        onChange: handleChange('newPassword'),
                        onKeyPress: handleKeyPress,
                        disabled: isLoading,
                        style: {
                            borderRadius: '8px',
                            borderStyle: 'solid',
                            borderColor: errors.newPassword ? '#dc2626' : '#e4e4e4',
                            borderWidth: '2px',
                            width: '400px',
                            height: '35px',
                            position: 'absolute',
                            left: '0px',
                            top: '105px',
                            padding: '0 10px',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            fontSize: '13px'
                        }
                    }),
                    errors.newPassword && React.createElement('div', {
                        style: {
                            color: '#dc2626',
                            fontSize: '12px',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            position: 'absolute',
                            left: '0px',
                            top: '142px',
                            width: '400px'
                        }
                    }, errors.newPassword)
                ),

                // Confirm New Password
                React.createElement('div', {
                    className: 'confirm-new-password',
                    style: {
                        alignSelf: 'stretch',
                        flexShrink: 0,
                        height: '60px',
                        position: 'static'
                    }
                },
                    React.createElement('div', {
                        className: 'confirm-new-password2',
                        style: {
                            color: '#333438',
                            textAlign: 'left',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            fontSize: '13px',
                            lineHeight: '16px',
                            fontWeight: '400',
                            position: 'absolute',
                            left: '0px',
                            top: '160px',
                            width: '400px',
                            height: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start'
                        }
                    }, 'Confirm New Password'),
                    React.createElement('input', {
                        type: 'password',
                        id: 'confirm-password',
                        value: formData.confirmPassword,
                        onChange: handleChange('confirmPassword'),
                        onKeyPress: handleKeyPress,
                        disabled: isLoading,
                        style: {
                            borderRadius: '8px',
                            borderStyle: 'solid',
                            borderColor: errors.confirmPassword ? '#dc2626' : '#e4e4e4',
                            borderWidth: '2px',
                            width: '400px',
                            height: '35px',
                            position: 'absolute',
                            left: '0px',
                            top: '185px',
                            padding: '0 10px',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            fontSize: '13px'
                        }
                    }),
                    errors.confirmPassword && React.createElement('div', {
                        style: {
                            color: '#dc2626',
                            fontSize: '12px',
                            fontFamily: 'SfPro-Regular, sans-serif',
                            position: 'absolute',
                            left: '0px',
                            top: '222px',
                            width: '400px'
                        }
                    }, errors.confirmPassword)
                ),

                // Confirmation Message
                React.createElement('div', {
                    className: 'please-confirm-that-your-new-password-is-correct',
                    style: {
                        color: '#333438',
                        textAlign: 'left',
                        fontFamily: 'SfPro-Semibold, sans-serif',
                        fontSize: '13px',
                        lineHeight: '16px',
                        fontWeight: '600',
                        position: 'absolute',
                        left: '0px',
                        top: '240px',
                        width: '400px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start'
                    }
                }, 'Please confirm that your new password is correct!!!'),

                // Submit Button
                React.createElement('button', {
                    className: 'login',
                    onClick: handleSubmit,
                    disabled: isLoading,
                    style: {
                        background: '#333438',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '0px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '400px',
                        height: '56.82px',
                        position: 'absolute',
                        left: '0px',
                        top: '280px',
                        cursor: 'pointer',
                        opacity: isLoading ? 0.6 : 1
                    }
                },
                    React.createElement('div', {
                        className: 'submit',
                        style: {
                            color: '#ffffff',
                            textAlign: 'center',
                            fontFamily: 'SfPro-Bold, sans-serif',
                            fontSize: '15px',
                            lineHeight: '16px',
                            fontWeight: '700',
                            position: 'relative',
                            width: '362px',
                            height: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }, isLoading ? 'Changing...' : 'Submit')
                ),

                // Cancel Button
                React.createElement('button', {
                    className: 'login2',
                    onClick: handleCancel,
                    disabled: isLoading,
                    style: {
                        background: '#e9e9e9',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '0px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '400px',
                        height: '56.82px',
                        position: 'absolute',
                        left: '0px',
                        top: '356.82px',
                        cursor: 'pointer'
                    }
                },
                    React.createElement('div', {
                        className: 'cancel',
                        style: {
                            color: '#000000',
                            textAlign: 'center',
                            fontFamily: 'SfPro-Bold, sans-serif',
                            fontSize: '15px',
                            lineHeight: '16px',
                            fontWeight: '700',
                            position: 'relative',
                            width: '362px',
                            height: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }, 'Cancel')
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
                        fontFamily: 'SfPro-Bold, sans-serif',
                        fontWeight: 700,
                        fontSize: '24px',
                        color: '#000000',
                        lineHeight: 'normal'
                    }
                }, modal.title),
                React.createElement('div', {
                    style: {
                        fontFamily: 'SfPro-Regular, sans-serif',
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
                            backgroundColor: '#333438',
                            color: '#ffffff',
                            fontFamily: 'SfPro-Bold, sans-serif',
                            fontWeight: 700,
                            fontSize: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        },
                        onMouseEnter: (e) => e.target.style.backgroundColor = '#555',
                        onMouseLeave: (e) => e.target.style.backgroundColor = '#333438',
                        onClick: handleModalOk
                    }, 'OK')
                )
            )
        )
    );
};

// Make available globally
window.TempChangePassword = TempChangePassword;