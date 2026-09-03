/**
 * Concept Extractor Service
 * Extracts key concepts and relationships from dialogue using the LLM,
 * then stores them in SurrealDB via Tauri to power the Brystal GraphRAG visualization.
 */

import { invoke } from '@tauri-apps/api/core';
import { chat } from './ollama.js';

const EXTRACTION_PROMPT = `You are a knowledge graph extraction engine. Analyze the following dialogue between a human and AI, and extract:
1. Key concepts (nouns, ideas, themes, metaphors, abstract notions)
2. Relationships between those concepts

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"concepts": [{"name": "ConceptName", "description": "Brief description"}], "relations": [{"from": "ConceptA", "to": "ConceptB", "strength": 0.8}]}

Rules:
- Concept names should be short (1-3 words), capitalized
- Extract 2-5 concepts maximum
- Relations strength is 0.0-1.0
- Only create relations between concepts you extracted
- If no meaningful concepts found, return: {"concepts": [], "relations": []}`;

/**
 * Extract concepts from a dialogue turn and store them in SurrealDB.
 * This runs asynchronously without blocking the chat UI.
 * @param {string} humanText - The human's message
 * @param {string} aiText - The AI's response
 * @param {string} memoryId - The SurrealDB memory record ID (e.g. "memory:abc123")
 */
export async function extractAndStoreConcepts(humanText, aiText, memoryId) {
    if (!window.__TAURI_INTERNALS__) return;
    
    try {
        const dialogueSnippet = `Human: ${humanText}\nAI: ${aiText}`;
        
        const messages = [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: dialogueSnippet }
        ];

        const response = await chat(messages);
        
        if (!response) {
            console.warn('🧠 Concept extraction: empty LLM response');
            return;
        }

        // Try to parse JSON from the response (LLM might wrap it in markdown code blocks)
        let jsonStr = response.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }
        
        const extracted = JSON.parse(jsonStr);
        
        if (!extracted.concepts || extracted.concepts.length === 0) {
            console.log('🧠 No concepts extracted from this turn');
            return;
        }

        // Strip the "memory:" prefix if present to get just the record ID part
        const cleanMemoryId = memoryId.replace(/^memory:/, '');

        await invoke('graph_store_concepts', {
            memoryId: cleanMemoryId,
            concepts: extracted.concepts,
            relations: extracted.relations || []
        });

        console.log(`🧠 Extracted ${extracted.concepts.length} concepts, ${(extracted.relations || []).length} relations`);
    } catch (error) {
        // Don't let extraction errors break the chat flow
        console.warn('🧠 Concept extraction failed (non-critical):', error.message);
    }
}
