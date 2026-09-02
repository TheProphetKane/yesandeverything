// escape-html.js - the one HTML-escaper for the whole app.
//
// This lived as eight byte-identical copies across render.js, editor.js and
// saved-labels-ui.js (bar-raise maintainability-02). One copy now; the five
// characters and their entities are the same set every copy carried, so
// collapsing them changed no output.
//
// Safe in both text content and a double-quoted attribute value: quote and
// apostrophe are both escaped, so there is no separate "escAttr" variant.

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
