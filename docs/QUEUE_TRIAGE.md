# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-14.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-14. Tonight's twelve canonical-doc audits opened three new structural items — all Ring, all previously carried unqueued across multiple prior passes (service-worker cache-key staleness, `.project-context.json` milestone drift, `completion.pct` staleness) — filed and pushed during Part A. The promptless batch is unchanged at 28; no new occurrence tonight.

### Depth

| Measure | 2026-08-12 | 2026-08-13 | 2026-08-14 | Δ |
|---|---|---|---|---|
| Total items | 886 | 903 | 947 | +44 |
| `pending` | 752 | 762 | 803 | +41 |
| `blocked-on-user` | 58 | 58 | 58 | 0 |
| `completed` | 64 | 71 | 74 | +3 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 2 | 2 | 2 | 0 |
| Promptless (undrainable) | 11 | 28 | 28 | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

Most of the +44 total (+41 pending) landed during 2026-08-13 daytime, outside this session — `queue-drain-hourly` and daytime bar-raise/backlog activity, not tonight's sweep. Tonight's own contribution is the 3 Ring items filed above. Promptless held flat at 28: no fresh occurrence of the enqueue-path bug this pass.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**596 items.** Severity: 370 `medium`, 179 `high`, 41 `low`, 6 unset/inconsistent-cased. Priority: 363 P2, **181 P1**, 48 P3, 2 P4, 2 P0. Oldest is now **28 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`, unchanged item, one day older).

### The promptless batch — flat tonight

The 11 stranded items from 2026-08-03 plus the 17 from 2026-08-12's Scheduler/Apothecary bar-raise dump are both unchanged, still tracked by `queue-drain-2026-07-26-promptless-enqueues-undrainable`. No new promptless items landed tonight — the three Ring items filed during Part A all carry a full `prompt` field and are drainable.

### The aged P1/high band, still never attempted

Disposition unchanged from every prior pass: **leave pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue for items that were never started and aren't waiting on a Kane decision.

Hordes still accounts for the largest single-project share of aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do.

Cattery's Supabase-credential-scope finding (`canonical-audit-2026-07-16-cattery-orders-cascade-prod-unapplied` and sibling) is now on its **fifteenth consecutive night** unresolved and unresolvable by any unattended pass — it needs Kane to re-scope the MCP credential. Worth a direct flag rather than another silent carry.

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
- **Opened: 3** — Ring service-worker version staleness, `.project-context.json` milestone drift, and `completion.pct` staleness, all previously carried unqueued across multiple canonical-audit passes. Filed with full prompts and pushed during Part A.
- **Flagged, not yet actioned:** the casing split (Ring, Cattery — still real, unchanged); the promptless batch, flat at 28; Cattery's fifteen-night-unresolved Supabase credential scope, now called out directly for Kane rather than silently carried.

### Recommendation

Unchanged in substance from every prior pass:

- **Fix the promptless-enqueue bug at the source before the next bar-raise pass runs.** Flat tonight, but the 28-item pile from two prior occurrences is still stranded.
- **Cap bar-raise intake** so a single pass can't add double-digit undrainable items in one shot.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **The casing split** (Ring, Cattery above) is a mechanical bulk fix, not a design decision — still the single highest-value quick win sitting untouched.
- **Re-scope the Supabase MCP credential to include Cattery's project** — fifteen consecutive nights blocked on this alone, and it is a five-minute fix only Kane can make.
- **Grow the daily governor's box**, especially given the queue's demonstrated capacity to absorb large single-night intake spikes.

Doing none of these is also a choice. Its outcome is visible: 181 P1/high items, none of them ever attempted, the oldest now 28 days, and the promptless pile still 28 items deep.
