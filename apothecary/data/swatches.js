// swatches.js - the preset colours the editor offers.
//
// ACCENT_SWATCHES are the Accent Color row in the Style section. The accent
// renders as label text (herb name, properties, back name), so every swatch
// has to clear the same 4.5:1 contrast bar against the parchment that each
// herb's own accent clears.
//
// ITEM_COLOR_PRESETS are the swatches in the layout designer's colour
// popover. A per-item colour also renders as text on the parchment, so the
// same bar applies.
//
// ITEM_GLOW_PRESETS are the swatches in the designer's glow popover. A glow
// is a soft halo behind the text, never the text itself, so light colours
// belong here and no contrast bar applies; each entry only has to be a
// #rrggbb hex value.
//
// test-data-integrity.mjs checks all three lists. Loaded through main.js's
// versioned import block and handed to the editor through ctx.

export const ACCENT_SWATCHES = [
  '#745719', '#694F90', '#2B664C', '#496148', '#8B1A1A',
  '#4A3F6B', '#933C6E', '#964308', '#755507', '#6B3A2A',
];

export const ITEM_COLOR_PRESETS = [
  '#7F510F', '#725706', '#9F3B15', '#8B4A2A',
  '#3D6349', '#46614F', '#4A3F6B', '#000000',
];

export const ITEM_GLOW_PRESETS = [
  '#E8A03A', '#F5C842', '#C84A1A', '#8B4A2A',
  '#4A7858', '#6B9579', '#EFDDB0', '#000000',
];
