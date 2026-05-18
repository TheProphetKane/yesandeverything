// state.js - tiny observable store.
//
// Single source of truth for the editor. The render layer reads from get();
// the editor writes via set(); both subscribe for updates.

export function createState(initial) {
  let state = structuredClone(initial);
  const listeners = new Set();

  function get() { return state; }

  function set(patch) {
    state = { ...state, ...patch };
    notify();
  }

  function patchNested(path, value) {
    const parts = path.split('.');
    const next = structuredClone(state);
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    state = next;
    notify();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    for (const fn of listeners) fn(state);
  }

  return { get, set, patchNested, subscribe };
}

// Default placement: which side(s) each placeable item appears on.
// front+back booleans. Both false = hidden. Both true = on both sides.
// Adding a new placeable item: add an entry here AND a row in editor.js
// PLACEMENT_ROWS so the user gets a checkbox.
export const DEFAULT_PLACEMENT = {
  shop:         { front: true,  back: false },
  description:  { front: true,  back: false },
  descFull:     { front: false, back: true  },
  props:        { front: true,  back: false },
  symbol:       { front: true,  back: false },
  botanical:    { front: true,  back: false },
  rune1:        { front: true,  back: false },
  rune2:        { front: true,  back: false },
  rune3:        { front: true,  back: false },
  historicUses: { front: false, back: true  },
  nutrition:    { front: false, back: true  },
  pairings:     { front: false, back: true  },
};

export function defaultState() {
  return {
    templateId: 'apothecary-3x1.5',
    sizeId: 'medium',
    shopName: "Lynn's Apothocary",
    herbName: 'Chamomile',
    latin: 'Matricaria chamomilla',
    props: 'Healing · Sleep · Peace · Solar Magic',
    description: 'Sun-blessed and gentle. Heals the body, quiets the restless mind. The Celts drank it at dawn to greet the light.',
    accent: '#C4922A',
    symbol: 'solar-wheel',
    botanical: 'flower',
    icon: 'chamomile',
    runes: [
      { c: 'ᛚ', m: 'Healing Flow' },
      { c: 'ᛁ', m: 'Stillness & Peace' },
      { c