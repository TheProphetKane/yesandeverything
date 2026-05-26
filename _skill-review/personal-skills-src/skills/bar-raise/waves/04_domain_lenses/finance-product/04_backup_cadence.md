# Domain Lens: finance-product / 04 backup cadence

## The question

Are backups happening at the points the DESIGN claims? Where would a bad import leave the user without a rollback path?

## What to look at

- DESIGN.md §9: pre-import backup. Is the backup helper actually called from the import path?
- Backup file naming convention. `data/backups/yyyy-mm-dd-hhmm.db`. Anything off?
- Manual export path. Exposed in the Settings UI?
- Backup retention. Is anything pruning old backups, or do they grow unbounded?
- The recent v0.5.0 backup decision (D-004 if locked) -- is the implementation matching the spec?

## Severity grading

- **HIGH**: A destructive operation that bypasses the backup step.
- **MEDIUM**: Backups happen but the user has no exposed restore UI; they have to swap files manually.
- **LOW**: Backup retention has no policy; disk will fill eventually.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Backup cadence
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
