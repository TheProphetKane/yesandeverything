// shop-name.js - inline edit affordance for the shop name in the header,
// plus a color picker (v0.8.2) so users can tint the title independently of
// the theme's gold-bright.
//
// State fields touched: shopName, shopColor. Both persist via localStorage.

export function mountShopName(root, state) {
  const display  = root.querySelector('[data-shop-display]');
  const input    = root.querySelector('[data-shop-input]');
  const editBtn  = root.querySelector('[data-shop-edit]');
  const colorBtn = root.querySelector('[data-shop-color-btn]');
  const colorInp = root.querySelector('[data-shop-color]');

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

  function applyColor(c) {
    if (!c) return;
    display.style.color = c;
    input.style.color = c;
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

  if (colorBtn && colorInp) {
    // Clicking the swatch button opens the hidden color input. The input
    // emits "input" events live as the user drags the picker; we apply
    // immediately for live preview.
    colorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      colorInp.click();
    });
    colorInp.addEventListener('input', () => {
      const c = colorInp.value;
      state.set({ shopColor: c });
      colorBtn.style.background = c;
      applyColor(c);
    });
  }

  // Sync display if state changes from elsewhere (e.g. localStorage restore).
  state.subscribe((s) => {
    display.textContent = s.shopName;
    if (s.shopColor) {
      applyColor(s.shopColor);
      if (colorBtn) colorBtn.style.background = s.shopColor;
      if (colorInp) colorInp.value = s.shopColor;
    }
  });

  // Initial paint
  const s0 = state.get();
  display.textContent = s0.shopName;
  if (s0.shopColor) {
    applyColor(s0.shopColor);
    if (colorBtn) colorBtn.style.background = s0.shopColor;
    if (colorInp) colorInp.value = s0.shopColor;
  }
}
