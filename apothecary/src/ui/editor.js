// editor.js - left panel: form fields, swatches, size picker, back-label
// toggle, placement table, herb autocomplete, visual symbol picker, visual
// rune pickers, per-field reset, PNG export, print, reset.

import { printLabel } from '../util/print.js';
import { exportPng } from '../util/export-png.js';

const SWATCH_COLORS = [
  '#C4922A', '#7B5EA7', '#2D6A4F', '#5C7A5A', '#8B1A1A',
  '#4A3F6B', '#C97BA8', '#C4580A', '#B8860B', '#6B3A2A',
];

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
  { key: 'nutrition',    label: 'Notes' },
  { key: 'pairings',     label: 'Pairings' },
];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Tiny reset-button next to each field. Reverts that field to the current
// herb's database default.
function resetBtnHtml(field) {
  return `<button type="button" class="field-reset" data-reset-field="${field}" title="Reset to herb default" aria-label="Reset ${field}">↺</button>`;
}

export function mountEditor(root, ctx) {
  const { state, lookupHerb, runes, symbols, symbolLabels, herbDB, aliasMap, templates, runeMeanings } = ctx;
  const tmpl = templates[state.get().templateId];
  const runeMeanFor = (char) => runeMeanings?.[char] ?? '';

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
        <div class="field-label-row">
          <label class="field-label" for="fLatin">Latin Name</label>
          ${resetBtnHtml('latin')}
        </div>
        <input id="fLatin" class="field-input italic-input" type="text" placeholder="Botanical Latin name" />
      </div>

      <div class="field">
        <div class="field-label-row">
          <label class="field-label" for="fProps">Properties</label>
          ${resetBtnHtml('props')}
        </div>
        <input id="fProps" class="field-input" type="text" placeholder="Healing, Sleep, Peace..." />
      </div>

      <div class="field">
        <div class="field-label-row">
          <label class="field-label" for="fDesc">Front Description</label>
          ${resetBtnHtml('description')}
        </div>
        <textarea id="fDesc" class="field-input" rows="6" maxlength="${tmpl.descMaxChars}" placeholder="A brief poetic description..."></textarea>
        <div id="descCounter" class="desc-counter">0 / ${tmpl.descMaxChars}</div>
        <div class="desc-hint">Label fits ${tmpl.descLineHint}. Keep it concise.</div>
      </div>

      <div class="field">
        <div class="field-label-row">
          <label class="field-label">Accent Color</label>
          ${resetBtnHtml('accent')}
        </div>
        <div id="swatches" class="swatches"></div>
      </div>

      <div class="field">
        <div class="field-label-row">
          <label class="field-label">Celtic Symbol</label>
          ${resetBtnHtml('symbol')}
        </div>
        <div id="symbol-picker" class="symbol-grid"></div>
      </div>

      <div class="field">
        <div class="field-label-row">
          <label class="field-label">Rune 1</label>
          ${resetBtnHtml('rune1')}
        </div>
        <div class="rune-slot" data-rune-slot="0">
          <button type="button" class="rune-current" data-rune-toggle="0">
            <span class="rune-current-char"></span>
            <span class="rune-current-name"></span>
          </button>
          <input class="field-input rune-meaning" data-rune-meaning="0" type="text" placeholder="Meaning" />
        </div>
        <div class="rune-popover" data-rune-popover="0" hidden></div>
      </div>
      <div class="field">
        <div class="field-label-row">
          <label class="field-label">Rune 2</label>
          ${resetBtnHtml('rune2')}
        </div>
        <div class="rune-slot" data-rune-slot="1">
          <button type="button" class="rune-current" data-rune-toggle="1">
            <span class="rune-current-char"></span>
            <span class="rune-current-name"></span>
          </button>
          <input class="field-input rune-meaning" data-rune-meaning="1" type="text" placeholder="Meaning" />
        </div>
        <div class="rune-popover" data-rune-popover="1" hidden></div>
      </div>
      <div class="field">
        <div class="field-label-row">
          <label class="field-label">Rune 3</label>
          ${resetBtnHtml('rune3')}
        </div>
        <div class="rune-slot" data-rune-slot="2">
          <button type="button" class="rune-current" data-rune-toggle="2">
            <span class="rune-current-char"></span>
            <span class="rune-current-name"></span>
          </button>
          <input class="field-input rune-meaning" data-rune-meaning="2" type="text" placeholder="Meaning" />
        </div>
        <div class="rune-popover" data-rune-popover="2" hidden></div>
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
        <div class="desc-hint">Optional second label with full description, traditional uses, notes, and pairings. Prints alongside the front on a single 8.5x11 sheet.</div>
      </div>

      <div id="back-fields" class="back-fields" hidden>
        <div class="field">
          <div class="field-label-row">
            <label class="field-label" for="fDescFull">Full Description</label>
            ${resetBtnHtml('descFull')}
          </div>
          <textarea id="fDescFull" class="field-input" rows="4" maxlength="${tmpl.descFullMaxChars}" placeholder="The original poetic description, full length..."></textarea>
          <div id="descFullCounter" class="desc-counter">0 / ${tmpl.descFullMaxChars}</div>
        </div>
        <div class="field">
          <div class="field-label-row">
            <label class="field-label" for="fHistoric">Traditional Uses (folk + modern applications)</label>
            ${resetBtnHtml('historicUses')}
          </div>
          <textarea id="fHistoric" class="field-input" rows="3" maxlength="${tmpl.historicMaxChars}" placeholder="Druidic dawn-rite tea. Strewn on Beltane fires..."></textarea>
          <div id="historicCounter" class="desc-counter">0 / ${tmpl.historicMaxChars}</div>
        </div>
        <div class="field">
          <div class="field-label-row">
            <label class="field-label" for="fNutrition">Notes (active compounds, effects)</label>
            ${resetBtnHtml('nutrition')}
          </div>
          <textarea id="fNutrition" class="field-input" rows="2" maxlength="${tmpl.nutritionMaxChars}" placeholder="Apigenin, bisabolol. Mild sedative. Caffeine-free."></textarea>
          <div id="nutritionCounter" class="desc-counter">0 / ${tmpl.nutritionMaxChars}</div>
        </div>
        <div class="field">
          <div class="field-label-row">
            <label class="field-label" for="fPairings">Good Pairings</label>
            ${resetBtnHtml('pairings')}
          </div>
          <input id="fPairings" class="field-input" type="text" maxlength="${tmpl.pairingsMaxChars}" placeholder="Honey, Lavender, Lemon balm, Vanilla" />
          <div id="pairingsCounter" class="desc-counter">0 / ${tmpl.pairingsMaxChars}</div>
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

      <button id="btn-print"  class="btn-secondary">Print Label</button>
      <button id="btn-export-png" class="btn-secondary">Save as PNG</button>
      <button id="btn-reset"  class="btn-ghost" type="button">Reset to Defaults</button>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const herbInput  = $('herbName');
  const latinInput = $('fLatin');
  const propsInput = $('fProps');
  const descInput  = $('fDesc');
  const descCounter = $('descCounter');
  const sizeSel    = $('fSize');
  const swatchBox  = $('swatches');
  const symbolGrid = $('symbol-picker');
  const autofillBtn = $('btn-autofill');
  const statusMsg  = $('status-msg');
  const printBtn   = $('btn-print');
  const exportBtn  = $('btn-export-png');
  const resetBtn   = $('btn-reset');

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

  const placementCheckboxes = root.querySelectorAll('[data-placement]');
  const runeMeaningInputs   = [0, 1, 2].map(i => root.querySelector(`[data-rune-meaning="${i}"]`));
  const runeToggleBtns      = [0, 1, 2].map(i => root.querySelector(`[data-rune-toggle="${i}"]`));
  const runePopovers        = [0, 1, 2].map(i => root.querySelector(`[data-rune-popover="${i}"]`));

  // --- Herb autocomplete ---
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

  // --- Size select ---
  for (const sz of tmpl.sizes) {
    const opt = document.createElement('option');
    opt.value = sz.id;
    opt.textContent = sz.label;
    sizeSel.appendChild(opt);
  }

  // --- Visual symbol picker ---
  function renderSymbolGrid() {
    const accent = state.get().accent;
    const cur = state.get().symbol;
    symbolGrid.innerHTML = Object.keys(symbols).map(id => `
      <button type="button" class="sym-tile ${id === cur ? 'selected' : ''}" data-symbol="${id}" title="${esc(symbolLabels[id] ?? id)}" aria-label="${esc(symbolLabels[id] ?? id)}">
        ${symbols[id](accent)}
        <span class="sym-tile-label">${esc(symbolLabels[id] ?? id)}</span>
      </button>
    `).join('');
  }

  // --- Visual rune pickers (popover per slot) ---
  function renderRunePopover(slotIdx) {
    const accent = state.get().accent;
    const cur = state.get().runes[slotIdx]?.c;
    runePopovers[slotIdx].innerHTML = runes.map(r => `
      <button type="button" class="rune-tile ${r.c === cur ? 'selected' : ''}" data-rune-char="${r.c}" data-rune-slot="${slotIdx}" title="${esc(r.n)} — ${esc(runeMeanFor(r.c))}">
        <span class="rune-tile-char" style="color:${accent}">${esc(r.c)}</span>
        <span class="rune-tile-name">${esc(r.n)}</span>
      </button>
    `).join('');
  }
  function refreshRuneCurrent(slotIdx) {
    const c = state.get().runes[slotIdx]?.c ?? '';
    const r = runes.find(x => x.c === c);
    const btn = runeToggleBtns[slotIdx];
    btn.querySelector('.rune-current-char').textContent = c;
    btn.querySelector('.rune-current-char').style.color = state.get().accent;
    btn.querySelector('.rune-current-name').textContent = r ? r.n : '—';
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

  // --- Sync state -> UI ---
  function syncFromState() {
    const s = state.get();
    herbInput.value  = s.herbName;
    latinInput.value = s.latin;
    propsInput.value = s.props;
    descInput.value  = s.description;
    sizeSel.value    = s.sizeId;
    colorPicker.value = s.accent;
    for (let i = 0; i < 3; i++) {
      runeMeaningInputs[i].value = s.runes[i]?.m ?? '';
      refreshRuneCurrent(i);
    }
    backToggle.checked = !!s.backEnabled;
    backFieldsBox.hidden = !s.backEnabled;
    descFullInput.value  = s.descFull ?? '';
    historicInput.value  = s.historicUses ?? '';
    nutritionInput.value = s.nutrition ?? '';
    pairingsInput.value  = s.pairings ?? '';
    placementCheckboxes.forEach(cb => {
      cb.checked = !!(s.placement?.[cb.dataset.placement]?.[cb.dataset.side]);
    });
    updateAllCounters();
    updateSwatchSelection();
    renderSymbolGrid();
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

  // --- Input wiring ---
  herbInput.addEventListener('input', () => {
    state.set({ herbName: herbInput.value });
    const h = lookupHerb(herbInput.value);
    if (h) state.set({ botanical: h.botanical, icon: h.icon ?? null });
  });
  latinInput.addEventListener('input', () => state.set({ latin: latinInput.value }));
  propsInput.add