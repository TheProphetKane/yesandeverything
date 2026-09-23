// layout-presets.js - factory presets + user-saved layout presets. User can
// save the current layout + section titles as a named preset, recall any
// preset, and delete user presets (factory presets are read-only).
//
// Split out of editor.js (bar-raise maintainability-01, 2026-09-04): esc
// travels through the deps object mountEditor builds, not a static import
// (see editor.js's top-of-file note on why cross-module references travel
// through ctx/deps in this app).

export function mountPresets({ select, saveBtn, actions }, state, deps) {
  const { esc, FACTORY_PRESETS, DEFAULT_SECTION_TITLES } = deps;
  let lastPresets = null;
  function allPresets() {
    return [
      ...FACTORY_PRESETS.map(p => ({ ...p, kind: 'factory' })),
      ...(state.get().layoutPresets ?? []).map(p => ({ ...p, kind: 'user' })),
    ];
  }

  function paint() {
    lastPresets = state.get().layoutPresets;
    const presets = allPresets();
    select.innerHTML = '<option value="">Load a preset...</option>' +
      presets.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.kind === 'user' ? ' (saved)' : ''}</option>`).join('');

    // Show delete button only if the currently-selected preset is a user one.
    const cur = select.value;
    const curPreset = presets.find(p => p.id === cur);
    if (curPreset && curPreset.kind === 'user') {
      actions.hidden = false;
      actions.innerHTML = `<button type="button" class="btn-ghost preset-delete-btn" data-delete-preset>Delete "${esc(curPreset.name)}"</button>`;
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
    // A preset snapshots layout + sectionTitles only, not the custom-section
    // bodies. If a custom-XXXX section was deleted since the preset was saved,
    // its key still lingers in the snapshot and would reference a section that
    // no longer exists. Filter those dangling custom keys out on recall so a
    // stale preset can't break the layout. (Nick: filter dangling keys on load,
    // not snapshot-and-restore.)
    const liveCustom = new Set((state.get().customItems ?? []).map(c => c.id));
    const keep = inst => {
      const key = (typeof inst === 'string') ? inst : (inst && inst.key) || '';
      return !key.startsWith('custom-') || liveCustom.has(key);
    };
    for (const side of ['front', 'back']) {
      for (const z of (layout[side] || [])) {
        z.items = (z.items || []).filter(keep);
      }
    }
    layout.hidden = (layout.hidden || []).filter(keep);
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

  // performance-02 (2026-09-23): the select lists presets, so only a change
  // to the presets themselves repaints it.
  paint();
  state.subscribe(s => {
    if (s.layoutPresets === lastPresets) return;
    lastPresets = s.layoutPresets;
    paint();
  });
}
