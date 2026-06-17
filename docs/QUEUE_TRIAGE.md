# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-06-17.

## Current state

Eight non-auto-safe items are aging past 7 days, down from nine last pass: the dropped
orphan item is gone and the two 2026-06-10 Budget items sit at exactly 7 days, not over.
Worst offender is `wts-2026-05-29-scheduler-stale-working-tree` at 19 days. Chains carries
the largest backlog at five items; Scheduler holds two and Budget one. Six are do-this-session
(committed-ready ships, one bounded cleanup, two staged one-line decisions); two are real
Defers (a Scheduler milestone scope call and Chains brand art). No unambiguous Drop this pass.

### Scheduler

- **wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29) - do this session. Premise resolved by interim commits; residue is one coherent committed-ready cohort (YaS rebrand + two real test files, tails verified). Only the Windows-side ship remains: clear `.git/index.lock`, bump version + CHANGELOG, run `release.ps1`, folding the other committed-ready Scheduler doc edits in one push.
- **scheduler-m71-resequence-0602** (P2, added 2026-06-02) - defer to M7.1 (v0.5.0). Doc-drift half (X-Org-Slug) already fixed committed-ready; the remainder is a milestone scope call, not a quick toggle. The build (org-switcher widget + invite-admin UI + cross-org scope-leak suite) is real but gated on Nick green-lighting M7.1 as the next version. Recommendation staged: M7.1 = v0.5.0, scope-leak suite first.

### Chains

- **yac-mnew-tool-ref-repoint** (P3, added 2026-06-01) - do this session. Ground down to a confirm-and-retire of the dead manual scraper workflow (CONTEXT.md ~236, superseded by the ADR 0021 cron pipeline), then one focused FUSE-safe edit. Needs the "manual scraper session is retired" confirmation before the edit.
- **yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01) - do this session. Reword already staged: keep Supabase migrations escalate-to-Nick, change ROADMAP.md:134 to "AI may draft migration SQL, Nick reviews + approves before ship" so audits stop re-flagging the apparent contradiction. Approving the wording closes it.
- **yac-brand-art-swap** (P2, added 2026-06-08) - defer to 1.0 launch. Replacing the placeholder OG/share card and mask-icon SVG with real brand art is genuine design work, not an agent edit; filenames are pinned so no code change blocks it. Park against the 1.0 launch checklist (PWA/share polish) rather than churning the queue on it.
- **yac-css-deadcode-removal** (P2, added 2026-06-08) - do this session. The gating analysis is done: 60 of 61 zero-reference rules cleared for deletion, `.leaflet-control-zoom` carved out as library-owned. Remainder is the mechanical rule deletion in styles-v8/v9.css plus a runtime visual smoke and a PATCH release. Bounded.
- **yac-share-protocol-boot-route** (P2, added 2026-06-08) - do this session. Already implemented to the working tree and verified (esbuild/tsc clean); committed-ready. Ship as MINOR 0.52.0 via `release.ps1`, folding the 0.51.3 changelog entry at release time.

### Budget

- **yab-barraise-closeout-2026-06-06** (P1, added 2026-06-06) - do this session. All agent-side file work verified done (BOM strip, em-dash scrub, `.gitattributes`, `.gitignore`); remainder is Windows-only: clear `.git/index.lock`, delete the two stale `scripts/*.bak`, then two scoped `release.ps1` commits. Fifth-consecutive stalled-tree verdict; this is the live closeout that absorbed the earlier dropped doc-batch item.

### Auto-applied this pass

None. No qualifying item met the unambiguous-Drop bar this pass; the eight are committed-ready ships, one bounded cleanup, two staged one-line decisions, and two Defers, all of which need Nick's hand on the wheel. Five items (the three 2026-06-10 Budget/asset items, the two 2026-06-10 gate items) sit at exactly 7 days and will cross into scope next pass.
