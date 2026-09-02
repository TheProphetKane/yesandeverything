// export-png.js - render the print-stage to a PNG via html2canvas.
//
// html2canvas is lazy-loaded from cdnjs on the first export click (it's ~194KB
// that most sessions never need) and attaches to window.html2canvas. The SRI
// hash pins the exact 1.4.1 build (verified against the cdnjs API). The
// print-stage goes briefly visible offscreen so html2canvas can measure and
// rasterize it, then the inline style is restored.
//
// The catch, and the reason PRINT_STAGE_RULES below exists: everything that
// gives the print-stage its layout lives inside @media print in
// styles/label.css, and an offscreen rasterize is not print media, so none of
// it applies. Before the fix this stage went out as a bare display:flex in an
// 8.5in box: no gap, no flex-direction, no alignment. A back-enabled large or
// extra-large label routes to layout-stacked (render.js pickPrintLayout), so
// its two cards laid out in a ROW instead of a column, and default flex-shrink
// squeezed them until .label-card's overflow:hidden clipped the artwork. The
// exported image did not match the page that came out of the printer.
//
// So the print rules get restated here and applied by hand. Keep this block in
// step with the @media print section of styles/label.css; that stylesheet is
// still the source, this is the copy the rasterizer can see.

const H2C_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const H2C_SRI = 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==';

let h2cLoading = null;
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve();
  if (h2cLoading) return h2cLoading;
  h2cLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = H2C_URL;
    s.integrity = H2C_SRI;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => {
      // Clear the memo so a later click retries after a transient failure.
      h2cLoading = null;
      s.remove();
      reject(new Error('html2canvas failed to load'));
    };
    document.head.appendChild(s);
  });
  return h2cLoading;
}

// Per-layout box, lifted from the four #print-stage.layout-* rules in
// styles/label.css. layout-separate drops the page padding and the gap because
// each card carries its own 0.25in margin instead.
const LAYOUT_RULES = {
  'layout-single':       { flexDirection: 'row',    padding: '0.25in', gap: '0.15in' },
  'layout-side-by-side': { flexDirection: 'row',    padding: '0.25in', gap: '0.15in' },
  'layout-stacked':      { flexDirection: 'column', padding: '0.25in', gap: '0.15in' },
  'layout-separate':     { flexDirection: 'column', padding: '0',      gap: '0' },
};

const LAYOUT_CLASSES = Object.keys(LAYOUT_RULES);

function stageLayoutClass(stage) {
  return LAYOUT_CLASSES.find(c => stage.classList.contains(c)) || 'layout-single';
}

// The descendant half of the @media print block. print-color-adjust is in
// there for parity with the stylesheet; html2canvas paints backgrounds either
// way, so it costs nothing and keeps the two blocks readable side by side.
const PRINT_STAGE_RULES = `
  #print-stage .label-card {
    transform: none !important;
    border-radius: 0 !important;
    overflow: hidden;
    flex-shrink: 0;
  }
  #print-stage.layout-separate .label-card {
    margin: 0.25in;
  }
  #print-stage * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
`;

export async function exportPng(filename = 'apothecary-label.png') {
  if (typeof window === 'undefined') return;
  try {
    await loadHtml2Canvas();
  } catch {
    alert('PNG export needs to fetch its renderer and the download failed. Check the connection and try again.');
    return;
  }
  const stage = document.getElementById('print-stage');
  if (!stage) return;

  // Snapshot inline style for restore afterwards.
  const prev = stage.getAttribute('style') || '';

  const layout = LAYOUT_RULES[stageLayoutClass(stage)] || LAYOUT_RULES['layout-single'];

  // Stage visible but offscreen, carrying the @media print box and whichever
  // flex-direction pickPrintLayout's class calls for.
  //
  // height is the one deliberate departure from the stylesheet, which pins
  // 11in. A PNG is a single image, so layout-separate (one card per printed
  // page) has nowhere to put page two; 11in would crop everything past the
  // first page out of the file. height:auto keeps the whole render in frame
  // and the horizontal box, which is what was actually broken, still matches.
  stage.style.cssText = `${prev};
    display: flex !important;
    position: fixed !important;
    left: -10000px !important;
    top: 0 !important;
    width: 8.5in;
    height: auto;
    padding: ${layout.padding};
    gap: ${layout.gap};
    flex-direction: ${layout.flexDirection};
    align-items: flex-start;
    justify-content: flex-start;
    background: white;
    z-index: -1;
  `;

  // The card rules are descendant selectors, so an inline style on the stage
  // cannot reach them. A temporary stylesheet can, and comes out again in the
  // finally below.
  const sheet = document.createElement('style');
  sheet.textContent = PRINT_STAGE_RULES;
  document.head.appendChild(sheet);

  try {
    const canvas = await window.html2canvas(stage, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    if (!link.download.endsWith('.png')) link.download += '.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('PNG export failed:', err);
    alert('PNG export failed. See console for details.');
  } finally {
    sheet.remove();
    stage.setAttribute('style', prev);
  }
}
