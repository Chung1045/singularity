(function () {
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const reactCreateElm = React.createElement;

const DEFAULT_AVATAR = './img/size-48.svg';
const CHEVRON_ICON = './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg';
const EDIT_ICON = './img/Edit.svg';

function readStoredBoolean(key, fallbackValue) {
    try {
        const saved = localStorage.getItem(key);
        return saved !== null ? JSON.parse(saved) : fallbackValue;
    } catch (error) {
        console.error('Failed to parse localStorage value for', key, error);
        return fallbackValue;
    }
}

function getProfileUser(userInfo) {
    if (Array.isArray(userInfo)) {
        return userInfo[0] || {};
    }

    return userInfo || {};
}

function DetailRow({ label, value }) {
    return reactCreateElm(
        'div',
        { className: 'profile-detail-row' },
        reactCreateElm('div', { className: 'profile-detail-label' }, label),
        reactCreateElm('div', { className: 'profile-detail-value' }, value)
        );
}

function ActionRow({ title, description, onClick }) {
    return reactCreateElm(
        'button',
        {
            type: 'button',
            className: 'profile-action-row',
            onClick
        },
        reactCreateElm(
            'div',
            { className: 'profile-action-copy' },
            reactCreateElm('div', { className: 'profile-action-title' }, title),
            reactCreateElm('div', { className: 'profile-action-description' }, description)
        ),
        reactCreateElm(
            'div',
            {
                className: 'profile-action-icon',
                'aria-hidden': true
            },
            reactCreateElm('img', {
                className: 'profile-action-icon-image',
                src: CHEVRON_ICON,
                alt: ''
            })
        )
    );
}

function ProfileModal({ modal, onClose, onConfirm, onCancel }) {
    if (!modal.isOpen) {
        return null;
    }

    return reactCreateElm(
        'div',
        {
            className: 'profile-modal-overlay',
            onClick: (event) => {
                if (event.target === event.currentTarget && modal.type === 'alert') {
                    onClose();
                }
            }
        },
        reactCreateElm(
            'div',
            {
                className: 'profile-modal-card',
                onClick: (event) => event.stopPropagation()
            },
            reactCreateElm('h2', { className: 'profile-modal-title' }, modal.title),
            reactCreateElm('p', { className: 'profile-modal-message' }, modal.message),
            reactCreateElm(
                'div',
                { className: 'profile-modal-actions' },
                modal.type === 'confirm' && reactCreateElm(
                    'button',
                    {
                        type: 'button',
                        className: 'profile-modal-button profile-modal-button--secondary',
                        onClick: onCancel
                    },
                    'Cancel'
                ),
                reactCreateElm(
                    'button',
                    {
                        type: 'button',
                        className: 'profile-modal-button profile-modal-button--primary',
                        onClick: modal.type === 'confirm' ? onConfirm : onClose
                    },
                    modal.type === 'confirm' ? 'Confirm' : 'OK'
                )
            )
        )
    );
}

const UserProfile = ({ userInfo, csrfToken }) => {
    window.csrfToken = csrfToken;

    const profileUser = getProfileUser(userInfo);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
        readStoredBoolean('sidebarCollapsed', window.innerWidth <= 1040)
    );
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: null,
        onCancel: null
    });
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState(
        profileUser.userAvatarPath || profileUser.googleAvatarUrl || DEFAULT_AVATAR
    );
    const [overviewLayout, setOverviewLayout] = useState(null);
    const overviewSlotRef = useRef(null);
    const overviewCardRef = useRef(null);

    const isOverlay = windowWidth <= 1040;
    const shouldFixOverviewCard = windowWidth > 900 && !isOverlay;

    useEffect(() => {
        let rafId = 0;

        const handleResize = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                setWindowWidtreactCreateElm(window.innerWidth);
            });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(rafId);
        };
    }, []);

    useEffect(() => {
        if (isOverlay) {
            setSidebarCollapsed(true);
        } else {
            setSidebarCollapsed(readStoredBoolean('sidebarCollapsed', false));
        }
    }, [isOverlay]);

    useEffect(() => {
        setAvatarUrl(profileUser.userAvatarPath || profileUser.googleAvatarUrl || DEFAULT_AVATAR);
    }, [profileUser.googleAvatarUrl, profileUser.userAvatarPath]);

    const username = profileUser.userName || profileUser.email || 'User';
    const displayName = profileUser.firstName && profileUser.lastName
        ? `${profileUser.firstName} ${profileUser.lastName}`
        : profileUser.displayName || profileUser.userName || profileUser.email || 'User';
    const email = profileUser.userEmail || profileUser.email || 'No email available';
    const profileHandle = profileUser.userName ? `@${profileUser.userName}` : email;

    const accountType = useMemo(() => {
        if (profileUser.hasPasskey) {
            return 'Passkey';
        }

        if (profileUser.userType === 'google') {
            return 'Google Sign-In';
        }

        return 'Email login';
    }, [profileUser.hasPasskey, profileUser.userType]);

    const accessMethod = useMemo(() => {
        if (profileUser.hasPasskey) {
            return 'Passkey enabled';
        }

        if (profileUser.userType === 'google') {
            return 'OAuth access';
        }

        return 'Password access';
    }, [profileUser.hasPasskey, profileUser.userType]);

    const fetchProfilePics = useCallback(async () => {
        if (!csrfToken) {
            setAvatarLoading(false);
            return;
        }

        setAvatarLoading(true);

        try {
            const response = await fetcreactCreateElm('/api/profile-pic/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({})
            });

            const profileImgData = await response.json();
            const imageData = profileImgData?.data?.[0]?.image;

            if (profileImgData?.success && imageData) {
                setAvatarUrl(imageData);
                window.userAvatarUrl = imageData;
            }
        } catch (error) {
            console.error('Error fetching profile picture:', error);
        } finally {
            setAvatarLoading(false);
        }
    }, [csrfToken]);

    useEffect(() => {
        fetchProfilePics();
    }, [fetchProfilePics]);

    useEffect(() => {
        if (!shouldFixOverviewCard) {
            setOverviewLayout(null);
            return;
        }

        let rafId = 0;

        const updateOverviewLayout = () => {
            if (!overviewSlotRef.current || !overviewCardRef.current) {
                return;
            }

            const slotRect = overviewSlotRef.current.getBoundingClientRect();
            const cardRect = overviewCardRef.current.getBoundingClientRect();

            setOverviewLayout(() => ({
                left: slotRect.left,
                width: slotRect.width,
                height: cardRect.height
            }));
        };

        rafId = requestAnimationFrame(updateOverviewLayout);
        window.addEventListener('resize', updateOverviewLayout);
        window.addEventListener('sidebarResized', updateOverviewLayout);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateOverviewLayout);
            window.removeEventListener('sidebarResized', updateOverviewLayout);
        };
    }, [shouldFixOverviewCard, sidebarCollapsed]);

    const showAlert = (title, message) => {
        setModal({
            isOpen: true,
            title,
            message,
            type: 'alert',
            onConfirm: null,
            onCancel: null
        });
    };

    const showModal = (title, message, onConfirm, onCancel) => {
        setModal({
            isOpen: true,
            title,
            message,
            type: 'confirm',
            onConfirm,
            onCancel: onCancel || null
        });
    };

    const closeModal = () => {
        setModal({
            isOpen: false,
            title: '',
            message: '',
            type: 'confirm',
            onConfirm: null,
            onCancel: null
        });
    };

    const handleModalConfirm = async () => {
        const confirmAction = modal.onConfirm;
        closeModal();

        if (confirmAction) {
            await confirmAction();
        }
    };

    const handleModalCancel = () => {
        const cancelAction = modal.onCancel;
        closeModal();

        if (cancelAction) {
            cancelAction();
        }
    };

    const handleAvatarError = () => {
        if (avatarUrl === profileUser.userAvatarPath && profileUser.googleAvatarUrl) {
            setAvatarUrl(profileUser.googleAvatarUrl);
            return;
        }

        if (avatarUrl !== DEFAULT_AVATAR) {
            setAvatarUrl(DEFAULT_AVATAR);
            return;
        }

        setAvatarLoading(false);
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showAlert('Invalid File Type', 'Please upload an image file in JPEG, PNG, GIF, or WebP format.');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAlert('File Too Large', 'Please upload an image smaller than 5MB.');
            event.target.value = '';
            return;
        }

        setUploadingAvatar(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetcreactCreateElm('/api/profile-pic/replace', {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken
                },
                body: formData
            });

            let data;
            try {
                data = await response.json();
            } catch (error) {
                throw new Error('Server returned an invalid response.');
            }

            if (response.ok && data.success) {
                await fetchProfilePics();
                showAlert('Success', 'Profile picture updated successfully.');
                setTimeout(() => {
                    window.location.reload();
                }, 1200);
            } else {
                showAlert('Upload Failed', data.message || 'Failed to upload profile picture.');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showAlert('Upload Error', error.message || 'An error occurred while uploading your image.');
        } finally {
            setUploadingAvatar(false);
            event.target.value = '';
        }
    };

    const triggerAvatarUpload = () => {
        const input = document.getElementById('avatar-upload-input');
        if (input) {
            input.click();
        }
    };

    const handleSessionManagement = () => {
        window.location.href = '/session';
    };

    const handlePasskeyManagement = () => {
        window.location.href = '/passkeys';
    };

    const handleChangePassword = () => {
        window.location.href = '/change-password';
    };

    const handleSupport = () => {
        window.location.href = '/support';
    };

    const logout = async () => {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken,
                'X-CSRF-Token': csrfToken
            },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function () {
                showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.');
                setTimeout(() => {
                    window.location = '/?loggedout=1';
                }, 3000);
            },
            error: function (xhr) {
                const errorMessage = xhr.responseJSON?.message || 'An error occurred. Please try again.';
                showAlert('Error', errorMessage);
            }
        });
    };

    const handleProfileRoute = () => {
        window.location.href = '/profile';
    };

    const handleDeleteAccount = () => {
        showModal(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            async () => {
                try {
                    const response = await fetcreactCreateElm('/api/account/delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken
                        },
                        body: JSON.stringify({})
                    });

                    const result = await response.json();

                    if (result.success) {
                        showAlert(
                            'Account Deleted Successfully',
                            'You will be redirected to the login page shortly.'
                        );

                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 10000);
                    } else {
                        showAlert(
                            'Error',
                            'There was a problem deleting your account. Please try again later or contact support.'
                        );
                    }
                } catch (error) {
                    console.error('Delete account error:', error);
                    showAlert(
                        'Error',
                        'Something went wrong while trying to delete your account. Please try again later or contact support.'
                    );
                }
            }
        );
    };

    const detailItems = [
        { label: 'Username', value: username },
        { label: 'Display Name', value: displayName },
        { label: 'Email Address', value: email },
        { label: 'Account Type', value: accountType }
    ];

    const actionItems = [
        {
            title: 'Change Password',
            description: 'Update your password or continue account setup for password-based sign-in.',
            onClick: handleChangePassword
        },
        {
            title: 'Manage Passkeys',
            description: 'Review and update the passkeys linked to this account.',
            onClick: handlePasskeyManagement
        },
        {
            title: 'Manage Login Sessions',
            description: 'See where you are logged in and remove sessions you no longer trust.',
            onClick: handleSessionManagement
        },
        {
            title: 'Support',
            description: 'Open help and support resources for account-related issues.',
            onClick: handleSupport
        }
    ];

    return reactCreateElm(
        'div',
        {
            className: 'sidebar-expand profile-shell' + (sidebarCollapsed ? ' collapsed' : ''),
            onClick: () => setUserMenuOpen(false)
        },
        reactCreateElm(
            'div',
            { className: 'group profile-layout' },
            isOverlay && !sidebarCollapsed && reactCreateElm('div', {
                className: 'profile-sidebar-backdrop',
                onClick: () => setSidebarCollapsed(true)
            }),
            reactCreateElm(window.Sidebar, {
                sidebarCollapsed: sidebarCollapsed,
                setSidebarCollapsed: setSidebarCollapsed,
                isOverlay: isOverlay,
                username: username,
                onLogout: logout,
                onProfileRoute: handleProfileRoute,
                userMenuOpen: userMenuOpen,
                setUserMenuOpen: setUserMenuOpen,
                userInfo: profileUser
            }),
            reactCreateElm(
                'main',
                { className: 'right-container profile-right-container' },
                reactCreateElm(
                    'section',
                    { className: 'main-screen profile-main-screen' },
                    reactCreateElm(
                        'div',
                        { className: 'profile-scroll-region' },
                        reactCreateElm(
                            'header',
                            { className: 'profile-page-header' },
                            reactCreateElm('div', { className: 'profile-page-eyebrow' }, 'Account'),
                            reactCreateElm('h1', { className: 'profile-page-title' }, 'User Profile'),
                            reactCreateElm(
                                'p',
                                { className: 'profile-page-copy' },
                                'Manage your account details, sign-in methods, active sessions, and support from one page.'
                            )
                        ),
                        reactCreateElm(
                            'div',
                            { className: 'profile-content-grid' },
                            reactCreateElm(
                                'div',
                                {
                                    className: 'profile-overview-slot',
                                    ref: overviewSlotRef,
                                    style: shouldFixOverviewCard && overviewLayout
                                        ? { minHeight: `${overviewLayout.height}px` }
                                        : undefined
                                },
                                reactCreateElm(
                                    'section',
                                    {
                                        className: 'profile-card profile-overview-card' + (shouldFixOverviewCard && overviewLayout ? ' profile-overview-card--fixed' : ''),
                                        ref: overviewCardRef,
                                        style: shouldFixOverviewCard && overviewLayout ? {
                                            left: `${overviewLayout.left}px`,
                                            width: `${overviewLayout.width}px`
                                        } : undefined
                                    },
                                    reactCreateElm(
                                        'div',
                                        { className: 'profile-overview-top' },
                                        reactCreateElm(
                                            'div',
                                            { className: 'profile-avatar-block' },
                                            reactCreateElm(
                                                'div',
                                                { className: 'profile-avatar-frame' },
                                                avatarLoading
                                                    ? reactCreateElm('div', {
                                                        className: 'sk-box',
                                                        style: {
                                                            width: '100%',
                                                            height: '100%',
                                                            borderRadius: '50%'
                                                        }
                                                    })
                                                    : reactCreateElm('img', {
                                                        className: 'profile-avatar-image',
                                                        src: avatarUrl || DEFAULT_AVATAR,
                                                        alt: 'User avatar',
                                                        onError: handleAvatarError
                                                    })
                                            ),
                                            reactCreateElm('input', {
                                                id: 'avatar-upload-input',
                                                type: 'file',
                                                accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
                                                style: { display: 'none' },
                                                onChange: handleAvatarUpload
                                            }),
                                            reactCreateElm(
                                                'button',
                                                {
                                                    type: 'button',
                                                    className: 'profile-avatar-button' + (uploadingAvatar ? ' is-busy' : ''),
                                                    onClick: uploadingAvatar ? null : triggerAvatarUpload,
                                                    disabled: uploadingAvatar
                                                },
                                                reactCreateElm('img', {
                                                    className: 'profile-avatar-button-icon',
                                                    src: EDIT_ICON,
                                                    alt: ''
                                                }),
                                                reactCreateElm('span', null, uploadingAvatar ? 'Uploading...' : 'Edit photo')
                                            )
                                        ),
                                        reactCreateElm(
                                            'div',
                                            { className: 'profile-overview-copy' },
                                            reactCreateElm('div', { className: 'profile-overview-label' }, 'Overview'),
                                            reactCreateElm('h2', { className: 'profile-overview-name' }, displayName),
                                            reactCreateElm('p', { className: 'profile-overview-handle' }, profileHandle),
                                            reactCreateElm('p', { className: 'profile-overview-email' }, email)
                                        )
                                    )
                                )
                            ),
                            reactCreateElm(
                                'div',
                                { className: 'profile-stack' },
                                reactCreateElm(
                                    'section',
                                    { className: 'profile-card profile-details-card' },
                                    reactCreateElm(
                                        'div',
                                        { className: 'profile-section-heading' },
                                        reactCreateElm('h2', { className: 'profile-section-title' }, 'Profile details'),
                                        reactCreateElm(
                                            'p',
                                            { className: 'profile-section-copy' },
                                            'Basic account information currently attached to this user.'
                                        )
                                    ),
                                    reactCreateElm(
                                        'div',
                                        { className: 'profile-detail-list' },
                                        detailItems.map((item) =>
                                            reactCreateElm(DetailRow, {
                                                key: item.label,
                                                label: item.label,
                                                value: item.value
                                            })
                                        )
                                    )
                                ),
                                reactCreateElm(
                                    'section',
                                    { className: 'profile-card profile-security-card' },
                                    reactCreateElm(
                                        'div',
                                        { className: 'profile-section-heading' },
                                        reactCreateElm('h2', { className: 'profile-section-title' }, 'Security and access'),
                                        reactCreateElm(
                                            'p',
                                            { className: 'profile-section-copy' },
                                            'Shortcuts for everything related to sign-in and account control.'
                                        )
                                    ),
                                    reactCreateElm(
                                        'div',
                                        { className: 'profile-action-list' },
                                        actionItems.map((item) =>
                                            reactCreateElm(ActionRow, {
                                                key: item.title,
                                                title: item.title,
                                                description: item.description,
                                                onClick: item.onClick
                                            })
                                        )
                                    )
                                ),
                                reactCreateElm(
                                    'section',
                                    { className: 'profile-card profile-danger-card' },
                                    reactCreateElm(
                                        'div',
                                        { className: 'profile-section-heading' },
                                        reactCreateElm('h2', { className: 'profile-section-title' }, 'Danger zone'),
                                        reactCreateElm(
                                            'p',
                                            { className: 'profile-section-copy' },
                                            'Deleting the account is permanent and cannot be undone.'
                                        )
                                    ),
                                    reactCreateElm(
                                        'div',
                                        { className: 'profile-danger-panel' },
                                        reactCreateElm(
                                            'p',
                                            { className: 'profile-danger-copy' },
                                            'Delete your account only if you are certain you no longer need this workspace access.'
                                        ),
                                        reactCreateElm(
                                            'button',
                                            {
                                                type: 'button',
                                                className: 'profile-danger-button',
                                                onClick: handleDeleteAccount
                                            },
                                            'Delete account'
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            reactCreateElm(ProfileModal, {
                modal: modal,
                onClose: closeModal,
                onConfirm: handleModalConfirm,
                onCancel: handleModalCancel
            })
        )
    );
};

window.UserProfile = UserProfile;
})();
