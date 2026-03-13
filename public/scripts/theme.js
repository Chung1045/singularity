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

    function applyTheme(theme) {
        const nextTheme = normalizeTheme(theme);

        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.style.colorScheme = nextTheme;

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
