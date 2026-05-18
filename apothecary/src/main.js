// main.js — bootstrap. Wires data → state → editor → preview + print-stage.

import { createState, defaultState } from './state.js';
import { render } from './render.js';
import { mountEditor } from './ui/editor.js';
import { mountShopName } from './ui/shop-name.js';
import { makeLookup } from './util/lookup.js';
import { loadState, saveState, clearState, debounce } from './util/persist.js';

import { SYMBOLS, SYMBOL_LABELS } from '../data/symbols.js';
import { BOTANICALS } from '../data/botanicals.js';
import { THEMES } from '../data/themes.js';
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from '../data/label-templates.js';

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function main() {
  const [herbDB, runes, aliasMap] = await Promise.all([
    loadJson('data/herbs.json'),
    loadJson('data/runes.json'),
    loadJson('data/aliases.json'),
  ]);

  const lookupHerb = makeLookup(herbDB, aliasMap);

  // Load state and backfill any v0.2 or v0.1 fields missing from the saved shape.
  const persisted = loadState();
  const initial = persisted ?? defaultState();
  const defaults = defaultState();
  if (!initial.templateId) initial.templateId = DEFAULT_TEMPLATE_ID;
  const tmpl = TEMPLATES[initial.templateId];
  if (!initial.sizeId || !tmpl.sizes.find(s => s.id === initial.sizeId)) {
    initial.sizeId = tmpl.defaultSize;
  }
  for (const k of ['backEnabled', 'descFull', 'historicUses', 'nutrition', 'pairings']) {
    if (typeof initial[k] === 'undefined') initial[k] = defaults[k];
  }
  const state = createState(initial);

  mountShopName(document.querySelector('[data-shop-name]'), state);

  mountEditor(document.querySelector('[data-editor]'), {
    state, lookupHerb, runes, herbDB, aliasMap,
    symbols: SYMBOLS, symbolLabels: SYMBOL_LABELS,
    templates: TEMPLATES,
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
    symbols: SYMBOLS,
    botanicals: BOTANICALS,
  };
  function paint(s) { render(s, { preview: previewMount, printStage: printStageMount }, ctx); }
  state.subscribe(paint);
  paint(state.get());

  const debouncedSave = debounce((s) => saveState(s), 200);
  state.subscribe(debouncedSave);
}

main().catch(err => {
  console.error('Apothecary label creator failed to start:', err);
  document.body.innerHTML = `<pre style="color:#C4580A; padding:20px; font-family:monospace;">${err.stack || err.message}</pre>`;
});
