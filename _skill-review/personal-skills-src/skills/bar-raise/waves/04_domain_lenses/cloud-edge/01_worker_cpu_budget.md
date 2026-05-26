# Domain Lens: cloud-edge / 01 worker cpu budget

## The question

Are the Cloudflare Worker handlers staying under the free-tier CPU limit (50ms)? Where is a recent endpoint trending toward the limit?

## What to look at

- YaC worker: the heaviest endpoints (course search, contribute pin, course refresh trigger).
- Scheduler worker: schedule-generation endpoint specifically. The auto-fill algorithm (DESIGN §8) needs to complete well under the limit for ~25 employees / ~6 weeks.
- `wrangler tail` recent traces if available. Spikes above 30ms warrant a profiling pass.
- Cold-start vs warm-start latency. Heavy module imports in the worker entry path slow cold starts.

## Severity grading

- **HIGH**: An endpoint regularly hitting the CPU limit; users see 1101 errors.
- **MEDIUM**: An endpoint trending toward the limit (>30ms) under current load; growth will breach.
- **LOW**: A non-critical endpoint with optimization headroom.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Worker CPU budget
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
