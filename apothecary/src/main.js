// main.js - bootstrap. Wires data → state → editor → preview + print-stage.

import { createState, defaultState, DEFAULT_PLACEMENT } from './state.js';
import { render } from './render.js';
import { mountEditor } from './ui/editor.js';
import { mountShopName } from './ui/shop-name.js';
import { makeLookup } from './util/lookup.js';
import { loadState, saveState, clearState, debounce } from './util/persist.js';

import { SYMBOLS, SYMBOL_LABELS } from '../data/symbols.js';
import { BOTANICALS } from '../data/botanicals.js';
import { ICONS } from '../data/icons.js';
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

  // Load state and backfill any newer-version fields missing from saved shape.
  const persisted = loadState();
  const initial = persisted ?? defaultState();
  const defaults = defaultState();
  if (!initial.templateId) initial.templateId = DEFAULT_TEMPLATE_ID;
  const tmpl = TEMPLATES[initial.templateId];
  if (!initial.sizeId || !tmpl.sizes.find(s => s.id === initial.sizeId)) {
    initial.sizeId = tmpl.defaultSize;
  }
  // v0.3 back fields
  for (const k of ['backEnabled', 'descFull', 'historicUses', 'nutrition', 'pairings']) {
    if (typeof initial[k] === 'undefined') initial[k] = defaults[k];
  }
  // v0.4 placement
  if (!initial.placement) initial.placement = structuredClone(DEFAULT_PLACEMENT);
  for (const k of Object.keys(DEFAULT_PLACEMENT)) {
    if (!initial.placement[k]) initial.placement[k] = { ...DEFAULT_PLACEMENT[k] };
  }
  // v0.4 icon
  if (typeof initial.icon === 'undefined') initial.icon = defaults.icon;

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
    icons: ICONS,
  };
  function paint(s) { render(s, { previ