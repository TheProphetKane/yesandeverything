# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-06-14.

## Current state

Six non-auto-safe items are aging past 7 days. Worst offender is
`wts-2026-05-29-scheduler-stale-working-tree` at 16 days. Backlog is a three-way
tie at two items each across Chains, Scheduler, and Budget; one Budget item was
auto-dropped as superseded, leaving five that need a decision (four
do-this-session, one closeout).

### Chains

- **yac-mnew-tool-ref-repoint** (P3, added 2026-06-01) - do this session. Ground down to one action: confirm-and-retire the dead manual scraper workflow (CONTEXT.md ~236), then a focused edit. Needs the "manual scraper session is retired" call.
- **yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01) - do this session. Reword staged: keep Supabase migrations escalate-to-Nick, change to "AI may draft migration SQL, Nick reviews + approves." Approving the reword closes it.

### Scheduler

- **wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29) - do this session. Committed-ready; only the Windows-side ship remains (clear `.git/index.lock`, bump version + CHANGELOG, run release.ps1), folding the other committed-ready Scheduler doc edits in one push.
- **scheduler-m71-resequence-0602** (P2, added 2026-06-02) - do this session. Doc-drift half (X-Org-Slug) fixed; remainder is a scope call. Recommendation staged: M7.1 as v0.5.0, scope-leak suite first.

### Budget

- **yab-barraise-closeout-2026-06-06** (P1, added 2026-06-06) - do this session. All agent-side file work verified done (BOM strip, em-dash scrub, .gitattributes, .gitignore); remainder is Windows-only (index.lock clear, .bak disk delete, two release.ps1 commits). Live successor that absorbs the dropped doc-batch item.

### Auto-applied this pass

- Dropped `yab-doc-batch-blocked-lock-and-voice-2026-06-05` from `.work-queue.json`: explicitly superseded by `yab-barraise-closeout-2026-06-06`, which carries the same lock-clear, em-dash scrub, and .bak cleanup plus the mixed code/EOL work. Keeping both re-filed the same blocked work twice.
