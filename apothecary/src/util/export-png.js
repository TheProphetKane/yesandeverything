// export-png.js - render the print-stage to a PNG via html2canvas.
//
// html2canvas is lazy-loaded from cdnjs on the first export click (it's ~194KB
// that most sessions never need) and attaches to window.html2canvas. The SRI
// hash pins the exact 1.4.1 build (verified against the cdnjs API). We make
// the print-stage briefly visible offscreen so html2canvas can measure and
// rasterize it, then restore the inline style.

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

  // Snapshot inline style so we can restore after.
  const prev = stage.getAttribute('style') || '';

  // Make stage visible but offscreen.
  stage.style.cssText = `${prev};
    display: flex !important;
    position: fixed !important;
    left: -10000px !important;
    top: 0 !important;
    width: 8.5in;
    height: auto;
    padding: 0.25in;
    background: white;
    z-index: -1;
  `;

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
    stage.setAttribute('style', prev);
  }
}
