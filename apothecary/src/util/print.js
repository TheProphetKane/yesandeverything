// print.js - trigger the browser print dialog.
// The print CSS in styles/label.css does the heavy lifting via the
// visibility-toggle pattern (body * { visibility: hidden } then re-enable label).

export function printLabel() {
  window.print();
}
