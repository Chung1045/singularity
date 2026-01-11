(function() {
// const { useState } = React;

// const TempUserProfile = ({userInfo}) => {


//     function handleSessionManagement() {
//         window.location.href = "/session"
//     }

//     function handlePasskeyManagement() {
//         window.location.href = "/passkeys"
//     }

//     function handleChangePassword() {
//         window.location.href = "/change-password"
//     }

//     return React.createElement('div', { className: 'flex flex-col gap-2.5 p-4 max-w-md mx-auto mt-8' },
//         React.createElement('h2', {}, "User Profile"),
//         React.createElement('p', {}, `@${userInfo.userName}`),
//         React.createElement('p', {}, `${userInfo.lastName} ${userInfo.firstName}`),
//         React.createElement('p', {}, `${userInfo.userEmail}`),
//         React.createElement('button', {
//             id: 'btn-logout',
//             onClick: handleSessionManagement,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Manage Sessions'),
//         React.createElement('button', {
//             id: 'btn-manageSessions',
//             onClick: handlePasskeyManagement,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Manage Passkeys'),
//         React.createElement('button', {
//             id: 'btn-changePassword',
//             onClick: handleChangePassword,
//             className: 'w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
//         }, 'Change Password')
//     );
// };

// // Make available globally
// window.TempUserProfile = TempUserProfile;

const { useState } = React;



const TempUserProfile = ({userInfo, csrfToken}) => {

    // const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    // Persist sidebar state in localStorage
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : true;
    });

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null });
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(() => {
        // Prioritize uploaded avatar, then Google avatar, then default
        return userInfo?.userAvatarPath || userInfo?.googleAvatarUrl || './img/size-48.svg';
    });
    const [avatarError, setAvatarError] = useState(false);
    const [googleAvatarError, setGoogleAvatarError] = useState(false);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth <= 480;

    // Define responsive breakpoints for MacBook compatibility
    const isSmallDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024 && window.innerWidth < 1440;

    // Handle avatar loading errors
    // Cascading fallback: uploaded avatar → Google avatar → default icon
    // If Google avatar also fails to fetch, fall back to default
    const handleAvatarError = () => {
        console.log('⚠️ Avatar image failed to load, checking for fallback options');
        const currentUrl = avatarUrl;

        // If currently showing uploaded avatar, try Google avatar next
        if (currentUrl === userInfo?.userAvatarPath) {
            setAvatarError(true);
            const fallbackUrl = userInfo?.googleAvatarUrl || './img/size-48.svg';
            console.log('📸 Falling back from uploaded avatar to:', fallbackUrl);
            setAvatarUrl(fallbackUrl);
        }
        // If currently showing Google avatar (or it failed), use default
        else if (currentUrl === userInfo?.googleAvatarUrl) {
            console.log('📸 Google avatar also failed, falling back to default icon');
            setGoogleAvatarError(true);
            setAvatarUrl('./img/size-48.svg');
        }
    };

    // Reset avatar error when userInfo changes
    React.useEffect(() => {
        setAvatarError(false);
        setGoogleAvatarError(false);
        setAvatarUrl(userInfo?.userAvatarPath || userInfo?.googleAvatarUrl || './img/size-48.svg');
    }, [userInfo]);

    console.log("Inside TempUserProfile component – userInfo:", userInfo);

    window.onload = async function () {
        await fetchProfilePics()
    }

    const showAlert = (title, message) => {
        setModal({ isOpen: true, title, message, type: 'alert', onConfirm: null, onCancel: null });
    };

    const showModal = (title, message, onConfirm, onCancel = null) => {
        setModal({ isOpen: true, title, message, type: 'confirm', onConfirm, onCancel });
    };

    const closeModal = () => {
        setModal({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, onCancel: null });
    };

    const handleModalConfirm = async () => {
        closeModal();
        if (modal.onConfirm) {
            await modal.onConfirm();
        }
    };

    const handleModalCancel = () => {
        closeModal();
        if (modal.onCancel) {
            modal.onCancel();
        }
    };

    async function fetchProfilePics(){
        let response = await fetch('/api/profile-pic/fetch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });

        let profileImgData = await response.json();

        console.log('Full response:', profileImgData);

        if (profileImgData.success) {
            console.log('Data:', profileImgData.data);

            const imageData = profileImgData.data[0]?.image;

            if (imageData) {
                document.getElementById('profile-avatar-image').src = imageData;

            } else {
                document.getElementById('profile-avatar-image').src = '';
            }
        }
    }

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showAlert('Invalid File Type', 'Please upload an image file (JPEG, PNG, GIF, or WebP)');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('File Too Large', 'Please upload an image smaller than 5MB');
            return;
        }

        setUploadingAvatar(true);

        const formData = new FormData();
        formData.append('file', file);  // Changed from 'profilePicture' to 'file'

        console.log('🔄 Starting avatar upload...', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });

        try {
            const response = await fetch('/api/profile-pic/replace', {  // Updated endpoint
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken  // Changed from 'X-CSRF-Token' to 'CSRF-Token'
                },
                body: formData
            });

            console.log('📡 Response status:', response.status);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('❌ Failed to parse response:', jsonError);
                throw new Error('Server returned invalid response');
            }

            console.log('📦 Response data:', data);

            if (data.success) {
                await fetchProfilePics();
                showAlert('Success', 'Profile picture updated successfully!');

                // Reload the page to show updated avatar
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                console.error('❌ Upload failed:', data.message);
                showAlert('Upload Failed', data.message || 'Failed to upload profile picture');
            }
        } catch (error) {
            console.error('❌ Error uploading avatar:', error);
            console.error('Error details:', error.message);
            showAlert('Upload Error', `An error occurred: ${error.message || 'Please try again'}`);
        } finally {
            setUploadingAvatar(false);
            // Clear the file input
            event.target.value = '';
        }
    };

    const triggerAvatarUpload = () => {
        document.getElementById('avatar-upload-input').click();
    };

    function handleSessionManagement() {
        window.location.href = "/session"
    }

    function handlePasskeyManagement() {
        window.location.href = "/passkeys"
    }

    function handleChangePassword() {
        window.location.href = "/change-password"
    }

    const getAccountType = () => {
    // Priority 1: Check if user has passkeys (this takes highest priority)
    if (userInfo?.hasPasskey) {
        return 'Passkey';
    }

    // Priority 2: Check if user type is Google OAuth
    if (userInfo?.userType === 'google') {
        return 'Google Sign-In';
    }

    // Priority 3: Default to Email login
    return 'Email login';
};

    const logout = async () => {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function(response) {
                showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.');
                setTimeout(() => {
                    window.location = "/login";
                }, 3000);
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || "An error occurred. Please try again.";
                showAlert('Error', errorMessage);
            }
        });
    };

    function handleProfileRoute() {
        window.location.href = "/profile";
    }

    function handleDeleteAccount() {
        showModal(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            () => {
                console.log("Delete account requested");
            }
        );
    }

    const toggleUserMenu = (e) => {
        e.stopPropagation();
        setUserMenuOpen(!userMenuOpen);
    };

    const username = userInfo?.userName || userInfo?.email || 'User';
    const displayName = userInfo?.firstName && userInfo?.lastName
        ? `${userInfo.firstName} ${userInfo.lastName}`
        : userInfo?.userName || 'User';

    return React.createElement('div', {
        className: 'sidebar-expand' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false),
        style: {
            display: 'flex',
            width: '100%',
            height: '100vh',
            overflow: 'hidden'
        }
    },
        React.createElement('div', {
            className: 'group',
            style: {
                display: 'flex',
                width: '100%',
                height: '100%'
            }
        },


            // Sidebar Component
            React.createElement(window.Sidebar, {
                sidebarCollapsed: sidebarCollapsed,
                setSidebarCollapsed: setSidebarCollapsed,
                username: username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen: userMenuOpen,
                setUserMenuOpen: setUserMenuOpen,
                userInfo: userInfo
            }),

              React.createElement("div", {
                style: {
                width: '5px',
                height: 'auto',
                backgroundColor: '#F7F7F7',
                borderRadius: '10px',
                flexShrink: 0,
                margin : '-5px'
                }
                }),

            // MAIN CONTENT AREA
            React.createElement('div', {
                style: {
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '36px 30px 40px 30px',
                    backgroundColor: '#ffffff',
                    overflowY: 'auto',
                    minHeight: '100vh',
                    width: `calc(100vw - ${sidebarCollapsed ? '65px' : '256px'})`,
                    transition: 'width 220ms ease'
                }
            },


                // Header
                React.createElement('div', {
                    style: {
                        fontSize: '24px',
                        fontWeight: '700',
                        fontFamily: 'SF Pro-Bold, Helvetica',
                        color: '#000000',
                        marginBottom: isSmallDesktop ? '80px' : '131px',
                        width: '147px',
                        height: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        letterSpacing: '0',
                        lineHeight: '20px'
                    }
                }, 'User Profile'),

                // Profile Container
                React.createElement('div', {
                    style: {
                        width: isSmallDesktop ? '400px' : '450px',
                        maxWidth: isSmallDesktop ? '500px' : '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: isSmallDesktop ? '25px' : '31px',
                        // marginLeft: isSmallDesktop ? '76px' : '30px'
                    }
                },
                    // Avatar Section
                    React.createElement('div', {
                        id: 'profile-avatar-section',
                        style: {
                            position: 'relative',
                            width: '163px',
                            height: '170px'
                        }
                    },
                        React.createElement('div', {
                            style: {
                                position: 'absolute',
                                top: '1px',
                                left: '0',
                                width: '153px',
                                height: '153px',
                                borderRadius: '76.5px',
                                backgroundColor: '#d9d9d9',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }
                        },
                            React.createElement('img', {
                                id: 'profile-avatar-image',
                                src: './img/user.svg',
                                alt: 'User',
                                onError: handleAvatarError,
                                style: {
                                    objectFit: 'cover',
                                    width: '100%'
                                }
                            })
                        ),
                        // Hidden file input
                        React.createElement('input', {
                            type: 'file',
                            id: 'avatar-upload-input',
                            accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
                            style: { display: 'none' },
                            onChange: handleAvatarUpload
                        }),
                        React.createElement('div', {
                            id: 'btn-edit-avatar',
                            style: {
                                position: 'absolute',
                                top: '140px',
                                left: '90px',
                                width: '73px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                padding: '10px',
                                backgroundColor: uploadingAvatar ? '#666666' : '#1c1d21',
                                borderRadius: '10px',
                                cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                                opacity: uploadingAvatar ? 0.6 : 1
                            },
                            onClick: uploadingAvatar ? null : triggerAvatarUpload
                        },
                            React.createElement('div', {
                                style: {
                                    position: 'relative',
                                    width: '18px',
                                    height: '19px',
                                    marginTop: '-4.67px',
                                    marginBottom: '-4.67px',
                                    marginLeft: '-4px'
                                }
                            },
                                React.createElement('img', {
                                    src: './img/Edit.svg',
                                    alt: '',
                                    style: {
                                        position: 'absolute',
                                        width: '83.84%',
                                        height: '83.84%',
                                        top: '5.20%',
                                        left: '5.56%'
                                    }
                                })
                            ),
                            React.createElement('span', {
                                style: {
                                    position: 'relative',
                                    width: 'fit-content',
                                    marginTop: '-6.17px',
                                    marginBottom: '-2.17px',
                                    fontFamily: 'SF Pro-Semibold, Helvetica',
                                    fontWeight: '400',
                                    color: '#ffffff',
                                    fontSize: '15px',
                                    letterSpacing: '0',
                                    lineHeight: 'normal',
                                    whiteSpace: 'nowrap'
                                }
                            }, uploadingAvatar ? 'Wait...' : 'Edit')
                        )
                    ),

                    // Profile Info Cards Container
                    React.createElement('div', {
                        id: 'profile-info-container',
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            width: isSmallDesktop ? '100%' : '433px',
                            maxWidth: isSmallDesktop ? '500px' : '100%',
                            alignItems: 'flex-start',
                            gap: '20px',
                            marginLeft: isSmallDesktop ? '-20px' : '-55px',
                            marginRight: isSmallDesktop ? '-20px' : '-55px'
                        }
                    },
                        // Info Card
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignSelf: 'stretch',
                                width: '100%',
                                position: 'relative',
                                backgroundColor: '#ffffff',
                                borderRadius: '10px'
                            }
                        },
                            // Username
                            React.createElement('div', {
                                id: 'profile-username-field',
                                style: {
                                    display: 'flex',
                                    height: '73px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Username'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    // }, `@${username}`)
                                    }, `${username}`)
                                ),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    // React.createElement('img', {
                                    //     src: './img/vector.svg',
                                    //     alt: '',
                                    //     style: {
                                    //         position: 'absolute',
                                    //         width: '75%',
                                    //         height: '75%',
                                    //         top: '12.50%',
                                    //         left: '12.50%'
                                    //     }
                                    // })
                                )
                            ),
                            // React.createElement('img', {
                            //     src: './img/vector-4.svg',
                            //     alt: '',
                            //     style: {
                            //         position: 'absolute',
                            //         top: '72px',
                            //         left: '0',
                            //         width: '412px',
                            //         height: '1px',
                            //         objectFit: 'cover'
                            //     }
                            // }),

                            React.createElement('hr', {
                                style: {
                                    margin: '0',
                                    border: 'none',
                                    borderTop: '1px solid #000000ff',
                                    width: '100%'
                                }
                            }),

                            // Display Name
                            React.createElement('div', {
                                id: 'profile-displayname-field',
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Display Name'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, displayName)
                                ),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    // React.createElement('img', {
                                    //     src: './img/image.svg',
                                    //     alt: '',
                                    //     style: {
                                    //         position: 'absolute',
                                    //         width: '75%',
                                    //         height: '75%',
                                    //         top: '12.50%',
                                    //         left: '12.50%'
                                    //     }
                                    // })
                                )
                            ),

                            // React.createElement('img', {
                            //     src: './img/vector-3.svg',
                            //     alt: '',
                            //     style: {
                            //         position: 'absolute',
                            //         top: '140px',
                            //         left: '0',
                            //         width: '412px',
                            //         height: '1px',
                            //         objectFit: 'cover'
                            //     }
                            // }),

                            React.createElement('hr', {
                                    style: {
                                    margin: '0',
                                    border: 'none',
                                    borderTop: '1px solid #000000ff',
                                    width: '100%'
                                }
                            }),

                            // Email
                            React.createElement('div', {
                                id: 'profile-email-field',
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: '600',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Email address'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, userInfo?.userEmail || userInfo?.email || 'email@example.com')
                                ),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    // React.createElement('img', {
                                    //     src: './img/edit_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                    //     alt: '',
                                    //     style: {
                                    //         position: 'absolute',
                                    //         width: '75%',
                                    //         height: '75%',
                                    //         top: '12.50%',
                                    //         left: '12.50%'
                                    //     }
                                    // })
                                )
                            ),
                            // React.createElement('img', {
                            //     src: './img/vector-2-2.svg',
                            //     alt: '',
                            //     style: {
                            //         position: 'absolute',
                            //         top: '208px',
                            //         left: '0',
                            //         width: '412px',
                            //         height: '1px',
                            //         objectFit: 'cover'
                            //     }
                            // }),

                            React.createElement('hr', {
                                style: {
                                    margin: '0',
                                    border: 'none',
                                    borderTop: '1px solid #000000ff',
                                    width: '100%'
                                }
                            }),

                            // Account Type
                            React.createElement('div', {
                                id: 'profile-accounttype-field',
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '10px 20px',
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Account Type'),
                                    React.createElement('div', {
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: '16px',
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, getAccountType())
                                )
                            )
                        ),

                        // Actions Card
                        React.createElement('div', {
                            id: 'profile-actions-container',
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignSelf: 'stretch',
                                width: '100%',
                                backgroundColor: '#ffffff',
                                borderRadius: '10px'
                            }
                        },
                            // Change Password
                            React.createElement('div', {
                                id: 'btn-change-password',
                                onClick: handleChangePassword,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Change Password'),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        src: './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                        alt: '',
                                        style: {
                                            position: 'absolute',
                                            width: '24px',
                                            height: '24px',
                                            top: '8.33%',
                                            left: '26.04%'
                                        }
                                    })
                                )
                            ),
                            // Manage Passkeys
                            React.createElement('div', {
                                id: 'btn-manage-passkeys',
                                onClick: handlePasskeyManagement,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Manage Passkeys'),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        src: './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                        alt: '',
                                        style: {
                                            position: 'absolute',
                                            width: '24px',
                                            height: '24px',
                                            top: '8.33%',
                                            left: '26.04%'
                                        }
                                    })
                                )
                            ),
                            // Manage Sessions
                            React.createElement('div', {
                                id: 'btn-manage-sessions',
                                onClick: handleSessionManagement,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Manage Login Sessions'),
                                React.createElement('div', {
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        src: './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg',
                                        alt: '',
                                        style: {
                                            position: 'absolute',
                                            width: '24px',
                                            height: '24px',
                                            top: '8.33%',
                                            left: '26.04%'
                                        }
                                    })
                                )
                            ),
                            // Delete Account
                            React.createElement('div', {
                                id: 'btn-delete-account',
                                onClick: handleDeleteAccount,
                                style: {
                                    display: 'flex',
                                    height: '50px',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#b62e2e',
                                        fontSize: '20px',
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Delete Account')
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
                    if (e.target === e.currentTarget && modal.type === 'alert') {
                        closeModal();
                    }
                }
            },
                React.createElement('div', {
                    style: {
                        backgroundColor: '#ffffff',
                        borderRadius: '15px',
                        padding: isMobile ? '25px' : '30px',
                        maxWidth: isMobile ? '90%' : '500px',
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
                            fontFamily: 'Urbanist, Helvetica',
                            fontWeight: 700,
                            fontSize: isMobile ? '20px' : '24px',
                            color: '#000000',
                            lineHeight: 'normal'
                        }
                    }, modal.title),
                    React.createElement('div', {
                        style: {
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: 400,
                            fontSize: isMobile ? '14px' : '16px',
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
                        modal.type === 'confirm' && React.createElement('button', {
                            style: {
                                padding: isMobile ? '10px 20px' : '12px 24px',
                                borderRadius: '10px',
                                border: '1px solid #e0e0e0',
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 600,
                                fontSize: isMobile ? '14px' : '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#f5f5f5',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#ffffff',
                            onClick: handleModalCancel
                        }, 'Cancel'),
                        React.createElement('button', {
                            style: {
                                padding: isMobile ? '10px 20px' : '12px 24px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                fontFamily: 'Urbanist, Helvetica',
                                fontWeight: 600,
                                fontSize: isMobile ? '14px' : '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            },
                            onMouseEnter: (e) => e.target.style.backgroundColor = '#333333',
                            onMouseLeave: (e) => e.target.style.backgroundColor = '#000000',
                            onClick: modal.type === 'confirm' ? handleModalConfirm : closeModal
                        }, modal.type === 'confirm' ? 'Confirm' : 'OK')
                    )
                )
            )
        )
    );
};

// Make available globally
window.TempUserProfile = TempUserProfile;

})();
