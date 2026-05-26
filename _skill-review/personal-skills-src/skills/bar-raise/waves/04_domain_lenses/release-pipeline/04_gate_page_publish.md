# Domain Lens: release-pipeline / 04 gate page publish

## The question

Are the password-gated GDD mirrors (`/hordes/`, `/brackish-rising/`) being published correctly? Where is the injection pipeline drifting?

## What to look at

- HBH publish-gdd.ps1 and BR publish-gdd.ps1. Same shape?
- The Test-GddIntegrity guard: >30KB, ends with </html>, no conflict markers. Active in both?
- The gate page post-write integrity check: ENCODED block, VIEWER/EDITOR variables, password constants. Active in both?
- Recent publishes: were any aborted by the guard? Were the aborts surfaced?
- The base64 payload size: is the encoded GDD growing faster than expected?

## Severity grading

- **HIGH**: A publish that succeeded but landed a truncated GDD (the v0.61.8 incident shape).
- **MEDIUM**: A guard that has been bypassed in error or that does not cover a new failure mode.
- **LOW**: A publish step that prints noisily; cosmetic.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Gate-page publish
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
