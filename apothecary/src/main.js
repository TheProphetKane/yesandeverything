// main.js — bootstrap. Wires data → state → editor → preview.

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
  // Load data that's served as JSON (kept out of the JS bundle for editing).
  const [herbDB, runes, aliasMap] = await Promise.all([
    loadJson('data/herbs.json'),
    loadJson('data/runes.json'),
    loadJson('data/aliases.json'),
  ]);

  const lookupHerb = makeLookup(herbDB, aliasMap);

  // State: load from localStorage if present, else defaults.
  const persisted = loadState();
  const initial = persisted ?? defaultState();
  // Backwards-compatible defaulting in case schema grows.
  if (!initial.templateId) initial.templateId = DEFAULT_TEMPLATE_ID;
  const state = createState(initial);

  // Mount shop-name header.
  mountShopName(document.querySelector('[data-shop-name]'), state);

  // Mount editor panel.
  mountEditor(document.querySelector('[data-editor]'), {
    state,
    lookupHerb,
    runes,
    herbDB,
    symbols: SYMBOLS,
    symbolLabels: SYMBOL_LABELS,
    templates: TEMPLATES,
    onReset: () => {
      clearState();
      state.set(defaultState());
    },
  });

  // Mount preview: render on every state change.
  const previewMount = document.querySelector('[data-preview]');
  const ctx = {
    templates: TEMPLATES,
    themes: THEMES,
    symbols: SYMBOLS,
    botanicals: BOTANICALS,
  };
  function paint(s) { render(s, previewMount, ctx); }
  state.subscribe(paint);
  paint(state.get());

  // Persist on every change, debounced.
  const debouncedSave = debounce((s) => saveState(s), 200);
  state.subscribe(debouncedSave);
}

main().catch(err => {
  console.error('Apothecary label creator failed to start:', err);
  document.body.innerHTML = `<pre style="color:#C4580A; padding:20px; font-family:monospace;">${err.stack || err.message}</pre>`;
});
