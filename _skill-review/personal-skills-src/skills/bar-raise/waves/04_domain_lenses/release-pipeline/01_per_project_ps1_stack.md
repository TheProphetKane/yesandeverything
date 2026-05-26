# Domain Lens: release-pipeline / 01 per project ps1 stack

## The question

Are the release.ps1 + push-to-github.ps1 + publish-* + discord-notify.ps1 stacks consistent across projects? Where has one project's pattern drifted from the others?

## What to look at

- Each project's scripts/ directory. Compare release.ps1 step ordering: preship, push, deploy, mirror, dashboard, notify.
- Insertion points for new steps (e.g. dashboard-status). Were they inserted in the same place across projects?
- Common helpers: stale-lock cleanup, version-pill bump, CHANGELOG prepend. Implemented similarly?
- Error handling: which steps are fatal vs non-fatal? Inconsistent severity across projects is friction.

## Severity grading

- **HIGH**: Two projects have diverged badly enough that fixing a bug in one does not transfer to the other.
- **MEDIUM**: One project missing a step the others have (e.g. preship gate); cumulative risk.
- **LOW**: Cosmetic naming inconsistency (Step 2/3 vs [2/3] vs Step 2).

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Per-project ps1 stack
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
