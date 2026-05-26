# Domain Lens: game-design / 02 scope discipline

## The question

Is the project still building to its locked v1 scope, or has scope crept silently? Where is anti-scope being violated? Where is a milestone heading the wrong direction?

## What to look at

- The 'v1 Scope Lock' section of the canonical doc (HBH GDD §17; BR GDD Design tab).
- Recent backlog additions. Items added in the last 30 days: do they fit v1 scope, or are they v2 work that snuck into v1?
- Recent locked decisions. Have any of them quietly expanded scope?
- The Cut / Redesign sub-tabs of the Assets master list. Items moved from Cut back to Active without a locked-decision entry are scope creep.
- Milestone deliverables vs current commits. Is the work shipping under M2 actually M3 work?

## Severity grading

- **HIGH**: Scope creep that is consuming weeks of work and was never locked.
- **MEDIUM**: Scope creep on a single feature; or an in-progress milestone that has grown without re-scoping.
- **LOW**: A backlog item that probably belongs in v2; nothing in flight yet.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Scope discipline
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
