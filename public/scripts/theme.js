(function () {
    const STORAGE_KEY = 'singularity-theme';
    const LIGHT_THEME = 'light';
    const DARK_THEME = 'dark';

    function normalizeTheme(theme) {
        return theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
    }

    function getStoredTheme() {
        try {
            return normalizeTheme(localStorage.getItem(STORAGE_KEY));
        } catch (error) {
            console.error('[ThemeManager] Unable to read theme preference.', error);
            return LIGHT_THEME;
        }
    }

    function clearHoverInlineStyles(nextTheme) {
        const isDark = nextTheme === DARK_THEME;
        const defaultBg = isDark ? 'var(--dm-surface-2)' : '#ffffff';
        const defaultBorder = isDark ? 'rgba(148, 163, 184, 0.3)' : '#e4e4e4';

        ['#btn-generate-user-stories', '#btn-generate-requirements'].forEach(sel => {
            const el = document.querySelector(sel);
            if (el) {
                el.style.backgroundColor = defaultBg;
                el.style.borderColor = defaultBorder;
            }
        });

        const manageBtn = document.querySelector('#right-sidebar-manage-requirements-button');
        if (manageBtn) {
            if (isDark) {
                manageBtn.style.removeProperty('backgroundColor');
            } else {
                manageBtn.style.backgroundColor = 'rgb(30, 41, 59)';
            }
        }

        const clearSelectors = [
            '[id^="requirements-panel-btn-"]', '[id^="requirements-panel-tab-"]',
            '[id^="requirements-panel-subtab-"]', '[id^="requirements-panel-item-"]',
            '.chat-history-item', '.search-result-item',
            '#sidebar-search-back-btn', '#search-panel-back-btn', '#search-panel-close-btn',
            '#sidebar-create-project-button', '#sidebar-source-upload-button',
            '#sidebar-manage-requirements-button', '#select-project-drop-down',
            '[id^="chat-history-item-delete-button-"]', '[id^="source-file-delete-button-"]',
            '#sidebar-project-option-delete', '[id^="sidebar-report-delete-btn-"]',
            '[id^="project-share-"]', '[id^="notification-item-"]',
            '.history', '.search-file-field', '.report-item', '.requirement-item', '.story-item',
            '[id^="source-file-menu-"]', '[id^="sidebar-report-options-btn-"]'
        ];
        clearSelectors.forEach(sel => {
            try {
                document.querySelectorAll(sel).forEach(el => {
                    el.style.removeProperty('backgroundColor');
                    el.style.removeProperty('borderColor');
                });
            } catch (_) {}
        });
    }

    function applyTheme(theme) {
        const nextTheme = normalizeTheme(theme);

        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.style.colorScheme = nextTheme;

        clearHoverInlineStyles(nextTheme);

        window.dispatchEvent(new CustomEvent('appThemeChanged', {
            detail: { theme: nextTheme }
        }));

        return nextTheme;
    }

    function setTheme(theme) {
        const nextTheme = applyTheme(theme);

        try {
            localStorage.setItem(STORAGE_KEY, nextTheme);
        } catch (error) {
            console.error('[ThemeManager] Unable to persist theme preference.', error);
        }

        return nextTheme;
    }

    function getTheme() {
        return normalizeTheme(document.documentElement.dataset.theme || getStoredTheme());
    }

    function toggleTheme() {
        return setTheme(getTheme() === DARK_THEME ? LIGHT_THEME : DARK_THEME);
    }

    window.themeManager = {
        STORAGE_KEY,
        LIGHT_THEME,
        DARK_THEME,
        getTheme,
        isDarkTheme: () => getTheme() === DARK_THEME,
        setTheme,
        toggleTheme,
        applyTheme
    };

    applyTheme(getStoredTheme());
})();
