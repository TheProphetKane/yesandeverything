// editor.js — left panel: form fields, swatches, size picker, back-label
// toggle and content, auto-fill, print, reset, herb autocomplete dropdown.

import { printLabel } from '../util/print.js';

const SWATCH_COLORS = [
  '#C4922A', '#7B5EA7', '#2D6A4F', '#5C7A5A', '#8B1A1A',
  '#4A3F6B', '#C97BA8', '#C4580A', '#B8860B', '#6B3A2A',
];

export function mountEditor(root, ctx) {
  const { state, lookupHerb, runes, symbols, symbolLabels, herbDB, aliasMap, templates } = ctx;
  const tmpl = templates[state.get().templateId];

  root.innerHTML = `
    <h2 class="editor-title">Label Editor</h2>

    <div class="field">
      <label class="field-label" for="herbName">Herb / Ingredient Name</label>
      <input id="herbName" class="field-input" type="text" list="herb-suggestions" autocomplete="off" placeholder="e.g. Chamomile, Lavender, Ginger..." />
      <datalist id="herb-suggestions"></datalist>
    </div>
    <button id="btn-autofill" class="btn-primary">Auto-Fill Label</button>
    <div id="status-msg" class="status-msg">&nbsp;</div>

    <div class="gold-divider"></div>

    <div class="section">
      <div class="field">
        <label class="field-label" for="fLatin">Latin Name</label>
        <input id="fLatin" class="field-input italic-input" type="text" placeholder="Botanical Latin name" />
      </div>

      <div class="field">
        <label class="field-label" for="fProps">Properties</label>
        <input id="fProps" class="field-input" type="text" placeholder="Healing, Sleep, Peace..." />
      </div>

      <div class="field">
        <label class="field-label" for="fDesc">Front Description</label>
        <textarea id="fDesc" class="field-input" rows="6" maxlength="${tmpl.descMaxChars}" placeholder="A brief poetic description..."></textarea>
        <div id="descCounter" class="desc-counter">0 / ${tmpl.descMaxChars}</div>
        <div class="desc-hint">Label fits ${tmpl.descLineHint}. Keep it concise.</div>
      </div>

      <div class="field">
        <label class="field-label">Accent Color</label>
        <div id="swatches" class="swatches"></div>
      </div>

      <div class="field">
        <label class="field-label" for="fSymbol">Celtic Symbol</label>
        <select id="fSymbol" class="field-input"></select>
      </div>

      <div class="field">
        <label class="field-label">Rune 1</label>
        <div class="field-row">
          <select id="r1Char" class="field-input"></select>
          <input id="r1Mean" class="field-input" type="text" placeholder="Meaning" />
        </div>
      </div>
      <div class="field">
        <label class="field-label">Rune 2</label>
        <div class="field-row">
          <select id="r2Char" class="field-input"></select>
          <input id="r2Mean" class="field-input" type="text" placeholder="Meaning" />
        </div>
      </div>
      <div class="field">
        <label class="field-label">Rune 3</label>
        <div class="field-row">
          <select id="r3Char" class="field-input"></select>
          <input id="r3Mean" class="field-input" type="text" placeholder="Meaning" />
        </div>
      </div>

      <div class="gold-divider"></div>

      <div class="field">
        <label class="field-label" for="fSize">Label Size</label>
        <select id="fSize" class="field-input"></select>
        <div class="desc-hint">All sizes share the same proportions. Print scales the layout uniformly.</div>
      </div>

      <div class="gold-divider"></div>

      <div class="field back-toggle-row">
        <label class="checkbox-label">
          <input id="fBackEnabled" type="checkbox" />
          <span>Print Back Label</span>
        </label>
        <div class="desc-hint">Optional second label with full description, historic uses, notes, and pairings. Prints alongside the front on a single 8.5x11 sheet.</div>
      </div>

      <div id="back-fields" class="back-fields" hidden>
        <div class="field">
          <label class="field-label" for="fDescFull">Full Description</label>
          <textarea id="fDescFull" class="field-input" rows="4" maxlength="${tmpl.descFullMaxChars}" placeholder="The original poetic description, full length..."></textarea>
          <div id="descFullCounter" class="desc-counter">0 / ${tmpl.descFullMaxChars}</div>
        </div>
        <div class="field">
          <label class="field-label" for="fHistoric">Historic Uses</label>
          <textarea id="fHistoric" class="field-input" rows="3" maxlength="${tmpl.historicMaxChars}" placeholder="Druidic dawn-rite tea. Strewn on Beltane fires..."></textarea>
          <div id="historicCounter" class="desc-counter">0 / ${tmpl.historicMaxChars}</div>
        </div>
        <div class="field">
          <label class="field-label" for="fNutrition">Notes (active compounds, effects)</label>
          <textarea id="fNutrition" class="field-input" rows="2" maxlength="${tmpl.nutritionMaxChars}" placeholder="Apigenin, bisabolol. Mild sedative. Caffeine-free."></textarea>
          <div id="nutritionCounter" class="desc-counter">0 / ${tmpl.nutritionMaxChars}</div>
        </div>
        <div class="field">
          <label class="field-label" for="fPairings">Good Pairings</label>
          <input id="fPairings" class="field-input" type="text" maxlength="${tmpl.pairingsMaxChars}" placeholder="Honey, Lavender, Lemon balm, Vanilla" />
          <div id="pairingsCounter" class="desc-counter">0 / ${tmpl.pairingsMaxChars}</div>
        </div>
      </div>

      <button id="btn-print" class="btn-secondary">Print Label</button>
      <button id="btn-reset" class="btn-ghost" type="button">Reset to Defaults</button>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const herbInput  = $('herbName');
  const latinInput = $('fLatin');
  const propsInput = $('fProps');
  const descInput  = $('fDesc');
  const descCounter = $('descCounter');
  const symbolSel  = $('fSymbol');
  const sizeSel    = $('fSize');
  const swatchBox  = $('swatches');
  const autofillBtn = $('btn-autofill');
  const statusMsg  = $('status-msg');
  const printBtn   = $('btn-print');
  const resetBtn   = $('btn-reset');
  const runeChar = [$('r1Char'), $('r2Char'), $('r3Char')];
  const runeMean = [$('r1Mean'), $('r2Mean'), $('r3Mean')];

  const backToggle    = $('fBackEnabled');
  const backFieldsBox = $('back-fields');
  const descFullInput = $('fDescFull');
  const historicInput = $('fHistoric');
  const nutritionInput = $('fNutrition');
  const pairingsInput = $('fPairings');
  const descFullCounter  = $('descFullCounter');
  const historicCounter  = $('historicCounter');
  const nutritionCounter = $('nutritionCounter');
  const pairingsCounter  = $('pairingsCounter');

  // --- Herb autocomplete datalist ---
  const herbList = root.querySelector('#herb-suggestions');
  const titleCase = (s) => s.replace(/(^|\s)\w/g, c => c.toUpperCase());
  const seen = new Set();
  function addSuggestion(label) {
    const t = titleCase(label);
    if (seen.has(t)) return;
    seen.add(t);
    const opt = document.createElement('option');
    opt.value = t;
    herbList.appendChild(opt);
  }
  for (const k of Object.keys(herbDB).sort()) addSuggestion(k);
  if (aliasMap) for (const k of Object.keys(aliasMap).sort()) addSuggestion(k);

  // --- Selects ---
  for (const id of Object.keys(symbols)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = symbolLabels[id] ?? id;
    symbolSel.appendChild(opt);
  }
  for (const sz of tmpl.sizes) {
    const opt = document.createElement('option');
    opt.value = sz.id;
    opt.textContent = sz.label;
    sizeSel.appendChild(opt);
  }
  for (const sel of runeChar) {
    for (const r of runes) {
      const opt = document.createElement('option');
      opt.value = r.c;
      opt.textContent = `${r.c} ${r.n}`;
      sel.appendChild(opt);
    }
  }

  // --- Swatches ---
  for (const color of SWATCH_COLORS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.background = color;
    btn.dataset.color = color;
    btn.setAttribute('aria-label', `Accent color ${color}`);
    swatchBox.appendChild(btn);
  }
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.className = 'color-picker';
  colorPicker.id = 'customColor';
  colorPicker.setAttribute('aria-label', 'Custom accent color');
  swatchBox.appendChild(colorPicker);

  function syncFromState() {
    const s = state.get();
    herbInput.value  = s.herbName;
    latinInput.value = s.latin;
    propsInput.value = s.props;
    descInput.value  = s.description;
    symbolSel.value  = s.symbol;
    sizeSel.value    = s.sizeId;
    colorPicker.value = s.accent;
    for (let i = 0; i < 3; i++) {
      runeChar[i].value = s.runes[i].c;
      runeMean[i].value = s.runes[i].m;
    }
    backToggle.checked = !!s.backEnabled;
    backFieldsBox.hidden = !s.backEnabled;
    descFullInput.value  = s.descFull ?? '';
    historicInput.value  = s.historicUses ?? '';
    nutritionInput.value = s.nutrition ?? '';
    pairingsInput.value  = s.pairings ?? '';
    updateAllCounters();
    updateSwatchSelection();
  }

  function counterUpdate(input, counter, max) {
    const len = input.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.classList.toggle('warn', len > max * 0.75);
  }
  function updateAllCounters() {
    counterUpdate(descInput, descCounter, tmpl.descMaxChars);
    counterUpdate(descFullInput, descFullCounter, tmpl.descFullMaxChars);
    counterUpdate(historicInput, historicCounter, tmpl.historicMaxChars);
    counterUpdate(nutritionInput, nutritionCounter, tmpl.nutritionMaxChars);
    counterUpdate(pairingsInput, pairingsCounter, tmpl.pairingsMaxChars);
  }
  function updateSwatchSelection() {
    const cur = state.get().accent;
    swatchBox.querySelectorAll('.swatch').forEach(sw => {
      sw.classList.toggle('selected', sw.dataset.color === cur);
    });
  }

  herbInput.addEventListener('input', () => {
    state.set({ herbName: herbInput.value });
    const h = lookupHerb(herbInput.value);
    if (h) state.set({ botanical: h.botanical });
  });
  latinInput.addEventListener('input', () => state.set({ latin: latinInput.value }));
  propsInput.addEventListener('input', () => state.set({ props: propsInput.value }));
  descInput.addEventListener('input', () => {
    state.set({ description: descInput.value });
    counterUpdate(descInput, descCounter, tmpl.descMaxChars);
  });
  symbolSel.addEventListener('change', () => state.set({ symbol: symbolSel.value }));
  sizeSel.addEventListener('change', () => state.set({ sizeId: sizeSel.value }));

  runeChar.forEach((sel, i) => {
    sel.addEventListener('change', () => {
      const next = state.get().runes.slice();
      next[i] = { ...next[i], c: sel.value };
      state.set({ runes: next });
    });
  });
  runeMean.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      const next = state.get().runes.slice();
      next[i] = { ...next[i], m: inp.value };
      state.set({ runes: next });
    });
  });

  swatchBox.addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    state.set({ accent: sw.dataset.color });
    colorPicker.value = sw.dataset.color;
    updateSwatchSelection();
  });
  colorPicker.addEventListener('input', () => {
    state.set({ accent: colorPicker.value });
    updateSwatchSelection();
  });

  backToggle.addEventListener('change', () => {
    state.set({ backEnabled: backToggle.checked });
    backFieldsBox.hidden = !backToggle.checked;
  });
  descFullInput.addEventListener('input', () => {
    state.set({ descFull: descFullInput.value });
    counterUpdate(descFullInput, descFullCounter, tmpl.descFullMaxChars);
  });
  historicInput.addEventListener('input', () => {
    state.set({ historicUses: historicInput.value });
    counterUpdate(historicInput, historicCounter, tmpl.historicMaxChars);
  });
  nutritionInput.addEventListener('input', () => {
    state.set({ nutrition: nutritionInput.value });
    counterUpdate(nutritionInput, nutritionCounter, tmpl.nutritionMaxChars);
  });
  pairingsInput.addEventListener('input', () => {
    state.set({ pairings: pairingsInput.value });
    counterUpdate(pairingsInput, pairingsCounter, tmpl.pairingsMaxChars);
  });

  autofillBtn.addEventListener('click', () => {
    const found = lookupHerb(herbInput.value);
    if (!found) {
      statusMsg.textContent = 'Not in database. Fill manually.';
      statusMsg.className = 'status-msg warn';
      return;
    }
    state.set({
      latin: found.latin,
      props: found.props,
      description: found.desc.slice(0, tmpl.descMaxChars),
      accent: found.accent,
      symbol: found.symbol,
      botanical: found.botanical,
      runes: found.runes.map(r => ({ c: r.c, m: r.m })),
      descFull:     (found.descFull     ?? found.desc).slice(0, tmpl.descFullMaxChars),
      historicUses: (found.historicUses ?? '').slice(0, tmpl.historicMaxChars),
      nutrition:    (found.nutrition    ?? '').slice(0, tmpl.nutritionMaxChars),
      pairings:     (found.pairings     ?? '').slice(0, tmpl.pairingsMaxChars),
    });
    syncFromState();
    statusMsg.textContent = 'Found. Customize freely.';
    statusMsg.className = 'status-msg ok';
  });

  printBtn.addEventListener('click', printLabel);

  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all fields to defaults? Saved label will be cleared.')) return;
    ctx.onReset();
  });

  syncFromState();
  state.subscribe(syncFromState);
}
