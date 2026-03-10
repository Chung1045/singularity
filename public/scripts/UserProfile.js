(function () {
  const { useCallback, useEffect, useMemo, useRef, useState } = React;

  const DEFAULT_AVATAR = './img/size-48.svg';
  const CHEVRON_ICON = './img/arrow_forward_ios_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1.svg';
  const EDIT_ICON = './img/Edit.svg';

  // Safe localStorage helper
  function readStoredBoolean(key, fallbackValue) {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return fallbackValue;
      const parsed = JSON.parse(saved);
      return typeof parsed === 'boolean' ? parsed : fallbackValue;
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

  // Presentational components
  function DetailRow({ label, value }) {
    return React.createElement(
      'div',
      { className: 'profile-detail-row' },
      React.createElement('div', { className: 'profile-detail-label' }, label),
      React.createElement('div', { className: 'profile-detail-value' }, value)
    );
  }

  function ActionRow({ title, description, onClick }) {
    return React.createElement(
      'button',
      {
        type: 'button',
        className: 'profile-action-row',
        onClick: onClick
      },
      React.createElement(
        'div',
        { className: 'profile-action-copy' },
        React.createElement('div', { className: 'profile-action-title' }, title),
        React.createElement('div', { className: 'profile-action-description' }, description)
      ),
      React.createElement(
        'div',
        { className: 'profile-action-icon', 'aria-hidden': true },
        React.createElement('img', {
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

    return React.createElement(
      'div',
      {
        className: 'profile-modal-overlay',
        onClick: (e) => {
          if (e.target === e.currentTarget && modal.type === 'alert') {
            onClose();
          }
        }
      },
      React.createElement(
        'div',
        {
          className: 'profile-modal-card',
          onClick: (e) => e.stopPropagation()
        },
        React.createElement('h2', { className: 'profile-modal-title' }, modal.title),
        React.createElement('p', { className: 'profile-modal-message' }, modal.message),
        React.createElement(
          'div',
          { className: 'profile-modal-actions' },
          modal.type === 'confirm' && React.createElement(
            'button',
            {
              type: 'button',
              className: 'profile-modal-button profile-modal-button--secondary',
              onClick: onCancel
            },
            'Cancel'
          ),
          React.createElement(
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
    const profileUser = useMemo(() => getProfileUser(userInfo), [userInfo]);

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
    const [avatarUrl, setAvatarUrl] = useState('');
    const [overviewLayout, setOverviewLayout] = useState(null);
    const overviewSlotRef = useRef(null);
    const overviewCardRef = useRef(null);

    const isOverlay = windowWidth <= 1040;
    const shouldFixOverviewCard = windowWidth > 900 && !isOverlay;

    // Resize listener
    useEffect(() => {
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    // Sidebar responsive behavior
    useEffect(() => {
      if (isOverlay) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(readStoredBoolean('sidebarCollapsed', false));
      }
    }, [isOverlay]);

    // Avatar from user data
    useEffect(() => {
      const url = profileUser.userAvatarPath
        || profileUser.googleAvatarUrl
        || DEFAULT_AVATAR;
      setAvatarUrl(url);
    }, [profileUser]);

    // Derived user info
    const username = useMemo(() =>
      profileUser.userName || profileUser.email || 'User'
    , [profileUser]);

    const displayName = useMemo(() => {
      if (profileUser.firstName && profileUser.lastName) {
        return `${profileUser.firstName} ${profileUser.lastName}`;
      }
      return profileUser.displayName || profileUser.userName || profileUser.email || 'User';
    }, [profileUser]);

    const email = useMemo(() =>
      profileUser.userEmail || profileUser.email || 'No email available'
    , [profileUser]);

    const profileHandle = useMemo(() =>
      profileUser.userName ? `@${profileUser.userName}` : email
    , [profileUser, email]);

    const accountType = useMemo(() => {
      if (profileUser.hasPasskey) return 'Passkey';
      if (profileUser.userType === 'google') return 'Google Sign-In';
      return 'Email login';
    }, [profileUser]);

    // Fetch profile picture
    const fetchProfilePics = useCallback(async () => {
      if (!csrfToken) {
        setAvatarLoading(false);
        return;
      }
      setAvatarLoading(true);
      try {
        const res = await fetch('/api/profile-pic/fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': csrfToken
          },
          body: JSON.stringify({})
        });
        const data = await res.json();
        const img = data?.data?.[0]?.image;
        if (data?.success && img) {
          setAvatarUrl(img);
        }
      } catch (err) {
        console.error('Error fetching profile picture:', err);
      } finally {
        setAvatarLoading(false);
      }
    }, [csrfToken]);

    useEffect(() => {
      fetchProfilePics();
    }, [fetchProfilePics]);

    // Fixed overview layout
    useEffect(() => {
      if (!shouldFixOverviewCard) {
        setOverviewLayout(null);
        return;
      }

      const update = () => {
        const slot = overviewSlotRef.current;
        const card = overviewCardRef.current;
        if (!slot || !card) return;

        const slotRect = slot.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        setOverviewLayout({
          left: slotRect.left,
          width: slotRect.width,
          height: cardRect.height
        });
      };

      update();
      window.addEventListener('resize', update);
      window.addEventListener('sidebarResized', update);

      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('sidebarResized', update);
      };
    }, [shouldFixOverviewCard, sidebarCollapsed]);

    // Modal controls
    const closeModal = useCallback(() => {
      setModal({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: null,
        onCancel: null
      });
    }, []);

    const showAlert = useCallback((title, message) => {
      setModal({
        isOpen: true,
        title,
        message,
        type: 'alert',
        onConfirm: null,
        onCancel: null
      });
    }, []);

    const showModal = useCallback((title, message, onConfirm, onCancel) => {
      setModal({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        onConfirm,
        onCancel: onCancel || null
      });
    }, []);

    const handleModalConfirm = useCallback(async () => {
      const fn = modal.onConfirm;
      closeModal();
      if (fn) await fn();
    }, [modal, closeModal]);

    const handleModalCancel = useCallback(() => {
      const fn = modal.onCancel;
      closeModal();
      if (fn) fn();
    }, [modal, closeModal]);

    // Avatar error fallback
    const handleAvatarError = useCallback(() => {
      if (avatarUrl === profileUser.userAvatarPath && profileUser.googleAvatarUrl) {
        setAvatarUrl(profileUser.googleAvatarUrl);
        return;
      }
      if (avatarUrl !== DEFAULT_AVATAR) {
        setAvatarUrl(DEFAULT_AVATAR);
      } else {
        setAvatarLoading(false);
      }
    }, [avatarUrl, profileUser]);

    // Upload avatar
    const handleAvatarUpload = useCallback(async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showAlert('Invalid File Type', 'Please upload JPEG, PNG, GIF, or WebP.');
        e.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showAlert('File Too Large', 'Image must be smaller than 5MB.');
        e.target.value = '';
        return;
      }

      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/profile-pic/replace', {
          method: 'POST',
          headers: { 'CSRF-Token': csrfToken },
          body: formData
        });
        const data = await res.json().catch(() => {
          throw new Error('Invalid server response');
        });
        if (res.ok && data.success) {
          await fetchProfilePics();
          showAlert('Success', 'Profile picture updated.');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          showAlert('Upload Failed', data.message || 'Failed to upload image.');
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
        showAlert('Upload Error', err.message);
      } finally {
        setUploadingAvatar(false);
        e.target.value = '';
      }
    }, [csrfToken, fetchProfilePics, showAlert]);

    const triggerAvatarUpload = useCallback(() => {
      document.getElementById('avatar-upload-input')?.click();
    }, []);

    // Navigation
    const handleSessionManagement = useCallback(() => {
      window.location.href = '/session';
    }, []);

    const handlePasskeyManagement = useCallback(() => {
      window.location.href = '/passkeys';
    }, []);

    const handleChangePassword = useCallback(() => {
      window.location.href = '/change-password';
    }, []);

    const handleSupport = useCallback(() => {
      window.location.href = '/support';
    }, []);

    const handleProfileRoute = useCallback(() => {
      window.location.href = '/profile';
    }, []);

    // Logout
    const logout = useCallback(async () => {
      try {
        const res = await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': csrfToken,
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({})
        });
        if (res.ok) {
          showAlert('Logout Successful', 'Redirecting...');
          setTimeout(() => {
            window.location = '/?loggedout=1';
          }, 3000);
        } else {
          const data = await res.json().catch(() => ({}));
          showAlert('Error', data.message || 'Logout failed');
        }
      } catch (err) {
        showAlert('Error', 'An error occurred during logout');
      }
    }, [csrfToken, showAlert]);

    // Delete account
    const handleDeleteAccount = useCallback(() => {
      showModal(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone.',
        async () => {
          try {
            const res = await fetch('/api/account/delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
              },
              body: JSON.stringify({})
            });
            const result = await res.json();
            if (result.success) {
              showAlert('Account Deleted', 'Redirecting to login...');
              setTimeout(() => {
                window.location.href = '/login';
              }, 10000);
            } else {
              showAlert('Error', 'Failed to delete account.');
            }
          } catch (err) {
            console.error('Delete account error:', err);
            showAlert('Error', 'Something went wrong.');
          }
        }
      );
    }, [csrfToken, showModal]);

    // Lists
    const detailItems = useMemo(() => [
      { label: 'Username', value: username },
      { label: 'Display Name', value: displayName },
      { label: 'Email Address', value: email },
      { label: 'Account Type', value: accountType }
    ], [username, displayName, email, accountType]);

    const actionItems = useMemo(() => [
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
    ], [handleChangePassword, handlePasskeyManagement, handleSessionManagement, handleSupport]);

    // MAIN RENDER
    return React.createElement(
      'div',
      {
        className: 'sidebar-expand profile-shell' + (sidebarCollapsed ? ' collapsed' : ''),
        onClick: () => setUserMenuOpen(false)
      },
      React.createElement(
        'div',
        { className: 'group profile-layout' },

        isOverlay && !sidebarCollapsed && React.createElement('div', {
          className: 'profile-sidebar-backdrop',
          onClick: () => setSidebarCollapsed(true)
        }),

        React.createElement(window.Sidebar, {
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

        // Main content
        React.createElement(
          'main',
          { className: 'right-container profile-right-container' },
          React.createElement(
            'section',
            { className: 'main-screen profile-main-screen' },
            React.createElement(
              'div',
              { className: 'profile-scroll-region' },

              // Header
              React.createElement(
                'header',
                { className: 'profile-page-header' },
                React.createElement('div', { className: 'profile-page-eyebrow' }, 'Account'),
                React.createElement('h1', { className: 'profile-page-title' }, 'User Profile'),
                React.createElement(
                  'p',
                  { className: 'profile-page-copy' },
                  'Manage your account details, sign-in methods, active sessions, and support from one page.'
                )
              ),

              // Grid layout
              React.createElement(
                'div',
                { className: 'profile-content-grid' },

                // Overview card
                React.createElement(
                  'div',
                  {
                    className: 'profile-overview-slot',
                    ref: overviewSlotRef,
                    style: shouldFixOverviewCard && overviewLayout
                      ? { minHeight: `${overviewLayout.height}px` }
                      : undefined
                  },
                  React.createElement(
                    'section',
                    {
                      className: 'profile-card profile-overview-card'
                        + (shouldFixOverviewCard && overviewLayout ? ' profile-overview-card--fixed' : ''),
                      ref: overviewCardRef,
                      style: shouldFixOverviewCard && overviewLayout ? {
                        left: `${overviewLayout.left}px`,
                        width: `${overviewLayout.width}px`
                      } : undefined
                    },
                    React.createElement(
                      'div',
                      { className: 'profile-overview-top' },
                      // Avatar
                      React.createElement(
                        'div',
                        { className: 'profile-avatar-block' },
                        React.createElement(
                          'div',
                          { className: 'profile-avatar-frame' },
                          avatarLoading
                            ? React.createElement('div', {
                              className: 'sk-box',
                              style: {
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%'
                              }
                            })
                            : React.createElement('img', {
                              className: 'profile-avatar-image',
                              src: avatarUrl || DEFAULT_AVATAR,
                              alt: 'User avatar',
                              onError: handleAvatarError
                            })
                        ),
                        // Hidden file input
                        React.createElement('input', {
                          id: 'avatar-upload-input',
                          type: 'file',
                          accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
                          style: { display: 'none' },
                          onChange: handleAvatarUpload
                        }),
                        // Edit button
                        React.createElement(
                          'button',
                          {
                            type: 'button',
                            className: 'profile-avatar-button' + (uploadingAvatar ? ' is-busy' : ''),
                            onClick: uploadingAvatar ? null : triggerAvatarUpload,
                            disabled: uploadingAvatar
                          },
                          React.createElement('img', {
                            className: 'profile-avatar-button-icon',
                            src: EDIT_ICON,
                            alt: ''
                          }),
                          React.createElement('span', null, uploadingAvatar ? 'Uploading...' : 'Edit photo')
                        )
                      ),
                      // Overview text
                      React.createElement(
                        'div',
                        { className: 'profile-overview-copy' },
                        React.createElement('div', { className: 'profile-overview-label' }, 'Overview'),
                        React.createElement('h2', { className: 'profile-overview-name' }, displayName),
                        React.createElement('p', { className: 'profile-overview-handle' }, profileHandle),
                        React.createElement('p', { className: 'profile-overview-email' }, email)
                      )
                    )
                  )
                ),

                // Stack of cards
                React.createElement(
                  'div',
                  { className: 'profile-stack' },
                  // Details card
                  React.createElement(
                    'section',
                    { className: 'profile-card profile-details-card' },
                    React.createElement(
                      'div',
                      { className: 'profile-section-heading' },
                      React.createElement('h2', { className: 'profile-section-title' }, 'Profile details'),
                      React.createElement(
                        'p',
                        { className: 'profile-section-copy' },
                        'Basic account information currently attached to this user.'
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'profile-detail-list' },
                      detailItems.map((item) =>
                        React.createElement(DetailRow, {
                          key: item.label,
                          label: item.label,
                          value: item.value
                        })
                      )
                    )
                  ),

                  // Security card
                  React.createElement(
                    'section',
                    { className: 'profile-card profile-security-card' },
                    React.createElement(
                      'div',
                      { className: 'profile-section-heading' },
                      React.createElement('h2', { className: 'profile-section-title' }, 'Security and access'),
                      React.createElement(
                        'p',
                        { className: 'profile-section-copy' },
                        'Shortcuts for everything related to sign-in and account control.'
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'profile-action-list' },
                      actionItems.map((item) =>
                        React.createElement(ActionRow, {
                          key: item.title,
                          title: item.title,
                          description: item.description,
                          onClick: item.onClick
                        })
                      )
                    )
                  ),

                  // Danger zone
                  React.createElement(
                    'section',
                    { className: 'profile-card profile-danger-card' },
                    React.createElement(
                      'div',
                      { className: 'profile-section-heading' },
                      React.createElement('h2', { className: 'profile-section-title' }, 'Danger zone'),
                      React.createElement(
                        'p',
                        { className: 'profile-section-copy' },
                        'Deleting the account is permanent and cannot be undone.'
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'profile-danger-panel' },
                      React.createElement(
                        'p',
                        { className: 'profile-danger-copy' },
                        'Delete your account only if you are certain you no longer need this workspace access.'
                      ),
                      React.createElement(
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

        // Modal
        React.createElement(ProfileModal, {
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