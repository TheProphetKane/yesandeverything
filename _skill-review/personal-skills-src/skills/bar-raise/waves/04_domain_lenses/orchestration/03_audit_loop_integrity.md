# Domain Lens: orchestration / 03 audit loop integrity

## The question

Are the scheduled audits (project-canonical-audit, handler-audit, backlog-hygiene) actually firing on schedule? Where is an audit report stale by more than its cadence allows?

## What to look at

- The scheduled-tasks list: `audit-hbh-daily`, `audit-yac-twice-weekly`, `audit-scheduler-weekly`, etc.
- The most recent audit report date per project. Daily audit > 36 hours stale is a problem; weekly > 9 days stale is a problem.
- The `PENDING_SCHEDULED_TASKS.md` file: status of the registered tasks.
- Audit findings: are they consistent week-over-week, or is there noise that suggests the lens itself is broken?

## Severity grading

- **HIGH**: An audit has not fired in 2x its expected cadence; the schedule is broken.
- **MEDIUM**: Findings are repeating week-over-week unchanged; the audit-to-fix loop is not closing.
- **LOW**: Minor inconsistency in a single audit run.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Audit loop integrity
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
