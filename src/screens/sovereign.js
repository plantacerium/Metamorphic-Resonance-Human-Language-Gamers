/**
 * Sovereign Screen — Self Sovereign Game Creator
 * Upload schemas, manage categories/topics, create games
 */
import * as sovereign from '../services/sovereign.js';
import { getAllModules, allSynapseGames, allLinguisticGames } from '../data/games.js';

let currentView = 'overview'; // 'overview' | 'category' | 'game-editor'
let currentCategoryId = null;
let currentGameId = null;
let onNavigateToGame = null;
let expandedBuiltinId = null; // Local state for inline expansion

export function renderSovereign(container, onStartGame) {
  onNavigateToGame = onStartGame;
  renderView(container);
}

function renderView(container) {
  container.className = 'tab-content-fade'; // Add entry animation
  switch (currentView) {
    case 'overview':
      renderOverview(container);
      break;
    case 'category':
      renderCategoryDetail(container, currentCategoryId);
      break;
    case 'game-editor':
      renderGameEditor(container, currentCategoryId, currentGameId);
      break;
    default:
      renderOverview(container);
  }
}

// ═══════════════════════════════════════════════
//  OVERVIEW — Schema + Categories List
// ═══════════════════════════════════════════════

function renderOverview(container) {
  const schema = sovereign.getSchema();
  const categories = sovereign.getCategories();
  const totalGames = categories.reduce((sum, c) => sum + c.games.length, 0);

  container.innerHTML = `
      <!-- Stats Bar -->
      <div class="sov-stats-bar" id="sov-stats">
        <div class="sov-stat">
          <span class="sov-stat-value">${categories.length}</span>
          <span class="sov-stat-label">Categories</span>
        </div>
        <div class="sov-stat">
          <span class="sov-stat-value">${totalGames}</span>
          <span class="sov-stat-label">Games</span>
        </div>
        <div class="sov-stat">
          <span class="sov-stat-value">${schema.fields.length}</span>
          <span class="sov-stat-label">Schema Fields</span>
        </div>
      </div>

      <!-- Schema Section -->
      <div class="parchment-card sov-section" id="schema-section">
        <div class="sov-section-header">
          <div class="sov-section-title">
            <span class="sov-section-icon">📜</span>
            <div>
              <h3>Game Schema</h3>
              <p class="sov-section-sub">${schema.name} v${schema.version} · ${schema.fields.length} fields</p>
            </div>
          </div>
          <div class="sov-section-actions">
            <button class="btn btn--small" id="upload-schema-btn" title="Upload schema">📤 Upload Schema</button>
            <button class="btn btn--small" id="reset-schema-btn" title="Reset to default">↺ Reset</button>
          </div>
        </div>
        <input type="file" id="schema-file-input" accept=".json" style="display:none;" />
        <div class="sov-schema-preview" id="schema-preview">
          ${schema.fields.map(f => `
            <div class="sov-schema-field ${f.required ? 'sov-schema-field--required' : ''}">
              <span class="sov-field-key">${f.key}</span>
              <span class="sov-field-type">${f.type}</span>
              ${f.required ? '<span class="sov-field-badge">required</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <!-- Categories Section -->
      <div class="sov-section">
        <div class="sov-section-header">
          <div class="sov-section-title">
            <span class="sov-section-icon">📚</span>
            <div>
              <h3>Your Categories</h3>
              <p class="sov-section-sub">Organize your custom games into categories</p>
            </div>
          </div>
          <button class="btn btn--primary btn--small" id="create-category-btn">+ New Category</button>
        </div>

        ${categories.length === 0 ? `
          <div class="sov-empty-state">
            <div class="sov-empty-icon">🏗️</div>
            <p>No categories yet. Create your first one to start building!</p>
          </div>
        ` : `
          <div class="sov-category-grid" id="category-grid">
            ${categories.map(cat => renderCategoryCard(cat)).join('')}
          </div>
        `}
      </div>

      <div class="divider"><span class="divider-symbol">📖</span></div>

      <!-- Built-in Data Browser -->
      <div class="sov-section">
        <div class="sov-section-header">
          <div class="sov-section-title">
            <span class="sov-section-icon">🗂️</span>
            <div>
              <h3>Built-in Data Browser</h3>
              <p class="sov-section-sub">Browse existing categories and clone them into your sovereign collection</p>
            </div>
          </div>
        </div>

        <div id="builtin-browser" class="sov-builtin-browser">
          ${renderBuiltinSection('Linguistic Mapping', '🗣️', [{ name: 'Linguistic Games', count: getBuiltinGamesForId('_linguistic').length, id: '_linguistic' }])}
      </div>

      <div class="divider"><span class="divider-symbol">⚜️</span></div>

      <!-- Import / Export -->
      <div class="parchment-card sov-section">
        <div class="sov-section-header">
          <div class="sov-section-title">
            <span class="sov-section-icon">💾</span>
            <div>
              <h3>Import / Export</h3>
              <p class="sov-section-sub">Backup or share your sovereign data</p>
            </div>
          </div>
          <div class="sov-section-actions">
            <button class="btn btn--small" id="export-all-btn">📥 Export All</button>
            <button class="btn btn--small" id="import-all-btn">📤 Import All</button>
            <input type="file" id="import-file-input" accept=".json" style="display:none;" />
          </div>
        </div>
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>
    </div>
  `;

  // ── Event Bindings ──

  // Upload schema
  container.querySelector('#upload-schema-btn')?.addEventListener('click', () => {
    container.querySelector('#schema-file-input')?.click();
  });

  container.querySelector('#schema-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const schema = sovereign.parseUploadedSchema(text);
      sovereign.saveSchema(schema);
      showNotification('✓ Schema uploaded successfully!');
      renderView(container);
    } catch (err) {
      showNotification('❌ Invalid schema file: ' + err.message);
    }
  });

  // Reset schema
  container.querySelector('#reset-schema-btn')?.addEventListener('click', () => {
    if (confirm('Reset schema to default? This will not delete your categories or games.')) {
      sovereign.resetSchema();
      showNotification('✓ Schema reset to default');
      renderView(container);
    }
  });

  // Create category
  container.querySelector('#create-category-btn')?.addEventListener('click', () => {
    showCategoryModal(container, null, () => renderView(container));
  });

  // Category cards
  container.querySelectorAll('.sov-category-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.sov-card-action')) return;
      currentView = 'category';
      currentCategoryId = card.dataset.categoryId;
      renderView(container);
    });
  });

  // Edit category buttons
  container.querySelectorAll('.sov-edit-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.dataset.categoryId;
      const cat = sovereign.getCategory(catId);
      showCategoryModal(container, cat, () => renderView(container));
    });
  });

  // Delete category buttons
  container.querySelectorAll('.sov-delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.dataset.categoryId;
      const cat = sovereign.getCategory(catId);
      if (confirm(`Delete "${cat?.name}"? This will remove all ${cat?.games?.length || 0} games inside it.`)) {
        sovereign.deleteCategory(catId);
        showNotification('Category deleted');
        renderView(container);
      }
    });
  });

  // Export all
  container.querySelector('#export-all-btn')?.addEventListener('click', async () => {
    const data = sovereign.exportAllData();
    await downloadJSON(data, 'mhlg_sovereign_backup.json');
    showNotification('✓ Data exported!');
  });

  // Import all
  container.querySelector('#import-all-btn')?.addEventListener('click', () => {
    container.querySelector('#import-file-input')?.click();
  });

  container.querySelector('#import-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      sovereign.importAllData(text);
      showNotification('✓ Data imported successfully!');
      renderView(container);
    } catch (err) {
      showNotification('❌ Import failed: ' + err.message);
    }
  });

  // Built-in browser: View Toggle (Accordion)
  container.querySelectorAll('.sov-builtin-item-toggle').forEach(el => {
    el.addEventListener('click', () => {
      const sourceId = el.dataset.sourceId;
      if (expandedBuiltinId === sourceId) {
        expandedBuiltinId = null;
      } else {
        expandedBuiltinId = sourceId;
      }
      renderView(container);
    });
  });

  // Start Clone Flow (Inline)
  container.querySelectorAll('.sov-clone-inline-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sourceId = btn.dataset.sourceId;
      const confirmRow = container.querySelector(`#confirm-${sourceId}`);
      if (confirmRow) confirmRow.style.display = 'flex';
    });
  });

  // Cancel Clone
  container.querySelectorAll('.sov-cancel-clone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sourceId = btn.dataset.sourceId;
      const confirmRow = container.querySelector(`#confirm-${sourceId}`);
      if (confirmRow) confirmRow.style.display = 'none';
    });
  });

  // Confirm Clone built-in to sovereign
  container.querySelectorAll('.sov-confirm-clone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sourceId = btn.dataset.sourceId;
      const nameInput = container.querySelector(`#confirm-name-${sourceId}`);
      const catName = nameInput?.value?.trim() || 'Custom Clone';

      const games = getBuiltinGamesForId(sourceId);
      if (!games || games.length === 0) {
        showNotification('❌ No games found for this source');
        return;
      }

      const cat = sovereign.createCategory(catName, '📋', `Sovereign override of source`);
      for (const g of games) {
        // Ensure unique IDs for sovereign duplicates
        const gameClone = { ...g };
        if (gameClone.synapse_id) {
          gameClone.id = `cloned_${gameClone.synapse_id}_${Date.now()}`;
        }
        sovereign.addGame(cat.id, gameClone);
      }
      showNotification(`✓ "${catName}" promoted to Sovereign!`);
      currentView = 'category';
      currentCategoryId = cat.id;
      renderView(container);
    });
  });

  // --- New Built-in CRUD listeners ---

  // Add Game to Built-in
  container.querySelectorAll('.sov-builtin-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sourceId = btn.dataset.sourceId;
      const sourceName = btn.dataset.sourceName;
      // Ensure shadow category exists
      sovereign.ensureShadowCategory(sourceId, sourceName);
      currentView = 'game-editor';
      currentCategoryId = sourceId;
      currentGameId = null;
      renderView(container);
    });
  });

  // Edit Game in Built-in
  container.querySelectorAll('.sov-edit-builtin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sourceId = btn.dataset.sourceId;
      const gameId = btn.dataset.gameId;
      currentView = 'game-editor';
      currentCategoryId = sourceId;
      currentGameId = gameId;
      renderView(container);
    });
  });

  // Delete Game in Built-in
  container.querySelectorAll('.sov-delete-builtin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sourceId = btn.dataset.sourceId;
      const gameId = btn.dataset.gameId;
      const isSovereign = btn.dataset.isSovereign === 'true';

      if (confirm('Are you sure you want to remove this game from the browser?')) {
        if (isSovereign) {
          sovereign.deleteGame(sourceId, gameId);
        } else {
          sovereign.hideBuiltinGame(gameId);
        }
        showNotification('✓ Game removed');
        renderView(container);
      }
    });
  });
}

function renderCategoryCard(cat) {
  return `
    <div class="parchment-card sov-category-card" data-category-id="${cat.id}" style="cursor:pointer;">
      <div class="module-card-header">
        <div class="wax-seal wax-seal--gold" style="font-size:1.6rem;">${cat.icon || '🔮'}</div>
        <div style="flex:1;">
          <div class="module-card-title">${cat.name}</div>
          <div class="module-card-meta">${cat.games.length} game${cat.games.length !== 1 ? 's' : ''} · Created ${new Date(cat.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
      ${cat.description ? `<p class="module-card-desc" style="margin-top:var(--space-sm);">${cat.description}</p>` : ''}
      <div class="sov-card-actions" style="margin-top:var(--space-sm); display:flex; gap:var(--space-xs); justify-content:flex-end;">
        <button class="btn btn--small sov-card-action sov-edit-cat-btn" data-category-id="${cat.id}" title="Edit">✏️</button>
        <button class="btn btn--small sov-card-action sov-delete-cat-btn" data-category-id="${cat.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════
//  CATEGORY DETAIL — list games, add new game
// ═══════════════════════════════════════════════

function renderCategoryDetail(container, categoryId) {
  const cat = sovereign.getCategory(categoryId);
  if (!cat) {
    currentView = 'overview';
    renderView(container);
    return;
  }

  container.innerHTML = `
    <div class="scroll-container">
      <div class="scroll-edge-left"></div>
      <div class="scroll-edge-right"></div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md);">
        <button class="btn btn--small btn--icon" id="back-to-overview">← Back to Forge</button>
        <div style="display:flex; gap:var(--space-xs);">
          <button class="btn btn--small" id="import-games-btn" title="Import games JSON">📤 Import Games</button>
          <button class="btn btn--small" id="export-cat-btn" title="Export category">📥 Export</button>
          <input type="file" id="import-games-file" accept=".json" style="display:none;" />
        </div>
      </div>

      <div class="ornate-header">
        <div style="font-size:3rem; margin-bottom:var(--space-sm);">${cat.icon}</div>
        <h1>${cat.name}</h1>
        <p class="subtitle">${cat.description || 'A sovereign category'}</p>
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-lg);">
        <h3 style="font-family:var(--font-heading); letter-spacing:0.06em;">${cat.games.length} GAME${cat.games.length !== 1 ? 'S' : ''}</h3>
        <button class="btn btn--primary btn--small" id="add-game-btn">+ New Game</button>
      </div>

      ${cat.games.length === 0 ? `
        <div class="sov-empty-state">
          <div class="sov-empty-icon">🎮</div>
          <p>No games yet. Create your first game or import existing ones!</p>
        </div>
      ` : `
        <div class="module-grid" id="games-grid">
          ${cat.games.map(game => renderGameCard(game, cat)).join('')}
        </div>
      `}

      <div class="divider"><span class="divider-symbol">⊛</span></div>
    </div>
  `;

  // Back button
  container.querySelector('#back-to-overview')?.addEventListener('click', () => {
    currentView = 'overview';
    renderView(container);
  });

  // Add game
  container.querySelector('#add-game-btn')?.addEventListener('click', () => {
    currentView = 'game-editor';
    currentGameId = null;
    renderView(container);
  });

  // Import games
  container.querySelector('#import-games-btn')?.addEventListener('click', () => {
    container.querySelector('#import-games-file')?.click();
  });

  container.querySelector('#import-games-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = sovereign.importGamesIntoCategory(categoryId, text);
      showNotification(`✓ Imported ${imported.length} games!`);
      renderView(container);
    } catch (err) {
      showNotification('❌ Import failed: ' + err.message);
    }
  });

  // Export category
  container.querySelector('#export-cat-btn')?.addEventListener('click', async () => {
    const data = JSON.stringify(cat, null, 2);
    await downloadJSON(data, `mhlg_category_${cat.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
    showNotification('✓ Category exported!');
  });

  // Game card clicks
  container.querySelectorAll('.sov-game-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.sov-card-action')) return;
      // Play the game
      const gameId = card.dataset.gameId;
      if (onNavigateToGame) onNavigateToGame(gameId, 'sovereign');
    });
  });

  // Edit game buttons
  container.querySelectorAll('.sov-edit-game-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentView = 'game-editor';
      currentGameId = btn.dataset.gameId;
      renderView(container);
    });
  });

  // Delete game buttons
  container.querySelectorAll('.sov-delete-game-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const gameId = btn.dataset.gameId;
      if (confirm('Delete this game? This action cannot be undone.')) {
        sovereign.deleteGame(categoryId, gameId);
        showNotification('Game deleted');
        renderView(container);
      }
    });
  });
}

function renderGameCard(game, cat) {
  const title = game.title || game.game || game.id;
  const desc = game.objective || game.meaning || game.mechanic || '';
  return `
    <div class="parchment-card sov-game-card" data-game-id="${game.id}" style="cursor:pointer;">
      <div class="module-card-header">
        <div class="wax-seal wax-seal--gold">${game.icon || cat.icon || '🎮'}</div>
        <div style="flex:1;">
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
      <div class="sov-card-actions" style="margin-top:var(--space-sm); display:flex; gap:var(--space-xs); justify-content:flex-end;">
        <button class="btn btn--small sov-card-action sov-edit-game-btn" data-game-id="${game.id}" title="Edit">✏️</button>
        <button class="btn btn--small sov-card-action sov-delete-game-btn" data-game-id="${game.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════
//  GAME EDITOR — Create/Edit a game
// ═══════════════════════════════════════════════

function renderGameEditor(container, categoryId, gameId) {
  const schema = sovereign.getSchema();
  const cat = sovereign.getCategory(categoryId);
  const isEditing = !!gameId;
  let existingGame = isEditing ? sovereign.getGame(categoryId, gameId) : null;

  if (isEditing && !existingGame) {
    // Try fetching from built-in sources
    const builtinGames = getBuiltinGamesForId(categoryId);
    existingGame = builtinGames.find(g => String(g.synapse_id || g.id) === String(gameId));
  }

  container.innerHTML = `
    <div class="scroll-container">
      <div class="scroll-edge-left"></div>
      <div class="scroll-edge-right"></div>

      <button class="btn btn--small btn--icon" id="back-to-category" style="margin-bottom:var(--space-md);">← Back to ${categoryId.startsWith('_') ? 'Forge' : (cat?.name || 'Category')}</button>

      <div class="ornate-header">
        <h1>${isEditing ? '✏️ Edit Game' : '✨ Create New Game'}</h1>
        <p class="subtitle">Using schema: ${schema.name} v${schema.version}</p>
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <div class="parchment-card sov-form-card">
        <form id="game-form" class="sov-game-form">
          ${schema.fields.map(field => {
    const value = existingGame?.[field.key] || '';
    const escapedValue = String(value).replace(/"/g, '&quot;');
    if (field.type === 'text') {
      return `
                <div class="sov-form-group">
                  <label class="sov-form-label" for="field-${field.key}">
                    ${field.label}
                    ${field.required ? '<span class="sov-required">*</span>' : ''}
                  </label>
                  <textarea class="sov-form-textarea" id="field-${field.key}" name="${field.key}" 
                    placeholder="${field.placeholder || ''}" 
                    ${field.required ? 'required' : ''}
                    rows="3">${value}</textarea>
                </div>
              `;
    }
    return `
              <div class="sov-form-group">
                <label class="sov-form-label" for="field-${field.key}">
                  ${field.label}
                  ${field.required ? '<span class="sov-required">*</span>' : ''}
                </label>
                <input class="sov-form-input" type="text" id="field-${field.key}" name="${field.key}" 
                  value="${escapedValue}" 
                  placeholder="${field.placeholder || ''}" 
                  ${field.required ? 'required' : ''} />
              </div>
            `;
  }).join('')}

          <div class="sov-form-actions">
            <button type="button" class="btn" id="cancel-game-btn">Cancel</button>
            <button type="submit" class="btn btn--primary">${isEditing ? 'Save Changes' : 'Create Game'}</button>
          </div>
        </form>
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>
    </div>
  `;

  // Back
  container.querySelector('#back-to-category')?.addEventListener('click', () => {
    currentView = categoryId.startsWith('_') ? 'overview' : 'category';
    currentGameId = null;
    renderView(container);
  });

  // Cancel
  container.querySelector('#cancel-game-btn')?.addEventListener('click', () => {
    currentView = 'category';
    currentGameId = null;
    renderView(container);
  });

  // Submit
  container.querySelector('#game-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const gameData = {};
    for (const [key, value] of formData.entries()) {
      if (value) gameData[key] = value;
    }

    if (!gameData.id) {
      gameData.id = `sov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }

    if (isEditing) {
      sovereign.updateGame(categoryId, gameId, gameData);
      showNotification('✓ Game updated!');
    } else {
      sovereign.addGame(categoryId, gameData);
      showNotification('✓ Game created!');
    }

    currentView = categoryId.startsWith('_') ? 'overview' : 'category';
    currentGameId = null;
    renderView(container);
  });
}

// ═══════════════════════════════════════════════
//  CATEGORY MODAL
// ═══════════════════════════════════════════════

function showCategoryModal(container, existingCat, onDone) {
  const isEditing = !!existingCat;

  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'sov-modal-overlay';
  modal.innerHTML = `
    <div class="sov-modal">
      <div class="sov-modal-header">
        <h3>${isEditing ? '✏️ Edit Category' : '✨ New Category'}</h3>
        <button class="sov-modal-close" id="modal-close">✕</button>
      </div>
      <form id="category-form" class="sov-modal-form">
        <div class="sov-form-group">
          <label class="sov-form-label" for="cat-name">Category Name <span class="sov-required">*</span></label>
          <input class="sov-form-input" type="text" id="cat-name" value="${existingCat?.name || ''}" placeholder="e.g. Nature, Meditation, Art..." required />
        </div>
        <div class="sov-form-group">
          <label class="sov-form-label" for="cat-icon">Icon (Emoji)</label>
          <input class="sov-form-input" type="text" id="cat-icon" value="${existingCat?.icon || '🔮'}" placeholder="🌿" style="font-size:1.5rem; text-align:center; max-width:80px;" />
        </div>
        <div class="sov-form-group">
          <label class="sov-form-label" for="cat-desc">Description</label>
          <textarea class="sov-form-textarea" id="cat-desc" placeholder="Describe this category...">${existingCat?.description || ''}</textarea>
        </div>
        <div class="sov-form-actions">
          <button type="button" class="btn" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn--primary">${isEditing ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Animate in
  requestAnimationFrame(() => modal.classList.add('sov-modal-overlay--visible'));

  const closeModal = () => {
    modal.classList.remove('sov-modal-overlay--visible');
    setTimeout(() => modal.remove(), 300);
  };

  modal.querySelector('#modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#modal-cancel')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector('#category-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = modal.querySelector('#cat-name').value.trim();
    const icon = modal.querySelector('#cat-icon').value.trim() || '🔮';
    const description = modal.querySelector('#cat-desc').value.trim();

    if (!name) return;

    if (isEditing) {
      sovereign.updateCategory(existingCat.id, { name, icon, description });
      showNotification('✓ Category updated!');
    } else {
      sovereign.createCategory(name, icon, description);
      showNotification('✓ Category created!');
    }

    closeModal();
    if (onDone) onDone();
  });
}

// ═══════════════════════════════════════════════
//  BUILT-IN DATA BROWSER HELPERS
// ═══════════════════════════════════════════════

function getBuiltinModuleSummaries() {
  const modules = getAllModules();
  return modules.map(m => {
    const id = `_synapse_${m.id}`;
    const games = getBuiltinGamesForId(id);
    return {
      name: m.name,
      count: games.length,
      id: id,
    };
  });
}

function renderBuiltinSection(title, icon, items) {
  return `
    <div class="sov-builtin-group">
      <div class="sov-builtin-group-header">
        <span style="font-size:1.3rem;">${icon}</span>
        <strong>${title}</strong>
        <span style="color:var(--ink-faded); font-size:0.8rem;">(${items.reduce((s, i) => s + (i.count || 0), 0)} games)</span>
      </div>
      <div class="sov-builtin-items">
        ${items.map(item => {
    const games = expandedBuiltinId === item.id ? getBuiltinGamesForId(item.id) : [];
    return `
          <div class="sov-builtin-item-wrapper">
            <div class="sov-builtin-item">
              <div style="flex:1; cursor:pointer;" class="sov-builtin-item-toggle" data-source-id="${item.id}">
                <span style="font-weight:600; color:var(--ink-dark);">${item.name}</span>
                <span style="color:var(--ink-faded); font-size:0.8rem;"> · ${games.length || item.count} games</span>
              </div>
              <div style="display:flex; gap:var(--space-xs);">
                <button class="btn btn--small btn--primary sov-builtin-add-btn" data-source-id="${item.id}" data-source-name="${item.name}" title="Add New Game to this category">+ New</button>
                <button class="btn btn--small sov-clone-inline-btn" data-source-id="${item.id}" data-source-name="${item.name}" title="Clone category to Sovereign">📋 Clone</button>
              </div>
            </div>
            
            <!-- Inline Games List (Accordion) -->
            <div class="sov-builtin-games-list ${expandedBuiltinId === item.id ? 'sov-builtin-games-list--expanded' : ''}" id="games-list-${item.id}">
              <div class="sov-builtin-games-grid">
                ${expandedBuiltinId === item.id ? games.map(g => {
      const id = g.synapse_id || g.id;
      return `
                  <div class="sov-builtin-game-card ${g._isSovereign ? 'sov-builtin-game-card--sovereign' : ''}">
                    <div style="flex:1;">
                      <strong>${g.title || g.game}</strong>
                      <div style="font-size:0.75rem; color:var(--ink-faded);">${g.concept || g.layer || ''}</div>
                    </div>
                    <div class="sov-builtin-game-actions">
                      <button class="sov-builtin-game-action sov-edit-builtin-btn" 
                        data-source-id="${item.id}" 
                        data-game-id="${id}" 
                        title="Edit Game">✏️</button>
                      <button class="sov-builtin-game-action sov-delete-builtin-btn" 
                        data-source-id="${item.id}" 
                        data-game-id="${id}" 
                        data-is-sovereign="${!!g._isSovereign}"
                        title="Delete Game">🗑️</button>
                    </div>
                  </div>
                `}).join('') : '<div style="padding:var(--space-sm); color:var(--ink-faded); font-style:italic;">Click to load games...</div>'}
              </div>
            </div>

            <!-- Inline Clone Confirm -->
            <div class="sov-clone-confirm" id="confirm-${item.id}" style="display:none;">
              <input type="text" class="sov-form-input" id="confirm-name-${item.id}" value="${item.name}" placeholder="Category name..." style="flex:1;" />
              <button class="btn btn--small btn--primary sov-confirm-clone-btn" data-source-id="${item.id}">Confirm</button>
              <button class="btn btn--small sov-cancel-clone-btn" data-source-id="${item.id}">Cancel</button>
            </div>
          </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
}

function getBuiltinGamesForId(sourceId) {
  let staticGames = [];
  if (sourceId === '_linguistic') staticGames = allLinguisticGames;
  //else if (sourceId === '_grounded') staticGames = GROUNDED_PRACTICES;
  //else if (sourceId === '_professions') staticGames = PROFESSION_SCENARIOS;
  //else if (sourceId === '_domains') staticGames = DOMAIN_SCENARIOS;
  //else if (sourceId === '_psychic') staticGames = PSYCHIC_BIRTHRIGHT;
  //else if (sourceId.startsWith('_synapse_')) {
  //  const modId = sourceId.replace('_synapse_', '');
  //  const modules = getAllModules();
  //  const mod = modules.find(m => String(m.id) === modId);
  //  if (mod) {
  //    const [start, end] = mod.range;
  //    // staticGames = allSynapseGames.filter(g => g.synapse_id >= start && g.synapse_id <= end);
  //  }
  //}

  // Filter out hidden ones, and identify them as built-in
  const filteredStatic = staticGames
    .filter(g => !sovereign.isBuiltinHidden(g.synapse_id || g.id))
    .map(g => ({ ...g, _isBuiltin: true }));

  // Get sovereign extensions for this source
  const extensions = sovereign.getBuiltinExtensions(sourceId).map(g => ({ ...g, _isSovereign: true }));

  // Merge: Extensions might override static games if they share the same ID
  // But usually sovereign games have their own IDs.
  // We'll just return all of them.
  return [...filteredStatic, ...extensions];
}

// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════

function showNotification(text) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: var(--gold); color: var(--ink-black);
    font-family: var(--font-heading); font-size: 0.85rem;
    padding: 12px 24px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: messageAppear 0.3s ease-out;
    z-index: 10000;
  `;
  notif.textContent = text;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

async function downloadJSON(data, filename) {
  // Try Tauri's file dialog first
  if (window.__TAURI_INTERNALS__) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: filename,
      });
      if (filePath) {
        await writeTextFile(filePath, data);
        return;
      }
    } catch (err) {
      console.error('Tauri save failed:', err);
    }
  }
  // Fallback: browser download
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
