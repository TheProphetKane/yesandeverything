// Truncates at the last word boundary at or before maxChars, so a long field
// never gets cut mid-word. Falls back to a hard cut if there's no boundary to use.
export function truncateAtWordBoundary(str, maxChars) {
  if (str.length <= maxChars) return str;
  const cut = str.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}
