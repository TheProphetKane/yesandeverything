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

import { TEMPLATES, DEFAULT_TEMPLATE_ID } from '../data/label-templates.js';

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
      // Create missing intermediate objects instead of throwing on a path a
      // migration hasn't backfilled yet (e.g. old saved state).
      if (cur[parts[i]] === undefined || cur[parts[i]] === null) cur[parts[i]] = {};
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

// Default factory: derives state.layout from the template descriptor's
// zones/backZones seeds (v1.0.4). Previously this function hardcoded a copy of
// the apothecary zones and the descriptor arrays were a dead fallback that had
// to be kept mirrored by hand; deriving makes the descriptor the single source,
// so a second template is a registry-only add.
export function defaultLayout(templateId = DEFAULT_TEMPLATE_ID) {
  const tmpl = TEMPLATES[templateId] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
  const seedZones = (seeds) => (seeds ?? []).map(z => makeZone({
    id: z.id, layoutMode: z.layoutMode, width: z.width, align: z.align, items: z.items,
  }));
  const layout = {
    front: seedZones(tmpl.zones),
    back:  seedZones(tmpl.backZones),
    hidden: [],
  };
  // The section fields the seed leaves unplaced start hidden so the Layout
  // Designer's picker can offer them (same trio reconcileNotesHidden governs).
  const present = new Set();
  for (const side of ['front', 'back']) {
    layout[side].forEach(z => z.items.forEach(i => present.add(typeof i === 'string' ? i : i.key)));
  }
  for (const c of ['compounds', 'cautions', 'notes']) {
    if (!present.has(c)) layout.hidden.push(c);
  }
  return layout;
}

// v1.0.4: template switch as a state patch. Re-seeds layout + size from the
// target descriptor; returns null for an unknown id so callers can fall back.
// This is the setter a template picker applies via state.set when the second
// template ships (PROJECT_SPEC section 9, M3); covered by test-migration.mjs
// TEST 7 until then. Not used during normalizeState on purpose: re-seeding
// layout there would clobber a pre-v0.9 migration signal.
export function templatePatch(templateId) {
  const tmpl = TEMPLATES[templateId];
  if (!tmpl) return null;
  return { templateId, sizeId: tmpl.defaultSize, layout: defaultLayout(templateId) };
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
    __schemaVersion: 1,
    templateId: 'apothecary-3x1.5',
    sizeId: 'medium',
    shopName: "Lynn's Apothecary",
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
    layoutPresets: [],   // [{ id, name, layout, sectionTitles }]
    borderStyle:   'celtic',  // 'simple' | 'beveled' | 'celtic' | 'ornate'

    // v0.14: illustration override. null = auto-match herb name to a library
    // keyword (data/herb-to-illustration.json), else hide the slot. String =
    // explicit keyword from data/illustrations.json. Art resolves from
    // data/illustrations/<keyword>.png; there is no legacy fallback.
    illustration:  null,

    // v0.14.2: per-side preview collapse. Drives the wrapper around each
    // preview card in render.js. UI preference, persists across reloads.
    previewCollapse: { front: false, back: false },

    parchmentTexture: 'parchment-01',
    shopColor: '#E8C172',
  };
}
