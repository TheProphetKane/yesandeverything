// illustration-picker.js - reusable line-art library scraped from
// spicejungle.com. Each entry has { keyword, label, file }. The user can:
//   - Stay on auto (default): herb name maps to keyword via herbAutoMatch
//   - Click any thumbnail to override: state.illustration = keyword
//   - Click "Back to Auto" to clear the override
//
// Split out of editor.js (bar-raise maintainability-01, 2026-09-04): esc and
// preserveScroll travel through the deps object mountEditor builds, not a
// static import (see editor.js's top-of-file note on why cross-module
// references travel through ctx/deps in this app).
//
// resolveIllustration (src/util/resolve-illustration.js) is the same
// three-step resolution order render.js's botanical item renderer uses,
// forwarded here per the same deps-not-static-import rule (bar-raise
// 2026-09-09 architecture-01: the two used to reimplement the chain
// independently and could drift).

export function mountIllustrationPicker(root, state, { illustrations, herbAutoMatch, herbCategoryFallback, esc, preserveScroll, resolveIllustration }) {

  function currentResolution() {
    return resolveIllustration(state.get(), { herbAutoMatch, herbCategoryFallback });
  }

  let searchTerm = '';
  let gridOpen = false;
  let justOpened = false;  // v0.15.5: latch so we focus the search input
                            // only on the click-to-open, not on every paint

  function paint() { preserveScroll(root, () => {
    // v0.15.7: also preserve the library grid's internal scrollTop. Picking a
    // tile rebuilds the picker innerHTML, which destroys the existing grid
    // and resets its own overflow-y scroll to 0. Capture before rebuild,
    // restore after.
    const gridBefore = root.querySelector('[data-illu-grid]');
    const gridScroll = gridBefore ? gridBefore.scrollTop : 0;

    const res = currentResolution();
    const label = res.keyword
      ? (illustrations.find(i => i.keyword === res.keyword)?.label || res.keyword)
      : '(none)';
    const statusClass = res.kind === 'override' ? 'is-locked' : (res.kind === 'auto' || res.kind === 'category') ? 'is-auto' : 'is-none';
    const statusText = res.kind === 'override'
      ? `Locked to "${label}"`
      : res.kind === 'auto'
      ? `Auto from herb name: "${label}"`
      : res.kind === 'category'
      ? `Auto by category: "${label}"`
      : 'No art for this herb yet';

    root.innerHTML = `
      <div class="illu-current ${statusClass}">
        <div class="illu-current-thumb">
          ${res.keyword
            ? `<img src="data/illustrations/${esc(res.keyword)}.png" alt="${esc(label)}" />`
            : '<div class="illu-current-thumb-empty">no art</div>'}
        </div>
        <div class="illu-current-meta">
          <div class="illu-current-label">${esc(label)}</div>
          <div class="illu-current-status">${esc(statusText)}</div>
          <div class="illu-current-actions">
            <button type="button" class="illu-toggle-grid" data-illu-toggle>${gridOpen ? 'Close library' : 'Browse library'}</button>
            ${res.kind === 'override'
              ? '<button type="button" class="illu-reset-auto" data-illu-reset>Back to Auto</button>'
              : ''}
          </div>
        </div>
      </div>
      <div class="illu-grid-wrap" ${gridOpen ? '' : 'hidden'}>
        <input type="search" class="illu-search field-input" placeholder="Filter (e.g. lobster, chiles, peppercorns)..." data-illu-search value="${esc(searchTerm)}" />
        <div class="illu-grid" data-illu-grid>
          ${buildGridHtml(res.keyword)}
        </div>
      </div>
    `;

    root.querySelector('[data-illu-toggle]').addEventListener('click', () => {
      gridOpen = !gridOpen;
      justOpened = gridOpen;   // only when transitioning to OPEN
      paint();
    });
    const resetBtn = root.querySelector('[data-illu-reset]');
    if (resetBtn) resetBtn.addEventListener('click', () => state.set({ illustration: null }));

    const searchInput = root.querySelector('[data-illu-search]');
    if (searchInput) {
      // v0.15.5: filtering the grid changes its height which would yank
      // the editor-card scroll. Wrap each filter update in preserveScroll
      // so the user's scroll position stays put while they type.
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value;
        preserveScroll(root, () => {
          const grid = root.querySelector('[data-illu-grid]');
          grid.innerHTML = buildGridHtml(res.keyword);
          wireTiles();
        });
      });
      // v0.15.5: focus only on the click-to-open transition, not on every
      // re-paint. Without the latch, typing in any other editor input would
      // re-paint this picker and steal focus down here.
      if (gridOpen && justOpened) {
        setTimeout(() => searchInput.focus(), 30);
        justOpened = false;
      }
    }
    wireTiles();
    // v0.15.7: restore the grid's internal scrollTop after rebuild so picking
    // an item doesn't kick the library list back to the top.
    const gridAfter = root.querySelector('[data-illu-grid]');
    if (gridAfter && gridScroll) gridAfter.scrollTop = gridScroll;
  }); }

  function buildGridHtml(currentKeyword) {
    const q = searchTerm.toLowerCase().trim();
    const filtered = q
      ? illustrations.filter(i => i.keyword.includes(q) || i.label.toLowerCase().includes(q))
      : illustrations;
    if (filtered.length === 0) {
      return '<div class="illu-grid-empty">No matches</div>';
    }
    return filtered.map(it => `
      <button type="button" class="illu-tile${it.keyword === currentKeyword ? ' is-selected' : ''}"
              data-illu-pick="${esc(it.keyword)}" title="${esc(it.label)}">
        <img src="data/illustrations/${esc(it.file)}" alt="${esc(it.label)}" loading="lazy"/>
        <span class="illu-tile-label">${esc(it.label)}</span>
      </button>
    `).join('');
  }

  function wireTiles() {
    root.querySelectorAll('[data-illu-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.set({ illustration: btn.dataset.illuPick });
      });
    });
  }

  paint();
  state.subscribe(paint);
}
