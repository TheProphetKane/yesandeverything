// persist.js - save and restore state to localStorage.
//
// Versioned key so future schema migrations are explicit.
// Debounced save so we don't write on every keystroke.

const STORAGE_KEY = 'yesandapothecary.v1.state';
// Backlog B04: an autosave entry that will not parse is copied here before
// the editor starts fresh, because the next debounced save writes over the
// main key. One copy, the latest unreadable one; the status line offers it
// as a download.
export const STATE_BACKUP_KEY = STORAGE_KEY + '.corrupt-backup';

// Broadcast a storage failure so the editor can show a status line. Detail
// carries which store failed, the error name (QuotaExceededError,
// SecurityError when storage is disabled, etc), and which operation failed:
// 'read' (a corrupted or unparseable entry, data is lost) vs 'write' (best
// effort, quota exceeded) get different on-screen wording. backupKey names
// the key that holds a copy of an unreadable entry, and is set only when that
// copy was written, so the status line can offer it as a download.
export function notifyStorageError(key, err, op = 'write', backupKey = null) {
  if (typeof document === 'undefined') return;
  const detail = { key, op, error: err && err.name ? err.name : 'StorageError' };
  if (backupKey) detail.backupKey = backupKey;
  document.dispatchEvent(new CustomEvent('yaa:storage-error', { detail }));
}

// Copies an unreadable entry aside. Returns false when the copy could not be
// written either (a full quota is the likely reason), so the caller still
// warns and nothing worse happens than before the backup existed.
function backupUnreadable(raw) {
  try {
    localStorage.setItem(STATE_BACKUP_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

export function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    // Valid JSON that is not a state object (a bare number, null, an array)
    // is as unreadable as broken JSON, and the next save overwrites it too.
    const kept = backupUnreadable(raw);
    notifyStorageError('state', null, 'read', kept ? STATE_BACKUP_KEY : null);
    return null;
  } catch (err) {
    // A corrupted or unparseable entry silently discarded the user's
    // autosaved label with no on-screen warning before this call. Surface it;
    // the app still boots clean, with the raw string copied aside first
    // (backlog B04).
    const kept = raw ? backupUnreadable(raw) : false;
    notifyStorageError('state', err, 'read', kept ? STATE_BACKUP_KEY : null);
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
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Reset-to-default used to swallow this, so a failed clear looked like a
    // successful one and the old label came back on the next load. Route it
    // through the same channel as loadState and saveState so the status line
    // says something.
    notifyStorageError('state', err, 'clear');
  }
}

export function debounce(fn, ms = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
