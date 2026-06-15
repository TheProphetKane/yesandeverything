# Queue triage 2026-06-14

## TL;DR

Six non-auto-safe items are aging past 7 days. Worst offender is `wts-2026-05-29-scheduler-stale-working-tree` at 16 days. Backlog is a three-way tie at two items each across Chains, Scheduler, and Budget; one Budget item is auto-dropped as superseded, leaving five that need Nick's hand on the wheel (four Do-this-session, one Do-this-session closeout).

## Chains

**yac-mnew-tool-ref-repoint** (P3, added 2026-06-01, 13 days old)

- Prompt summary: After 0.34.2 ships, repoint live tool references to tools/_archived/ (CONTEXT.md scrape_pipeline.py; BACKLOG.md seed_courses.py + scrape_pipeline.py). Leave historical changelog rows untouched.
- Recommended verdict: Do this session
- Why: Five drain passes have ground this down to one real action, a confirm-and-retire of the dead manual scraper workflow at CONTEXT.md ~236; it needs Nick's one-line "the manual scraper session is retired" then a focused edit, not more autonomous investigation.

**yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01, 13 days old)

- Prompt summary: ROADMAP escalation block still lists Supabase migrations (SQL) as escalate-to-Nick despite autonomous migration ships. Confirm whether the policy still holds or update it.
- Recommended verdict: Do this session
- Why: The 06-14 drain already grounded it and staged a recommendation (keep migrations escalate-to-Nick, reword to "AI may draft migration SQL, Nick reviews+approves"); Nick approving the reword closes it in one turn.

## Scheduler

**wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29, 16 days old)

- Prompt summary: Scheduler working tree had ~75 modified + 3 untracked files carrying uncommitted edits, several stale well over 7 days. Triage, group commits by area, ship through scripts/release.ps1.
- Recommended verdict: Do this session
- Why: Status is committed-ready, the stale-tree premise is resolved by interim commits, and the only remainder is the Windows-side ship (clear .git/index.lock, bump version + CHANGELOG, run release.ps1) which folds the other committed-ready Scheduler doc edits in one push.

**scheduler-m71-resequence-0602** (P2, added 2026-06-02, 12 days old)

- Prompt summary: v0.3.0 shipped ahead of the M7.1 multi-tenant-polish milestone (org-switcher widget, invite-admin UI, cross-org scope-leak tests), still unbuilt. Decide next-version scope.
- Recommended verdict: Do this session
- Why: The doc-drift half (X-Org-Slug) is fixed and rides the committed-ready cohort; what is left is purely Nick's scope call, and a recommendation is already staged (M7.1 as v0.5.0, scope-leak suite first).

## Budget

**yab-doc-batch-blocked-lock-and-voice-2026-06-05** (P1, added 2026-06-05, 9 days old)

- Prompt summary: Land the YaB canonical doc batch plus untracked BAR_RAISE/CANONICAL_AUDIT reports as a scoped doc-only commit. Blocked by an unkillable .git/index.lock and em-dash voice violations.
- Recommended verdict: Drop
- Why: Explicitly superseded by `yab-barraise-closeout-2026-06-06`, whose own notes state it "supersedes the doc-only framing" because the tree now mixes code + .bak + BOM + EOL policy into a 2-commit structural job; auto-removed below.

**yab-barraise-closeout-2026-06-06** (P1, added 2026-06-06, 8 days old)

- Prompt summary: YaB bar-raise verdict is "stalled" (fifth consecutive). Close out by clearing the index.lock, deleting .bak files, fixing BOM/EOL, scrubbing em dashes, then shipping in two coherent commits via release.ps1.
- Recommended verdict: Do this session
- Why: All agent-side file work (BOM strip, em-dash scrub, .gitattributes, .gitignore) is verified done; the remainder is Windows-only (index.lock clear, .bak disk delete, two release.ps1 commits) and this is the live successor that absorbs the dropped doc-batch item.

## Auto-applied

Removed `yab-doc-batch-blocked-lock-and-voice-2026-06-05` from `.work-queue.json`. Evidence is unambiguous: the still-live `yab-barraise-closeout-2026-06-06` item explicitly states in its own `notes` that it "Supersedes the doc-only framing of yab-doc-batch-blocked-lock-and-voice-2026-06-05," and it carries the same lock-clear, em-dash scrub, and .bak cleanup steps plus the now-mixed code/EOL work. Keeping both re-files the same blocked work twice. The four Do-this-session items and the closeout were left in place for Nick.
