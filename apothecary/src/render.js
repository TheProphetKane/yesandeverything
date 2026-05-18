// render.js - schema-driven label renderer with front, optional back, a
// separate print-stage tree, and v0.4 per-side field placement.
//
// Preview cards now live inside a .label-frame sized to post-scale dimensions
// so flex stacking gives correct layout space (avoids back-over-front overlap).

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

const ITEM_RENDERERS = {
  symbol:        (s, ctx) => `<div>${ctx.symbols[s.symbol]?.(s.accent) ?? ''}</div>`,
  botanical:     (s, ctx) => {
    const iconFn = ctx.icons?.[s.icon];
    const svg = iconFn ? iconFn(s.accent) : (ctx.botanicals[s.botanical]?.(s.accent) ?? '');
    return `<div>${svg}</div>`;
  },
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

  'back-name':            (s)      => `<div class="back-name" style="color:${s.accent}">${esc(s.herbName)}</div>`,
  'back-latin':           (s, ctx) => `<div class="back-latin" style="color:${ctx.theme.latinColor}">${esc(s.latin)}</div>`,
  'back-divider':         (s)      => backDividerSvg(s.accent),
  'back-desc-full':       (s, ctx) => `<div class="back-desc-full" style="color:${ctx.theme.descColor}">${esc(s.descFull)}</div>`,
  'back-historic-section': (s, ctx) => `
    <div class="back-section">
      <div class="back-section-title" style="color:${s.accent}">Traditional Uses</div>
      <div class="back-section-body" style="color:${ctx.theme.descColor}">${esc(s.historicUses)}</div>
    </div>`,
  'back-bottom-row':      (s, ctx) => `
    <div class="back-bottom-row">
      <div class="back-section back-half">
        <div class="back-section-title" style="color:${s.accent}">Notes</div>
        <div class="back-section-body" style="color:${ctx.theme.descColor}">${esc([s.compounds, s.cautions].filter(Boolean).join(' '))}</div>
      </div>
      <div class="back-section back-half">
        <div class="back-section-title" style="color:${s.accent}">Pairings</div>
        <div class="back-section-body" style="color:${ctx.theme.descColor}">${esc(s.pairings)}</div>
      </div>
    </div>`,
};

function placementKeyFor(itemKey) {
  if (itemKey === 'shop')          return 'shop';
  if (itemKey === 'description')   return 'description';
  if (itemKey === 'back-desc-full') return 'descFull';
  if (itemKey === 'props')         return 'props';
  if (itemKey === 'symbol')        return 'symbol';
  if (itemKey === 'botanical')     return 'botanical';
  if (itemKey === 'rune-1')        return 'rune1';
  if (itemKey === 'rune-2')        return 'rune2';
  if (itemKey === 'rune-3')        return 'rune3';
  if (itemKey === 'back-historic-section') return 'historicUses';
  return null;
}

function shouldRender(itemKey, side, placement) {
  const key = placementKeyFor(itemKey);
  if (!key) return true;
  const p = placement[key];
  if (!p) return true;
  return !!p[side];
}

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

function zonesHtml(state, fullCtx, zonesArray, side) {
  return zonesArray.map(zone => {
    const items = zone.items
      .filter(itemKey => shouldRender(itemKey, side, state.placement))
      .map(itemKey => ITEM_RENDERERS[itemKey]?.(state, fullCtx) ?? '')
      .join('');
    const isCenter = zone.id === 'center';
    return `<div class="label-zone${isCenter ? ' center' : ''}" style="width:${zone.width ?? '100%'}">${items}</div>`;
  }).join('');
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
        <div class="label-design label-design--${side}" style="
          width:${designW}in;
          height:${designH}in;
          transform: scale(${physicalScale});
        ">
          ${parchmentSvg(theme)}
          ${borderSvg(state.accent, theme, designSize)}
          <div class="label-interior label-interior--${side}" style="width:${designW}in; height:${designH}in;">
            ${zonesHtml(state, fullCtx, zones, side)}
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
      <div class="label-design label-design--${side}" style="
        width:${designW}in;
        height:${designH}in;
        transform: scale(${physicalScale});
      ">
        ${parchmentSvg(theme)}
        ${borderSvg(state.accent, theme, designSize)}
        <div class="label-interior label-interior--${side}" style="width:${designW}in; height:${designH}in;">
          ${zonesHtml(state, fullCtx, zones, side)}
        </div>
      </div>
    </div>
  `;
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

  const showBack = !!state.backEnabled && Array.isArray(tmpl.backZones);
  const cardCount = showBack ? 2 : 1;

  // Preview tree: frames stack vertically with .label-wrapper gap.
  const previewCards = [
    previewCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys, side: 'front',
                      zones: tmpl.zones, theme, previewScale }),
    ...(showBack ? [previewCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys,
                      side: 'back', zones: tmpl.backZones, theme, previewScale })] : []),
  ].join('');

  // The wrapper no longer needs an explicit height — children declare their own.
  mounts.preview.style.width = `calc(${phys.wIn}in * ${previewScale})`;
  mounts.preview.style.height = 'auto';
  mounts.preview.innerHTML = previewCards;

  // Print-stage tree: physical-only, no preview transform.
  if (mounts.printStage) {
    const printCards = [
      printCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys, side: 'front',
                      zones: tmpl.zones, theme }),
      ...(showBack ? [printCardHtml({ state, fullCtx, designSize: tmpl.designSize, phys,
                      side: 'back', zones: tmpl.backZones, theme })] : []),
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
