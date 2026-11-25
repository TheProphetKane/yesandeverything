// layout-ops.js - the layout designer's zone and item mutations as pure
// functions over a layout object { front: [zone], back: [zone], hidden: [item] }.
// No DOM access and no state store: each function clones the layout it is
// given and returns the changed copy, or null when the target zone is gone
// and nothing should change. test-layout-ops.mjs drives them directly.
//
// Pulled out of src/ui/layout-designer.js, where they were closures nothing
// could test. Loaded through editor.js's versioned Promise.all block and handed
// to the designer through deps, never imported statically (the cache-bust rule
// in CLAUDE.md and PROJECT_SPEC 3.1).
//
// v0.15 item shape: a zone item is { key, color?, glow? } or a legacy bare
// string. Zones allow several instances of one key, so a placed item is
// addressed by (zone id, index). The hidden rail holds one per key.

const SIDES = ['front', 'back'];

export function itemKey(it) {
  return typeof it === 'string' ? it : (it && it.key) || '';
}

export function findZone(layout, zoneId) {
  for (const side of SIDES) {
    const idx = (layout[side] || []).findIndex(z => z.id === zoneId);
    if (idx >= 0) return { side, idx, zone: layout[side][idx] };
  }
  return null;
}

export function updateZone(layout, zoneId, fn) {
  const next = structuredClone(layout);
  const found = findZone(next, zoneId);
  if (!found) return null;
  next[found.side][found.idx] = fn(found.zone);
  return next;
}

// A removed zone's items go to the hidden rail, one per key. The old closure
// compared items by reference, so an object item (every item since v0.15)
// never matched and the rail could end up holding the same key twice.
export function removeZone(layout, zoneId) {
  const next = structuredClone(layout);
  const found = findZone(next, zoneId);
  if (!found) return null;
  next[found.side].splice(found.idx, 1);
  const hidden = next.hidden || [];
  for (const it of found.zone.items || []) {
    if (!hidden.some(h => itemKey(h) === itemKey(it))) hidden.push(it);
  }
  next.hidden = hidden;
  return next;
}

export function addZone(layout, side, makeZone) {
  const next = structuredClone(layout);
  const zone = makeZone({ layoutMode: 'stack', width: side === 'front' ? 50 : 100, items: [] });
  next[side] = [...(next[side] || []), zone];
  return next;
}

// A fresh instance at the end of the zone. Duplicates are intentional.
export function addItem(layout, zoneId, key) {
  const next = structuredClone(layout);
  const found = findZone(next, zoneId);
  if (!found) return null;
  found.zone.items = [...(found.zone.items || []), { key }];
  return next;
}

export function updateInstance(layout, zoneId, index, patch) {
  const next = structuredClone(layout);
  const found = findZone(next, zoneId);
  if (!found) return null;
  const cur = (found.zone.items || [])[index];
  if (cur === undefined) return null;
  found.zone.items[index] = { ...(typeof cur === 'string' ? { key: cur } : cur), ...patch };
  return next;
}

// Moves one instance from a zone (or the hidden rail) to a zone (or the
// hidden rail), carrying its colour and glow. insertHint is the drop
// target's index in the destination zone as the designer drew it, with an
// optional ':after' suffix; null appends.
//
// The hint counts slots before the moved chip leaves. When the chip moves
// forward inside its own zone, its removal shifts every later slot down by
// one, so the insert point shifts with them. The old closure skipped that
// step and dropped a forward move one slot past where it was aimed.
export function moveItem(layout, key, fromZoneId, fromIndex, toZoneId, insertHint) {
  const next = structuredClone(layout);
  let moved = null;
  let removedAt = -1;

  if (fromZoneId === 'hidden') {
    const idx = (next.hidden || []).findIndex(it => itemKey(it) === key);
    if (idx >= 0) {
      moved = next.hidden[idx];
      next.hidden.splice(idx, 1);
    }
  } else {
    const src = findZone(next, fromZoneId);
    if (src) {
      const items = src.zone.items || [];
      // Trust the index only while it still points at this key; a stale
      // index falls back to the first instance of the key.
      const i = (Number.isInteger(fromIndex) && fromIndex >= 0 && itemKey(items[fromIndex]) === key)
        ? fromIndex
        : items.findIndex(it => itemKey(it) === key);
      if (i >= 0) {
        moved = items[i];
        items.splice(i, 1);
        removedAt = i;
      }
    }
  }

  // A legacy bare string becomes an object so a later colour or glow edit
  // has somewhere to land.
  if (typeof moved === 'string') moved = { key: moved };
  if (!moved) moved = { key };

  if (toZoneId === 'hidden') {
    const hidden = next.hidden || [];
    if (!hidden.some(it => itemKey(it) === key)) hidden.push(moved);
    next.hidden = hidden;
    return next;
  }

  const dst = findZone(next, toZoneId);
  if (!dst) return null;
  const items = dst.zone.items || (dst.zone.items = []);
  let pos = items.length;
  if (insertHint != null && insertHint !== '') {
    const hint = String(insertHint);
    const after = hint.endsWith(':after');
    const target = parseInt(after ? hint.slice(0, -':after'.length) : hint, 10);
    if (Number.isFinite(target)) {
      pos = after ? target + 1 : target;
      if (fromZoneId === toZoneId && removedAt >= 0 && removedAt < pos) pos -= 1;
      pos = Math.max(0, Math.min(pos, items.length));
    }
  }
  items.splice(pos, 0, moved);
  return next;
}
