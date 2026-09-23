// Label template descriptors.
//
// A template describes a label format: an internal *design* layout (the canonical
// coordinate space where all internal sizes are calibrated), a set of available
// *physical* print sizes that all preserve the design aspect ratio, and an
// optional back-side layout for two-sided labels.
//
// The renderer always lays the label out at `designSize`, then applies
// `physicalScale = physicalSize / designSize` as a CSS transform. This keeps every
// internal element (fonts, SVGs, padding, gaps) proportionally identical across
// all sizes. To support a different aspect ratio (square, tall, wide), add a new
// template with its own designSize and zone arrangement.

export const TEMPLATES = {
  'apothecary-3x1.5': {
    id: 'apothecary-3x1.5',
    name: 'Celtic Apothecary',

    designSize: { wIn: 3, hIn: 1.5 },

    sizes: [
      { id: 'mini',   wIn: 1.5, hIn: 0.75, label: 'Mini (1.5x0.75in)' },
      { id: 'small',  wIn: 2,   hIn: 1,    label: 'Small (2x1in)' },
      { id: 'medium', wIn: 3,   hIn: 1.5,  label: 'Medium (3x1.5in)' },
      { id: 'large',  wIn: 4,   hIn: 2,    label: 'Large (4x2in)' },
      { id: 'xl',     wIn: 6,   hIn: 3,    label: 'Extra Large (6x3in)' },
    ],
    defaultSize: 'medium',

    theme: 'parchment-gold',

    // v0.9: zone composition is authoritative in state.layout. v1.0.4: these
    // arrays are the SEED - src/state.js defaultLayout() derives state.layout
    // from them (no more hand-mirrored copy), and the renderer reads them
    // directly only if state.layout is somehow missing. A new template needs
    // only this descriptor; no state.js change.
    zones: [
      { id: 'front-left',   width: 25, layoutMode: 'stack', items: ['symbol', 'botanical'] },
      { id: 'front-center', width: 50, layoutMode: 'stack', items: [
        'shop',
        'divider-top',
        'herb-name',
        'latin',
        'props',
        'divider-bot',
        'description',
      ]},
      { id: 'front-right',  width: 25, layoutMode: 'stack', items: ['rune-1', 'rune-2', 'rune-3'] },
    ],

    backZones: [
      { id: 'back-header',  width: 100, layoutMode: 'stack', items: ['back-name', 'back-latin'] },
      { id: 'back-div-1',   width: 100, layoutMode: 'stack', items: ['back-divider'] },
      { id: 'back-desc',    width: 100, layoutMode: 'stack', items: ['back-desc-full'] },
      { id: 'back-div-2',   width: 100, layoutMode: 'stack', items: ['back-divider'] },
      { id: 'back-historic',width: 100, layoutMode: 'stack', items: ['historic'] },
      { id: 'back-div-3',   width: 100, layoutMode: 'stack', items: ['back-divider'] },
      { id: 'back-bottom',  width: 100, layoutMode: 'row',   items: ['notes', 'pairings'] },
    ],

    // A 'fields' list used to live here, naming the seventeen state keys the
    // Content accordion exposes. Nothing under src/ ever read it (bar-raise
    // 2026-09-09 generative-art-schema-driven-correctness-01): editor.js
    // hand-authors that accordion's markup directly, one input per field,
    // because there's only ever been the one template. Zone and item
    // composition (what goes where) is schema-driven, through state.layout
    // and ITEM_RENDERERS; which individual form fields the Content section
    // shows is not, and PROJECT_SPEC.md section 4.7 says so now. Removed
    // rather than kept as an unread list a second template could mistake for
    // a real contract; a second template designer's own field markup can
    // reintroduce a per-template list once there's a consumer for it.
    descMaxChars: 120,
    descLineHint: '~2 lines',

    descFullMaxChars:    260,
    historicMaxChars:    180,
    compoundsMaxChars:   240,
    cautionsMaxChars:    240,
    pairingsMaxChars:    100,
  },
};

export const DEFAULT_TEMPLATE_ID = 'apothecary-3x1.5';

export function resolveSize(tmpl, sizeId) {
  return tmpl.sizes.find(s => s.id === sizeId)
      ?? tmpl.sizes.find(s => s.id === tmpl.defaultSize)
      ?? tmpl.sizes[0];
}
