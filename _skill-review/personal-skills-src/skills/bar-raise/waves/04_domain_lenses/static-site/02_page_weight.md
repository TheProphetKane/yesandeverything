# Domain Lens: static-site / 02 page weight

## The question

Is the bundle (or the static page) growing in ways the user feels? Where is a one-off asset bloating the deploy? Where is a third-party script silently growing the page weight?

## What to look at

- `index.html` size. Recent diffs adding inline base64 or large blocks.
- Per-project sub-pages (`projects/<id>/index.html`). One-file-per-page convention: any page that broke this and reached out to a shared resource?
- The `hordes/index.html` GDD payload is base64-inlined and large by design. Compare to the source GDD size; >10% bloat suggests waste.
- `apothecary/` mirror size. Has it grown faster than the source repo?
- Real-world page-load time on a mid-tier mobile connection.

## Severity grading

- **HIGH**: A page that takes > 5 seconds to first paint on a 4G phone.
- **MEDIUM**: A page that ships unused JS or duplicated CSS at material size (>50KB).
- **LOW**: A small bloat opportunity (unminified inline script, etc.).

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Page weight
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
