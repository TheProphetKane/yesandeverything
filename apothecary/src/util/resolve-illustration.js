// resolve-illustration.js - the one botanical-illustration resolution order,
// shared by the renderer (src/render.js) and the illustration picker
// (src/ui/illustration-picker.js). Extracted 2026-09-11 (bar-raise
// 2026-09-09 architecture-01): the two call sites had reimplemented the same
// three-step chain independently, with the same lowercasing and the same
// fallback order, so a change to one silently drifted from the other.
//
// Order:
//   1. state.illustration override -> data/illustrations/<keyword>.png
//   2. herb-name auto-match via herbAutoMatch (lowercased, trimmed)
//   3. v0.18 generic category fallback via herbCategoryFallback, keyed on
//      state.botanical (lowercased, trimmed)
//   4. no illustration
export function resolveIllustration(state, { herbAutoMatch, herbCategoryFallback } = {}) {
  if (state.illustration && typeof state.illustration === 'string') {
    return { kind: 'override', keyword: state.illustration };
  }
  if (herbAutoMatch) {
    const key = String(state.herbName ?? '').toLowerCase().trim();
    const auto = herbAutoMatch[key];
    if (auto) return { kind: 'auto', keyword: auto };
  }
  if (herbCategoryFallback) {
    const cat = String(state.botanical ?? '').toLowerCase().trim();
    const catKw = herbCategoryFallback[cat];
    if (catKw) return { kind: 'category', keyword: catKw };
  }
  return { kind: 'none', keyword: null };
}
