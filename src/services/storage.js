/**
 * Local Storage Service
 * Manages conversations, user profile, and settings persistence
 */

const KEYS = {
    CONVERSATIONS: 'mhlg_conversations',
    PROFILE: 'mhlg_profile',
    SETTINGS: 'mhlg_settings',
};

// --- Conversations ---

export function saveConversation(conv) {
    const all = getConversations();
    const existing = all.findIndex(c => c.id === conv.id);
    if (existing >= 0) {
        all[existing] = conv;
    } else {
        all.unshift(conv);
    }
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(all));
}

export function getConversations() {
    try {
        return JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]');
    } catch {
        return [];
    }
}

export function getConversation(id) {
    return getConversations().find(c => c.id === id);
}

export function deleteConversation(id) {
    const all = getConversations().filter(c => c.id !== id);
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(all));
}

/**
 * Create a new conversation object
 */
export function createConversation(game, gameType = 'synapse') {
    return {
        id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        gameId: game.synapse_id || game.id,
        gameType,
        gameTitle: game.game || game.title,
        module: game.module || game.layer,
        icon: game.icon || null,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

export function addMessage(convId, role, content) {
    const conv = getConversation(convId);
    if (!conv) return;
    conv.messages.push({
        role,
        content,
        timestamp: new Date().toISOString(),
    });
    conv.updatedAt = new Date().toISOString();
    saveConversation(conv);
    return conv;
}

// --- User Profile ---

export function getProfile() {
    try {
        return JSON.parse(localStorage.getItem(KEYS.PROFILE) || '{}');
    } catch {
        return {};
    }
}

export function saveProfile(profile) {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export function initProfile() {
    const existing = getProfile();
    if (!existing.name) {
        saveProfile({
            name: 'Gamer',
            ecotype: null,
            xp: 0,
            gamesPlayed: 0,
            createdAt: new Date().toISOString(),
        });
    }
    return getProfile();
}

export function addXP(amount) {
    const profile = getProfile();
    profile.xp = (profile.xp || 0) + amount;
    profile.gamesPlayed = (profile.gamesPlayed || 0) + 1;
    saveProfile(profile);
    return profile;
}

export function updateConversationTitle(id, title) {
    const conv = getConversation(id);
    if (!conv) return;
    conv.gameTitle = title;
    conv.updatedAt = new Date().toISOString();
    saveConversation(conv);
    return conv;
}

/**
 * Export a conversation to a local file using Tauri's dialog and fs plugins
 */
export async function exportConversation(conv) {
    if (!window.__TAURI_INTERNALS__) {
        // Fallback for web (though this app is primarily Tauri)
        const blob = new Blob([JSON.stringify(conv, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mhlg_export_${conv.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
    }

    try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');

        const filePath = await save({
            filters: [{
                name: 'JSON',
                extensions: ['json']
            }, {
                name: 'Markdown',
                extensions: ['md']
            }],
            defaultPath: `mhlg_chat_${conv.gameTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
        });

        if (filePath) {
            let content = '';
            if (filePath.endsWith('.json')) {
                content = JSON.stringify(conv, null, 2);
            } else {
                // Formatting as Markdown
                content = `# ${conv.gameTitle}\n`;
                content += `Date: ${new Date(conv.createdAt).toLocaleString()}\n`;
                content += `Module: ${conv.module}\n\n`;
                content += `---\n\n`;

                conv.messages.forEach(m => {
                    const role = m.role === 'human' ? 'Gamer' : 'AI';
                    content += `### ${role} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n`;
                });
            }

            await writeTextFile(filePath, content);
            return true;
        }
    } catch (err) {
        console.error('Failed to export conversation:', err);
        throw err;
    }
    return false;
}
