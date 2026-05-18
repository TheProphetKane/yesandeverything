// saved-labels.js - localStorage list of named label snapshots.
//
// Schema per entry: { id, name, createdAt, updatedAt, state }
// state is a full state snapshot from the main store.

const KEY = 'yesandapothecary.v1.saved';

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded — silent, since persistence is best-effort.
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
