/**
 * Shared logout success: bottom slide-up (same mechanics as Session/Passkey) then redirect.
 * Requires Sidebar.js to have run first (exposes injectSlideUpMessageHost) on shell pages.
 */
(function () {
    var LOGOUT_REDIRECT_MS = 3000;
    var LOGOUT_MESSAGE = 'Signed out. Redirecting to the home page.';

    function showBanner() {
        if (typeof window.injectSlideUpMessageHost === 'function') {
            window.injectSlideUpMessageHost();
        }
        var messageEl = document.getElementById('message');
        var messageTextEl = document.getElementById('messageText');
        if (!messageEl || !messageTextEl) {
            return false;
        }
        messageTextEl.textContent = LOGOUT_MESSAGE;
        messageEl.classList.add('hidden');
        void messageEl.offsetHeight;
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                messageEl.classList.remove('hidden');
            });
        });
        return true;
    }

    window.showLogoutSuccessSlideUpAndRedirect = function () {
        if (!showBanner()) {
            window.location = '/?loggedout=1';
            return;
        }
        window.setTimeout(function () {
            window.location = '/?loggedout=1';
        }, LOGOUT_REDIRECT_MS);
    };
})();
