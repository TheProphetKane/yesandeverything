// saved-labels.js - localStorage list of named label snapshots.
//
// Schema per entry: { id, name, createdAt, updatedAt, state }
// state is a full state snapshot from the main store.
//
// Deliberately no static import of ./persist.js. main.js loads that module
// dynamically with a cache-busted URL and this module runs the same way; a
// static import here would pull in a second, un-versioned instance that can
// serve stale code after a deploy (cache-bust contract, PROJECT_SPEC 3.1,
// bar-raise architecture-01). notifyStorageError arrives via configure()
// instead, called once from main.js right after the dynamic import resolves.

const KEY = 'yesandapothecary.v1.saved';

let notifyStorageError = () => {};
export function configure({ notifyStorageError: fn } = {}) {
  if (typeof fn === 'function') notifyStorageError = fn;
}

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch (err) {
    // A corrupted entry used to silently discard the user's entire
    // saved-label library with no on-screen warning (bar-raise
    // reliability-01). Surface it; the panel still renders empty-but-safe.
    notifyStorageError('saved-labels', err, 'read');
    return [];
  }
}

function write(list) {
  try {
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
  write(list);
  return entry;
}

export function updateLabel(id, snapshot) {
  const list = read();
  const e = list.find(x => x.id === id);
  if (!e) return null;
  e.state = structuredClone(snapshot);
  e.updatedAt = Date.now();
  write(list);
  return e;
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
