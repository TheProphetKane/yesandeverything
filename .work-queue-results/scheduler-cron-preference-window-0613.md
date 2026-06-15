# scheduler-cron-preference-window-0613 — resolution

**Run:** 2026-06-14 overnight-queue-drain
**Status:** committed-ready (awaiting Windows-side `release.ps1`; sandbox cannot clear `.git/index.lock`)
**Source:** docs/CANONICAL_AUDIT-2026-06-13.md (audit-scheduler-nightly)

## Finding
DESIGN.md sec18 claimed: "A scheduled Cron Trigger runs daily to fire the `preference_window_opened` notification event." The code does not implement this.

## Verification (code-side)
- `apps/api/wrangler.toml` has no `[triggers]` / crons block.
- `apps/api/src/` exports no `scheduled()` handler.
- `preference_window_opened` is never produced in `apps/api/src` — it exists only as a declared event-type string in DESIGN sec14.

## Resolution
Doc-softening, the cheaper internally-consistent option the item itself recommended. Building a net-new daily `scheduled()` handler + crons trigger was rejected: the in-app-only notifications table has no consumer for the event in v1, so producing it would be dead infrastructure and a scope expansion. Reflecting what actually shipped is the conservative, reversible call.

DESIGN.md sec18 line 460 now reads the daily Cron Trigger as planned-not-built, naming the missing pieces (no `[triggers]` block, no `scheduled()` handler) and pointing to the deferred scheduled-Worker notification work in sec19. sec14 stays the single place the event type is declared.

## Incidental repair
The working-tree DESIGN.md carried a live FUSE tail-truncation (lost its final 5 lines, ended mid-word at "The exact"; the prior run's repair did not hold). Rebuilt the tail byte-exact from HEAD via atomic write + readback, preserving the already-committed-ready brand x2 + DNS edits. Final `git diff` vs HEAD is exactly four single-line swaps (brand title, display name, cron softening, DNS line). No em dash introduced by this edit.

## Ship
```
cd X:\YesAndScheduler
.\scripts\release.ps1
```
Folds with the other committed-ready Scheduler doc edits (scheduler-design-changelog-drift-fix-2026-06-14, scheduler-m71-resequence sec16 clarifier).
