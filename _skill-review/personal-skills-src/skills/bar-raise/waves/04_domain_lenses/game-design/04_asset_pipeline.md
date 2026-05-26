# Domain Lens: game-design / 04 asset pipeline

## The question

Is the asset roster shipping at the cadence and the quality the project needs? Where is a placeholder asset breaking the tone? Where is the asset dual-residence rule (archive + active) drifting?

## What to look at

- HBH/BR GDD Assets tab. Total / MVP / V1 / V2 counts. Done vs todo per sub-tab.
- The asset_dual_residence memory rule: every used asset lives in both `_ARCHIVE/` and `assets/art/`. Walk recent commits for assets moved instead of copied.
- chmillout (HBH) and Navy (BR) deliverables: what is locked vs what is placeholder? Mixing finals with placeholders kills the tone.
- The Midjourney prompt standard (HBH memory: web UI only, 3 personalization profiles, solid bg + full negatives). Recent prompts that drift from this kill consistency.

## Severity grading

- **HIGH**: A placeholder asset shipping in the MVP demo that should not.
- **MEDIUM**: Asset rate-of-delivery does not match milestone schedule; or a dual-residence violation that has not been backfilled.
- **LOW**: A single asset with the wrong tone but not in the demo path.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Asset pipeline
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
