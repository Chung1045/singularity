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
                            borderColor: '#e4e4e4',
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
                    })
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
                            borderColor: '#e4e4e4',
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
                    })
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
                            borderColor: '#e4e4e4',
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
                    })
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
        )
    );
};

// Make available globally
window.TempChangePassword = TempChangePassword;