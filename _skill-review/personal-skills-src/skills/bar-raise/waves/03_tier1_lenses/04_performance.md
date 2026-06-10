# Tier-1 Lens 04: Performance

## The question

Where does this project pay for work it does not need to do? Where is a hot path slow in a way the user would feel? Where will the performance cliff hit when the dataset grows by 10x?

## What to look at

- Per-frame hot paths (HBH + BR gameplay code; check `enemy_base.gd`, `enemy_pool.gd`, `wave_director.gd`, fog of war).
- Per-request hot paths (workers; check the auth path and the heaviest endpoint by traffic).
- Per-row hot paths (YaB import pipeline; check the dedupe constraint and the rule-engine apply loop).
- N+1 queries (Scheduler D1, YaC worker KV).
- Bundle size + load time on PWAs and static sites (YaC, YaE, YaA).
- Profile data: is there any? When was the last profile capture? If never, that itself is a finding.
- `docs/OPTIMIZATION_LOG.md` for HBH. Track which optimizations shipped vs which are pending. Repeat the same fix and the log catches it.

## Severity grading

- **HIGH**: A perf regression that has shipped and the user is feeling it now (HBH frame drops at peak wave; YaB import taking >30s).
- **MEDIUM**: A perf cliff visible in code review but not yet hit (an O(n^2) loop on a small-but-growing dataset).
- **LOW**: Micro-optimization opportunity; a slow path that is not on a hot route.

## Output shape

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "performance"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
