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

function runeItem(rune, color, glow) {
  if (!rune) return '';
  const shadowStyle = glow ? `;text-shadow:${textGlow(glow)}` : '';
  return `<div class="rune-item">
    <span class="rune-char" style="color:${color}${shadowStyle}">${esc(rune.c)}</span>
    <span class="rune-name" style="color:${color}${shadowStyle}">${esc(rune.m)}</span>
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
  // v0.15: per-slot scale override for textures that sit too narrow inside
  // the label and leak white on the edges. scale > 1 overruns the box;
  // overflow on the parent clips it cleanly. Default 1.
  const scale = (typeof slot.scale === 'number') ? slot.scale : 1;
  const styleParts = [];
  if (op < 1) styleParts.push(`opacity:${op}`);
  if (scale !== 1) styleParts.push(`transform:scale(${scale})`);
  const styleAttr = styleParts.length ? ` style="${styleParts.join(';')}"` : '';
  return `${svg}<img class="parchment-bg parchment-bg--texture" src="data/textures/${slot.file}" alt=""${styleAttr} onerror="this.remove()"/>`;
}

// v0.11: border style variants. The 'celtic' style is the canonical v0.8
// look (double-rect plus four corner circles). Three new variants:
//   - simple:  single hairline only, no corner ornaments
//   - beveled: double rect, no corner circles, slightly tighter inner
//   - ornate:  double rect + corner circles + corner knots (small + shapes)
function borderSvg(color, theme, designSize, style = 'celtic') {
  const w = designSize.wIn * 96;
  const h = designSize.hIn * 96;
  const oOuter = theme.borderOpacityOuter;
  const oInner = theme.borderOpacityInner;

  const cornerCircles = `
    <circle cx="6" cy="6" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="${w - 6}" cy="6" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="6" cy="${h - 6}" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="${w - 6}" cy="${h - 6}" r="2" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.6"/>
  `;

  const cornerKnots = `
    <path d="M 4 12 Q 8 8, 12 4 M 4 8 Q 8 8, 8 4" stroke="${color}" stroke-width="0.5" fill="none" opacity="0.5"/>
    <path d="M ${w - 4} 12 Q ${w - 8} 8, ${w - 12} 4 M ${w - 4} 8 Q ${w - 8} 8, ${w - 8} 4" stroke="${color}" stroke-width="0.5" fill="none" opacity="0.5"/>
    <path d="M 4 ${h - 12} Q 8 ${h - 8}, 12 ${h - 4} M 4 ${h - 8} Q 8 ${h - 8}, 8 ${h - 4}" stroke="${color}" stroke-width="0.5" fill="none" opacity="0.5"/>
    <path d="M ${w - 4} ${h - 12} Q ${w - 8} ${h - 8}, ${w - 12} ${h - 4} M ${w - 4} ${h - 8} Q ${w - 8} ${h - 8}, ${w - 8} ${h - 4}" stroke="${color}" stroke-width="0.5" fill="none" opacity="0.5"/>
  `;

  let body = '';
  if (style === 'simple') {
    body = `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="${color}" stroke-width="0.8" opacity="${oOuter}"/>`;
  } else if (style === 'beveled') {
    body = `
      <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="2" fill="none" stroke="${color}" stroke-width="1" opacity="${oOuter}"/>
      <rect x="7" y="7" width="${w - 14}" height="${h - 14}" rx="1" fill="none" stroke="${color}" stroke-width="0.4" opacity="${oInner}"/>
    `;
  } else if (style === 'ornate') {
    body = `
      <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="${color}" stroke-width="1" opacity="${oOuter}"/>
      <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="3" fill="none" stroke="${color}" stroke-width="0.5" opacity="${oInner}"/>
      ${cornerCircles}
      ${cornerKnots}
    `;
  } else {
    // 'celtic' (default v0.8 look)
    body = `
      <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="${color}" stroke-width="1" opacity="${oOuter}"/>
      <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="3" fill="none" stroke="${color}" stroke-width="0.5" opacity="${oInner}"/>
      ${cornerCircles}
    `;
  }

  return `<svg class="border-overlay" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

export const BORDER_STYLES = ['simple', 'beveled', 'celtic', 'ornate'];
export const BORDER_STYLE_LABELS = {
  simple:  'Simple',
  beveled: 'Beveled',
  celtic:  'Celtic (default)',
  ornate:  'Ornate',
};

function ingredientSlug(name) {
  return String(name ?? '').toLowerCase().replace(/'/g, '').replace(/\s+/g, '-');
}

// Section card factory for back-style labeled text blocks.
// v0.11: title is optional - when empty, just the body renders (no title row).
// v0.15: instance carries optional per-instance color + glow.
function sectionCard(title, body, titleColor, bodyColor, glow) {
  const titleHtml = title
    ? `<div class="back-section-title" style="color:${titleColor}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(title)}</div>`
    : '';
  const bodyStyle = `color:${bodyColor}${glow ? `;text-shadow:${textGlow(glow)}` : ''}`;
  return `<div class="back-section${title ? '' : ' back-section--no-title'}">
    ${titleHtml}
    <div class="back-section-body" style="${bodyStyle}">${esc(body)}</div>
  </div>`;
}

// v0.15: glow recipes. textGlow paints text-shadow halos; imageGlow paints
// a drop-shadow filter chain. Both take the user-chosen glow color.
function textGlow(color) {
  return `0 0 6px ${color}, 0 0 14px ${color}`;
}
function imageGlow(color) {
  return `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color})`;
}

// Resolve color/glow from an item instance, falling back to state.accent for
// color and undefined for glow (which means no glow rendered).
function instanceColor(state, instance) {
  return (instance && instance.color) || state.accent;
}
function instanceGlow(instance) {
  return (instance && instance.glow) || null;
}

// Resolve a section title from state, falling back to the canonical default.
function titleFor(state, key) {
  const overrides = state.sectionTitles ?? {};
  return overrides[key] !== undefined ? overrides[key] : '';
}

// Each ITEM_RENDERERS entry is a primitive item that can be placed in any zone
// on any side. Returns an HTML string or '' to render nothing.
//
// v0.9: 'back-bottom-row' composite removed. 'notes', 'compounds', 'cautions',
// 'pairings' now exist as independent primitives. 'historic' renames
// 'back-historic-section' (alias kept for migration).
// v0.15: every renderer takes (state, ctx, instance) where instance is the
// normalized item config { key, color?, glow? }. instance may be null when
// the item came from a legacy string entry. Colors fall back to state.accent;
// glow is null by default.
export const ITEM_RENDERERS = {
  // --- Front primitives (compact styling) ---
  symbol: (s, ctx, inst) => {
    if (!s.symbol || s.symbol === 'none') return '';
    const resolved = ctx.symbolAliases?.[s.symbol] ?? s.symbol;
    const customColor = inst && inst.color;       // explicit user pick, or null
    const glow  = instanceGlow(inst);
    const url = `data/symbols/${resolved}.png`;
    // v0.15.2: symbol always renders the <img> as the guaranteed-visible
    // silhouette (black, the original look). When the user EXPLICITLY picks
    // a color (inst.color set), an additional masked tint overlay paints on
    // top to recolor. Without an explicit color the tint is omitted so we
    // never replace a working black silhouette with a possibly-broken mask.
    const filterStyle = glow ? ` style="filter:${imageGlow(glow)}"` : '';
    const tint = customColor
      ? `<div class="lbl-symbol-tint" style="--symbol-url:url('${url}');background-color:${customColor}"></div>`
      : '';
    return `<div class="lbl-symbol"${filterStyle}>
      <img class="lbl-symbol-img" src="${url}" alt="" onerror="this.parentElement.style.display='none'"/>
      ${tint}
    </div>`;
  },
  botanical: (s, ctx, inst) => {
    // Resolution order for the botanical slot:
    //   1. state.illustration override -> data/illustrations/<keyword>.png
    //   2. herb-name auto-match via ctx.herbAutoMatch -> same dir
    //   3. v0.18 generic category fallback via ctx.herbCategoryFallback
    //      keyed on state.botanical -> a generic library image for the category
    //   4. hide the slot
    let keyword = null;
    if (s.illustration && typeof s.illustration === 'string') {
      keyword = s.illustration;
    } else if (ctx.herbAutoMatch) {
      const key = String(s.herbName ?? '').toLowerCase().trim();
      keyword = ctx.herbAutoMatch[key] || null;
    }
    // v0.18: generic category fallback when the herb name has no auto-match.
    if (!keyword && ctx.herbCategoryFallback) {
      const cat = String(s.botanical ?? '').toLowerCase().trim();
      keyword = ctx.herbCategoryFallback[cat] || null;
    }
    if (!keyword) return '';
    const glow = instanceGlow(inst);
    const style = glow ? ` style="filter:${imageGlow(glow)}"` : '';
    return `<div class="lbl-botanical"${style}><img class="lbl-botanical-img" src="data/illustrations/${keyword}.png" alt="" width="44" height="50" onerror="this.parentElement.style.display='none'"/></div>`;
  },
  shop: (s, ctx, inst) => {
    const color = (inst && inst.color) || s.shopColor || ctx.theme.shopColor;
    const glow  = instanceGlow(inst);
    const shadow = glow ? textGlow(glow) : ctx.theme.shopShadow;
    return `<div class="lbl-shop" style="color:${color}; text-shadow:${shadow}">${esc(s.shopName)}</div>`;
  },
  'divider-top': (s, ctx, inst) => wavyDivider(instanceColor(s, inst)),
  'divider-bot': (s, ctx, inst) => wavyDivider(instanceColor(s, inst)),
  'herb-name':   (s, ctx, inst) => {
    const color = instanceColor(s, inst);
    const glow  = instanceGlow(inst);
    return `<div class="lbl-herb" data-autofit style="color:${color}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(s.herbName)}</div>`;
  },
  latin: (s, ctx, inst) => {
    const color = (inst && inst.color) || ctx.theme.latinColor;
    const glow  = instanceGlow(inst);
    return `<div class="lbl-latin" style="color:${color}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(s.latin)}</div>`;
  },
  props: (s, ctx, inst) => {
    const color = instanceColor(s, inst);
    const glow  = instanceGlow(inst);
    return `<div class="lbl-props" style="color:${color}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(s.props)}</div>`;
  },
  description: (s, ctx, inst) => {
    const color = (inst && inst.color) || ctx.theme.descColor;
    const glow  = instanceGlow(inst);
    return `<div class="lbl-desc" style="color:${color}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(s.description)}</div>`;
  },
  'rune-1': (s, ctx, inst) => runeItem(s.runes[0], instanceColor(s, inst), instanceGlow(inst)),
  'rune-2': (s, ctx, inst) => runeItem(s.runes[1], instanceColor(s, inst), instanceGlow(inst)),
  'rune-3': (s, ctx, inst) => runeItem(s.runes[2], instanceColor(s, inst), instanceGlow(inst)),

  // --- Back primitives (full-card styling with title + body) ---
  'back-name': (s, ctx, inst) => {
    const color = instanceColor(s, inst);
    const glow  = instanceGlow(inst);
    return `<div class="back-name" style="color:${color}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(s.herbName)}</div>`;
  },
  'back-latin': (s, ctx, inst) => {
    const color = (inst && inst.color) || ctx.theme.latinColor;
    const glow  = instanceGlow(inst);
    return `<div class="back-latin" style="color:${color}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(s.latin)}</div>`;
  },
  'back-divider': (s, ctx, inst) => backDividerSvg(instanceColor(s, inst)),
  'back-desc-full': (s, ctx, inst) => {
    const t = titleFor(s, 'back-desc-full');
    const color = (inst && inst.color) || ctx.theme.descColor;
    const glow  = instanceGlow(inst);
    if (t) return sectionCard(t, s.descFull, instanceColor(s, inst), color, glow);
    return `<div class="back-desc-full" style="color:${color}${glow ? `;text-shadow:${textGlow(glow)}` : ''}">${esc(s.descFull)}</div>`;
  },
  historic:  (s, ctx, inst) => sectionCard(titleFor(s, 'historic'),  s.historicUses, instanceColor(s, inst), ctx.theme.descColor, instanceGlow(inst)),
  notes:     (s, ctx, inst) => sectionCard(titleFor(s, 'notes'),     [s.compounds, s.cautions].filter(Boolean).join(' '), instanceColor(s, inst), ctx.theme.descColor, instanceGlow(inst)),
  compounds: (s, ctx, inst) => sectionCard(titleFor(s, 'compounds'), s.compounds, instanceColor(s, inst), ctx.theme.descColor, instanceGlow(inst)),
  cautions:  (s, ctx, inst) => sectionCard(titleFor(s, 'cautions'),  s.cautions,  instanceColor(s, inst), ctx.theme.descColor, instanceGlow(inst)),
  pairings:  (s, ctx, inst) => sectionCard(titleFor(s, 'pairings'),  s.pairings,  instanceColor(s, inst), ctx.theme.descColor, instanceGlow(inst)),
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

// v0.11: render a custom user-defined item by looking it up in state.customItems.
// v0.15: per-instance color + glow honored.
function renderCustomItem(key, state, ctx, inst) {
  const items = state.customItems ?? [];
  const item = items.find(i => i.id === key);
  if (!item) return '';
  return sectionCard(
    item.title || '',
    item.body  || '',
    instanceColor(state, inst),
    ctx.theme.descColor,
    instanceGlow(inst)
  );
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

// v0.16.1: the preview width was capped at 800px which is fine on desktop
// but on mobile (370px viewports) the rendered preview overflowed off-screen
// and there was nothing to scroll it back. Now we clamp to the actual usable
// viewport width minus a small inset for the preview-card padding so the
// label always fits on screen at the largest scale that still fits.
function previewScaleFor(physWIn) {
  const labelPx = physWIn * 96;
  // Available horizontal space inside the preview-card. Reserve 56px for
  // card padding (24px each side) + a couple px breathing room. The
  // window.innerWidth fallback covers SSR / test environments where window
  // is undefined.
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const availableW = Math.max(220, viewportW - 56);
  const cap = Math.min(MAX_PREVIEW_PX, availableW);
  return Math.min(PREVIEW_SCALE_CAP, cap / labelPx);
}

function pickPrintLayout({ wIn, hIn }, cardCount, paper = { wIn: 8.5, hIn: 11 }, gap = 0.15, pad = 0.25) {
  if (cardCount <= 1) return 'layout-single';
  const usableW = paper.wIn - 2 * pad;
  const usableH = paper.hIn - 2 * pad;
  if (cardCount * wIn + (cardCount - 1) * gap <= usableW) return 'layout-side-by-side';
  if (cardCount * hIn + (cardCount - 1) * gap <= usableH) return 'layout-stacked';
  return 'layout-separate';
}

// v0.15: an item entry is either a bare string (legacy) or an object
// { key, color?, glow? }. Normalize before dispatching so renderers always
// see the instance shape.
function normalizeItem(it) {
  if (typeof it === 'string') return { key: it };
  return it || { key: '' };
}

function zoneHtml(zone, state, fullCtx) {
  const items = (zone.items || []).map(raw => {
    const inst = normalizeItem(raw);
    const key  = inst.key;
    if (!key) return '';
    // v0.11: custom items dispatch through the state lookup.
    if (key.startsWith('custom-')) return renderCustomItem(key, state, fullCtx, inst);
    const resolved = resolveItemKey(key);
    const fn = ITEM_RENDERERS[resolved];
    return fn ? fn(state, fullCtx, inst) : '';
  }).join('');
  const mode  = zone.layoutMode || 'stack';
  const width = zone.width ? `${zone.width}%` : '100%';
  const align = zone.align || 'center';
  return `<div class="label-zone label-zone--${mode} label-zone--align-${align}" data-zone-id="${esc(zone.id)}" style="width:${width}">${items}</div>`;
}

function zonesHtml(zones, state, fullCtx) {
  return (zones || []).map(z => zoneHtml(z, state, fullCtx)).join('');
}

// v0.14.2 + v0.15.1: collapsible wrapper around each preview card. When
// collapsed, the body is OMITTED from the HTML entirely (not just hidden via
// CSS) so the fixed-dimension label-frame inside doesn't fight the layout.
// Cleaner than CSS height tricks, simpler reflow, no flash during transition.
// Cost: re-paint on every expand, but render() already runs on every state
// change so the marginal work is small.
function previewSection(side, label, open, cardHtml) {
  const openCls = open ? ' preview-section--open' : '';
  const aria = open ? 'true' : 'false';
  const body = open
    ? `<div class="preview-section-body">${cardHtml}</div>`
    : '';
  return `
    <div class="preview-section${openCls}" data-preview-side="${side}">
      <button class="preview-section-head" type="button" data-preview-toggle="${side}" aria-expanded="${aria}">
        <span class="preview-section-title">${esc(label)}</span>
        <span class="preview-section-chevron" aria-hidden="true">›</span>
      </button>
      ${body}
    </div>
  `;
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
          ${borderSvg(state.accent, theme, designSize, state.borderStyle)}
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
        ${borderSvg(state.accent, theme, designSize, state.borderStyle)}
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

  // v0.14.2 + v0.15.1: wrap each preview card in a collapsible section. When
  // collapsed, the card HTML isn't even generated - cheaper and avoids fighting
  // the fixed-dimension label-frame layout.
  const collapse = state.previewCollapse ?? { front: false, back: false };
  const frontOpen = !collapse.front;
  const backOpen  = !collapse.back;
  const frontCard = frontOpen
    ? previewCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys, side: 'front',
                        zones: frontZones, theme, previewScale })
    : '';
  const backCard = (showBack && backOpen)
    ? previewCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys,
                        side: 'back', zones: backZones, theme, previewScale })
    : '';
  const previewCards = [
    previewSection('front', 'Front', frontOpen, frontCard),
    ...(showBack ? [previewSection('back', 'Back', backOpen, backCard)] : []),
  ].join('');

  // Preview wrapper sizes itself off the design width when at least one
  // section is open. When both are collapsed (or only back is shown and
  // collapsed) it still needs enough width to host the headers.
  mounts.preview.style.width = `calc(${phys.wIn}in * ${previewScale})`;
  mounts.preview.style.minWidth = '240px';
  mounts.preview.style.height = 'auto';
  mounts.preview.innerHTML = previewCards;

  // Wire collapse toggles. Each click flips state.previewCollapse[side] and
  // triggers a re-render via the existing state.subscribe wiring.
  mounts.preview.querySelectorAll('[data-preview-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const side = btn.dataset.previewToggle;
      const cur = state.previewCollapse ?? { front: false, back: false };
      const next = { ...cur, [side]: !cur[side] };
      // ctx.setState is provided by main.js as a hook into the state setter so
      // render.js doesn't need to know about the createState API directly.
      if (typeof ctx.setPreviewCollapse === 'function') {
        ctx.setPreviewCollapse(next);
      }
    });
  });

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
