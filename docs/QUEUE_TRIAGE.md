# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-02.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-02. Queue read and written through `scripts/queue_write.py`, which takes the shared lock and verifies the readback. Ages measured on the corpus's own `added` key, matching the previous pass so the numbers are comparable.

### Depth

| Measure | 2026-08-01 | 2026-08-02 | Δ |
|---|---|---|---|
| Total items | 619 | **655** | +36 |
| `pending` | 548 | 542 | -6 |
| `blocked-on-user` | 60 | 58 | -2 |
| `completed` | 1 | 44 | +43 |
| `deferred` | 10 | 10 | 0 |
| Promptless (undrainable) | 0 | **0** | 0 |
| Pending that are `auto_safe: true` | 0 | **0** | 0 |

The `completed` jump is mostly bookkeeping from a prior burndown, not this sweep. This sweep closed 4 and opened 8.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**239 items**, up from 203 last night. Severity: 170 medium, **55 high**, 13 low, 1 unset. Priority: 165 P2, **55 P1**, 19 P3. Oldest is **16 days** (2026-07-17); nothing is older, so the tail is not growing backwards.

By project: hordes 113, rising 28, everything 28, gnosis 14, ring 12, chains 8, scheduler 7, yab 6, agents 6, skylight 5, cattery 4, apothecary 3, cross 2, budget 2, portfolio 1.

### The finding that matters, and it got worse: the aged P1 band has still never been attempted

**56 aged P1/high items, and 55 of them carry `attempts: 0`** (the 56th has no `attempts` key at all). Not one has been picked up and failed. Same clean pattern the previous pass found at 39 of 39.

The band grew from **39 to 56 in twenty-four hours**. Across all 239 aged items, 229 are at `attempts: 0`, 3 at `attempts: 1`, 7 unset - so **96% of the aged backlog has never been touched once**.

Disposition, unchanged from the previous pass and for the same reason: **leave all 56 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That is deliberately not applied, because `blocked-on-user` would assert something untrue - these are not waiting on Kane, they were never started - and it would hide them from `backlog-burndown-daily`, the one routine explicitly authorized to attempt judgment-bound work.

Hordes alone accounts for 113 of 239 aged items and 29 of 56 aged P1s. That is not neglect of Hordes: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Every GDD-side finding is queued by construction and can only drain in an attended session. Seven consecutive nightly passes have recorded an empty Applied section there for exactly this reason.

### Actions taken

- **Archived: 0.** Justified, not skipped. Measured tonight: **zero duplicate-title groups** across all 542 pending items, **zero promptless items**, and every aged item traces to a finding this sweep re-verified against disk. Archiving would not reduce work, it would delete the record and tomorrow's audit would re-enqueue the same finding under a new id. The 13 aged `low` items are the only ones the guard permits, and none is stale enough to be worth losing.
- **Status changes: 0**, for the reason above.
- **Closed: 4.** Three Chains items on evidence (`readme-24-releases-stale`, `dashboard-sync-exit3-every-run`, `claudemd-flag-gating`, all verified fixed in the v1.0-v1.5.0 launch run rather than taken on the changelog's word), plus `nightly-2026-08-02-gnosis-29-commits-unpushed`, which resolved the same night it was filed.
- **Opened: 8.** Two Chains, two Cattery, two Gnosis, one Skylight, one cross-project.
- **Narrowed: 1.** `canonical-audit-2026-07-25-scheduler-git-lock-guard-defeated` cut from three files to one, with an explicit do-not-re-fix note naming the two already closed.
- **Schema normalisation: 8.** Tonight's new items were written without the corpus's `added` date key (and the sweep initially reached for `createdAt`, the same wrong key the previous pass had to correct). All 8 rewritten to carry `added`, `kind` and `attempts`. Without this they would be invisible to every future age-based triage pass. **This is now two consecutive nights the sweep made the same schema mistake** and it should be fixed in the skill, not re-corrected nightly.

### Intake vs close: the governor cannot reach its own target

`status/data/backlog-trend.json`, written by `backlog-burndown-daily`:

| Date | actionsOpen | queuePending | opened | closed | Outcome |
|---|---|---|---|---|---|
| 2026-07-27 | 399 | 358 | 0 | 7 | target met |
| 2026-07-28 | 398 | 382 | 11 | 13 | target met |
| 2026-07-30 | 560 | 536 | **164** | 2 | UNDER-WATER, target 166 |
| 2026-08-01 | 668 | 576 | **109** | 2 | UNDER-WATER, target 111 |

Two things broke together and they compound:

**1. Intake jumped an order of magnitude.** Daily intake ran 0-11 while per-project audits fed the queue. Since 2026-07-30 it has run 109-164, because the bar-raise routines file every lens finding as a queue item. The governor's rule is "close intake + 2", so at an intake of 164 the target is unreachable in a 45-minute box and it logs UNDER-WATER and closes 2.

**2. There is no automated drain left.** The `auto_safe: true` pool is at **zero pending items**, and `queue-drain-hourly` - the routine that drained it - is `enabled: false`, last run 2026-07-31. The only live drain is `backlog-burndown-daily`: judgment-authorized, time-boxed, closing 2 per run for two runs.

Net roughly 100+ in and 2 out, daily. `actionsOpen` has gone 398 → 560 → 668 in five days and the aged P1 band 39 → 56 overnight. Nothing in the current routine set changes that slope.

### Recommendation

This queue does not need triage, and it will not respond to more of it. The options are a decision for Kane:

- **Cap bar-raise intake.** File only the top N findings per run and summarise the rest in the report, so the queue tracks what will actually be worked.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER daily.

Doing none of these is also a choice, and its outcome is visible: the P1 band grew 44% in one day and no item in it has been attempted once.
