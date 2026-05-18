// icons.js - Per-herb stylized SVG silhouettes.
//
// Each entry is (accentColor) => svgString. Bundled (not fetched online) per
// the offline-capable Locked Decision in PROJECT_SPEC §11. Adding a new herb's
// icon = one new entry; reference it from herbs.json as `"icon": "<key>"`.
//
// All icons render in a 44x50 viewBox to match the existing botanical art slot.
// Stems and leaves use a fixed green; flower/fruit bodies take the accent color.

const STEM = '#2D6A4F';
const LEAF = '#3D7A5E';
const LEAF_LIGHT = '#5C9A78';

export const ICONS = {
  chamomile: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="26" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <ellipse cx="14" cy="38" rx="5" ry="2.4" fill="${LEAF_LIGHT}" stroke="${STEM}" stroke-width="0.6" transform="rotate(-28 14 38)"/>
    <ellipse cx="30" cy="42" rx="5" ry="2.4" fill="${LEAF_LIGHT}" stroke="${STEM}" stroke-width="0.6" transform="rotate(28 30 42)"/>
    ${[0,40,80,120,160,200,240,280,320].map(a => {
      const rad = a * Math.PI / 180;
      const cx = (22 + 8 * Math.cos(rad)).toFixed(1);
      const cy = (18 + 8 * Math.sin(rad)).toFixed(1);
      return `<ellipse cx="${cx}" cy="${cy}" rx="3" ry="5.5" fill="#FAF4DD" stroke="${c}" stroke-width="0.6" transform="rotate(${a} ${cx} ${cy})"/>`;
    }).join('')}
    <circle cx="22" cy="18" r="3.5" fill="#E8B23A"/>
    <circle cx="22" cy="18" r="1.5" fill="#A66B12"/>
  </svg>`,

  lavender: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="20" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <ellipse cx="14" cy="36" rx="4" ry="1.8" fill="none" stroke="${STEM}" stroke-width="0.7" transform="rotate(-30 14 36)"/>
    <ellipse cx="30" cy="40" rx="4" ry="1.8" fill="none" stroke="${STEM}" stroke-width="0.7" transform="rotate(30 30 40)"/>
    ${[2,6,10,14,18].map((y, i) => {
      const offset = (i % 2 === 0 ? -2 : 2);
      return `<ellipse cx="${22 + offset}" cy="${y + 2}" rx="3" ry="2.5" fill="${c}" fill-opacity="0.85" stroke="${c}" stroke-width="0.4"/>`;
    }).join('')}
    <ellipse cx="22" cy="2" rx="2.5" ry="2" fill="${c}"/>
  </svg>`,

  rosemary: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="4" x2="22" y2="48" stroke="${STEM}" stroke-width="1.5"/>
    ${[10, 16, 22, 28, 34, 40].map(y => `
      <line x1="22" y1="${y}" x2="12" y2="${y - 4}" stroke="${LEAF}" stroke-width="1.2"/>
      <line x1="22" y1="${y}" x2="32" y2="${y - 4}" stroke="${LEAF}" stroke-width="1.2"/>
    `).join('')}
    <circle cx="22" cy="4" r="1.5" fill="${c}"/>
  </svg>`,

  sage: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="6" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <ellipse cx="13" cy="14" rx="6" ry="3" fill="${LEAF_LIGHT}" stroke="${STEM}" stroke-width="0.6" transform="rotate(-25 13 14)"/>
    <ellipse cx="31" cy="20" rx="6" ry="3" fill="${LEAF_LIGHT}" stroke="${STEM}" stroke-width="0.6" transform="rotate(25 31 20)"/>
    <ellipse cx="13" cy="28" rx="6" ry="3" fill="${LEAF_LIGHT}" stroke="${STEM}" stroke-width="0.6" transform="rotate(-25 13 28)"/>
    <ellipse cx="31" cy="34" rx="6" ry="3" fill="${LEAF_LIGHT}" stroke="${STEM}" stroke-width="0.6" transform="rotate(25 31 34)"/>
    <ellipse cx="22" cy="6" rx="2.5" ry="2" fill="${c}"/>
  </svg>`,

  basil: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="6" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <path d="M22 16 Q 10 14, 12 22 Q 18 26, 22 18 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.6"/>
    <path d="M22 16 Q 34 14, 32 22 Q 26 26, 22 18 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.6"/>
    <path d="M22 28 Q 10 26, 12 34 Q 18 38, 22 30 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.6"/>
    <path d="M22 28 Q 34 26, 32 34 Q 26 38, 22 30 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.6"/>
    <circle cx="22" cy="6" r="2" fill="${c}"/>
  </svg>`,

  mugwort: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="6" x2="22" y2="48" stroke="${STEM}" stroke-width="1.2"/>
    ${[10, 18, 26, 34, 42].map(y => `
      <path d="M22 ${y} Q 16 ${y - 2}, 14 ${y - 5} M22 ${y} Q 12 ${y}, 10 ${y + 3} M22 ${y} Q 16 ${y + 2}, 14 ${y + 5}" stroke="${LEAF_LIGHT}" stroke-width="0.8" fill="none"/>
      <path d="M22 ${y} Q 28 ${y - 2}, 30 ${y - 5} M22 ${y} Q 32 ${y}, 34 ${y + 3} M22 ${y} Q 28 ${y + 2}, 30 ${y + 5}" stroke="${LEAF_LIGHT}" stroke-width="0.8" fill="none"/>
    `).join('')}
    <circle cx="22" cy="4" r="1.5" fill="${c}" opacity="0.7"/>
  </svg>`,

  'lily flower': (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="28" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <ellipse cx="14" cy="40" rx="5" ry="2.4" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(-30 14 40)"/>
    <path d="M22 8 Q 12 18, 14 28 Q 22 30, 22 22 Z" fill="${c}" fill-opacity="0.85" stroke="${c}" stroke-width="0.6"/>
    <path d="M22 8 Q 32 18, 30 28 Q 22 30, 22 22 Z" fill="${c}" fill-opacity="0.85" stroke="${c}" stroke-width="0.6"/>
    <path d="M22 6 Q 18 20, 22 26 Q 26 20, 22 6 Z" fill="${c}" fill-opacity="0.7" stroke="${c}" stroke-width="0.6"/>
    <line x1="22" y1="14" x2="22" y2="24" stroke="#8A6B1F" stroke-width="0.8"/>
    <circle cx="22" cy="24" r="0.8" fill="#E8B23A"/>
  </svg>`,

  'calendula flower': (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="26" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <ellipse cx="14" cy="38" rx="5" ry="2.4" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(-28 14 38)"/>
    ${Array.from({length: 14}, (_, i) => {
      const a = i * (360 / 14);
      const rad = a * Math.PI / 180;
      const cx = (22 + 9 * Math.cos(rad)).toFixed(1);
      const cy = (18 + 9 * Math.sin(rad)).toFixed(1);
      return `<ellipse cx="${cx}" cy="${cy}" rx="2.2" ry="6" fill="${c}" fill-opacity="0.85" transform="rotate(${a} ${cx} ${cy})"/>`;
    }).join('')}
    <circle cx="22" cy="18" r="3.5" fill="#8A4A12"/>
    <circle cx="22" cy="18" r="1.5" fill="#5C2F08"/>
  </svg>`,

  beeswax: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    ${[[14, 14], [30, 14], [22, 23], [14, 32], [30, 32], [22, 41]].map(([cx, cy]) => {
      const r = 6;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i;
        pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
      }
      return `<polygon points="${pts.join(' ')}" fill="${c}" fill-opacity="0.45" stroke="${c}" stroke-width="0.8"/>`;
    }).join('')}
  </svg>`,

  'cocoa butter': (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="6" x2="22" y2="10" stroke="${STEM}" stroke-width="1.2"/>
    <path d="M22 10 Q 30 12, 32 22 Q 32 36, 22 44 Q 12 36, 12 22 Q 14 12, 22 10 Z" fill="${c}" fill-opacity="0.55" stroke="${c}" stroke-width="0.9"/>
    ${[14, 18, 22, 26, 30, 34, 38].map(y => `<line x1="14" y1="${y}" x2="30" y2="${y}" stroke="${c}" stroke-width="0.4" opacity="0.4"/>`).join('')}
    <line x1="22" y1="11" x2="22" y2="42" stroke="${c}" stroke-width="0.5" opacity="0.5"/>
  </svg>`,

  yarrow: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="20" x2="22" y2="48" stroke="${STEM}" stroke-width="1.2"/>
    <path d="M22 30 Q 16 28, 14 32" stroke="${LEAF}" stroke-width="0.6" fill="none"/>
    <path d="M22 30 Q 28 28, 30 32" stroke="${LEAF}" stroke-width="0.6" fill="none"/>
    <path d="M22 40 Q 16 38, 14 42" stroke="${LEAF}" stroke-width="0.6" fill="none"/>
    <path d="M22 40 Q 28 38, 30 42" stroke="${LEAF}" stroke-width="0.6" fill="none"/>
    ${[[10,10],[14,8],[18,10],[22,7],[26,10],[30,8],[34,10],[12,14],[16,12],[20,14],[24,12],[28,14],[32,12]].map(([cx,cy]) => `<circle cx="${cx}" cy="${cy}" r="1.7" fill="${c}" fill-opacity="0.7"/>`).join('')}
  </svg>`,

  elderflower: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="22" x2="22" y2="48" stroke="${STEM}" stroke-width="1.2"/>
    <ellipse cx="14" cy="38" rx="5" ry="2.4" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(-30 14 38)"/>
    <ellipse cx="30" cy="42" rx="5" ry="2.4" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(30 30 42)"/>
    ${[[8,14],[14,10],[22,8],[30,10],[36,14],[10,18],[18,14],[26,14],[34,18],[14,20],[22,18],[30,20],[18,22],[26,22]].map(([cx,cy]) => `<circle cx="${cx}" cy="${cy}" r="2.2" fill="${c}" fill-opacity="0.85"/><circle cx="${cx}" cy="${cy}" r="0.7" fill="#E8B23A"/>`).join('')}
  </svg>`,

  peppermint: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="4" x2="22" y2="48" stroke="${STEM}" stroke-width="1.4"/>
    <path d="M22 14 Q 8 10, 6 22 Q 14 26, 22 18 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.8"/>
    <path d="M8 14 L 8 22 M12 12 L 12 24 M16 12 L 16 22" stroke="${STEM}" stroke-width="0.4" opacity="0.5"/>
    <path d="M22 30 Q 36 26, 38 38 Q 30 42, 22 34 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.8"/>
    <path d="M30 28 L 30 36 M34 30 L 34 40 M38 30 L 38 38" stroke="${STEM}" stroke-width="0.4" opacity="0.5"/>
    <circle cx="22" cy="4" r="1.5" fill="${c}"/>
  </svg>`,

  valerian: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="18" x2="22" y2="48" stroke="${STEM}" stroke-width="1.2"/>
    <ellipse cx="14" cy="36" rx="4" ry="2" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(-30 14 36)"/>
    <ellipse cx="30" cy="40" rx="4" ry="2" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(30 30 40)"/>
    ${[[12,6],[16,4],[20,6],[24,4],[28,6],[32,4],[14,10],[18,8],[22,10],[26,8],[30,10],[16,14],[20,12],[24,14],[28,12],[22,16]].map(([cx,cy]) => `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${c}" fill-opacity="0.75"/>`).join('')}
  </svg>`,

  ginger: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="6" x2="22" y2="14" stroke="${STEM}" stroke-width="1.2"/>
    <path d="M16 14 Q 8 18, 12 28 Q 6 32, 12 38 Q 16 44, 22 42 Q 28 46, 32 40 Q 38 36, 34 30 Q 38 24, 32 18 Q 28 12, 22 14 Z" fill="${c}" fill-opacity="0.65" stroke="${c}" stroke-width="0.9"/>
    <circle cx="16" cy="22" r="2" fill="${c}" fill-opacity="0.85"/>
    <circle cx="28" cy="22" r="2" fill="${c}" fill-opacity="0.85"/>
    <circle cx="22" cy="32" r="2.5" fill="${c}" fill-opacity="0.85"/>
    <circle cx="32" cy="34" r="1.8" fill="${c}" fill-opacity="0.85"/>
    <circle cx="14" cy="32" r="1.8" fill="${c}" fill-opacity="0.85"/>
  </svg>`,

  frankincense: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    ${[[22,10,5],[14,20,4],[30,22,4],[22,30,6],[14,40,3.5],[30,40,3.5]].map(([cx,cy,r]) => `<path d="M${cx} ${cy - r * 1.6} Q ${cx + r} ${cy - r * 0.4}, ${cx + r * 0.9} ${cy + r * 0.4} Q ${cx + r * 0.6} ${cy + r}, ${cx} ${cy + r} Q ${cx - r * 0.6} ${cy + r}, ${cx - r * 0.9} ${cy + r * 0.4} Q ${cx - r} ${cy - r * 0.4}, ${cx} ${cy - r * 1.6} Z" fill="${c}" fill-opacity="0.55" stroke="${c}" stroke-width="0.7"/>`).join('')}
  </svg>`,

  rose: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="24" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <path d="M18 36 L 14 32 L 12 38" stroke="${STEM}" stroke-width="0.8" fill="none"/>
    <path d="M26 40 L 30 36 L 32 42" stroke="${STEM}" stroke-width="0.8" fill="none"/>
    <ellipse cx="14" cy="40" rx="5" ry="2.5" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(-30 14 40)"/>
    <ellipse cx="30" cy="44" rx="5" ry="2.5" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(30 30 44)"/>
    <path d="M22 6 Q 12 12, 12 22 Q 16 28, 22 26 Q 28 28, 32 22 Q 32 12, 22 6 Z" fill="${c}" fill-opacity="0.85" stroke="${c}" stroke-width="0.7"/>
    <path d="M22 10 Q 16 16, 18 22 Q 22 22, 22 18 Q 22 22, 26 22 Q 28 16, 22 10 Z" fill="${c}" fill-opacity="0.7" stroke="${c}" stroke-width="0.5"/>
    <ellipse cx="22" cy="18" rx="2" ry="2.5" fill="${c}" fill-opacity="0.95"/>
  </svg>`,

  nettle: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="4" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <path d="M22 14 Q 10 14, 8 22 Q 12 28, 22 22 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.7"/>
    <path d="M22 14 Q 34 14, 36 22 Q 32 28, 22 22 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.7"/>
    <path d="M22 28 Q 10 28, 8 36 Q 12 42, 22 36 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.7"/>
    <path d="M22 28 Q 34 28, 36 36 Q 32 42, 22 36 Z" fill="${LEAF}" stroke="${STEM}" stroke-width="0.7"/>
    <path d="M8 18 L 6 16 M10 22 L 8 24 M36 18 L 38 16 M34 22 L 36 24" stroke="${LEAF_LIGHT}" stroke-width="0.5"/>
    <circle cx="22" cy="4" r="1.5" fill="${c}"/>
  </svg>`,

  'st johns wort': (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="26" x2="22" y2="48" stroke="${STEM}" stroke-width="1.3"/>
    <ellipse cx="14" cy="38" rx="4" ry="2" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(-25 14 38)"/>
    <ellipse cx="30" cy="42" rx="4" ry="2" fill="${LEAF}" stroke="${STEM}" stroke-width="0.5" transform="rotate(25 30 42)"/>
    ${[0, 72, 144, 216, 288].map(a => {
      const rad = a * Math.PI / 180;
      const cx = (22 + 8 * Math.cos(rad - Math.PI / 2)).toFixed(1);
      const cy = (18 + 8 * Math.sin(rad - Math.PI / 2)).toFixed(1);
      return `<ellipse cx="${cx}" cy="${cy}" rx="3.5" ry="6.5" fill="${c}" fill-opacity="0.9" transform="rotate(${a} ${cx} ${cy})"/>`;
    }).join('')}
    <circle cx="22" cy="18" r="2" fill="#5C2F08"/>
    ${[0, 60, 120, 180, 240, 300].map(a => {
      const rad = a * Math.PI / 180;
      const cx = (22 + 2.5 * Math.cos(rad)).toFixed(1);
      const cy = (18 + 2.5 * Math.sin(rad)).toFixed(1);
      return `<line x1="22" y1="18" x2="${cx}" y2="${cy}" stroke="#5C2F08" stroke-width="0.4"/>`;
    }).join('')}
  </svg>`,

  dandelion: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="22" x2="22" y2="48" stroke="${STEM}" stroke-width="1.4"/>
    <path d="M22 38 Q 16 36, 12 30 M22 42 Q 14 40, 10 36 M22 46 Q 16 44, 14 42" stroke="${LEAF}" stroke-width="0.7" fill="none"/>
    ${Array.from({length: 24}, (_, i) => {
      const a = i * 15;
      const rad = a * Math.PI / 180;
      const cx = (22 + 11 * Math.cos(rad)).toFixed(1);
      const cy = (16 + 11 * Math.sin(rad)).toFixed(1);
      return `<line x1="22" y1="16" x2="${cx}" y2="${cy}" stroke="#F5EBC8" stroke-width="0.7" opacity="0.85"/><circle cx="${cx}" cy="${cy}" r="0.8" fill="#F5EBC8"/>`;
    }).join('')}
    <circle cx="22" cy="16" r="1.8" fill="${c}"/>
  </svg>`,
};

// Resolve an icon for a herb. Prefer a per-herb icon if present in the
// registry; fall back to the generic botanical type from data/botanicals.js.
export function resolveIcon(iconKey, accentColor, botanicalFallback) {
  const renderer = ICONS[iconKey];
  if (renderer) return renderer(accentColor);
  return botanicalFallback?.(accentColor) ?? '';
}
