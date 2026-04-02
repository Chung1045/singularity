(function () {
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const reactCreateElm = React.createElement;

const DEFAULT_AVATAR = './img/size-48.svg';
const CHEVRON_ICON = './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg';
const EDIT_ICON = './img/Edit.svg';
const AVATAR_EDITOR_VIEWPORT_SIZE = 260;
const AVATAR_OUTPUT_SIZE = 800;
const MAX_AVATAR_ZOOM = 3;

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

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function createEmptyAvatarEditorState() {
    return {
        isOpen: false,
        objectUrl: '',
        fileName: '',
        naturalWidth: 0,
        naturalHeight: 0,
        baseScale: 1,
        zoom: 1,
        offsetX: 0,
        offsetY: 0
    };
}

function loadImageSource(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Unable to load the selected image.'));
        image.src = src;
    });
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read the selected image.'));
        reader.readAsDataURL(file);
    });
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

function AvatarEditorModal({ editor, uploading, isDragging, onClose, onConfirm, onZoomChange, onPointerDown }) {
    if (!editor.isOpen) {
        return null;
    }

    const displayWidth = editor.naturalWidth * editor.baseScale * editor.zoom;
    const displayHeight = editor.naturalHeight * editor.baseScale * editor.zoom;

    return reactCreateElm(
        'div',
        {
            className: 'profile-modal-overlay profile-avatar-editor-overlay',
            onClick: (event) => {
                if (!uploading && event.target === event.currentTarget) {
                    onClose();
                }
            }
        },
        reactCreateElm(
            'div',
            {
                className: 'profile-modal-card profile-avatar-editor-card',
                onClick: (event) => event.stopPropagation()
            },
            reactCreateElm('h2', { className: 'profile-modal-title' }, 'Adjust profile picture'),
            reactCreateElm(
                'p',
                { className: 'profile-modal-message profile-avatar-editor-message' },
                'Drag to reposition and use the slider to zoom before saving. The circle shows what will be visible on your profile.'
            ),
            reactCreateElm(
                'div',
                { className: 'profile-avatar-editor-preview-shell' },
                reactCreateElm(
                    'div',
                    {
                        className: 'profile-avatar-editor-preview' + (isDragging ? ' is-dragging' : ''),
                        style: {
                            width: `${AVATAR_EDITOR_VIEWPORT_SIZE}px`,
                            height: `${AVATAR_EDITOR_VIEWPORT_SIZE}px`
                        },
                        onPointerDown: uploading ? null : onPointerDown
                    },
                    reactCreateElm('img', {
                        className: 'profile-avatar-editor-image',
                        src: editor.objectUrl,
                        alt: 'Avatar preview',
                        draggable: false,
                        style: {
                            width: `${displayWidth}px`,
                            height: `${displayHeight}px`,
                            left: `calc(50% + ${editor.offsetX}px)`,
                            top: `calc(50% + ${editor.offsetY}px)`,
                            transform: 'translate(-50%, -50%)'
                        }
                    }),
                    reactCreateElm('div', {
                        className: 'profile-avatar-editor-mask',
                        'aria-hidden': true
                    })
                )
            ),
            reactCreateElm(
                'div',
                { className: 'profile-avatar-editor-controls' },
                reactCreateElm(
                    'div',
                    { className: 'profile-avatar-editor-zoom-row' },
                    reactCreateElm('span', null, 'Zoom'),
                    reactCreateElm('span', null, `${Math.round(editor.zoom * 100)}%`)
                ),
                reactCreateElm('input', {
                    type: 'range',
                    min: '1',
                    max: String(MAX_AVATAR_ZOOM),
                    step: '0.01',
                    value: editor.zoom,
                    className: 'profile-avatar-editor-slider',
                    onChange: onZoomChange,
                    disabled: uploading
                })
            ),
            reactCreateElm(
                'div',
                { className: 'profile-modal-actions profile-avatar-editor-actions' },
                reactCreateElm(
                    'button',
                    {
                        type: 'button',
                        className: 'profile-modal-button profile-modal-button--secondary',
                        onClick: onClose,
                        disabled: uploading
                    },
                    'Cancel'
                ),
                reactCreateElm(
                    'button',
                    {
                        type: 'button',
                        className: 'profile-modal-button profile-modal-button--primary',
                        onClick: onConfirm,
                        disabled: uploading
                    },
                    uploading ? 'Saving...' : 'Save photo'
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
    const [avatarImgError, setAvatarImgError] = useState(false);
    const [avatarEditor, setAvatarEditor] = useState(createEmptyAvatarEditorState);
    const [avatarEditorDragging, setAvatarEditorDragging] = useState(false);
    const [overviewLayout, setOverviewLayout] = useState(null);
    const overviewSlotRef = useRef(null);
    const overviewCardRef = useRef(null);
    const avatarEditorUrlRef = useRef('');
    const avatarEditorDragRef = useRef({
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0
    });

    const isOverlay = windowWidth <= 1040;
    const shouldFixOverviewCard = windowWidth > 900 && !isOverlay;

    useEffect(() => {
        let rafId = 0;

        const handleResize = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                setWindowWidth(window.innerWidth);
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
        const url = profileUser.userAvatarPath || profileUser.googleAvatarUrl || DEFAULT_AVATAR;
        setAvatarUrl(url);
        setAvatarImgError(false);
    }, [profileUser.googleAvatarUrl, profileUser.userAvatarPath]);

    useEffect(() => {
        setAvatarImgError(false);
    }, [avatarUrl]);

    const clearAvatarEditorUrl = useCallback(() => {
        if (avatarEditorUrlRef.current) {
            avatarEditorUrlRef.current = '';
        }
    }, []);

    const closeAvatarEditor = useCallback(() => {
        clearAvatarEditorUrl();
        setAvatarEditor(createEmptyAvatarEditorState());
        setAvatarEditorDragging(false);
    }, [clearAvatarEditorUrl]);

    useEffect(() => () => {
        clearAvatarEditorUrl();
    }, [clearAvatarEditorUrl]);

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
            const response = await fetch('/api/profile-pic/fetch', {
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

    const clampAvatarEditorOffsets = useCallback((nextOffsetX, nextOffsetY, editorState) => {
        if (!editorState.naturalWidth || !editorState.naturalHeight) {
            return { offsetX: 0, offsetY: 0 };
        }

        const displayWidth = editorState.naturalWidth * editorState.baseScale * editorState.zoom;
        const displayHeight = editorState.naturalHeight * editorState.baseScale * editorState.zoom;
        const maxOffsetX = Math.max(0, (displayWidth - AVATAR_EDITOR_VIEWPORT_SIZE) / 2);
        const maxOffsetY = Math.max(0, (displayHeight - AVATAR_EDITOR_VIEWPORT_SIZE) / 2);

        return {
            offsetX: clamp(nextOffsetX, -maxOffsetX, maxOffsetX),
            offsetY: clamp(nextOffsetY, -maxOffsetY, maxOffsetY)
        };
    }, []);

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
        setAvatarImgError(true);
    };

    useEffect(() => {
        if (!avatarEditorDragging) {
            return undefined;
        }

        const handlePointerMove = (event) => {
            setAvatarEditor((currentEditor) => {
                if (!currentEditor.isOpen) {
                    return currentEditor;
                }

                const nextOffsetX = avatarEditorDragRef.current.originX + (event.clientX - avatarEditorDragRef.current.startX);
                const nextOffsetY = avatarEditorDragRef.current.originY + (event.clientY - avatarEditorDragRef.current.startY);
                const clampedOffsets = clampAvatarEditorOffsets(nextOffsetX, nextOffsetY, currentEditor);

                return {
                    ...currentEditor,
                    offsetX: clampedOffsets.offsetX,
                    offsetY: clampedOffsets.offsetY
                };
            });
        };

        const stopDragging = () => {
            setAvatarEditorDragging(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopDragging);
        window.addEventListener('pointercancel', stopDragging);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
        };
    }, [avatarEditorDragging, clampAvatarEditorOffsets]);

    useEffect(() => {
        if (!avatarEditor.isOpen) {
            return undefined;
        }

        const handleEscape = (event) => {
            if (event.key === 'Escape' && !uploadingAvatar) {
                closeAvatarEditor();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [avatarEditor.isOpen, closeAvatarEditor, uploadingAvatar]);

    const uploadAvatarFile = useCallback(async (file) => {
        setUploadingAvatar(true);

        const formData = new FormData();
        formData.append('file', file, file.name || 'avatar.jpg');

        try {
            const response = await fetch('/api/profile-pic/replace', {
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
                closeAvatarEditor();
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
        }
    }, [closeAvatarEditor, csrfToken, fetchProfilePics]);

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

        try {
            clearAvatarEditorUrl();
            const dataUrl = await readFileAsDataUrl(file);
            avatarEditorUrlRef.current = dataUrl;

            const image = await loadImageSource(dataUrl);
            const baseScale = Math.max(
                AVATAR_EDITOR_VIEWPORT_SIZE / image.naturalWidth,
                AVATAR_EDITOR_VIEWPORT_SIZE / image.naturalHeight
            );

            setAvatarEditor({
                isOpen: true,
                objectUrl: dataUrl,
                fileName: file.name,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                baseScale,
                zoom: 1,
                offsetX: 0,
                offsetY: 0
            });
        } catch (error) {
            console.error('Error preparing avatar editor:', error);
            clearAvatarEditorUrl();
            showAlert('Preview Error', error.message || 'Unable to prepare your image for editing.');
        } finally {
            event.target.value = '';
        }
    };

    const handleAvatarEditorPointerDown = (event) => {
        if (uploadingAvatar) {
            return;
        }

        event.preventDefault();
        avatarEditorDragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: avatarEditor.offsetX,
            originY: avatarEditor.offsetY
        };
        setAvatarEditorDragging(true);
    };

    const handleAvatarZoomChange = (event) => {
        const nextZoom = Number(event.target.value);
        setAvatarEditor((currentEditor) => {
            if (!currentEditor.isOpen) {
                return currentEditor;
            }

            const nextEditor = {
                ...currentEditor,
                zoom: nextZoom
            };
            const clampedOffsets = clampAvatarEditorOffsets(currentEditor.offsetX, currentEditor.offsetY, nextEditor);

            return {
                ...nextEditor,
                offsetX: clampedOffsets.offsetX,
                offsetY: clampedOffsets.offsetY
            };
        });
    };

    const handleAvatarEditorConfirm = async () => {
        if (!avatarEditor.isOpen || uploadingAvatar) {
            return;
        }

        try {
            const image = await loadImageSource(avatarEditor.objectUrl);
            const canvas = document.createElement('canvas');
            canvas.width = AVATAR_OUTPUT_SIZE;
            canvas.height = AVATAR_OUTPUT_SIZE;

            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Unable to prepare the image for upload.');
            }

            const displayWidth = avatarEditor.naturalWidth * avatarEditor.baseScale * avatarEditor.zoom;
            const displayHeight = avatarEditor.naturalHeight * avatarEditor.baseScale * avatarEditor.zoom;
            const imageX = ((AVATAR_EDITOR_VIEWPORT_SIZE - displayWidth) / 2) + avatarEditor.offsetX;
            const imageY = ((AVATAR_EDITOR_VIEWPORT_SIZE - displayHeight) / 2) + avatarEditor.offsetY;
            const exportScale = AVATAR_OUTPUT_SIZE / AVATAR_EDITOR_VIEWPORT_SIZE;

            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
            context.drawImage(
                image,
                imageX * exportScale,
                imageY * exportScale,
                displayWidth * exportScale,
                displayHeight * exportScale
            );

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((createdBlob) => {
                    if (createdBlob) {
                        resolve(createdBlob);
                        return;
                    }

                    reject(new Error('Unable to prepare the image for upload.'));
                }, 'image/jpeg', 0.92);
            });

            const baseName = avatarEditor.fileName
                ? avatarEditor.fileName.replace(/\.[^.]+$/, '')
                : 'avatar';
            const processedFile = new File([blob], `${baseName || 'avatar'}.jpg`, { type: 'image/jpeg' });

            await uploadAvatarFile(processedFile);
        } catch (error) {
            console.error('Error confirming avatar crop:', error);
            showAlert('Image Processing Error', error.message || 'Unable to prepare your image for upload.');
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
                if (typeof window.showLogoutSuccessSlideUpAndRedirect === 'function') {
                    window.showLogoutSuccessSlideUpAndRedirect();
                } else {
                    showAlert('Logout Successful', 'Press OK to proceed or wait for redirect.');
                    setTimeout(() => {
                        window.location = '/?loggedout=1';
                    }, 3000);
                }
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
                    const response = await fetch('/api/account/delete', {
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
                                                    : avatarImgError
                                                        ? reactCreateElm('div', {
                                                            className: 'profile-avatar-image profile-avatar-fallback',
                                                            'aria-label': 'User avatar'
                                                        }, 'User avatar')
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
                                                reactCreateElm('span', null, uploadingAvatar ? 'Uploading...' : 'Edit')
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
            }),
            reactCreateElm(AvatarEditorModal, {
                editor: avatarEditor,
                uploading: uploadingAvatar,
                isDragging: avatarEditorDragging,
                onClose: closeAvatarEditor,
                onConfirm: handleAvatarEditorConfirm,
                onZoomChange: handleAvatarZoomChange,
                onPointerDown: handleAvatarEditorPointerDown
            })
        )
    );
};

window.UserProfile = UserProfile;
})();