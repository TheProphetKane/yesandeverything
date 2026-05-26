# Domain Lens: generative-art / 03 palette discipline

## The question

Are the themes still operating from declared theme objects, or has stray color crept into the templates? Where is the palette inconsistent across themes?

## What to look at

- `data/themes.js` -- the theme registry. Are all colors declared here, or do some live in templates / CSS?
- New themes added recently. Did they reuse the existing palette vars, or invent new ones?
- The 'dark editor, parchment label' convention. Is the editor still dark and the labels still warm? Any drift?
- Theme switcher UI. Does it cover every label surface, or are there themed-and-unthemed mixes?

## Severity grading

- **HIGH**: A theme that visually clashes with the established register; users see jarring output.
- **MEDIUM**: A color literal in a template file instead of via theme var.
- **LOW**: An unused color var in `themes.js`.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Palette discipline
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
