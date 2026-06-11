# Queue triage 2026-06-11

Scope: pending items in `X:\YesAndEverything\.work-queue.json` with `auto_safe: false` (or absent) and `added` more than 7 days before 2026-06-11. Items with status `blocked`, `blocked-on-user`, or `in-progress` are excluded per the pending-only scope; one aging exclusion is noted at the bottom because it is a P0.

## TL;DR

Nine pending items are aging past the 7-day line. The worst offender is `htbh-queue-drain-pass-2026-05-27` at 15 days, and HTBH carries the largest aging backlog (4 items), all chained to the same root cause: no HBH source mount in scheduled sessions. Verdicts: 6 do-this-session, 2 defer, 1 drop.

## HTBH

**htbh-queue-drain-pass-2026-05-27** (P2, added 2026-05-27, 15 days old)

- Prompt summary: Four-hourly queue-drain-frequent skips HBH items because they need source mount. Once mount lands, run one dedicated drain pass covering htbh-d01, d02, d03 and all 2026-05-19 through 2026-05-26 carry-overs in one session.
- Recommended verdict: Defer to HBH mount landing (blocked by htbh-audit-mount-or-sidecar-2026-05-28)
- Why: The item is explicitly gated on the mount; it becomes actionable the session the mount exists and not before.

**htbh-publish-gdd-integrity-guard-2026-05-28** (P1, added 2026-05-28, 14 days old)

- Prompt summary: Sixth carry-over from canonical audits 2026-05-23 through 27. Assert source docs/GDD.html ends with `</html>` and post-injection hordes/index.html ends with the expected tail before commit.
- Recommended verdict: Defer to HBH mount landing; run it first in the mounted drain pass
- Why: Real and P1 (the v0.61.8 truncated-GDD incident is the receipts), but it needs HBH source access that this and every scheduled session lacks.

**htbh-audit-mount-or-sidecar-2026-05-28** (P1, added 2026-05-28, 14 days old, noticed 11 times)

- Prompt summary: Sixth audit run with no source-side coverage. Either add X:\HereBeHordes to the scheduled audit session's folder set, or have audit-htbh-daily pre-pull source/ + docs/GDD.html from origin into a reachable workspace before invoking project-canonical-audit.
- Recommended verdict: Do this session
- Why: This is the single unblock behind all four aging HTBH items plus htbh-mount-gap; it is a one-time folder-set or pre-pull config change, and at 11 notices it is the most-re-surfaced item in the queue.

**htbh-v0-75-0-minor-rollup-verify-2026-05-28** (P2, added 2026-05-28, 14 days old)

- Prompt summary: v0.75.0 shipped 2026-05-28 (commit 3779655). Once source-mount access exists, confirm GDD §17 roadmap marked the feature done and the changelog entry sits at the top of the changelog footer in descending order.
- Recommended verdict: Drop
- Why: HBH is now at v0.96.x (GDD work at v0.98.2 per the 2026-06-11 asset-pass notes), 20+ MINORs past the version this would verify, and every htbh-changelog-entry run since has touched the same changelog region without surfacing an ordering problem; not auto-removed because the GDD itself cannot be read without the mount, so the evidence is circumstantial rather than conclusive.

## YaC

**wts-2026-05-29-yac-stash-scraper-wip** (P2, added 2026-05-29, 13 days old)

- Prompt summary: YaC has one stash entry: `stash@{0}: On main: scraper WIP`. Review and either apply (then ship or re-stash with clearer label), or drop.
- Recommended verdict: Do this session
- Why: Verified today that the stash still exists (`git stash list` on the mounted repo); apply-and-decide is a minutes-long call and the 90-day reflog reconstruction window keeps shrinking.

**yac-mnew-tool-ref-repoint** (P3, added 2026-06-01, 10 days old, 1 attempt)

- Prompt summary: After 0.34.2 ships: repoint live tool references to tools/_archived/ (CONTEXT.md scrape_pipeline.py; BACKLOG.md seed_courses.py + scrape_pipeline.py). Leave historical changelog rows untouched.
- Recommended verdict: Do this session
- Why: Verified today the one remaining live ref is CONTEXT.md:259, which still describes the "Course Data Gathering" session driving tools/scrape_pipeline.py as the active scraper while the tool sits in tools/_archived/ and ADR 0021's cron pipeline superseded it; two prior drains already scoped this to a single confirm-the-retirement-then-rewrite, which only needs the confirm.

**yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01, 10 days old)

- Prompt summary: ROADMAP escalation block still lists Supabase migrations (SQL) as escalate-to-Nick despite autonomous migration ships. Confirm whether the policy still holds or update it.
- Recommended verdict: Do this session
- Why: Verified today the claim still stands (ROADMAP.md:134); it is a one-line policy call with no dependencies, cheaper to answer than to carry.

## Scheduler

**wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29, 13 days old)

- Prompt summary: Scheduler working tree has ~75 modified files + 3 untracked carrying uncommitted edits; several were last touched by HEAD well over 7 days ago. High likelihood of FUSE-truncation risk the longer it sits.
- Recommended verdict: Do this session
- Why: The 2026-06-11 scheduler-real-use-testing drain notes confirm the tree is still dirty and now carries new uncommitted test files on top, so the truncation exposure is growing; needs the Windows-side index.lock clear first, then grouped commits through release.ps1.

**scheduler-m71-resequence-0602** (P2, added 2026-06-02, 9 days old)

- Prompt summary: v0.3.0 shipped ahead of the M7.1 multi-tenant-polish milestone (SPA header org-switcher widget, dedicated invite-admin UI page, cross-org scope-leak test suite), which was originally tagged v0.2.1 and is still unbuilt. DESIGN §21 has been updated to note the re-sequence, but the actual product decision stands.
- Recommended verdict: Do this session
- Why: It is a pure next-version scope decision (build now vs push) with nothing blocking the deciding itself, and the cross-org scope-leak test gap it covers overlaps the new E2E work already sitting uncommitted in the tree.

## YaE

No qualifying items.

## YaApothecary

No qualifying items.

## Auto-applied

None. The single Drop verdict (htbh-v0-75-0-minor-rollup-verify-2026-05-28) rests on version-supersession evidence that cannot be conclusively confirmed without the HBH source mount, so the item stays in the queue pending sign-off. No items were removed from .work-queue.json.

## Noted outside scope

`wts-2026-05-29-scheduler-discord-webhook-exposed` (P0, 13 days old) is excluded as status `blocked-on-user`, but the residual user action is still open: rotate the leaked Discord webhook (the URL is permanently recoverable from git history at cf05134), then paste the new URL into scripts/.discord_webhook.txt. Repo-side mitigation was verified done 2026-06-10.
