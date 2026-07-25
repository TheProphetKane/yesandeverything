# WON'T DO — rolling ledger of dropped work

Every line here was a real queue item or a bar-raise `deferred` entry that a weekly deferred review
judged **not worth doing**. Treat an entry in this file as **already decided against**: bar-raise,
canonical-audit, handler-audit and drain runs should not re-raise or re-enqueue it. If circumstances
change, add a new item with fresh evidence rather than reviving one of these.

Format: `date | project | id or title | reason`

## 2026-07-24 — first deferred review

### Work queue (moved to `.work-queue-archive.json`)

- 2026-07-24 | everything | `working-tree-2026-07-17-yae-stale-tree` | Resolved. The four files it named (scripts/update-project-pages.mjs, sitemap.xml, CLAUDE.md, docs/QUEUE_TRIAGE.md) were committed in YaE afb8c6d on 2026-07-24, so the sitemap self-heal is live; the tree's remaining dirty files are routine-written status/dashboard JSONs, a different condition.
- 2026-07-24 | cross | `handler-audit-skill-table-update-2026-06-14` | Superseded by `handler-audit-2026-07-17-skill-itself-stale`, which asks for the same skills/handler-audit/SKILL.md rewrite with strictly larger scope (12 handlers vs 6, both stale paths, and the scope-lock line).
- 2026-07-24 | everything | `handler-audit-2026-07-03-portfolio-discord-webhook-reconcile` | Duplicate of `handler-audit-2026-07-10-webhook-boilerplate`, which reconciled the same finding read-only on 2026-07-13 and holds the full per-project table plus a trim-vs-provision recommendation in its result_path. Carried forward: Budget's `scripts/post-audit-digests.ps1` posts to #budget-resources via `.discord_audit_webhook.txt` while its handler names a nonexistent "Budget Resources Bot" / `.discord_resources_webhook.txt` — that specific mismatch belongs to the surviving item.

### Bar-raise `deferred` entries (removed from `status/data/<Project>.json`)

- 2026-07-24 | Apothecary | "work-queue at 244 items and working-tree-2026-07-17-apothecary-stale-tree is still pending against a resolved claim" | Snapshot, not a durable finding: the queue is 355 items now, and the Apothecary tree is dirty again with different files (PROJECT_SPEC.md, src/main.js). The queue item stands on its own; this YaE-scoped restatement added nothing.
- 2026-07-24 | Budget | "Log the tailwindcss v4 pin as a tracked deferred-migration item with a revisit trigger" | Self-referential. This deferred entry *is* the tracking record it asked someone to create; the v4 pin itself is unchanged and the dependency lens re-raises it if it ever matters.
- 2026-07-24 | Everything | "Status dashboard skeleton loader and count-up, reusing the Ring patterns" | Cosmetic polish with no bug exposure, re-confirmed across runs and never prioritized.
- 2026-07-24 | Everything | "The legacy gdd.html redirect stub keeps recurring as a finding" | Decided against deletion in practice. This ledger entry is now the settled record the finding asked for.
- 2026-07-24 | Everything | "GitHub Actions pinned to floating major tags rather than commit SHAs" | Accepted tradeoff, stated in the entry's own reason: the floating tags are all first-party actions and zero third-party actions float.
- 2026-07-24 | Hordes | "The game ships fully silent with no audio assets on disk" | On plan, not drift: the GDD states MVP audio is deliberately empty and schedules the pass at M5 with a tracked manifest.
- 2026-07-24 | Rising | "Capture a pre/post frame-time diff proving the v0.59.32/33 decomposition was cost-neutral" | Not practical — the pre-decomposition build is multiple waves back, so the A/B can no longer be run honestly; the useful half is subsumed by performance-01.
- 2026-07-24 | Scheduler | "Record an explicit DESIGN section 23 decision on whether YaS is driven to a first real user or re-parked" | Triplicate of the same posture call, already carried by the MED deferred entry and by queue item `bar-raise-2026-07-24-scheduler-posture-decision`.
- 2026-07-24 | Skylight | "Re-anchor .project-context.json completion/milestone/remaining to the shipped 0.3.1 Google-primary driver" | Duplicate of live queue item `canonical-audit-2026-07-02-skylight-google-phase2-framing` (re-verified still true 2026-07-24).
- 2026-07-24 | Skylight | "Confirm SKYLIGHT_FRAME_ID via a live GET /api/setup" | Duplicate of live queue item `canonical-audit-2026-07-10-skylight-frame-id-empty-var`.
- 2026-07-24 | Skylight | "Null out changelog_path or create the CHANGELOG.md it promises" | Duplicate of live queue item `canonical-audit-2026-07-02-skylight-changelog-phantom` (verified pending; CHANGELOG.md still absent).
- 2026-07-24 | Skylight | "Retire or repair the yac-skylight-audit Windows task husk" | Duplicate of live queue item `handler-audit-2026-07-17-skylight-audit-task-husk`.
- 2026-07-24 | Ring | "Trim the handler's five-webhook list to the three that exist" | Duplicate of live queue item `handler-audit-2026-07-10-webhook-boilerplate`, which the entry itself names as the owner.

> Note on the duplicate drops: the *work* survives in the work queue. What was dropped is the second
> copy of the record, so one finding stops being counted twice across two dashboards.
