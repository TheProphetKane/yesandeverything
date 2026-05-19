// main.js - bootstrap. Wires data -> state -> editor + saved-labels -> preview.

import { createState, defaultState, DEFAULT_PLACEMENT } from './state.js';
import { render } from './render.js';
import { mountEditor } from './ui/editor.js';
import { mountShopName } from './ui/shop-name.js';
import { mountSavedLabels } from './ui/saved-labels-ui.js';
import { makeLookup } from './util/lookup.js';
import { loadState, saveState, clearState, debounce } from './util/persist.js';

import { SYMBOL_LABELS } from '../data/symbols.js';
import { THEMES } from '../data/themes.js';
import { PARCHMENT_TEXTURES } from '../data/textures.js';
import { categoryDefaultSlug } from '../data/category-defaults.js';
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from '../data/label-templates.js';

async function loadJson(path) {
  const res = await fetch(path);
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
  // Migrate v0.5 saved state: old `nutrition` field → new `compounds`.
  if (typeof initial.nutrition === 'string' && !initial.compounds) {
    initial.compounds = initial.nutrition;
  }
  if (!initial.placement) initial.placement = JSON.parse(JSON.stringify(DEFAULT_PLACEMENT));
  // Migrate v0.5 placement: old `nutrition` slot → `compounds` + `cautions`.
  if (initial.placement.nutrition && !initial.placement.compounds) {
    initial.placement.compounds = { ...initial.placement.nutrition };
    initial.placement.cautions  = { ...initial.placement.nutrition };
    delete initial.placement.nutrition;
  }
  for (const k of Object.keys(DEFAULT_PLACEMENT)) {
    if (!initial.placement[k]) initial.placement[k] = { ...DEFAULT_PLACEMENT[k] };
  }
  if (typeof initial.icon === 'undefined') initial.icon = defaults.icon;

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

  // v0.8.0: ripple-position tracker. Sets --ripple-x/y CSS vars on each
  // button click so the .btn-*::after radial-gradient ripple emanates from
  // the actual click point. Pure CSS handles the animation; this just
  // captures the coordinate.
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
