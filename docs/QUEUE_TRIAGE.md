# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-12.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-12. One item opened this pass: `canonical-audit-2026-08-12-chains-stale-uncommitted-diff` (P2, `blocked-on-user`) — a working-tree finding from tonight's Chains audit (nine-day-old uncommitted diff, no session claiming it), not a canonical-doc drift finding. No other findings from tonight's twelve canonical-doc audits were new; all else already queued.

### Depth

| Measure | 2026-08-10 | 2026-08-11 | 2026-08-12 | Δ |
|---|---|---|---|---|
| Total items | 885 | 885 | 886 | +1 |
| `pending` | 752 | 752 | 752 | 0 |
| `blocked-on-user` | 57 | 57 | 58 | +1 |
| `completed` | 64 | 64 | 64 | 0 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 2 | 2 | 2 | 0 |
| Promptless (undrainable) | 11 | 11 | 11 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

Total and `blocked-on-user` both moved by the one item opened tonight (Chains stale-diff finding, filed `blocked-on-user` directly since it's a Kane's-call question, not drainable work). Everything else flat — no new bar-raise dumps landed since 2026-08-11.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**539 items**, down from 545 on 2026-08-11 (−6) — net movement from independent hourly-drain activity during the day (not this pass; queue-drain-hourly runs outside this session), not a mass resolution. Severity: 329 `medium`, 164 `high`, 40 `low`, 6 unset. Priority: 321 P2, **166 P1**, 48 P3, 2 P4, 2 P0. Oldest is now **26 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`, unchanged item, one day older).

### The aged P1/high band, still never attempted

Disposition unchanged from every prior pass: **leave pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue for items that were never started and aren't waiting on a Kane decision.

Hordes still accounts for the largest single-project share of aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do.

### Project-key casing split — re-measured, unchanged in substance

| Project | lowercase | Capitalized | Split |
|---|---|---|---|
| `ring` / `Ring` | 30 | 29 | ~49% miscased |
| `cattery` / `Cattery` | 20 | 24 | ~55% miscased — capitalized still the majority form |
| `chains` / `Chains` | 50 | 3 | ~6% miscased (tonight's new item added lowercase, no change in kind) |

Still the top mechanical quick-win in the queue — flagged, not fixed, same reasoning as 2026-08-11: a bulk lowercase-normalize is schema-wide and deserves a real before/after diff review, not a nightly drive-by.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly.
- **Status changes: 0** on existing items from queue-triage tonight.
- **Opened: 1** — `canonical-audit-2026-08-12-chains-stale-uncommitted-diff` (P2, `blocked-on-user`), from tonight's working-trees cross-cutting sweep.
- **Flagged, not yet actioned:** the casing split (Ring, Cattery — still real, unchanged); the 11 promptless `bar-raise-finding` items from 2026-08-03, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`, now 17 days after it was filed (2026-07-26).

### Recommendation

Unchanged in substance from every prior pass:

- **Cap bar-raise intake** and fix the promptless-enqueue bug at the source — the 11 stranded items from 2026-08-03 are exactly the failure mode `queue-drain-2026-07-26-promptless-enqueues-undrainable` describes, now 17 days after it was filed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **The casing split** (Ring, Cattery above) is a mechanical bulk fix, not a design decision — still the single highest-value quick win sitting untouched.
- **Grow the daily governor's box**, especially given the queue's demonstrated capacity to absorb large single-night intake spikes.

Doing none of these is also a choice. Its outcome is visible: 166 P1/high items, none of them ever attempted, the oldest now 26 days.
