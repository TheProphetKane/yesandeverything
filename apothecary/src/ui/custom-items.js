// custom-items.js - user-defined custom label sections: title + body +
// delete. Adding a new custom item is handled by the "+ New Custom Section"
// button in mountEditor's own template (it adds the item to state.customItems
// and drops the new key into layout.hidden); this module only renders and
// edits the ones that already exist.
//
// Split out of editor.js (bar-raise maintainability-01, 2026-09-04): esc and
// preserveScroll travel through the deps object mountEditor builds, not a
// static import (see editor.js's top-of-file note on why cross-module
// references travel through ctx/deps in this app).

export function mountCustomItems(root, state, deps) {
  const { esc, preserveScroll } = deps;
  function paint() { preserveScroll(root, () => {
    const items = state.get().customItems ?? [];
    if (items.length === 0) {
      root.innerHTML = '<div class="custom-items-empty">No custom sections yet. Click below to add one.</div>';
      return;
    }
    root.innerHTML = items.map(item => `
      <div class="custom-item-card" data-custom-id="${esc(item.id)}">
        <div class="custom-item-head">
          <input type="text" class="custom-item-title field-input" data-custom-title value="${esc(item.title)}" placeholder="Section title" />
          <button type="button" class="custom-item-remove" data-custom-remove aria-label="Delete custom section">×</button>
        </div>
        <textarea class="custom-item-body field-input" data-custom-body rows="2" placeholder="Section body text">${esc(item.body)}</textarea>
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
  }); }
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
  paint();
  state.subscribe(paint);
}
