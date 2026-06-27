/**
 * Menu Screen — Game Selector
 * Displays all game categories: Synapse, Linguistic, Roots, BHHCS, Crafts, Domains, Nature, Psychic
 */
import {
  getAllModules, allLinguisticGames, LINGUISTIC_LAYERS, getLayerEmoji,
  getSovereignCategories,
  allSynapseGames, allBhhcsGames, allRootsGames,
  allNatureGames, allCraftsGames, allDomainsGames, allPsychicGames,
  getBhhcsModules, getRootsModules,
} from '../data/games.js';

// ─── Tab Definitions ───
const TABS = [
  { id: 'synapse',    label: 'Synapse',    icon: '' },
  { id: 'linguistic', label: 'Linguistic', icon: '' },
  { id: 'roots',      label: 'Roots',      icon: '' },
  { id: 'bhhcs',      label: 'BHHCS',      icon: '' },
  { id: 'crafts',     label: 'Crafts',     icon: '' },
  { id: 'domains',    label: 'Domains',    icon: '' },
  { id: 'nature',     label: 'Nature',     icon: '' },
  { id: 'psychic',    label: 'Psychic',    icon: '' },
];

export function renderMenu(container, onStartGame) {
  const modules = getAllModules();
  const sovereignCats = getSovereignCategories();

  container.innerHTML = `
    <div class="scroll-container">
      <div class="scroll-edge-left"></div>
      <div class="scroll-edge-right"></div>

      <img src="logo.png" alt="MRHLG Logo" class="app-logo-splash" />

      <div class="ornate-header">
        <h1>The Eternal Chronicle</h1>
        <p class="subtitle">Select a Field of Consciousness to Remember your Journey</p>
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <!-- Tab Selector -->
      <div class="tab-selector" style="display:flex; justify-content:center; flex-wrap:wrap; gap:var(--space-sm); margin-bottom:var(--space-lg);">
        ${TABS.map((t, i) => `
          <button class="btn tab-btn ${i === 0 ? 'active btn--primary' : ''}" data-tab="${t.id}" id="tab-${t.id}">${t.icon ? t.icon + ' ' : ''}${t.label}</button>
        `).join('')}
        ${sovereignCats.map(cat => `
          <button class="btn tab-btn" data-tab="sov-${cat.id}" id="tab-sov-${cat.id}" title="${cat.description || cat.name}">${cat.icon} ${cat.name}</button>
        `).join('')}
      </div>

      <!-- Search -->
      <div class="search-bar" id="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Search games, modules, concepts..." id="search-input" />
      </div>

      <!-- ═══ SYNAPSE TAB ═══ -->
      <div id="synapse-tab" class="tab-content">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">Synapse Modules</h2>
        </div>
        <div class="module-grid" id="synapse-grid">
          ${modules.map(mod => renderModuleCard(mod)).join('')}
        </div>
      </div>

      <!-- ═══ LINGUISTIC TAB ═══ -->
      <div id="linguistic-tab" class="tab-content" style="display:none;">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">Linguistic Mapping</h2>
        </div>
        <div class="layer-filter" style="display:flex; flex-wrap:wrap; gap:var(--space-xs); margin-bottom:var(--space-lg); justify-content:center;">
          <button class="btn btn--small layer-filter-btn active" data-layer="all">All Layers</button>
          ${LINGUISTIC_LAYERS.map(l => `<button class="btn btn--small layer-filter-btn" data-layer="${l}">${l}</button>`).join('')}
        </div>
        <div class="module-grid" id="linguistic-grid">
          ${renderLinguisticGames(allLinguisticGames)}
        </div>
      </div>

      <!-- ═══ ROOTS TAB ═══ -->
      <div id="roots-tab" class="tab-content" style="display:none;">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">🌱 Roots — Future Figures & Silice</h2>
        </div>
        <div class="module-grid" id="roots-grid">
          ${renderSynapseStyleGames(allRootsGames, 'roots')}
        </div>
      </div>

      <!-- ═══ BHHCS TAB ═══ -->
      <div id="bhhcs-tab" class="tab-content" style="display:none;">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">🧬 Biomimetic Human-Harmonic Communication Systems</h2>
        </div>
        <div class="module-grid" id="bhhcs-grid">
          ${renderSynapseStyleGames(allBhhcsGames, 'bhhcs')}
        </div>
      </div>

      <!-- ═══ CRAFTS TAB ═══ -->
      <div id="crafts-tab" class="tab-content" style="display:none;">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">⚒️ Crafts — Harmonic Professions</h2>
        </div>
        <div class="module-grid" id="crafts-grid">
          ${renderV5Games(allCraftsGames, 'crafts')}
        </div>
      </div>

      <!-- ═══ DOMAINS TAB ═══ -->
      <div id="domains-tab" class="tab-content" style="display:none;">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">🌐 Domains — Applied Systems</h2>
        </div>
        <div class="module-grid" id="domains-grid">
          ${renderV5Games(allDomainsGames, 'domains')}
        </div>
      </div>

      <!-- ═══ NATURE TAB ═══ -->
      <div id="nature-tab" class="tab-content" style="display:none;">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">🌿 Nature — Grounded Practices</h2>
        </div>
        <div class="module-grid" id="nature-grid">
          ${renderV5Games(allNatureGames, 'nature')}
        </div>
      </div>

      <!-- ═══ PSYCHIC TAB ═══ -->
      <div id="psychic-tab" class="tab-content" style="display:none;">
        <div class="ornate-header" style="margin-top:var(--space-xl); margin-bottom:var(--space-md);">
          <h2 style="font-size:1.4rem;">🔮 Psychic Birthright</h2>
        </div>
        <div class="module-grid" id="psychic-grid">
          ${renderV5Games(allPsychicGames, 'psychic')}
        </div>
      </div>

      <!-- ═══ SOVEREIGN CATEGORY TABS ═══ -->
      ${sovereignCats.map(cat => `
        <div id="sov-${cat.id}-tab" class="tab-content" style="display:none;">
          <div class="module-grid">
            ${cat.games.length === 0 ? `
              <div style="grid-column:1/-1; text-align:center; padding:var(--space-2xl); color:var(--ink-faded); font-style:italic;">
                No games in this category yet. Go to ⚜️ Forge to add games.
              </div>
            ` : cat.games.map(g => renderSovereignCard(g, cat)).join('')}
          </div>
        </div>
      `).join('')}

      <div class="divider"><span class="divider-symbol">⊛</span></div>
    </div>
  `;

  // ─── Tab switching ───
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'btn--primary'));
      btn.classList.add('active', 'btn--primary');
      const tab = btn.dataset.tab;

      // Hide all tabs first
      container.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');

      // Show selected tab
      const el = document.getElementById(`${tab}-tab`);
      if (el) el.style.display = 'block';
    });
  });

  // Set default tab to Synapse
  const defaultTab = container.querySelector('#tab-synapse');
  if (defaultTab) {
    defaultTab.click();
  }

  // ─── Layer filter (Linguistic tab) ───
  container.querySelectorAll('.layer-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.layer-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const layer = btn.dataset.layer;
      const filtered = layer === 'all' ? allLinguisticGames : allLinguisticGames.filter(g => g.layer === layer);
      document.getElementById('linguistic-grid').innerHTML = renderLinguisticGames(filtered);
      bindLinguisticClicks(container, onStartGame);
    });
  });

  // ─── Module card expand/collapse (Synapse) ───
  container.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.game-item')) return;
      const gameList = card.querySelector('.game-list');
      if (gameList) {
        gameList.style.display = gameList.style.display === 'none' ? '' : 'none';
      }
    });
  });

  // ─── Game item clicks (synapse) ───
  container.querySelectorAll('.game-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.synapseId);
      onStartGame(id, 'synapse');
    });
  });

  // ─── Game item clicks (linguistic) ───
  bindLinguisticClicks(container, onStartGame);

  // ─── Generic card clicks (v5 categories) ───
  container.querySelectorAll('.generic-game-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.gameId;
      const type = card.dataset.gameType;
      onStartGame(id, type.toLowerCase());
    });
  });

  // ─── Synapse-style card clicks (BHHCS, Roots) ───
  container.querySelectorAll('.synapse-style-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.gameId;
      const type = card.dataset.gameType;
      onStartGame(id, type);
    });
  });

  // ─── Sovereign game card clicks ───
  container.querySelectorAll('.sovereign-game-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.gameId;
      onStartGame(id, 'sovereign');
    });
  });

  // ─── Search ───
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    filterGames(container, q);
  });
}

function bindLinguisticClicks(container, onStartGame) {
  container.querySelectorAll('.linguistic-game-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.gameId;
      onStartGame(id, 'linguistic');
    });
  });
}

function filterGames(container, query) {
  // Filter synapse modules: check each game-item individually
  container.querySelectorAll('.module-card').forEach(card => {
    const gameList = card.querySelector('.game-list');
    const gameItems = card.querySelectorAll('.game-item');
    const headerText = card.querySelector('.module-card-title')?.textContent.toLowerCase() || '';
    const descText = card.querySelector('.module-card-desc')?.textContent.toLowerCase() || '';

    if (!query) {
      card.style.display = '';
      if (gameList) gameList.style.display = 'none';
      gameItems.forEach(item => item.style.display = '');
      return;
    }

    let anyGameMatch = false;
    gameItems.forEach(item => {
      const itemText = item.textContent.toLowerCase();
      const matches = itemText.includes(query);
      item.style.display = matches ? '' : 'none';
      if (matches) anyGameMatch = true;
    });

    const headerMatches = headerText.includes(query) || descText.includes(query);

    if (anyGameMatch) {
      card.style.display = '';
      if (gameList) gameList.style.display = '';
    } else if (headerMatches) {
      card.style.display = '';
      if (gameList) gameList.style.display = 'none';
      gameItems.forEach(item => item.style.display = '');
    } else {
      card.style.display = 'none';
    }
  });

  // Filter linguistic games
  container.querySelectorAll('.linguistic-game-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(query) ? '' : 'none';
  });

  // Filter all generic & synapse-style cards
  container.querySelectorAll('.generic-game-card, .synapse-style-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(query) ? '' : 'none';
  });

  // Filter sovereign cards
  container.querySelectorAll('.sovereign-game-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(query) ? '' : 'none';
  });
}

// ─── Render Functions ───

function renderModuleCard(mod) {
  return `
    <div class="parchment-card module-card" data-module="${mod.id}">
      <div class="module-card-header">
        <div class="wax-seal">${mod.icon}</div>
        <div>
          <div class="module-card-title">${mod.name}</div>
          <div class="module-card-meta">${mod.gameCount} quests available</div>
        </div>
      </div>
      <p class="module-card-desc">${mod.description}</p>
      <ul class="game-list" style="display:none;">
        ${mod.games.map(g => `
          <li class="game-item" data-synapse-id="${g.synapse_id}">
            <span class="game-item-id">SYN-${g.synapse_id}</span>
            <div>
              <div class="game-item-title">${g.game}</div>
              <div class="game-item-roles">${g.human_role?.split('(')[0] || ''}</div>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderLinguisticGames(games) {
  return games.map(g => `
    <div class="parchment-card linguistic-game-card" data-game-id="${g.id}" style="cursor:pointer;">
      <div class="module-card-header">
        <div class="wax-seal wax-seal--gold">${getLayerEmoji(g.layer)}</div>
        <div>
          <div class="module-card-title">${g.title}</div>
          <div class="module-card-meta">
            <span class="layer-tag layer-tag--${g.layer.toLowerCase()}">${g.layer}</span>
            ${g.id}
          </div>
        </div>
      </div>
      <p class="module-card-desc" style="margin-top:var(--space-sm);">
        <strong style="color:var(--ink-brown);">${g.legacy_spanish_word}</strong> → 
        <em>${g.new_kernel_concept}</em>
      </p>
      <p style="font-size:0.85rem; color:var(--ink-faded); margin-top:var(--space-xs);">
        ${g.quest_objective}
      </p>
    </div>
  `).join('');
}

/**
 * Renders synapse-style JSON games (BHHCS, Roots) that have synapse_id, module, game, human_role, ai_role, mechanic
 */
function renderSynapseStyleGames(games, gameType) {
  // Group by module
  const moduleMap = new Map();
  games.forEach(g => {
    if (!moduleMap.has(g.module)) {
      moduleMap.set(g.module, []);
    }
    moduleMap.get(g.module).push(g);
  });

  const icons = {
    bhhcs: '🧬',
    roots: '🌱',
  };
  const baseIcon = icons[gameType] || '🔮';

  const iconsList = ['🌿', '🍃', '🌸', '🌲', '🌵', '🌺', '🌳', '🌻', '🌴', '🍄', '🌷', '🍁', '🍀', '🎋', '🌾', '🌱', '🌍', '🌋', '🌊', '🌪️', '🔥', '💧', '☀️', '🌕', '🌟', '🌌', '🌠', '🧬', '🔬', '🔭', '📡', '💡', '⚙️', '⚖️', '🔮', '🧿', '🪬', '🗝️', '🛡️', '⚔️', '🏹', '🎨', '🎭', '🎼', '🧩'];
  
  let html = '';
  let modIdx = 0;
  for (const [moduleName, moduleGames] of moduleMap) {
    const modIcon = gameType === 'roots' 
      ? iconsList[modIdx % iconsList.length] 
      : gameType === 'bhhcs' ? iconsList[(modIdx + 27) % iconsList.length] : baseIcon;
      
    html += `
      <div class="parchment-card" style="grid-column: 1 / -1;">
        <div class="module-card-header" style="margin-bottom: var(--space-sm);">
          <div class="wax-seal wax-seal--gold">${modIcon}</div>
          <div>
            <div class="module-card-title">${moduleName}</div>
            <div class="module-card-meta">${moduleGames.length} games</div>
          </div>
        </div>
        <div class="module-grid" style="margin-top: var(--space-md);">
          ${moduleGames.map(g => `
            <div class="parchment-card synapse-style-card" data-game-id="${g.synapse_id}" data-game-type="${gameType}" style="cursor:pointer;">
              <div class="module-card-header">
                <div class="wax-seal wax-seal--gold">${g.icon || modIcon}</div>
                <div>
                  <div class="module-card-title">${g.game}</div>
                  <div class="module-card-meta">
                    <span class="layer-tag layer-tag--${gameType}">${gameType.toUpperCase()}</span>
                    #${g.synapse_id}
                  </div>
                </div>
              </div>
              <p class="module-card-desc" style="margin-top:var(--space-sm); font-size:0.85rem;">
                ${g.human_role ? `<em>${g.human_role.split('(')[0]}</em>` : ''}
              </p>
              <p style="font-size:0.8rem; color:var(--ink-faded); margin-top:var(--space-xs);">
                ${g.mechanic || ''}
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    modIdx++;
  }
  return html;
}

/**
 * Renders V5 expansion games (Nature, Crafts, Domains, Psychic) with concept/role/domain info
 */
function renderV5Games(games, gameType) {
  return games.map(g => `
    <div class="parchment-card generic-game-card" data-game-id="${g.id}" data-game-type="${gameType}" style="cursor:pointer;">
      <div class="module-card-header">
        <div class="wax-seal wax-seal--gold">${g.icon || '🔮'}</div>
        <div>
          <div class="module-card-title">${g.title}</div>
          <div class="module-card-meta">
            <span class="layer-tag layer-tag--${gameType}">${gameType.toUpperCase()}</span>
            ${g.id}
          </div>
        </div>
      </div>
      <p class="module-card-desc" style="margin-top:var(--space-sm);">
        ${g.concept ? `<strong style="color:var(--ink-brown);">${g.concept}</strong><br>` : ''}
        ${g.role ? `<em>Role: ${g.role}</em><br>` : ''}
        ${g.domain ? `<em>Domain: ${g.domain}</em><br>` : ''}
        ${g.meaning || g.focus || ''}
      </p>
      <p style="font-size:0.85rem; color:var(--ink-faded); margin-top:var(--space-xs);">
        ${g.objective}
      </p>
    </div>
  `).join('');
}

function renderSovereignCard(game, cat) {
  const title = game.title || game.game || game.id;
  const desc = game.objective || game.meaning || game.mechanic || '';
  return `
    <div class="parchment-card sovereign-game-card" data-game-id="${game.id}" style="cursor:pointer;">
      <div class="module-card-header">
        <div class="wax-seal wax-seal--gold">${game.icon || cat.icon || '🎮'}</div>
        <div>
          <div class="module-card-title">${title}</div>
          <div class="module-card-meta">
            <span class="layer-tag layer-tag--sovereign">SOVEREIGN</span>
            ${game.id}
          </div>
        </div>
      </div>
      ${game.concept ? `<p style="margin-top:var(--space-xs);"><strong style="color:var(--ink-brown);">${game.concept}</strong></p>` : ''}
      ${game.legacy_spanish_word ? `
        <p style="margin-top:var(--space-xs);">
          <strong style="color:var(--ink-brown);">${game.legacy_spanish_word}</strong> →
          <em>${game.new_kernel_concept || ''}</em>
        </p>
      ` : ''}
      <p class="module-card-desc" style="margin-top:var(--space-xs);">${desc}</p>
    </div>
  `;
}
