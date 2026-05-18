// render.js — schema-driven label renderer.
//
// Consumes the active template descriptor + theme + state and rebuilds the
// label preview DOM. Pure of imports beyond ctx — swap any registry to test.

import { autofitText } from './util/autofit.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function wavyDivider(color) {
  return `<svg width="60" height="6" viewBox="0 0 60 6" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 3 Q 7.5 0, 15 3 T 30 3 T 45 3 T 60 3" stroke="${color}" stroke-width="0.8" fill="none"/>
  </svg>`;
}

function runeItem(rune, color) {
  if (!rune) return '';
  return `<div class="rune-item">
    <span class="rune-char" style="color:${color}">${esc(rune.c)}</span>
    <span class="rune-name" style="color:${color}">${esc(rune.m)}</span>
  </div>`;
}

function parchmentSvg(theme) {
  return `<svg class="parchment-bg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <radialGradient id="parchGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="${theme.paperGradStart}"/>
        <stop offset="100%" stop-color="${theme.paperGradEnd}"/>
      </radialGradient>
      ${theme.paperGrain ? `<filter id="paperGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend in="SourceGraphic" mode="multiply"/>
      </filter>` : ''}
    </defs>
    <rect width="100%" height="100%" fill="url(#parchGrad)" ${theme.paperGrain ? 'filter="url(#paperGrain)"' : ''}/>
  </svg>`;
}

function borderSvg(color, theme, sizeIn) {
  // SVG coordinate space matches 1in = 96 user units convention (288×144 for 3×1.5).
  const w = sizeIn.wIn * 96;
  const h = sizeIn.hIn * 96;
  const outer = theme.borderOpacityOuter;
  const inner = theme.borderOpacityInner;
  return `<svg class="border-overlay" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 ${w} ${h}">
    <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="${color}" stroke-width="1" opacity="${outer}"/>
    <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="3" fill="none" stroke="${color}" stroke-width="0.5" opacity="${inner}"/>
    <circle cx="6" cy="6" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="${w - 6}" cy="6" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="6" cy="${h - 6}" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="${w - 6}" cy="${h - 6}" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
  </svg>`;
}

// Item renderer registry. Add a new label item by adding one entry here
// and referencing its key from a template's zone.items array.
const ITEM_RENDERERS = {
  symbol:        (s, ctx) => `<div>${ctx.symbols[s.symbol]?.(s.accent) ?? ''}</div>`,
  botanical:     (s, ctx) => `<div>${ctx.botanicals[s.botanical]?.(s.accent) ?? ''}</div>`,
  shop:          (s, ctx) => `<div class="lbl-shop" style="color:${ctx.theme.shopColor}; text-shadow:${ctx.theme.shopShadow}">${esc(s.shopName)}</div>`,
  'divider-top': (s)      => wavyDivider(s.accent),
  'divider-bot': (s)      => wavyDivider(s.accent),
  'herb-name':   (s)      => `<div class="lbl-herb" data-autofit style="color:${s.accent}">${esc(s.herbName)}</div>`,
  latin:         (s, ctx) => `<div class="lbl-latin" style="color:${ctx.theme.latinColor}">${esc(s.latin)}</div>`,
  props:         (s)      => `<div class="lbl-props" style="color:${s.accent}">${esc(s.props)}</div>`,
  description:   (s, ctx) => `<div class="lbl-desc" style="color:${ctx.theme.descColor}">${esc(s.description)}</div>`,
  'rune-1':      (s)      => runeItem(s.runes[0], s.accent),
  'rune-2':      (s)      => runeItem(s.runes[1], s.accent),
  'rune-3':      (s)      => runeItem(s.runes[2], s.accent),
};

// Track whether fonts are ready. Autofit is a no-op until then.
let fontsReady = false;
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { fontsReady = true; });
} else {
  fontsReady = true;
}

export function render(state, container, ctx) {
  const tmpl = ctx.templates[state.templateId];
  if (!tmpl) {
    container.innerHTML = `<div style="color:#C4580A">Unknown template: ${esc(state.templateId)}</div>`;
    return;
  }
  const theme = ctx.themes[tmpl.theme];
  const fullCtx = { ...ctx, theme };

  const { wIn, hIn } = tmpl.size;
  const scale = tmpl.previewScale;
  const wrapperW = `calc(${wIn}in * ${scale})`;
  const wrapperH = `calc(${hIn}in * ${scale})`;

  // Build zones
  const zonesHtml = tmpl.zones.map(zone => {
    const items = zone.items.map(itemKey => {
      const renderer = ITEM_RENDERERS[itemKey];
      return renderer ? renderer(state, fullCtx) : '';
    }).join('');
    const isCenter = zone.id === 'center';
    return `<div class="label-zone${isCenter ? ' center' : ''}" style="width:${zone.width}">${items}</div>`;
  }).join('');

  container.style.width = wrapperW;
  container.style.height = wrapperH;

  container.innerHTML = `
    <div class="label-card" style="width:${wIn}in; height:${hIn}in; transform: scale(${scale});">
      ${parchmentSvg(theme)}
      ${borderSvg(state.accent, theme, tmpl.size)}
      <div class="label-interior" style="width:${wIn}in; height:${hIn}in;">
        ${zonesHtml}
      </div>
    </div>
  `;

  // Run autofit on any element marked [data-autofit]. Wait for fonts on first paint.
  const fits = container.querySelectorAll('[data-autofit]');
  if (fontsReady) {
    fits.forEach(el => autofitText(el));
  } else {
    document.fonts.ready.then(() => {
      fontsReady = true;
      fits.forEach(el => autofitText(el));
    });
  }
}
