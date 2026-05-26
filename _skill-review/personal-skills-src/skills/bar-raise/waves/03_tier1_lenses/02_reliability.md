# Tier-1 Lens 02: Reliability

## The question

Where will this project fail when it sees an unexpected input, a partial-state recovery, or a concurrent operation? Where do error paths swallow signal that the user needs to see?

## What to look at

- Try/catch blocks. Bare `catch (e)` with no logging or re-raise hides real failures. Note any.
- File-write paths on the FUSE mount (the entire HBH + BR + YaE workspace). Are they using the Python atomic-write-with-readback pattern, or naive Edit/Write calls?
- Network calls (workers, fetch, discord-notify) without timeouts or retry policies.
- DB transactions without rollback on partial failure (YaB import pipeline, Scheduler D1 migrations).
- Save/load paths. Format breaks that lose user state. Save-version mismatch handling.
- Scheduled tasks: does `Run task as soon as possible after a scheduled start is missed` cover the laptop-asleep case?

## Severity grading

- **HIGH**: A failure path that loses user data, OR a recovery path that silently masks a critical bug.
- **MEDIUM**: An error path that hides signal but does not lose data; a retry policy that retries the wrong category of error.
- **LOW**: Verbose error handling without observability hooks; a timeout that is too short or too long.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Reliability
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
