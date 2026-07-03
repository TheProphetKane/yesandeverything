// print.js - trigger the browser print dialog.
// The print CSS in styles/label.css does the heavy lifting via the parallel
// #print-stage tree: inside @media print, body > * { display: none !important }
// hides every screen element and #print-stage { display: flex !important }
// re-shows the always-fresh print tree (PROJECT_SPEC section 7). No JS prep is
// needed here because render() rebuilds the print-stage on every state change.

export function printLabel() {
  window.print();
}
