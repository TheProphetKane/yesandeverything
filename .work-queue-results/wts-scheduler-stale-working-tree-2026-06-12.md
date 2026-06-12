# wts-2026-05-29-scheduler-stale-working-tree - drain result 2026-06-12

Run: overnight-queue-drain (scheduled). Item selected via rule 2c (oldest pending; all completion gates blocked or self-blocked, bar-raise item's remaining slice needs Nick).

## Verdict

Premise resolved, residue triaged, tree is committed-ready. Item moved pending -> committed-ready.

## What the item claimed vs what exists

Claimed (2026-05-29): ~75 modified + 3 untracked files, some carrying 19-day-stale edits.
Found (2026-06-12): 6 modified + 2 untracked. HEAD 802b9aa (2026-06-11). Three interim commits landed the bulk: e291b6b (dashboard-status writer RMW), 23d2e3d (YesAndScheduler rename + release hardening + webhook untrack), 802b9aa (em-dash sanitizer + DESIGN v0.4.1).

## Residue triage (all one coherent cohort: the YaS rebrand)

- `.project-context.json` - schema 1.0 -> 1.1; short id Scheduler -> YaS; display name Yes& Scheduler; path X:\YesAndScheduler; adds milestone (M8 shipped), completion (50%, anchored 2026-06-10), lens_weights, hard_rule_checks. Re-parses as valid JSON.
- `scripts/write-dashboard-status.ps1` - writes YaS.json (was Scheduler.json); sources identity + milestone from .project-context.json; computes repo-derived metrics (api routes, migrations, test files).
- `README.md`, `apps/web/index.html`, `AppShell.tsx`, `Login.tsx` - wordmark/title to "Yes& Scheduler".
- `apps/api/src/lib/schedule-fill.realistic.test.ts` (untracked, 416 lines) - realistic-org property test of the DESIGN section 8 auto-fill: invariants I1-I10 (no dup assignment, max_employees, weekly/daily hour caps, Phase 3 cap-lift rules, unavailability, pre-existing assignment survival, unfilled-report exactness, no-work-left, determinism) plus a 250ms perf budget.
- `apps/api/src/routes/schedule-e2e.test.ts` (untracked, 325 lines) - route-level e2e against D1.

The two test files directly serve the `scheduler-real-use-testing` completion gate. When this ships, that gate item's next pass should account for them.

## Verification done

- Tails checked on all 8 touched files: clean (no FUSE truncation).
- `.project-context.json` re-parsed valid.
- Tests NOT executed: pnpm virtual-store symlinks do not resolve across the FUSE mount (vitest.mjs unreachable). Run `pnpm --filter api test` Windows-side before ship, or rely on the release gate.

## Extra work this run

README.md voice scrub: 6 em dashes removed (Snapshot/Time Travel comments to colons; migration, audit-log, notifications prose to semicolons; license line to semicolon). Python atomic write + readback verified. Public artifact, banned punctuation, file was already in the modified set.

## Remaining (Nick-side)

1. Stale `.git/index.lock` (EPERM from sandbox; clear Windows-side or let tooling handle it).
2. Branch is 3 commits ahead of origin, unpushed.
3. Release guards require a version bump + matching CHANGELOG entry before release.ps1 will ship; the rebrand cohort is a PATCH.
4. `cd X:\YesAndScheduler` then `.\scripts\release.ps1`.
