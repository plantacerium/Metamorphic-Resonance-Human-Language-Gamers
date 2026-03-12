/**
 * Chat Screen — AI Conversation Interface
 * Plays a game with Ollama using game-specific system prompts
 * Uses Reader-style side-by-side dialogue layout
 */
import { getGameById, getLinguisticGameById, getLayerEmoji } from '../data/games.js';
import { getSovereignGameById } from '../services/sovereign.js';
import * as ollama from '../services/ollama.js';
import * as storage from '../services/storage.js';
import { renderMarkdown } from '../services/markdown.js';
import { startSession, endSession } from '../services/timetracker.js';

let currentConversation = null;
let isStreaming = false;

export function renderChat(container, gameId, gameType, onBack) {
  const game = gameType === 'linguistic'
    ? getLinguisticGameById(gameId)
    : gameType === 'sovereign'
      ? getSovereignGameById(gameId)
      : getGameById(gameId);

  if (!game) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-text">Game not found</p><button class="btn" id="back-btn">← Back to Chronicle</button></div>`;
    container.querySelector('#back-btn')?.addEventListener('click', onBack);
    return;
  }

  // Update the Header Title logic to handle both .game and .title
  const displayTitle = game.game || game.title;
  const displaySubtitle = gameType === 'linguistic'
    ? `${game.layer} · ${game.legacy_spanish_word} → ${game.new_kernel_concept}`
    : `${game.module || game.layer} · ${game.mechanic}`;

  // Time Tracking: Start session
  startSession(gameId, displayTitle, game.module || game.layer || gameType);

  // Create or resume conversation
  currentConversation = storage.createConversation(game, gameType);
  storage.saveConversation(currentConversation);

  const systemPrompt = buildSystemPrompt(game, gameType);

  container.innerHTML = `
    <div class="scroll-container reader-container">
      <div class="scroll-edge-left"></div>
      <div class="scroll-edge-right"></div>

      <!-- Header -->
      <div class="ornate-header">
      <h1>${displayTitle}</h1>
    <p class="subtitle">${displaySubtitle}</p>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-sm);">
        <button class="btn btn--small btn--icon" id="back-btn">← Back</button>
        <div style="display:flex; gap:var(--space-md); align-items:center;">
          <div class="connection-status" id="connection-status">
            <span class="connection-dot connection-dot--checking" id="conn-dot"></span>
            <span id="conn-text">Checking...</span>
          </div>
          <div style="display:flex; gap:var(--space-xs); align-items:center;">
            <label style="font-family:var(--font-ui); font-size:0.7rem; color:var(--ink-faded);">Model:</label>
            <select class="model-selector" id="model-select">
              <option>${ollama.getSettings().model}</option>
            </select>
          </div>
        </div>
      </div>

        <div class="module-section">
          <div class="module-section-header">
            <div class="wax-seal wax-seal--gold" style="width:44px;height:44px;">${game.icon || (gameType === 'linguistic' ? getLayerEmoji(game.layer) : '🔮')}</div>
            <div>
              <h3 style="margin:0;">${game.title || game.game}</h3>
              <div class="module-section-meta">
                <em>${game.mechanic || game.objective}</em>
              </div>
            </div>
          </div>
        </div>
      }

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <!-- Messages -->
      <div id="chat-messages" class="chat-dialogue-area"></div>

      <div class="divider"><span class="divider-symbol">⊛</span></div>

      <!-- Input -->
      <div class="chat-input-container">
        <textarea class="chat-input" id="chat-input" placeholder="Write your message... (Shift+Enter para salto)" rows="1"></textarea>
        <button class="btn btn--primary" id="send-btn">Send</button>
        <button class="btn btn--small" id="save-btn" title="Save dialogue">💾</button>
        <button class="btn btn--small" id="export-btn" title="Export to local folder">📤</button>
      </div>
    </div>
  `;

  // Check connection and load models
  checkOllamaConnection(container);
  loadModels(container);

  // Back button
  container.querySelector('#back-btn').addEventListener('click', () => {
    endSession();
    onBack();
  });

  // Send message
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text || isStreaming) return;

    input.value = '';
    appendDialoguePair(text, null);
    storage.addMessage(currentConversation.id, 'user', text);

    // Build messages array for Ollama
    const messages = [
      { role: 'system', content: systemPrompt },
      ...currentConversation.messages.map(m => ({
        role: m.role === 'human' ? 'user' : m.role,
        content: m.content,
      })),
    ];
    const userEmbedding = await ollama.generateEmbedding(text);

    let contextInjection = "";

    if (userEmbedding) {
      // 3. Store the thought in the Akashic Record
      storeVector(messages, userEmbedding, 'user', currentConversation.id);

      // 4. Retrieve resonant past memories (RAG logic)
      const resonantMemories = retrieveRelevantMemories(userEmbedding, currentConversation.id, 15); // Get top 2

      // 5. Build context if memories are found (Threshold > 0.6 means they are quite similar)
      const highResonanceMemories = resonantMemories.filter(m => m.score > 0.6);
      if (highResonanceMemories.length > 0) {
        contextInjection = `\n\n[SYSTEM NOTE: The human's current thought strongly resonates with these past memories\n`;
        highResonanceMemories.forEach(m => {
          contextInjection += `- ${m.text}\n`;
        });
        contextInjection += `Use this context to weave a deeper narrative.]\n`;
      }
    }

    const augmentedPrompt = contextInjection ? messages + contextInjection : messages;

    const aiResponse = await getAIResponse(augmentedPrompt);

    const aiEmbedding = await generateEmbedding(aiResponseText);
    if (aiEmbedding) {
      storeVector(aiResponseText, aiEmbedding, 'ai', currentConversation.id);
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { // Cambiado de 'keypress' a 'keydown' para mejor control
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Evita que se cree una nueva línea al enviar
      sendMessage();
    }
    // Si presiona Shift + Enter, el preventDefault no se ejecuta y el textarea crea el salto de línea automáticamente.
  });

  container.querySelector('#save-btn').addEventListener('click', () => {
    if (currentConversation) {
      storage.saveConversation(currentConversation);
      showNotification('Dialogue saved to the Chronicle ✓');
    }
  });

  // Export button
  container.querySelector('#export-btn')?.addEventListener('click', async () => {
    if (currentConversation) {
      try {
        const exported = await storage.exportConversation(currentConversation);
        if (exported) showNotification('Chat exported successfully ✓');
      } catch (err) {
        showNotification('❌ Export failed');
        console.error(err);
      }
    }
  });

  // Model selector change
  document.getElementById('model-select')?.addEventListener('change', (e) => {
    ollama.setModel(e.target.value);
  });
}

function buildSystemPrompt(game, gameType) {
  const lang = ollama.getLanguage();
  const langInstruction = `\n\nIMPORTANT: You MUST respond entirely in ${lang}.`;

  if (gameType === 'linguistic') {
    const base = game.ollama_system_prompt || `You are a Consciousness Guide. Help the user transmute the concept of "${game.legacy_spanish_word}" using ${game.layer} logic into "${game.new_kernel_concept}". ${game.mechanic}`;
    return base + langInstruction;
  } else if (gameType === 'sovereign') {
    // Build from sovereign custom game fields
    if (game.ollama_system_prompt) {
      return game.ollama_system_prompt + langInstruction;
    }
    const title = game.title || game.game || 'Custom Game';
    const objective = game.objective || game.quest_objective || 'Explore consciousness expansion';
    const concept = game.concept || game.new_kernel_concept || '';
    const legacyWord = game.legacy_spanish_word || '';
    return `You are an AI Gamer Legend playing a custom consciousness expansion game called "${title}".
${game.ai_role ? `Your role: ${game.ai_role}` : ''}
${game.human_role ? `The human's role: ${game.human_role}` : ''}
${game.mechanic ? `Mechanic: ${game.mechanic}` : ''}
${concept ? `Core Concept: ${concept}` : ''}
${legacyWord ? `Legacy Word to transmute: ${legacyWord}` : ''}
Goal: ${objective}

Guide the human through this game. Be insightful, creative, and push their boundaries. Respond in the spirit of consciousness expansion.` + langInstruction;
  } else {
    const title = game.game || game.title;
    const objective = game.human_expansion || game.objective;

    return `You are an AI Gamer Legend playing a linguistic expansion game called "${title}". 
Your role: ${game.ai_role}
The human's role: ${game.human_role}
Mechanic: ${game.mechanic}
Goal for the human: ${objective}

Guide the human through this game. Be insightful, creative, and push their linguistic boundaries. Respond in the spirit of consciousness expansion and linguistic symbiosis.` + langInstruction;
  }
}

/**
 * Append a dialogue pair to the chat area (side-by-side Reader style)
 */
function appendDialoguePair(humanText, aiText) {
  const messagesEl = document.getElementById('chat-messages');
  const pairEl = document.createElement('div');
  pairEl.className = 'dialogue-entry';
  pairEl.innerHTML = `
      <div class="dialogue-human">
        <div class="dialogue-role">Human Gamer</div>
        <div class="dialogue-text">${renderMarkdown(humanText)}</div>
      </div>
      <div class="vocab-badge"><div class="vocab-badge-label">⊛</div></div>
      <div class="dialogue-ai">
        <div class="dialogue-role">AI Gamer</div>
        <div class="dialogue-text dialogue-ai-content">${aiText ? renderMarkdown(aiText) : '<em>Awaiting response...</em>'}</div>
      </div>
    `;
  pairEl.style.animation = 'messageAppear 0.3s ease-out';
  messagesEl.appendChild(pairEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return pairEl;
}

async function getAIResponse(messages) {
  isStreaming = true;
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const messagesEl = document.getElementById('chat-messages');

  // Disable input during streaming
  if (input) { input.disabled = true; input.classList.add('chat-input--disabled'); }
  if (sendBtn) { sendBtn.disabled = true; }

  // Find the last dialogue pair's AI content area
  const lastPair = messagesEl.querySelector('.dialogue-entry:last-child');
  const contentEl = lastPair?.querySelector('.dialogue-ai-content');

  // Show typing indicator
  if (contentEl) {
    contentEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  }

  try {
    const fullResponse = await ollama.streamChat(messages, (chunk, full) => {
      if (contentEl) {
        contentEl.innerHTML = renderMarkdown(full);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });

    // Update vocab badge if possible
    const vocab = extractVocabulary(fullResponse);
    if (vocab && lastPair) {
      const badge = lastPair.querySelector('.vocab-badge-label');
      if (badge) badge.textContent = `+${vocab}`;
    }

    // Completion animation
    if (lastPair) {
      lastPair.querySelector('.dialogue-ai')?.classList.add('message--complete');
    }

    storage.addMessage(currentConversation.id, 'assistant', fullResponse);
    currentConversation = storage.getConversation(currentConversation.id);
    storage.addXP(5);

    showNotification('Response complete ✓');

  } catch (err) {
    if (contentEl) {
      contentEl.innerHTML = `<span style="color:var(--wax-seal);">⚠️ Connection error: ${err.message}. Make sure Ollama is running at ${ollama.getSettings().baseUrl}</span>`;
    }
  }

  // Re-enable input
  if (input) { input.disabled = false; input.classList.remove('chat-input--disabled'); input.focus(); }
  if (sendBtn) { sendBtn.disabled = false; }
  isStreaming = false;
}

function extractVocabulary(text) {
  const matches = text.match(/'([A-Z][A-Za-z\s-]+)'/g);
  if (matches && matches.length > 0) return matches[0].replace(/'/g, '').toUpperCase();
  const caps = text.match(/\b[A-Z]{3,}\b/g);
  if (caps && caps.length > 0) return caps[0];
  return null;
}

async function checkOllamaConnection(container) {
  const dot = container.querySelector('#conn-dot');
  const text = container.querySelector('#conn-text');
  const connected = await ollama.checkConnection();
  if (dot && text) {
    dot.className = `connection-dot connection-dot--${connected ? 'connected' : 'disconnected'}`;
    text.textContent = connected ? 'Connected' : 'Disconnected';
  }
}

async function loadModels(container) {
  const select = container.querySelector('#model-select');
  if (!select) return;
  const models = await ollama.listModels();
  const current = ollama.getSettings().model;
  if (models.length > 0) {
    select.innerHTML = models.map(m =>
      `<option value="${m.name}" ${m.name === current ? 'selected' : ''}>${m.name}</option>`
    ).join('');
  }
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
