# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-06-18.

## Current state

Sixteen non-auto-safe items are aging past 7 days, up from eight last pass: the entire
2026-06-10 completion-gate cohort (six items) crossed from exactly-7-days into scope this
run. Worst offender is `wts-2026-05-29-scheduler-stale-working-tree` at 20 days. Chains
carries the largest backlog at seven items; Budget holds three, Scheduler three, and
Hordes, Rising, and Apothecary one each. No unambiguous Drop this pass.

### Scheduler

- **wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29) - do this session. The 19-day-stale tree resolved into one committed-ready cohort (YaS rebrand + two real test files, tails verified); only the Windows-side ship remains (clear `.git/index.lock`, bump version + CHANGELOG, run `release.ps1`).
- **scheduler-m71-resequence-0602** (P2, added 2026-06-02) - defer to M7.1 (v0.5.0). The X-Org-Slug doc-drift half is already committed-ready; the remainder (org-switcher widget + invite-admin UI + cross-org scope-leak suite) is a milestone scope call gated on Nick green-lighting M7.1 as the next version.
- **scheduler-real-use-testing** (P1, added 2026-06-10) - do this session. Route-level generate-to-publish E2E plus cross-org leak tests are written and tsc-clean; remainder is Nick-side (clear the lock, `pnpm --filter api test`, commit via `release.ps1`, then a human real-use pass).

### Chains

- **yac-mnew-tool-ref-repoint** (P3, added 2026-06-01) - do this session. Ground down to a confirm-and-retire of the dead manual scraper workflow (CONTEXT.md ~236, superseded by the ADR 0021 cron pipeline); needs Nick's "manual scraper session is retired" confirmation, then one focused FUSE-safe edit.
- **yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01) - do this session. Reword staged: keep Supabase migrations escalate-to-Nick, change ROADMAP.md:134 to "AI may draft migration SQL, Nick reviews + approves before ship" so audits stop re-flagging the apparent contradiction; approving the wording closes it.
- **yac-brand-art-swap** (P2, added 2026-06-08) - defer to 1.0 launch. Replacing the placeholder OG/share card and mask-icon SVG with real brand art is genuine design work, not an agent edit; filenames are pinned so no code change blocks it. Park against the 1.0 PWA/share polish.
- **yac-css-deadcode-removal** (P2, added 2026-06-08) - do this session. Re-scoped after the 0.51.3 stylesheet consolidation: the live work is deleting the 12 orphaned `styles-v*.css` files (no longer build inputs) plus an optional dead-code re-scan against the consolidated `styles.css`, then a PATCH release. Bounded.
- **yac-share-protocol-boot-route** (P2, added 2026-06-08) - do this session. Bare `?course=<slug>` boot launch is already implemented to the tree and verified (esbuild/tsc clean); committed-ready. Ship as MINOR 0.52.0 via `release.ps1`, folding the changelog entry at release time.
- **yac-store-launch** (P1, added 2026-06-10) - defer to 1.0 launch. The PWA icon gap is closed committed-ready; the remainder is a wrapper decision (Capacitor vs TWA, per docs/APP-STORE-PATH.md), store accounts, signing, and real screenshots, all gated on Nick + external accounts.
- **yac-subscriptions-enable-ai** (P1, added 2026-06-10) - defer to 1.0 launch. Billing code shipped and verified in 0.32.0; remainder is entirely Nick-side per docs/stripe-setup.md (Stripe product, apply migration 0016, wrangler secrets, webhook, then flip CHAINS_VISIBLE).

### Budget

- **yab-barraise-closeout-2026-06-06** (P1, added 2026-06-06) - do this session. Fifth-consecutive stalled-tree verdict; all agent-side file work is verified done (BOM strip, em-dash scrub, `.gitattributes`, `.gitignore`), leaving only Windows-side steps (clear `.git/index.lock`, delete the two stale `scripts/*.bak`, two scoped `release.ps1` commits).
- **yab-drain-audit-queue-2026-06-10** (P2, added 2026-06-10) - do this session. Root-cause fix for the YaB canonical-audit-to-queue enqueue writer that regressed at the 06-08 sprint; until it is repaired every YaB finding re-files indefinitely, so this unblocks the audit loop for the whole project.
- **yab-orphans-14-2026-06-10** (P3, added 2026-06-10) - defer to next YaB maintenance pass. Fourteen orphaned web modules each need a per-module wire-or-drop judgment; real but unbounded for an unattended drain and low priority, so batch it into a focused cleanup session.

### Hordes

- **hbh-asset-production-pass** (P1, added 2026-06-10) - defer to ongoing asset production. Agent-side inventory and concept batches are done (docs/ASSET_PRODUCTION-2026-06-11.md, GDD v0.98.2); remainder is user-side Midjourney batches plus Erik modeling, blocked on external art production.

### Rising

- **br-asset-production-pass** (P2, added 2026-06-10) - defer to M1 completion. Self-blocked per its own spec until the M1 survival loop lands (M1 is the gating milestone at ~40%); same shape as the HBH asset pass once unblocked.

### Apothecary

- **yaa-final-polish-close** (P3, added 2026-06-10) - do this session. Four slices have left the tree committed-ready (CHANGELOG + release.ps1 truncations repaired, storage-error surfacing, em-dash sweep); remainder is the `apothecary-preset-custom-items` decision (tracked separately) plus a final `release.ps1` run.

### Auto-applied this pass

None. No item met the unambiguous-Drop bar (no referenced file proven absent); the sixteen are committed-ready ships, decision-gated completion gates, and bounded cleanups, all of which need Nick's hand on the wheel. The queue file is left unmodified this pass.
