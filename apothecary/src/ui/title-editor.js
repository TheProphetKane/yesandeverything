// title-editor.js - per-section inline text input for the label's section
// titles. Empty value = no title rendered. The historic / notes / compounds
// / cautions / pairings keys are always shown. back-desc-full is shown too
// as an "optional title" so the user can opt into wrapping the Full
// Description in a section card.
//
// Split out of editor.js (bar-raise maintainability-01, 2026-09-04): esc and
// preserveScroll travel through the deps object mountEditor builds, not a
// static import (see editor.js's top-of-file note on why cross-module
// references travel through ctx/deps in this app).

// The five editable section titles + the optional one (back-desc-full).
const TITLE_FIELDS = [
  { key: 'historic',        label: 'Traditional Uses' },
  { key: 'notes',           label: 'Notes (combined)' },
  { key: 'compounds',       label: 'Compounds' },
  { key: 'cautions',        label: 'Cautions' },
  { key: 'pairings',        label: 'Pairings' },
  { key: 'back-desc-full',  label: 'Full Description (optional title)' },
];

export function mountTitleEditor(root, state, deps) {
  const { esc } = deps;

  // performance-01 (2026-09-23): the rows are built once. Every state change
  // used to replace root.innerHTML, which destroyed the input that had focus
  // on each keystroke; now a change syncs values onto the existing inputs,
  // the way editor.js's syncFromState does for the main fields.
  function build() {
    root.innerHTML = TITLE_FIELDS.map(field => `
        <div class="title-editor-row">
          <span class="title-editor-label">${field.label}</span>
          <input type="text" class="title-editor-input" data-title-key="${field.key}" value="" placeholder="${esc(field.key === 'back-desc-full' ? '(no title)' : '(hidden)')}" />
        </div>
      `).join('');
    root.querySelectorAll('[data-title-key]').forEach(inp => {
      inp.addEventListener('input', () => {
        const next = { ...(state.get().sectionTitles ?? {}) };
        next[inp.dataset.titleKey] = inp.value;
        state.set({ sectionTitles: next });
      });
    });
  }

  function sync() {
    const titles = state.get().sectionTitles ?? {};
    root.querySelectorAll('[data-title-key]').forEach(inp => {
      const v = titles[inp.dataset.titleKey] ?? '';
      if (inp.value !== v) inp.value = v;
    });
  }

  build();
  sync();
  state.subscribe(sync);
}
