# scheduler-real-use-testing result (run 1, 2026-06-11 overnight drain)

- Started: 2026-06-11T06:04Z
- Finished: 2026-06-11T06:15Z
- Status: partial (bounded unit complete; gate stays open)
- Prompt: Completion gate: real-use testing + iterate cycles. E2E coverage for schedule generation and multi-tenant flows; run a realistic org through a full preference-to-published-schedule cycle and fix what snags.

## What was done

Shipped the realistic-org simulation suite for the DESIGN §8 auto-fill algorithm:
`apps/api/src/lib/schedule-fill.realistic.test.ts` (new, 8 tests).

- 15-employee retail-style org: 4 openers, 4 closers, 2 mid full-timers (min 32 / max 40), 3 weekend part-timers, 1 capped student, 1 employee who never submitted the preference form.
- 21 shifts/week (open/mid/close x 7 days, min 2/1/2, max 3/2/3), one manager-pinned assignment pre-existing.
- Ten structural invariants asserted on every output (I1-I10): no duplicate assignments, shift capacity, weekly max hours, daily max hours, daily shift cap with the Phase-3 below-min exception, availability and preference-row respect, pre-existing assignment preservation, exact unfilled reporting, no-work-left-on-the-table for below-min employees, determinism.
- Invariants re-checked across 5 seeds plus a six-week production-scale cycle with a 250ms ceiling (route invokes fill per-week; weekly caps confirmed semantically correct at apps/api/src/routes/schedule.ts).

Result: 20/20 tests green (12 pre-existing + 8 new), strict tsc clean. No algorithm snags found - the fill holds up under realistic load on first run.

Run note: pnpm symlinks in node_modules do not resolve over the FUSE mount (Input/output error), so the suite was verified in a sandbox-local vitest 2.1.9 harness. It will run normally via `pnpm --filter api test` on the Windows side.

## Files touched

- X:\YesAndScheduler\apps\api\src\lib\schedule-fill.realistic.test.ts (new, committed-ready)
- X:\YesAndEverything\status\data\YaB.json (repaired: FUSE-truncated at line 31 mid-barRaise; restored byte-identical content from YaE HEAD with atomic write + reparse verify; flagged open by the 05:09 drain run)

## Not done / blocked

- Commit blocked: X:\YesAndScheduler\.git\index.lock (0 bytes, 06:08 today) is unremovable from the sandbox. Clear from Windows (git-unstick) and the file is one `git add` + commit away. Scheduler tree otherwise carries only 2 pre-existing modified files (.project-context.json, scripts/write-dashboard-status.ps1).
- Gate remainder: route-level E2E for the generate -> publish -> notify flow against a real D1 (needs @cloudflare/vitest-pool-workers run on Windows), and the actual human real-use pass. The algorithm-level cycle is now covered.

## Incident during close-out

The FUSE stale-read queue drop re-fired on this run's second .work-queue.json rewrite: the load silently shed htbh-publish-v0-74-44-rollup-verify-2026-05-26 and yab-design-s4-plaid-schema-2026-06-10 (the latter for the second run in a row; the 05:09 
---

# scheduler-real-use-testing result (run 2, 2026-06-11 overnight drain)

- Started: 2026-06-11T07:05Z
- Finished: 2026-06-11T07:35Z
- Status: blocked-on-user (agent-side units exhausted)
- Prompt: same gate; this run delivered the route-level half flagged as remaining by run 1.

## What was done

Shipped the route-level E2E suite: `apps/api/src/routes/schedule-e2e.test.ts` (new, 2 tests).

Test 1 runs a realistic org through the full cycle entirely over HTTP:

1. First generate instantiates 10 shifts (Open/Close x Mon-Fri), all below min, nothing assigned.
2. Four employees submit preferences through PUT /api/preferences/:shift_id (preferred / available / unavailable personalities) plus a day-level block via PUT /api/day-unavailability/:date; read-back via GET /api/preferences?week=.
3. Regenerate honors preferences deterministically: preferred employees on every matching shift (auto-preferred), available employee tops up capacity (auto-available), unavailable employee assigned nowhere, nobody works two shifts on one date, unfilled empty.
4. Manager override via PATCH /api/shifts/:id/assignments (remove + add in one call, manager-edit source, including overriding an employee's unavailable preference).
5. Regenerate after the override: manager-edit assignment survives, at-max shift is not re-filled.
6. Publish: is_published set on all 10, schedule_published notification fans out to members with the week in the payload (GET /api/notifications?unread=1).
7. Post-publish lock: preference edit returns 409 shift_published.
8. CSV export: header shape, 10 published rows, assignee names with sources.

Test 2 covers the multi-tenant flow: a fully-scoped manager in a second org gets 404 (never 403, per the no-existence-leak rule in lib/scope.ts) on generate, publish, and export against org A's sub-department, and no shifts get instantiated by the failed attempts.

## Verification

- tsc clean (exit 0) under the repo's exact strict flags (tsconfig.base.json + apps/api types), checked against the real test/helpers.ts, test/env.d.ts, @cloudflare/workers-types 4.20260510.1, vitest 2.1.9 type packages pulled from the .pnpm store.
- Not executed: @cloudflare/vitest-pool-workers needs workerd, and only @cloudflare+workerd-windows-64 is installed; the Linux sandbox cannot run it. Runtime verification happens with `pnpm --filter api test` on the Windows side.
- Assignment-outcome assertions in test 1 were derived from the fill phases in lib/schedule-fill.ts (phase 1 preferred, phase 2 available top-up to max, candidates drawn only from submitted preference rows) and are deterministic for this fixture.

## Files touched

- X:\YesAndScheduler\apps\api\src\routes\schedule-e2e.test.ts (new)
- X:\YesAndEverything\.work-queue.json (item update + restore of 2 stale-read-dropped items)

## Followups recommended

User-side, in order:
1. Clear X:\YesAndScheduler\.git\index.lock (Windows-held; unremovable from the sandbox on both drain runs).
2. cd X:\YesAndScheduler then `pnpm --filter api test` - expect 22 green (12 pre-existing + 8 realistic + 2 E2E).
3. Commit both new test files through scripts\release.ps1 (PATCH; tests + docs only).
4. The remaining gate item is the human real-use pass; no further agent-side unit exists.

Queue-infrastructure note: the FUSE stale-read drop hit a third time this night (same 2 items shed on this run's first queue write despite tmp+fsync+os.replace+readback). The id-set pre/post guard caught and repaired it on the final write. The queue writer inside the work-queue-runner skill needs that guard built in.
