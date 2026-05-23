# Queue triage 2026-05-19

## TL;DR

First run of the weekly triage task. The queue was created 2026-05-15, so no items yet exceed the 7-day aging threshold. Zero items qualify for action today. The four oldest pending non-auto-safe items (added 2026-05-15) will age into the window on 2026-05-22. Largest pending backlog by project: HTBH (5 non-auto-safe pending items).

---

## No qualifying items this run

All 17 pending items in `.work-queue.json` were added on or after 2026-05-15 (4 days old at most). The triage threshold is >7 days with `auto_safe: false`. None meet both conditions.

Items excluded by `auto_safe: true` are handled by `queue-drain-frequent` and are not listed here.

---

## Aging pipeline (items entering the window next)

These items will qualify for triage on 2026-05-22 (7 days after 2026-05-15). Listing them now so the next run has no surprises.

### HTBH

**anti-drift-htbh-numbers-tab-autogen-017** (P2, added 2026-05-15, ages in 2026-05-22)
- Prompt summary: GDD Numbers tab hand-encodes HP/cost/defense for every v1 building, but the .gd files are the actual truth. Three rows drifted (Manor, House, Research Lab). Structural fix: add a build-time pre-processor to publish-gdd.ps1 to auto-extract @export/const values and rewrite the Numbers tab rows.
- Preview verdict: Do this session
- Why: Clear scope, bounded task, no blocking dependencies. The drift pattern is structural and will recur on every balance pass.

### YaC

**anti-drift-yac-release-package-bump-018** (P3, added 2026-05-15, ages in 2026-05-22)
- Prompt summary: `package.json` and `CONTEXT.md` version pill drift because `release.ps1` only updates `CONTEXT.md`. The 2026-05-15 bump to 0.26.0 was hand-applied; future bumps should be automatic via `pnpm version`.
- Preview verdict: Do this session
- Why: Low-risk script addition, one-time fix. Recurring version drift is a known hazard (multiple audit flags).

### YaE

**yae-artifact-session-path-hardcode-019** (P1, added 2026-05-15, ages in 2026-05-22, status: in-progress, 1 attempt)
- Prompt summary: The cross-project-status artifact hardcodes the previous session VM mount root. Each Cowork session gets a new mount root, so live-refresh panels silently fail on every new session.
- Preview verdict: Do this session
- Why: P1, already attempted once, and the fix has a clear approach (discover mount root dynamically via `ls -d /sessions/*/mnt/YesAndEverything`). The artifact is useless until this is resolved.

---

## Items NOT in the aging pipeline (added after 2026-05-15, >7 days window not reached until 2026-05-23+)

For reference: 14 additional pending non-auto-safe items were added 2026-05-16 through 2026-05-19. These are mostly structural decisions and P0 commits. They will age into the triage window between 2026-05-23 and 2026-05-26. No action needed today.

Notable items to watch:
- `htbh-uncommitted-v0-61-32` (P0, 2026-05-19) — commit-per-patch violation, needs manual greenlight ASAP regardless of triage cadence.
- `htbh-uncommitted-v0-61-9-10-release-026` (P0, 2026-05-18) — may be superseded by the v0.61.32 item; the next triage run should verify whether 026 is still live or was resolved by a subsequent release.ps1 run.
- `scheduler-design-multitenant-update-037` (P1, 2026-05-19) — DESIGN.md frozen at v0.1.0 post the v0.2.0 multi-tenant ship. Will be the highest-priority structural item when it ages in.

---

## Auto-applied

None. No items dropped this run (no unambiguous evidence of dead references for any pending item), and no non-auto-safe items were old enough to qualify.

---

*Next triage run: 2026-05-26. Three items will qualify immediately: 017, 018, 019.*
