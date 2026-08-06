# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-06.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-06. Queue read directly for measurement; no mutations this pass beyond what tonight's PART A HBH audit already made (a resolution-note addition on two already-`completed` items, via `scripts/queue_write.py`, shared lock, verified readback). Ages measured on the corpus's own `added` key, matching prior passes.

### Depth

| Measure | 2026-08-04 | 2026-08-05 | 2026-08-06 | Δ |
|---|---|---|---|---|
| Total items | 667 | 667 | 717 | +50 |
| `pending` | 554 | 552 | 596 | +44 |
| `blocked-on-user` | 58 | 58 | 57 | -1 |
| `completed` | 45 | 46 | 53 | +7 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 1 | 1 | 1 | 0 |
| Promptless (undrainable) | 11 | 11 | 11 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

**The +50 total / +44 pending jump is real intake, not a measurement artifact.** 50 new `drift-fix` items landed dated 2026-08-05: 31 Scheduler + 18 Apothecary + 1 Chains, all `pending`, all under a day old, all from bar-raise passes on those projects (a Hono CORS-credential-reflection CVE and a react-router-dom DoS/CSRF CVE among the Scheduler batch). `backlog-trend.json`'s own 2026-08-05 note independently confirms a 52-item intake day and 5 closures against a 54-item target ("UNDER-WATER"), consistent with these counts. This growth is also why tonight's YaE canonical audit measured `.work-queue.json` up ~58KB in one cycle instead of the recent flat pattern.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**325 items**, down from 332 on 2026-08-05 despite the intake, because most of tonight's new arrivals are under a day old and don't cross the 7-day line yet. Severity: 221 medium, **68 high**, 30 low, 6 unset. Priority: 218 P2, **68 P1**, 37 P3, 2 P4. Oldest is now **20 days** (2026-07-17) — the tail isn't growing backwards, the middle keeps crossing the seven-day line.

By project: hordes 125, rising 50, everything 38, ring 19, gnosis 17, chains 11 (+3 more under a capitalized `Chains` key, see below), skylight 11, budget 11, scheduler 8, apothecary 7, agents 7, yab 6, cross 5, cattery 5, portfolio 1, skill-suite 1.

### The aged P1/high band has still never been attempted

**72 aged P1/high items, all 72 at `attempts: 0`.** Not one has been picked up and failed. Sixth consecutive pass finding the same clean pattern: 39, 56, 62, 69, 73, now 72 (one point below last night, inside noise — no closures landed in this specific band tonight).

Disposition, unchanged from the previous five passes and for the same reason: **leave all 72 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That's deliberately not applied here, because `blocked-on-user` would assert something untrue — these were never started, they're not waiting on Kane for an answer.

Hordes alone accounts for 125 of 325 aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Eleventh consecutive nightly pass recording an empty Applied section there for exactly this reason.

### Carried: a project-key casing split (LOW, minor schema drift)

Three queued items (`canonical-audit-2026-07-28-chains-preship-doc-staleness-gate`, `-docs-audits-stale-committed`, `-manifest-ai-copy`) still carry `"project": "Chains"` (capitalized) against 49 other Chains items carrying `"project": "chains"` (lowercase). Cosmetic — nothing reads `project` case-sensitively that this pass could confirm — but it would silently split any future per-project count or filter that does. Not fixed tonight, same reason as before (needs a decision on canonical casing before a bulk rewrite).

**Re-verified: no real duplicate-title groups.** Restricted the check to the 552 pending items that actually carry a `title` field (excludes the `bar-raise-finding` kind, which keys off `finding_id`/`detail` instead and produced the false positive two passes ago) — zero duplicates. Zero items missing the `added` key.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly. Two HBH items (`hbh-gdd-settings-backbone-stale-2026-07-17`, `hbh-gdd-path-extends-phrasing-2026-07-17`) were already `completed` on entry tonight (closed by an earlier pass); this session's HBH canonical audit added a `resolvedNote` cross-referencing the exact fixing commit, not a new status change.
- **Status changes: 0** from queue-triage tonight.
- **Opened: 0** from this queue-triage pass directly. The 50-item intake this cycle came from bar-raise passes on Scheduler and Apothecary, not from tonight's twelve canonical-doc audits, which found no findings not already queued.
- **Flagged, not yet actioned:** the project-key casing split (detail above); the 11 promptless `bar-raise-finding` items from 2026-08-03 remain undrained, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`, unchanged since 2026-08-04.
- **Schema normalisation: 0 applied** (the casing split is flagged, not fixed, pending a canonical-form decision).

### Intake vs close: still cannot reach its own target

`status/data/backlog-trend.json`'s most recent entry (2026-08-05, `updated: 2026-08-05T13:15:00Z`) logged UNDER-WATER again: intake 52 against a target of 54, only 5 closed in the 45-minute box, explicitly flagging that a single bar-raise dump can outrun the daily governor's box. Not independently re-derived tonight (stayed inside the nightly time box); this is the most recent reading on record.

### Recommendation

Unchanged from every prior pass, because nothing about the structure changed — if anything, tonight's 50-item bar-raise intake sharpens the case. The options are a decision for Kane:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — the 11 stranded items from 2026-08-03 are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, still live twelve days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.
- **Grow the daily governor's box on days following a large bar-raise dump** — `backlog-trend.json`'s own 2026-08-05 note raised this explicitly after a 52-item day it could only close 5 against.

Doing none of these is also a choice. Its outcome is visible: 72 P1/high items, none of them ever attempted, the oldest now 20 days, and an undrainable-item defect that keeps reproducing on every bar-raise run.
