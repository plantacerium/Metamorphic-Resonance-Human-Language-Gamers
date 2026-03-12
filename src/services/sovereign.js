/**
 * Sovereign Service — Self Sovereign Game Engine
 * Manages custom schemas, categories, topics, and games
 * All data persisted in localStorage for full user sovereignty
 */

const KEYS = {
  SCHEMA: 'mhlg_sovereign_schema',
  CATEGORIES: 'mhlg_sovereign_categories',
  HIDDEN_BUILTIN: 'mhlg_hidden_builtin', // Set of game IDs to hide
};

// ─── Default Schema (matches the project's template.json) ───
const DEFAULT_SCHEMA = {
  name: 'MHLG Default Schema',
  version: '1.0',
  fields: [
    { key: 'id', label: 'Game ID', type: 'string', required: true, placeholder: 'CUSTOM_001' },
    { key: 'title', label: 'Game Title', type: 'string', required: true, placeholder: 'The Sovereign Mind' },
    { key: 'layer', label: 'Layer / Category', type: 'string', required: false, placeholder: 'Nature' },
    { key: 'icon', label: 'Icon (Emoji)', type: 'string', required: false, placeholder: '🌿' },
    { key: 'concept', label: 'Core Concept', type: 'string', required: false, placeholder: 'Forest Bathing' },
    { key: 'meaning', label: 'Meaning', type: 'text', required: false, placeholder: 'Describe the deeper meaning...' },
    { key: 'objective', label: 'Quest Objective', type: 'text', required: true, placeholder: 'What the player should achieve...' },
    { key: 'human_role', label: 'Human Role', type: 'text', required: false, placeholder: 'The role the human plays...' },
    { key: 'ai_role', label: 'AI Role', type: 'text', required: false, placeholder: 'The role the AI plays...' },
    { key: 'mechanic', label: 'Game Mechanic', type: 'string', required: false, placeholder: 'Sensory Immersion' },
    { key: 'legacy_spanish_word', label: 'Legacy Word', type: 'string', required: false, placeholder: 'Target word to transmute' },
    { key: 'new_kernel_concept', label: 'Kernel Concept', type: 'string', required: false, placeholder: 'Replacement concept' },
    { key: 'ollama_system_prompt', label: 'AI System Prompt', type: 'text', required: false, placeholder: 'Instructions for the AI...' },
  ],
};

// ─────────── Schema CRUD ───────────

export function getSchema() {
  try {
    const stored = localStorage.getItem(KEYS.SCHEMA);
    return stored ? JSON.parse(stored) : DEFAULT_SCHEMA;
  } catch {
    return DEFAULT_SCHEMA;
  }
}

export function saveSchema(schema) {
  localStorage.setItem(KEYS.SCHEMA, JSON.stringify(schema));
}

export function resetSchema() {
  localStorage.removeItem(KEYS.SCHEMA);
  return DEFAULT_SCHEMA;
}

/**
 * Parse an uploaded schema JSON.
 * Accepts two formats:
 *   1. Full schema: { name, version, fields: [...] }
 *   2. Template object: { id: "...", title: "...", ... } → auto-generates schema fields
 */
export function parseUploadedSchema(jsonString) {
  const parsed = JSON.parse(jsonString);

  // Format 1: already a schema with `fields` array
  if (parsed.fields && Array.isArray(parsed.fields)) {
    return {
      name: parsed.name || 'Custom Schema',
      version: parsed.version || '1.0',
      fields: parsed.fields.map(f => ({
        key: f.key,
        label: f.label || f.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: f.type || 'string',
        required: f.required || false,
        placeholder: f.placeholder || '',
      })),
    };
  }

  // Format 2: template object → auto-generate fields from keys
  const fields = Object.entries(parsed).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    type: typeof value === 'string' && value.length > 60 ? 'text' : 'string',
    required: ['id', 'title'].includes(key),
    placeholder: typeof value === 'string' ? value : String(value),
  }));

  return {
    name: 'Imported Schema',
    version: '1.0',
    fields,
  };
}

// ─────────── Categories CRUD ───────────

export function getCategories() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || '[]');
  } catch {
    return [];
  }
}

function _saveCategories(categories) {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

export function createCategory(name, icon = '🔮', description = '') {
  const categories = getCategories();
  const category = {
    id: `sov_cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    icon,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    games: [],
  };
  categories.push(category);
  _saveCategories(categories);
  return category;
}

export function updateCategory(categoryId, updates) {
  const categories = getCategories();
  const idx = categories.findIndex(c => c.id === categoryId);
  if (idx < 0) return null;
  categories[idx] = {
    ...categories[idx],
    ...updates,
    id: categoryId, // protect id
    updatedAt: new Date().toISOString(),
  };
  _saveCategories(categories);
  return categories[idx];
}

export function deleteCategory(categoryId) {
  const categories = getCategories().filter(c => c.id !== categoryId);
  _saveCategories(categories);
}

export function getCategory(categoryId) {
  return getCategories().find(c => c.id === categoryId) || null;
}

// ─────────── Games CRUD (within a category) ───────────

export function addGame(categoryId, gameData) {
  const categories = getCategories();
  let cat = categories.find(c => c.id === categoryId);
  
  // If it's a built-in category and no shadow exists, create it
  if (!cat && categoryId.startsWith('_')) {
    cat = ensureShadowCategory(categoryId);
    // Refresh categories list
    return addGame(categoryId, gameData); 
  }
  
  if (!cat) return null;

  const game = {
    ...gameData,
    id: gameData.id || `sov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    _categoryId: categoryId,
    _sovereign: true,
    createdAt: new Date().toISOString(),
  };

  cat.games.push(game);
  cat.updatedAt = new Date().toISOString();
  _saveCategories(categories);
  return game;
}

export function updateGame(categoryId, gameId, updates) {
  const categories = getCategories();
  let cat = categories.find(c => c.id === categoryId);
  
  if (!cat && categoryId.startsWith('_')) {
    cat = ensureShadowCategory(categoryId);
    // Continue below, cat is now available in this session (though we need to refresh categories list)
    const freshCategories = getCategories();
    cat = freshCategories.find(c => c.id === categoryId);
  }

  if (!cat) return null;

  const idx = cat.games.findIndex(g => String(g.id) === String(gameId) || String(g.synapse_id) === String(gameId));
  if (idx < 0 && categoryId.startsWith('_')) {
    // If we are "overriding" a built-in for the first time
    return addGame(categoryId, updates);
  }
  if (idx < 0) return null;

  cat.games[idx] = {
    ...cat.games[idx],
    ...updates,
    id: gameId, // protect id
    _categoryId: categoryId,
    _sovereign: true,
  };
  cat.updatedAt = new Date().toISOString();
  _saveCategories(categories);
  return cat.games[idx];
}

export function deleteGame(categoryId, gameId) {
  const categories = getCategories();
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return;

  cat.games = cat.games.filter(g => g.id !== gameId);
  cat.updatedAt = new Date().toISOString();
  _saveCategories(categories);
}

export function getGame(categoryId, gameId) {
  const cat = getCategory(categoryId);
  if (!cat) return null;
  return cat.games.find(g => g.id === gameId) || null;
}

// ─────────── Universal Sovereign Game Lookup ───────────

export function getSovereignGameById(gameId) {
  const categories = getCategories();
  for (const cat of categories) {
    const game = cat.games.find(g => g.id === gameId);
    if (game) return { ...game, _categoryName: cat.name, _categoryIcon: cat.icon };
  }
  return null;
}

export function getAllSovereignGames() {
  const categories = getCategories();
  const allGames = [];
  for (const cat of categories) {
    for (const game of cat.games) {
      allGames.push({ ...game, _categoryName: cat.name, _categoryIcon: cat.icon });
    }
  }
  return allGames;
}

// ─────────── Import / Export ───────────

export function exportAllData() {
  return JSON.stringify({
    schema: getSchema(),
    categories: getCategories(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }, null, 2);
}

export function importAllData(jsonString) {
  const data = JSON.parse(jsonString);
  if (data.schema) saveSchema(data.schema);
  if (data.categories && Array.isArray(data.categories)) {
    _saveCategories(data.categories);
  }
  return data;
}


/**
 * Import games from a JSON array (e.g. the existing game JSONs)
 * into a specific category
 */
export function importGamesIntoCategory(categoryId, gamesJson) {
  const games = JSON.parse(gamesJson);
  if (!Array.isArray(games)) throw new Error('Expected a JSON array of games');

  const results = [];
  for (const g of games) {
    const game = addGame(categoryId, g);
    if (game) results.push(game);
  }
  return results;
}

// ─────────── Shadowing / Overriding Built-in Data ───────────

/**
 * Marks a built-in game as hidden
 */
export function hideBuiltinGame(gameId) {
  try {
    const hidden = JSON.parse(localStorage.getItem(KEYS.HIDDEN_BUILTIN) || '[]');
    if (!hidden.includes(gameId)) {
      hidden.push(gameId);
      localStorage.setItem(KEYS.HIDDEN_BUILTIN, JSON.stringify(hidden));
    }
  } catch (e) {
    console.error('Error hiding builtin:', e);
  }
}

/**
 * Checks if a built-in game is hidden
 */
export function isBuiltinHidden(gameId) {
  try {
    const hidden = JSON.parse(localStorage.getItem(KEYS.HIDDEN_BUILTIN) || '[]');
    return hidden.includes(gameId);
  } catch {
    return false;
  }
}

/**
 * Unhides a previously hidden built-in game
 */
export function unhideBuiltinGame(gameId) {
  try {
    let hidden = JSON.parse(localStorage.getItem(KEYS.HIDDEN_BUILTIN) || '[]');
    hidden = hidden.filter(id => id !== gameId);
    localStorage.setItem(KEYS.HIDDEN_BUILTIN, JSON.stringify(hidden));
  } catch (e) {
    console.error('Error unhiding builtin:', e);
  }
}

/**
 * Gets all sovereign "extensions" (additional games) for a built-in category
 */
export function getBuiltinExtensions(categoryId) {
  const cat = getCategory(categoryId); // Category might exist in sov storage with built-in ID
  return cat ? cat.games : [];
}

/**
 * Ensures a "Shadow Category" exists for a built-in ID so we can add games to it
 */
export function ensureShadowCategory(categoryId, name, icon) {
  let cat = getCategory(categoryId);
  if (!cat) {
    const categories = getCategories();
    cat = {
      id: categoryId,
      name: name || `Shadow ${categoryId}`,
      icon: icon || '👤',
      description: `Extended games for ${name || categoryId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      games: [],
      _isShadow: true,
    };
    categories.push(cat);
    _saveCategories(categories);
  }
  return cat;
}
