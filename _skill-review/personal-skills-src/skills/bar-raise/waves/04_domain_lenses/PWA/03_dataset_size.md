# Domain Lens: PWA / 03 dataset size

## The question

Is the bundled course data (~12MB), disc database (~647KB), plastic database (~200KB) still the right shape and size? Where is a dataset growing faster than the PWA bundle can carry?

## What to look at

- File sizes vs growth over time. Has `course_data.json` doubled? Tripled?
- Delta loading: does the app fetch the whole 12MB on first install, or stream / paginate?
- Index files for fast course lookup. Are they precomputed or built at runtime?
- Compression: is the worker serving Brotli for the JSON?
- Recent course additions cadence. Are scrapes adding data faster than the bundle can absorb?

## Severity grading

- **HIGH**: First-install bundle download exceeds 30MB and users notice the install pause.
- **MEDIUM**: Dataset has grown by 50%+ in 90 days without a delta-loading plan.
- **LOW**: A small compression or index optimization opportunity.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Dataset size
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
