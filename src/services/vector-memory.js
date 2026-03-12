// In-memory Akashic Record (You can later save this to localStorage or IndexedDB)
export const akashicRecords = [];

/**
 * Calculates how similar two thoughts are (Cosine Similarity).
 * 1.0 = Exact match, 0.0 = Completely unrelated.
 */
export function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Saves a message and its vector into the Record.
 */
export function storeVector(text, embedding, role, gameId) {
    akashicRecords.push({
        id: Date.now(),
        gameId,
        role,
        text,
        embedding
    });
    console.log(`🌀 Stored new memory vector. Total records: ${akashicRecords.length}`);
}

/**
 * Finds the top most relevant past thoughts based on the current prompt.
 */
export function retrieveRelevantMemories(currentEmbedding, gameId, topK = 3) {
    // Filter records for the current session/game
    const sessionRecords = akashicRecords.filter(r => r.gameId === gameId);
    if (sessionRecords.length === 0) return [];

    // Calculate resonance (similarity) for each past thought
    const scoredRecords = sessionRecords.map(record => ({
        ...record,
        score: cosineSimilarity(currentEmbedding, record.embedding)
    }));

    // Sort by highest resonance and return the top K results
    return scoredRecords
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}
