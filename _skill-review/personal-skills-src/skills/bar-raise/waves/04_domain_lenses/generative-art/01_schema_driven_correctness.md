# Domain Lens: generative-art / 01 schema driven correctness

## The question

Is the schema-driven label renderer still operating from the data, or has logic leaked into renderer-specific code paths? Where does adding a new label kind / symbol / theme require more than a registry entry?

## What to look at

- `data/label-templates.js` -- the template descriptor registry. Adding a new label format = a new entry only?
- `src/render.js` `ITEM_RENDERERS` registry. New item type = new registry entry, not a new switch case?
- `data/symbols.js`, `data/botanicals.js`, `data/themes.js` -- registry shape consistency.
- Recent commits that added hardcoded label logic to `render.js` instead of extending the schema.
- The PROJECT_SPEC anti-pattern: any hardcoded label structure in HTML or the renderer.

## Severity grading

- **HIGH**: A new label kind has been added via hardcoded if/else logic, not as a schema entry. The schema-driven pattern is broken.
- **MEDIUM**: A future-add (next planned label) is going to require renderer surgery, not just a registry add.
- **LOW**: A registry entry with slightly inconsistent shape vs siblings.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Schema-driven correctness
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
