# Domain Lens: orchestration / 08 skill chain handoff integrity

## The question

When one skill hands off to another (project-canonical-audit -> drift-auto-fix -> work-queue-runner), does the handoff actually work? Where is a handoff dropping data on the floor?

## What to look at

- Audit -> drift-auto-fix: does the audit report's 'Suggested fixes' section have the exact shape drift-auto-fix expects?
- drift-auto-fix -> work-queue-runner: are structural items being queued, or are they getting lost?
- bar-raise (Phase 2) -> drift-auto-fix: the bar-raise findings JSON contract; does drift-auto-fix know how to consume it?
- self-reprompt-loop: does it pick the right downstream skill based on state? Recent runs that picked wrong?

## Severity grading

- **HIGH**: A handoff that has been dropping data for >1 cycle; downstream skill is starved.
- **MEDIUM**: A handoff that works but loses metadata (severity tier, source citation, priority).
- **LOW**: A handoff format mismatch that has not bitten yet but will when conditions change.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Skill chain handoff integrity
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
