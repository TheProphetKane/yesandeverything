# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-07.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-07. Queue read directly for measurement; no mutations this pass — the only queue-adjacent write tonight was the twelve `status/data/*.json` audit-pointer refreshes, which don't touch `.work-queue.json`. Ages measured on the corpus's own `added` key, matching prior passes.

### Depth

| Measure | 2026-08-05 | 2026-08-06 | 2026-08-07 | Δ |
|---|---|---|---|---|
| Total items | 667 | 717 | 744 | +27 |
| `pending` | 552 | 596 | 619 | +23 |
| `blocked-on-user` | 58 | 57 | 57 | 0 |
| `completed` | 46 | 53 | 57 | +4 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 1 | 1 | 1 | 0 |
| Promptless (undrainable) | 11 | 11 | 11 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

The +27 total / +23 pending growth is the 27-item intake dated 2026-08-06 (mostly Scheduler bar-raise findings from the `bar-raise-2026-08-05-scheduler-*` batch, landing a day after their bar-raise pass ran). +4 completed matches four Scheduler drift-fix items closed after v0.7.2 shipped (see tonight's Scheduler canonical audit) plus routine housekeeping closures.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**480 items, up sharply from 325 on 2026-08-06 (+155).** This is not new drift accumulating gradually — it's a single dated batch crossing the seven-day line all at once. **156 items dated 2026-07-30** (a portfolio bar-raise dump, 136 of them `bar-raise-finding` kind) turned 8 days old today: 71 Hordes, 50 Rising, 15 Budget, and smaller counts across Gnosis, Chains, Agents, Apothecary, Scheduler, Skylight, Ring, Everything, Cattery. Yesterday those same 156 were exactly 7 days old and hadn't crossed the `> 7` threshold yet; today they did, in one step. Severity: 319 medium, **118 high**, 37 low, 6 unset. Priority: 315 P2, **120 P1**, 43 P3, 2 P4. Oldest is now **21 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`).

By project: hordes 196, rising 100, everything 39, budget 26, gnosis 21, ring 20, chains 14 (+3 more under a capitalized `Chains` key, see below), skylight 13, apothecary 10, agents 10, scheduler 9, yab 6, cattery 6, cross 5, portfolio 1, skill-suite 1.

### The aged P1/high band has still never been attempted

**124 aged P1/high items, all 124 at `attempts: 0`.** Up from 72 last pass, same one-time cause as the aging spike above (51 of the 07-30 batch are `high` severity). Not one has been picked up and failed — this remains a "never started" queue, not a "tried and stuck" one.

Disposition, unchanged from every prior pass and for the same reason: **leave all 124 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That's deliberately not applied here, because `blocked-on-user` would assert something untrue — these were never started, they're not waiting on Kane for an answer.

Hordes alone accounts for 196 of 480 aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Twelfth consecutive nightly pass recording an empty Applied section there for exactly this reason.

### Carried: a project-key casing split (LOW, minor schema drift)

Three queued items (`canonical-audit-2026-07-28-chains-preship-doc-staleness-gate`, `-docs-audits-stale-committed`, `-manifest-ai-copy`) still carry `"project": "Chains"` (capitalized) against 14 other Chains items carrying `"project": "chains"` (lowercase). Cosmetic — nothing reads `project` case-sensitively that this pass could confirm — but it would silently split any future per-project count or filter that does. Not fixed tonight, same reason as before (needs a decision on canonical casing before a bulk rewrite).

**Re-verified: no real duplicate-title groups.** Restricted the check to the 446 pending items that actually carry a `title` field — zero duplicates. Zero items missing the `added` key.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly. This session's other closures (four Scheduler drift-fix items after v0.7.2 shipped) were resolved by their own canonical-audit pass, not by queue-triage.
- **Status changes: 0** from queue-triage tonight.
- **Opened: 0** from this queue-triage pass directly. Tonight's twelve canonical-doc audits found no findings not already queued.
- **Flagged, not yet actioned:** the project-key casing split (detail above); the 11 promptless `bar-raise-finding` items from 2026-08-03 remain undrained, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`, unchanged since 2026-08-04.
- **Schema normalisation: 0 applied** (the casing split is flagged, not fixed, pending a canonical-form decision).

### Recommendation

Unchanged from every prior pass, sharpened by tonight's reading: a single seven-day-old bar-raise dump just doubled the "never attempted" P1/high pile from 72 to 124 in one step, purely from the calendar catching up to a dump that already happened. The options are a decision for Kane:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — the 11 stranded items from 2026-08-03 are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, still live fifteen days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.
- **Grow the daily governor's box on days following a large bar-raise dump**, especially given tonight's evidence that a single dump can double the aged-P1/high count on its 8th day with zero new findings.

Doing none of these is also a choice. Its outcome is visible: 124 P1/high items, none of them ever attempted, the oldest now 21 days, and an undrainable-item defect that keeps reproducing on every bar-raise run.
