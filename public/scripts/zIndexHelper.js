/**
 * Z-Index Management Helper
 * Provides centralized z-index values as JavaScript constants
 * Matches the CSS variables in z-index.css
 */

window.ZIndex = {
    // Base Layer (0-9)
    BASE: 0,
    BACKGROUND: 1,

    // Content Layer (10-19)
    SIDEBAR: 10,
    MAIN_CONTENT: 11,
    CHAT_TOPBAR: 12,
    CHAT_INPUT: 13,

    // Overlay Layer (20-29)
    DROPDOWN: 20,
    TOOLTIP: 21,
    MENU: 22,

    // Modal Layer (30-39)
    MODAL_BACKDROP: 30,
    MODAL: 31,
    MODAL_NESTED: 32,

    // Notification Layer (40-49)
    NOTIFICATION: 40,

    // Critical Layer (50+)
    CRITICAL: 50
};

// Freeze the object to prevent modifications
Object.freeze(window.ZIndex);

console.log('[ZIndex] Helper loaded with values:', window.ZIndex);
