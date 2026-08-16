# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-16.

## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-16. Tonight's twelve canonical-doc audits opened **zero** new structural items — every finding was either resolved outright (Scheduler's swap-hour-cap and urgent-flag findings turned out already fixed 2026-08-14, discovered and closed on re-verification tonight; Ring's sw.js self-stamp confirmed working) or already carried/queued from a prior pass. Total item count rose to 957 (+10 since 2026-08-15), driven by daytime drain/burndown activity outside this session, not tonight's audits.

### Depth

| Measure | 2026-08-14 | 2026-08-15 | 2026-08-16 | Δ |
|---|---|---|---|---|
| Total items | 947 | 947 | 957 | +10 |
| `pending` | 803 | 621 | 632 | +11 |
| `blocked-on-user` | 58 | 116 | 116 | 0 |
| `completed` | 74 | 197 | 196 | -1 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 2 | 3 | 3 | 0 |
| Promptless (undrainable) | 28 | 1 (completed, 0 pending) | 1 (completed, 0 pending) | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**577 items** (up from 497 on 2026-08-15). The jump is a real cluster crossing the 7-day line, not an error: an 86-item batch added 2026-08-08 turned 8 days old today and moved from "not yet aged" to "aged." Age histogram of all 632 pending items shows clear cluster days at 8 (86), 17 (114), and 23 (96) — consistent with past bar-raise/audit dump days, not steady daily accretion. Severity: 342 `medium`, 121 `high`, 79 `med` (inconsistent casing/spelling, not re-normalized), 29 `low`, 6 unset. Priority: 413 P2, **124 P1**, 37 P3, 2 P4, 1 P0. Oldest is now **30 days** (the 2026-07-17 `bar-raise-2026-07-17-*` batch, six-plus items tied).

### The promptless batch — stays cleared

Still a single item (`bar-raise-2026-08-12-apothecary-queue-project-casing`), and it's `status: completed` — confirmed again tonight, not stranded. `queue-drain-2026-07-26-promptless-enqueues-undrainable` (the root-cause tracker) is still `blocked-on-user`, unchanged from 2026-08-15 — its mechanism was not independently re-verified tonight either, same carried limitation.

### The aged P1/high band, still never attempted

Disposition unchanged from every prior pass: **leave pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue for items that were never started and aren't waiting on a Kane decision.

Hordes still accounts for the largest single-project share of aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do.

Cattery's Supabase-credential-scope findings (`canonical-audit-2026-07-16-cattery-orders-cascade-prod-unapplied` and sibling) are now on their **seventeenth consecutive night** unresolved and unresolvable by any unattended pass — re-verified live via `list_projects()` during tonight's Cattery audit, same two-project list as every prior night. It needs Kane to re-scope the MCP credential.

Two Scheduler items thought to be in this band (`canonical-audit-2026-07-30-scheduler-swap-hour-cap-unenforced`, `canonical-audit-2026-07-26-scheduler-urgent-flag-unimplemented`) turned out to already carry `status: completed` with resolutions dated 2026-08-14 — tonight's Scheduler audit caught that 2026-08-15's own audit had stale-carried them as still-open. No queue action needed; they were already correctly closed in the queue itself, just misreported in the prior day's audit narrative.

### Project-key casing split — re-measured, unchanged in substance

| Project | lowercase | Capitalized | Split |
|---|---|---|---|
| `ring` / `Ring` | 33 | 29 | ~47% miscased |
| `cattery` / `Cattery` | 20 | 24 | ~55% miscased — capitalized still the majority form |
| `chains` / `Chains` | 50 | 3 | ~6% miscased |

Still the top mechanical quick-win in the queue — flagged, not fixed, same reasoning as every prior pass: a bulk lowercase-normalize is schema-wide and deserves a real before/after diff review, not a nightly drive-by.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly.
- **Status changes: 0** on existing items from queue-triage tonight.
- **Opened: 0** — every Part A finding tonight was either self-resolving, already carried/queued, or (Scheduler's two items) discovered to already be closed.
- **Flagged, not yet actioned:** the casing split (Ring, Cattery — still real, unchanged); Cattery's seventeen-night-unresolved Supabase credential scope, called out directly for Kane again.

### Recommendation

Mostly unchanged from prior passes:

- **Re-scope the Supabase MCP credential to include Cattery's project** — seventeen consecutive nights blocked on this alone, and it is a five-minute fix only Kane can make. This is now the single most persistent open item in the entire portfolio.
- **The casing split** (Ring, Cattery above) is a mechanical bulk fix, not a design decision — still the single highest-value quick win sitting untouched.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **Grow the daily governor's box**, especially given the aged band's continued growth (497 → 577) even as daytime drain keeps `pending` roughly flat.

Doing none of these is also a choice. Its outcome is visible: 124 P1/high items in the aged band, none of them ever attempted, the oldest now 30 days.
