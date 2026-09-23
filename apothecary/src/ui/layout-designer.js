// layout-designer.js - drag-and-drop zone/item layout designer (front/back
// zones, per-zone width/layoutMode/align, per-instance color/glow, hidden
// rail). v0.9 + v0.11 alignment selector.
//
// Split out of editor.js (bar-raise maintainability-01, 2026-09-04): esc and
// preserveScroll travel through the deps object mountEditor builds, not a
// static import (see editor.js's top-of-file note on why cross-module
// references travel through ctx/deps in this app).

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

export function mountLayoutDesigner(root, state, deps) {
  const { ITEM_LABELS, ALL_ITEM_KEYS, ZONE_LAYOUT_MODES, ZONE_WIDTHS, makeZone, esc, preserveScroll } = deps;
  let dragPayload = null;
  let lastLayout = null;
  let lastCustom = null;

  function paint() { preserveScroll(root, () => {
    const s = state.get();
    const layout = s.layout;
    lastLayout = s.layout;
    lastCustom = s.customItems;
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
          ${(layout.hidden || []).map((item, i) => itemChipHtml(item, 'hidden', i, s.customItems)).join('') || '<div class="layout-hidden-empty">(everything is placed)</div>'}
        </div>
      </div>
    `;

    wireDragAndDrop();
    wireControls();
    wireKeyboardAndClick();
    restoreFocus();
  }); }

  // solo-tool-ux-01: after a move, focus lands on the moved chip in its new
  // zone, so a keyboard user can keep going without hunting for it.
  let pendingFocus = null;
  function restoreFocus() {
    if (!pendingFocus) return;
    const { key, zoneId } = pendingFocus;
    pendingFocus = null;
    const chips = [...root.querySelectorAll('.layout-chip')]
      .filter(c => c.dataset.item === key && c.dataset.fromZone === zoneId);
    const chip = chips[chips.length - 1];
    if (chip) chip.focus();
  }

  function wireKeyboardAndClick() {
    root.querySelectorAll('.layout-chip').forEach(chip => {
      chip.addEventListener('keydown', (e) => {
        if (e.target !== chip) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openMovePopover(chip);
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && chip.dataset.fromZone !== 'hidden') {
          e.preventDefault();
          pendingFocus = { key: chip.dataset.item, zoneId: 'hidden' };
          moveItem(chip.dataset.item, chip.dataset.fromZone, parseInt(chip.dataset.fromIndex, 10), 'hidden', null);
        }
      });
      const label = chip.querySelector('[data-chip-move]');
      if (label) {
        label.addEventListener('click', (e) => {
          e.stopPropagation();
          openMovePopover(chip);
        });
      }
    });
  }

  // The move list: every zone on both sides plus the hidden rail, minus the
  // one the chip is in. Same instance semantics as a drop: moveItem carries
  // the colour and glow with it.
  function openMovePopover(chip) {
    document.querySelectorAll('.layout-move-popover').forEach(p => p.remove());
    const layout = state.get().layout;
    const key = chip.dataset.item;
    const fromZoneId = chip.dataset.fromZone;
    const fromIndex = parseInt(chip.dataset.fromIndex, 10);
    const targets = [];
    for (const side of ['front', 'back']) {
      (layout[side] || []).forEach((z, i) => {
        if (z.id !== fromZoneId) targets.push({ id: z.id, label: `${side === 'front' ? 'Front' : 'Back'} zone ${i + 1}` });
      });
    }
    if (fromZoneId !== 'hidden') targets.push({ id: 'hidden', label: 'Hidden (off the label)' });

    const pop = document.createElement('div');
    pop.className = 'layout-item-picker layout-move-popover';
    pop.setAttribute('role', 'menu');
    pop.innerHTML = `
      <div class="layout-item-picker-title">Move ${esc(labelFor(key, state.get().customItems ?? []))} to</div>
      <div class="layout-item-picker-list">
        ${targets.map(t => `<button type="button" class="layout-pick" role="menuitem" data-move-to="${esc(t.id)}">${esc(t.label)}</button>`).join('')}
      </div>
    `;
    document.body.appendChild(pop);
    const rect = chip.getBoundingClientRect();
    pop.style.position = 'fixed';
    pop.style.top = `${rect.bottom + 6}px`;
    let left = rect.left;
    if (left + pop.offsetWidth > window.innerWidth - 8) left = window.innerWidth - pop.offsetWidth - 8;
    if (left < 8) left = 8;
    pop.style.left = `${left}px`;

    const close = () => { pop.remove(); document.removeEventListener('click', onDocClick); };
    const onDocClick = (e) => { if (!pop.contains(e.target) && e.target !== chip) close(); };
    pop.querySelectorAll('[data-move-to]').forEach(btn => {
      btn.addEventListener('click', () => {
        const toZoneId = btn.dataset.moveTo;
        close();
        pendingFocus = { key, zoneId: toZoneId };
        moveItem(key, fromZoneId, fromIndex, toZoneId, null);
      });
    });
    pop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); chip.focus(); }
    });
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
    const first = pop.querySelector('[data-move-to]');
    if (first) first.focus();
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
          ${(zone.items || []).map((item, i) => itemChipHtml(item, zone.id, i, customItems)).join('')}
        </div>
        <button type="button" class="layout-add-item" data-add-item="${esc(zone.id)}">+ Add Item</button>
      </div>
    `;
  }

  function itemChipHtml(item, fromZoneId, fromIndex, customItems) {
    // v0.15: items can be { key, color, glow } objects or legacy bare strings.
    const inst = (typeof item === 'string') ? { key: item } : (item || { key: '' });
    const key  = inst.key;
    const label = labelFor(key, customItems);
    const customCls = key.startsWith('custom-') ? ' layout-chip--custom' : '';
    const colorDot = inst.color
      ? `style="background:${esc(inst.color)}"`
      : 'data-default';
    const glowDot = inst.glow
      ? `style="background:${esc(inst.glow)}"`
      : 'data-default';
    // Color + glow dots only appear in zones (not in the hidden rail) since
    // they're per-instance settings. Hidden chips are just key carriers.
    const dots = (fromZoneId === 'hidden') ? '' : `
      <button type="button" class="layout-chip-dot layout-chip-dot--color"
              data-color-pick data-from-zone="${esc(fromZoneId)}" data-from-index="${fromIndex}"
              title="Set color (current: ${esc(inst.color || 'default')})" ${colorDot}>&nbsp;</button>
      <button type="button" class="layout-chip-dot layout-chip-dot--glow"
              data-glow-pick data-from-zone="${esc(fromZoneId)}" data-from-index="${fromIndex}"
              title="Set glow (current: ${esc(inst.glow || 'none')})" ${glowDot}>*</button>
    `;
    // solo-tool-ux-01 (2026-09-23): a chip is focusable and carries a
    // keyboard path (Enter or Space opens the move list, Delete hides) and a
    // click path (the label opens the same list), both moving the real
    // instance through moveItem. A chip in the hidden rail gets no hide
    // button, since hiding a hidden item did nothing.
    const hideBtn = (fromZoneId === 'hidden') ? '' : `
      <button type="button" class="layout-chip-hide"
              data-hide-item="${esc(key)}" data-from-zone="${esc(fromZoneId)}" data-from-index="${fromIndex}"
              aria-label="Hide this item">×</button>`;
    const where = (fromZoneId === 'hidden') ? 'hidden' : 'placed';
    return `<div class="layout-chip${customCls}" draggable="true" tabindex="0" role="button"
                 data-item="${esc(key)}" data-from-zone="${esc(fromZoneId)}" data-from-index="${fromIndex}"
                 aria-label="${esc(label)}, ${where}. Enter opens the move list${where === 'placed' ? ', Delete hides it' : ''}."
                 title="Drag to move, or click the name to pick a zone">
      <span class="layout-chip-handle" aria-hidden="true">⋮⋮</span>
      <span class="layout-chip-label" data-chip-move>${esc(label)}</span>
      ${dots}${hideBtn}
    </div>`;
  }


  function wireDragAndDrop() {
    root.querySelectorAll('.layout-chip').forEach(chip => {
      chip.addEventListener('dragstart', (e) => {
        dragPayload = {
          item: chip.dataset.item,
          fromZoneId: chip.dataset.fromZone,
          fromIndex: parseInt(chip.dataset.fromIndex, 10),
        };
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
        let insertHint = null;
        if (overChip) {
          // v0.15: insertHint is now the DOM index of overChip in the destination
          // zone (string form), with optional :after suffix. Index-based so it
          // works even when the dragged item shares a key with overChip.
          const overIdx = overChip.dataset.fromIndex;
          if (overIdx != null) {
            const rect = overChip.getBoundingClientRect();
            const after = (e.clientY - rect.top) > rect.height / 2;
            insertHint = after ? `${overIdx}:after` : overIdx;
          }
        }
        moveItem(dragPayload.item, dragPayload.fromZoneId, dragPayload.fromIndex, toZoneId, insertHint);
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
        moveItem(dragPayload.item, dragPayload.fromZoneId, dragPayload.fromIndex, 'hidden', null);
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
        const fromIdx = parseInt(btn.dataset.fromIndex, 10);
        moveItem(btn.dataset.hideItem, btn.dataset.fromZone, fromIdx, 'hidden', null);
      });
    });
    // v0.15: color + glow dots.
    root.querySelectorAll('[data-color-pick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const zoneId = btn.dataset.fromZone;
        const idx    = parseInt(btn.dataset.fromIndex, 10);
        openColorPopover(btn, 'color', zoneId, idx);
      });
    });
    root.querySelectorAll('[data-glow-pick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const zoneId = btn.dataset.fromZone;
        const idx    = parseInt(btn.dataset.fromIndex, 10);
        openColorPopover(btn, 'glow', zoneId, idx);
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

  // v0.15: items are now { key, color?, glow? } instances. Drag identifies
  // an instance by its (zone, index) coordinate, not just by key, so we can
  // support multiple instances of the same key in the same zone. Hidden rail
  // continues to dedupe by key (no point hiding the same item twice).
  function itemKey(it) { return typeof it === 'string' ? it : (it && it.key) || ''; }
  function itemMatches(it, key) { return itemKey(it) === key; }

  function moveItem(itemKeyStr, fromZoneId, fromIndex, toZoneId, insertHint) {
    const layout = structuredClone(state.get().layout);
    let movedInstance = null;

    if (fromZoneId === 'hidden') {
      // Remove first matching key from hidden.
      const idx = (layout.hidden || []).findIndex(it => itemMatches(it, itemKeyStr));
      if (idx >= 0) {
        movedInstance = layout.hidden[idx];
        layout.hidden.splice(idx, 1);
      }
    } else {
      const src = findZone(layout, fromZoneId);
      if (src) {
        const i = (typeof fromIndex === 'number' && fromIndex >= 0)
          ? fromIndex
          : src.zone.items.findIndex(it => itemMatches(it, itemKeyStr));
        if (i >= 0) {
          movedInstance = src.zone.items[i];
          src.zone.items.splice(i, 1);
        }
      }
    }

    // Normalize: if the moved instance was a bare string from legacy state,
    // promote it to an object so future color/glow edits work.
    if (typeof movedInstance === 'string') movedInstance = { key: movedInstance };
    if (!movedInstance) movedInstance = { key: itemKeyStr };

    if (toZoneId === 'hidden') {
      // Hidden rail dedupes - never two of the same key in there.
      const present = (layout.hidden || []).some(it => itemMatches(it, itemKeyStr));
      if (!present) layout.hidden = [...(layout.hidden || []), movedInstance];
    } else {
      const dst = findZone(layout, toZoneId);
      if (!dst) return;
      // v0.15: zones now ALLOW duplicates. Don't strip existing entries with
      // the same key - place the moved instance next to insertHint.
      if (insertHint) {
        const after = insertHint.endsWith(':after');
        const target = parseInt(after ? insertHint.slice(0, -':after'.length) : insertHint, 10);
        if (Number.isFinite(target)) {
          dst.zone.items.splice(after ? target + 1 : target, 0, movedInstance);
        } else {
          dst.zone.items.push(movedInstance);
        }
      } else {
        dst.zone.items.push(movedInstance);
      }
    }
    state.set({ layout });
  }

  function updateInstance(zoneId, index, patch) {
    const layout = structuredClone(state.get().layout);
    const z = findZone(layout, zoneId);
    if (!z) return;
    let cur = z.zone.items[index];
    if (typeof cur === 'string') cur = { key: cur };
    z.zone.items[index] = { ...cur, ...patch };
    state.set({ layout });
  }

  function openItemPicker(zoneId, anchorBtn) {
    const layout = state.get().layout;
    const customItems = state.get().customItems ?? [];

    root.querySelectorAll('.layout-item-picker').forEach(p => p.remove());

    // v0.15: picker no longer excludes items already in the zone - clicking
    // adds a fresh instance. Duplicates allowed.
    const allKeys = [...ALL_ITEM_KEYS, ...customItems.map(c => c.id)];

    const picker = document.createElement('div');
    picker.className = 'layout-item-picker';
    picker.innerHTML = `
      <div class="layout-item-picker-title">Add Item</div>
      <div class="layout-item-picker-list">
        ${allKeys.map(k => {
          const label = labelFor(k, customItems);
          return `<button type="button" class="layout-pick" data-pick-item="${esc(k)}">${esc(label)}</button>`;
        }).join('')}
      </div>
    `;
    anchorBtn.parentElement.appendChild(picker);

    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-item]');
      if (!btn) return;
      // v0.15: append a fresh instance to the target zone. We don't move
      // any existing instance - duplicates are intentional.
      const itemKeyStr = btn.dataset.pickItem;
      const layoutNow = structuredClone(state.get().layout);
      const z = findZone(layoutNow, zoneId);
      if (!z) return;
      z.zone.items.push({ key: itemKeyStr });
      state.set({ layout: layoutNow });
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

  // v0.15: color/glow picker popover. Opens above the clicked dot, has
  // preset swatches + a native color wheel + a "Clear" action. Field is
  // either 'color' or 'glow'.
  const PRESET_COLORS = [
    '#E8A03A', '#F5C842', '#C84A1A', '#8B4A2A',
    '#4A7858', '#6B9579', '#EFDDB0', '#000000',
  ];

  function openColorPopover(anchorBtn, field, zoneId, idx) {
    // v0.15.3: popover appends to document.body (not the chip) so it escapes
    // the chip's transform / z-index stacking context and is guaranteed to
    // render on top of every other chip + button. Position-fixed anchored
    // to the clicked dot via getBoundingClientRect.
    document.querySelectorAll('.layout-color-popover').forEach(p => p.remove());

    const layout = state.get().layout;
    const z = findZone(layout, zoneId);
    if (!z) return;
    const cur = z.zone.items[idx];
    const currentVal = (cur && typeof cur === 'object') ? (cur[field] || '') : '';

    const pop = document.createElement('div');
    pop.className = 'layout-color-popover';
    pop.innerHTML = `
      <button type="button" class="layout-color-popover-close" data-color-close aria-label="Close">×</button>
      <div class="layout-color-popover-title">${field === 'glow' ? 'Glow' : 'Color'}</div>
      <div class="layout-color-popover-swatches">
        ${PRESET_COLORS.map(c => `
          <button type="button" class="layout-color-swatch${currentVal.toLowerCase() === c.toLowerCase() ? ' is-selected' : ''}"
                  data-color-val="${c}" style="background:${c}" title="${c}">&nbsp;</button>
        `).join('')}
      </div>
      <div class="layout-color-popover-custom">
        <label>
          <span>Custom</span>
          <input type="color" value="${currentVal || '#E8A03A'}" data-color-custom />
        </label>
        <button type="button" class="layout-color-clear" data-color-clear>Clear (use default)</button>
      </div>
    `;
    document.body.appendChild(pop);

    // Anchor below the clicked dot. If it would clip past the right edge,
    // shift it left so it stays on screen.
    const rect = anchorBtn.getBoundingClientRect();
    pop.style.position = 'fixed';
    pop.style.top = `${rect.bottom + 6}px`;
    // After append we know the popover's width; clamp inside the viewport.
    const popWidth = pop.offsetWidth;
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 8) {
      left = window.innerWidth - popWidth - 8;
    }
    if (left < 8) left = 8;
    pop.style.left = `${left}px`;

    pop.querySelectorAll('[data-color-val]').forEach(sw => {
      sw.addEventListener('click', () => {
        updateInstance(zoneId, idx, { [field]: sw.dataset.colorVal });
        pop.remove();
      });
    });
    pop.querySelector('[data-color-custom]').addEventListener('input', (e) => {
      updateInstance(zoneId, idx, { [field]: e.target.value });
    });
    pop.querySelector('[data-color-clear]').addEventListener('click', () => {
      updateInstance(zoneId, idx, { [field]: null });
      pop.remove();
    });
    pop.querySelector('[data-color-close]').addEventListener('click', () => {
      pop.remove();
    });

    setTimeout(() => {
      const onDocClick = (e) => {
        if (!pop.contains(e.target) && e.target !== anchorBtn) {
          pop.remove();
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

  // performance-02 (2026-09-23): the designer draws the layout and the custom
  // sections, so only a change to one of those repaints it.
  paint();
  state.subscribe(s => {
    if (s.layout === lastLayout && s.customItems === lastCustom) return;
    paint();
  });
}
