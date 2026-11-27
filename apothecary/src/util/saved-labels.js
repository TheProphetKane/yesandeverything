// saved-labels.js - localStorage list of named label snapshots.
//
// Schema per entry: { id, name, createdAt, updatedAt, state }
// state is a full state snapshot from the main store.
//
// Deliberately no static import of ./persist.js. main.js loads that module
// dynamically with a cache-busted URL and this module runs the same way; a
// static import here would pull in a second, un-versioned instance that can
// serve stale code after a deploy (cache-bust contract, PROJECT_SPEC 3.1).
// notifyStorageError arrives via configure() instead, called once from main.js
// right after the dynamic import resolves.

const KEY = 'yesandapothecary.v1.saved';

let notifyStorageError = () => {};
export function configure({ notifyStorageError: fn } = {}) {
  if (typeof fn === 'function') notifyStorageError = fn;
}

// A stored library that will not parse, or that holds an entry without a string id and an
// object state, is copied whole to this key before anything else happens to
// it. read() then returns only the usable entries, and write() refuses to
// replace an unreadable library until that copy is safely stored, because
// every save, rename and delete writes a list built from read() straight
// back over the main key.
export const SAVED_BACKUP_KEY = KEY + '.corrupt-backup';

function isEntry(e) {
  return !!e && typeof e === 'object' && !Array.isArray(e)
    && typeof e.id === 'string' && e.id.length > 0
    && !!e.state && typeof e.state === 'object' && !Array.isArray(e.state);
}

// { list, clean, error }: clean is false when the raw string did not parse to
// an array, or when any entry in it failed isEntry.
function parseLibrary(raw) {
  if (raw == null) return { list: [], clean: true, error: null };
  let v;
  try {
    v = JSON.parse(raw);
  } catch (err) {
    return { list: [], clean: false, error: err };
  }
  if (!Array.isArray(v)) return { list: [], clean: false, error: null };
  const list = v.filter(isEntry);
  return { list, clean: list.length === v.length, error: null };
}

// True once the backup key holds exactly this string.
function keepCopy(raw) {
  try {
    if (localStorage.getItem(SAVED_BACKUP_KEY) !== raw) localStorage.setItem(SAVED_BACKUP_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

function read() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch (err) {
    notifyStorageError('saved-labels', err, 'read');
    return [];
  }
  const { list, clean, error } = parseLibrary(raw);
  if (!clean) {
    // A corrupted entry used to silently discard the user's entire
    // saved-label library with no on-screen warning. Surface it; the panel
    // still renders what it can.
    const kept = keepCopy(raw);
    notifyStorageError('saved-labels', error, 'read', kept ? SAVED_BACKUP_KEY : null);
  }
  return list;
}

function write(list) {
  try {
    const current = localStorage.getItem(KEY);
    if (current != null && !parseLibrary(current).clean && !keepCopy(current)) {
      // The library on disk is unreadable and no copy of it could be kept,
      // so overwriting it now would destroy the only one.
      notifyStorageError('saved-labels', null, 'write');
      return false;
    }
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    // Saving a label is an explicit user action, so every failed write
    // surfaces a warning, not just the first.
    notifyStorageError('saved-labels', err);
    return false;
  }
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'l' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function listSaved() {
  return read().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function saveLabel(name, snapshot) {
  const list = read();
  const entry = {
    __schemaVersion: 1,
    id: uid(),
    name: (name || 'Untitled').slice(0, 60),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state: structuredClone(snapshot),
  };
  list.push(entry);
  // A failed write (full storage quota) returns null so the panel keeps the
  // typed name for a retry instead of clearing it over a save that never landed.
  return write(list) ? entry : null;
}

export function loadLabel(id) {
  return read().find(e => e.id === id) ?? null;
}

export function deleteLabel(id) {
  write(read().filter(e => e.id !== id));
}

export function duplicateLabel(id) {
  const src = loadLabel(id);
  if (!src) return null;
  return saveLabel(src.name + ' (copy)', src.state);
}

export function renameLabel(id, newName) {
  const list = read();
  const e = list.find(x => x.id === id);
  if (!e) return;
  e.name = (newName || e.name).slice(0, 60);
  e.updatedAt = Date.now();
  write(list);
}
