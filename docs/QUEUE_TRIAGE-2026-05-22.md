# Queue triage 2026-05-22

## TL;DR

Three items have aged into the 7-day triage window, all added 2026-05-15. Worst offender by age: tied at 7 days across HTBH, YaC, and YaE. Largest non-auto-safe pending backlog by project: HTBH (6 pending non-auto-safe items in queue, only 1 aged in). Side note: `.work-queue.json` is currently corrupted at the tail (lines 555+ from FUSE truncation, partial item `audit-htbh-mount-missing-2026-05-22`). The corruption sits below the closing `}`, so the JSON object itself still parses; queue ops should still work but the partial item is lost. File a follow-up to repair the tail (see `work_queue_fuse_truncation` memory).

---

## HTBH

**anti-drift-htbh-numbers-tab-autogen-017** (P2, added 2026-05-15, 7 days old)

- Prompt summary: HBH Numbers tab in docs/GDD.html hand-encodes HP, cost, defense, worker counts, footprint for every v1 building. The .gd files in source/buildings/ are the actual truth. Today caught 3 rows drifted (Manor, House, Research Lab). Structural fix: add a build-time pre-processor to publish-gdd.ps1 that reads source/buildings/*.gd, extracts the @export and const values, and rewrites the Numbers tab rows.
- Recommended verdict: Do this session
- Why: Drift class is recurring (Numbers tab vs .gd files keeps reappearing in every audit) and the pre-processor concept is well-bounded. Build it once, drift dies for good.

---

## YaC

**anti-drift-yac-release-package-bump-018** (P3, added 2026-05-15, 7 days old)

- Prompt summary: YaC has two version sources, CONTEXT.md and package.json. They drift because release.ps1 only touches CONTEXT.md. Add a step to release.ps1 that runs pnpm version <ver> --no-git-tag-version so package.json moves in lockstep.
- Recommended verdict: Do this session
- Why: Drift is live and confirmed right now (CONTEXT.md says `0.28.1`, package.json still reads `0.26.0`). Item `yac-context-pill-0.28.1-052` already had to recover from this exact pattern once. Two-line addition to push-to-github.ps1 prevents future hand-fixes.

---

## YaE

**yae-artifact-session-path-hardcode-019** (P1, added 2026-05-15T20:00, 7 days old; status: in-progress, 1 attempt)

- Prompt summary: The cross-project-status artifact hardcodes the previous session VM mount root. Each Cowork session gets a new mount root, so the live-refresh git + queue + audit panels silently fail. Fix: discover the mount root dynamically at refresh time via ls -d /sessions/*/mnt/YesAndEverything 2>/dev/null | head -1, then substring-extract the session segment, then build all per-repo paths from that base.
- Recommended verdict: Do this session
- Why: P1, attempted once, the artifact remains useless until this lands. Listed under triage despite `status: in-progress` because attempt count is 1 and the item has stalled for the full 7-day window. Strict reading of the triage rule excludes in-progress; spirit of weekly aging triage includes it. Flagging here so Nick can decide whether to take over or let the queue retry.

---

## Auto-applied

None. No items dropped this run. All three aged items still describe live drift (Numbers tab still hand-encoded, YaC version sources still drift, YaE artifact still hardcodes session path). Auto-applied removals require unambiguous dead-reference evidence and none of these qualify.

---

## Items NOT yet in the aging pipeline (added 2026-05-16 through 2026-05-21)

20+ additional pending non-auto-safe items sit in the queue, none yet at 7 days. Worth pre-flagging for next week's run:

- `htbh-uncommitted-v0-65-0-release` (P0, 2026-05-20) and `htbh-commit-v0.70.0-048` (P0, 2026-05-21) — both are commit-per-patch violations. Should not wait for triage cadence; need manual greenlight regardless. v0.70.0 likely supersedes v0.65.0 just as v0.64.1 superseded prior commit items; next triage run should reconcile.
- `scheduler-design-multitenant-update-037` (P1, 2026-05-19) — DESIGN.md still frozen at v0.1.0 post the v0.2.0 multi-tenant ship. Ages in 2026-05-26.
- `htbh-wonders-s9-effects-021` (P2, 2026-05-16) — Tier 4 Wonders effect column drift requires Nick's design call on which side wins (GDD vs code). Ages in 2026-05-23.

---

*Next triage run: 2026-05-29. Items 017, 018, 019 carry forward if not handled this week; items added 2026-05-22 or earlier all qualify.*
