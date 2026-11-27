// autofit.js - shrink a single-line text element to fit its parent width.
//
// Caller is responsible for gating the first call on document.fonts.ready,
// otherwise scrollWidth is read before the display font is loaded and the
// result will be wrong.
//
// The candidate sizes run from maxFs down to minFs in steps of `step`, the
// last one clamped to minFs. Text width grows with font size, so the sizes
// that fit form one run at the small end, and a binary search over the
// candidate index finds the largest fitting size in about five reflows
// instead of up to twenty. When nothing fits, the element ends at minFs.

export function autofitText(el, { maxFs = 17, minFs = 7, step = 0.5 } = {}) {
  if (!el || !el.parentElement) return;
  const sizeAt = i => Math.max(minFs, maxFs - i * step);
  const fits = i => {
    el.style.fontSize = sizeAt(i) + 'px';
    return el.scrollWidth <= el.parentElement.offsetWidth;
  };
  const last = step > 0 && maxFs > minFs ? Math.ceil((maxFs - minFs) / step) : 0;
  if (fits(0)) return;
  // Invariant: index lo does not fit; index hi fits, or hi is the last
  // candidate and is used whether it fits or not.
  let lo = 0, hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (fits(mid)) hi = mid; else lo = mid;
  }
  el.style.fontSize = sizeAt(hi) + 'px';
}
