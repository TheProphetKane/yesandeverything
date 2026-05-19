// symbols.js — Celtic symbol id-and-label registry.
//
// LOCKED DECISION (v0.8.2): zero SVG anywhere in the label. Symbol art ships
// as PNG only via data/symbols/<id>.png, populated by scripts/fetch-symbols.ps1.
// The renderer reads only the id from state.symbol and emits an img tag.
// If the PNG is missing on disk, the slot hides.
//
// SYMBOL_LABELS is retained so the editor's symbol picker can show readable
// option names. No SVG render function is exported.

export const SYMBOL_LABELS = {
  'solar-wheel':   'Sun Cross / Wheel of Taranis',
  'triple-spiral': 'Triskele (Triple Spiral)',
  'shield-knot':   'Shield Knot',
  awen:            'Awen (Three Rays)',
  triquetra:       'Triquetra (Trinity Knot)',
  'celtic-cross':  'Celtic Cross',
};

// Ids only — used by the editor select to populate option values.
export const SYMBOL_IDS = Object.keys(SYMBOL_LABELS);
