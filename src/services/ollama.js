/**
 * Ollama API Client
 * Connects to local Ollama instance for AI chat
 */

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'gemma3';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TOP_P = 0.9;

/**
 * Internal fetch wrapper that uses Tauri's Rust-side proxy
 * to bypass CORS and other browser-related networking restrictions.
 */
async function apiFetch(url, options = {}) {
    // If running in Tauri, use the Rust-side proxy for non-streaming requests
    if (window.__TAURI_INTERNALS__ && !options.stream) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');

            const responseData = await invoke('ollama_proxy', {
                method: options.method || 'GET',
                url: url,
                body: options.body ? JSON.parse(options.body) : null
            });

            // Return a fetch-like response object for compatibility
            return {
                ok: true,
                json: async () => responseData,
                text: async () => JSON.stringify(responseData),
            };
        } catch (err) {
            console.error('Tauri Rust proxy failed:', err);
            // Don't throw yet, fallback to browser fetch which might work in dev
        }
    }

    // Standard browser fetch (useful for dev mode or if plugin fails)
    return await fetch(url, options);
}

function getBaseUrl() {
    return localStorage.getItem('mhlg_ollama_url') || DEFAULT_BASE_URL;
}

function getModel() {
    return localStorage.getItem('mhlg_ollama_model') || DEFAULT_MODEL;
}

export function setBaseUrl(url) {
    localStorage.setItem('mhlg_ollama_url', url);
}

export function setModel(model) {
    localStorage.setItem('mhlg_ollama_model', model);
}

export const LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Japanese',
    'Chinese', 'Portuguese', 'Italian', 'Hindi', 'Arabic', 'Yoruba',
];

const DEFAULT_LANGUAGE = 'English';

export function getLanguage() {
    return localStorage.getItem('mhlg_language') || DEFAULT_LANGUAGE;
}

export function setLanguage(lang) {
    localStorage.setItem('mhlg_language', lang);
}

const DEFAULT_EMBEDDING_MODEL = 'embeddinggemma';

export function getEmbeddingModel() {
    return localStorage.getItem('mhlg_embedding_model') || DEFAULT_EMBEDDING_MODEL;
}

export function setEmbeddingModel(model) {
    localStorage.setItem('mhlg_embedding_model', model);
}

export function getTemperature() {
    const val = localStorage.getItem('mhlg_ollama_temp');
    return val !== null ? parseFloat(val) : DEFAULT_TEMPERATURE;
}

export function setTemperature(temp) {
    localStorage.setItem('mhlg_ollama_temp', temp);
}

export function getMaxTokens() {
    const val = localStorage.getItem('mhlg_ollama_max_tokens');
    return val !== null ? parseInt(val) : DEFAULT_MAX_TOKENS;
}

export function setMaxTokens(val) {
    localStorage.setItem('mhlg_ollama_max_tokens', val);
}

export function getTopP() {
    const val = localStorage.getItem('mhlg_ollama_top_p');
    return val !== null ? parseFloat(val) : DEFAULT_TOP_P;
}

export function setTopP(val) {
    localStorage.setItem('mhlg_ollama_top_p', val);
}

export function getSettings() {
    return {
        baseUrl: getBaseUrl(),
        model: getModel(),
        language: getLanguage(),
        embeddingModel: getEmbeddingModel(),
        temperature: getTemperature(),
        maxTokens: getMaxTokens(),
        topP: getTopP(),
    };
}

/**
 * Check if Ollama is reachable
 */
export async function checkConnection() {
    try {
        const res = await apiFetch(`${getBaseUrl()}/api/tags`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * List available models from Ollama
 */
export async function listModels() {
    try {
        const res = await apiFetch(`${getBaseUrl()}/api/tags`);
        if (!res.ok) throw new Error('Failed to fetch models');
        const data = await res.json();
        return (data.models || []).map(m => ({
            name: m.name,
            size: m.size,
            modified: m.modified_at,
        }));
    } catch (err) {
        console.error('Failed to list models:', err);
        return [];
    }
}

/**
 * Send a chat message (non-streaming)
 * @param {Array} messages - [{role: 'system'|'user'|'assistant', content: string}]
 * @param {string} [model] - Override model
 * @returns {Promise<string>} - Assistant response
 */
export async function chat(messages, model) {
    const settings = getSettings();
    const res = await apiFetch(`${getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model || getModel(),
            messages,
            stream: false,
            options: {
                temperature: settings.temperature,
                num_predict: settings.maxTokens,
                top_p: settings.topP,
            }
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama error: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data.message?.content || '';
}

/**
 * Send a chat message with streaming response
 * @param {Array} messages - [{role: 'system'|'user'|'assistant', content: string}]
 * @param {Function} onChunk - Callback for each text chunk
 * @param {string} [model] - Override model
 * @returns {Promise<string>} - Full response text
 */
export async function streamChat(messages, onChunk, model) {
    if (window.__TAURI_INTERNALS__) {
        try {
            const { invoke, Channel } = await import('@tauri-apps/api/core');
            const onEvent = new Channel();
            let fullResponse = '';

            onEvent.onmessage = (json) => {
                if (json.message?.content) {
                    fullResponse += json.message.content;
                    onChunk(json.message.content, fullResponse);
                }
            };

            const settings = getSettings();
            await invoke('ollama_stream_proxy', {
                url: `${getBaseUrl()}/api/chat`,
                body: {
                    model: model || getModel(),
                    messages,
                    stream: true,
                    options: {
                        temperature: settings.temperature,
                        num_predict: settings.maxTokens,
                        top_p: settings.topP,
                    }
                },
                onEvent
            });

            return fullResponse;
        } catch (err) {
            console.error('Tauri streaming proxy failed:', err);
        }
    }

    const settings = getSettings();
    const res = await apiFetch(`${getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model || getModel(),
            messages,
            stream: true,
            options: {
                temperature: settings.temperature,
                num_predict: settings.maxTokens,
                top_p: settings.topP,
            }
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama error: ${res.status} ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                    fullResponse += json.message.content;
                    onChunk(json.message.content, fullResponse);
                }
            } catch {
                // Skip malformed lines
            }
        }
    }

    return fullResponse;
}

/**
 * Direct call to the Rust ask_ollama command
 */
export async function askOllama(prompt) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('ask_ollama', { prompt });
}


export async function generateEmbedding(text, model) {
    const embeddingModel = model || getEmbeddingModel();
    try {
        const response = await fetch(`${getBaseUrl()}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: embeddingModel,
                prompt: text
            })
        });

        const data = await response.json();
        if (data.embedding) {
            return data.embedding;
        } else {
            console.error("No embedding returned from Ollama:", data);
            return null;
        }
    } catch (error) {
        console.error("Error generating embedding:", error);
        return null;
    }
}
