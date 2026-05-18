// autofit.js — shrink a single-line text element to fit its parent width.
//
// Caller is responsible for gating the first call on document.fonts.ready,
// otherwise scrollWidth is read before the display font is loaded and the
// result will be wrong.

export function autofitText(el, { maxFs = 17, minFs = 7, step = 0.5 } = {}) {
  if (!el || !el.parentElement) return;
  let fs = maxFs;
  el.style.fontSize = fs + 'px';
  while (el.scrollWidth > el.parentElement.offsetWidth && fs > minFs) {
    fs -= step;
    el.style.fontSize = fs + 'px';
  }
}
