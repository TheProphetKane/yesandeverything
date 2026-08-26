// suggest.js - score and rank herb search-index entries against a
// user-typed query for the editor's autocomplete dropdown.
//
// Five score tiers, checked in order (first hit wins), plus a flat alias
// penalty applied on top of whichever tier matched, so a canonical name
// always outranks an alias tied on tier:
//   exact display match             100
//   display starts with query        60
//   latin starts with query          50
//   display contains query           30
//   latin contains query             20
//   (no match)                        0
//   alias penalty                    -1
//
// Extracted from src/ui/editor.js filterSuggestions (bar-raise 2026-08-26
// maintainability-04), which ran this same scoring inline with no test
// coverage. Pure, so it runs without a DOM; covered in test-lookup.mjs.

export function scoreSuggestion(query, item) {
  const ql = (query ?? '').toLowerCase().trim();
  if (!ql) return 0;
  const d = item.display.toLowerCase();
  const l = (item.latin ?? '').toLowerCase();
  let score = 0;
  if (d === ql)              score = 100;
  else if (d.startsWith(ql)) score = 60;
  else if (l.startsWith(ql)) score = 50;
  else if (d.includes(ql))   score = 30;
  else if (l.includes(ql))   score = 20;
  if (score === 0) return 0;
  if (item.alias) score -= 1;
  return score;
}

// index entries: { display, canonical, latin, alias }
export function rankSuggestions(query, index, limit = 12) {
  if (!query || !query.trim()) return index.slice(0, limit);
  const scored = [];
  for (const item of index) {
    const score = scoreSuggestion(query, item);
    if (score === 0) continue;
    scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.display.localeCompare(b.item.display));
  return scored.slice(0, limit).map(x => x.item);
}
