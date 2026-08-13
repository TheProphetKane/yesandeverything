# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-13.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-13. No new items opened by tonight's twelve canonical-doc audits — one carried finding (Chains stale-diff) is already filed `blocked-on-user` from last night, re-verified still accurate, not re-opened. The queue grew anyway: yesterday's Scheduler and Apothecary bar-raise passes each dumped their findings in, and 17 of them landed with no `prompt` field — the same promptless-enqueue bug flagged 17 days ago recurring on fresh intake.

### Depth

| Measure | 2026-08-11 | 2026-08-12 | 2026-08-13 | Δ |
|---|---|---|---|---|
| Total items | 885 | 886 | 903 | +17 |
| `pending` | 752 | 752 | 762 | +10 |
| `blocked-on-user` | 57 | 58 | 58 | 0 |
| `completed` | 64 | 64 | 71 | +7 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 2 | 2 | 2 | 0 |
| Promptless (undrainable) | 11 | 11 | 28 | **+17** |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

The +17 total and +17 promptless move together: all seventeen of tonight's new items are the Scheduler/Apothecary bar-raise dump, and every one of them landed promptless. +7 completed and +10 pending reflect independent daytime drain activity (`queue-drain-hourly`, outside this session), not this pass.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**604 items**, up from 539 on 2026-08-12 (+65) — the promptless dump plus normal aging (items that crossed the 7-day line since last night) both contribute; no mass resolution happened. Severity: 372 `medium`, 180 `high`, 41 `low`, 11 unset/inconsistent-cased. Priority: 370 P2, **182 P1**, 48 P3, 2 P4, 2 P0. Oldest is now **27 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`, unchanged item, one day older).

### The promptless batch — worsened, not just carried

The 11 stranded items from 2026-08-03 are unchanged and still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`. Tonight adds a **second, larger occurrence**: 17 fresh `bar-raise-finding` items from `docs/BAR_RAISE-2026-08-12.md` (Scheduler and Apothecary), all pending, all with no `prompt`, so the runner can never pick them up regardless of priority. Five of the seventeen are `severity: high`. This is the same root cause recurring on new intake, not a new bug — the fix already queued (`queue-drain-2026-07-26-promptless-enqueues-undrainable`) is now protecting against 28 stranded items instead of 11.

### The aged P1/high band, still never attempted

Disposition unchanged from every prior pass: **leave pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue for items that were never started and aren't waiting on a Kane decision. Same reasoning covers the five new promptless HIGH items: they're not waiting on Kane, they're waiting on the enqueue-path fix.

Hordes still accounts for the largest single-project share of aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do.

### Project-key casing split — re-measured, unchanged in substance

| Project | lowercase | Capitalized | Split |
|---|---|---|---|
| `ring` / `Ring` | 30 | 29 | ~49% miscased |
| `cattery` / `Cattery` | 20 | 24 | ~55% miscased — capitalized still the majority form |
| `chains` / `Chains` | 50 | 3 | ~6% miscased |

Still the top mechanical quick-win in the queue — flagged, not fixed, same reasoning as every prior pass: a bulk lowercase-normalize is schema-wide and deserves a real before/after diff review, not a nightly drive-by.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly.
- **Status changes: 0** on existing items from queue-triage tonight.
- **Opened: 0** — tonight's twelve canonical-doc audits produced no new findings beyond what's already queued.
- **Flagged, not yet actioned:** the casing split (Ring, Cattery — still real, unchanged); the promptless batch, now 28 items across two occurrences (11 from 2026-08-03, 17 new from 2026-08-12's Scheduler/Apothecary bar-raise).

### Recommendation

Unchanged in substance from every prior pass, with the promptless item now more urgent:

- **Fix the promptless-enqueue bug at the source before the next bar-raise pass runs.** It just doubled its damage on one night's intake (11 to 28) with zero drain in between — the failure mode is confirmed to recur on every bar-raise dump, not a one-off from 2026-08-03.
- **Cap bar-raise intake** so a single pass can't add double-digit undrainable items in one shot.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **The casing split** (Ring, Cattery above) is a mechanical bulk fix, not a design decision — still the single highest-value quick win sitting untouched.
- **Grow the daily governor's box**, especially given the queue's demonstrated capacity to absorb large single-night intake spikes.

Doing none of these is also a choice. Its outcome is visible: 182 P1/high items, none of them ever attempted, the oldest now 27 days, and the promptless pile now 28 items deep.
