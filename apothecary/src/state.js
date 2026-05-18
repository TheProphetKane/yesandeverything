// state.js — tiny observable store.
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
      const k = parts[i];
      cur = cur[k];
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

// Default state. Adding a new field: add it here AND backfill in main.js for
// restored sessions, so old localStorage state keeps working after upgrade.
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
    runes: [
      { c: 'ᛚ', m: 'Healing Flow' },
      { c: 'ᛁ', m: 'Stillness & Peace' },
      { c: 'ᛜ', m: 'Inner Peace' },
    ],

    // Back-label fields (v0.3). backEnabled flips the optional back-side render.
    backEnabled: false,
    descFull: 'Beloved of the sun and the hearth, chamomile heals the body and stills the restless mind. Ancient Celts honored it as a solar herb, drunk at dawn to greet the light. Sacred to Brigid; gathered on Imbolc for the year\'s hearth-fires.',
    historicUses: 'Druidic dawn-rite tea. Strewn on Beltane fires. Pressed into salves for sun-burned skin and into pillows for restless children.',
    nutrition: 'Apigenin, bisabolol, chamazulene. Mild sedative. Anti-inflammatory. Caffeine-free.',
    pairings: 'Honey · Lavender · Lemon balm · Vanilla',
  };
}
