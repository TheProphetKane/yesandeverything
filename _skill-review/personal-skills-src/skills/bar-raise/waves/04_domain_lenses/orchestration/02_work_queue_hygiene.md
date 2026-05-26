# Domain Lens: orchestration / 02 work queue hygiene

## The question

Is `X:\YesAndEverything\.work-queue.json` draining, or is it accreting? Where are items stuck for weeks? Where is the queue contract drifting?

## What to look at

- Queue depth over time. Is it shrinking, growing, or flat?
- Oldest pending item. >14 days suggests it should be deleted or escalated.
- Completed items still in the file (should be pruned after each commit per the work-queue-runner spec).
- The queue contract: every item has project, priority, prompt, source, status. Items violating this shape?
- The every-4-hours `queue-drain-frequent` scheduled task: still firing? When was its last run?

## Severity grading

- **HIGH**: Queue has not drained an item in 14+ days; the drain mechanism is broken.
- **MEDIUM**: Multiple items >7 days old or queue depth is growing without a corresponding burst of work.
- **LOW**: A handful of items that should be re-tagged but the queue is otherwise healthy.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Work queue hygiene
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
