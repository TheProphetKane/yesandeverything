// editor.js — left panel: form fields, swatches, auto-fill, print.
//
// All writes go through state.set / state.patchNested.
// Reads pull from state.get() on demand.

import { printLabel } from '../util/print.js';

const SWATCH_COLORS = [
  '#C4922A', '#7B5EA7', '#2D6A4F', '#5C7A5A', '#8B1A1A',
  '#4A3F6B', '#C97BA8', '#C4580A', '#B8860B', '#6B3A2A',
];

export function mountEditor(root, ctx) {
  const { state, lookupHerb, runes, symbols, symbolLabels, herbDB, templates } = ctx;
  const tmpl = templates[state.get().templateId];

  // --- Render the editor markup ---
  root.innerHTML = `
    <h2 class="editor-title">✦ Label Editor ✦</h2>

    <div class="field">
      <label class="field-label" for="herbName">Herb / Ingredient Name</label>
      <input id="herbName" class="field-input" type="text" placeholder="e.g. Chamomile, Lavender, Ginger…" />
    </div>
    <button id="btn-autofill" class="btn-primary">✨ Auto-Fill Label</button>
    <div id="status-msg" class="status-msg">&nbsp;</div>

    <div class="gold-divider"></div>

    <div class="section">
      <div class="field">
        <label class="field-label" for="fLatin">Latin Name</label>
        <input id="fLatin" class="field-input italic-input" type="text" placeholder="Botanical Latin name" />
      </div>

      <div class="field">
        <label class="field-label" for="fProps">Properties</label>
        <input id="fProps" class="field-input" type="text" placeholder="Healing · Sleep · Peace…" />
      </div>

      <div class="field">
        <label class="field-label" for="fDesc">Description</label>
        <textarea id="fDesc" class="field-input" rows="6" maxlength="${tmpl.descMaxChars}" placeholder="A brief poetic description…"></textarea>
        <div id="descCounter" class="desc-counter">0 / ${tmpl.descMaxChars}</div>
        <div class="desc-hint">⚠ Label fits ${tmpl.descLineHint} — keep it concise.</div>
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

      <button id="btn-print" class="btn-secondary">🖨 Print Label</button>
      <button id="btn-reset" class="btn-ghost" type="button">Reset to Defaults</button>
    </div>
  `;

  // --- Cache field refs ---
  const $ = (id) => root.querySelector('#' + id);
  const herbInput  = $('herbName');
  const latinInput = $('fLatin');
  const propsInput = $('fProps');
  const descInput  = $('fDesc');
  const descCounter = $('descCounter');
  const symbolSel  = $('fSymbol');
  const swatchBox  = $('swatches');
  const autofillBtn = $('btn-autofill');
  const statusMsg  = $('status-msg');
  const printBtn   = $('btn-print');
  const resetBtn   = $('btn-reset');
  const runeChar = [$('r1Char'), $('r2Char'), $('r3Char')];
  const runeMean = [$('r1Mean'), $('r2Mean'), $('r3Mean')];

  // --- Populate symbol select ---
  for (const id of Object.keys(symbols)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = symbolLabels[id] ?? id;
    symbolSel.appendChild(opt);
  }

  // --- Populate rune selects ---
  for (const sel of runeChar) {
    for (const r of runes) {
      const opt = document.createElement('option');
      opt.value = r.c;
      opt.textContent = `${r.c} ${r.n}`;
      sel.appendChild(opt);
    }
  }

  // --- Populate swatches ---
  for (const color of SWATCH_COLORS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.background = color;
    btn.dataset.color = color;
    btn.setAttribute('aria-label', `Accent color ${color}`);
    swatchBox.appendChild(btn);
  }
  // Custom color picker
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.className = 'color-picker';
  colorPicker.id = 'customColor';
  colorPicker.setAttribute('aria-label', 'Custom accent color');
  swatchBox.appendChild(colorPicker);

  // --- Helpers ---
  function syncFromState() {
    const s = state.get();
    herbInput.value  = s.herbName;
    latinInput.value = s.latin;
    propsInput.value = s.props;
    descInput.value  = s.description;
    symbolSel.value  = s.symbol;
    colorPicker.value = s.accent;
    for (let i = 0; i < 3; i++) {
      runeChar[i].value = s.runes[i].c;
      runeMean[i].value = s.runes[i].m;
    }
    updateCounter();
    updateSwatchSelection();
  }

  function updateCounter() {
    const len = descInput.value.length;
    const max = tmpl.descMaxChars;
    descCounter.textContent = `${len} / ${max}`;
    descCounter.classList.toggle('warn', len > max * 0.75);
  }

  function updateSwatchSelection() {
    const cur = state.get().accent;
    swatchBox.querySelectorAll('.swatch').forEach(sw => {
      sw.classList.toggle('selected', sw.dataset.color === cur);
    });
  }

  // --- Event wiring ---
  herbInput.addEventListener('input', () => {
    state.set({ herbName: herbInput.value });
    // Update botanical type if name matches a known herb.
    const h = lookupHerb(herbInput.value);
    if (h) state.set({ botanical: h.botanical });
  });
  latinInput.addEventListener('input', () => state.set({ latin: latinInput.value }));
  propsInput.addEventListener('input', () => state.set({ props: propsInput.value }));
  descInput.addEventListener('input', () => {
    state.set({ description: descInput.value });
    updateCounter();
  });
  symbolSel.addEventListener('change', () => state.set({ symbol: symbolSel.value }));

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

  autofillBtn.addEventListener('click', () => {
    const found = lookupHerb(herbInput.value);
    if (!found) {
      statusMsg.textContent = '⚠️ Not in database — fill manually.';
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
    });
    syncFromState();
    statusMsg.textContent = '✓ Found. Customize freely.';
    statusMsg.className = 'status-msg ok';
  });

  printBtn.addEventListener('click', printLabel);

  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all fields to defaults? Saved label will be cleared.')) return;
    ctx.onReset();
  });

  // Initial sync from state.
  syncFromState();

  // Subscribe so external state changes (autofill, restore) repaint the form.
  state.subscribe(syncFromState);
}
