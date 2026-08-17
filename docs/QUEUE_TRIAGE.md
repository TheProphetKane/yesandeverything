# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-17.

## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-17. Tonight's twelve canonical-doc audits opened **zero** new structural items — every finding was either already carried/queued from a prior pass or newly informational (Gnosis's handler-pointer note, closed same night, never queued). Total item count and every status bucket are flat versus 2026-08-16 — no daytime drain or burndown activity landed between the two passes.

### Depth

| Measure | 2026-08-15 | 2026-08-16 | 2026-08-17 | Δ |
|---|---|---|---|---|
| Total items | 947 | 957 | 957 | 0 |
| `pending` | 621 | 632 | 632 | 0 |
| `blocked-on-user` | 116 | 116 | 116 | 0 |
| `completed` | 197 | 196 | 196 | 0 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 3 | 3 | 3 | 0 |
| Promptless (undrainable) | 1 (completed, 0 pending) | 1 (completed, 0 pending) | 1 (completed, 0 pending) | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

Flat across every bucket is itself the finding: the queue metadata's own `last_drain` field still reads `2026-07-31T00:00Z`, seventeen days stale, though the `completed` count's history shows real drain activity did happen between 2026-08-14 and 2026-08-15 — the field is unmaintained, not a live signal, and shouldn't be read as "nothing has drained in 17 days."

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**583 items** (up from 577 on 2026-08-16). Age histogram of all 632 pending items shows clusters at 9 days (86 — the 2026-08-08 batch, now aged), 16 (37), 18 (115), 24 (96), and 31 (74, the oldest cluster: 2026-07-17 `bar-raise-2026-07-17-*` batch). Severity: 342 `medium`, 122 `high`, 84 `med` (inconsistent casing/spelling, still not re-normalized), 29 `low`, 6 unset. Priority: 418 P2, **125 P1**, 37 P3, 2 P4, 1 P0. Oldest is now **31 days**.

### The promptless batch — stays cleared

Still a single item (`bar-raise-2026-08-12-apothecary-queue-project-casing`), status `completed` — confirmed again tonight, not stranded. `queue-drain-2026-07-26-promptless-enqueues-undrainable` (the root-cause tracker) is still `blocked-on-user`, unchanged.

### The aged P1/high band, still never attempted

Disposition unchanged: **leave pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue for items that were never started and aren't waiting on a Kane decision.

Hordes still accounts for the largest single-project share of aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do.

Cattery's Supabase-credential-scope findings (`canonical-audit-2026-07-16-cattery-orders-cascade-prod-unapplied` and sibling) are now on their **eighteenth consecutive night** unresolved and unresolvable by any unattended pass — re-verified live via `list_projects()` during tonight's Cattery audit, same two-project list as every prior night. It needs Kane to re-scope the MCP credential.

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
- **Opened: 0** — every Part A finding tonight was either carried/queued already or informational and self-closed same night (Gnosis's handler pointer, fixed inline during Part B).
- **Flagged, not yet actioned:** the casing split (Ring, Cattery — still real, unchanged); Cattery's eighteen-night-unresolved Supabase credential scope, called out directly for Kane again.

### Recommendation

Unchanged from prior passes — this is the same open decision, now one more night older:

- **Re-scope the Supabase MCP credential to include Cattery's project** — eighteen consecutive nights blocked on this alone, and it is a five-minute fix only Kane can make. This is the single most persistent open item in the entire portfolio.
- **The casing split** (Ring, Cattery above) is a mechanical bulk fix, not a design decision — still the single highest-value quick win sitting untouched.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box. Zero items have qualified as `auto_safe: true` for at least three consecutive passes now — the class is effectively empty, not just thin.
- **Decide the open-loop question directly** (`X:\OPEN-LOOPS.md`): widen auto-safe classification, or stop describing 632 pending items as a drainable queue and call it what it is — a backlog.

Doing none of these is also a choice. Its outcome is visible: 125 P1/high items in the aged band, none of them ever attempted, the oldest now 31 days.
