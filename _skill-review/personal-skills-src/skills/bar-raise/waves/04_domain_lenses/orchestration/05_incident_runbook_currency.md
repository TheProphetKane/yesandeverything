# Domain Lens: orchestration / 05 incident runbook currency

## The question

When a documented hazard fires, is the recovery runbook current? Where has a hazard happened recently with no updated runbook to match?

## What to look at

- Memory entries for each known hazard (FUSE truncation, git index.lock, parallel-implementation-trap, etc.).
- Per-project CLAUDE.md 'Things that will bite you' / 'Hard-won hazards' sections. Currency.
- Recent incidents (the BR v0.11.x rename pass; the git-lock pile-ups; the dual-path enemy fix cycle). Is there a runbook entry for each?
- The git-unstick skill specifically: does it know about index.lock, HEAD.lock, refs/heads/<branch>.lock?

## Severity grading

- **HIGH**: A recent incident has no runbook; future you cannot find the recovery steps.
- **MEDIUM**: A runbook that references obsolete paths or commands.
- **LOW**: A hazard documented in one place but missing from another (memory but not CLAUDE.md).

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Incident runbook currency
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
