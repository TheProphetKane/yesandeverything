# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-04.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-04. Queue read directly for measurement; the one mutation this pass made (a closure) went through `scripts/queue_write.py`, which takes the shared lock and verifies the readback. Ages measured on the corpus's own `added` key, matching prior passes.

### Depth

| Measure | 2026-08-02 | 2026-08-03 | 2026-08-04 | Δ |
|---|---|---|---|---|
| Total items | 655 | 656 | **667** | +11 |
| `pending` | 542 | 543 | 554 | +11 |
| `blocked-on-user` | 58 | 58 | 58 | 0 |
| `completed` | 44 | 44 | **45** | +1 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 1 | 1 | 1 | 0 |
| Promptless (undrainable) | 0 | 0 | **11** | +11 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

The queue grew by 11 net, and it's a clean paper trail: 11 new pending items, all `bar-raise-finding` kind from an 2026-08-03 bar-raise run, and all 11 are **promptless** — no `prompt` field, so `work-queue-runner` cannot execute them. This is not a new defect: `queue-drain-2026-07-26-promptless-enqueues-undrainable` has tracked exactly this failure mode since 2026-07-26 ("Enqueue writers keep emitting items with no `prompt`... rate is rising"), and this pass is fresh evidence the rate is still rising. These 11 are one day old, so they don't fall into the aged-structural bucket below yet — flagging them now, before they age in, is the point of catching this early.

**One closure landed this pass:** `canonical-audit-2026-07-30-scheduler-inert-system-settings-keys` (was pending, high). Tonight's Scheduler canonical-doc audit confirmed `DESIGN.md:355` (commit `d96b296`, 2026-07-30) now states plainly which `system_settings` keys are enforced and which aren't — the doc-vs-code drift this item tracked no longer exists. Closed with a note citing the evidence.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**295 items**, up from 267 on 2026-08-03. Severity: 206 medium, **66 high**, 22 low, 1 unset. Priority: 200 P2, **66 P1**, 28 P3, 1 P4. Oldest is still **18 days** (2026-07-17) — the tail isn't growing backwards, the middle keeps crossing the seven-day line.

By project: hordes 124, rising 40, everything 35, ring 19, gnosis 14, chains 10, skylight 9, scheduler 9, budget 9, yab 6, agents 6, apothecary 5, cattery 4, cross 3, portfolio 1, skill-suite 1.

### The aged P1/high band has still never been attempted

**69 aged P1/high items, all 69 at `attempts: 0`.** Not one has been picked up and failed. Fourth consecutive pass finding the same clean pattern: 39, then 56, then 62, now 69.

Disposition, unchanged from the previous three passes and for the same reason: **leave all 69 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That's deliberately not applied here, because `blocked-on-user` would assert something untrue — these were never started, they're not waiting on Kane for an answer. Marking them so would also hide them from `backlog-burndown-daily`, the one routine explicitly authorized to attempt judgment-bound work.

Hordes alone accounts for 124 of 295 aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Ninth consecutive nightly pass recording an empty Applied section there for exactly this reason.

### Actions taken

- **Archived: 0.** Same justification as every prior pass: zero duplicate-title groups measured across all 554 pending items, zero items missing the `added` key, and every re-checked aged item still traces to a finding this sweep (or a prior one) verified against disk tonight.
- **Closed: 1.** `canonical-audit-2026-07-30-scheduler-inert-system-settings-keys` (detail above).
- **Status changes: 1** (the closure above). No other status changes — nothing else became provably done tonight.
- **Opened: 0** from this queue-triage pass directly. (Tonight's twelve canonical-doc audits found no findings that weren't already queued — see each project's `CANONICAL_AUDIT-2026-08-04.md`.)
- **Flagged, not yet actioned:** the 11 new promptless `bar-raise-finding` items (detail above) — fresh evidence for the standing `queue-drain-2026-07-26-promptless-enqueues-undrainable` item, not a new root cause.
- **Schema normalisation: 0 needed.**

### Intake vs close: still cannot reach its own target

`status/data/backlog-trend.json`, written by `backlog-burndown-daily`, was not independently re-derived this pass (stayed inside the nightly time box); the 2026-08-02 trend note (`intake 0, closed 5, net -5`, first good week in a while) is the most recent reading on record. This report doesn't have a fresher number to add to that table tonight.

### Recommendation

Unchanged from every prior pass, because nothing about the structure changed. This queue does not need triage and will not respond to more of it. The options are a decision for Kane:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — tonight's 11 new stranded items are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, still live eight days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.

Doing none of these is also a choice. Its outcome is visible: 69 P1/high items, none of them ever attempted, the oldest now 18 days, and an undrainable-item defect that keeps reproducing on every bar-raise run.
