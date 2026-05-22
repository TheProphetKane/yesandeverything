// editor.js - left panel: form fields, swatches, size picker, back-label
// toggle and content, layout designer, auto-fill, print, reset, herb
// autocomplete dropdown.
//
// v0.9: the placement-checkbox grid is gone. In its place: the Layout Designer
// (mountLayoutDesigner) - two columns (Front | Back) of zone cards, each with
// a layout-mode dropdown, a width control (front only), and draggable item
// chips. A "Hidden Items" rail at the bottom holds anything not currently
// placed. Drag-and-drop moves items between zones and between sides.

import { printLabel } from '../util/print.js';
import { ITEM_LABELS, ALL_ITEM_KEYS } from '../render.js';
import { makeZone, ZONE_LAYOUT_MODES, ZONE_WIDTHS } from '../state.js';

const SWATCH_COLORS = [
  '#C4922A', '#7B5EA7', '#2D6A4F', '#5C7A5A', '#8B1A1A',
  '#4A3F6B', '#C97BA8', '#C4580A', '#B8860B', '#6B3A2A',
];

const LAYOUT_MODE_LABELS = {
  'stack':       'Stack (vertical)',
  'row':         'Row (horizontal)',
  'columns-2':   '2 Columns',
  'columns-3':   '3 Columns',
};

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
        <div class="desc-hint">Optional second label. Prints alongside the front on a single 8.5x11 sheet.</div>
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
      </div>

      <div class="gold-divider"></div>

      <div id="layout-designer" class="layout-designer" data-layout-designer></div>

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

  const designerMount = root.querySelector('[data-layout-designer]');

  // --- Herb autocomplete (unchanged from v0.8) ---
  const autocompleteRoot = root.querySelector('[data-herb-autocomplete]');
  const suggestList      = root.querySelector('[data-herb-suggestions]');
  const titleCase = (s) => s.replace(/(^|\s)\w/g, c => c.toUpperCase());
  const escAttr   = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
      if (item.alias) score -= 1;
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
  {
    const noneOpt = document.createElement('option');
    noneOpt.value = 'none';
    noneOpt.textContent = 'None (no symbol)';
    symbolSel.appendChild(noneOpt);
  }
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

  // --- Layout Designer mount ---
  mountLayoutDesigner(designerMount, state);

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
    backFieldsBox.hidden = !s.backEnabled;
    descFullInput.value  = s.descFull ?? '';
    historicInput.value  = s.historicUses ?? '';
    compoundsInput.value = s.compounds ?? '';
    cautionsInput.value  = s.cautions  ?? '';
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

// ============================================================
// Layout Designer
// ============================================================
// Two columns (Front | Back) of zone cards plus a Hidden rail. Each zone:
//   - layout-mode dropdown (stack/row/columns-2/columns-3)
//   - width control (front zones only)
//   - draggable item chips
//   - "+ Add Item" button -> picker of items not currently placed in this zone
//   - "× Remove Zone" (only if it has no required items left)
// Each item chip:
//   - drag handle (whole chip is draggable)
//   - label
//   - × button to send the item to Hidden
//
// Drag-and-drop uses HTML5 native. Drop targets: zones (anywhere on zone),
// the Hidden rail, and between-chip insertion points within a zone.

function mountLayoutDesigner(root, state) {
  // Drag state lives at module scope - HTML5 dataTransfer is unreliable across
  // some browsers for non-text data. We track it ourselves and use dataTransfer
  // only as a signal that a drag is in progress.
  let dragPayload = null; // { item, fromZoneId } - fromZoneId may be 'hidden'

  function paint() {
    const s = state.get();
    const layout = s.layout;
    if (!layout) {
      root.innerHTML = '<div class="layout-empty">No layout configured.</div>';
      return;
    }

    root.innerHTML = `
      <div class="layout-title">
        Layout Designer
        <span class="layout-title-hint">drag items between zones. add or remove zones per side.</span>
      </div>
      <div class="layout-columns">
        <div class="layout-column" data-side="front">
          <div class="layout-column-header">Front</div>
          <div class="layout-zones" data-zones-for="front">
            ${(layout.front || []).map(z => zoneCardHtml(z, 'front')).join('')}
          </div>
          <button type="button" class="layout-add-zone" data-add-zone="front">+ Add Zone</button>
        </div>
        <div class="layout-column" data-side="back">
          <div class="layout-column-header">Back</div>
          <div class="layout-zones" data-zones-for="back">
            ${(layout.back || []).map(z => zoneCardHtml(z, 'back')).join('')}
          </div>
          <button type="button" class="layout-add-zone" data-add-zone="back">+ Add Zone</button>
        </div>
      </div>
      <div class="layout-hidden" data-hidden-rail>
        <div class="layout-hidden-label">Hidden Items <span class="layout-hidden-hint">drag here to remove from the label</span></div>
        <div class="layout-hidden-chips" data-hidden-chips>
          ${(layout.hidden || []).map(item => itemChipHtml(item, 'hidden')).join('') || '<div class="layout-hidden-empty">(everything is placed)</div>'}
        </div>
      </div>
    `;

    wireDragAndDrop();
    wireControls();
  }

  function zoneCardHtml(zone, side) {
    // v0.9.1: width control on both sides. Front zones live in a row so width
    // controls horizontal share; back zones live in a column so width controls
    // the zone's own width and the zone centers within the column.
    const widthControl = `<select class="layout-zone-width" data-zone-width="${esc(zone.id)}" aria-label="Zone width">
        ${ZONE_WIDTHS.map(w => `<option value="${w}" ${w === zone.width ? 'selected' : ''}>${w}%</option>`).join('')}
      </select>`;
    const modeControl = `<select class="layout-zone-mode" data-zone-mode="${esc(zone.id)}" aria-label="Zone layout mode">
        ${ZONE_LAYOUT_MODES.map(m => `<option value="${m}" ${m === (zone.layoutMode || 'stack') ? 'selected' : ''}>${LAYOUT_MODE_LABELS[m]}</option>`).join('')}
      </select>`;
    return `
      <div class="layout-zone-card" data-zone-id="${esc(zone.id)}" data-zone-side="${side}">
        <div class="layout-zone-head">
          <div class="layout-zone-head-controls">
            ${modeControl}
            ${widthControl}
          </div>
          <button type="button" class="layout-zone-remove" data-remove-zone="${esc(zone.id)}" aria-label="Remove zone">×</button>
        </div>
        <div class="layout-zone-chips" data-zone-chips="${esc(zone.id)}">
          ${(zone.items || []).map(item => itemChipHtml(item, zone.id)).join('')}
        </div>
        <button type="button" class="layout-add-item" data-add-item="${esc(zone.id)}">+ Add Item</button>
      </div>
    `;
  }

  function itemChipHtml(item, fromZoneId) {
    const label = ITEM_LABELS[item] || item;
    return `<div class="layout-chip" draggable="true" data-item="${esc(item)}" data-from-zone="${esc(fromZoneId)}" title="Drag to move">
      <span class="layout-chip-handle" aria-hidden="true">⋮⋮</span>
      <span class="layout-chip-label">${esc(label)}</span>
      <button type="button" class="layout-chip-hide" data-hide-item="${esc(item)}" data-from-zone="${esc(fromZoneId)}" aria-label="Hide this item">×</button>
    </div>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function wireDragAndDrop() {
    // Chip drag start.
    root.querySelectorAll('.layout-chip').forEach(chip => {
      chip.addEventListener('dragstart', (e) => {
        dragPayload = { item: chip.dataset.item, fromZoneId: chip.dataset.fromZone };
        chip.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', chip.dataset.item);
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('is-dragging');
        root.querySelectorAll('.is-drop-target, .is-drop-before, .is-drop-after').forEach(el => {
          el.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
        });
        dragPayload = null;
      });
    });

    // Drop into a zone's chips container.
    root.querySelectorAll('[data-zone-chips]').forEach(container => {
      container.addEventListener('dragover', (e) => {
        if (!dragPayload) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const overChip = e.target.closest('.layout-chip');
        // Clear any prior drop hints inside this container.
        container.querySelectorAll('.is-drop-before, .is-drop-after').forEach(el => {
          el.classList.remove('is-drop-before', 'is-drop-after');
        });
        container.classList.add('is-drop-target');
        if (overChip && overChip.dataset.item !== dragPayload.item) {
          const rect = overChip.getBoundingClientRect();
          const after = (e.clientY - rect.top) > rect.height / 2;
          overChip.classList.add(after ? 'is-drop-after' : 'is-drop-before');
        }
      });
      container.addEventListener('dragleave', (e) => {
        // Only clear when we actually exit the container (not just moving onto a child).
        if (!container.contains(e.relatedTarget)) {
          container.classList.remove('is-drop-target');
          container.querySelectorAll('.is-drop-before, .is-drop-after').forEach(el => {
            el.classList.remove('is-drop-before', 'is-drop-after');
          });
        }
      });
      container.addEventListener('drop', (e) => {
        if (!dragPayload) return;
        e.preventDefault();
        const toZoneId = container.dataset.zoneChips;
        const overChip = e.target.closest('.layout-chip');
        let insertBefore = null;
        if (overChip && overChip.dataset.item !== dragPayload.item) {
          const rect = overChip.getBoundingClientRect();
          const after = (e.clientY - rect.top) > rect.height / 2;
          insertBefore = after ? overChip.dataset.item + ':after' : overChip.dataset.item;
        }
        moveItem(dragPayload.item, dragPayload.fromZoneId, toZoneId, insertBefore);
      });
    });

    // Drop into Hidden rail.
    const hiddenChips = root.querySelector('[data-hidden-chips]');
    if (hiddenChips) {
      hiddenChips.addEventListener('dragover', (e) => {
        if (!dragPayload) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        hiddenChips.classList.add('is-drop-target');
      });
      hiddenChips.addEventListener('dragleave', (e) => {
        if (!hiddenChips.contains(e.relatedTarget)) {
          hiddenChips.classList.remove('is-drop-target');
        }
      });
      hiddenChips.addEventListener('drop', (e) => {
        if (!dragPayload) return;
        e.preventDefault();
        moveItem(dragPayload.item, dragPayload.fromZoneId, 'hidden', null);
      });
    }
  }

  function wireControls() {
    // Zone mode change.
    root.querySelectorAll('[data-zone-mode]').forEach(sel => {
      sel.addEventListener('change', () => {
        const zoneId = sel.dataset.zoneMode;
        updateZone(zoneId, z => ({ ...z, layoutMode: sel.value }));
      });
    });
    // Zone width change.
    root.querySelectorAll('[data-zone-width]').forEach(sel => {
      sel.addEventListener('change', () => {
        const zoneId = sel.dataset.zoneWidth;
        updateZone(zoneId, z => ({ ...z, width: parseInt(sel.value, 10) }));
      });
    });
    // Zone remove.
    root.querySelectorAll('[data-remove-zone]').forEach(btn => {
      btn.addEventListener('click', () => {
        const zoneId = btn.dataset.removeZone;
        removeZone(zoneId);
      });
    });
    // Item hide (X on chip).
    root.querySelectorAll('[data-hide-item]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveItem(btn.dataset.hideItem, btn.dataset.fromZone, 'hidden', null);
      });
    });
    // Add zone.
    root.querySelectorAll('[data-add-zone]').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = btn.dataset.addZone;
        addZone(side);
      });
    });
    // Add item -> open picker for items currently in hidden or simply unplaced
    // on the target side.
    root.querySelectorAll('[data-add-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const zoneId = btn.dataset.addItem;
        openItemPicker(zoneId, btn);
      });
    });
  }

  function findZone(layout, zoneId) {
    for (const side of ['front', 'back']) {
      const idx = (layout[side] || []).findIndex(z => z.id === zoneId);
      if (idx >= 0) return { side, idx, zone: layout[side][idx] };
    }
    return null;
  }

  function updateZone(zoneId, fn) {
    const layout = structuredClone(state.get().layout);
    const found = findZone(layout, zoneId);
    if (!found) return;
    layout[found.side][found.idx] = fn(found.zone);
    state.set({ layout });
  }

  function removeZone(zoneId) {
    const layout = structuredClone(state.get().layout);
    const found = findZone(layout, zoneId);
    if (!found) return;
    // Move any items in the doomed zone to hidden, then drop the zone.
    const items = found.zone.items || [];
    layout[found.side].splice(found.idx, 1);
    layout.hidden = [...(layout.hidden || []), ...items.filter(i => !(layout.hidden || []).includes(i))];
    state.set({ layout });
  }

  function addZone(side) {
    const layout = structuredClone(state.get().layout);
    const newZone = makeZone({ layoutMode: 'stack', width: side === 'front' ? 50 : 100, items: [] });
    layout[side] = [...(layout[side] || []), newZone];
    state.set({ layout });
  }

  function moveItem(item, fromZoneId, toZoneId, insertHint) {
    const layout = structuredClone(state.get().layout);

    // Remove from source.
    if (fromZoneId === 'hidden') {
      layout.hidden = (layout.hidden || []).filter(i => i !== item);
    } else {
      const src = findZone(layout, fromZoneId);
      if (src) {
        src.zone.items = src.zone.items.filter(i => i !== item);
      }
    }

    // Insert into destination.
    if (toZoneId === 'hidden') {
      if (!(layout.hidden || []).includes(item)) {
        layout.hidden = [...(layout.hidden || []), item];
      }
    } else {
      const dst = findZone(layout, toZoneId);
      if (!dst) return;
      // Avoid duplicates within a zone (each item one place per zone).
      dst.zone.items = dst.zone.items.filter(i => i !== item);
      if (insertHint) {
        const after = insertHint.endsWith(':after');
        const target = after ? insertHint.slice(0, -':after'.length) : insertHint;
        const idx = dst.zone.items.indexOf(target);
        if (idx >= 0) {
          dst.zone.items.splice(after ? idx + 1 : idx, 0, item);
        } else {
          dst.zone.items.push(item);
        }
      } else {
        dst.zone.items.push(item);
      }
    }

    state.set({ layout });
  }

  function openItemPicker(zoneId, anchorBtn) {
    // Find items that are NOT in this zone. We allow re-placing an item that
    // lives in a different zone (moving it). Hidden items are first-class
    // candidates here.
    const layout = state.get().layout;
    const zoneInfo = findZone(layout, zoneId);
    if (!zoneInfo) return;
    const inThisZone = new Set(zoneInfo.zone.items);

    // Close any open picker first.
    root.querySelectorAll('.layout-item-picker').forEach(p => p.remove());

    const picker = document.createElement('div');
    picker.className = 'layout-item-picker';
    picker.innerHTML = `
      <div class="layout-item-picker-title">Add Item</div>
      <div class="layout-item-picker-list">
        ${ALL_ITEM_KEYS.filter(k => !inThisZone.has(k)).map(k => {
          const where = locateItem(layout, k);
          const hint = where === 'hidden' ? '<span class="layout-pick-hint">(hidden)</span>'
                     : where ? `<span class="layout-pick-hint">(from ${where})</span>`
                     : '';
          return `<button type="button" class="layout-pick" data-pick-item="${esc(k)}">${esc(ITEM_LABELS[k] || k)}${hint}</button>`;
        }).join('')}
      </div>
    `;
    anchorBtn.parentElement.appendChild(picker);

    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-item]');
      if (!btn) return;
      const item = btn.dataset.pickItem;
      const fromZone = locateItem(state.get().layout, item) || 'hidden';
      moveItem(item, fromZone, zoneId, null);
    });

    // Close picker on outside click.
    setTimeout(() => {
      const onDocClick = (e) => {
        if (!picker.contains(e.target) && e.target !== anchorBtn) {
          picker.remove();
          document.removeEventListener('click', onDocClick);
        }
      };
      document.addEventListener('click', onDocClick);
    }, 0);
  }

  function locateItem(layout, item) {
    if ((layout.hidden || []).includes(item)) return 'hidden';
    for (const side of ['front', 'back']) {
      for (const z of (layout[side] || [])) {
        if (z.items.includes(item)) return z.id;
      }
    }
    return null;
  }

  // Initial paint + repaint on every state change. Naive re-render is fine -
  // the designer is small and state changes here are user-driven, not
  // continuous.
  paint();
  state.subscribe(paint);
}
