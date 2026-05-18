// Botanical illustration SVG registry.
// Each entry is (accentColor) => svgString. The stem color stays green for all.

const STEM = '#2D6A4F';

export const BOTANICALS = {
  flower: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="25" x2="22" y2="48" stroke="${STEM}" stroke-width="1.2"/>
    <ellipse cx="15" cy="38" rx="5" ry="2.5" fill="none" stroke="${STEM}" stroke-width="0.8" transform="rotate(-30 15 38)"/>
    <ellipse cx="29" cy="42" rx="5" ry="2.5" fill="none" stroke="${STEM}" stroke-width="0.8" transform="rotate(30 29 42)"/>
    ${[0,45,90,135,180,225,270,315].map(a => {
      const rad = a * Math.PI / 180;
      const cx = (22 + 9 * Math.cos(rad)).toFixed(1);
      const cy = (18 + 9 * Math.sin(rad)).toFixed(1);
      return `<ellipse cx="${cx}" cy="${cy}" rx="3.5" ry="6" fill="none" stroke="${c}" stroke-width="0.8" transform="rotate(${a} ${cx} ${cy})"/>`;
    }).join('')}
    <circle cx="22" cy="18" r="3" fill="${c}" opacity="0.5"/>
    <circle cx="22" cy="18" r="1.5" fill="#C4922A"/>
  </svg>`,

  herb: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <line x1="22" y1="6" x2="22" y2="48" stroke="${STEM}" stroke-width="1.2"/>
    <ellipse cx="16" cy="16" rx="5" ry="2.5" fill="none" stroke="${STEM}" stroke-width="0.8" transform="rotate(-20 16 16)"/>
    <ellipse cx="28" cy="22" rx="5" ry="2.5" fill="none" stroke="${STEM}" stroke-width="0.8" transform="rotate(20 28 22)"/>
    <ellipse cx="16" cy="28" rx="5" ry="2.5" fill="none" stroke="${STEM}" stroke-width="0.8" transform="rotate(-20 16 28)"/>
    <ellipse cx="28" cy="34" rx="5" ry="2.5" fill="none" stroke="${STEM}" stroke-width="0.8" transform="rotate(20 28 34)"/>
    <ellipse cx="16" cy="40" rx="5" ry="2.5" fill="none" stroke="${STEM}" stroke-width="0.8" transform="rotate(-20 16 40)"/>
    <circle cx="22" cy="6" r="2.5" fill="${c}" opacity="0.6"/>
  </svg>`,

  root: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 18 C16 22, 14 28, 16 34 C18 38, 24 40, 28 36 C30 32, 30 26, 26 20 C24 16, 20 16, 18 18 Z" fill="${c}" opacity="0.35" stroke="${c}" stroke-width="0.8"/>
    <path d="M16 34 C14 38, 12 44, 10 48" fill="none" stroke="${c}" stroke-width="0.8"/>
    <path d="M28 36 C30 40, 32 44, 34 48" fill="none" stroke="${c}" stroke-width="0.8"/>
    <line x1="22" y1="18" x2="22" y2="4" stroke="${STEM}" stroke-width="1"/>
    <ellipse cx="18" cy="10" rx="4" ry="2" fill="none" stroke="${STEM}" stroke-width="0.7" transform="rotate(-15 18 10)"/>
  </svg>`,

  resin: (c) => `<svg width="44" height="50" viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
    ${[[22,12],[14,22],[30,22],[18,32],[26,32],[22,42]].map(([cx, cy], i) => {
      const s = 5 + (i % 3);
      const pts = [];
      for (let j = 0; j < 6; j++) {
        const a = Math.PI / 3 * j - Math.PI / 6;
        pts.push((cx + s * Math.cos(a)).toFixed(1) + ',' + (cy + s * Math.sin(a)).toFixed(1));
      }
      return `<polygon points="${pts.join(' ')}" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="0.7"/>`;
    }).join('')}
  </svg>`,
};
