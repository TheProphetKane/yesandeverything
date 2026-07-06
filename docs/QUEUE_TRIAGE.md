# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-07-05.

## Current state

Eleven non-auto-safe items are aging past 7 days, membership unchanged from the 2026-06-29 through 07-04 passes: nothing new crossed the 7-day line today. The three items added 2026-06-28 (br-perf-peak-wave-profile, scheduler-barraise-audit-release-aware, hbh-multimesh-crowd-migration) sit at exactly 7 days old and cross into the aging window on tomorrow's 2026-07-06 pass; everything added 2026-06-29 or later is still comfortably inside the window. The worst offenders by age are the four 2026-06-10 completion gates, now 25 days old across three projects: `yac-store-launch` and `yac-subscriptions-enable-ai` (Chains), `hbh-asset-production-pass` (Hordes), and `br-asset-production-pass` (Rising). Rising carries the largest backlog at seven items, six of them deferred best-practices entries already tracked in docs/GODOT_BEST_PRACTICES_ADHERENCE.md; Chains has two, Hordes one, Everything one. Standing note: `yac-subscriptions-enable-ai` is half-stale, the subscription-billing work it gated on shipped LIVE with real payments in 0.54.0 (Decision 33) and is now decoupled from CHAINS_VISIBLE. No item met the narrow unambiguous-Drop bar (referenced file genuinely gone) - both evidence docs the Rising Drop verdicts lean on (the adherence doc) and the HBH asset doc were re-verified present this pass - and `.work-queue.json` is FUSE-truncation-prone, so nothing was auto-removed.

### Hordes

- **hbh-asset-production-pass** (P1, added 2026-06-10) - Defer to the HBH art pipeline. Agent-side inventory and concept batches are done (docs/ASSET_PRODUCTION-2026-06-11.md, verified present); the remainder is user-side Midjourney batches plus Erik modeling, gated on the external art pipeline, not an agent task.

### Rising

- **br-asset-production-pass** (P2, added 2026-06-10) - Defer to Navy art delivery. Blocked on external art that is not on us; the asset pass is a post-art completion gate, nothing actionable until the art lands.
- **br-bp-terrain-tilemaplayer-2026-06-16** (P1, added 2026-06-16) - Drop from queue. Tracked in docs/GODOT_BEST_PRACTICES_ADHERENCE.md s5 and deliberately taken off the dashboard 2026-06-23; the queue entry duplicates the doc, which is the system of record for this large editor-authoring refactor.
- **br-bp-polling-to-event-2026-06-16** (P1, added 2026-06-16) - Drop from queue. Tracked s8, deferred off-dashboard to a focused perf pass; it is the highest-value Rising item (prime lag suspect) and should lead that pass when it runs, but the doc holds it and the queue need not.
- **br-bp-stats-to-resources-2026-06-16** (P2, added 2026-06-16) - Drop from queue. Enemy-stats and scale-mirror halves are already done; the remainder (building stats to .tres, FRAMES_PER_ROW mirror) is tracked s9.
- **br-bp-main-world-gui-scene-2026-06-16** (P3, added 2026-06-16) - Drop from queue. Tracked s3/s10; large editor-authoring refactor parked off-dashboard.
- **br-bp-decompose-god-objects-2026-06-16** (P3, added 2026-06-16) - Drop from queue. Tracked s1; the god-file ratchet already blocks growth, decomposition is a long refactor in the doc.
- **br-bp-git-lfs-2026-06-16** (P3, added 2026-06-16) - Drop from queue, with a timing flag. Tracked s12; needs an attended git-history-rewrite LFS migration that should land BEFORE the Navy art set, so fold it into the attended session that precedes art ingest rather than letting it slip past the art drop.

### Chains

- **yac-store-launch** (P1, added 2026-06-10) - Defer to 1.0 launch. The PWA icon gap is closed committed-ready; the remainder is a wrapper decision (Capacitor vs TWA, per docs/APP-STORE-PATH.md), store accounts, signing, and real screenshots, all gated on Nick plus external accounts.
- **yac-subscriptions-enable-ai** (P1, added 2026-06-10) - Re-scope, then defer to 1.0 launch. The item's premise is stale: the subscription-billing half it gated on shipped and went LIVE with real payments in 0.54.0 (freemium Yes& Chains Pro, Decision 33; PRO_PAYWALL_ENABLED = true), decoupled from CHAINS_VISIBLE - confirmed by the closed canonical-audit-2026-07-01-yac-claude-chainsvisible-paywall-decoupled item. All that remains is the AI-caddy launch flip (CHAINS_VISIBLE = false at src/caddy.ts), a Nick launch-gate call, not a billing task. Recommend rewording the item to "flip CHAINS_VISIBLE for the AI caddy" only; the billing work is done.

### Scheduler

No qualifying items; all Scheduler entries are auto-safe, terminal, or inside the 7-day window. Watch item: scheduler-barraise-audit-release-aware (added 2026-06-28, the release-aware canonical-audit tooling gap) is at exactly 7 days today and qualifies tomorrow. Standing recommendation carried from the 06-28 through 07-04 passes (Promote to release-step): the recurring handler version-ref drift has lagged a release across v0.4.1 -> v0.5.2 -> v0.5.3 -> v0.5.4 (all closed already-resolved), with v0.6.0+ since shipped and 07-05's label-drift item flagging v0.6.0/v0.7.0 dates lagging git. Fold a handler version-pill bump into X:\YesAndScheduler\scripts\release.ps1 so the version-ref self-corrects on ship rather than recurring as per-release queue churn. Still open as a Nick-side one-liner.

### Apothecary

No qualifying items. (`yaa-audit-cadence-naming-2026-06-30`, blocked-on-user, qualifies on the 2026-07-08 pass if unresolved; `yaa-locked-decision-svg-scope-2026-07-04`, blocked-on-user, a Locked-Decision phrasing scope-fix, qualifies 2026-07-12.)

### Budget

No qualifying items. Four Budget items are inside the window: the applied-but-uncommitted DESIGN.md carryover (canonical-audit-2026-07-03-yab-design-takeover-uncommitted, qualifies 2026-07-11) plus three 2026-07-04 bar-raise findings (bulk-delete-no-backup, push-blind-lock-delete, cors-scope-narrow, all qualify 2026-07-12). The push-blind-lock-delete finding is the one to watch - it re-opens a FUSE-corruption race in scripts/push-to-github.ps1 that CLAUDE.md's Hazards section wrongly claims is already fixed.

### Everything

- **handler-audit-skill-table-update-2026-06-14** (P3, added 2026-06-14) - Defer to the next personal-skills repackage. The fix is already applied to the staged source (_skill-review/personal-skills-src/skills/handler-audit/SKILL.md, verified present this pass); going live needs the personal-skills plugin repackaged and reinstalled via Cowork Settings > Capabilities, which only Nick can do and which the read-only skill cache blocks in-session.

### Agents

No qualifying items. New this cycle: handler-audit-2026-07-05-agents-release-cmd-stale (P2, added 2026-07-05, CLAUDE.md still names push-to-github.ps1 as the primary release command instead of release.ps1) is one day old, inside the window, qualifies 2026-07-13.

### Ring

No qualifying items. Four pending Ring items are inside the window (canonical-audit-2026-07-02-ring-projectspec-monetization-subsection qualifies 2026-07-10; canonical-audit-2026-07-03-ring-phase2-auth-live-reframe and handler-audit-2026-07-03-ring-orphan-refs qualify 2026-07-11).

### Cattery

No qualifying items. Four pending Cattery items are inside the window. The P1 missing-migrations item (added 2026-07-02, schema reproducibility plus unversioned RLS on two user-data tables, read-only DDL already staged to its result_path on the 07-04 drain) qualifies on the 2026-07-10 pass; the P1 handler phase2-status-rewrite (CLAUDE.md inverts Phase 2 as unbuilt when it is live, actively steering sessions to refuse real payment work) qualifies 2026-07-11. Both are the ones to watch.

### Skylight

No qualifying items. Five pending Skylight items added 2026-07-02 are inside the window and all blocked behind a parallel session's dirty working tree; the oldest, the google-phase2-framing drift, qualifies on the 2026-07-10 pass if that session has not landed its tree by then.

### Auto-applied this pass

None. The six `br-bp-*-2026-06-16` items carry a Drop verdict, but their evidence is "duplicated in the adherence doc" (docs/GODOT_BEST_PRACTICES_ADHERENCE.md, re-verified present this pass), not the narrow unambiguous-Drop bar (referenced file genuinely gone), and `.work-queue.json` is actively FUSE-truncation-prone, so an unattended write to remove them is the wrong risk to take. They are left in place for Nick to bulk-remove in one attended pass (the adherence doc remains the system of record either way). Recommended Nick-side cleanup, unchanged from the prior pass: bulk-drop the six `br-bp-*-2026-06-16` items plus the terminal wontfix `br-bp-parser-quirk-class-name-2026-06-16`, and clear the queue of the many `completed`/`done` items still parked in it (they are no longer triaged here but remain as clutter).
