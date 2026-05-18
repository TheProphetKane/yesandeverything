// symbols.js — Celtic symbol registry. v0.8.0 redesign.
//
// Each entry is (accentColor: string) => svgString. The accent argument is
// accepted for backwards compatibility but ignored: v0.7.1+ symbols always
// render in solid black for visibility against parchment. v0.8.0 replaces the
// thin-stroked Wikimedia source paths with clean geometric primitives at a
// uniform stroke-width that reads bold at the 28x28 render size. Symbol
// shapes preserve their canonical Celtic geometry (sun-cross, triskele,
// shield knot, awen, triquetra, celtic cross) but as compact SVG that's
// legible at small sizes.
//
// All SVGs use viewBox 0 0 100 100, stroke="#000" (rendered black),
// and fill="none" except where solid weight is needed for visual mass.

const sym = (inner) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#000" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const SYMBOLS = {
  // Sun Cross / Wheel of Taranis: circle with equal-arm cross.
  'solar-wheel': () => sym(
    `<circle cx="50" cy="50" r="38"/>
     <line x1="50" y1="12" x2="50" y2="88"/>
     <line x1="12" y1="50" x2="88" y2="50"/>`
  ),

  // Triskele / Triple Spiral: three connected curved arms at 120 degrees.
  'triple-spiral': () => sym(
    `<g transform="translate(50 50)" stroke-width="7">
       <path d="M 0 0 C 0 -14 14 -22 22 -14 C 28 -8 24 4 14 4"/>
       <path d="M 0 0 C 0 -14 14 -22 22 -14 C 28 -8 24 4 14 4" transform="rotate(120)"/>
       <path d="M 0 0 C 0 -14 14 -22 22 -14 C 28 -8 24 4 14 4" transform="rotate(240)"/>
       <circle cx="0" cy="0" r="4" fill="#000" stroke="none"/>
     </g>`
  ),

  // Shield Knot: square frame with two diamond loops crossing through.
  'shield-knot': () => sym(
    `<g transform="translate(50 50)">
       <rect x="-30" y="-30" width="60" height="60" rx="12"/>
       <path d="M -30 0 Q 0 -30 30 0 Q 0 30 -30 0 Z"/>
       <path d="M 0 -30 Q 30 0 0 30 Q -30 0 0 -30 Z"/>
     </g>`
  ),

  // Awen / Three Rays of Inspiration: three diverging rays with three dots.
  awen: () => sym(
    `<line x1="50" y1="85" x2="28" y2="35"/>
     <line x1="50" y1="85" x2="50" y2="28"/>
     <line x1="50" y1="85" x2="72" y2="35"/>
     <circle cx="28" cy="22" r="6" fill="#000" stroke="none"/>
     <circle cx="50" cy="16" r="6" fill="#000" stroke="none"/>
     <circle cx="72" cy="22" r="6" fill="#000" stroke="none"/>`
  ),

  // Triquetra / Trinity Knot: three vesica-piscis arcs interlocked.
  triquetra: () => sym(
    `<g transform="translate(50 55)" stroke-width="7">
       <path d="M 0 -32 C 24 -12 24 18 0 28 C -24 18 -24 -12 0 -32 Z"/>
       <path d="M 0 -32 C 24 -12 24 18 0 28 C -24 18 -24 -12 0 -32 Z" transform="rotate(120)"/>
       <path d="M 0 -32 C 24 -12 24 18 0 28 C -24 18 -24 -12 0 -32 Z" transform="rotate(240)"/>
     </g>`
  ),

  // Celtic Cross: equal-arm cross with circle at the intersection.
  'celtic-cross': () => sym(
    `<line x1="50" y1="10" x2="50" y2="90"/>
     <line x1="18" y1="38" x2="82" y2="38"/>
     <circle cx="50" cy="38" r="18"/>`
  ),
};

export const SYMBOL_LABELS = {
  'solar-wheel':   'Sun Cross / Wheel of Taranis',
  'triple-spiral': 'Triskele (Triple Spiral)',
  'shield-knot':   'Shield Knot',
  awen:            'Awen (Three Rays)',
  triquetra:       'Triquetra (Trinity Knot)',
  'celtic-cross':  'Celtic Cross',
};
