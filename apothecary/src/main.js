// main.js - bootstrap. Wires data -> state -> editor + saved-labels -> preview.
//
// v0.8.0 cache-bust: index.html sets window.__APOTHECARY_BUILD before importing
// this file with the build as a ?v= query. We propagate that query to every
// dynamic import so each module URL changes on every release; Cloudflare's
// edge cache can't serve a stale module graph after a deploy.

const V = "?v=" + (typeof window !== "undefined" && window.__APOTHECARY_BUILD ? window.__APOTHECARY_BUILD : "0");

const [
  stateMod,
  renderMod,
  editorMod,
  shopMod,
  savedMod,
  lookupMod,
  persistMod,
  symbolsMod,
  themesMod,
  texturesMod,
  templatesMod,
] = await Promise.all([
  import("./state.js" + V),
  import("./render.js" + V),
  import("./ui/editor.js" + V),
  import("./ui/shop-name.js" + V),
  import("./ui/saved-labels-ui.js" + V),
  import("./util/lookup.js" + V),
  import("./util/persist.js" + V),
  import("../data/symbols.js" + V),
  import("../data/themes.js" + V),
  import("../data/textures.js" + V),
  import("../data/label-templates.js" + V),
]);

const { createState, defaultState, defaultLayout, makeZone, ZONE_LAYOUT_MODES, ZONE_WIDTHS, DEFAULT_SECTION_TITLES } = stateMod;
const { render, ITEM_LABELS, ALL_ITEM_KEYS, BORDER_STYLES, BORDER_STYLE_LABELS } = renderMod;
const { mountEditor } = editorMod;
const { mountShopName } = shopMod;
const { mountSavedLabels } = savedMod;
const { makeLookup } = lookupMod;
const { loadState, saveState, clearState, debounce } = persistMod;
const { SYMBOL_LABELS, SYMBOL_ALIASES } = symbolsMod;
const { THEMES } = themesMod;
const { PARCHMENT_TEXTURES } = texturesMod;
const { TEMPLATES, DEFAULT_TEMPLATE_ID } = templatesMod;

async function loadJson(path) {
  const res = await fetch(path + V);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// Build a v0.9 layout from a pre-v0.9 saved state. Reads state.placement
// (per-item front/back booleans) and state.notesSplit (combined vs three-col
// back-bottom-row) to reconstruct what the user had, then maps onto the new
// zone shape. Anything not in placement defaults to its canonical home.
function migrateLayoutFrom(old, defaults) {
  const baseline = defaultLayout();
  const placement = old.placement;

  // No old placement to honor -> just hand back the baseline.
  if (!placement || typeof placement !== 'object') {
    // Honor notesSplit if it was the only customization.
    if (old.notesSplit === true) splitNotesZone(baseline);
    reconcileNotesHidden(baseline);
    return baseline;
  }

  // Map old placement keys to the items they correspond to. compounds,
  // cautions, and notes are intentionally excluded; in v0.8 those three lived
  // inside the back-bottom-row composite and their placement toggles were
  // broken (the bug v0.9 fixes). They're now governed by notesSplit alone,
  // handled separately below.
  const KEY_TO_ITEM = {
    shop: 'shop',
    description: 'description',
    descFull: 'back-desc-full',
    props: 'props',
    symbol: 'symbol',
    botanical: 'botanical',
    rune1: 'rune-1',
    rune2: 'rune-2',
    rune3: 'rune-3',
    historicUses: 'historic',
    pairings: 'pairings',
  };

  // For each item, decide where it goes based on placement[key].front/back.
  // both -> appears on both sides. neither -> hidden.
  const wantFront = new Set();
  const wantBack  = new Set();
  for (const [pKey, itemKey] of Object.entries(KEY_TO_ITEM)) {
    const p = placement[pKey];
    if (!p) {
      // No record - leave it wherever the baseline put it. We figure that out
      // below by inspecting the baseline.
      continue;
    }
    if (p.front) wantFront.add(itemKey);
    if (p.back)  wantBack.add(itemKey);
  }

  // Apply wantFront/wantBack to the baseline: remove items the user hid, add
  // items the user moved to a side that doesn't have them.
  const allItemsInZones = (zones) => {
    const set = new Set();
    zones.forEach(z => z.items.forEach(i => set.add(i)));
    return set;
  };

  // Walk PRESENT items in each side; if user marked them hidden on that side,
  // strip them. If user marked them present on the opposite side, add them.
  for (const side of ['front', 'back']) {
    const want = side === 'front' ? wantFront : wantBack;
    const zones = baseline[side];
    for (const z of zones) {
      z.items = z.items.filter(item => {
        // If this item is in our key map, honor placement. Otherwise (dividers,
        // back-name, back-latin), keep as-is - those had no placement toggle.
        const tracked = Object.values(KEY_TO_ITEM).includes(item);
        if (!tracked) return true;
        // For tracked items, honor want set IF user actually had a record.
        // Items not in placement at all are kept where baseline put them.
        const pKey = Object.entries(KEY_TO_ITEM).find(([, v]) => v === item)?.[0];
        if (!pKey || !placement[pKey]) return true;
        return want.has(item);
      });
    }
    // Add items the user explicitly wanted on this side that aren't here yet.
    const present = allItemsInZones(zones);
    for (const item of want) {
      if (present.has(item)) continue;
      // Append to a sensible zone: front -> center, back -> last zone.
      const target = side === 'front'
        ? (zones.find(z => z.id === 'front-center') ?? zones[0])
        : zones[zones.length - 1];
      if (target) target.items.push(item);
    }
  }

  // notesSplit migration: replace combined "notes" with explicit "compounds"
  // + "cautions" in the back-bottom zone, set to 3-column layout.
  if (old.notesSplit === true) splitNotesZone(baseline);

  // Build hidden list: any tracked item the user explicitly turned off on
  // BOTH sides.
  const hidden = [];
  for (const [pKey, itemKey] of Object.entries(KEY_TO_ITEM)) {
    const p = placement[pKey];
    if (!p) continue;
    if (!p.front && !p.back) hidden.push(itemKey);
  }
  // Reconcile compounds/cautions/notes against zone presence: whichever isn't
  // placed lives in hidden so the picker can offer it.
  const finalPresent = new Set([
    ...allItemsInZones(baseline.front),
    ...allItemsInZones(baseline.back),
  ]);
  for (const candidate of ['compounds', 'cautions', 'notes']) {
    if (!finalPresent.has(candidate) && !hidden.includes(candidate)) {
      hidden.push(candidate);
    }
  }
  baseline.hidden = hidden;
  return baseline;
}

// Same reconciliation for the early-return path (no placement object).
function reconcileNotesHidden(layout) {
  const present = new Set();
  layout.front.forEach(z => z.items.forEach(i => present.add(i)));
  layout.back.forEach(z => z.items.forEach(i => present.add(i)));
  const hidden = new Set(layout.hidden || []);
  for (const c of ['compounds', 'cautions', 'notes']) {
    if (present.has(c)) hidden.delete(c);
    else hidden.add(c);
  }
  layout.hidden = Array.from(hidden);
}

function splitNotesZone(layout) {
  // Find the back-bottom zone (or any zone containing 'notes') and replace
  // 'notes' with ['compounds', 'cautions'] in-place.
  for (const z of layout.back) {
    const idx = z.items.indexOf('notes');
    if (idx >= 0) {
      z.items.splice(idx, 1, 'compounds', 'cautions');
      z.layoutMode = 'columns-3';
    }
  }
}

async function main() {
  const [herbDB, runes, aliasMap, runeMeanings, illustrationsManifest, herbToIllustration] = await Promise.all([
    loadJson('data/herbs.json'),
    loadJson('data/runes.json'),
    loadJson('data/aliases.json'),
    loadJson('data/rune-meanings.json'),
    loadJson('data/illustrations.json'),
    loadJson('data/herb-to-illustration.json'),
  ]);
  const illustrations = illustrationsManifest.illustrations || [];
  const herbAutoMatch = herbToIllustration.autoMatch || {};

  const lookupHerb = makeLookup(herbDB, aliasMap);

  const persisted = loadState();
  const initial = persisted ?? defaultState();
  const defaults = defaultState();
  if (!initial.templateId) initial.templateId = DEFAULT_TEMPLATE_ID;
  const tmpl = TEMPLATES[initial.templateId];
  if (!initial.sizeId || !tmpl.sizes.find(s => s.id === initial.sizeId)) {
    initial.sizeId = tmpl.defaultSize;
  }
  for (const k of ['backEnabled', 'descFull', 'historicUses', 'compounds', 'cautions', 'pairings']) {
    if (typeof initial[k] === 'undefined') initial[k] = defaults[k];
  }
  if (typeof initial.nutrition === 'string' && !initial.compounds) {
    initial.compounds = initial.nutrition;
  }
  if (typeof initial.icon === 'undefined') initial.icon = defaults.icon;

  // v0.9 migration: state.layout owns zone composition. Old saved state may
  // carry state.placement (per-item front/back grid) and state.notesSplit
  // instead. Build state.layout from those signals + the canonical default,
  // then drop the retired fields. New users (no persisted state) already have
  // defaultLayout via defaultState().
  if (!initial.layout || !Array.isArray(initial.layout.front)) {
    initial.layout = migrateLayoutFrom(initial, defaults);
  } else {
    // Already on v0.9 shape - just ensure hidden array exists.
    if (!Array.isArray(initial.layout.hidden)) initial.layout.hidden = [];
  }
  delete initial.placement;
  delete initial.notesSplit;

  // v0.11 backfill: section titles, custom items, layout presets, border style.
  if (!initial.sectionTitles || typeof initial.sectionTitles !== 'object') {
    initial.sectionTitles = { ...DEFAULT_SECTION_TITLES };
  } else {
    // Add any new default keys that didn't exist when this state was saved.
    for (const k of Object.keys(DEFAULT_SECTION_TITLES)) {
      if (!(k in initial.sectionTitles)) initial.sectionTitles[k] = DEFAULT_SECTION_TITLES[k];
    }
  }
  if (!Array.isArray(initial.customItems))   initial.customItems = [];
  if (!Array.isArray(initial.layoutPresets)) initial.layoutPresets = [];
  if (typeof initial.borderStyle !== 'string') initial.borderStyle = 'celtic';
  // v0.14: illustration override field. Default null = auto-match.
  if (initial.illustration === undefined) initial.illustration = null;
  // v0.14.2: preview-collapse persistence. Both open on first load.
  if (!initial.previewCollapse || typeof initial.previewCollapse !== 'object') {
    initial.previewCollapse = { front: false, back: false };
  }
  if (typeof initial.previewCollapse.front !== 'boolean') initial.previewCollapse.front = false;
  if (typeof initial.previewCollapse.back  !== 'boolean') initial.previewCollapse.back  = false;

  // v0.11: backfill zone.align (default 'center') on any pre-existing layout.
  for (const side of ['front', 'back']) {
    for (const z of (initial.layout?.[side] ?? [])) {
      if (!z.align) z.align = 'center';
    }
  }

  // v0.8.3: validate parchmentTexture against the manifest. Old saved states
  // may reference 'gradient' (retired) or a slot id that no longer exists
  // after re-sorting; reset those to the default (parchment-01 / lightest).
  const validIds = new Set(PARCHMENT_TEXTURES.map(t => t.id));
  if (!validIds.has(initial.parchmentTexture)) {
    initial.parchmentTexture = PARCHMENT_TEXTURES[0]?.id ?? 'parchment-01';
  }

  const state = createState(initial);

  mountShopName(document.querySelector('[data-shop-name]'), state);

  const savedMount = document.querySelector('[data-saved-labels]');
  if (savedMount) mountSavedLabels(savedMount, state);

  mountEditor(document.querySelector('[data-editor]'), {
    state, lookupHerb, runes, herbDB, aliasMap, runeMeanings,
    symbolLabels: SYMBOL_LABELS,
    templates: TEMPLATES,
    parchmentTextures: PARCHMENT_TEXTURES,
    // v0.11.1: forwarded so editor.js doesn't need static imports of upstream
    // modules. Keeps the v0.8.0 cache-bust contract intact.
    ITEM_LABELS, ALL_ITEM_KEYS, BORDER_STYLES, BORDER_STYLE_LABELS,
    makeZone, ZONE_LAYOUT_MODES, ZONE_WIDTHS, defaultLayout, DEFAULT_SECTION_TITLES,
    // v0.14: illustration library + auto-match table for the picker UI.
    illustrations, herbAutoMatch,
    onReset: () => {
      clearState();
      state.set(defaultState());
    },
  });

  const previewMount = document.querySelector('[data-preview]');
  const printStageMount = document.querySelector('[data-print-stage]');
  const ctx = {
    templates: TEMPLATES,
    themes: THEMES,
    parchmentTextures: PARCHMENT_TEXTURES,
    symbolAliases: SYMBOL_ALIASES,
    // v0.14: illustration library + per-herb auto-match.
    illustrations,
    herbAutoMatch,
    // v0.14.2: hook for render.js to update preview-collapse state.
    setPreviewCollapse(next) {
      state.set({ previewCollapse: next });
    },
  };
  function paint(s) { render(s, { preview: previewMount, printStage: printStageMount }, ctx); }
  state.subscribe(paint);
  paint(state.get());

  // v0.16.3: re-paint only when the viewport WIDTH changes. The preview scale
  // depends on width alone (previewScaleFor in render.js). Mobile browsers fire
  // resize on every scroll as the URL bar shows and hides, which changes only
  // the height; repainting the whole preview on each of those events fought the
  // scroll gesture and made the page feel unscrollable. Skip height-only
  // resizes; still debounce real width changes so a desktop drag doesn't thrash.
  let resizeTimer = null;
  let lastViewportW = typeof window !== 'undefined' ? window.innerWidth : 0;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastViewportW) return;
    lastViewportW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => paint(state.get()), 80);
  });
  window.addEventListener('orientationchange', () => paint(state.get()));

  // v0.16: save indicator flashes when the debounced save fires.
  const saveIndicator = document.querySelector('[data-save-indicator]');
  const debouncedSave = debounce((s) => {
    saveState(s);
    if (saveIndicator) {
      saveIndicator.classList.add('is-saving');
      setTimeout(() => saveIndicator.classList.remove('is-saving'), 1100);
    }
  }, 200);
  state.subscribe(debouncedSave);

  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn-primary, .btn-secondary, .btn-ghost');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--ripple-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty('--ripple-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  });

  // v0.16: global keyboard shortcuts.
  //   ?               -> open the shortcut help dialog
  //   Esc             -> close any open popover or open dialog
  //   Ctrl/Cmd + P    -> print (also the native shortcut, but we make sure
  //                      our print-stage layout is fresh first)
  //   Ctrl/Cmd + K    -> focus the herb search input
  //   Ctrl/Cmd + S    -> force an immediate persist + flash save indicator
  //   Alt + 1..4      -> toggle Content / Style / Layout / Output sections
  const helpDialog = document.querySelector('[data-shortcut-help]');
  document.querySelector('[data-shortcut-toggle]')?.addEventListener('click', () => {
    if (helpDialog?.open) helpDialog.close();
    else helpDialog?.showModal();
  });
  document.querySelector('[data-shortcut-close]')?.addEventListener('click', () => {
    helpDialog?.close();
  });

  document.addEventListener('keydown', (e) => {
    const inField = e.target instanceof HTMLElement &&
      (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);

    // ESC: cascading dismiss. Popovers first; then open dialog.
    if (e.key === 'Escape') {
      const popovers = document.querySelectorAll('.layout-color-popover, .layout-item-picker');
      if (popovers.length) {
        popovers.forEach(p => p.remove());
        e.preventDefault();
        return;
      }
      if (helpDialog?.open) {
        helpDialog.close();
        e.preventDefault();
        return;
      }
    }

    if (e.key === '?' && !inField) {
      if (helpDialog?.open) helpDialog.close();
      else helpDialog?.showModal();
      e.preventDefault();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      const herb = document.getElementById('herbName');
      if (herb) { herb.focus(); herb.select(); }
      e.preventDefault();
      return;
    }
    if (mod && (e.key === 's' || e.key === 'S')) {
      saveState(state.get());
      if (saveIndicator) {
        saveIndicator.classList.add('is-saving');
        setTimeout(() => saveIndicator.classList.remove('is-saving'), 1100);
      }
      e.preventDefault();
      return;
    }

    if (e.altKey && /^[1-4]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const sections = document.querySelectorAll('.ed-section');
      const sec = sections[idx];
      if (sec) {
        const open = sec.classList.toggle('ed-section--open');
        const head = sec.querySelector('.ed-section-head');
        head?.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      e.preventDefault();
    }
  });

  // v0.16: auto-grow textareas as the user types. Most apps have it; we
  // didn't until now.
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLTextAreaElement)) return;
    if (!el.classList.contains('field-input') && !el.classList.contains('custom-item-body')) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 360) + 'px';
  });

  // v0.16: outside-click dismisses any open color popover or item picker
  // even if their internal dismisser hasn't wired yet (defensive).
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.closest('.layout-color-popover, [data-color-pick], [data-glow-pick]')) return;
    document.querySelectorAll('.layout-color-popover').forEach(p => p.remove());
  }, true);

  // v0.16: when a user opens a section via keyboard shortcut or click, focus
  // the first focusable element inside its body for fast keyboard input.
  document.addEventListener('click', (e) => {
    const head = e.target instanceof HTMLElement && e.target.closest('.ed-section-head');
    if (!head) return;
    const sec = head.closest('.ed-section');
    if (!sec?.classList.contains('ed-section--open')) return;
    const body = sec.querySelector('.ed-section-body');
    const first = body?.querySelector('input:not([hidden]), textarea, select, button');
    // Don't yank focus on click; user already used the mouse. This intentionally
    // doesn't auto-focus on mouse clicks - keyboard handler below does.
  });

  // v0.16: window-visibility persist guard. When the user backgrounds the
  // tab on mobile, force a snapshot save so iOS Safari's aggressive page
  // freezing doesn't drop the latest debounced state.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState(state.get());
    }
  });

  // v0.16: announce save status to screen readers via the existing aria-live
  // node. The CSS class drives the visual; the textContent drives the SR text.
  state.subscribe(() => {
    const t = saveIndicator?.querySelector('.app-status-text');
    if (t) t.textContent = 'Saving';
    setTimeout(() => { if (t) t.textContent = 'Saved'; }, 280);
  });
}

main().catch(err => {
  console.error('Apothecary label creator failed to start:', err);
  document.body.innerHTML = '<pre style="color:#C4580A; padding:20px; font-family:monospace;">' + (err.stack || err.message) + '</pre>';
});
