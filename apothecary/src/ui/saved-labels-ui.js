// saved-labels-ui.js - sidebar UI for the saved-labels panel.
//
// Renders a small panel with a "Save Current" row and a list of saved labels.
// Each list item has Load / Duplicate / Rename / Delete actions.

import {
  listSaved, saveLabel, loadLabel, deleteLabel, duplicateLabel, renameLabel,
} from '../util/saved-labels.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function mountSavedLabels(root, state) {
  root.innerHTML = `
    <div class="saved-panel">
      <div class="saved-header">
        <span class="saved-title">Saved Labels</span>
      </div>
      <div class="saved-save-row">
        <input id="saved-name" class="field-input" type="text" placeholder="Name this label..." maxlength="60" />
        <button id="btn-save-current" class="btn-primary">Save</button>
      </div>
      <ul id="saved-list" class="saved-list"></ul>
    </div>
  `;

  const nameInput = root.querySelector('#saved-name');
  const saveBtn   = root.querySelector('#btn-save-current');
  const listEl    = root.querySelector('#saved-list');

  function refresh() {
    const entries = listSaved();
    if (entries.length === 0) {
      listEl.innerHTML = `<li class="saved-empty">No saved labels yet. Save the current label above.</li>`;
      return;
    }
    listEl.innerHTML = entries.map(e => `
      <li class="saved-item" data-id="${e.id}">
        <div class="saved-item-main">
          <span class="saved-item-name">${esc(e.name)}</span>
          <span class="saved-item-date">${fmt(e.updatedAt)}</span>
        </div>
        <div class="saved-item-actions">
          <button type="button" data-act="load"      data-id="${e.id}" title="Load"      aria-label="Load ${esc(e.name)}">↥</button>
          <button type="button" data-act="duplicate" data-id="${e.id}" title="Duplicate" aria-label="Duplicate ${esc(e.name)}">⎘</button>
          <button type="button" data-act="rename"    data-id="${e.id}" title="Rename"    aria-label="Rename ${esc(e.name)}">✎</button>
          <button type="button" data-act="delete"    data-id="${e.id}" title="Delete"    aria-label="Delete ${esc(e.name)}">✕</button>
        </div>
      </li>
    `).join('');
  }

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim() || `Label ${new Date().toLocaleDateString()}`;
    saveLabel(name, state.get());
    nameInput.value = '';
    refresh();
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    if (act === 'load') {
      const entry = loadLabel(id);
      if (entry) state.set(entry.state);
    } else if (act === 'duplicate') {
      duplicateLabel(id);
      refresh();
    } else if (act === 'rename') {
      const entry = loadLabel(id);
      const newName = prompt('Rename label:', entry?.name ?? '');
      if (newName) { renameLabel(id, newName); refresh(); }
    } else if (act === 'delete') {
      const entry = loadLabel(id);
      if (confirm(`Delete "${entry?.name}"?`)) { deleteLabel(id); refresh(); }
    }
  });

  refresh();
  return { refresh };
}
