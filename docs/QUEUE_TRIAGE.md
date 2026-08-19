# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-19.

## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-19. Tonight's twelve canonical-doc audits opened **zero** new structural items — every finding was either no-drift or already carried/queued from a prior pass. The queue itself moved since yesterday's pass: the daily backlog-governor ran on 2026-08-18 (a separate process from this triage), adding 20 new items and closing 8, net `updated: 2026-08-17T18:27Z` still stale in the file's own metadata field (unmaintained, see Depth table note).

### Depth

| Measure | 2026-08-17 | 2026-08-18 | 2026-08-19 | Δ |
|---|---|---|---|---|
| Total items | 957 | 957 | 977 | +20 |
| `pending` | 632 | 632 | 644 | +12 |
| `blocked-on-user` | 116 | 116 | 116 | 0 |
| `completed` | 196 | 196 | 204 | +8 |
| `deferred` | 10 | 10 | 10 | 0 |
| `dropped` | 3 | 3 | 3 | 0 |
| Promptless (undrainable) | 1 (completed, 0 pending) | 1 (completed, 0 pending) | 1 (completed, 0 pending) | 0 |
| Pending that are `auto_safe: true` | 0 | 0 | 0 | 0 |

The +20/-8 net +12 pending matches the backlog-burndown-daily governor's 2026-08-18 run (logged separately in `X:\OPEN-LOOPS.md`): 20 new findings queued, 8 closed with live re-verification evidence. `last_drain` still reads `2026-07-31T00:00Z`, nineteen days stale — unmaintained field, not a live signal.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**575 items** (down from 583 on 2026-08-18 — the governor's 8 closures came from this band). Severity: 423 `medium`, 117 `high`, 29 `low`, 6 unset. Priority: 415 P2, **121 P1**, 37 P3, 2 P4. Oldest cluster is still the 2026-07-17 `bar-raise-2026-07-17-*` batch (72 items), now 33 days.

### The promptless batch — stays cleared

Still a single item (`bar-raise-2026-08-12-apothecary-queue-project-casing`), status `completed` — confirmed again tonight, not stranded. `queue-drain-2026-07-26-promptless-enqueues-undrainable` (the root-cause tracker) is still `blocked-on-user`, unchanged.

### The aged P1/high band, still never attempted

Disposition unchanged: **leave pending.** The severity guard says never archive `high`/`P0`/`P1` and set `blocked-on-user` with a `drainNote` instead — deliberately not applied here, because `blocked-on-user` would assert something untrue for items that were never started and aren't waiting on a Kane decision.

Hordes still accounts for the largest single-project share of aged items, same structural reason as every prior pass: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do.

Cattery's Supabase-credential-scope findings (`canonical-audit-2026-07-16-cattery-orders-cascade-prod-unapplied` and sibling) are now on their **twentieth consecutive night** unresolved and unresolvable by any unattended pass — re-verified live via `list_projects()` during tonight's Cattery audit, same two-project list as every prior night. It needs Kane to re-scope the MCP credential.

### Project-key casing split — unchanged, still not fixed

The six full-repo-name `project` values flagged 2026-08-18 are all still present, still `pending`, still not auto-applied (a bulk queue-content edit deserves a deliberate pass with `queue_write.py`, not a drive-by inside the triage report):

| id | `project` value used | expected short form |
|---|---|---|
| `br-release-version-arg-unvalidated-2026-08-01` | `BrackishRising` | `rising` / `brackish` |
| `yab-e2a6f47-no-changelog-entry-2026-08-01` | `YesAndBudget` | `yab` / `budget` |
| `yar-sw-version-stale-serves-old-shell-2026-08-01` | `YesAndRing` | `ring` |
| `yac-cattery-supabase-mcp-unreachable-2026-08-01` | `YesAndCattery` | `cattery` |
| `gnosis-dm-menu-names-in-public-html-2026-08-01` | `YesAndGnosis` | `gnosis` |
| `skylight-claudemd-names-retired-audit-routine-2026-08-01` | `YesAndSkylight` | `skylight` |

### A new retention-mistake pattern, worth naming here

Tonight's per-project sweep repeated a known failure a second time: Scheduler's retention step deleted its sole `BAR_RAISE-2026-08-12.md` and sole `drift-fixes-2026-08-08.md` instead of only pruning duplicates (gitignored, unrecoverable). First occurrence was Chains, 2026-08-18 — logged in `X:\YesAndEverything\docs\CANONICAL_AUDIT-YAE-2026-08-19.md`. This is direct evidence for the already-queued structural fix (`yae-sweep-must-refresh-audit-pointers-2026-08-01`, mislabeled — the actual defect is retention deleting a sole file, not a pointer-refresh race); not opening a new queue item, since one already covers this failure class.

### Actions taken

- **Archived: 0.**
- **Closed: 0** by this triage pass directly (the 8 closures tonight were the backlog-governor's, not this pass's).
- **Status changes: 0** on existing items from queue-triage tonight.
- **Opened: 0** by this pass (the +20 items were the backlog-governor's).
- **Flagged, not yet actioned:** the six full-repo-name `project` values (carried, still unfixed); Cattery's twenty-night-unresolved Supabase credential scope, called out directly for Kane again; the second retention-mistake occurrence (Scheduler), as evidence the queued structural fix is still needed.

### Recommendation

Unchanged in substance from prior passes:

- **Re-scope the Supabase MCP credential to include Cattery's project** — twenty consecutive nights blocked on this alone, and it is a five-minute fix only Kane can make. This is the single most persistent open item in the entire portfolio.
- **Normalize the six `project` values above** to their short-code form — small, mechanical, no longer blocked on anything but someone doing it.
- **Fix the sweep's own retention step** so it never deletes a type's only file — now reproduced twice (Chains, Scheduler), both permanent losses of a gitignored report.
- **Re-enable `queue-drain-hourly`** and rebuild an auto-safe class, so mechanical items stop competing with judgment items for the burndown's box. Zero items have qualified as `auto_safe: true` for at least five consecutive passes now — the class is effectively empty, not just thin.

Doing none of these is also a choice. Its outcome is visible: 121 P1/high items in the aged band, none of them ever attempted, the oldest now 33 days.
