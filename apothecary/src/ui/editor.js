// editor.js - left panel: form fields, swatches, size picker, back-label
// toggle and content, field placement table, auto-fill, print, reset, herb
// autocomplete dropdown.

import { printLabel } from '../util/print.js';

const SWATCH_COLORS = [
  '#C4922A', '#7B5EA7', '#2D6A4F', '#5C7A5A', '#8B1A1A',
  '#4A3F6B', '#C97BA8', '#C4580A', '#B8860B', '#6B3A2A',
];

// Rows in the placement table. Each: { key (matches state.placement), label }.
// Order = display order in the editor.
const PLACEMENT_ROWS = [
  { key: 'shop',         label: 'Shop Name' },
  { key: 'description',  label: 'Short Description' },
  { key: 'props',        label: 'Properties' },
  { key: 'symbol',       label: 'Celtic Symbol' },
  { key: 'botanical',    label: 'Botanical Icon' },
  { key: 'rune1',        label: 'Rune 1' },
  { key: 'rune2',        label: 'Rune 2' },
  { key: 'rune3',        label: 'Rune 3' },
  { key: 'descFull',     label: 'Full Description' },
  { key: 'historicUses', label: 'Traditional Uses' },
  { key: 'compounds',    label: 'Active Compounds' },
  { key: 'cautions',     label: 'Cautions' },
  { key: 'pairings',     label: 'Pairings' },
];

export function mountEditor(root, ctx) {
  const { state, lookupHerb, runes, symbolLabels, herbDB, aliasMap, templates, parchmentTextures } = ctx;
  const tmpl = templates[state.get().templateId];

  root.innerHTML = `
    <h2 class="editor-title">Label Editor</h2>

    <div class="field">
      <label class="field-label" for="herbName">Herb / Ingredient Name</label>
      <div class="herb-autocomplete" data-herb-autocomplete>
        <input id="herbName" class="field-input" type="text" autocomplete="off" placeholder="e.g. Chamomile, Lavender, Ginger..." aria-autocomplete="list" aria-controls="herb-suggestions" />
        <ul id="herb-suggestions" class="herb-suggestions" data-herb-suggestions hidden role="listbox"></ul>
      </div>
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
        <label class="field-label">Parchment Texture</label>
        <div id="parchmentPicker" class="parchment-picker" data-parchment-picker role="radiogroup" aria-label="Parchment texture"></div>
        <div class="desc-hint">Click a tile. Missing textures fall back to the SVG gradient.</div>
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
          <label class="field-label" for="fHistoric">Traditional Uses (folk + modern applications)</label>
          <textarea id="fHistoric" class="field-input" rows="3" maxlength="${tmpl.historicMaxChars}" placeholder="Druidic dawn-rite tea. Strewn on Beltane fires..."></textarea>
          <div id="historicCounter" class="desc-counter">0 / ${tmpl.historicMaxChars}</div>
        </div>
        <div class="field">
          <label class="field-label" for="fCompounds">Active Compounds &amp; Effects</label>
          <textarea id="fCompounds" class="field-input" rows="2" maxlength="${tmpl.compoundsMaxChars}" placeholder="Apigenin, bisabolol. Mild sedative. Anti-inflammatory."></textarea>
          <div id="compoundsCounter" class="desc-counter">0 / ${tmpl.compoundsMaxChars}</div>
        </div>
        <div class="field">
          <label class="field-label" for="fCautions">Cautions &amp; Interactions</label>
          <textarea id="fCautions" class="field-input" rows="2" maxlength="${tmpl.cautionsMaxChars}" placeholder="Avoid in pregnancy. May interact with anticoagulants."></textarea>
          <div id="cautionsCounter" class="desc-counter">0 / ${tmpl.cautionsMaxChars}</div>
        </div>
        <div class="field">
          <label class="field-label" for="fPairings">Good Pairings</label>
          <input id="fPairings" class="field-input" type="text" maxlength="${tmpl.pairingsMaxChars}" placeholder="Honey, Lavender, Lemon balm, Vanilla" />
          <div id="pairingsCounter" class="desc-counter">0 / ${tmpl.pairingsMaxChars}</div>
        </div>

        <div class="field back-notes-mode-row">
          <label class="checkbox-label">
            <input id="fNotesSplit" type="checkbox" />
            <span>Split Compounds &amp; Cautions on back label</span>
          </label>
          <div class="desc-hint">Off (default): one combined "Notes" section beside Pairings. On: three columns — Compounds, Cautions, Pairings.</div>
        </div>
      </div>

      <div class="gold-divider"></div>

      <div class="placement-panel">
        <div class="placement-title">
          Field Placement
          <span class="placement-title-hint">where each field appears</span>
        </div>
        <div class="placement-table">
          <div class="placement-head">Field</div>
          <div class="placement-head col">Front</div>
          <div class="placement-head col">Back</div>
          ${PLACEMENT_ROWS.map(row => `
            <div class="placement-row-label">${row.label}</div>
            <div class="placement-row-cell"><input type="checkbox" data-placement="${row.key}" data-side="front" /></div>
            <div class="placement-row-cell"><input type="checkbox" data-placement="${row.key}" data-side="back" /></div>
          `).join('')}
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
  const parchPicker = $('parchmentPicker');
  const sizeSel    = $('fSize');
  const swatchBox  = $('swatches');
  const autofillBtn = $('btn-autofill');
  const statusMsg  = $('status-msg');
  const printBtn   = $('btn-print');
  const resetBtn   = $('btn-reset');
  const runeChar = [$('r1Char'), $('r2Char'), $('r3Char')];
  const runeMean = [$('r1Mean'), $('r2Mean'), $('r3Mean')];

  const backToggle    = $('fBackEnabled');
  const notesSplitToggle = $('fNotesSplit');
  const backFieldsBox = $('back-fields');
  const descFullInput = $('fDescFull');
  const historicInput = $('fHistoric');
  const compoundsInput = $('fCompounds');
  const cautionsInput  = $('fCautions');
  const pairingsInput = $('fPairings');
  const descFullCounter  = $('descFullCounter');
  const historicCounter  = $('historicCounter');
  const compoundsCounter = $('compoundsCounter');
  const cautionsCounter  = $('cautionsCounter');
  const pairingsCounter  = $('pairingsCounter');

  const placementCheckboxes = root.querySelectorAll('[data-placement]');

  // --- Herb autocomplete (custom dropdown, v0.8.0) ---
  // Replaces native <datalist> with styled, real-time-filtered dropdown.
  // Keyboard nav (ArrowUp/Down/Enter/Escape) + click-to-select + hover
  // highlight. Filters on every keystroke - no debounce, the index is small
  // enough that O(n) per keystroke is fine.
  const autocompleteRoot = root.querySelector('[data-herb-autocomplete]');
  const suggestList      = root.querySelector('[data-herb-suggestions]');
  const titleCase = (s) => s.replace(/(^|\s)\w/g, c => c.toUpperCase());
  const escAttr   = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Build searchable index from herbDB + aliases. Each entry: display label
  // (title-cased), canonical herb key for lookup, Latin name for secondary
  // display and matching, alias flag for the visual tag.
  const searchIndex = [];
  for (const k of Object.keys(herbDB)) {
    searchIndex.push({ display: titleCase(k), canonical: k, latin: herbDB[k].latin ?? '', alias: false });
  }
  if (aliasMap) {
    for (const k of Object.keys(aliasMap)) {
      const canon = aliasMap[k];
      if (herbDB[canon]) {
        searchIndex.push({ display: titleCase(k), canonical: canon, latin: herbDB[canon].latin ?? '', alias: true });
      }
    }
  }
  searchIndex.sort((a, b) => a.display.localeCompare(b.display));

  let suggestionIdx = -1;
  let activeSuggestions = [];

  function filterSuggestions(q) {
    if (!q || !q.trim()) return searchIndex.slice(0, 12);
    const ql = q.toLowerCase().trim();
    const scored = [];
    for (const item of searchIndex) {
      const d = item.display.toLowerCase();
      const l = item.latin.toLowerCase();
      let score = 0;
      if (d === ql)              score = 100;
      else if (d.startsWith(ql)) score = 60;
      else if (l.startsWith(ql)) score = 50;
      else if (d.includes(ql))   score = 30;
      else if (l.includes(ql))   score = 20;
      if (score === 0) continue;
      if (item.alias) score -= 1; // canonical beats alias on tie
      scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score || a.item.display.localeCompare(b.item.display));
    return scored.slice(0, 12).map(x => x.item);
  }

  function renderSuggestions(items) {
    activeSuggestions = items;
    suggestionIdx = -1;
    if (items.length === 0) { suggestList.hidden = true; return; }
    suggestList.innerHTML = items.map((it, i) => {
      const latin = it.latin ? `<span class="herb-suggest__latin">${escAttr(it.latin)}</span>` : '';
      const aliasTag = it.alias ? '<span class="herb-suggest__alias">alias</span>' : '';
      return `<li class="herb-suggest" role="option" data-idx="${i}" data-canonical="${escAttr(it.canonical)}">
        <span class="herb-suggest__name">${escAttr(it.display)}</span>${latin}${aliasTag}
      </li>`;
    }).join('');
    suggestList.hidden = false;
  }

  function highlightSuggestion(idx) {
    suggestionIdx = idx;
    suggestList.querySelectorAll('.herb-suggest').forEach((el, i) => {
      el.classList.toggle('is-active', i === idx);
      if (i === idx) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function selectSuggestion(idx) {
    const item = activeSuggestions[idx];
    if (!item) return;
    herbInput.value = item.display;
    state.set({ herbName: item.display });
    const h = lookupHerb(item.canonical);
    if (h) state.set({ botanical: h.botanical, icon: h.icon ?? null });
    suggestList.hidden = true;
    herbInput.focus();
  }

  // --- Selects ---
  // v0.8.2: SYMBOLS export retired (zero-SVG lock). Symbol ids now come from
  // symbolLabels keys; the picker is a text-only dropdown.
  for (const id of Object.keys(symbolLabels)) {
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
  // Parchment texture picker (v0.8.1: visual thumbnail grid).
  // Each tile is a button with the texture as background-image. The gradient
  // option shows a CSS gradient preview. Click to select.
  for (const t of (parchmentTextures ?? [])) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'parchment-tile';
    btn.dataset.parchmentId = t.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', t.label);
    btn.setAttribute('title', t.label);
    if (t.file) {
      btn.style.backgroundImage = `url('data/textures/${t.file}')`;
    } else {
      btn.classList.add('parchment-tile--gradient');
    }
    parchPicker.appendChild(btn);
  }
  parchPicker.addEventListener('click', (e) => {
    const tile = e.target.closest('.parchment-tile');
    if (!tile) return;
    state.set({ parchmentTexture: tile.dataset.parchmentId });
  });
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
    const currentParch = s.parchmentTexture ?? 'gradient';
    parchPicker.querySelectorAll('.parchment-tile').forEach(tile => {
      tile.classList.toggle('is-selected', tile.dataset.parchmentId === currentParch);
      tile.setAttribute('aria-checked', tile.dataset.parchmentId === currentParch ? 'true' : 'false');
    });
    sizeSel.value    = s.sizeId;
    colorPicker.value = s.accent;
    for (let i = 0; i < 3; i++) {
      runeChar[i].value = s.runes[i].c;
      runeMean[i].value = s.runes[i].m;
    }
    backToggle.checked = !!s.backEnabled;
    notesSplitToggle.checked = !!s.notesSplit;
    backFieldsBox.hidden = !s.backEnabled;
    descFullInput.value  = s.descFull ?? '';
    historicInput.value  = s.historicUses ?? '';
    compoundsInput.value = s.compounds ?? '';
    cautionsInput.value  = s.cautions  ?? '';
    pairingsInput.value  = s.pairings ?? '';
    // Placement checkboxes
    placementCheckboxes.forEach(cb => {
      const key = cb.dataset.placement;
      const side = cb.dataset.side;
      cb.checked = !!(s.placement?.[key]?.[side]);
    });
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
    counterUpdate(compoundsInput, compoundsCounter, tmpl.compoundsMaxChars);
    counterUpdate(cautionsInput,  cautionsCounter,  tmpl.cautionsMaxChars);
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
    if (h) state.set({ botanical: h.botanical, icon: h.icon ?? null });
    renderSuggestions(filterSuggestions(herbInput.value));
  });
  herbInput.addEventListener('focus', () => {
    renderSuggestions(filterSuggestions(herbInput.value));
  });
  herbInput.addEventListener('keydown', (e) => {
    if (suggestList.hidden) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        renderSuggestions(filterSuggestions(herbInput.value));
        if (activeSuggestions.length) highlightSuggestion(0);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightSuggestion(Math.min(activeSuggestions.length - 1, suggestionIdx + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightSuggestion(Math.max(0, suggestionIdx - 1));
    } else if (e.key === 'Enter' && suggestionIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestionIdx);
    } else if (e.key === 'Escape') {
      suggestList.hidden = true;
    }
  });
  suggestList.addEventListener('mousedown', (e) => {
    const li = e.target.closest('.herb-suggest');
    if (!li) return;
    e.preventDefault();
    selectSuggestion(parseInt(li.dataset.idx, 10));
  });
  suggestList.addEventListener('mouseover', (e) => {
    const li = e.target.closest('.herb-suggest');
    if (!li) return;
    highlightSuggestion(parseInt(li.dataset.idx, 10));
  });
  document.addEventListener('mousedown', (e) => {
    if (!autocompleteRoot.contains(e.target)) suggestList.hidden = true;
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
  notesSplitToggle.addEventListener('change', () => {
    state.set({ notesSplit: notesSplitToggle.checked });
  });
  descFullInput.addEventListener('input', () => {
    state.set({ descFull: descFullInput.value });
    counterUpdate(descFullInput, descFullCounter, tmpl.descFullMaxChars);
  });
  historicInput.addEventListener('input', () => {
    state.set({ historicUses: historicInput.value });
    counterUpdate(historicInput, historicCounter, tmpl.historicMaxChars);
  });
  compoundsInput.addEventListener('input', () => {
    state.set({ compounds: compoundsInput.value });
    counterUpdate(compoundsInput, compoundsCounter, tmpl.compoundsMaxChars);
  });
  cautionsInput.addEventListener('input', () => {
    state.set({ cautions: cautionsInput.value });
    counterUpdate(cautionsInput, cautionsCounter, tmpl.cautionsMaxChars);
  });
  pairingsInput.addEventListener('input', () => {
    state.set({ pairings: pairingsInput.value });
    counterUpdate(pairingsInput, pairingsCounter, tmpl.pairingsMaxChars);
  });

  // Placement checkboxes — update state.placement[key][side]
  placementCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const key  = cb.dataset.placement;
      const side = cb.dataset.side;
      const cur  = state.get().placement ?? {};
      const next = { ...cur, [key]: { ...(cur[key] ?? {}), [side]: cb.checked } };
      state.set({ placement: next });
    });
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
      icon: found.icon ?? null,
      runes: found.runes.map(r => ({ c: r.c, m: r.m })),
      descFull:     (found.descFull     ?? found.desc).slice(0, tmpl.descFullMaxChars),
      historicUses: (found.historicUses ?? '').slice(0, tmpl.historicMaxChars),
      compounds:    (found.compounds    ?? '').slice(0, tmpl.compoundsMaxChars),
      cautions:     (found.cautions     ?? '').slice(0, tmpl.cautionsMaxChars),
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
