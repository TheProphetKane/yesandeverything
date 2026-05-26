# Domain Lens: generative-art / 02 print fidelity

## The question

Does the label render correctly under the print CSS pipeline? Where is screen-vs-print divergence going to surface a bug at print time?

## What to look at

- `styles/*.css` print-specific rules. The visibility-toggle pattern (not display:none) is locked; is it still followed?
- Autofit-before-fonts-load gate (`render.js` uses `document.fonts.ready`). Has it been removed or bypassed?
- Cross-browser print test (Chrome, Safari, Firefox at minimum). When was the last manual print test?
- Color profiles: print colors vs screen colors. The parchment-warm label palette should print acceptably.

## Severity grading

- **HIGH**: A print regression that affects all labels (autofit broken in print, content cut off).
- **MEDIUM**: A print issue specific to one browser; users see different results.
- **LOW**: A minor visual difference between screen preview and print output.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Print fidelity
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
