// persist.js - save and restore state to localStorage.
//
// Versioned key so future schema migrations are explicit.
// Debounced save so we don't write on every keystroke.

const STORAGE_KEY = 'yesandapothecary.v1.state';

// Broadcast a storage write failure so the editor can show a status line.
// Detail carries which store failed and the error name (QuotaExceededError,
// SecurityError when storage is disabled, etc).
export function notifyStorageError(key, err) {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent('yaa:storage-error', {
    detail: { key, error: err && err.name ? err.name : 'StorageError' },
  }));
}

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

// Warn once per failure streak; the debounced autosave fires constantly and
// must not spam the status line while the quota stays exceeded. A successful
// save resets the flag so a later failure warns again.
let autosaveWarned = false;

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    autosaveWarned = false;
  } catch (err) {
    // Persistence is best-effort, but silent loss used to masquerade as saved.
    if (!autosaveWarned) {
      autosaveWarned = true;
      notifyStorageError('state', err);
    }
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
