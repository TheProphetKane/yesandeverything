# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-07-08.

## Current state

Sixteen non-auto-safe items are aging past 7 days, up one from last pass as yaa-audit-cadence-naming-2026-06-30 (Apothecary) crossed the threshold. The worst offenders by age remain the four 2026-06-10 completion gates, now 28 days old across three projects (Hordes, Rising, Chains). Rising carries the largest backlog at eight items, six of them the deferred best-practices entries already tracked in docs/GODOT_BEST_PRACTICES_ADHERENCE.md. No item met the unambiguous-Drop bar for auto-removal: the six br-bp-*-2026-06-16 entries all warrant Drop and one (br-bp-decompose-god-objects) is now verifiably complete, but the .gd files still exist on disk (just smaller) and `.work-queue.json` is FUSE-truncation-prone with a concurrent queue-drain writer, so nothing was auto-removed this pass.

### Hordes

- **hbh-asset-production-pass** (P1, added 2026-06-10) - Defer to the HBH art pipeline. Agent-side inventory and concept batches are done (docs/ASSET_PRODUCTION-2026-06-11.md); the remainder is user-side Midjourney batches plus Erik modeling, gated on the external art pipeline, not an agent task.
- **hbh-multimesh-crowd-migration-2026-06-28** (P1, added 2026-06-28) - Defer to Nick's crowd look-call (recommend reclassifying to blocked-on-user). Wiring is confirmed landed at v0.99.31 (crowd3d.gd wired behind a default-off debug flag, A/B table in OPTIMIZATION_LOG showing 1248/1066/916 fps instanced vs 26/13/7 animated at 1k/2k/3k); the only open step is the owner's static-pose-vs-walk-cycle visual decision, not agent work.

### Rising

- **br-asset-production-pass** (P2, added 2026-06-10) - Defer to Navy art delivery. Blocked on external art that is not on us; a post-art completion gate, nothing actionable until the art lands.
- **br-bp-terrain-tilemaplayer-2026-06-16** (P1, added 2026-06-16) - Drop from queue. Tracked s5 in docs/GODOT_BEST_PRACTICES_ADHERENCE.md and off-dashboard since 2026-06-23; the queue entry duplicates the doc, which is the system of record for this large editor-authoring refactor.
- **br-bp-polling-to-event-2026-06-16** (P1, added 2026-06-16) - Drop from queue. Tracked s8, off-dashboard to a focused perf pass; the highest-value Rising item (prime lag suspect) and should lead that pass when it runs, but the doc holds it, not the queue.
- **br-bp-stats-to-resources-2026-06-16** (P2, added 2026-06-16) - Drop from queue. Enemy-stats and scale-mirror halves are already done; the remainder (building stats to .tres, FRAMES_PER_ROW mirror) is tracked s9.
- **br-bp-main-world-gui-scene-2026-06-16** (P3, added 2026-06-16) - Drop from queue. Tracked s3/s10; large editor-authoring refactor parked off-dashboard.
- **br-bp-decompose-god-objects-2026-06-16** (P3, added 2026-06-16) - Drop from queue, verified complete. This pass confirmed the god-file decomposition shipped: gameplay.gd is 976 lines, hud.gd 905, iso_grid.gd 981 (all under 1000), against the item's cited 3414/2381/2501; matches memory br-godfile-decomposition (COMPLETE v0.59.33, ~5300 lines into 29 modules). Premise is stale - close as completed, not merely parked. Not auto-removed only because the shared FUSE-prone queue file has a concurrent writer.
- **br-bp-git-lfs-2026-06-16** (P3, added 2026-06-16) - Drop from queue, with a timing flag. Tracked s12; needs an attended git-history-rewrite LFS migration that should land BEFORE the Navy art set, so fold it into the attended session that precedes art ingest rather than letting it slip past the art drop.
- **br-perf-peak-wave-profile-2026-06-28** (P2, added 2026-06-28) - Do this session. A concrete, small task (run Skirmish, drive a peak wave, capture the Godot profiler FPS + top draw/script costs into docs/OPTIMIZATION_LOG.md to set the M4 60-FPS baseline). It has sat as a Standing-watch placeholder with no captured measurement for 4+ weeks; attended because headless cannot drive BR unit movement.

### Chains

- **yac-store-launch** (P1, added 2026-06-10) - Defer to 1.0 launch. The PWA icon gap is closed committed-ready; the remainder is a wrapper decision (Capacitor vs TWA, per docs/APP-STORE-PATH.md), store accounts, signing, and real screenshots, all gated on Nick plus external accounts.
- **yac-subscriptions-enable-ai** (P1, added 2026-06-10) - Re-scope, then defer to 1.0 launch. The premise is stale: the subscription-billing half shipped and went LIVE with real payments in 0.54.0 (freemium Yes& Chains Pro, Decision 33; PRO_PAYWALL_ENABLED = true), decoupled from CHAINS_VISIBLE. All that remains is the AI-caddy launch flip (CHAINS_VISIBLE at src/caddy.ts), a Nick launch call, not a billing task. Reword the item to "flip CHAINS_VISIBLE for the AI caddy" only.

### Scheduler

- **scheduler-barraise-audit-release-aware** (P2, added 2026-06-28) - Do this session. A small, clear tooling change: append a best-effort, non-fatal, finding-id-deduped canonical-audit pass to the end of X:\YesAndScheduler\scripts\release.ps1 so an evening ship gets re-audited the same day (closes the morning-audit-vs-evening-ship gap that let v0.6.0 billing drift through). Foldable with the standing recommendation to bump the handler version-pill in the same release step.

### Apothecary

- **yaa-audit-cadence-naming-2026-06-30** (P3, added 2026-06-30) - Do this session (as a decision). Newly aged in; blocked-on-user but small: reconcile PROJECT_SPEC.md section 8 and .project-context.json so the weekly constellation/bar-raise REVIEW and the nightly canonical-doc AUDIT read as two distinct cadences (do NOT mechanically rename weekly->nightly). Resolve together with the newer canonical-audit-2026-07-07-apothecary-review-cadence-drift (same weekly-vs-daily fork) in one pass - one intent call, a two-line doc edit each side.

### Budget

No qualifying items. Four Budget items sit inside the window: the applied-but-uncommitted DESIGN.md carryover (canonical-audit-2026-07-03-yab-design-takeover-uncommitted, qualifies 2026-07-11) plus three 2026-07-04 bar-raise findings (bulk-delete-no-backup, push-blind-lock-delete, cors-scope-narrow, qualify 2026-07-12). push-blind-lock-delete is the one to watch: it re-opens a FUSE-corruption race in scripts/push-to-github.ps1 that CLAUDE.md's Hazards section wrongly claims is fixed.

### Everything

- **handler-audit-skill-table-update-2026-06-14** (P3, added 2026-06-14) - Defer to the next personal-skills repackage. The fix is already applied to the staged source (_skill-review/personal-skills-src/skills/handler-audit/SKILL.md); going live needs the plugin repackaged and reinstalled via Cowork Settings > Capabilities, which only Nick can do and the read-only skill cache blocks in-session.
- **yae-status-everything-orphan-json-2026-06-29** (P3, added 2026-06-29) - Do this session (recommend option b). Everything.json is emitted and git-tracked but absent from the PROJECTS array in status/index.html, so no card consumes it. The low-risk resolution is (b): document in CLAUDE.md that Everything.json is deliberate non-grid hub metadata so audits stop re-flagging it - a one-line doc note that also settles the sibling Skylight.json (yae-status-skylight-orphan-json-2026-07-04) and staged Cattery.json orphans under one policy. Needs Nick's pick among (a) add a hub card / (b) document as intentional / (c) stop emitting.

### Agents

No qualifying items. handler-audit-2026-07-05-agents-release-cmd-stale (P2, CLAUDE.md still names push-to-github.ps1 as the primary release command instead of release.ps1) qualifies 2026-07-13; two 2026-07-07 canonical-audit findings sit fresh in the window.

### Ring

No qualifying items. The oldest pending Ring items were added 2026-07-02: canonical-audit-2026-07-02-ring-projectspec-monetization-subsection qualifies 2026-07-10, with phase2-auth-live-reframe and orphan-refs qualifying 2026-07-11. Ten fresh 2026-07-07 bar-raise-ring findings (worker-observability, community-ratings-backup, dualwrite-atomicity, freetier-budget, gdpr-data-endpoints, and others) do not qualify until 2026-07-15, but four are P1 data-integrity items that warrant an attended Ring session sooner - fold the observability + community-ratings-backup + dualwrite-atomicity trio into one deploy.

### Cattery

No qualifying items. The P1 missing-migrations item (added 2026-07-02, schema reproducibility plus unversioned RLS on two user-data tables, read-only DDL staged to its result_path) qualifies 2026-07-10; the P1 handler phase2-status-rewrite (CLAUDE.md inverts Phase 2 as unbuilt when it is live, steering sessions to refuse real payment work) qualifies 2026-07-11. Both are the ones to watch.

### Skylight

No qualifying items. Five pending Skylight items added 2026-07-02 are inside the window, all blocked behind a parallel session's dirty working tree; the oldest, google-phase2-framing, qualifies 2026-07-10 if that tree has not landed.

### Gnosis

No items in the queue.

### Auto-applied this pass

None. The six br-bp-*-2026-06-16 items carry a Drop verdict - and br-bp-decompose-god-objects is now verifiably complete (gameplay/hud/iso_grid all under 1000 lines this pass vs the item's cited 3000+; memory br-godfile-decomposition COMPLETE v0.59.33) - but none meets the narrow unambiguous-Drop bar for an unattended write: the .gd files still exist on disk (the work landed, the files did not vanish), the other five are "tracked in the adherence doc" rather than gone, and `.work-queue.json` is actively FUSE-truncation-prone with the every-4h queue-drain task as a concurrent writer, so a mid-array delete is the wrong risk to take unattended. All six are left in place for Nick to bulk-remove in one attended pass (the adherence doc stays the system of record either way). Recommended Nick-side cleanup, unchanged from prior passes: bulk-drop the six br-bp-*-2026-06-16 items and clear the queue of the many completed/done items still parked in it as clutter.
