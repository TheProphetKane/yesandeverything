// Celtic symbol SVG registry.
// Each entry is (color) => svgString. Add a new symbol by adding one entry.
// Keys are used as stable IDs in label-templates and herb records.

export const SYMBOLS = {
  'solar-wheel': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="11" fill="none" stroke="${c}" stroke-width="1.2"/>
    <circle cx="14" cy="14" r="4" fill="none" stroke="${c}" stroke-width="1"/>
    <line x1="14" y1="3" x2="14" y2="25" stroke="${c}" stroke-width="0.8"/>
    <line x1="3" y1="14" x2="25" y2="14" stroke="${c}" stroke-width="0.8"/>
    <line x1="6.2" y1="6.2" x2="21.8" y2="21.8" stroke="${c}" stroke-width="0.6"/>
    <line x1="21.8" y1="6.2" x2="6.2" y2="21.8" stroke="${c}" stroke-width="0.6"/>
  </svg>`,

  'triple-spiral': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 14 C14 10, 18 8, 20 11 C22 14, 18 16, 14 14" fill="none" stroke="${c}" stroke-width="1"/>
    <path d="M14 14 C10 14, 8 10, 11 8 C14 6, 16 10, 14 14"  fill="none" stroke="${c}" stroke-width="1"/>
    <path d="M14 14 C14 18, 10 20, 8 17 C6 14, 10 12, 14 14" fill="none" stroke="${c}" stroke-width="1"/>
    <circle cx="14" cy="14" r="1" fill="${c}"/>
  </svg>`,

  'shield-knot': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="18" height="18" rx="2" fill="none" stroke="${c}" stroke-width="1"/>
    <circle cx="14" cy="10" r="5" fill="none" stroke="${c}" stroke-width="0.9"/>
    <circle cx="14" cy="18" r="5" fill="none" stroke="${c}" stroke-width="0.9"/>
  </svg>`,

  'awen': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="7" r="1.5" fill="${c}"/>
    <circle cx="14" cy="5" r="1.5" fill="${c}"/>
    <circle cx="19" cy="7" r="1.5" fill="${c}"/>
    <line x1="9" y1="9" x2="6" y2="24"  stroke="${c}" stroke-width="1"/>
    <line x1="14" y1="7" x2="14" y2="24" stroke="${c}" stroke-width="1"/>
    <line x1="19" y1="9" x2="22" y2="24" stroke="${c}" stroke-width="1"/>
  </svg>`,

  'endless-knot': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 14 C6 6, 22 6, 22 14 C22 22, 6 22, 6 14 Z" fill="none" stroke="${c}" stroke-width="1"/>
    <ellipse cx="14" cy="14" rx="4" ry="8" fill="none" stroke="${c}" stroke-width="0.9"/>
  </svg>`,

  'celtic-cross': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <line x1="14" y1="2" x2="14" y2="26" stroke="${c}" stroke-width="1.3"/>
    <line x1="4" y1="12" x2="24" y2="12" stroke="${c}" stroke-width="1.3"/>
    <circle cx="14" cy="12" r="6" fill="none" stroke="${c}" stroke-width="1"/>
    <circle cx="14" cy="12" r="3" fill="none" stroke="${c}" stroke-width="0.7"/>
  </svg>`,
};

// Human-readable labels for the editor dropdown.
export const SYMBOL_LABELS = {
  'solar-wheel': 'Solar Wheel',
  'triple-spiral': 'Triple Spiral',
  'shield-knot': 'Shield Knot',
  'awen': 'Awen',
  'endless-knot': 'Endless Knot',
  'celtic-cross': 'Celtic Cross',
};
