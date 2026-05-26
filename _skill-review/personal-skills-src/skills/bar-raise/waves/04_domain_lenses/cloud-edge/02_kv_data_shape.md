# Domain Lens: cloud-edge / 02 kv data shape

## The question

Is the data stored in Cloudflare KV / D1 in a shape that scales with the project's growth? Where is a hot key getting hammered? Where is a missing index forcing a scan?

## What to look at

- YaC worker KV namespaces. Hot-key patterns (course list, hot courses, contribution queue).
- Scheduler D1 schema. The migrations under `migrations/`. Indices on join columns?
- N+1 patterns. The course-detail endpoint loading per-hole data in a loop is a classic.
- KV key naming. Versioned prefixes survive migrations; un-versioned do not.
- Read-after-write consistency assumptions. KV is eventually consistent; code that assumes strong consistency will misbehave on hot paths.

## Severity grading

- **HIGH**: A query pattern that produces N+1 calls on a hot endpoint OR a hot key that exceeds the rate limit.
- **MEDIUM**: A schema choice that forces a future migration (no version prefix, no index where one is obviously needed).
- **LOW**: A naming convention drift across keys.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### KV data shape
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
