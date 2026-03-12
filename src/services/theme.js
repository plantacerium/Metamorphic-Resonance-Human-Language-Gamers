/**
 * Theme Service
 * Manages theme selection, persistence, live switching, and custom CSS themes
 */

const THEME_KEY = 'mhlg_theme';
const CUSTOM_THEMES_KEY = 'mhlg_custom_themes';

export const THEMES = {
    parchment: {
        id: 'parchment',
        name: 'Ancient Parchment',
        icon: '📜',
        description: 'The original scroll & wax seal aesthetic',
        builtin: true,
    },
    scifi: {
        id: 'scifi',
        name: 'Sci-Fi Glassmorphism',
        icon: '🔮',
        description: 'Translucent panels, neon glows & holographic depth',
        builtin: true,
    },
    luxury: {
        id: 'luxury',
        name: 'Dark Luxury',
        icon: '👑',
        description: 'Obsidian surfaces, gold filigree & premium noir',
        builtin: true,
    },
    celestial: {
        id: 'celestial',
        name: 'Celestial White Fire',
        icon: '🕊️',
        description: 'Angelic radiance, white flames & divine luminosity',
        builtin: true,
    },
    love: {
        id: 'love',
        name: 'Love',
        icon: '💗',
        description: 'Rose blush, warm hearts & romantic radiance',
        builtin: true,
    },
    solar: {
        id: 'solar',
        name: 'Solar',
        icon: '☀️',
        description: 'Blazing amber, sunburst rays & golden fire',
        builtin: true,
    },
};

// ─── Custom Themes ───

export function getCustomThemes() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) || '{}');
    } catch {
        return {};
    }
}

function _saveCustomThemes(themes) {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

/**
 * Add a custom CSS theme
 */
export function addCustomTheme(id, name, icon, description, cssContent) {
    const custom = getCustomThemes();
    custom[id] = {
        id,
        name,
        icon: icon || '🎨',
        description: description || 'Custom theme',
        css: cssContent,
        builtin: false,
        createdAt: new Date().toISOString(),
    };
    _saveCustomThemes(custom);
    return custom[id];
}

/**
 * Delete a custom theme
 */
export function deleteCustomTheme(themeId) {
    const custom = getCustomThemes();
    delete custom[themeId];
    _saveCustomThemes(custom);
    // If this was the active theme, revert to parchment
    if (getTheme() === themeId) {
        setTheme('parchment');
    }
}

/**
 * Get ALL themes (built-in + custom)
 */
export function getAllThemes() {
    return { ...THEMES, ...getCustomThemes() };
}

/**
 * Get the currently saved theme ID
 */
export function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'parchment';
}

/**
 * Save and apply a theme
 */
export function setTheme(themeId) {
    const all = getAllThemes();
    if (!all[themeId]) themeId = 'parchment';
    localStorage.setItem(THEME_KEY, themeId);
    applyTheme(themeId);
}

/**
 * Apply a theme to the document by setting a data-theme attribute
 * and triggering a smooth transition. For custom themes, inject CSS.
 */
export function applyTheme(themeId) {
    if (!themeId) themeId = getTheme();

    // Add transition class for smooth switching
    document.documentElement.classList.add('theme-transitioning');
    document.documentElement.setAttribute('data-theme', themeId);

    // Handle custom CSS injection
    const existingCustomStyle = document.getElementById('mhlg-custom-theme-css');
    if (existingCustomStyle) existingCustomStyle.remove();

    const allThemes = getAllThemes();
    const theme = allThemes[themeId];
    if (theme && !theme.builtin && theme.css) {
        const style = document.createElement('style');
        style.id = 'mhlg-custom-theme-css';
        style.textContent = theme.css;
        document.head.appendChild(style);
    }

    // Remove transition class after animation completes
    setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
    }, 600);
}

/**
 * Initialize theme on page load
 */
export function initTheme() {
    applyTheme(getTheme());
}
