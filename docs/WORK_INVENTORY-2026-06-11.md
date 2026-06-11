# Open work inventory - 2026-06-11

Every open item behind the dashboard's "left" and "queue" chips: pending and blocked entries in `.work-queue.json` plus the completion gates in each repo's `.project-context.json`. Four queue items are the same work as completion gates and are listed once, in the gates table, with their queue id. "Autonomous" means it can be finished without a decision from the owner; "push only" means the work is agent-side but the final release.ps1 run happens on the host.

## Queue items

| # | id | project | pri | risk | autonomous? |
|---|---|---|---|---|---|
| 1 | wts-2026-05-29-scheduler-discord-webhook-exposed | YaS | P0 | high - live webhook URL in git history | No - rotate the webhook in Discord, paste new URL |
| 2 | wts-2026-06-05-portfolio-wide-index-lock | ALL | P0 | low - likely stale, releases have shipped since | Yes - verify and close |
| 3 | htbh-mount-gap | HBH | P1 | low | No - add X:\HereBeHordes to the scheduled session's folders |
| 4 | htbh-publish-gdd-integrity-guard-2026-05-28 | HBH | P1 | medium - touches release pipeline | Yes + push only |
| 5 | htbh-audit-mount-or-sidecar-2026-05-28 | HBH | P1 | low | No - same mount decision as #3 |
| 6 | yab-doc-batch-blocked-lock-and-voice-2026-06-05 | YaB | P1 | medium - bulk commit of cold tree | Mostly - one call: scrub em dashes in auto-generated reports or exempt them |
| 7 | yab-barraise-closeout-2026-06-06 | YaB | P1 | medium - 26+ uncommitted items, 2 commits | Mostly - same scrub call as #6, then push only |
| 8 | yab-polish-log-v0-11-0-release-claim-2026-06-07 | YaB | P1 | low | No - pick: ship v0.11.0 for real, or reword POLISH_LOG |
| 9 | br-barraise-m1-survival-loop-2026-06-10 | BR | P1 | medium - core gameplay | Partial - SP scaling + convoy slices yes; wave-cadence contradiction needs a design call; oil-zero work is committed-ready |
| 10 | yae-commit-restored-tree-2026-06-11 | YaE | P1 | low - likely stale after today's releases | Yes - verify and close |
| 11 | htbh-queue-drain-pass-2026-05-27 | HBH | P2 | low | Yes, once #3 lands |
| 12 | htbh-v0-75-0-minor-rollup-verify-2026-05-28 | HBH | P2 | low | Yes |
| 13 | wts-2026-05-29-scheduler-stale-working-tree | YaS | P2 | medium - 75 modified files to triage | Mostly + push only; stash-vs-ship on true WIP is yours |
| 14 | wts-2026-05-29-yac-stash-scraper-wip | YaC | P2 | low | No - apply or drop the stash, your call |
| 15 | yac-stale-stash-2026-06-11 | YaC | P2 | low | No - duplicate of #14, close together |
| 16 | scheduler-m71-resequence-0602 | YaS | P2 | low | No - product scope decision (org-switcher + scope-leak tests now or later) |
| 17 | yab-polish-orphan-files-2026-06-07 | YaB | P2 | medium - wire-or-drop 6 files | Partial - can recommend per file, drop/wire call is yours |
| 18 | yac-brand-art-swap | YaC | P2 | low | No - real brand art wanted (OG card + mask icon) |
| 19 | yac-css-deadcode-removal | YaC | P2 | high - 61 rules, visual regressions possible | Mostly - needs a visual pass after |
| 20 | yac-share-protocol-boot-route | YaC | P2 | medium - boot-path code | Yes + push only |
| 21 | yab-tracked-bak-rm-2026-06-10 | YaB | P2 | low | Yes + push only |
| 22 | yab-drain-audit-queue-2026-06-10 | YaB | P2 | medium - fixes the audit enqueue writer | Yes |
| 23 | yac-decision-30-entry-2026-06-11 | YaC | P2 | low | Yes |
| 24 | br-roadmap-md-refresh-2026-06-11 | BR | P2 | low | Mostly - tombstone vs refresh; recommend tombstone to the GDD Roadmap tab |
| 25 | br-architecture-snapshot-refresh-2026-06-11 | BR | P2 | low | Yes |
| 26 | br-git-index-lock-2026-06-11 | BR | P2 | low - likely stale after v0.57.8 | Yes - verify and close |
| 27 | apothecary-release-double-fire | YaA | P2 | medium - release script re-entry | Yes |
| 28 | apothecary-preset-custom-items | YaA | P2 | low | No - pick: snapshot customItems into presets, or filter dangling keys |
| 29 | htbh-git-config-extension-garbage-2026-06-11 | HBH | P2 | low | Yes |
| 30 | apothecary-git-config-extension-garbage-2026-06-11 | YaA | P2 | low | Yes |
| 31 | yac-mnew-tool-ref-repoint | YaC | P3 | low | No - confirm the manual scraper workflow is retired |
| 32 | yac-mnew-roadmap-escalation-clarify | YaC | P3 | low | No - confirm Supabase-migration escalation policy |
| 33 | yab-orphans-14-2026-06-10 | YaB | P3 | medium - 14 modules wire-or-drop | Partial - recommendations yes, calls yours |
| 34 | htbh-minimap-float-mirror-drift-2026-06-11 | HBH | P3 | medium - rendering scale | Yes |
| 35 | yac-claudemd-next-session-queue-2026-06-11 | YaC | P3 | low | Yes - handler edit, will flag for your eyes in the diff |
| 36 | yac-project-spec-tail-truncation-2026-06-11 | YaC | P3 | low | Yes |

## Completion gates (from .project-context.json)

| # | gate | project | pri | risk | autonomous? |
|---|---|---|---|---|---|
| 37 | Store launch: listings, wrapper, signing (queue: yac-store-launch) | YaC | P1 | low | No - Capacitor-vs-TWA call, store accounts, screenshots; agent side done |
| 38 | Subscriptions + flip CHAINS_VISIBLE (queue: yac-subscriptions-enable-ai) | YaC | P1 | medium - billing | No - Stripe setup, migration 0016, secrets, launch call; code shipped |
| 39 | Asset production pass (queue: hbh-asset-production-pass) | HBH | P1 | low | No - run Midjourney Batch A, modeling, register in MODELS |
| 40 | Real-use testing + iterate (queue: scheduler-real-use-testing) | YaS | P1 | low | No - human real-use pass; E2E suite written, needs your test run + commit |
| 41 | M4 Pre-Production Lock completion | HBH | P1 | medium | Partial - doc/system work yes, lock sign-off yours |
| 42 | Mission content beyond first playable | HBH | P2 | medium | Partial - design direction yours, implementation autonomous |
| 43 | M1 survival loop (waves, fail, FoW, win/lose) | BR | P1 | medium | Partial - same as queue #9 |
| 44 | BR asset production pass (queue: br-asset-production-pass) | BR | P2 | low | No - blocked behind M1, then Midjourney is yours |
| 45 | BR gameplay content depth | BR | P2 | medium | Partial |
| 46 | E2E coverage of generation + multi-tenant flows | YaS | P2 | medium | Yes - suite exists, extend + run |
| 47 | Productization (onboarding, billing) | YaS | P2 | medium | No - product decisions first |
| 48 | M6 budgets + goals | YaB | P1 | medium | Partial - feature work autonomous against DESIGN.md, acceptance yours |
| 49 | PDF parsing (deferred from M5) | YaB | P2 | medium | Yes - importer pattern is established |
| 50 | Symbol + label polish backlog close (queue: yaa-final-polish-close) | YaA | P3 | low | Mostly - preset decision (#28) is the one blocker |

## Rollup

50 distinct work items (the dashboard's 43 counts pending-only queue states and de-duplicates gate twins). 17 fully autonomous, 10 autonomous-with-a-single-decision or push-only, 23 need owner input: 2 are 30-second host actions (webhook rotation, mount folder), 8 are real product/design decisions, the rest are judgment calls I can pre-chew into recommendations.

Fastest burn-down: greenlight the 17 autonomous items for overnight drains, answer the four standing decisions (em-dash scrub exemption, v0.11.0 ship-vs-reword, preset handling, wave cadence), and do the two host actions. That closes or unblocks 35 of 50.
