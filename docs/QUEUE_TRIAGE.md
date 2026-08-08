# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-08.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-08. Queue read directly for measurement; the only mutation tonight was adding three Scheduler structural findings via `queue_write.py`, all of which already existed (dedup confirmed no-op, only a timestamp field changed). Ages measured on the corpus's own `added` key, matching prior passes.

### Depth

| Measure | 2026-08-06 | 2026-08-07 | 2026-08-08 | Δ |
|---|---|---|---|---|
| Total items | 717 | 744 | 797 | +53 |
| `pending` | 596 | 619 | 664 | +45 |
| `blocked-on-user` | 57 | 57 | 57 | 0 |
| `completed` | 53 | 57 | 64 | +7 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 1 | 1 | 2 | +1 |
| Promptless (undrainable) | 11 | 11 | 11 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

+53 total / +45 pending is a normal-sized daily intake (no single dated batch dominates it the way the 2026-07-30 bar-raise dump did two nights ago). +7 completed matches a `backlog-burndown` closure batch dated 2026-08-07 (7 items resolved, 1 dropped with evidence — matches that routine's own status log at `61fb62b`'s parent commit).

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**486 items, up from 480 on 2026-08-07 (+6).** No single dated batch crossing the line today; the +6 is ordinary calendar drift plus intake. Severity: 319 `medium` + 5 `MED` (casing variant, see below), 118 `high` + 1 `HIGH` (same), 37 `low`, 6 unset. Priority: 320 P2, **121 P1**, 43 P3, 2 P4. Oldest is now **22 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`, unchanged item, one day older).

By project: hordes 196, rising 100, everything 45, budget 26, gnosis 21, ring 20, chains 14 (+3 more under a capitalized `Chains` key, see below), skylight 13, apothecary 10, agents 10, scheduler 9, yab 6, cattery 6, cross 5, portfolio 1, skill-suite 1.

### The aged P1/high band has still never been attempted

**125 aged P1/high items, all 125 at `attempts: 0`.** Up from 124 last pass, ordinary one-item drift, not a new batch. Not one has been picked up and failed — this remains a "never started" queue, not a "tried and stuck" one.

Disposition, unchanged from every prior pass and for the same reason: **leave all 125 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That's deliberately not applied here, because `blocked-on-user` would assert something untrue — these were never started, they're not waiting on Kane for an answer.

Hordes alone accounts for 196 of 486 aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Thirteenth consecutive nightly pass recording an empty Applied section there for exactly this reason.

### Carried: two casing splits (LOW, minor schema drift)

1. **Project-key casing.** Three queued items (`canonical-audit-2026-07-28-chains-preship-doc-staleness-gate`, `-docs-audits-stale-committed`, `-manifest-ai-copy`) still carry `"project": "Chains"` (capitalized) against 49 other Chains items carrying `"project": "chains"` (lowercase) across the whole corpus. Cosmetic — nothing reads `project` case-sensitively that this pass could confirm — but it would silently split any future per-project count or filter that does.
2. **New this pass: severity-value casing.** 6 items across the aged-structural set carry `severity: "MED"` or `"HIGH"` (5 and 1 respectively) instead of the corpus norm `"medium"`/`"high"`. Same shape as finding 1 — cosmetic today, a silent-split risk for any future severity filter. Not investigated further tonight to stay in the time box; worth folding into the same eventual casing-normalization decision as finding 1 rather than fixing piecemeal.

**Re-verified: no real duplicate-title groups.** Restricted the check to the 441 pending items that actually carry a `title` field — zero duplicates. Zero items missing the `added` key.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly. Tonight's 7 completions were a `backlog-burndown` batch from 2026-08-07, not this pass.
- **Status changes: 0** from queue-triage tonight.
- **Opened: 0** from this queue-triage pass directly. Tonight's twelve canonical-doc audits found no findings not already queued (the three Scheduler items re-submitted via `queue_write.py` all deduped against existing entries).
- **Flagged, not yet actioned:** the project-key casing split and the new severity-value casing split (detail above); the 11 promptless `bar-raise-finding` items from 2026-08-03 remain undrained, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`.

### Recommendation

Unchanged from every prior pass: the P1/high pile is still 125 items deep, all still unattempted, growing by roughly one a day now that the calendar has absorbed the 2026-07-30 bar-raise dump. The options are a decision for Kane:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — the 11 stranded items from 2026-08-03 are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, now nineteen days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.
- **Grow the daily governor's box**, especially given the steady ~1/day creep in the P1/high band even without a new dump.

Doing none of these is also a choice. Its outcome is visible: 125 P1/high items, none of them ever attempted, the oldest now 22 days.
