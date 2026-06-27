import linguisticGames from './linguistic-mapping-games.json';
import biomimeticGames from './biomimetic-language.json';
import futureFiguresGames from './future-figures-projected.json';
import siliceGames from './silice-language.json';
import learners1 from './language-gamers-learners-1-12.json';
import learners13 from './language-gamers-learners-13-24.json';
import learners25 from './language-gamers-learners-25-36.json';
import learners37 from './language-gamers-learners-37-48.json';
import learners49 from './language-gamers-learners-49-60.json';
import learners61 from './language-gamers-learners-61-72.json';
import learners73 from './language-gamers-learners-73-84.json';
import learners85 from './language-gamers-learners-85-96.json';
import learners97 from './language-gamers-learners-97-108.json';
import learners109 from './language-gamers-learners-109-120.json';
import learners121 from './language-gamers-learners-121-132.json';
import learners133 from './language-gamers-learners-133-144.json';
import learners147 from './language-gamers-learners-147-154.json';
import learners153 from './language-gamers-learners-153-156.json';
import learners157 from './language-gamers-learners-157-164.json';
import learners165 from './language-gamers-learners-165-172.json';
import learners173 from './language-gamers-learners-173-180.json';
import learners181 from './language-gamers-learners-181-188.json';
import learners189 from './language-gamers-learners-189-196.json';
import learners197 from './language-gamers-learners-197-204.json';
import learners205 from './language-gamers-learners-205-212.json';
import learners213 from './language-gamers-learners-213-220.json';
import learners221 from './language-gamers-learners-221-228.json';
import learners229 from './language-gamers-learners-229-236.json';
import learners237 from './language-gamers-learners-237-240.json';
import learnersExpansion from './language-gamers-learners-expansion.json';
import { GROUNDED_PRACTICES, PROFESSION_SCENARIOS, DOMAIN_SCENARIOS, PSYCHIC_BIRTHRIGHT, getV5GameById } from './v5_expansion.js';
import { getSovereignGameById, getCategories as getSovereignCategories } from '../services/sovereign.js';

// ─── Synapse Games (language-gamers-learners-*.json) ───
export const allSynapseGames = [
  ...learners1, ...learners13, ...learners25, ...learners37,
  ...learners49, ...learners61, ...learners73, ...learners85,
  ...learners97, ...learners109, ...learners121, ...learners133,
  ...learners147, ...learners153, ...learners157, ...learners165,
  ...learners173, ...learners181, ...learners189, ...learners197,
  ...learners205, ...learners213, ...learners221, ...learners229,
  ...learners237, ...learnersExpansion
];

// Build unique modules from synapse games
export const MODULES = (() => {
  const moduleMap = new Map();
  allSynapseGames.forEach(g => {
    const mod = g.module;
    if (!moduleMap.has(mod)) {
      moduleMap.set(mod, { ids: [] });
    }
    moduleMap.get(mod).ids.push(g.synapse_id);
  });
  const moduleList = [];
  let idx = 0;
  const icons = ['🧠', '🔮', '⚡', '🌀', '🎯', '💡', '🔬', '🎭', '🌊', '🏛️', '📡', '🎲', '🧬', '🌌', '🔥', '🛡️', '⚛️', '🌿', '📐', '🎨'];
  for (const [name, data] of moduleMap) {
    const minId = Math.min(...data.ids);
    const maxId = Math.max(...data.ids);
    moduleList.push({
      id: `synapse_mod_${idx}`,
      name,
      icon: icons[idx % icons.length],
      description: `${name} module (${data.ids.length} games)`,
      range: [minId, maxId],
    });
    idx++;
  }
  return moduleList;
})();

// ─── Linguistic Games ───
export const allLinguisticGames = linguisticGames;

export const LINGUISTIC_LAYERS = [
  'Sanskrit', 'Quantum', 'Chinese', 'Japanese', 'German', 'French', 'English', 'Spanish', 'Yoruba'
];

// ─── BHHCS Games (biomimetic-language.json) ───
export const allBhhcsGames = biomimeticGames;

// ─── Roots Games (future-figures-projected.json + silice-language.json) ───
export const allRootsGames = [...futureFiguresGames, ...siliceGames];

// ─── V5 Expansion Categories ───
export const allNatureGames = GROUNDED_PRACTICES;
export const allCraftsGames = PROFESSION_SCENARIOS;
export const allDomainsGames = DOMAIN_SCENARIOS;
export const allPsychicGames = PSYCHIC_BIRTHRIGHT;

// ─── All V5 Games combined ───
export const allV5Games = [...GROUNDED_PRACTICES, ...PROFESSION_SCENARIOS, ...DOMAIN_SCENARIOS, ...PSYCHIC_BIRTHRIGHT];

// ─── Lookups ───

export function getGameById(id) {
  // 1. Check V5 string ID
  const v5Match = getV5GameById(id);
  if (v5Match) return v5Match;

  // 2. Check sovereign custom games
  const sovMatch = getSovereignGameById(id);
  if (sovMatch) return sovMatch;

  // 3. Check BHHCS games
  const bhhcsMatch = allBhhcsGames.find(g => String(g.synapse_id) === String(id));
  if (bhhcsMatch) return { ...bhhcsMatch, icon: '🧬', title: bhhcsMatch.game, layer: 'BHHCS' };

  // 4. Check Roots games
  const rootsMatch = allRootsGames.find(g => String(g.synapse_id) === String(id));
  if (rootsMatch) return { ...rootsMatch, icon: '🌱', title: rootsMatch.game, layer: 'ROOTS' };

  // 5. Synapse (numeric legacy ID)
  const numericId = parseInt(id);
  const synapseMatch = allSynapseGames.find(g => g.synapse_id === numericId);
  if (synapseMatch) {
    const mod = MODULES.find(m => m.name === synapseMatch.module);
    return { ...synapseMatch, icon: mod ? mod.icon : '🔮', title: synapseMatch.game };
  }
  return null;
}

export function getGamesByModule(moduleId) {
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return [];
  return allSynapseGames.filter(g => g.module === mod.name);
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

// Universal searcher
export function getAnyGameById(id) {
  // Numeric => Synapse
  if (!isNaN(id)) {
    return allSynapseGames.find(g => g.synapse_id === parseInt(id));
  }
  // V5 expansion
  const v5Match = getV5GameById(id);
  if (v5Match) return v5Match;
  // Sovereign custom
  return getSovereignGameById(id);
}

// Get unique modules from BHHCS games
export function getBhhcsModules() {
  const moduleMap = new Map();
  allBhhcsGames.forEach(g => {
    if (!moduleMap.has(g.module)) {
      moduleMap.set(g.module, []);
    }
    moduleMap.get(g.module).push(g);
  });
  return Array.from(moduleMap.entries()).map(([name, games]) => ({ name, games }));
}

// Get unique modules from Roots games
export function getRootsModules() {
  const moduleMap = new Map();
  allRootsGames.forEach(g => {
    if (!moduleMap.has(g.module)) {
      moduleMap.set(g.module, []);
    }
    moduleMap.get(g.module).push(g);
  });
  return Array.from(moduleMap.entries()).map(([name, games]) => ({ name, games }));
}

export { getSovereignCategories };