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
  exportPngMod,
  migrateMod,
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
  import("./util/export-png.js" + V),
  import("./util/migrate.js" + V),
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
const { exportPng } = exportPngMod;
const { normalizeState } = migrateMod;
const { SYMBOL_LABELS, SYMBOL_ALIASES } = symbolsMod;
const { THEMES } = themesMod;
const { PARCHMENT_TEXTURES } = texturesMod;
const { TEMPLATES, DEFAULT_TEMPLATE_ID } = templatesMod;

async function loadJson(path) {
  const res = await fetch(path + V);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
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
  const herbCategoryFallback = herbToIllustration.categoryFallback || {};

  const lookupHerb = makeLookup(herbDB, aliasMap);

  // Saved-state migration + backfill lives in src/util/migrate.js (v1.0.4)
  // so boot restore, saved-label recall, and test-migration.mjs all run the
  // same shipped code. normalizeState upgrades any prior schema in place.
  const migrateCtx = {
    templates: TEMPLATES,
    defaultTemplateId: DEFAULT_TEMPLATE_ID,
    parchmentTextures: PARCHMENT_TEXTURES,
  };
  const persisted = loadState();
  const initial = normalizeState(persisted ?? defaultState(), migrateCtx);

  const state = createState(initial);

  mountShopName(document.querySelector('[data-shop-name]'), state);

  const savedMount = document.querySelector('[data-saved-labels]');
  // v1.0.4: recalled snapshots run through the same normalizeState as boot,
  // so a label saved before v0.9 (no state.layout) no longer loads blank.
  if (savedMount) mountSavedLabels(savedMount, state, (snap) => normalizeState(snap, migrateCtx));

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
    illustrations, herbAutoMatch, herbCategoryFallback,
    // v1.0.4: PNG export handler, forwarded per the cache-bust contract.
    exportPng,
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
    herbCategoryFallback,
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
  window.addEventListener('orientationchange', () => {
    // Sync the width snapshot so the resize event that accompanies an
    // orientation flip doesn't schedule a second, redundant repaint.
    lastViewportW = window.innerWidth;
    paint(state.get());
  });

  // v0.16: save indicator flashes when the debounced save fires. The CSS class
  // drives the visual; the textContent drives the screen-reader announcement
  // through the aria-live node. Both run here, on actual saves only - not on
  // every state change - so pure UI repaints (preview collapse, etc.) don't
  // spam timers or announcements.
  const saveIndicator = document.querySelector('[data-save-indicator]');
  const saveIndicatorText = saveIndicator?.querySelector('.app-status-text');
  function flashSaveIndicator() {
    if (!saveIndicator) return;
    saveIndicator.classList.add('is-saving');
    if (saveIndicatorText) saveIndicatorText.textContent = 'Saving';
    setTimeout(() => {
      saveIndicator.classList.remove('is-saving');
      if (saveIndicatorText) saveIndicatorText.textContent = 'Saved';
    }, 1100);
  }
  const debouncedSave = debounce((s) => {
    saveState(s);
    flashSaveIndicator();
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
  //   Ctrl/Cmd + P    -> print. Handled natively by the browser (no JS handler
  //                      here); the print-stage is already fresh because
  //                      render() rebuilds it on every state change.
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
  // Light dismiss: a click on the backdrop (the dialog element itself, outside
  // its content box) closes the dialog, matching Esc and the close button.
  helpDialog?.addEventListener('click', (e) => {
    if (e.target === helpDialog) helpDialog.close();
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
      flashSaveIndicator();
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

  // v0.16: window-visibility persist guard. When the user backgrounds the
  // tab on mobile, force a snapshot save so iOS Safari's aggressive page
  // freezing doesn't drop the latest debounced state.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState(state.get());
    }
  });

}

main().catch(err => {
  console.error('Apothecary label creator failed to start:', err);
  // Build the failure screen with textContent, never innerHTML: error text can
  // echo request URLs and other unescaped input.
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:20px; font-family:monospace; color:#C4580A;';
  const headline = document.createElement('p');
  headline.style.cssText = 'margin:0 0 12px; font-weight:700;';
  headline.textContent = 'The label designer failed to start. Reload the page to retry; details below.';
  const detail = document.createElement('pre');
  detail.style.cssText = 'margin:0; white-space:pre-wrap;';
  detail.textContent = err && (err.stack || err.message) || String(err);
  wrap.append(headline, detail);
  document.body.replaceChildren(wrap);
});
