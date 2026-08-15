# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-15.

## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-15. Tonight's twelve canonical-doc audits opened **zero** new structural items — every finding this pass was either resolved outright (Ring's service-worker staleness, Ring's milestone self-contradiction, Budget's factory-reset backup-path bug, Apothecary's src/index.js money-path doc drift, Agents's four-unlogged-commits changelog gap) or already carried/queued from a prior pass. Total item count held flat at 947 (no growth since 2026-08-14), but the distribution shifted heavily: daytime drain activity between the two passes processed a large batch — `pending` dropped from 803 to 621, `completed` rose from 74 to 197, `blocked-on-user` rose from 58 to 116, and the promptless (undrainable) pile fell from 28 to effectively **0 pending** (one remaining promptless item is itself `completed`, harmless).

### Depth

| Measure | 2026-08-13 | 2026-08-14 | 2026-08-15 | Δ |
|---|---|---|---|---|
| Total items | 903 | 947 | 947 | 0 |
| `pending` | 762 | 803 | 621 | -182 |
| `blocked-on-user` | 58 | 58 | 116 | +58 |
| `completed` | 71 | 74 | 197 | +123 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 2 | 2 | 3 | +1 |
| Promptless (undrainable) | 28 | 28 | 1 (completed, 0 pending) | -27 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

The +58/-182/+123 swing happened during 2026-08-14 daytime, outside this session — `queue-drain-hourly`/backlog-burndown activity, not tonight's sweep, which opened nothing new. This is the largest single-day throughput this rolling doc has recorded; worth confirming with Kane whether a specific burndown push ran, since the promptless-pile clearance in particular (28 → 0 pending) resolves a finding this doc has carried since 2026-08-03.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**497 items** (down from 596 on 2026-08-14, consistent with the daytime drain). Severity: 342 `medium`, 114 `high`, 29 `low`, 6 unset/inconsistent-cased. Priority: 339 P2, **119 P1**, 37 P3, 2 P4. Oldest is now **29 days** (`hbh-orphan-mainmenu-settings-deadcode-2026-07-17`, `working-tree-2026-07-17-queue-duplicate-stale-tree-items`, `bar-raise-2026-07-17-rising-maintainability-01`, all tied, one day older than last night).

### The promptless batch — cleared

The pile that sat at 28 items for three consecutive passes (11 from 2026-08-03, 17 from 2026-08-12's Scheduler/Apothecary bar-raise dump) is now down to a single item, and that one is `status: completed` — not stranded, just missing a `prompt` field it no longer needs. `queue-drain-2026-07-26-promptless-enqueues-undrainable` can likely be closed; worth a direct check next pass rather than closing it sight-unseen tonight, since this doc didn't drive the clearance and hasn't verified the mechanism.

### The aged P1/high band, still never attempted

Disposition unchanged from every prior pass: **leave pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue for items that were never started and aren't waiting on a Kane decision.

Hordes still accounts for the largest single-project share of aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do.

Cattery's Supabase-credential-scope finding (`canonical-audit-2026-07-16-cattery-orders-cascade-prod-unapplied` and sibling) is now on its **sixteenth consecutive night** unresolved and unresolvable by any unattended pass — re-verified live via `list_projects()` during tonight's Cattery audit, same two-project list as every prior night. It needs Kane to re-scope the MCP credential.

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
- **Status changes: 0** on existing items from queue-triage tonight — the large status shifts in the depth table above happened during daytime drain activity outside this session.
- **Opened: 0** — every Part A finding tonight was either self-resolving or already carried/queued.
- **Flagged, not yet actioned:** the casing split (Ring, Cattery — still real, unchanged); Cattery's sixteen-night-unresolved Supabase credential scope, called out directly for Kane again; the promptless-pile clearance, worth confirming the mechanism and closing its tracker item next pass.

### Recommendation

Mostly unchanged from prior passes, with one line resolved:

- ~~Fix the promptless-enqueue bug at the source~~ — **the pile cleared itself between passes** (28 → 0 pending). Confirm the mechanism and close `queue-drain-2026-07-26-promptless-enqueues-undrainable` next pass rather than assuming it's fixed at the source.
- **Cap bar-raise intake** so a single pass can't add double-digit undrainable items in one shot — still relevant even with the pile cleared, since the underlying enqueue path that produced it wasn't confirmed fixed.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box.
- **The casing split** (Ring, Cattery above) is a mechanical bulk fix, not a design decision — still the single highest-value quick win sitting untouched.
- **Re-scope the Supabase MCP credential to include Cattery's project** — sixteen consecutive nights blocked on this alone, and it is a five-minute fix only Kane can make.
- **Grow the daily governor's box**, especially given tonight's evidence that a single day's drain can clear 182 pending items when it runs.

Doing none of these is also a choice. Its outcome is visible: 119 P1/high items in the aged band, none of them ever attempted, the oldest now 29 days.
