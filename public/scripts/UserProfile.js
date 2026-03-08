(function() {
const { useState } = React;
const UserProfile = ({userInfo, csrfToken}) => {
    window.csrfToken = csrfToken;
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
    const [avatarLoading, setAvatarLoading] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState(() => {
        // Prioritize uploaded avatar, then Google avatar, then default
        return userInfo?.userAvatarPath || userInfo?.googleAvatarUrl || './img/size-48.svg';
    });
    const [avatarError, setAvatarError] = useState(false);
    const [googleAvatarError, setGoogleAvatarError] = useState(false);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);

    React.useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth <= 480;

    // Define responsive breakpoints for MacBook compatibility
    const isSmallDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024 && window.innerWidth < 1440;
    const isCompactHeight = windowHeight <= 920;
    const isCompactWidth = windowWidth <= 1280;
    const isCompactProfile = isCompactWidth || isCompactHeight;
    const shouldScrollProfile = isMobile || windowHeight <= 820 || (isCompactWidth && windowHeight <= 900);

    const mainContentPadding = shouldScrollProfile ? '20px 20px 16px 20px' : '26px 30px 40px 30px';
    const profileTitleFontSize = isMobile ? '20px' : (isCompactProfile ? '22px' : '24px');
    const profileTitleLineHeight = isMobile ? '20px' : (isCompactProfile ? '22px' : '24px');
    const profileTitleBottomMargin = shouldScrollProfile ? '14px' : (isCompactProfile ? '28px' : (isSmallDesktop ? '56px' : '96px'));
    const profileContainerMaxWidth = isCompactProfile ? '420px' : (isSmallDesktop ? '500px' : '450px');
    const profileSectionGap = shouldScrollProfile ? '14px' : (isCompactProfile ? '18px' : (isSmallDesktop ? '24px' : '28px'));
    const cardGap = isCompactProfile ? '10px' : '20px';
    const fieldPadding = isCompactProfile ? '8px 16px' : '10px 20px';
    const fieldTallRowHeight = isCompactProfile ? '60px' : '73px';
    const fieldTextGap = isCompactProfile ? '6px' : '10px';
    const fieldLabelFontSize = isMobile ? '13px' : (isCompactProfile ? '14px' : '16px');
    const fieldValueFontSize = isMobile ? '13px' : (isCompactProfile ? '14px' : '16px');
    const avatarSectionWidth = isCompactProfile ? '146px' : '163px';
    const avatarSectionHeight = isCompactProfile ? '150px' : '170px';
    const avatarImageSize = isCompactProfile ? '136px' : '153px';
    const avatarButtonTop = isCompactProfile ? '122px' : '140px';
    const avatarButtonLeft = isCompactProfile ? '73px' : '90px';
    const avatarButtonWidth = isCompactProfile ? '62px' : '73px';
    const avatarButtonHeight = isCompactProfile ? '28px' : '30px';
    const avatarButtonTextSize = isCompactProfile ? '13px' : '15px';
    const actionRowHeight = isMobile ? '40px' : (isCompactProfile ? '44px' : '50px');
    const actionPadding = isMobile ? '10px 12px' : (isCompactProfile ? '12px 16px' : '20px');
    const actionTextFontSize = isMobile ? '16px' : (isCompactProfile ? '18px' : '20px');
    const actionGap = isCompactProfile ? '12px' : '15px';

    // Handle avatar loading errors
    // Cascading fallback: uploaded avatar → Google avatar → default icon
    // If Google avatar also fails to fetch, fall back to default
    const handleAvatarError = () => {
        console.log(' Avatar image failed to load, checking for fallback options');
        const currentUrl = avatarUrl;

        // If currently showing uploaded avatar, try Google avatar next
        if (currentUrl === userInfo?.userAvatarPath) {
            setAvatarError(true);
            const fallbackUrl = userInfo?.googleAvatarUrl || './img/size-48.svg';
            console.log(' Falling back from uploaded avatar to:', fallbackUrl);
            setAvatarUrl(fallbackUrl);
        }
        // If currently showing Google avatar (or it failed), use default
        else if (currentUrl === userInfo?.googleAvatarUrl) {
            console.log(' Google avatar also failed, falling back to default icon');
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
        try {
            let response = await fetch('/api/profile-pic/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({})
            });

            let profileImgData = await response.json();

            console.log('Full response:', profileImgData);

            if (profileImgData.success) {
                console.log('Data:', profileImgData.data);

                const imageData = profileImgData.data[0]?.image;
                if (imageData) {
                    setAvatarUrl(imageData);
                }
            }
        } finally {
            setAvatarLoading(false);
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
        formData.append('file', file);

        console.log(' Starting avatar upload...', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });

        try {
            const response = await fetch('/api/profile-pic/replace', {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken
                },
                body: formData
            });

            console.log(' Response status:', response.status);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error(' Failed to parse response:', jsonError);
                throw new Error('Server returned invalid response');
            }

            console.log(' Response data:', data);

            if (data.success) {
                await fetchProfilePics();
                showAlert('Success', 'Profile picture updated successfully!');

                // Reload the page to show updated avatar
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                console.error(' Upload failed:', data.message);
                showAlert('Upload Failed', data.message || 'Failed to upload profile picture');
            }
        } catch (error) {
            console.error(' Error uploading avatar:', error);
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

    function handleSupport() {
        window.location.href = "/support"
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
                    window.location = "/?loggedout=1";
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
            async () => {
                try {
                    const response = await fetch('/api/account/delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': window.csrfToken
                        },
                        body: JSON.stringify({})
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(
                            "Account Deleted Successfully",
                            "You will be redirect to login page shortly"
                            )

                        setTimeout(() => {
                            window.location.href = "/login";
                        }, 10000)

                    } else {
                        showAlert(
                            "Error",
                            "There are some problem trying to delete your account, please try again later, or contact support for assistance",
                        );
                    }

                } catch (error) {
                    console.error('Delete account error:', error);
                    showAlert(
                        "Error",
                        "Something went wrong while trying to delete your account, please try again later, or contact support for assistance",
                    );
                }
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
        id: 'profile-page-wrapper',
        style: {
            display: 'flex',
            width: '100%',
            height: '100vh',
            overflow: 'hidden'
        }
    },
        React.createElement('div', {
            id: 'profile-page-container',
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
                  id: 'divider',
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
            React.createElement('div', {                    id: 'main-content-area',
                    id: 'main-content-area',

                    style: {
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    // Match sidebar nav top padding so page title aligns with sidebar logo row.
                    padding: mainContentPadding,
                    backgroundColor: '#ffffff',
                    overflowX: 'hidden',
                    overflowY: shouldScrollProfile ? 'auto' : 'hidden',
                    minHeight: 0,
                    width: `calc(100vw - ${sidebarCollapsed ? '65px' : '256px'})`,
                    transition: 'width 220ms ease'
                }
            },


                // Header
                React.createElement('div', {
                    id: 'profile-header',
                    style: {
                        fontSize: profileTitleFontSize,
                        fontWeight: '700',
                        fontFamily: 'SF Pro-Bold, Helvetica',
                        color: '#000000',
                        marginBottom: profileTitleBottomMargin,
                        width: 'auto',
                        minHeight: profileTitleLineHeight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        letterSpacing: '0',
                        lineHeight: profileTitleLineHeight,
                        marginTop: isCompactProfile ? '5px' : '2px'
                    }
                }, 'User Profile'),

                // Profile Container
                React.createElement('div', {
                        id: 'profile-container',

                        style: {
                        width: '100%',
                        maxWidth: profileContainerMaxWidth,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: profileSectionGap,
                        // marginLeft: isSmallDesktop ? '76px' : '30px'
                    }
                },
                    // Avatar Section
                    React.createElement('div', {
                        id: 'profile-avatar-section',
                        style: {
                            position: 'relative',
                            width: avatarSectionWidth,
                            height: avatarSectionHeight
                        }
                    },
                        React.createElement('div', {
                                id: 'profile-avatar-wrapper',
                            style: {

                                position: 'absolute',
                                top: '1px',
                                left: '0',
                                width: avatarImageSize,
                                height: avatarImageSize,
                                borderRadius: '76.5px',
                                backgroundColor: '#d9d9d9',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }
                        },
                            avatarLoading
                                ? React.createElement('div', {
                                    className: 'sk-box',
                                    style: { width: '100%', height: '100%', borderRadius: '50%', position: 'absolute', inset: 0 }
                                  })
                                : React.createElement('img', {
                                    id: 'profile-avatar-image',
                                    src: avatarUrl || './img/user.svg',
                                    alt: 'User',
                                    onError: handleAvatarError,
                                    style: { objectFit: 'cover', width: '100%' }
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
                                top: avatarButtonTop,
                                left: avatarButtonLeft,
                                width: avatarButtonWidth,
                                height: avatarButtonHeight,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: isCompactProfile ? '8px' : '10px',
                                padding: isCompactProfile ? '8px' : '10px',
                                backgroundColor: uploadingAvatar ? '#666666' : '#1c1d21',
                                borderRadius: '10px',
                                cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                                opacity: uploadingAvatar ? 0.6 : 1
                            },
                            onClick: uploadingAvatar ? null : triggerAvatarUpload
                        },
                            React.createElement('div', {
                                id: 'edit-icon-container',
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
                                    id: 'edit-icon-image',
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
                                id: 'edit-avatar-text',
                                style: {
                                    position: 'relative',
                                    width: 'fit-content',
                                    marginTop: '-6.17px',
                                    marginBottom: '-2.17px',
                                    fontFamily: 'SF Pro-Semibold, Helvetica',
                                    fontWeight: '400',
                                    color: '#ffffff',
                                    fontSize: avatarButtonTextSize,
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
                            width: '100%',
                            maxWidth: isCompactProfile ? '420px' : '433px',
                            alignItems: 'flex-start',
                            gap: cardGap,
                            marginLeft: isCompactProfile ? '0' : (isSmallDesktop ? '-20px' : '-55px'),
                            marginRight: isCompactProfile ? '0' : (isSmallDesktop ? '-20px' : '-55px')
                        }
                    },
                        // Info Card
                        React.createElement('div', {
                            id: 'profile-info-card',
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
                                    height: fieldTallRowHeight,
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: fieldPadding,
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'username-text-container',
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: fieldTextGap,
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                       id: 'username-label',
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: fieldLabelFontSize,
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Username'),
                                    React.createElement('div', {
                                        id: 'username-value',
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: fieldValueFontSize,
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    // }, `@${username}`)
                                    }, `${username}`)
                                ),
                                React.createElement('div', {
                                    id: 'username-icon-container',
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
                                id: 'divider-username-displayname',
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
                                    padding: fieldPadding,
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'displayname-text-container',
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: fieldTextGap,
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        id: 'displayname-label',
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: fieldLabelFontSize,
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Display Name'),
                                    React.createElement('div', {
                                        id: 'displayname-value',
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: fieldValueFontSize,
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, displayName)
                                ),
                                React.createElement('div', {
                                    id: 'displayname-icon-container',
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
                                id: 'divider-displayname-email',
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
                                    padding: fieldPadding,
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'email-text-container',
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: fieldTextGap,
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        id: 'email-label',
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: '600',
                                            color: '#000000',
                                            fontSize: fieldLabelFontSize,
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Email address'),
                                    React.createElement('div', {
                                        id: 'email-value',
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: fieldValueFontSize,
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, userInfo?.userEmail || userInfo?.email || 'email@example.com')
                                ),
                                React.createElement('div', {
                                    id: 'email-icon-container',
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
                                id: 'divider-email-accounttype',
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
                                    padding: fieldPadding,
                                    borderRadius: '10px'
                                }
                            },
                                React.createElement('div', {
                                    id: 'accounttype-text-container',
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: fieldTextGap,
                                        flex: '1'
                                    }
                                },
                                    React.createElement('div', {
                                        id: 'accounttype-label',
                                        style: {
                                            fontFamily: 'SF Pro-Semibold, Helvetica',
                                            fontWeight: 'bold',
                                            color: '#000000',
                                            fontSize: fieldLabelFontSize,
                                            letterSpacing: '0',
                                            lineHeight: 'normal'
                                        }
                                    }, 'Account Type'),
                                    React.createElement('div', {
                                        id: 'accounttype-value',
                                        style: {
                                            fontFamily: 'SF Pro-Regular, Helvetica',
                                            fontWeight: '400',
                                            color: '#000000',
                                            fontSize: fieldValueFontSize,
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
                                    height: actionRowHeight,
                                    alignItems: 'center',
                                    gap: actionGap,
                                    padding: actionPadding,
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    id: 'change-password-text',
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: actionTextFontSize,
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Change Password'),
                                React.createElement('div', {
                                    id: 'change-password-icon-container',
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        id: 'change-password-icon-image',
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
                                    height: actionRowHeight,
                                    alignItems: 'center',
                                    gap: actionGap,
                                    padding: actionPadding,
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
                                        fontSize: actionTextFontSize,
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Manage Passkeys'),
                                React.createElement('div', {
                                    id: 'manage-passkeys-icon-container',
                                    style: {

                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        id: 'manage-passkeys-icon-image',
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
                                    height: actionRowHeight,
                                    alignItems: 'center',
                                    gap: actionGap,
                                    padding: actionPadding,
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
                                        fontSize: actionTextFontSize,
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Manage Login Sessions'),
                                React.createElement('div', {
                                    id: 'manage-sessions-icon-container',
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative'
                                    }
                                },
                                    React.createElement('img', {
                                        id: 'manage-sessions-icon-image',
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
                            // Support Option
                            React.createElement('div', {
                                    id: 'btn-support',
                                    onClick: handleSupport,
                                    style: {
                                        display: 'flex',
                                        height: actionRowHeight,
                                        alignItems: 'center',
                                        gap: actionGap,
                                        padding: actionPadding,
                                        borderRadius: '10px',
                                        cursor: 'pointer'
                                    }
                                },
                                React.createElement('div', {
                                    id: 'support-text',
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#000000',
                                        fontSize: actionTextFontSize,
                                        letterSpacing: '0',
                                        lineHeight: 'normal'
                                    }
                                }, 'Support'),
                                React.createElement('div', {
                                        id: 'change-password-icon-container',
                                        style: {
                                            width: '24px',
                                            height: '24px',
                                            position: 'relative'
                                        }
                                    },
                                    React.createElement('img', {
                                        id: 'change-password-icon-image',
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
                                    height: actionRowHeight,
                                    alignItems: 'center',
                                    gap: actionGap,
                                    padding: actionPadding,
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }
                            },
                                React.createElement('div', {
                                    id: 'delete-account-text',
                                    style: {
                                        flex: '1',
                                        fontFamily: 'SF Pro-Semibold, Helvetica',
                                        fontWeight: 'bold',
                                        color: '#b62e2e',
                                        fontSize: actionTextFontSize,
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
                id: 'custom-modal-overlay',
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
                    if (e.target === e.currentTarget && modal.type === 'alert') {
                        closeModal();
                    }
                }
            },
                React.createElement('div', {
                    id: 'custom-modal-content',
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
                        id: 'custom-modal-title',
                        style: {
                            fontFamily: 'Urbanist, Helvetica',
                            fontWeight: 700,
                            fontSize: isMobile ? '20px' : '24px',
                            color: '#000000',
                            lineHeight: 'normal'
                        }
                    }, modal.title),
                    React.createElement('div', {
                        id: 'custom-modal-message',
                        style: {
                            fontFamily: 'Inter, Helvetica',
                            fontWeight: 400,
                            fontSize: isMobile ? '14px' : '16px',
                            color: '#000000',
                            lineHeight: '1.5'
                        }
                    }, modal.message),
                    React.createElement('div', {
                        id: 'custom-modal-buttons',
                        style: {
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end',
                            marginTop: '10px'
                        }
                    },
                        modal.type === 'confirm' && React.createElement('button', {
                            id: 'custom-modal-cancel-button',
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
                            id: 'custom-modal-confirm-button',
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
window.UserProfile = UserProfile;

})();
