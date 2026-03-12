import linguisticGames from './linguistic-mapping-games.json';
import { getSovereignGameById, getCategories as getSovereignCategories } from '../services/sovereign.js';

export const allSynapseGames = [];

export const allLinguisticGames = linguisticGames;

export const allV5Games = [];

export const MODULES = [];

export const LINGUISTIC_LAYERS = [
  'Sanskrit', 'Quantum', 'Chinese', 'Japanese', 'German', 'French', 'English', 'Spanish', 'Yoruba'
];

export function getGameById(id) {
  // 1. Check if it's a V5 string ID first
  const v5Match = allV5Games.find(g => g.id === id);
  if (v5Match) return v5Match;

  // 2. Check sovereign custom games
  const sovMatch = getSovereignGameById(id);
  if (sovMatch) return sovMatch;

  // 3. Otherwise, treat as numeric legacy ID
  const numericId = parseInt(id);
  const synapseMatch = allSynapseGames.find(g => g.synapse_id === numericId);
  if (synapseMatch) {
    const mod = MODULES.find(m => numericId >= m.range[0] && numericId <= m.range[1]);
    return { ...synapseMatch, icon: mod ? mod.icon : '🔮' };
  }
  return null;
}

export function getGamesByModule(moduleId) {
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return [];
  return allSynapseGames.filter(g => g.synapse_id >= mod.range[0] && g.synapse_id <= mod.range[1]);
}

export function getLinguisticGameById(id) {
  const game = allLinguisticGames.find(g => g.id === id);
  if (game) {
    return { ...game, icon: getLayerEmoji(game.layer) };
  }
  return game;
}

export function getLinguisticGamesByLayer(layer) {
  return allLinguisticGames.filter(g => g.layer.toLowerCase().includes(layer.toLowerCase()));
}

export function getAllModules() {
  return MODULES.map(mod => ({
    ...mod,
    games: getGamesByModule(mod.id),
    gameCount: getGamesByModule(mod.id).length,
  }));
}

export function getLayerEmoji(layer) {
  const map = {
    'Sanskrit': '🕉️',
    'Chinese': '☯️',
    'Japanese': '🎌',
    'Quantum': '⚛️',
    'German': '🏛️',
    'French': '🌊',
    'English': '🌐',
    'Spanish': '🌞',
    'Yoruba': '🏹',
  };
  return map[layer] || '🔮';
}

// 3. Create a Universal Searcher that checks both the old and new data
export function getAnyGameById(id) {
  // If the id is a number (or a string that is just digits), look in Synapse Games
  if (!isNaN(id)) {
    return allSynapseGames.find(g => g.synapse_id === parseInt(id));
  }

  // Check V5 expansion
  const v5Match = allV5Games.find(g => g.id === id);
  if (v5Match) return v5Match;

  // Check sovereign custom games
  return getSovereignGameById(id);
}

// 4. Get all sovereign categories (for menu integration)
export { getSovereignCategories };