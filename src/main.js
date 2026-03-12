/**
 * MHLG — Metamorphic Human Language Gamers
 * Main App Router & Shell
 */
import './style.css';
import './themes/scifi.css';
import './themes/luxury.css';
import './themes/celestial.css';
import './themes/love.css';
import './themes/solar.css';
import { renderMenu } from './screens/chronicles.js';
import { renderChat } from './screens/chat.js';
import { renderReader } from './screens/reader.js';
import { renderSovereign } from './screens/sovereign.js';
import { initProfile, getProfile } from './services/storage.js';
import { THEMES, getTheme, setTheme, initTheme, getAllThemes, addCustomTheme, deleteCustomTheme } from './services/theme.js';
import { setEmbeddingModel, getEmbeddingModel, checkConnection, getSettings } from './services/ollama.js';
import { getTimeSummary, getWeeklyHistory, formatDuration, lockUI, getLockState, unlockUI, isLocked, endSession } from './services/timetracker.js';

// Initialize profile & theme
initProfile();
initTheme();
setupSocialButtons();

// Initial lock check
if (isLocked()) {
  showLockOverlay();
}

// --- UI Lock Overlay ---
function showLockOverlay() {
  const existing = document.getElementById('ui-lock-overlay');
  if (existing) return;

  const lock = getLockState();
  if (!lock) return;

  const overlay = document.createElement('div');
  overlay.id = 'ui-lock-overlay';
  overlay.className = 'lock-overlay';
  overlay.innerHTML = `
    <div class="lock-overlay-icon">🧘</div>
    <div class="lock-overlay-title">Time to Breathe</div>
    <div class="lock-overlay-message">${lock.message || 'Take a break from the digital realm. Reconnect with yourself.'}</div>
    <div class="lock-overlay-timer" id="lock-timer">--:--</div>
    <div class="lock-overlay-unlock" id="debug-unlock">Force Unlock (Admin)</div>
  `;

  document.body.appendChild(overlay);

  const timerEl = overlay.querySelector('#lock-timer');
  const updateTimer = () => {
    const current = getLockState();
    if (!current) {
      overlay.remove();
      return;
    }
    const remainingMs = current.unlockAt - Date.now();
    if (remainingMs <= 0) {
      overlay.remove();
      return;
    }
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const interval = setInterval(() => {
    if (!document.body.contains(overlay)) {
      clearInterval(interval);
      return;
    }
    updateTimer();
  }, 1000);

  updateTimer();

  overlay.querySelector('#debug-unlock')?.addEventListener('click', () => {
    unlockUI();
    overlay.remove();
  });
}

// --- Router ---
function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  return { path: parts[0] || 'chronicles', param: parts[1] || null };
}

function navigate(path) {
  window.location.hash = `#/${path}`;
}

function renderNav() {
  const nav = document.getElementById('main-nav');
  const route = getRoute();
  const profile = getProfile();

  nav.innerHTML = `
    <div class="nav-title">⊛ Metamorphic Resonance Human Language Gamers</div>
    <ul class="nav-links">
      <li><a class="nav-link ${route.path === 'chronicles' ? 'active' : ''}" data-route="chronicles">Chronicle</a></li>
      <li><a class="nav-link ${route.path === 'meditations' ? 'active' : ''}" data-route="meditations">Meditations</a></li>
      <li><a class="nav-link ${route.path === 'system' ? 'active' : ''}" data-route="system">System</a></li>
      <li>
        <span class="connection-status" id="nav-connection">
          <span class="connection-dot connection-dot--checking" id="nav-conn-dot"></span>
        </span>
      </li>
      <li style="font-family:var(--font-ui); font-size:0.7rem; color:var(--ink-faded); display:flex; align-items:center; gap:4px;">
        ✦ ${profile.xp || 0} XP
      </li>
    </ul>
  `;

  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.route);
    });
  });

  // Check connection
  updateNavConnection();
}

async function updateNavConnection() {
  const dot = document.getElementById('nav-conn-dot');
  if (!dot) return;
  const connected = await checkConnection();
  dot.className = `connection-dot connection-dot--${connected ? 'connected' : 'disconnected'}`;
  dot.title = connected ? `Connected to ${getSettings().baseUrl}` : 'Ollama disconnected';
}
/**
 * THE UNIFIED SYSTEM SCREEN
 * Merges Forge (Sovereign) and Settings
 */
let currentSystemTab = 'forge'; // 'forge' | 'connection' | 'awareness' | 'style' | 'profile'

function renderSystem(container, initialTab = null) {
  if (initialTab) currentSystemTab = initialTab;

  container.innerHTML = `
    <div class="scroll-container">
      <div class="scroll-edge-left"></div>
      <div class="scroll-edge-right"></div>

      <div class="ornate-header">
        <h1>⚙️ System Control</h1>
        <p class="subtitle">Unified nexus for data creation and calibration</p>
      </div>

      <div class="system-tabs">
        <div class="system-tab ${currentSystemTab === 'forge' ? 'system-tab--active' : ''}" data-tab="forge">⚜️ Forge</div>
        <div class="system-tab ${currentSystemTab === 'connection' ? 'system-tab--active' : ''}" data-tab="connection">🔌 Connection</div>
        <div class="system-tab ${currentSystemTab === 'awareness' ? 'system-tab--active' : ''}" data-tab="awareness">🧘 Awareness</div>
        <div class="system-tab ${currentSystemTab === 'style' ? 'system-tab--active' : ''}" data-tab="style">🎨 Style</div>
        <div class="system-tab ${currentSystemTab === 'profile' ? 'system-tab--active' : ''}" data-tab="profile">👤 Profile</div>
      </div>

      <div id="system-tab-content"></div>
      
      <div class="divider"><span class="divider-symbol">⚙️</span></div>
    </div>
  `;

  // Bind tabs
  container.querySelectorAll('.system-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentSystemTab = tab.dataset.tab;
      window.location.hash = `#/system/${currentSystemTab}`;
    });
  });

  renderSystemTabContent(container.querySelector('#system-tab-content'));
}

async function renderSystemTabContent(container) {
  container.innerHTML = '';
  container.className = 'tab-content-fade';

  switch (currentSystemTab) {
    case 'forge':
      renderSovereign(container, (gameId, gameType) => {
        navigate(`chat/${gameType}_${gameId}`);
      });
      break;

    case 'connection':
      renderConnectionTab(container);
      break;

    case 'awareness':
      renderAwarenessTab(container);
      break;

    case 'style':
      renderStyleTab(container);
      break;

    case 'profile':
      renderProfileTab(container);
      break;
  }
}

// --- SUB-TABS ---

async function renderConnectionTab(container) {
  const ollama = await import('./services/ollama.js');
  const settings = ollama.getSettings();
  container.innerHTML = `
    <div class="parchment-card settings-panel">
      <h3 style="margin-bottom:var(--space-md);">Ollama Connection</h3>
      <div class="setting-row">
        <span class="setting-label">Server URL</span>
        <input class="setting-input" id="setting-url" value="${settings.baseUrl}" placeholder="http://127.0.0.1:11434" />
      </div>
      <div class="setting-row">
        <span class="setting-label">Default Model</span>
        <input class="setting-input" id="setting-model" value="${settings.model}" placeholder="gemma3" />
      </div>
      <div class="setting-row">
        <span class="setting-label">Embedding Model</span>
        <input class="setting-input" id="setting-embedding-model" value="${settings.embeddingModel}" placeholder="embeddinggemma" />
      </div>
      <div class="setting-row">
        <span class="setting-label">AI Language</span>
        <select class="model-selector" id="setting-language">
          ${ollama.LANGUAGES.map(l => `<option value="${l}" ${l === settings.language ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>

      <h3 style="margin: var(--space-lg) 0 var(--space-md) 0; border-top: 1px solid var(--gold-faint); padding-top: var(--space-md);">Model Parameters</h3>
      
      <div class="setting-row">
        <span class="setting-label">Temperature</span>
        <div style="flex:1; display:flex; align-items:center; gap:10px;">
          <input type="range" id="setting-temp" min="0" max="2" step="0.1" value="${settings.temperature}" style="flex:1;" />
          <span style="width:30px; font-family:var(--font-ui); font-size:0.8rem;">${settings.temperature}</span>
        </div>
      </div>
      <div class="setting-row">
        <span class="setting-label">Max Tokens (num_predict)</span>
        <input class="setting-input" type="number" id="setting-max-tokens" value="${settings.maxTokens}" placeholder="2048" />
      </div>
      <div class="setting-row">
        <span class="setting-label">Top P</span>
        <input class="setting-input" type="number" id="setting-top-p" min="0" max="1" step="0.05" value="${settings.topP}" placeholder="0.9" />
      </div>

      <div class="setting-row" style="margin-top: var(--space-lg);">
        <span class="setting-label">Status</span>
        <span class="setting-value" id="setting-conn-status">Checking...</span>
      </div>
      <div style="margin-top:var(--space-md);">
        <button class="btn btn--primary" id="save-settings-btn">Save & Test Connection</button>
      </div>
    </div>
  `;

  // Update temp value display live
  const tempInput = container.querySelector('#setting-temp');
  const tempVal = tempInput.nextElementSibling;
  tempInput.addEventListener('input', () => {
    tempVal.textContent = tempInput.value;
  });

  const checkAndReport = async () => {
    const el = document.getElementById('setting-conn-status');
    if (el) el.textContent = 'Checking...';
    const connected = await ollama.checkConnection();
    if (el) el.textContent = connected ? '✓ Connected' : '✕ Disconnected';
    updateNavConnection();
  };

  checkAndReport();

  container.querySelector('#save-settings-btn')?.addEventListener('click', async () => {
    const url = document.getElementById('setting-url').value.trim();
    const model = document.getElementById('setting-model').value.trim();
    const lang = document.getElementById('setting-language')?.value;
    const embModel = document.getElementById('setting-embedding-model')?.value?.trim();
    const temp = document.getElementById('setting-temp').value;
    const maxTokens = document.getElementById('setting-max-tokens').value;
    const topP = document.getElementById('setting-top-p').value;

    if (url) localStorage.setItem('mhlg_ollama_url', url);
    if (model) localStorage.setItem('mhlg_ollama_model', model);
    if (lang) ollama.setLanguage(lang);
    if (embModel) ollama.setEmbeddingModel(embModel);

    ollama.setTemperature(temp);
    ollama.setMaxTokens(maxTokens);
    ollama.setTopP(topP);

    showNotification('✓ Settings saved!');
    await checkAndReport();
  });
}

function renderAwarenessTab(container) {
  const timeSummary = getTimeSummary();
  const weeklyHistory = getWeeklyHistory();
  const maxDayMs = Math.max(...weeklyHistory.map(d => d.totalMs), 1);

  container.innerHTML = `
    <div class="parchment-card settings-panel">
      <h3 style="margin-bottom:var(--space-md);">⏱️ Time Awareness Dashboard</h3>
      <div class="time-dashboard">
        <div class="time-stats-row">
          <div class="time-stat-card">
            <div class="sov-stat-value">${formatDuration(timeSummary.todayMs)}</div>
            <div class="sov-stat-label">Today</div>
          </div>
          <div class="time-stat-card">
            <div class="sov-stat-value">${formatDuration(timeSummary.totalMs)}</div>
            <div class="sov-stat-label">All Time</div>
          </div>
          <div class="time-stat-card">
            <div class="sov-stat-value">${timeSummary.totalSessions}</div>
            <div class="sov-stat-label">Sessions</div>
          </div>
          <div class="time-stat-card">
            <div class="sov-stat-value">${timeSummary.totalGames}</div>
            <div class="sov-stat-label">Games</div>
          </div>
        </div>

        <div style="margin-top:var(--space-lg);">
          <p style="font-family:var(--font-heading); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.06em;">Weekly Progress</p>
          <div class="time-week-chart">
            ${weeklyHistory.map(day => {
    const height = Math.max(2, (day.totalMs / maxDayMs) * 100);
    return `
                <div class="time-week-bar">
                  <div class="time-week-bar-fill" style="height:${height}px;"></div>
                  <div class="time-week-bar-label">${day.label}</div>
                </div>
              `;
  }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- UI Lock -->
    <div class="parchment-card settings-panel" style="margin-top:var(--space-lg);">
      <h3 style="margin-bottom:var(--space-md);">🔒 Mindful Usage Lock</h3>
      <div class="setting-row">
        <span class="setting-label">Lock Duration (min)</span>
        <input class="setting-input" type="number" id="lock-duration" value="30" min="5" style="width:100px;" />
      </div>
      <div class="setting-row">
        <span class="setting-label">Message</span>
        <input class="setting-input" id="lock-message" placeholder="Take a deep breath." />
      </div>
      <div style="margin-top:var(--space-md);">
        <button class="btn btn--primary" id="lock-ui-btn">🔒 Lock UI Now</button>
      </div>
    </div>
  `;

  container.querySelector('#lock-ui-btn')?.addEventListener('click', () => {
    const min = parseInt(document.getElementById('lock-duration')?.value || '30');
    const msg = document.getElementById('lock-message')?.value?.trim() || '';
    lockUI(min, msg);
    showLockOverlay();
  });
}

function renderStyleTab(container) {
  const currentTheme = getTheme();
  const allThemes = getAllThemes();

  const themeCardsHTML = Object.values(allThemes).map(t => `
    <div class="theme-card ${t.id === currentTheme ? 'theme-card--active' : ''}" data-theme-id="${t.id}">
      <div class="theme-card-icon">${t.icon}</div>
      <div class="theme-card-info">
        <div class="theme-card-name">${t.name}</div>
        <div class="theme-card-desc">${t.description}</div>
      </div>
      <div class="theme-card-check">${t.id === currentTheme ? '✦' : ''}</div>
      ${!t.builtin ? `<button class="btn btn--small delete-custom-theme-btn" data-theme-id="${t.id}" style="position:absolute;top:6px;right:6px;">✕</button>` : ''}
    </div>
  `).join('');

  container.innerHTML = `
    <div class="parchment-card settings-panel">
      <h3 style="margin-bottom:var(--space-md);">Visual Theme</h3>
      <div class="theme-grid" id="theme-grid">
        ${themeCardsHTML}
      </div>
      <div class="theme-upload-row">
        <div style="flex:1;">
          <p style="font-family:var(--font-heading); font-size:0.85rem;">✨ Upload Custom Theme</p>
          <p style="font-size:0.75rem; color:var(--ink-faded);">Select a .css file</p>
        </div>
        <button class="btn btn--small" id="upload-theme-btn">📤 Upload CSS</button>
        <input type="file" id="theme-file-input" accept=".css" style="display:none;" />
      </div>
    </div>
  `;

  container.querySelector('#theme-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.theme-card');
    if (!card || e.target.closest('.delete-custom-theme-btn')) return;
    const themeId = card.dataset.themeId;
    setTheme(themeId);
    renderSystemTabContent(container);
  });

  container.querySelectorAll('.delete-custom-theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this theme?')) {
        deleteCustomTheme(btn.dataset.themeId);
        renderSystemTabContent(container);
      }
    });
  });

  container.querySelector('#upload-theme-btn')?.addEventListener('click', () => {
    container.querySelector('#theme-file-input')?.click();
  });

  container.querySelector('#theme-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const css = await file.text();
    const name = file.name.replace('.css', '');

    // Try to extract theme ID from CSS: [data-theme="id"]
    const themeMatch = css.match(/\[data-theme=["']?([^"']+)["']?\]/);
    const id = themeMatch ? themeMatch[1] : `custom_${Date.now()}`;

    addCustomTheme(id, name, '🎨', 'Uploaded theme', css);
    renderSystemTabContent(container);
  });
}

function renderProfileTab(container) {
  const profile = getProfile();
  container.innerHTML = `
    <div class="parchment-card settings-panel">
      <h3 style="margin-bottom:var(--space-md);">Gamer Profile</h3>
      <div class="setting-row">
        <span class="setting-label">Gamer Tag</span>
        <input class="setting-input" id="setting-name" value="${profile.name || ''}" placeholder="Enter name..." />
      </div>
      <div class="setting-row">
        <span class="setting-label">Rank</span>
        <span class="setting-value">✦ Explorer [${profile.xp || 0} XP]</span>
      </div>
      <div style="margin-top:var(--space-md);">
        <button class="btn btn--primary" id="save-profile-btn">Save Profile</button>
      </div>
    </div>
  `;

  container.querySelector('#save-profile-btn')?.addEventListener('click', () => {
    const name = document.getElementById('setting-name').value.trim();
    if (!name) return;
    profile.name = name;
    import('./services/storage.js').then(s => {
      s.saveProfile(profile);
      renderNav();
      showNotification('✓ Profile saved!');
    });
  });
}

function showNotification(text) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: var(--gold); color: var(--ink-black);
    padding: 12px 24px; border-radius: 8px; z-index: 10000;
  `;
  notif.textContent = text;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function route() {
  // Always try to end any active session when routing
  endSession();

  if (isLocked()) {
    showLockOverlay();
    return;
  }
  const { path, param } = getRoute();
  const content = document.getElementById('main-content');

  renderNav();

  switch (path) {
    case 'chronicles':
      renderMenu(content, (gameId, gameType) => {
        navigate(`chat/${gameType}_${gameId}`);
      });
      break;

    case 'chat': {
      if (!param) { navigate('menu'); return; }
      const [gameType, ...idParts] = param.split('_');
      const gameId = idParts.join('_');
      renderChat(content, gameId, gameType, () => navigate('chronicles'));
      break;
    }

    case 'meditations':
      renderReader(content, param, () => navigate('chronicles'), navigate);
      break;

    case 'reader':
      // Legacy redirect
      navigate('meditations');
      break;

    case 'system':
      renderSystem(content, param);
      break;

    case 'sovereign':
    case 'settings':
      navigate('system');
      break;

    default:
      navigate('chronicles');
  }
}

// Listen for hash changes
window.addEventListener('hashchange', route);

// Initial render
route();

async function setupSocialButtons() {
  const container = document.createElement('div');
  container.className = 'social-floating-container';
  
  const createBtn = (id, className, iconUrl, label, url) => {
    const btn = document.createElement('a');
    btn.className = `social-btn ${className}`;
    btn.href = url;
    btn.style.cursor = 'pointer';
    const isGithub = id === 'github';
    btn.innerHTML = `
      <img src="${iconUrl}" alt="${id}" class="social-icon" style="${isGithub ? 'background:white; border-radius:50%; padding:1px;' : ''}" />
      <span>${label}</span>
    `;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (window.__TAURI_INTERNALS__) {
        try {
          const { open } = await import('@tauri-apps/plugin-opener');
          await open(url);
        } catch (err) {
          console.error(`Tauri opener failed for ${url}:`, err);
          window.open(url, '_blank');
        }
      } else {
        window.open(url, '_blank');
      }
    });
    return btn;
  };

  // 1. GitHub Star Button
  const githubBtn = createBtn(
    'github', 
    'social-btn--github', 
    'https://github.githubassets.com/favicons/favicon.svg', 
    '⭐ Star us on GitHub', 
    'https://github.com/plantacerium/Metamorphic-Resonance-Human-Language-Gamers'
  );
  
  // 2. Ko-fi Button
  const kofiBtn = createBtn(
    'kofi', 
    'social-btn--kofi', 
    'https://storage.ko-fi.com/cdn/cup-border.png', 
    '❤️ Support on KO-FI', 
    'https://ko-fi.com/plantacerium'
  );

  container.appendChild(githubBtn);
  container.appendChild(kofiBtn);
  document.body.appendChild(container);
}
