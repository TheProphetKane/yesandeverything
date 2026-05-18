// shop-name.js — inline edit affordance for the shop name in the header.
// Button-based so it's keyboard accessible (Tab → Enter).

export function mountShopName(root, state) {
  const display = root.querySelector('[data-shop-display]');
  const input = root.querySelector('[data-shop-input]');
  const editBtn = root.querySelector('[data-shop-edit]');

  function startEdit() {
    display.hidden = true;
    editBtn.hidden = true;
    input.hidden = false;
    input.value = state.get().shopName;
    input.focus();
    input.select();
  }

  function finishEdit() {
    const next = input.value.trim() || state.get().shopName;
    state.set({ shopName: next });
    display.textContent = next;
    input.hidden = true;
    display.hidden = false;
    editBtn.hidden = false;
  }

  display.addEventListener('click', startEdit);
  editBtn.addEventListener('click', startEdit);
  editBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(); }
  });
  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = state.get().shopName; input.blur(); }
  });

  // Sync display if state changes from elsewhere (e.g. localStorage restore).
  state.subscribe((s) => { display.textContent = s.shopName; });
  display.textContent = state.get().shopName;
}
