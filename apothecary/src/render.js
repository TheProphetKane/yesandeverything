// render.js - schema-driven label renderer with front, optional back, a
// separate print-stage tree, and v0.9 state-driven layout.
//
// v0.9 architecture: zones are owned by state.layout (per-side), not by
// template descriptors. Templates only provide initial seeds. Each item is a
// primitive renderer; composites (e.g. the old back-bottom-row) are gone.
// Items not placed in any zone live in state.layout.hidden and render nowhere.
//
// Zone layoutMode controls inner arrangement:
//   stack       - vertical column (default for back)
//   row         - horizontal row,    items share width evenly
//   columns-2   - 2-column grid
//   columns-3   - 3-column grid
//
// Zone width (front zones only) is one of 25/33/50/66/75/100; ignored on back.

import { autofitText } from './util/autofit.js';
import { resolveSize } from '../data/label-templates.js';

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

function backDividerSvg(color) {
  return `<svg width="240" height="2" viewBox="0 0 240 2" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="1" x2="240" y2="1" stroke="${color}" stroke-width="0.5" opacity="0.6"/>
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

// v0.8.2: parchment background is a raster texture (data/textures/parchment-NN.*)
// layered over the SVG gradient fallback. Each slot's manifest entry may carry
// an opacity (slots 9-16 in the dark half use 0.80 -> 0.50 to keep text legible).
// Missing-file onerror reveals the gradient.
function parchmentBg(state, theme, ctx) {
  const id = state.parchmentTexture;
  const textures = ctx.parchmentTextures || [];
  const slot = textures.find(t => t.id === id);
  const svg = parchmentSvg(theme);
  if (!slot || !slot.file) return svg;
  const op = (typeof slot.opacity === 'number') ? slot.opacity : 1;
  const opAttr = op < 1 ? ` style="opacity:${op}"` : '';
  return `${svg}<img class="parchment-bg parchment-bg--texture" src="data/textures/${slot.file}" alt=""${opAttr} onerror="this.remove()"/>`;
}

function borderSvg(color, theme, designSize) {
  const w = designSize.wIn * 96;
  const h = designSize.hIn * 96;
  return `<svg class="border-overlay" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 ${w} ${h}">
    <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="${color}" stroke-width="1" opacity="${theme.borderOpacityOuter}"/>
    <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="3" fill="none" stroke="${color}" stroke-width="0.5" opacity="${theme.borderOpacityInner}"/>
    <circle cx="6" cy="6" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="${w - 6}" cy="6" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="6" cy="${h - 6}" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="${w - 6}" cy="${h - 6}" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
  </svg>`;
}

function ingredientSlug(name) {
  return String(name ?? '').toLowerCase().replace(/'/g, '').replace(/\s+/g, '-');
}

// Section card factory for back-style labeled text blocks.
function sectionCard(title, body, titleColor, bodyColor) {
  return `<div class="back-section">
    <div class="back-section-title" style="color:${titleColor}">${esc(title)}</div>
    <div class="back-section-body" style="color:${bodyColor}">${esc(body)}</div>
  </div>`;
}

// Each ITEM_RENDERERS entry is a primitive item that can be placed in any zone
// on any side. Returns an HTML string or '' to render nothing.
//
// v0.9: 'back-bottom-row' composite removed. 'notes', 'compounds', 'cautions',
// 'pairings' now exist as independent primitives. 'historic' renames
// 'back-historic-section' (alias kept for migration).
export const ITEM_RENDERERS = {
  // --- Front primitives (compact styling) ---
  symbol: (s, ctx) => {
    if (!s.symbol || s.symbol === 'none') return '';
    const resolved = ctx.symbolAliases?.[s.symbol] ?? s.symbol;
    return `<div class="lbl-symbol"><img class="lbl-symbol-img" src="data/symbols/${resolved}.png" alt="" onerror="this.parentElement.style.display='none'"/></div>`;
  },
  botanical: (s, ctx) => {
    const slug = ingredientSlug(s.herbName);
    const catSlug = ctx.categoryDefaultSlug?.(s.botanical) ?? 'basil';
    const fallback = `data/ingredients/${catSlug}.png`;
    return `<div class="lbl-botanical"><img class="lbl-botanical-img" src="data/ingredients/${slug}.png" alt="" width="44" height="50" data-cat-fallback="${fallback}" onerror="if(this.dataset.catFallback){this.src=this.dataset.catFallback;this.dataset.catFallback='';}else{this.parentElement.style.display='none';}"/></div>`;
  },
  shop:          (s, ctx) => `<div class="lbl-shop" style="color:${s.shopColor ?? ctx.theme.shopColor}; text-shadow:${ctx.theme.shopShadow}">${esc(s.shopName)}</div>`,
  'divider-top': (s)      => wavyDivider(s.accent),
  'divider-bot': (s)      => wavyDivider(s.accent),
  'herb-name':   (s)      => `<div class="lbl-herb" data-autofit style="color:${s.accent}">${esc(s.herbName)}</div>`,
  latin:         (s, ctx) => `<div class="lbl-latin" style="color:${ctx.theme.latinColor}">${esc(s.latin)}</div>`,
  props:         (s)      => `<div class="lbl-props" style="color:${s.accent}">${esc(s.props)}</div>`,
  description:   (s, ctx) => `<div class="lbl-desc" style="color:${ctx.theme.descColor}">${esc(s.description)}</div>`,
  'rune-1':      (s)      => runeItem(s.runes[0], s.accent),
  'rune-2':      (s)      => runeItem(s.runes[1], s.accent),
  'rune-3':      (s)      => runeItem(s.runes[2], s.accent),

  // --- Back primitives (full-card styling with title + body) ---
  'back-name':     (s)      => `<div class="back-name" style="color:${s.accent}">${esc(s.herbName)}</div>`,
  'back-latin':    (s, ctx) => `<div class="back-latin" style="color:${ctx.theme.latinColor}">${esc(s.latin)}</div>`,
  'back-divider':  (s)      => backDividerSvg(s.accent),
  'back-desc-full':(s, ctx) => `<div class="back-desc-full" style="color:${ctx.theme.descColor}">${esc(s.descFull)}</div>`,
  historic:        (s, ctx) => sectionCard('Traditional Uses', s.historicUses, s.accent, ctx.theme.descColor),
  notes:           (s, ctx) => sectionCard('Notes', [s.compounds, s.cautions].filter(Boolean).join(' '), s.accent, ctx.theme.descColor),
  compounds:       (s, ctx) => sectionCard('Compounds', s.compounds, s.accent, ctx.theme.descColor),
  cautions:        (s, ctx) => sectionCard('Cautions',  s.cautions,  s.accent, ctx.theme.descColor),
  pairings:        (s, ctx) => sectionCard('Pairings',  s.pairings,  s.accent, ctx.theme.descColor),
};

// Migration aliases: old item keys still in saved state map to new ones at
// render time. Keeps v0.8 saved layouts (if any) working through one release.
const ITEM_ALIAS = {
  'back-historic-section': 'historic',
  // 'back-bottom-row' is intentionally not aliased; it expanded into multiple
  // items, so the migration in main.js handles the split explicitly.
};

function resolveItemKey(key) {
  return ITEM_ALIAS[key] ?? key;
}

// Display labels for the Layout Designer picker. Keep in sync with
// ITEM_RENDERERS keys. Exported so editor.js can render the chip labels and
// the "Add Item" picker without re-listing them.
export const ITEM_LABELS = {
  symbol:           'Celtic Symbol',
  botanical:        'Botanical Icon',
  shop:             'Shop Name',
  'divider-top':    'Wavy Divider (top)',
  'divider-bot':    'Wavy Divider (bottom)',
  'herb-name':      'Herb Name',
  latin:            'Latin Name',
  props:            'Properties',
  description:      'Short Description',
  'rune-1':         'Rune 1',
  'rune-2':         'Rune 2',
  'rune-3':         'Rune 3',
  'back-name':      'Herb Name (back)',
  'back-latin':     'Latin Name (back)',
  'back-divider':   'Thin Divider',
  'back-desc-full': 'Full Description',
  historic:         'Traditional Uses',
  notes:            'Notes (combined)',
  compounds:        'Compounds',
  cautions:         'Cautions',
  pairings:         'Pairings',
};

export const ALL_ITEM_KEYS = Object.keys(ITEM_RENDERERS);

let fontsReady = false;
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { fontsReady = true; });
} else {
  fontsReady = true;
}

const MAX_PREVIEW_PX = 800;
const PREVIEW_SCALE_CAP = 3.0;

function previewScaleFor(physWIn) {
  return Math.min(PREVIEW_SCALE_CAP, MAX_PREVIEW_PX / (physWIn * 96));
}

function pickPrintLayout({ wIn, hIn }, cardCount, paper = { wIn: 8.5, hIn: 11 }, gap = 0.15, pad = 0.25) {
  if (cardCount <= 1) return 'layout-single';
  const usableW = paper.wIn - 2 * pad;
  const usableH = paper.hIn - 2 * pad;
  if (cardCount * wIn + (cardCount - 1) * gap <= usableW) return 'layout-side-by-side';
  if (cardCount * hIn + (cardCount - 1) * gap <= usableH) return 'layout-stacked';
  return 'layout-separate';
}

function zoneHtml(zone, state, fullCtx) {
  const items = (zone.items || []).map(key => {
    const resolved = resolveItemKey(key);
    const fn = ITEM_RENDERERS[resolved];
    return fn ? fn(state, fullCtx) : '';
  }).join('');
  const mode = zone.layoutMode || 'stack';
  const width = zone.width ? `${zone.width}%` : '100%';
  return `<div class="label-zone label-zone--${mode}" data-zone-id="${esc(zone.id)}" style="width:${width}">${items}</div>`;
}

function zonesHtml(zones, state, fullCtx) {
  return (zones || []).map(z => zoneHtml(z, state, fullCtx)).join('');
}

function previewCardHtml({ state, fullCtx, designSize, phys, side, zones, theme, previewScale }) {
  const { wIn: designW, hIn: designH } = designSize;
  const physicalScale = phys.wIn / designW;
  const frameW = `calc(${phys.wIn}in * ${previewScale})`;
  const frameH = `calc(${phys.hIn}in * ${previewScale})`;
  return `
    <div class="label-frame" style="width:${frameW}; height:${frameH};">
      <div class="label-card label-card--${side}" style="
        width:${phys.wIn}in;
        height:${phys.hIn}in;
        transform: scale(${previewScale});
      ">
        <div class="label-design label-design--${side} label-design--${state.sizeId}" style="
          width:${designW}in;
          height:${designH}in;
          transform: scale(${physicalScale});
        ">
          ${parchmentBg(state, theme, fullCtx)}
          ${borderSvg(state.accent, theme, designSize)}
          <div class="label-interior label-interior--${side}" style="width:${designW}in; height:${designH}in;">
            ${zonesHtml(zones, state, fullCtx)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function printCardHtml({ state, fullCtx, designSize, phys, side, zones, theme }) {
  const { wIn: designW, hIn: designH } = designSize;
  const physicalScale = phys.wIn / designW;
  return `
    <div class="label-card label-card--${side}" style="
      width:${phys.wIn}in;
      height:${phys.hIn}in;
    ">
      <div class="label-design label-design--${side} label-design--${state.sizeId}" style="
        width:${designW}in;
        height:${designH}in;
        transform: scale(${physicalScale});
      ">
        ${parchmentBg(state, theme, fullCtx)}
        ${borderSvg(state.accent, theme, designSize)}
        <div class="label-interior label-interior--${side}" style="width:${designW}in; height:${designH}in;">
          ${zonesHtml(zones, state, fullCtx)}
        </div>
      </div>
    </div>
  `;
}

function zonesForSide(state, tmpl, side) {
  // state.layout is authoritative; template zones only matter as the initial
  // seed (main.js handles that). If state.layout somehow is missing, fall back
  // to template defaults so the page still paints.
  if (state.layout && Array.isArray(state.layout[side])) return state.layout[side];
  if (side === 'front') return tmpl.zones ?? [];
  if (side === 'back')  return tmpl.backZones ?? [];
  return [];
}

export function render(state, mounts, ctx) {
  const tmpl = ctx.templates[state.templateId];
  if (!tmpl) {
    mounts.preview.innerHTML = `<div style="color:#C4580A">Unknown template: ${esc(state.templateId)}</div>`;
    if (mounts.printStage) mounts.printStage.innerHTML = '';
    return;
  }
  const theme = ctx.themes[tmpl.theme];
  const fullCtx = { ...ctx, theme };

  const phys = resolveSize(tmpl, state.sizeId);
  const previewScale = previewScaleFor(phys.wIn);

  const frontZones = zonesForSide(state, tmpl, 'front');
  const backZones  = zonesForSide(state, tmpl, 'back');

  const showBack = !!state.backEnabled && backZones.length > 0;
  const cardCount = showBack ? 2 : 1;

  const previewCards = [
    previewCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys, side: 'front',
                      zones: frontZones, theme, previewScale }),
    ...(showBack ? [previewCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys,
                      side: 'back', zones: backZones, theme, previewScale })] : []),
  ].join('');

  mounts.preview.style.width = `calc(${phys.wIn}in * ${previewScale})`;
  mounts.preview.style.height = 'auto';
  mounts.preview.innerHTML = previewCards;

  if (mounts.printStage) {
    const printCards = [
      printCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys, side: 'front',
                      zones: frontZones, theme }),
      ...(showBack ? [printCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys,
                      side: 'back', zones: backZones, theme })] : []),
    ].join('');
    mounts.printStage.innerHTML = printCards;
    mounts.printStage.className = pickPrintLayout(phys, cardCount);
  }

  const fits = mounts.preview.querySelectorAll('[data-autofit]');
  if (fontsReady) {
    fits.forEach(el => autofitText(el));
  } else {
    document.fonts.ready.then(() => {
      fontsReady = true;
      fits.forEach(el => autofitText(el));
    });
  }
}
