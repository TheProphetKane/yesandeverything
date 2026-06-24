# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-06-24.

## Current state

Fourteen non-auto-safe items are aging past 7 days, up from nine last pass: the four 2026-06-18 BR audit items are still inside the 7-day window this run, but the eight 2026-06-16 BR best-practices items and the 2026-06-14 handler-skill item have now crossed it. Worst offender by age is `yac-css-deadcode-removal` (2026-06-08, 16 days). Rising carries by far the largest backlog at eight items, though seven are deferred or wontfix best-practices entries already tracked in docs/GODOT_BEST_PRACTICES_ADHERENCE.md and recommended for a bulk drop from the queue; Chains has three, Hordes two, Everything one. No item met the narrow unambiguous-Drop bar (referenced file genuinely gone), and `.work-queue.json` is FUSE-truncation-prone (its `_drain_log` was lost and four items dropped out of the array on 06-22), so nothing was auto-removed this pass.

### Hordes

- **hbh-asset-production-pass** (P1, added 2026-06-10) - Defer to the HBH art pipeline. Agent-side inventory and concept batches are done (docs/ASSET_PRODUCTION-2026-06-11.md, GDD v0.98.2); the remainder is user-side Midjourney batches plus Erik modeling, gated on the external art pipeline, not an agent task.
- **htbh-gdd-2d-retirement-residual-drift-2026-06-16** (P2, added 2026-06-16) - Do this session. Two grounding slices already ground-truthed all three regions (Design-tab Locked-Decision pointers, M3 roadmap deliverables, Architecture residuals); what remains is one attended 666KB docs/GDD.html atomic-write-with-readback to land parts 1-3, which the unattended drain keeps deferring for FUSE-write safety.

### Rising

- **br-asset-production-pass** (P2, added 2026-06-10) - Defer to Navy art delivery. Blocked on external art that is not on us; the asset pass is a post-art completion gate, nothing actionable until the art lands.
- **br-bp-terrain-tilemaplayer-2026-06-16** (P1, added 2026-06-16) - Drop from queue. Tracked in docs/GODOT_BEST_PRACTICES_ADHERENCE.md s5 and deliberately taken off the dashboard 06-23; the queue entry duplicates the doc, which is the system of record for this large editor-authoring refactor.
- **br-bp-polling-to-event-2026-06-16** (P1, added 2026-06-16) - Drop from queue. Same shape: tracked s8, deferred off-dashboard to a focused perf pass; the doc holds it, the queue does not need to.
- **br-bp-stats-to-resources-2026-06-16** (P2, added 2026-06-16) - Drop from queue. Enemy-stats and scale-mirror halves are already done; the remainder (building stats to .tres, FRAMES_PER_ROW mirror) is tracked s9.
- **br-bp-parser-quirk-class-name-2026-06-16** (P2, added 2026-06-16) - Drop from queue. Already marked wontfix: bare class_name conversion contradicts the locked Godot 4.6 boot-safety decision (REVERTED.md s7) and broke the gameplay-scene compile when tried; terminal status, will never be drained.
- **br-bp-main-world-gui-scene-2026-06-16** (P3, added 2026-06-16) - Drop from queue. Tracked s3/s10; large editor-authoring refactor parked off-dashboard.
- **br-bp-decompose-god-objects-2026-06-16** (P3, added 2026-06-16) - Drop from queue. Tracked s1; the god-file ratchet already blocks growth, decomposition is a long refactor in the doc.
- **br-bp-git-lfs-2026-06-16** (P3, added 2026-06-16) - Drop from queue. Tracked s12; needs an attended git-history-rewrite LFS migration, parked off-dashboard until then.

### Chains

- **yac-css-deadcode-removal** (P2, added 2026-06-08) - Do this session. Premise is stale (the styles-v*.css split was consolidated to styles.css in 0.51.3, comment-repoint half shipped in v0.52.0); remaining real work is the 12 orphaned styles-v*.css file deletions plus a quick runtime visual smoke and a PATCH release. Bounded, ground-truthed across three prior slices, safe to authorize.
- **yac-store-launch** (P1, added 2026-06-10) - Defer to 1.0 launch. The PWA icon gap is closed committed-ready; the remainder is a wrapper decision (Capacitor vs TWA, per docs/APP-STORE-PATH.md), store accounts, signing, and real screenshots, all gated on Nick plus external accounts.
- **yac-subscriptions-enable-ai** (P1, added 2026-06-10) - Defer to 1.0 launch. Billing code shipped and verified in 0.32.0; the remainder is entirely Nick-side per docs/stripe-setup.md (Stripe product, apply migration 0016, wrangler secrets, webhook, then flip CHAINS_VISIBLE).

### Scheduler

No qualifying items.

### Apothecary

No qualifying items. The one YaA item in the queue (`yaa-stale-working-tree-2026-06-24`) was added today and is inside the 7-day window.

### Budget

No qualifying items.

### Everything

- **handler-audit-skill-table-update-2026-06-14** (P3, added 2026-06-14) - Defer to the next personal-skills repackage. The fix is already applied to the staged source (_skill-review/personal-skills-src/.../handler-audit/SKILL.md, six-handler table); going live needs the personal-skills plugin repackaged and reinstalled via Cowork Settings > Capabilities, which only Nick can do and which the read-only skill cache blocks in-session.

### Agents

No qualifying items.

### Auto-applied this pass

None. The seven Rising best-practices items carry a Drop verdict, but their evidence is "duplicated in the adherence doc / wontfix," not the narrow unambiguous-Drop bar (referenced file genuinely gone), and `.work-queue.json` is actively FUSE-truncation-prone, so an unattended write to it is the wrong risk to take. They are left in place for Nick to bulk-remove in one attended pass (the adherence doc remains the system of record either way). Recommended Nick-side cleanup this session: bulk-drop the seven `br-bp-*-2026-06-16` items and confirm the `yac-css-deadcode-removal` and `htbh-gdd-2d-retirement-residual-drift` "do this session" calls.
