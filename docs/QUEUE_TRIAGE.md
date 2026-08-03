# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-03.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-03. Queue read and written through `scripts/queue_write.py`, which takes the shared lock and verifies the readback. Ages measured on the corpus's own `added` key, matching the previous two passes so the numbers stay comparable.

### Depth

| Measure | 2026-08-01 | 2026-08-02 | 2026-08-03 | Δ |
|---|---|---|---|---|
| Total items | 619 | 655 | **656** | +1 |
| `pending` | 548 | 542 | 543 | +1 |
| `blocked-on-user` | 60 | 58 | 58 | 0 |
| `completed` | 1 | 44 | 44 | 0 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | - | 1 | 1 | 0 |
| Promptless (undrainable) | 0 | 0 | **0** | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | **0** | 0 |

**The queue barely moved, and that is the story.** One item in, none out. Every finding in tonight's twelve reports was already enqueued, so this sweep had almost nothing to add; and nothing drained it in twenty-four hours.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**267 items**, up from 239 last night. Severity: 188 medium, **60 high**, 18 low, 1 unset. Priority: 183 P2, **59 P1**, 24 P3, 1 P4. Oldest is **17 days** (2026-07-17); nothing is older, so the tail is not growing backwards, it is the middle crossing the seven-day line.

By project: hordes 123, rising 33, everything 30, ring 17, gnosis 14, chains 8, scheduler 8, skylight 6, yab 6, agents 6, apothecary 5, cattery 4, budget 4, cross 2, portfolio 1.

### The aged P1 band has still never been attempted

**62 aged P1/high items, 61 of them at `attempts: 0`** (the 62nd has no `attempts` key). Not one has been picked up and failed. Third consecutive pass finding the same clean pattern, at 39, then 56, now 62.

Across all 267 aged items: 257 at `attempts: 0`, 3 at `attempts: 1`, 7 unset. **96% of the aged backlog has never been touched once**, unchanged from last night.

Growth is slowing: the band went 39 → 56 (+44%) in the first day, then 56 → 62 (+11%) in the second. That is intake falling back toward normal after the bar-raise burst, not the backlog draining.

Disposition, unchanged from the previous two passes and for the same reason: **leave all 62 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That is deliberately not applied, because `blocked-on-user` would assert something untrue: these are not waiting on Kane for an answer, they were never started. Marking them so would also hide them from `backlog-burndown-daily`, the one routine explicitly authorized to attempt judgment-bound work.

Hordes alone accounts for 123 of 267 aged items. That is not neglect: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Every GDD-side finding is queued by construction and can only drain in an attended session. Eight consecutive nightly passes have recorded an empty Applied section there for exactly this reason.

### Actions taken

- **Archived: 0.** Justified, not skipped. Measured tonight: **zero duplicate-title groups** across all 543 pending items, **zero promptless items**, **zero items missing the `added` key**, and every aged item traces to a finding this sweep re-verified against disk. Archiving would not reduce work, it would delete the record and tomorrow's audit would re-enqueue the same finding under a new id.
- **Status changes: 0**, for the reason above.
- **Closed: 0.** Nothing became provably done in the last day. `canonical-audit-2026-07-30-yae-hub-audit-pointer-never-seeded` was checked as a candidate and deliberately left open: the hub's pointer resolves again tonight, but only because this sweep stamped it by hand, which is exactly what the item says nothing automated does.
- **Opened: 1.** `audit-dashboard-absolute-docsdir-writes-absolute-pointer-2026-08-03` (P3/low), a real defect this sweep hit and corrected mid-run. Written with `added`, `kind` and `attempts` present, so the schema mistake the last two passes had to fix did not recur.
- **Schema normalisation: 0 needed**, first pass in three nights with nothing to correct.

### Intake vs close: the governor still cannot reach its own target

`status/data/backlog-trend.json`, written by `backlog-burndown-daily`:

| Date | actionsOpen | queuePending | opened | closed | Outcome |
|---|---|---|---|---|---|
| 2026-07-27 | 399 | 358 | 0 | 7 | target met |
| 2026-07-28 | 398 | 382 | 11 | 13 | target met |
| 2026-07-30 | 560 | 536 | **164** | 2 | UNDER-WATER, target 166 |
| 2026-08-01 | 668 | 576 | **109** | 2 | UNDER-WATER, target 111 |
| 2026-08-02 | - | 663 | 0 | 5 | net -5 |

The 08-02 row is the first good news in a week: intake 0, closed 5. But it is a burst, not a trend, and it came from a burndown run rather than from any change to the structure below.

**1. Intake is bursty because bar-raise files every lens finding.** Daily intake ran 0-11 while per-project audits fed the queue; since 2026-07-30 it has spiked to 109-164 on bar-raise days and near zero otherwise. The governor's rule is "close intake + 2", which is unreachable in a 45-minute box on a spike day.

**2. There is still no automated drain.** The `auto_safe: true` pool is at **zero pending items** for a third consecutive night, and `queue-drain-hourly` remains `enabled: false`, last run 2026-07-31. The only live drain is `backlog-burndown-daily`: judgment-authorized, time-boxed, closing 2-5 per run.

At the observed rates the aged band grows on bar-raise days faster than the burndown clears in a week.

### Recommendation

Unchanged, because nothing about the structure changed. This queue does not need triage and will not respond to more of it. The options are a decision for Kane:

- **Cap bar-raise intake.** File only the top N findings per run and summarise the rest in the report, so the queue tracks what will actually be worked.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.

Doing none of these is also a choice. Its outcome is visible: 62 P1 items, none of them ever attempted, the oldest now 17 days.
