// editor.js - left panel: accordion sections (Content / Style / Layout /
// Output), herb autocomplete, accent swatches, symbol/parchment/border
// pickers, border-tile SVG previews. Mounts the five larger sub-panels from
// their own modules: src/ui/title-editor.js, src/ui/custom-items.js,
// src/ui/layout-presets.js, src/ui/layout-designer.js and
// src/ui/illustration-picker.js (bar-raise maintainability-01, 2026-09-04;
// this file used to carry all seven mounters directly and had grown to 1642
// lines, 2.6x render.js).
//
// v0.11: editor reorganized into four collapsible accordion sections so the
// UI scales. New customization surface area: per-section title editing +
// visibility, user-defined custom items, per-zone alignment, border style
// picker, layout presets.

// v0.11.1: cross-module references for cache-bust safety travel through ctx,
// not static imports. main.js owns the versioned dynamic-import graph; any
// static import here would fetch an un-versioned URL that Cloudflare may
// serve stale, breaking the editor whenever the upstream module ships new
// exports. So we destructure from ctx in mountEditor instead. The five
// mounters split out below (2026-09-04) follow the same rule: they're loaded
// through the versioned Promise.all block below, same as escape-html.js
// already was, and esc/preserveScroll travel into them through the deps
// object mountEditor builds rather than a static import inside those files.
// v1.1.6: printLabel and truncateAtWordBoundary used to violate this exact
// rule via a stray static import (bar-raise 2026-08-12 architecture-01);
// they're destructured from ctx below now, same as everything else here.

// The HTML-escaper: one copy for the app (bar-raise maintainability-02).
// Six byte-identical closures used to live in this file under two names,
// escAttr and esc, doing exactly the same five-character escape. Loaded
// through a versioned dynamic import rather than a static one for the reason
// spelled out above: a static import resolves at a bare URL with no ?v= and
// the edge cache can serve it stale after a deploy (PROJECT_SPEC 3.1).
const ESC_V = '?v=' + (typeof window !== 'undefined' && window.__APOTHECARY_BUILD
  ? window.__APOTHECARY_BUILD : '0');
const [
  { escapeHtml: esc },
  { mountTitleEditor },
  { mountCustomItems },
  { mountPresets },
  { mountLayoutDesigner },
  { mountIllustrationPicker },
  { resolveIllustration },
] = await Promise.all([
  import('../util/escape-html.js' + ESC_V),
  import('./title-editor.js' + ESC_V),
  import('./custom-items.js' + ESC_V),
  import('./layout-presets.js' + ESC_V),
  import('./layout-designer.js' + ESC_V),
  import('./illustration-picker.js' + ESC_V),
  // bar-raise 2026-09-09 architecture-01: the illustration resolution order,
  // shared with render.js via main.js's ctx so both call sites use the same
  // three-step chain instead of two independently drifting copies.
  import('../util/resolve-illustration.js' + ESC_V),
]);

const SWATCH_COLORS = [
  '#C4922A', '#7B5EA7', '#2D6A4F', '#5C7A5A', '#8B1A1A',
  '#4A3F6B', '#C97BA8', '#C4580A', '#B8860B', '#6B3A2A',
];

// Runs a sub-panel mounter and contains a throw to that one panel instead of
// letting it propagate to main().catch, which replaces the entire page with
// the failure screen (bar-raise reliability-01). targetEl is the element (or
// array of elements) that panel owns; on failure each one gets cleared and
// shown a short inline message so the rest of the editor stays usable.
function mountSafely(label, targetEl, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`${label} failed to mount:`, err);
    const targets = Array.isArray(targetEl) ? targetEl : [targetEl];
    for (const el of targets) {
      if (!el || el.nodeType !== 1) continue;
      el.innerHTML = '';
      const msg = document.createElement('p');
      msg.className = 'mount-error status-msg warn';
      msg.textContent = `${label} is unavailable right now. The rest of the editor still works.`;
      el.appendChild(msg);
    }
  }
}

export function mountEditor(root, ctx) {
  const {
    state, lookupHerb, runes, symbolLabels, herbDB, aliasMap, templates, defaultTemplateId, parchmentTextures,
    // v0.11.1: forwarded from main.js's versioned dynamic imports.
    ITEM_LABELS, ALL_ITEM_KEYS, BORDER_STYLES, BORDER_STYLE_LABELS,
    makeZone, ZONE_LAYOUT_MODES, ZONE_WIDTHS, defaultLayout, DEFAULT_SECTION_TITLES,
    // v0.14: illustration library + auto-match.
    illustrations = [], herbAutoMatch = {}, herbCategoryFallback = {},
    // v1.0.4: PNG export of the print-stage (lazy-loads html2canvas).
    exportPng,
    // v1.1.6: forwarded from main.js's versioned dynamic imports.
    printLabel, truncateAtWordBoundary,
    // maintainability-04: forwarded from main.js's versioned dynamic imports.
    // Do not add this back as a static import; see the note at the top of
    // this file on why cross-module references travel through ctx.
    rankSuggestions,
  } = ctx;
  const tmpl = templates[state.get().templateId];

  // FACTORY_PRESETS uses defaultLayout/makeZone/DEFAULT_SECTION_TITLES, so
  // it has to be built inside mountEditor where those are in scope.
  const FACTORY_PRESETS = [
    {
      id: 'preset-standard',
      name: 'Standard (two-sided)',
      layout: () => defaultLayout(undefined, templates, defaultTemplateId),
      sectionTitles: { ...DEFAULT_SECTION_TITLES },
    },
    {
      id: 'preset-three-col',
      name: 'Three-column back',
      layout: () => {
        const l = defaultLayout(undefined, templates, defaultTemplateId);
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
      // Zone geometry (id/layoutMode/width/align) is derived from the
      // template descriptor via defaultLayout() instead of hand-written, so
      // it can't drift from data/label-templates.js the way preset-standard
      // and preset-three-col already don't (bar-raise
      // generative-art-schema-driven-correctness-01). Only the per-zone item
      // curation below is this preset's own choice.
      layout: () => {
        const baseline = defaultLayout(undefined, templates, defaultTemplateId);
        const MINIMAL_ITEMS = {
          'front-left':   ['symbol'],
          'front-center': ['herb-name', 'latin', 'divider-bot', 'description'],
          'front-right':  ['botanical'],
        };
        const front = baseline.front.map(z => ({ ...z, items: [...(MINIMAL_ITEMS[z.id] ?? [])] }));
        const placed = new Set(Object.values(MINIMAL_ITEMS).flat());
        const hidden = ALL_ITEM_KEYS.filter(k => !placed.has(k));
        return { front, back: [], hidden };
      },
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
    `, true)}

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
        <label class="field-label">Botanical Illustration</label>
        <div id="illustrationPicker" class="illustration-picker" data-illustration-picker></div>
        <div class="desc-hint">Auto-picks based on the herb name. Click to choose any illustration from the library.</div>
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
      <button id="btn-export-png" class="btn-secondary" type="button">Export PNG</button>
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
  const exportBtn  = $('btn-export-png');
  const resetBtn   = $('btn-reset');

  // localStorage failures raised by persist.js / saved-labels.js land here as
  // a one-line warning. 'read' (a corrupted entry, data is lost) and 'write'
  // (quota exceeded, best effort) get different wording so the user knows
  // whether something they had is gone versus something they're about to
  // lose (bar-raise reliability-01). 'clear' is the reset path failing to
  // remove the stored label, which reads back on the next load (reliability-02).
  const STORAGE_ERROR_MSG = {
    read:  'Could not read your saved data. It may be corrupted; starting fresh.',
    clear: 'Could not clear the stored label. The old one may come back on reload.',
    write: 'Storage is full. Changes may not save. Delete unused saved labels.',
  };
  document.addEventListener('yaa:storage-error', (e) => {
    statusMsg.textContent = STORAGE_ERROR_MSG[e.detail?.op] || STORAGE_ERROR_MSG.write;
    statusMsg.className = 'status-msg warn';
  });
  // A state-listener throw (usually the preview paint) used to freeze the
  // preview with nothing on screen and nothing visible to the user
  // (bar-raise reliability-02); state.js now broadcasts this event from its
  // own catch so the status line can say something instead of going silent.
  document.addEventListener('yaa:render-error', () => {
    statusMsg.textContent = 'The preview failed to update. Your edits are still saved; try again or reload.';
    statusMsg.className = 'status-msg warn';
  });
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
  const illustrationMount = root.querySelector('[data-illustration-picker]');

  wireAccordion(root);

  // --- Herb autocomplete (unchanged from v0.10) ---
  const autocompleteRoot = root.querySelector('[data-herb-autocomplete]');
  const suggestList      = root.querySelector('[data-herb-suggestions]');
  const titleCase = (s) => s.replace(/(^|\s)\w/g, c => c.toUpperCase());

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

  // Scoring lives in src/util/suggest.js (maintainability-04) so it can run
  // without a DOM and carry its own test coverage; this wrapper just gives
  // it the editor's live search index.
  function filterSuggestions(q) {
    return rankSuggestions(q, searchIndex);
  }

  function renderSuggestions(items) {
    activeSuggestions = items;
    suggestionIdx = -1;
    if (items.length === 0) { suggestList.hidden = true; return; }
    suggestList.innerHTML = items.map((it, i) => {
      const latin = it.latin ? `<span class="herb-suggest__latin">${esc(it.latin)}</span>` : '';
      const aliasTag = it.alias ? '<span class="herb-suggest__alias">alias</span>' : '';
      return `<li class="herb-suggest" role="option" data-idx="${i}" data-canonical="${esc(it.canonical)}">
        <span class="herb-suggest__name">${esc(it.display)}</span>${latin}${aliasTag}
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
  // v1.0.4 perf: tiles reference the ~1 KB thumbs in data/textures/thumbs/
  // (scripts/make-texture-thumbs.py), not the 16.6 MB print-res sources that
  // used to attach here and fetch before the Style panel was ever opened.
  // The whole thumb set is ~18 KB, so eager assignment is fine; only the
  // label render itself reads the full-res files.
  for (const t of (parchmentTextures ?? [])) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'parchment-tile';
    btn.dataset.parchmentId = t.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', t.label);
    btn.setAttribute('title', t.label);
    if (t.file) {
      btn.style.backgroundImage = `url('data/textures/thumbs/${t.file}')`;
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
  // Bundle of cross-module deps each mounter needs. Avoids re-passing every
  // arg. esc and preserveScroll ride in here too (2026-09-04 split) so the
  // five extracted mounter modules never need their own static import or
  // their own dynamic-import cache-bust wiring for either helper.
  const deps = {
    ITEM_LABELS, ALL_ITEM_KEYS, BORDER_STYLES, BORDER_STYLE_LABELS,
    makeZone, ZONE_LAYOUT_MODES, ZONE_WIDTHS, defaultLayout, DEFAULT_SECTION_TITLES,
    FACTORY_PRESETS, esc, preserveScroll,
  };
  // Each mounter used to run back to back with no try/catch, so one throw
  // propagated to main().catch and replaced the whole page with the failure
  // screen over a single broken panel (bar-raise reliability-01). mountSafely
  // logs and disables only the panel that failed; the rest of the editor
  // keeps working.
  mountSafely('Layout designer', designerMount, () => mountLayoutDesigner(designerMount, state, deps));
  mountSafely('Section titles', titleEditorMount, () => mountTitleEditor(titleEditorMount, state, deps));
  mountSafely('Custom sections', customItemsMount, () => mountCustomItems(customItemsMount, state, deps));
  mountSafely('Layout presets', [presetSelect, presetSaveBtn, presetActions], () => mountPresets({ select: presetSelect, saveBtn: presetSaveBtn, actions: presetActions }, state, deps));
  mountSafely('Illustration picker', illustrationMount, () => mountIllustrationPicker(illustrationMount, state, { illustrations, herbAutoMatch, herbCategoryFallback, esc, preserveScroll, resolveIllustration }));

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
    // normalizeState pads runes to exactly 3, but guard anyway: a malformed
    // snapshot reaching here must not throw and take the whole sync down.
    const runes = Array.isArray(s.runes) ? s.runes : [];
    for (let i = 0; i < 3; i++) {
      runeChar[i].value = runes[i]?.c ?? '';
      runeMean[i].value = runes[i]?.m ?? '';
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
    // The live preview used to run its own lookupHerb pass (longest-key-first
    // prefix/contains match) independently of the dropdown's rankSuggestions
    // scoring, so the art shown while typing could name a different herb than
    // the suggestion ranked first (bar-raise 2026-09-09 architecture-02).
    // Drive the preview off the same ranked list the dropdown renders, so
    // they can't disagree; the lookup still runs through lookupHerb (same as
    // selectSuggestion) to get the full herb record, not just the name match.
    const suggestions = filterSuggestions(herbInput.value);
    renderSuggestions(suggestions);
    const top = suggestions[0];
    const h = top ? lookupHerb(top.canonical) : null;
    if (h) state.set({ botanical: h.botanical, icon: h.icon ?? null });
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
      description: truncateAtWordBoundary(found.desc, tmpl.descMaxChars),
      accent: found.accent,
      symbol: found.symbol,
      botanical: found.botanical,
      illustration: null,
      icon: found.icon ?? null,
      runes: found.runes.map(r => ({ c: r.c, m: r.m })),
      descFull:     truncateAtWordBoundary(found.descFull ?? found.desc, tmpl.descFullMaxChars),
      historicUses: truncateAtWordBoundary(found.historicUses ?? '', tmpl.historicMaxChars),
      compounds:    truncateAtWordBoundary(found.compounds    ?? '', tmpl.compoundsMaxChars),
      cautions:     truncateAtWordBoundary(found.cautions     ?? '', tmpl.cautionsMaxChars),
      pairings:     truncateAtWordBoundary(found.pairings     ?? '', tmpl.pairingsMaxChars),
    });
    syncFromState();
    statusMsg.textContent = 'Found. Customize freely.';
    statusMsg.className = 'status-msg ok';
  });

  printBtn.addEventListener('click', printLabel);

  exportBtn.addEventListener('click', async () => {
    if (typeof exportPng !== 'function' || exportBtn.disabled) return;
    const name = (state.get().herbName || 'apothecary-label').trim();
    // reliability-04 (2026-09-23): one export at a time. A second click while
    // the renderer was still downloading re-entered the loader.
    exportBtn.disabled = true;
    try {
      await exportPng(name + '.png');
    } finally {
      exportBtn.disabled = false;
    }
  });

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

function section(id, title, innerHtml, open = false) {
  const openCls = open ? ' ed-section--open' : '';
  const aria    = open ? 'true' : 'false';
  return `
    <section class="ed-section${openCls}" data-section="${id}">
      <button class="ed-section-head" type="button" aria-expanded="${aria}">
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

// v0.15.4: shared helper, forwarded into the split-out mounters via deps.
// State changes trigger re-paints that rebuild innerHTML; without scroll
// preservation, the editor-card resets to the top every time. Each mount
// paint wraps its body with preserveScroll().
function preserveScroll(root, fn) {
  const host = root.closest('.editor-card');
  const top = host ? host.scrollTop : 0;
  fn();
  if (host) host.scrollTop = top;
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
