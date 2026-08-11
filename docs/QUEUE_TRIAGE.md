# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-11.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-11. Queue read directly for measurement; no mutations made this pass (tonight's twelve canonical-doc audits found no findings not already queued).

### Depth

| Measure | 2026-08-09 | 2026-08-10 | 2026-08-11 | Δ |
|---|---|---|---|---|
| Total items | 885 | 885 | 885 | 0 |
| `pending` | 752 | 752 | 752 | 0 |
| `blocked-on-user` | 57 | 57 | 57 | 0 |
| `completed` | 64 | 64 | 64 | 0 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 2 | 2 | 2 | 0 |
| Promptless (undrainable) | 11 | 11 | 11 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

Second flat night in a row — zero net change on every measure. No new bar-raise dumps landed, and nothing was drained by this pass (structural items still need judgment, not a nightly audit).

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**545 items, up from 539 on 2026-08-10 (+6), ordinary calendar drift.** Severity: 329 `medium`, 164 `high`, 40 `low`, 6 unset (plus 5 `MED`/1 `HIGH` casing outliers, unchanged). Priority: 326 P2, **167 P1**, 48 P3, 2 P4, 2 P0. Oldest is now **25 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`, unchanged item, one day older).

By project: hordes 207, rising 100, everything 46, gnosis 44, budget 26, skylight 20, ring 20, chains 16, apothecary 10, agents 10, scheduler 9, cattery 7, cross 6, yab 6, portfolio 5, plus the casing-split remainder below.

### The aged P1/high band grew with the calendar, still never attempted

**173 aged P1/high items, all 173 at `attempts: 0`.** Up from 172 on 2026-08-10 (+1). Disposition unchanged from every prior pass: **leave all 173 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue: these were never started, they're not waiting on Kane for an answer.

Hordes alone accounts for 207 of 545 aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Sixteenth consecutive nightly pass recording an empty Applied section there for exactly this reason.

### Escalated: the project-key casing split is much wider than previously tracked

Prior passes flagged this as a 3-item cosmetic issue confined to Chains. Re-measured across the **whole queue** (not just the aged-structural slice) tonight, it's structural on two more projects:

| Project | lowercase | Capitalized | Split |
|---|---|---|---|
| `ring` / `Ring` | 30 | 29 | **49% miscased** |
| `cattery` / `Cattery` | 20 | 24 | **55% miscased — capitalized is now the majority form** |
| `chains` / `Chains` | 49 | 3 | 6% miscased (unchanged, previously known) |

Plus 8 one-off items carrying the full repo name instead of the short slug (`YesAndEverything` ×2, `BrackishRising`, `YesAndBudget`, `YesAndApothecary`, `YesAndRing`, `YesAndCattery`, `YesAndGnosis`, `YesAndSkylight` ×1 each).

Still nothing confirmed to read `project` case-sensitively — this pass did not re-derive that against every consumer (`work-queue-runner`, per-project filters, any dashboard aggregation) to stay in the time box. But at roughly 50/50 for two projects, any future project-scoped count or filter is now a coin flip away from being half-wrong, not a cosmetic footnote. Not auto-fixed tonight: a bulk lowercase-normalize of ~76 items' `project` field is mechanical, but it's a schema-wide rewrite via `queue_write.py`, not a single finding's fix, and deserves a real before/after diff review rather than a nightly drive-by. Flagging as the top candidate for `drift-auto-fix` or a dedicated one-off pass, not queuing a duplicate finding since the mechanism (casing drift from inconsistent `project` values across different enqueue call sites) is the same root cause as the existing Chains item.

**Re-verified: no real duplicate-title groups.** Zero duplicates among pending items carrying a `title` field.

### Two dropped high/P1 items, re-checked against the severity guard

`bar-raise-2026-07-24-agents-audit-loop-prune-scope` and `yaag-queue-drain-hourly-disabled-6-days` are both `status: dropped` despite `severity: high` / `priority: P1`. Re-read both `resolution` fields tonight: both carry a dated, evidenced investigation (2026-08-01 and 2026-08-08 respectively) concluding the finding doesn't reproduce or isn't a regression, not a silent archive. Consistent with the severity guard's intent (escalate, don't delete) even though the status string is `dropped` rather than `blocked-on-user` — these were resolved with evidence, not shelved. No action.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly.
- **Status changes: 0** from queue-triage tonight.
- **Opened: 0** from this queue-triage pass directly. Tonight's twelve canonical-doc audits found no findings not already queued.
- **Flagged, not yet actioned:** the widened casing split (Ring, Cattery, Chains — detail above, now a real data-integrity risk rather than cosmetic); the 11 promptless `bar-raise-finding` items from 2026-08-03, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`, now 16 days after it was filed (2026-07-26).

### Recommendation

Unchanged in substance from every prior pass, with one addition: the casing split (above) just crossed from "3-item cosmetic footnote" to "coin-flip on two projects," and is now the single highest-value quick win in the queue — a mechanical bulk fix, not a design decision, unlike everything else on this list. Separately, still a decision for Kane:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — the 11 stranded items from 2026-08-03 are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, now 16 days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.
- **Grow the daily governor's box**, especially given the queue's demonstrated capacity to absorb 88 items in a single overnight window.

Doing none of these is also a choice. Its outcome is visible: 173 P1/high items, none of them ever attempted, the oldest now 25 days.
