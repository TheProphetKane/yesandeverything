// export-png.js - render the print-stage to a PNG via html2canvas.
//
// html2canvas is loaded as a <script> tag in index.html and attaches to
// window.html2canvas. We make the print-stage briefly visible offscreen so
// html2canvas can measure and rasterize it, then restore the inline style.

export async function exportPng(filename = 'apothecary-label.png') {
  if (typeof window === 'undefined' || !window.html2canvas) {
    alert('PNG export is loading. Try again in a moment.');
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
