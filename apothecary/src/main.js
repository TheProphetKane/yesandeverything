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
  catDefMod,
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
  import("../data/category-defaults.js" + V),
  import("../data/label-templates.js" + V),
]);

const { createState, defaultState, DEFAULT_PLACEMENT } = stateMod;
const { render } = renderMod;
const { mountEditor } = editorMod;
const { mountShopName } = shopMod;
const { mountSavedLabels } = savedMod;
const { makeLookup } = lookupMod;
const { loadState, saveState, clearState, debounce } = persistMod;
const { SYMBOL_LABELS } = symbolsMod;
const { THEMES } = themesMod;
const { PARCHMENT_TEXTURES } = texturesMod;
const { categoryDefaultSlug } = catDefMod;
const { TEMPLATES, DEFAULT_TEMPLATE_ID } = templatesMod;

async function loadJson(path) {
  const res = await fetch(path + V);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function main() {
  const [herbDB, runes, aliasMap, runeMeanings] = await Promise.all([
    loadJson('data/herbs.json'),
    loadJson('data/runes.json'),
    loadJson('data/aliases.json'),
    loadJson('data/rune-meanings.json'),
  ]);

  const lookupHerb = makeLookup(herbDB, aliasMap);

  const persisted = loadState();
  const initial = persisted ?? defaultState();
  const defaults = defaultState();
  if (!initial.templateId) initial.templateId = DEFAULT_TEMPLATE_ID;
  const tmpl = TEMPLATES[initial.templateId];
  if (!initial.sizeId || !tmpl.sizes.find(s => s.id === initial.sizeId)) {
    initial.sizeId = tmpl.defaultSize;
  }
  for (const k of ['backEnabled', 'descFull', 'historicUses', 'compounds', 'cautions', 'pairings', 'notesSplit']) {
    if (typeof initial[k] === 'undefined') initial[k] = defaults[k];
  }
  if (typeof initial.nutrition === 'string' && !initial.compounds) {
    initial.compounds = initial.nutrition;
  }
  if (!initial.placement) initial.placement = JSON.parse(JSON.stringify(DEFAULT_PLACEMENT));
  if (initial.placement.nutrition && !initial.placement.compounds) {
    initial.placement.compounds = { ...initial.placement.nutrition };
    initial.placement.cautions  = { ...initial.placement.nutrition };
    delete initial.placement.nutrition;
  }
  for (const k of Object.keys(DEFAULT_PLACEMENT)) {
    if (!initial.placement[k]) initial.placement[k] = { ...DEFAULT_PLACEMENT[k] };
  }
  if (typeof initial.icon === 'undefined') initial.icon = defaults.icon;

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
    categoryDefaultSlug,
  };
  function paint(s) { render(s, { preview: previewMount, printStage: printStageMount }, ctx); }
  state.subscribe(paint);
  paint(state.get());

  const debouncedSave = debounce((s) => saveState(s), 200);
  state.subscribe(debouncedSave);

  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn-primary, .btn-secondary, .btn-ghost');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--ripple-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty('--ripple-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  });
}

main().catch(err => {
  console.error('Apothecary label creator failed to start:', err);
  document.body.innerHTML = '<pre style="color:#C4580A; padding:20px; font-family:monospace;">' + (err.stack || err.message) + '</pre>';
});
