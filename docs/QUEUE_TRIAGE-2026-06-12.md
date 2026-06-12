# Queue triage 2026-06-12

## TL;DR
Six non-auto-safe items are aging past 7 days; the worst offender was `htbh-queue-drain-pass-2026-05-27` at 16 days (now dropped, cohort resolved), and YaC carries the largest aging backlog at 3 items. Two items auto-dropped this run; the remaining four are all Do-this-session.

## HTBH
**htbh-queue-drain-pass-2026-05-27** (P2, added 2026-05-27, 16 days old)
- Prompt summary: Four-hourly queue-drain-frequent skips HBH items because they need source mount. Once mount lands, run one dedicated drain pass covering htbh-d01, d02, d03 and all 2026-05-19 through 2026-05-26 carry-overs in one session.
- Recommended verdict: Drop
- Why: The cohort it exists to drain is gone from the live queue. Verified in `.work-queue-archive.json`: htbh-d01-project-godot-version-bump is completed, htbh-d03-s39-tile-constants-stale is done, htbh-d02-sprite-tuning-stale-13-minors was archived stale on 2026-06-07. The only pending HTBH item left (`htbh-minimap-float-mirror-drift-2026-06-11`) is individually tracked and does not need a batch pass.

## YaC
**wts-2026-05-29-yac-stash-scraper-wip** (P2, added 2026-05-29, 14 days old)
- Prompt summary: YaC has one stash entry: `stash@{0}: On main: scraper WIP`. Review and either apply (then ship or re-stash with clearer label), or drop.
- Recommended verdict: Drop
- Why: Exact duplicate of `yac-stale-stash-2026-06-11` (same stash@{0}, same apply-or-drop action); the stash was verified still present today via `git stash list`, so the concern stays tracked by the newer item.

**yac-mnew-tool-ref-repoint** (P3, added 2026-06-01, 11 days old)
- Prompt summary: After 0.34.2 ships: repoint live tool references to tools/_archived/ (CONTEXT.md scrape_pipeline.py; BACKLOG.md seed_courses.py + scrape_pipeline.py). Leave historical changelog rows untouched.
- Recommended verdict: Do this session
- Why: Three drain passes have fully grounded the scope; what remains is one confirmation (the manual "Course Data Gathering" scraper session is retired per ADR 0021) followed by a bounded rewrite of CONTEXT.md ~252-258 to the cron model plus marking BACKLOG 30.2 obsolete.

**yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01, 11 days old)
- Prompt summary: ROADMAP escalation block still lists Supabase migrations (SQL) as escalate-to-Nick despite autonomous migration ships. Confirm whether the policy still holds or update it.
- Recommended verdict: Do this session
- Why: This is a one-line policy call, and recent behavior already answers it in practice: the 2026-06-11 drain on `yac-subscriptions-enable-ai` explicitly declined to auto-apply migration 0016 citing this exact policy, so the likely resolution is "confirm it holds" plus a wording touch-up in ROADMAP.md.

## Scheduler
**wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29, 14 days old)
- Prompt summary: Scheduler working tree has ~75 modified files + 3 untracked carrying uncommitted edits; several were last touched by HEAD well over 7 days ago. High likelihood of FUSE-truncation risk the longer it sits.
- Recommended verdict: Do this session
- Why: The tree has only grown since (the 06-11 E2E test work on `scheduler-real-use-testing` added uncommitted files and confirmed the index.lock needs a Windows-side clear), so every week it sits raises the truncation exposure; the work itself is a bounded host-side triage-and-commit through release.ps1.

**scheduler-m71-resequence-0602** (P2, added 2026-06-02, 10 days old)
- Prompt summary: v0.3.0 shipped ahead of the M7.1 multi-tenant-polish milestone (SPA header org-switcher widget, dedicated invite-admin UI page, cross-org scope-leak test suite), which was originally tagged v0.2.1 and is still unbuilt. DESIGN §21 has been updated to note the re-sequence, but the actual product decision stands.
- Recommended verdict: Do this session
- Why: The decision has shrunk since filing: the 06-11 E2E suite (uncommitted, awaiting the same index.lock clear) already includes cross-org 404 scope-leak tests on generate/publish/export, leaving only the org-switcher widget and invite-admin UI to scope into the next version or push.

## Auto-applied
Two items removed from `.work-queue.json` (archive copies written to `.work-queue-archive.json` with status `dropped`, atomic write + readback verified, queue 38 → 36 items):

1. `htbh-queue-drain-pass-2026-05-27` — the htbh-d01/d02/d03 cohort it targets is resolved or archived; premise no longer exists.
2. `wts-2026-05-29-yac-stash-scraper-wip` — duplicate; `yac-stale-stash-2026-06-11` tracks the same stash and stays pending.

The four Do-this-session verdicts are left in place for Nick's hand.

Run notes: today's run found no qualifying items for YaE or YaApothecary (all their non-auto-safe items were added 2026-06-12). Items at exactly 7 days (2026-06-05) were excluded per the more-than-7-days rule; `yab-doc-batch-blocked-lock-and-voice-2026-06-05` is also status `blocked`, not pending, and is superseded by `yab-barraise-closeout-2026-06-06`. No `outputs/digest-*.md` existed this session; the Triage line was appended to the most recent persisted digest, `X:\YesAndEverything\digest-2026-05-15.md`.
