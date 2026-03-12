/**
 * Time Tracker Service
 * Tracks time spent in games/topics for awareness dashboard
 * Also manages UI Lock for anti-addiction
 */

const TIME_LOG_KEY = 'mhlg_time_log';
const LOCK_KEY = 'mhlg_ui_lock';
const ACTIVE_SESSION_KEY = 'mhlg_active_session';

// ─── Time Tracking ───

/**
 * Get all time logs
 * Format: { [gameId]: { totalMs, sessions: [{start, end, durationMs}], title, category } }
 */
export function getTimeLog() {
  try {
    return JSON.parse(localStorage.getItem(TIME_LOG_KEY) || '{}');
  } catch {
    return {};
  }
}

function _saveTimeLog(log) {
  localStorage.setItem(TIME_LOG_KEY, JSON.stringify(log));
}

/**
 * Start a session for a game
 */
export function startSession(gameId, title = '', category = '') {
  const session = {
    gameId,
    title,
    category,
    start: Date.now(),
  };
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * End the current active session
 */
export function endSession() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    const end = Date.now();
    const durationMs = end - session.start;

    // Only log if at least 5 seconds
    if (durationMs < 5000) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }

    const log = getTimeLog();
    if (!log[session.gameId]) {
      log[session.gameId] = {
        totalMs: 0,
        sessions: [],
        title: session.title,
        category: session.category,
      };
    }

    const entry = log[session.gameId];
    entry.totalMs += durationMs;
    entry.title = session.title || entry.title;
    entry.category = session.category || entry.category;
    entry.sessions.push({
      start: session.start,
      end,
      durationMs,
      date: new Date(session.start).toISOString().slice(0, 10),
    });

    // Keep only last 100 sessions per game to manage storage
    if (entry.sessions.length > 100) {
      entry.sessions = entry.sessions.slice(-100);
    }

    _saveTimeLog(log);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    return { ...session, end, durationMs };
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  }
}

/**
 * Get summary stats for the dashboard
 */
export function getTimeSummary() {
  const log = getTimeLog();
  const entries = Object.entries(log);

  let totalMs = 0;
  let totalSessions = 0;
  const byCategory = {};
  const todaySessions = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [gameId, data] of entries) {
    totalMs += data.totalMs;
    totalSessions += data.sessions.length;

    const cat = data.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { totalMs: 0, count: 0 };
    byCategory[cat].totalMs += data.totalMs;
    byCategory[cat].count += data.sessions.length;

    for (const s of data.sessions) {
      if (s.date === today) {
        todaySessions.push({ ...s, gameId, title: data.title, category: cat });
      }
    }
  }

  const todayMs = todaySessions.reduce((sum, s) => sum + s.durationMs, 0);

  return {
    totalMs,
    totalSessions,
    totalGames: entries.length,
    todayMs,
    todaySessions: todaySessions.length,
    byCategory,
    topGames: entries
      .sort((a, b) => b[1].totalMs - a[1].totalMs)
      .slice(0, 10)
      .map(([id, d]) => ({ id, title: d.title, totalMs: d.totalMs, sessions: d.sessions.length })),
  };
}

/**
 * Format milliseconds as human-readable string
 */
export function formatDuration(ms) {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${remMins}m`;
}

/**
 * Get the last 7 days of usage
 */
export function getWeeklyHistory() {
  const log = getTimeLog();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en', { weekday: 'short' });
    let dayMs = 0;
    let daySessions = 0;

    for (const data of Object.values(log)) {
      for (const s of data.sessions) {
        if (s.date === dateStr) {
          dayMs += s.durationMs;
          daySessions++;
        }
      }
    }
    days.push({ date: dateStr, label: dayLabel, totalMs: dayMs, sessions: daySessions });
  }
  return days;
}

// ─── UI Lock (Anti-Addiction) ───

/**
 * Get current lock state
 * Returns { locked, unlockAt, message } or null
 */
export function getLockState() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const lock = JSON.parse(raw);
    if (lock.unlockAt && Date.now() >= lock.unlockAt) {
      // Lock expired
      localStorage.removeItem(LOCK_KEY);
      return null;
    }
    return lock;
  } catch {
    return null;
  }
}

/**
 * Lock the UI until a specified time
 * @param {number} durationMinutes - Lock duration in minutes
 * @param {string} message - Optional message to display
 */
export function lockUI(durationMinutes, message = '') {
  const lock = {
    locked: true,
    lockedAt: Date.now(),
    unlockAt: Date.now() + (durationMinutes * 60 * 1000),
    durationMinutes,
    message: message || `Take a break. UI unlocks in ${durationMinutes} minutes.`,
  };
  localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  return lock;
}

/**
 * Unlock the UI immediately
 */
export function unlockUI() {
  localStorage.removeItem(LOCK_KEY);
}

/**
 * Check if UI is currently locked
 */
export function isLocked() {
  return getLockState() !== null;
}

/**
 * Reset all time tracking data
 */
export function resetTimeLog() {
  localStorage.removeItem(TIME_LOG_KEY);
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}
