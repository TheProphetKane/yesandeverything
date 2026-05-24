// state.js - tiny observable store + layout schema.
//
// Single source of truth for the editor. The render layer reads from get();
// the editor writes via set(); both subscribe for updates.
//
// v0.9: layout authority moved from template descriptors into state.layout.
//   { front: [zone, ...], back: [zone, ...], hidden: ['item-key', ...] }
// Each zone:
//   { id, layoutMode: 'stack'|'row'|'columns-2'|'columns-3', width: 25..100,
//     items: ['item-key', ...] }
// The renderer iterates state.layout[side] zones in order. Items in `hidden`
// render nowhere; that's the new "hide this field" mechanism.
//
// The previous `state.placement` (per-item front/back checkbox grid) and the
// `state.notesSplit` flag are retired. main.js migrates old saved state forward
// by reading those plus the template's seed zones to build state.layout.

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

// --- Layout shape helpers ---------------------------------------------------

export const ZONE_LAYOUT_MODES = ['stack', 'row', 'columns-2', 'columns-3'];
export const ZONE_WIDTHS       = [25, 33, 50, 66, 75, 100];

let zoneIdCounter = 0;
export function makeZoneId(prefix = 'zone') {
  zoneIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${zoneIdCounter}`;
}

export function makeZone({ id, layoutMode = 'stack', width = 100, align = 'center', items = [] } = {}) {
  return {
    id: id ?? makeZoneId(),
    layoutMode,
    width,
    align,
    items: [...items],
  };
}

// Default factory: matches the v0.8 baseline so first-time users see the
// canonical front-left/center/right + back-stack layout. Returns a full
// state.layout object.
export function defaultLayout() {
  return {
    front: [
      makeZone({ id: 'front-left',   layoutMode: 'stack', width: 25, items: ['symbol', 'botanical'] }),
      makeZone({ id: 'front-center', layoutMode: 'stack', width: 50, items: [
        'shop',
        'divider-top',
        'herb-name',
        'latin',
        'props',
        'divider-bot',
        'description',
      ]}),
      makeZone({ id: 'front-right',  layoutMode: 'stack', width: 25, items: ['rune-1', 'rune-2', 'rune-3'] }),
    ],
    back: [
      makeZone({ id: 'back-header',  layoutMode: 'stack', width: 100, items: ['back-name', 'back-latin'] }),
      makeZone({ id: 'back-div-1',   layoutMode: 'stack', width: 100, items: ['back-divider'] }),
      makeZone({ id: 'back-desc',    layoutMode: 'stack', width: 100, items: ['back-desc-full'] }),
      makeZone({ id: 'back-div-2',   layoutMode: 'stack', width: 100, items: ['back-divider'] }),
      makeZone({ id: 'back-historic',layoutMode: 'stack', width: 100, items: ['historic'] }),
      makeZone({ id: 'back-div-3',   layoutMode: 'stack', width: 100, items: ['back-divider'] }),
      makeZone({ id: 'back-bottom',  layoutMode: 'row',   width: 100, items: ['notes', 'pairings'] }),
    ],
    hidden: ['compounds', 'cautions'],
  };
}

// --- Section title defaults (v0.11) ----------------------------------------
// Per-section-card item, the canonical title text. Empty string = no title
// rendered. state.sectionTitles overrides these so users can rename or hide
// any section title without touching the renderer.

export const DEFAULT_SECTION_TITLES = {
  historic:        'Traditional Uses',
  notes:           'Notes',
  compounds:       'Compounds',
  cautions:        'Cautions',
  pairings:        'Pairings',
  'back-desc-full': '', // intentionally empty - the full description renders
                        // as a flowing paragraph by default. Users who want a
                        // section card around it can set a title here.
};

// --- Default state ---------------------------------------------------------

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
      { c: 'ᛜ', m: 'Inner Peace' },
    ],

    // Back-label fields.
    backEnabled: false,
    descFull: "Beloved of the sun and the hearth, chamomile heals the body and stills the restless mind. Ancient Celts honored it as a solar herb, drunk at dawn to greet the light. Sacred to Brigid; gathered on Imbolc for the year's hearth-fires.",
    historicUses: 'Druidic dawn-rite tea. Strewn on Beltane fires. Pressed into salves for sun-burned skin and into pillows for restless children.',
    compounds: 'Apigenin, bisabolol, chamazulene. Mild sedative and anti-inflammatory via GABA-A receptor binding. Rich in flavonoids.',
    cautions: 'Ragweed allergy cross-reaction possible. Avoid therapeutic doses in pregnancy. May potentiate warfarin and CNS depressants.',
    pairings: 'Honey · Lavender · Lemon balm · Vanilla',

    // v0.9: zone layout owned by state, not template.
    layout: defaultLayout(),

    // v0.11: per-section title overrides + user-defined custom items +
    // border ornament style + saved layout presets.
    sectionTitles: { ...DEFAULT_SECTION_TITLES },
    customItems:   [],   // [{ id: 'custom-xxx', title, body }]
    layoutPresets: [],   // [{ id, name, layout, sectionTitles, customItems }]
    borderStyle:   'celtic',  // 'simple' | 'beveled' | 'celtic' | 'ornate'

    // v0.14: illustration override. null = auto-match herb name to library
    // keyword (data/herb-to-illustration.json), then fall back to legacy
    // data/ingredients/<slug>.png. String = explicit keyword from
    // data/illustrations.json.
    illustration:  null,

    parchmentTexture: 'parchment-01',
    shopColor: '#E8C172',
  };
}
