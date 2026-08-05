# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-05.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-05. Queue read directly for measurement; the one mutation this pass made (a closure) went through `scripts/queue_write.py`, which takes the shared lock and verifies the readback. Ages measured on the corpus's own `added` key, matching prior passes.

### Depth

| Measure | 2026-08-03 | 2026-08-04 | 2026-08-05 | Δ |
|---|---|---|---|---|
| Total items | 656 | 667 | 667 | 0 |
| `pending` | 543 | 554 | 552 | -2 |
| `blocked-on-user` | 58 | 58 | 58 | 0 |
| `completed` | 44 | 45 | **46** | +1 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 1 | 1 | 1 | 0 |
| Promptless (undrainable) | 0 | 11 | 11 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

Net pending dropped by 2 (one closure below, plus the previous pass's Scheduler closure finally reflected in this count). No new items opened this pass — tonight's twelve canonical-doc audits found no findings that weren't already queued.

**One closure landed this pass:** `canonical-audit-2026-07-25-yab-claude-md-warn-inverted` (was pending, P1). Tonight's Budget canonical-doc audit confirmed commit `624d68a` (2026-08-04) rewrote the `CLAUDE.md` hazard section to name the actual root cause (PS 5.1 wrapping git stderr) and the v0.14.10 `Invoke-Git` fix, closing the doc-vs-reality gap this item tracked. Closed with a resolution note citing the commit.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**332 items**, up from 295 on 2026-08-04. Severity: 224 medium, **69 high**, 32 low, 7 unset. Priority: 221 P2, **70 P1**, 39 P3, 2 P4. Oldest is still **19 days** (2026-07-17) — the tail isn't growing backwards, the middle keeps crossing the seven-day line.

By project: hordes 127, rising 50, everything 40, ring 20, gnosis 17, budget 12, chains 11 (+3 more under a capitalized `Chains` key, see below), skylight 11, scheduler 9, apothecary 7, agents 7, yab 6, cross 5, cattery 5, portfolio 1, skill-suite 1.

### The aged P1/high band has still never been attempted

**73 aged P1/high items, all 73 at `attempts: 0`.** Not one has been picked up and failed. Fifth consecutive pass finding the same clean pattern: 39, then 56, then 62, then 69, now 73.

Disposition, unchanged from the previous four passes and for the same reason: **leave all 73 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That's deliberately not applied here, because `blocked-on-user` would assert something untrue — these were never started, they're not waiting on Kane for an answer.

Hordes alone accounts for 127 of 332 aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Tenth consecutive nightly pass recording an empty Applied section there for exactly this reason.

### New this pass: a project-key casing split (LOW, minor schema drift)

Three queued items (`canonical-audit-2026-07-28-chains-preship-doc-staleness-gate`, `-docs-audits-stale-committed`, `-manifest-ai-copy`) carry `"project": "Chains"` (capitalized) against 48 other Chains items carrying `"project": "chains"` (lowercase). Cosmetic — nothing reads `project` case-sensitively that this pass could confirm — but it would silently split any future per-project count or filter that does. Not fixed tonight (needs a decision on which casing is canonical before a bulk rewrite); noting it here rather than opening a queue item for a three-row cosmetic split.

**Correction to a prior check:** a naive duplicate-title scan flags ~150 `bar-raise-finding`-kind items as sharing `title: null`. That's a schema difference by kind (bar-raise findings key off `finding_id` + `detail`, not `title`), not a real duplicate-content group — verified by reading one sample's full field set. Not a defect; noting so a future pass doesn't re-discover the same false positive.

### Actions taken

- **Archived: 0.** Zero real duplicate-title groups measured across all 552 pending items (see correction above), zero items missing the `added` key, and every re-checked aged item still traces to a finding this sweep or a prior one verified against disk tonight.
- **Closed: 1.** `canonical-audit-2026-07-25-yab-claude-md-warn-inverted` (detail above).
- **Status changes: 1** (the closure above).
- **Opened: 0** from this queue-triage pass directly. Tonight's twelve canonical-doc audits found no findings that weren't already queued — see each project's `CANONICAL_AUDIT-2026-08-05.md`.
- **Flagged, not yet actioned:** the project-key casing split (detail above); the 11 promptless `bar-raise-finding` items from 2026-08-03 remain undrained, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`, unchanged since 2026-08-04.
- **Schema normalisation: 0 applied** (the casing split is flagged, not fixed, pending a canonical-form decision).

### Intake vs close: still cannot reach its own target

`status/data/backlog-trend.json`, written by `backlog-burndown-daily`, was not independently re-derived this pass (stayed inside the nightly time box); the 2026-08-04 trend note (`target met, closed 5`) is the most recent reading on record.

### Recommendation

Unchanged from every prior pass, because nothing about the structure changed. This queue does not need triage and will not respond to more of it. The options are a decision for Kane:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — the 11 stranded items from 2026-08-03 are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, still live eleven days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.

Doing none of these is also a choice. Its outcome is visible: 73 P1/high items, none of them ever attempted, the oldest now 19 days, and an undrainable-item defect that keeps reproducing on every bar-raise run.
