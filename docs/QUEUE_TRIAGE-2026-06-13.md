# Queue triage 2026-06-13

## TL;DR

Five non-auto-safe items are aging past 7 days; the worst offender is `wts-2026-05-29-scheduler-stale-working-tree` at 15 days (now committed-ready, just needs the ship). Scheduler and Chains tie for the largest aging backlog at two items each, with one Budget item rounding out the set.

## Scheduler

**wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29, 15 days old)
- Prompt summary: Scheduler working tree had ~75 modified files plus 3 untracked carrying uncommitted edits, several last touched by HEAD well over 7 days ago, with high FUSE-truncation risk the longer it sits. Triage was to group commits by area and ship through `scripts/release.ps1`, stashing anything WIP.
- Recommended verdict: Do this session
- Why: The stale-tree premise has resolved (interim commits landed the bulk) and the residue is one coherent YaS-rebrand cohort plus two gate-serving test files, all committed-ready and verified clean, so the only remaining step is the Nick-side ship (clear `.git/index.lock`, bump version + CHANGELOG, run `release.ps1`, which also pushes the 3 unpushed commits).

**scheduler-m71-resequence-0602** (P2, added 2026-06-02, 11 days old)
- Prompt summary: v0.3.0 shipped ahead of the M7.1 multi-tenant-polish milestone (org-switcher widget, invite-admin UI, cross-org scope-leak test suite), which is still unbuilt. The X-Org-Slug switch header is documented live in section 16 but has zero SPA references, so next-version scope needs deciding.
- Recommended verdict: Do this session
- Why: Slice 1 already fixed the X-Org-Slug doc drift and confirmed the scope-leak suite and invite-admin UI are genuinely absent, leaving only the scope call for Nick, with a recommendation already drafted at the result path (M7.1 as v0.5.0, scope-leak suite first).

## Chains

**yac-mnew-tool-ref-repoint** (P3, added 2026-06-01, 12 days old)
- Prompt summary: After 0.34.2 shipped, repoint live tool references to `tools/_archived/` (CONTEXT.md scrape_pipeline.py; BACKLOG.md seed_courses.py + scrape_pipeline.py), leaving historical changelog rows untouched.
- Recommended verdict: Do this session
- Why: Three drain passes have re-surveyed this and converged on the same conclusion, it is not a mechanical repoint but a confirm-and-retire of one dead manual scraper-session description in a 336KB CONTEXT.md, blocked solely on Nick confirming the manual scraper workflow is retired (superseded by ADR 0021 cron ingestion).

**yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01, 12 days old)
- Prompt summary: The ROADMAP escalation block still lists Supabase migrations (SQL) as escalate-to-Nick despite autonomous migration ships. Confirm whether the policy still holds or update it.
- Recommended verdict: Do this session
- Why: A one-line policy confirmation, and the evidence points to the policy still being in force, since the 2026-06-11 `yac-subscriptions-enable-ai` drain explicitly declined to auto-apply migration 0016 because "ROADMAP escalation policy routes Supabase SQL to Nick."

## Budget

**yab-doc-batch-blocked-lock-and-voice-2026-06-05** (P1, added 2026-06-05, 8 days old)
- Prompt summary: Land the YaB canonical doc batch plus untracked bar-raise and canonical-audit reports as a scoped doc-only commit. Blocked on an unkillable `.git/index.lock` (needs Windows-side git-unstick) and em-dash voice violations in DECISIONS.md and the audit reports.
- Recommended verdict: Drop
- Why: Superseded verbatim by `yab-barraise-closeout-2026-06-06`, whose notes state it "Supersedes the doc-only framing of yab-doc-batch-blocked-lock-and-voice-2026-06-05" because the tree now mixes code, `.bak`, BOM, and EOL-policy changes into a 2-commit structural job, and the lock-clear plus em-dash scrub this item described are already completed under the closeout item's slices (DECISIONS.md em dashes 15 to 0, BOM stripped).

## Auto-applied

None applied this run. The one Drop verdict (`yab-doc-batch-blocked-lock-and-voice-2026-06-05`) is unambiguous and would normally be auto-removed, but the queue file was being modified by a concurrent `queue-drain-4h` task during this run (its `_drain_log` gained a `2026-06-14T01:06:54Z` entry closing `yae-yaa-pill-bump-2026-06-12` mid-triage), and the sandbox shell read of `.work-queue.json` returned an invalid-JSON / truncated view over the FUSE mount. Mutating an actively-contended queue file off an unreliable read risks clobbering the other task's write or truncating the file, so the removal was held. Recommended action for the next clean drain: remove `yab-doc-batch-blocked-lock-and-voice-2026-06-05` (superseded by `yab-barraise-closeout-2026-06-06`).
