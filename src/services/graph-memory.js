/**
 * Graph & Vector Memory Service via SurrealDB
 */

import { invoke } from '@tauri-apps/api/core';
// Keep the in-memory array as fallback for browser dev mode
import { storeVector as fallbackStore, retrieveRelevantMemories as fallbackRetrieve } from './vector-memory.js';

let useTauri = !!window.__TAURI_INTERNALS__;

export async function storeGraphMemory(text, embedding, role, gameId) {
    if (!useTauri) {
        return fallbackStore(text, embedding, role, gameId);
    }
    try {
        await invoke('graph_store_memory', {
            text,
            embedding,
            role,
            gameId: String(gameId)
        });
        console.log(`🌀 Stored memory in SurrealDB for game ${gameId}`);
    } catch (e) {
        console.error("Failed to store graph memory:", e);
    }
}

export async function retrieveRelevantMemories(currentEmbedding, gameId, topK = 3) {
    if (!useTauri) {
        return fallbackRetrieve(currentEmbedding, gameId, topK);
    }
    try {
        const results = await invoke('graph_search_memory', {
            embedding: currentEmbedding,
            gameId: String(gameId),
            topK
        });
        // Map Rust output to match expected frontend format
        return results.map(r => ({
            id: r.id,
            text: r.text,
            role: r.role,
            score: r.score
        }));
    } catch (e) {
        console.error("Failed to search graph memory:", e);
        return [];
    }
}

export async function deleteGameMemories(gameId) {
    if (useTauri) {
        try {
            await invoke('graph_delete_game', { gameId: String(gameId) });
        } catch(e) {
            console.error("Failed to delete graph memories:", e);
        }
    }
}

export async function retrieveGlobalMemories(currentEmbedding, topK = 3) {
    if (!useTauri) {
        // Fallback: search all records without game filter
        const { akashicRecords, cosineSimilarity } = await import('./vector-memory.js');
        if (akashicRecords.length === 0) return [];
        const scored = akashicRecords.map(r => ({
            ...r,
            score: cosineSimilarity(currentEmbedding, r.embedding)
        }));
        return scored.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    try {
        const results = await invoke('graph_search_global', {
            embedding: currentEmbedding,
            topK
        });
        return results.map(r => ({
            id: r.id,
            text: r.text,
            role: r.role,
            score: r.score
        }));
    } catch (e) {
        console.error("Failed to search global memory:", e);
        return [];
    }
}
