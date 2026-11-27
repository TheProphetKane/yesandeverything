// print.js - trigger the browser print dialog.
// The print CSS in styles/label.css does the heavy lifting via the parallel
// #print-stage tree: inside @media print, body > * { display: none !important }
// hides every screen element and #print-stage { display: flex !important }
// re-shows the print tree (PROJECT_SPEC section 7). render() rebuilds that tree
// on every state change, but the rebuild waits for the next animation frame, so
// a print has to flush it first. main.js wraps this call with flushPrintStage()
// for the Print button, flushes again in a capture-phase Ctrl/Cmd+P listener,
// and flushes on window beforeprint for a print started from the browser menu.

export function printLabel() {
  window.print();
}
