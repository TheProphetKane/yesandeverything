// editor.js - left panel: accordion sections (Content / Style / Layout /
// Output), layout designer, herb autocomplete, section title editor, custom
// section editor, layout presets, border style picker.
//
// v0.11: editor reorganized into four collapsible accordion sections so the
// UI scales. New customization surface area: per-section title editing +
// visibility, user-defined custom items, per-zone alignment, border style
// picker, layout presets.

import { printLabel } from '../util/print.js';
// v0.11.1: cross-module references for cache-bust safety travel through ctx,
// not static imports. main.js owns the versioned dynamic-import graph; any
// static import here would fetch an un-versioned URL that Cloudflare may
// serve stale, breaking the editor whenever the upstream module ships new
// exports. So we destructure from ctx in mountEditor instead.

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

const ZONE_ALIGN_LABELS = {
  'left':   'Left',
  'center': 'Center',
  'right':  'Right',
};

// The five editable section titles + the optional one (back-desc-full).
const TITLE_FIELDS = [
  { key: 'historic',        label: 'Traditional Uses' },
  { key: 'notes',           label: 'Notes (combined)' },
  { key: 'compounds',       label: 'Compounds' },
  { key: 'cautions',        label: 'Cautions' },
  { key: 'pairings',        label: 'Pairings' },
  { key: 'back-desc-full',  label: 'Full Description (optional title)' },
];

export function mountEditor(root, ctx) {
  const {
    state, lookupHerb, runes, symbolLabels, herbDB, aliasMap, templates, parchmentTextures,
    // v0.11.1: forwarded from main.js's versioned dynamic imports.
    ITEM_LABELS, ALL_ITEM_KEYS, BORDER_STYLES, BORDER_STYLE_LABELS,
    makeZone, ZONE_LAYOUT_MODES, ZONE_WIDTHS, defaultLayout, DEFAULT_SECTION_TITLES,
  } = ctx;
  const tmpl = templates[state.get().templateId];

  // FACTORY_PRESETS uses defaultLayout/makeZone/DEFAULT_SECTION_TITLES, so
  // it has to be built inside mountEditor where those are in scope.
  const FACTORY_PRESETS = [
    {
      id: 'preset-standard',
      name: 'Standard (two-sided)',
      layout: () => defaultLayout(),
      sectionTitles: { ...DEFAULT_SECTION_TITLES },
    },
    {
      id: 'preset-three-col',
      name: 'Three-column back',
      layout: () => {
        const l = defaultLayout();
        const bb = l.back.find(z => z.id === 'back-bottom');
        if (bb) {
          bb.items = ['compounds', 'cautions', 'pairings'];
          bb.layoutMode = 'columns-3';
        }
        l.hidden = l.hidden.filter(k => !['compounds', 'cautions'].includes(k));
        if (!l.hidden.includes('notes')) l.hidden.push('notes');
        return l;
      },
      sectionTitles: { ...DEFAULT_SECTION_TITLES },
    },
    {
      id: 'preset-minimal-front',
      name: 'Front-only minimal',
      layout: () => ({
        front: [
          makeZone({ id: 'front-left',   layoutMode: 'stack', width: 25, items: ['symbol'] }),
          makeZone({ id: 'front-center', layoutMode: 'stack', width: 50, items: [
            'herb-name', 'latin', 'divider-bot', 'description',
          ]}),
          makeZone({ id: 'front-right',  layoutMode: 'stack', width: 25, items: ['botanical'] }),
        ],
        back: [],
        hidden: ['shop', 'props', 'divider-top', 'rune-1', 'rune-2', 'rune-3',
                 'back-name', 'back-latin', 'back-divider', 'back-desc-full',
                 'historic', 'notes', 'compounds', 'cautions', 'pairings'],
      }),
      sectionTitles: { ...DEFAULT_SECTION_TITLES },
    },
  ];

  root.innerHTML = `
    <h2 class="editor-title">Label Editor</h2>

    ${section('content', 'Content', `
      <div class="field">
        <label class="field-label" for="herbName">Herb / Ingredient Name</label>
        <div class="herb-autocomplete" data-herb-autocomplete>
          <input id="herbName" class="field-input" type="text" autocomplete="off" placeholder="e.g. Chamomile, Lavender, Ginger..." aria-autocomplete="list" aria-controls="herb-suggestions" />
          <ul id="herb-suggestions" class="herb-suggestions" data-herb-suggestions hidden role="listbox"></ul>
        </div>
      </div>
      <button id="btn-autofill" class="btn-primary">Auto-Fill Label</button>
      <div id="status-msg" class="status-msg">&nbsp;</div>

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

      <div class="field back-toggle-row">
        <label class="checkbox-label">
          <input id="fBackEnabled" type="checkbox" />
          <span>Enable Back Label</span>
        </label>
        <div class="desc-hint">Optional second label that prints alongside the front on a single 8.5x11 sheet.</div>
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
    `)}

    ${section('style', 'Style', `
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
        <label class="field-label">Border Style</label>
        <div id="borderPicker" class="border-picker" data-border-picker role="radiogroup" aria-label="Border style"></div>
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

      <div class="title-editor-panel">
        <div class="title-editor-head">
          Section Titles
          <span class="title-editor-hint">empty = hide the title</span>
        </div>
        <div class="title-editor-list" data-title-editor></div>
      </div>

      <div class="custom-items-panel">
        <div class="custom-items-head">
          Custom Sections
          <span class="custom-items-hint">make your own section with a title and body</span>
        </div>
        <div class="custom-items-list" data-custom-items></div>
        <button type="button" class="layout-add-zone" data-add-custom>+ New Custom Section</button>
      </div>
    `)}

    ${section('layout', 'Layout', `
      <div class="preset-panel">
        <div class="preset-head">
          Layout Presets
          <span class="preset-hint">snapshot your zone arrangement and recall it later</span>
        </div>
        <div class="preset-row">
          <select id="presetSelect" class="field-input">
            <option value="">Load a preset...</option>
          </select>
          <button type="button" id="btnPresetSave" class="btn-ghost preset-save-btn">Save current</button>
        </div>
        <div id="presetActions" class="preset-actions" hidden></div>
      </div>

      <div id="layout-designer" class="layout-designer" data-layout-designer></div>
    `)}

    ${section('output', 'Output', `
      <div class="field">
        <label class="field-label" for="fSize">Label Size</label>
        <select id="fSize" class="field-input"></select>
        <div class="desc-hint">All sizes share the same proportions. Print scales the layout uniformly.</div>
      </div>

      <button id="btn-print" class="btn-secondary">Print Label</button>
      <button id="btn-reset" class="btn-ghost" type="button">Reset to Defaults</button>
    `)}
  `;

  const $ = (id) => root.querySelector('#' + id);
  const herbInput  = $('herbName');
  const latinInput = $('fLatin');
  const propsInput = $('fProps');
  const descInput  = $('fDesc');
  const descCounter = $('descCounter');
  const symbolSel  = $('fSymbol');
  const parchPicker = $('parchmentPicker');
  const borderPicker = $('borderPicker');
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

  const titleEditorMount  = root.querySelector('[data-title-editor]');
  const customItemsMount  = root.querySelector('[data-custom-items]');
  const addCustomBtn      = root.querySelector('[data-add-custom]');
  const presetSelect      = $('presetSelect');
  const presetSaveBtn     = $('btnPresetSave');
  const presetActions     = $('presetActions');
  const designerMount     = root.querySelector('[data-layout-designer]');

  wireAccordion(root);

  // --- Herb autocomplete (unchanged from v0.10) ---
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

  // Border style picker (v0.11).
  for (const id of BORDER_STYLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'border-tile';
    btn.dataset.borderStyle = id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', BORDER_STYLE_LABELS[id]);
    btn.setAttribute('title', BORDER_STYLE_LABELS[id]);
    btn.innerHTML = `
      <svg viewBox="0 0 60 36" class="border-tile-preview" aria-hidden="true">
        ${borderTilePreview(id)}
      </svg>
      <div class="border-tile-label">${BORDER_STYLE_LABELS[id]}</div>
    `;
    borderPicker.appendChild(btn);
  }
  borderPicker.addEventListener('click', (e) => {
    const tile = e.target.closest('.border-tile');
    if (!tile) return;
    state.set({ borderStyle: tile.dataset.borderStyle });
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

  // --- Mounts for the v0.11 surfaces ---
  // Bundle of cross-module deps each mounter needs. Avoids re-passing every arg.
  const deps = {
    ITEM_LABELS, ALL_ITEM_KEYS, BORDER_STYLES, BORDER_STYLE_LABELS,
    makeZone, ZONE_LAYOUT_MODES, ZONE_WIDTHS, defaultLayout, DEFAULT_SECTION_TITLES,
    FACTORY_PRESETS,
  };
  mountLayoutDesigner(designerMount, state, deps);
  mountTitleEditor(titleEditorMount, state, deps);
  mountCustomItems(customItemsMount, state, deps);
  mountPresets({ select: presetSelect, saveBtn: presetSaveBtn, actions: presetActions }, state, deps);

  addCustomBtn.addEventListener('click', () => {
    const layout = structuredClone(state.get().layout);
    const items = [...(state.get().customItems || [])];
    const id = 'custom-' + Math.random().toString(36).slice(2, 9);
    items.push({ id, title: 'Custom Section', body: 'Your text here.' });
    // Drop the new custom item into hidden so the user can drag it where they want.
    layout.hidden = [...(layout.hidden || []), id];
    state.set({ customItems: items, layout });
  });

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
    borderPicker.querySelectorAll('.border-tile').forEach(tile => {
      tile.classList.toggle('is-selected', tile.dataset.borderStyle === (s.borderStyle ?? 'celtic'));
      tile.setAttribute('aria-checked', tile.dataset.borderStyle === (s.borderStyle ?? 'celtic') ? 'true' : 'false');
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
// Accordion section helper
// ============================================================
// One reusable wrapper. Each editor section gets a header (clickable to
// toggle) and a body. Defaults to open. State of which sections are open
// stays in DOM (and localStorage via the persist subscriber if we add it
// later). For now: ephemeral, all-open on every load.

function section(id, title, innerHtml) {
  return `
    <section class="ed-section ed-section--open" data-section="${id}">
      <button class="ed-section-head" type="button" aria-expanded="true">
        <span class="ed-section-title">${title}</span>
        <span class="ed-section-chevron" aria-hidden="true">›</span>
      </button>
      <div class="ed-section-body">${innerHtml}</div>
    </section>
  `;
}

function wireAccordion(root) {
  root.querySelectorAll('.ed-section').forEach(sec => {
    const head = sec.querySelector('.ed-section-head');
    head.addEventListener('click', () => {
      const open = sec.classList.toggle('ed-section--open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}

// ============================================================
// Section title editor
// ============================================================
// Per-section inline text input. Empty value = no title rendered. The
// historic / notes / compounds / cautions / pairings keys are always
// shown. back-desc-full is shown too as an "optional title" so the user
// can opt into wrapping the Full Description in a section card.

function mountTitleEditor(root, state, _deps) {
  function paint() {
    const s = state.get();
    const titles = s.sectionTitles ?? {};
    root.innerHTML = TITLE_FIELDS.map(field => {
      const v = titles[field.key] ?? '';
      return `
        <div class="title-editor-row">
          <span class="title-editor-label">${field.label}</span>
          <input type="text" class="title-editor-input" data-title-key="${field.key}" value="${escAttr(v)}" placeholder="${escAttr(field.key === 'back-desc-full' ? '(no title)' : '(hidden)')}" />
        </div>
      `;
    }).join('');
    root.querySelectorAll('[data-title-key]').forEach(inp => {
      inp.addEventListener('input', () => {
        const next = { ...(state.get().sectionTitles ?? {}) };
        next[inp.dataset.titleKey] = inp.value;
        state.set({ sectionTitles: next });
      });
    });
  }
  function escAttr(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  paint();
  state.subscribe(paint);
}

// ============================================================
// Custom items editor
// ============================================================
// Each custom item shows a title input + a body textarea + a Delete chip.
// Adding a new custom item is handled by the "+ New Custom Section" button
// in the main editor template (which adds the item to state.customItems and
// drops the new key into layout.hidden).

function mountCustomItems(root, state, _deps) {
  function paint() {
    const items = state.get().customItems ?? [];
    if (items.length === 0) {
      root.innerHTML = '<div class="custom-items-empty">No custom sections yet. Click below to add one.</div>';
      return;
    }
    root.innerHTML = items.map(item => `
      <div class="custom-item-card" data-custom-id="${escAttr(item.id)}">
        <div class="custom-item-head">
          <input type="text" class="custom-item-title field-input" data-custom-title value="${escAttr(item.title)}" placeholder="Section title" />
          <button type="button" class="custom-item-remove" data-custom-remove aria-label="Delete custom section">×</button>
        </div>
        <textarea class="custom-item-body field-input" data-custom-body rows="2" placeholder="Section body text">${escAttr(item.body)}</textarea>
      </div>
    `).join('');

    root.querySelectorAll('.custom-item-card').forEach(card => {
      const id = card.dataset.customId;
      const titleInp = card.querySelector('[data-custom-title]');
      const bodyInp  = card.querySelector('[data-custom-body]');
      const rmBtn    = card.querySelector('[data-custom-remove]');
      titleInp.addEventListener('input', () => updateCustom(id, c => ({ ...c, title: titleInp.value })));
      bodyInp.addEventListener('input',  () => updateCustom(id, c => ({ ...c, body:  bodyInp.value  })));
      rmBtn.addEventListener('click',    () => removeCustom(id));
    });
  }
  function updateCustom(id, fn) {
    const items = (state.get().customItems ?? []).map(c => c.id === id ? fn(c) : c);
    state.set({ customItems: items });
  }
  function removeCustom(id) {
    if (!confirm('Delete this custom section?')) return;
    const items = (state.get().customItems ?? []).filter(c => c.id !== id);
    // Also strip from layout (front/back/hidden).
    const layout = structuredClone(state.get().layout);
    for (const side of ['front', 'back']) {
      for (const z of (layout[side] || [])) {
        z.items = z.items.filter(k => k !== id);
      }
    }
    layout.hidden = (layout.hidden || []).filter(k => k !== id);
    state.set({ customItems: items, layout });
  }
  function escAttr(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  paint();
  state.subscribe(paint);
}

// ============================================================
// Layout presets
// ============================================================
// Factory presets + user-saved presets. User can save the current layout +
// section titles as a named preset, recall any preset, and delete user
// presets (factory presets are read-only).

function mountPresets({ select, saveBtn, actions }, state, deps) {
  const { FACTORY_PRESETS, DEFAULT_SECTION_TITLES } = deps;
  function allPresets() {
    return [
      ...FACTORY_PRESETS.map(p => ({ ...p, kind: 'factory' })),
      ...(state.get().layoutPresets ?? []).map(p => ({ ...p, kind: 'user' })),
    ];
  }

  function paint() {
    const presets = allPresets();
    select.innerHTML = '<option value="">Load a preset...</option>' +
      presets.map(p => `<option value="${escAttr(p.id)}">${escAttr(p.name)}${p.kind === 'user' ? ' (saved)' : ''}</option>`).join('');

    // Show delete button only if the currently-selected preset is a user one.
    const cur = select.value;
    const curPreset = presets.find(p => p.id === cur);
    if (curPreset && curPreset.kind === 'user') {
      actions.hidden = false;
      actions.innerHTML = `<button type="button" class="btn-ghost preset-delete-btn" data-delete-preset>Delete "${escAttr(curPreset.name)}"</button>`;
      actions.querySelector('[data-delete-preset]').addEventListener('click', () => {
        if (!confirm(`Delete preset "${curPreset.name}"?`)) return;
        const next = (state.get().layoutPresets ?? []).filter(p => p.id !== cur);
        state.set({ layoutPresets: next });
        select.value = '';
        paint();
      });
    } else {
      actions.hidden = true;
      actions.innerHTML = '';
    }
  }

  select.addEventListener('change', () => {
    const presets = allPresets();
    const p = presets.find(x => x.id === select.value);
    if (!p) return;
    const layout = typeof p.layout === 'function' ? p.layout() : structuredClone(p.layout);
    const sectionTitles = { ...DEFAULT_SECTION_TITLES, ...(p.sectionTitles ?? {}) };
    state.set({ layout, sectionTitles });
    paint();
  });

  saveBtn.addEventListener('click', () => {
    const name = prompt('Name this preset:');
    if (!name) return;
    const id = 'user-' + Math.random().toString(36).slice(2, 9);
    const layout = structuredClone(state.get().layout);
    const sectionTitles = { ...(state.get().sectionTitles ?? {}) };
    const next = [...(state.get().layoutPresets ?? []), { id, name, layout, sectionTitles }];
    state.set({ layoutPresets: next });
    select.value = id;
    paint();
  });

  function escAttr(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  paint();
  state.subscribe(paint);
}

// ============================================================
// Border tile preview SVG fragments
// ============================================================
// Tiny inline SVG renders for each border style so the picker tiles show
// what each option looks like. 60x36 viewBox.

function borderTilePreview(style) {
  const c = 'var(--gold-bright)';
  if (style === 'simple') {
    return `<rect x="2" y="2" width="56" height="32" rx="3" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.7"/>`;
  }
  if (style === 'beveled') {
    return `
      <rect x="2" y="2" width="56" height="32" rx="1" fill="none" stroke="${c}" stroke-width="1" opacity="0.7"/>
      <rect x="5" y="5" width="50" height="26" rx="0.5" fill="none" stroke="${c}" stroke-width="0.4" opacity="0.5"/>
    `;
  }
  if (style === 'ornate') {
    return `
      <rect x="2" y="2" width="56" height="32" rx="3" fill="none" stroke="${c}" stroke-width="1" opacity="0.7"/>
      <rect x="5" y="5" width="50" height="26" rx="2" fill="none" stroke="${c}" stroke-width="0.4" opacity="0.5"/>
      <circle cx="5" cy="5" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
      <circle cx="55" cy="5" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
      <circle cx="5" cy="31" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
      <circle cx="55" cy="31" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
      <path d="M 3 8 Q 6 5, 9 3" stroke="${c}" stroke-width="0.4" fill="none" opacity="0.6"/>
      <path d="M 57 8 Q 54 5, 51 3" stroke="${c}" stroke-width="0.4" fill="none" opacity="0.6"/>
    `;
  }
  // celtic (default)
  return `
    <rect x="2" y="2" width="56" height="32" rx="3" fill="none" stroke="${c}" stroke-width="1" opacity="0.7"/>
    <rect x="5" y="5" width="50" height="26" rx="2" fill="none" stroke="${c}" stroke-width="0.4" opacity="0.5"/>
    <circle cx="5" cy="5" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
    <circle cx="55" cy="5" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
    <circle cx="5" cy="31" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
    <circle cx="55" cy="31" r="1.2" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.7"/>
  `;
}

// ============================================================
// Layout Designer (v0.9 + v0.11 alignment selector)
// ============================================================

function mountLayoutDesigner(root, state, deps) {
  const { ITEM_LABELS, ALL_ITEM_KEYS, ZONE_LAYOUT_MODES, ZONE_WIDTHS, makeZone } = deps;
  let dragPayload = null;

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
            ${(layout.front || []).map(z => zoneCardHtml(z, 'front', s.customItems)).join('')}
          </div>
          <button type="button" class="layout-add-zone" data-add-zone="front">+ Add Zone</button>
        </div>
        <div class="layout-column" data-side="back">
          <div class="layout-column-header">Back</div>
          <div class="layout-zones" data-zones-for="back">
            ${(layout.back || []).map(z => zoneCardHtml(z, 'back', s.customItems)).join('')}
          </div>
          <button type="button" class="layout-add-zone" data-add-zone="back">+ Add Zone</button>
        </div>
      </div>
      <div class="layout-hidden" data-hidden-rail>
        <div class="layout-hidden-label">Hidden Items <span class="layout-hidden-hint">drag here to remove from the label</span></div>
        <div class="layout-hidden-chips" data-hidden-chips>
          ${(layout.hidden || []).map(item => itemChipHtml(item, 'hidden', s.customItems)).join('') || '<div class="layout-hidden-empty">(everything is placed)</div>'}
        </div>
      </div>
    `;

    wireDragAndDrop();
    wireControls();
  }

  function labelFor(itemKey, customItems) {
    if (itemKey.startsWith('custom-')) {
      const c = (customItems || []).find(x => x.id === itemKey);
      return c ? (c.title || 'Custom Section') : 'Custom (missing)';
    }
    return ITEM_LABELS[itemKey] || itemKey;
  }

  function zoneCardHtml(zone, side, customItems) {
    const widthControl = `<select class="layout-zone-width" data-zone-width="${esc(zone.id)}" aria-label="Zone width">
        ${ZONE_WIDTHS.map(w => `<option value="${w}" ${w === zone.width ? 'selected' : ''}>${w}%</option>`).join('')}
      </select>`;
    const modeControl = `<select class="layout-zone-mode" data-zone-mode="${esc(zone.id)}" aria-label="Zone layout mode">
        ${ZONE_LAYOUT_MODES.map(m => `<option value="${m}" ${m === (zone.layoutMode || 'stack') ? 'selected' : ''}>${LAYOUT_MODE_LABELS[m]}</option>`).join('')}
      </select>`;
    const alignControl = `<select class="layout-zone-align" data-zone-align="${esc(zone.id)}" aria-label="Zone text alignment">
        ${Object.entries(ZONE_ALIGN_LABELS).map(([v, l]) => `<option value="${v}" ${v === (zone.align || 'center') ? 'selected' : ''}>${l}</option>`).join('')}
      </select>`;
    return `
      <div class="layout-zone-card" data-zone-id="${esc(zone.id)}" data-zone-side="${side}">
        <div class="layout-zone-head">
          <div class="layout-zone-head-controls">
            ${modeControl}
            ${alignControl}
            ${widthControl}
          </div>
          <button type="button" class="layout-zone-remove" data-remove-zone="${esc(zone.id)}" aria-label="Remove zone">×</button>
        </div>
        <div class="layout-zone-chips" data-zone-chips="${esc(zone.id)}">
          ${(zone.items || []).map(item => itemChipHtml(item, zone.id, customItems)).join('')}
        </div>
        <button type="button" class="layout-add-item" data-add-item="${esc(zone.id)}">+ Add Item</button>
      </div>
    `;
  }

  function itemChipHtml(item, fromZoneId, customItems) {
    const label = labelFor(item, customItems);
    const customCls = item.startsWith('custom-') ? ' layout-chip--custom' : '';
    return `<div class="layout-chip${customCls}" draggable="true" data-item="${esc(item)}" data-from-zone="${esc(fromZoneId)}" title="Drag to move">
      <span class="layout-chip-handle" aria-hidden="true">⋮⋮</span>
      <span class="layout-chip-label">${esc(label)}</span>
      <button type="button" class="layout-chip-hide" data-hide-item="${esc(item)}" data-from-zone="${esc(fromZoneId)}" aria-label="Hide this item">×</button>
    </div>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function wireDragAndDrop() {
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

    root.querySelectorAll('[data-zone-chips]').forEach(container => {
      container.addEventListener('dragover', (e) => {
        if (!dragPayload) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const overChip = e.target.closest('.layout-chip');
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
    root.querySelectorAll('[data-zone-mode]').forEach(sel => {
      sel.addEventListener('change', () => {
        const zoneId = sel.dataset.zoneMode;
        updateZone(zoneId, z => ({ ...z, layoutMode: sel.value }));
      });
    });
    root.querySelectorAll('[data-zone-width]').forEach(sel => {
      sel.addEventListener('change', () => {
        const zoneId = sel.dataset.zoneWidth;
        updateZone(zoneId, z => ({ ...z, width: parseInt(sel.value, 10) }));
      });
    });
    root.querySelectorAll('[data-zone-align]').forEach(sel => {
      sel.addEventListener('change', () => {
        const zoneId = sel.dataset.zoneAlign;
        updateZone(zoneId, z => ({ ...z, align: sel.value }));
      });
    });
    root.querySelectorAll('[data-remove-zone]').forEach(btn => {
      btn.addEventListener('click', () => removeZone(btn.dataset.removeZone));
    });
    root.querySelectorAll('[data-hide-item]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveItem(btn.dataset.hideItem, btn.dataset.fromZone, 'hidden', null);
      });
    });
    root.querySelectorAll('[data-add-zone]').forEach(btn => {
      btn.addEventListener('click', () => addZone(btn.dataset.addZone));
    });
    root.querySelectorAll('[data-add-item]').forEach(btn => {
      btn.addEventListener('click', () => openItemPicker(btn.dataset.addItem, btn));
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
    if (fromZoneId === 'hidden') {
      layout.hidden = (layout.hidden || []).filter(i => i !== item);
    } else {
      const src = findZone(layout, fromZoneId);
      if (src) src.zone.items = src.zone.items.filter(i => i !== item);
    }
    if (toZoneId === 'hidden') {
      if (!(layout.hidden || []).includes(item)) {
        layout.hidden = [...(layout.hidden || []), item];
      }
    } else {
      const dst = findZone(layout, toZoneId);
      if (!dst) return;
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
    const layout = state.get().layout;
    const customItems = state.get().customItems ?? [];
    const zoneInfo = findZone(layout, zoneId);
    if (!zoneInfo) return;
    const inThisZone = new Set(zoneInfo.zone.items);

    root.querySelectorAll('.layout-item-picker').forEach(p => p.remove());

    // Build the full available list: all built-in keys + all custom items.
    const allKeys = [...ALL_ITEM_KEYS, ...customItems.map(c => c.id)];

    const picker = document.createElement('div');
    picker.className = 'layout-item-picker';
    picker.innerHTML = `
      <div class="layout-item-picker-title">Add Item</div>
      <div class="layout-item-picker-list">
        ${allKeys.filter(k => !inThisZone.has(k)).map(k => {
          const where = locateItem(layout, k);
          const hint = where === 'hidden' ? '<span class="layout-pick-hint">(hidden)</span>'
                     : where ? `<span class="layout-pick-hint">(from ${where})</span>`
                     : '';
          const label = labelFor(k, customItems);
          return `<button type="button" class="layout-pick" data-pick-item="${esc(k)}">${esc(label)}${hint}</button>`;
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

  paint();
  state.subscribe(paint);
}
