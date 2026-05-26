# Domain Lens: orchestration / 06 scheduled task firing state

## The question

Are the scheduled tasks (audits, queue drains, future bar-raise) actually running? Where is one silently failing to fire?

## What to look at

- Windows Task Scheduler task list: what is registered, when did each last run?
- The Cowork scheduled-tasks list (legacy): what is registered there, has migration to Windows Task Scheduler happened?
- Per-task output: where does each task write its log? Are logs being read?
- The 'Run task as soon as possible after a scheduled start is missed' option: enabled on each? Critical for laptop-asleep cases.
- Wakeup: any task assuming the laptop is awake at 06:00?

## Severity grading

- **HIGH**: A scheduled task has not fired in its expected window and the user did not notice.
- **MEDIUM**: A scheduled task fires but its output is not being consumed; signal lost.
- **LOW**: A schedule that is fine but the start time conflicts with the laptop's typical sleep state.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Scheduled task firing state
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
