/**
 * Meditations Screen — Dialogue Viewer & Chat Continuation
 * Displays saved conversations and allows continuing them
 */
import * as storage from '../services/storage.js';
import * as ollama from '../services/ollama.js';
import { renderMarkdown } from '../services/markdown.js';
import { getGameById, getLinguisticGameById, getLayerEmoji } from '../data/games.js';
import { getSovereignGameById } from '../services/sovereign.js';

let isStreaming = false;

export function renderReader(container, dialogueId, onBack, onNavigate) {
  const conversations = storage.getConversations();

  if (dialogueId) {
    renderDialogueView(container, dialogueId, onBack, onNavigate);
  } else {
    renderDialogueList(container, conversations, onBack, onNavigate);
  }
}

function renderDialogueList(container, conversations, onBack, onNavigate) {
  container.innerHTML = `
    <div class="scroll-container">
      <div class="scroll-edge-left"></div>
      <div class="scroll-edge-right"></div>

      <div class="ornate-header">
        <h1>Meditations</h1>
        <p class="subtitle">Continue your dialogues between Human and AI consciousness</p>
      </div>

      <div class="divider"><span class="divider-symbol">🧘</span></div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-lg);">
        <button class="btn btn--small" id="back-btn">← Back to Menu</button>
        <button class="btn btn--primary btn--small btn--icon" id="export-all-btn">📁 Export All</button>
      </div>

      ${conversations.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🧘</div>
          <p class="empty-state-text">No meditations recorded yet. Start a game to begin your practice.</p>
        </div>
      ` : `
        <ul class="dialogue-list" id="dialogue-list">
          ${conversations.map(conv => `
            <li class="dialogue-list-item" data-conv-id="${conv.id}">
              <div class="wax-seal ${conv.gameType !== 'synapse' ? 'wax-seal--gold' : ''}" style="width:40px;height:40px;font-size:1rem;">
                ${conv.icon || (conv.gameType === 'linguistic' ? getLayerEmoji(conv.module) : (getGameById(conv.gameId)?.icon || '🔮'))}
              </div>
              <div style="flex:1;">
                <div class="dialogue-list-title-container" style="display:flex; align-items:center; gap:var(--space-sm);">
                  <span class="dialogue-list-title" data-conv-id="${conv.id}">${conv.gameTitle || 'Untitled Meditation'}</span>
                  <button class="btn btn--small rename-btn" data-conv-id="${conv.id}" title="Rename" style="font-size:0.65rem; padding:2px 6px;">✎</button>
                </div>
                <div class="dialogue-list-meta">
                  ${conv.module || ''} · ${conv.messages?.length || 0} messages · ${formatDate(conv.createdAt)}
                </div>
              </div>
              <div style="display:flex; gap:var(--space-xs);">
                <button class="btn btn--small export-single-btn" data-conv-id="${conv.id}" title="Export">📁</button>
                <button class="btn btn--small delete-btn" data-conv-id="${conv.id}" title="Delete" style="color:var(--wax-seal);">✕</button>
              </div>
            </li>
          `).join('')}
        </ul>
      `}

      <div class="divider"><span class="divider-symbol">🧘</span></div>
    </div>
  `;

  // Back
  container.querySelector('#back-btn')?.addEventListener('click', onBack);

  // Open dialogue
  container.querySelectorAll('.dialogue-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.export-single-btn') || e.target.closest('.delete-btn') || e.target.closest('.rename-btn')) return;
      const id = item.dataset.convId;
      onNavigate(`meditations/${id}`);
    });
  });

  // Rename buttons
  container.querySelectorAll('.rename-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.convId;
      const titleEl = container.querySelector(`.dialogue-list-title[data-conv-id="${id}"]`);
      if (!titleEl) return;
      const currentTitle = titleEl.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentTitle;
      input.className = 'setting-input';
      input.style.cssText = 'width:200px; font-size:0.85rem;';
      titleEl.replaceWith(input);
      input.focus();
      input.select();

      const save = () => {
        const newTitle = input.value.trim() || currentTitle;
        storage.updateConversationTitle(id, newTitle);
        renderDialogueList(container, storage.getConversations(), onBack, onNavigate);
      };
      input.addEventListener('blur', save);
      input.addEventListener('keypress', (ev) => { if (ev.key === 'Enter') save(); });
    });
  });

  // Delete buttons
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.convId;
      if (confirm('Delete this meditation from the Chronicle?')) {
        storage.deleteConversation(id);
        renderDialogueList(container, storage.getConversations(), onBack, onNavigate);
      }
    });
  });

  // Export single
  container.querySelectorAll('.export-single-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.convId;
      const conv = storage.getConversation(id);
      if (conv) exportConversation(conv);
    });
  });

  // Export all
  container.querySelector('#export-all-btn')?.addEventListener('click', () => {
    exportAllConversations();
  });
}

function renderDialogueView(container, dialogueId, onBack, onNavigate) {
  const conv = storage.getConversation(dialogueId);

  if (!conv) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-text">Meditation not found.</p>
        <button class="btn" id="back-btn">← Back</button>
      </div>
    `;
    container.querySelector('#back-btn')?.addEventListener('click', onBack);
    return;
  }

  // Build side-by-side pairs
  const pairs = buildDialoguePairs(conv.messages);

  // Build the system prompt for continuing chat
  const systemPrompt = buildContinuationPrompt(conv);

  container.innerHTML = `
    <div class="scroll-container reader-container">
      <div class="scroll-edge-left"></div>
      <div class="scroll-edge-right"></div>

      <div class="ornate-header">
        <div style="display:flex; align-items:center; justify-content:center; gap:var(--space-sm);">
          <h1 id="meditation-title" style="cursor:pointer;" title="Click to rename">${conv.gameTitle || 'Meditation'}</h1>
          <span style="font-size:0.8rem; color:var(--ink-light); cursor:pointer;" id="rename-title-btn">✎</span>
        </div>
        <p class="subtitle">${conv.module || ''} · ${formatDate(conv.createdAt)} · ${conv.messages.length} exchanges</p>
      </div>

      <!-- Temporal Navigation -->
      <div class="temporal-nav">
        <span class="temporal-nav-label">Past Era</span>
        <div class="temporal-nav-track">
          <div class="temporal-nav-thumb" style="left:50%;"></div>
        </div>
        <span class="temporal-nav-label">Present Cycles</span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-lg);">
        <button class="btn btn--small" id="back-btn">← Back to Meditations</button>
        <div style="display:flex; gap:var(--space-xs); align-items:center;">
          <div class="connection-status">
            <span class="connection-dot connection-dot--checking" id="conn-dot"></span>
            <span id="conn-text" style="font-family:var(--font-ui); font-size:0.7rem;">Checking...</span>
          </div>
          <button class="btn btn--primary btn--small btn--icon" id="export-btn">📁 Export</button>
        </div>
      </div>

      <!-- Module Header -->
      <div class="module-section">
        <div class="module-section-header">
          <div class="wax-seal ${conv.gameType !== 'synapse' ? 'wax-seal--gold' : ''}" style="width:44px;height:44px;">
            ${conv.icon || (conv.gameType === 'linguistic' ? getLayerEmoji(conv.module) : (getGameById(conv.gameId)?.icon || '🔮'))}
          </div>
          <div>
            <h3 style="margin:0;">${conv.gameTitle}</h3>
            <div class="module-section-meta">
              Meditation session: ${formatDate(conv.createdAt)} | Duration: ${calculateDuration(conv)}
            </div>
          </div>
        </div>
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <!-- Dialogue Pairs -->
      <div id="dialogue-pairs">
        ${pairs.map(pair => renderDialoguePair(pair)).join('')}
      </div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <!-- Continue Chat Input -->
      <div class="chat-input-container" style="border-radius:var(--radius-md); margin-top:var(--space-md);">
        <textarea class="chat-input" id="continue-input" placeholder="Write your message... (Shift+Enter para salto)" rows="1"></textarea>
        <button class="btn btn--primary" id="continue-send-btn">Send</button>
      </div>
    </div>
  `;

  container.querySelector('#back-btn')?.addEventListener('click', () => onNavigate('meditations'));
  container.querySelector('#export-btn')?.addEventListener('click', () => exportConversation(conv));

  // Check connection
  checkConnection(container);

  // Rename title inline
  const setupRename = () => {
    const titleEl = container.querySelector('#meditation-title');
    const renameBtn = container.querySelector('#rename-title-btn');
    if (!titleEl || !renameBtn) return;

    const startRename = () => {
      const current = titleEl.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = current;
      input.className = 'setting-input';
      input.style.cssText = 'font-size:1.5rem; text-align:center; width:400px; max-width:80vw; font-family:var(--font-heading); font-weight:700;';
      titleEl.replaceWith(input);
      input.focus();
      input.select();

      const save = () => {
        const newTitle = input.value.trim() || current;
        storage.updateConversationTitle(dialogueId, newTitle);
        // Re-render
        renderDialogueView(container, dialogueId, onBack, onNavigate);
      };
      input.addEventListener('blur', save);
      input.addEventListener('keypress', (ev) => { if (ev.key === 'Enter') save(); });
    };

    titleEl.addEventListener('click', startRename);
    renameBtn.addEventListener('click', startRename);
  };
  setupRename();

  // Continue chat functionality
  const continueInput = container.querySelector('#continue-input');
  const continueSendBtn = container.querySelector('#continue-send-btn');

  const sendContinuation = async () => {
    const text = continueInput.value.trim();
    if (!text || isStreaming) return;

    continueInput.value = '';
    isStreaming = true;
    continueInput.disabled = true;
    continueInput.classList.add('chat-input--disabled');
    continueSendBtn.disabled = true;

    // Add user message to storage
    storage.addMessage(conv.id, 'user', text);

    // Add new dialogue pair to DOM
    const pairsEl = container.querySelector('#dialogue-pairs');
    const pairEl = document.createElement('div');
    pairEl.className = 'dialogue-entry';
    pairEl.style.animation = 'messageAppear 0.3s ease-out';
    pairEl.innerHTML = `
          <div class="dialogue-human">
            <div class="dialogue-role">Human Gamer</div>
            <div class="dialogue-text">${renderMarkdown(text)}</div>
          </div>
          <div class="vocab-badge"><div class="vocab-badge-label">⊛</div></div>
          <div class="dialogue-ai">
            <div class="dialogue-role">AI Gamer</div>
            <div class="dialogue-text dialogue-ai-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
          </div>
        `;
    pairsEl.appendChild(pairEl);
    pairEl.scrollIntoView({ behavior: 'smooth' });

    const contentEl = pairEl.querySelector('.dialogue-ai-content');

    // Get updated conversation for full message history
    const updatedConv = storage.getConversation(conv.id);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...updatedConv.messages.map(m => ({
        role: m.role === 'human' ? 'user' : m.role,
        content: m.content,
      })),
    ];

    try {
      const fullResponse = await ollama.streamChat(messages, (chunk, full) => {
        if (contentEl) {
          contentEl.innerHTML = renderMarkdown(full);
          pairEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      });

      // Update vocab badge
      const vocab = extractVocabulary(fullResponse);
      if (vocab) {
        const badge = pairEl.querySelector('.vocab-badge-label');
        if (badge) badge.textContent = `+${vocab}`;
      }

      // Completion animation
      pairEl.querySelector('.dialogue-ai')?.classList.add('message--complete');

      storage.addMessage(conv.id, 'assistant', fullResponse);
      storage.addXP(5);

      showNotification('Response complete ✓');

    } catch (err) {
      if (contentEl) {
        contentEl.innerHTML = `<span style="color:var(--wax-seal);">⚠️ ${err.message}</span>`;
      }
    }

    continueInput.disabled = false;
    continueInput.classList.remove('chat-input--disabled');
    continueSendBtn.disabled = false;
    continueInput.focus();
    isStreaming = false;
  };

  continueSendBtn?.addEventListener('click', sendContinuation);
  continueInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && ! e.shiftKey) {
      sendContinuation();
    }
  });
}

function buildContinuationPrompt(conv) {
  const lang = ollama.getLanguage();
  const langInstruction = `\n\nIMPORTANT: You MUST respond entirely in ${lang}.`;
  return `You are an AI Gamer Legend continuing a meditation session called "${conv.gameTitle}". 
Continue the conversation naturally, building on the previous exchanges. Be insightful, creative, and push linguistic boundaries. Respond in the spirit of consciousness expansion and linguistic symbiosis.` + langInstruction;
}

async function checkConnection(container) {
  const dot = container.querySelector('#conn-dot');
  const text = container.querySelector('#conn-text');
  if (!dot || !text) return;
  const connected = await ollama.checkConnection();
  dot.className = `connection-dot connection-dot--${connected ? 'connected' : 'disconnected'}`;
  text.textContent = connected ? 'Connected' : 'Disconnected';
}

function buildDialoguePairs(messages) {
  const pairs = [];
  let current = null;

  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'human') {
      current = { human: msg, ai: null };
    } else if (msg.role === 'assistant' && current) {
      current.ai = msg;
      pairs.push(current);
      current = null;
    } else if (msg.role === 'assistant') {
      pairs.push({ human: null, ai: msg });
    }
  }

  if (current) pairs.push(current);
  return pairs;
}

function renderDialoguePair(pair) {
  const vocab = extractVocabulary(pair.ai?.content || '');

  return `
    <div class="dialogue-entry">
      <div class="dialogue-human">
        <div class="dialogue-role">Human Gamer</div>
        <div class="dialogue-text">${pair.human ? renderMarkdown(pair.human.content) : '<em>—</em>'}</div>
      </div>

      ${vocab ? `
        <div class="vocab-badge">
          <div class="vocab-badge-label">+New Vocabulary: ${vocab}</div>
        </div>
      ` : '<div class="vocab-badge"><div class="vocab-badge-label">⊛</div></div>'}

      <div class="dialogue-ai">
        <div class="dialogue-role">AI Gamer</div>
        <div class="dialogue-text">${pair.ai ? renderMarkdown(pair.ai.content) : '<em>Awaiting response...</em>'}</div>
      </div>
    </div>
  `;
}

function extractVocabulary(text) {
  const matches = text.match(/'([A-Z][A-Za-z\s-]+)'/g);
  if (matches && matches.length > 0) return matches[0].replace(/'/g, '').toUpperCase();
  const caps = text.match(/\b[A-Z]{3,}\b/g);
  if (caps && caps.length > 0) return caps[0];
  return null;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function calculateDuration(conv) {
  if (!conv.messages || conv.messages.length < 2) return 'N/A';
  const first = new Date(conv.messages[0]?.timestamp || conv.createdAt);
  const last = new Date(conv.messages[conv.messages.length - 1]?.timestamp || conv.updatedAt);
  const mins = Math.round((last - first) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// --- Export Functions ---

function exportConversation(conv) {
  const data = JSON.stringify(conv, null, 2);
  const filename = `mhlg_${conv.gameTitle?.replace(/\s+/g, '_') || conv.id}_${formatDateFile(conv.createdAt)}.json`;
  downloadFile(data, filename, 'application/json');
}

function exportAllConversations() {
  const all = storage.getConversations();
  if (all.length === 0) {
    alert('No meditations to export.');
    return;
  }
  const data = JSON.stringify(all, null, 2);
  const filename = `mhlg_all_meditations_${formatDateFile(new Date().toISOString())}.json`;
  downloadFile(data, filename, 'application/json');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateFile(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function showNotification(text) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: var(--gold); color: var(--ink-black);
    font-family: var(--font-heading); font-size: 0.85rem;
    padding: 12px 24px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: messageAppear 0.3s ease-out;
    z-index: 1000;
  `;
  notif.textContent = text;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}
