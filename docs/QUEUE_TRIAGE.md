# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-06-15.

## Current state

Six non-auto-safe items are aging past 7 days. Worst offender is
`wts-2026-05-29-scheduler-stale-working-tree` at 17 days. Backlog is a three-way
tie at two items each across Scheduler, Chains, and Budget. Five are
do-this-session (most already committed-ready, waiting only on a Windows-side
ship or a one-line Nick decision); one Budget cleanup item is a Drop candidate as
a subset of a newer item, left in place for Nick to confirm the merge.

### Scheduler

- **wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29) - do this session. Premise resolved by interim commits; residue is one coherent committed-ready cohort (YaS rebrand + two real test files, tails verified). Only the Windows-side ship remains: clear `.git/index.lock`, bump version + CHANGELOG, run `release.ps1`, folding the other committed-ready Scheduler doc edits in one push.
- **scheduler-m71-resequence-0602** (P2, added 2026-06-02) - do this session. Doc-drift half (X-Org-Slug) already fixed committed-ready; the remainder is a one-conversation scope call. Recommendation staged: build M7.1 as v0.5.0 with the cross-org scope-leak suite first. Authorize or push.

### Chains

- **yac-mnew-tool-ref-repoint** (P3, added 2026-06-01) - do this session. Ground down to a confirm-and-retire of the dead manual scraper workflow (CONTEXT.md ~236, superseded by the ADR 0021 cron pipeline), then one focused FUSE-safe edit. Needs the "manual scraper session is retired" confirmation before the edit.
- **yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01) - do this session. Reword already staged: keep Supabase migrations escalate-to-Nick, change ROADMAP.md:134 to "AI may draft migration SQL, Nick reviews + approves before ship" so audits stop re-flagging the apparent contradiction. Approving the wording closes it.

### Budget

- **yab-barraise-closeout-2026-06-06** (P1, added 2026-06-06) - do this session. All agent-side file work verified done (BOM strip, em-dash scrub, `.gitattributes`, `.gitignore`); remainder is Windows-only: clear `.git/index.lock`, delete the two stale `scripts/*.bak`, then two scoped `release.ps1` commits. Fifth-consecutive stalled-tree verdict; this is the live closeout that absorbed the earlier dropped doc-batch item.
- **yab-polish-orphan-files-2026-06-07** (P2, added 2026-06-07) - drop (left in place). All six orphaned v0.11.0 files (PageHeader, FilterChip, SectionAnchor, useDocumentTitle, useKeyboardShortcut, useMediaQuery) are a strict subset of the 14 listed in the newer `yab-orphans-14-2026-06-10`, same wire-or-drop decision. Recommend dropping this narrower item and letting the broader one carry all orphans; not auto-removed because the supersession is inferred from the file lists, not self-declared, so it wants Nick's confirmation.

### Auto-applied this pass

- None removed. The one Drop verdict (`yab-polish-orphan-files-2026-06-07`) is a subset-supersession judgment rather than an unambiguous file-absence, so it stays in `.work-queue.json` pending Nick's confirmation that the merge into `yab-orphans-14-2026-06-10` is intended. All other qualifying items are committed-ready or decision-gated and need Nick's hand.
