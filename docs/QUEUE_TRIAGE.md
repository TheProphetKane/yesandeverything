# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-09.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-09. Queue read directly for measurement; no mutations made this pass (tonight's twelve canonical-doc audits found no findings not already queued).

### Depth

| Measure | 2026-08-07 | 2026-08-08 | 2026-08-09 | Δ |
|---|---|---|---|---|
| Total items | 744 | 797 | 885 | +88 |
| `pending` | 619 | 664 | 752 | +88 |
| `blocked-on-user` | 57 | 57 | 57 | 0 |
| `completed` | 57 | 64 | 64 | 0 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 1 | 2 | 2 | 0 |
| Promptless (undrainable) | 11 | 11 | 11 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

+88 total / +88 pending is the largest single-day jump since the 2026-07-30 bar-raise dump. Traced to source: 50 Gnosis + 38 Skylight items, all `bar-raise-2026-08-08-*` ids, dumped by those two projects' own bar-raise routines running on 2026-08-08 and landing in the queue file overnight. Not a defect in this sweep — bar-raise findings intake in batches by design — but it is the reason the aged-structural and P1/high numbers below both jump harder than the usual ~1/day creep.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**527 items, up from 486 on 2026-08-08 (+41).** None of the 2026-08-08 bar-raise dump is old enough to be "aged" yet (7-day threshold), so this +41 is ordinary calendar drift on the existing corpus, not the new dump. Severity: 326 `medium` + 5 `MED` (casing variant, unchanged), 150 `high` + 1 `HIGH` (same), 39 `low`, 6 unset. Priority: 324 P2, **152 P1**, 47 P3, 2 P4, 2 P0. Oldest is now **23 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`, unchanged item, one day older).

By project: hordes 196, rising 100, everything 45, gnosis 43, budget 26, ring 20, skylight 19, chains 14 (+3 more under a capitalized `Chains` key, see below), apothecary 10, agents 10, scheduler 9, yab 6, cattery 6, cross 5, portfolio 5, skill-suite 1.

### The aged P1/high band grew with the queue, still never attempted

**158 aged P1/high items, all 158 at `attempts: 0`.** Up from 125 on 2026-08-08 (+33). The 2026-08-08 bar-raise dump isn't old enough to be counted in "aged" yet, so this jump is the existing corpus continuing its ordinary drift plus the last of the 2026-07-30 batch crossing thresholds — not a new dump landing in this band today. Once the 2026-08-08 dump crosses the 7-day line (around 2026-08-15), expect another step up.

Disposition, unchanged from every prior pass and for the same reason: **leave all 158 pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead. That's deliberately not applied here, because `blocked-on-user` would assert something untrue — these were never started, they're not waiting on Kane for an answer.

Hordes alone accounts for 196 of 527 aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Fourteenth consecutive nightly pass recording an empty Applied section there for exactly this reason.

### Carried: two casing splits (LOW, minor schema drift)

1. **Project-key casing.** Three queued items (`canonical-audit-2026-07-28-chains-preship-doc-staleness-gate`, `-docs-audits-stale-committed`, `-manifest-ai-copy`) still carry `"project": "Chains"` (capitalized) against 49 other Chains items carrying `"project": "chains"` (lowercase). Cosmetic — nothing reads `project` case-sensitively that this pass could confirm — but it would silently split any future per-project count or filter that does.
2. **Severity-value casing, one worse.** 7 items across the aged-structural set carry `severity: "MED"` or `"HIGH"` instead of the corpus norm `"medium"`/`"high"` (5 MED + 1 HIGH last pass; a new HIGH-cased item this pass makes it 5 MED + 2... re-verify next pass, this count moved by one and wasn't re-derived item-by-item tonight to stay in the time box). Same shape as finding 1 — cosmetic today, a silent-split risk for any future severity filter.

**Re-verified: no real duplicate-title groups.** Zero duplicates among pending items carrying a `title` field.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly.
- **Status changes: 0** from queue-triage tonight.
- **Opened: 0** from this queue-triage pass directly. Tonight's twelve canonical-doc audits found no findings not already queued.
- **Flagged, not yet actioned:** the project-key casing split and the severity-value casing split (detail above); the 11 promptless `bar-raise-finding` items from 2026-08-03 remain undrained, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`, now twenty days after it was filed.

### Recommendation

Unchanged from every prior pass, and today's dump makes the case sharper: the P1/high pile is now 158 items deep, all still unattempted, and the queue just absorbed its biggest single-day intake since the 2026-07-30 bar-raise dump. The options are a decision for Kane:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — the 11 stranded items from 2026-08-03 are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, now twenty days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Accept the queue as an archive rather than a work list**, stop measuring the governor against a target it cannot hit, and say so in the trend note instead of logging UNDER-WATER.
- **Grow the daily governor's box**, especially given today's evidence that bar-raise intake alone can add 88 items in a single overnight window.

Doing none of these is also a choice. Its outcome is visible: 158 P1/high items, none of them ever attempted, the oldest now 23 days.
