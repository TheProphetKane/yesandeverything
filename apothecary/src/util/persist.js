// persist.js — save and restore state to localStorage.
//
// Versioned key so future schema migrations are explicit.
// Debounced save so we don't write on every keystroke.

const STORAGE_KEY = 'yesandapothecary.v1.state';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage disabled. Silent — persistence is a nice-to-have.
  }
}

export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function debounce(fn, ms = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
