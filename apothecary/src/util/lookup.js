// lookup.js - fuzzy match a user-entered herb name against the DB.
//
// Order of operations: normalize → alias → exact → prefix → contains.
// Returns the herb record or null.

export function makeLookup(herbDB, aliasMap) {
  // Pre-sort keys longest-first so "rosemary" beats "rose" when both could match.
  const keys = Object.keys(herbDB).sort((a, b) => b.length - a.length);

  return function lookupHerb(raw) {
    if (!raw) return null;
    let q = raw.toLowerCase().trim().replace(/\./g, '');
    if (aliasMap[q]) q = aliasMap[q];
    if (herbDB[q]) return herbDB[q];
    for (const k of keys) {
      if (k.startsWith(q) || q.startsWith(k)) return herbDB[k];
    }
    for (const k of keys) {
      if (k.includes(q) || q.includes(k)) return herbDB[k];
    }
    return null;
  };
}
