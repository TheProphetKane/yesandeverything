# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-06-22.

## Current state

Thirty-one non-auto-safe items are aging past 7 days, up from twenty-five last pass: the entire 2026-06-14 cohort crossed the threshold this run (seven items), against one drop. Worst offender remains `wts-2026-05-29-scheduler-stale-working-tree` at 24 days. Chains carries the largest backlog at nine items; Budget six, Scheduler five, Rising three, Apothecary three, Everything three, Hordes two, Agents zero. No unambiguous Drop this pass; nothing auto-removed.

### Hordes

- **hbh-asset-production-pass** (P1, added 2026-06-10) - defer to the HBH art-production pass. Agent-side inventory and concept batches are done (docs/ASSET_PRODUCTION-2026-06-11.md, GDD v0.98.2); the remainder is user-side Midjourney batches plus Erik modeling, gated on the external art pipeline.
- **handler-hbh-3d-migration-drift-2026-06-13** (P2, added 2026-06-13) - do this session. All three handler fixes are applied committed-ready to X:\HereBeHordes\CLAUDE.md (source/ subdir list, dropped stale colorblind_mode bullet, corrected audit-dual-path.ps1 note); only the `release.ps1` ship remains.

### Rising

- **br-asset-production-pass** (P2, added 2026-06-10) - defer to BR M1 completion. Self-blocked per its own spec until the M1 survival loop lands (the gating milestone at ~40%); same shape as the HBH asset pass once unblocked.
- **br-architecture-snapshot-refresh-2026-06-11** (P2, added 2026-06-11) - do this session. The BR git index is repaired (HEAD past v0.58.42, reads clean) and the ARCHITECTURE.md delta section is committed-ready; remaining is the attended body re-weave plus the 675KB GDD Architecture-tab refresh in a FUSE-safe atomic-write session.
- **br-v0581-changelog-reconcile-2026-06-14** (P2, added 2026-06-14) - do this session. The v0.58.0/v0.58.1 version-smear reconcile is complete in the tree (CHANGELOG collapsed to one v0.58.1 entry, GDD footer retitled, a tail truncation repaired) and committed-ready; ship doc-only via `release.ps1 -Bump none`.

### Chains

- **yac-mnew-tool-ref-repoint** (P3, added 2026-06-01) - do this session. Ground down to a confirm-and-retire of the dead manual scraper workflow (CONTEXT.md ~236, superseded by the ADR 0021 cron pipeline); needs Nick's "manual scraper session is retired" confirmation, then one focused FUSE-safe edit.
- **yac-mnew-roadmap-escalation-clarify** (P3, added 2026-06-01) - do this session. Reword staged: keep Supabase migrations escalate-to-Nick, change ROADMAP.md:134 to "AI may draft migration SQL, Nick reviews + approves before ship" so audits stop re-flagging the apparent contradiction; approving the wording closes it.
- **yac-brand-art-swap** (P2, added 2026-06-08) - defer to 1.0 launch. Replacing the placeholder OG/share card and mask-icon SVG with real brand art is genuine design work, not an agent edit; filenames are pinned so no code change blocks it. Park against the 1.0 PWA/share polish.
- **yac-css-deadcode-removal** (P2, added 2026-06-08) - do this session. Vetting is done (60 of 61 candidates safe, plus the 12 `styles-v*.css` files confirmed orphaned since the 0.51.3 consolidation); the live work is the orphan-file delete batch plus a runtime visual smoke and a PATCH release. Bounded.
- **yac-share-protocol-boot-route** (P2, added 2026-06-08) - do this session. Bare `?course=<slug>` boot launch is implemented to the tree and verified (esbuild/tsc clean); committed-ready. Ship as MINOR 0.52.0 via `release.ps1`, folding the changelog entry (with `yac-0513-changelog`) at release time.
- **yac-store-launch** (P1, added 2026-06-10) - defer to 1.0 launch. The PWA icon gap is closed committed-ready; the remainder is a wrapper decision (Capacitor vs TWA, per docs/APP-STORE-PATH.md), store accounts, signing, and real screenshots, all gated on Nick plus external accounts.
- **yac-subscriptions-enable-ai** (P1, added 2026-06-10) - defer to 1.0 launch. Billing code shipped and verified in 0.32.0; the remainder is entirely Nick-side per docs/stripe-setup.md (Stripe product, apply migration 0016, wrangler secrets, webhook, then flip CHAINS_VISIBLE).
- **yac-stale-stash-2026-06-11** (P2, added 2026-06-11) - do this session. Read-only review is complete and all three stashed files are confirmed superseded (wrangler at HEAD verbatim, non_us_slugs a subset of current, ingest_queue a drained snapshot); the only remaining action is one shell command, `git stash drop`.
- **yac-0513-changelog-2026-06-12** (P2, added 2026-06-12) - do this session. The 0.51.3 PATCH entry is authored to CONTEXT.md committed-ready (faf1223 PWA-icons + drift-fix, 9c78081 partial rename); ships in lockstep with `yac-share-protocol-boot-route` at the next YaC release.

### Scheduler

- **wts-2026-05-29-scheduler-stale-working-tree** (P2, added 2026-05-29) - do this session. Worst offender by age at 24 days. The original 75-file tree resolved into one committed-ready cohort (YaS rebrand plus two real test files, tails verified, three commits ahead of origin unpushed); only the Windows-side ship remains (clear `.git/index.lock`, bump version + CHANGELOG, run `release.ps1`).
- **scheduler-m71-resequence-0602** (P2, added 2026-06-02) - defer to M7.1 (v0.5.0). The X-Org-Slug doc-drift half is already committed-ready; the remainder (org-switcher widget + invite-admin UI + cross-org scope-leak suite) is a milestone scope call gated on Nick green-lighting M7.1 as the next version.
- **scheduler-real-use-testing** (P1, added 2026-06-10) - do this session. Route-level generate-to-publish E2E plus cross-org leak tests are written and tsc-clean; remainder is Nick-side (clear the lock, `pnpm --filter api test`, commit via `release.ps1`, then a human real-use pass).
- **scheduler-cron-preference-window-0613** (P2, added 2026-06-13) - do this session. Resolved committed-ready via doc-softening (DESIGN.md sec18 daily Cron Trigger marked planned-not-built, a FUSE truncation repaired in the same pass); ships with the other committed-ready Scheduler doc edits via `release.ps1`.
- **scheduler-design-changelog-drift-fix-2026-06-14** (P2, added 2026-06-14) - do this session. Closes the open Scheduler bar-raise MEDIUM committed-ready (DESIGN.md brand aligned to "Yes& Scheduler", CHANGELOG dates corrected, a tail truncation repaired); folds into the same `release.ps1` ship as the other committed-ready Scheduler edits.

### Apothecary

- **yaa-final-polish-close** (P3, added 2026-06-10) - defer to the open YaA design calls. Four slices left the tree committed-ready (CHANGELOG + release.ps1 truncations repaired, storage-error surfacing, em-dash sweep); the gate itself stays blocked on `apothecary-preset-custom-items` plus the filter-repo and print-fidelity decisions before a final `release.ps1`.
- **apothecary-preset-custom-items** (P2, added 2026-06-11) - do this session. Bounded technical decision: layout presets snapshot layout + sectionTitles only (editor.js:888), so recalling a preset can reference deleted custom-XXXX keys. Pick one of snapshot-and-restore customItems or filter-dangling-keys-on-load, then update PROJECT_SPEC s5/s8. Also unblocks `yaa-final-polish-close`.
- **yaa-commit-release-automsg-2026-06-12** (P2, added 2026-06-12) - do this session. Pending shell commit only: the release.ps1 auto-message change plus the drift-fixed README, storage-warning, and em-dash sweep are committed-ready in the tree (HEAD v0.18.4). Run `cd X:\YesAndApothecary; .\scripts\release.ps1`.

### Budget

- **yab-barraise-closeout-2026-06-06** (P1, added 2026-06-06) - do this session. Fifth-consecutive stalled-tree verdict; all agent-side file work is verified done (BOM strip, em-dash scrub, `.gitattributes`, `.gitignore`), leaving only Windows-side steps (clear `.git/index.lock`, delete the two stale `scripts/*.bak`, two scoped `release.ps1` commits).
- **yab-drain-audit-queue-2026-06-10** (P2, added 2026-06-10) - do this session. Quick root-cause check on the YaB canonical-audit-to-queue enqueue writer that regressed at the 06-08 sprint; the 06-19 audit did land `yab-loop-write-probe-untrack` in the queue, so the auto path looks recovered. Confirm the writer is healthy and close, or repair if it still drops findings.
- **yab-orphans-14-2026-06-10** (P3, added 2026-06-10) - defer to the next YaB maintenance pass. Fourteen orphaned web modules each need a per-module wire-or-drop judgment; real but unbounded for an unattended drain and low priority, so batch it into a focused cleanup session.
- **wts-2026-06-12-yab-stale-working-tree** (P2, added 2026-06-12) - do this session. Triaged as one coherent cohort (Yes& Budget rebrand + doc hygiene + release.ps1 -Message-optional), two FUSE truncations repaired, tails verified; committed-ready. Ship via `cd X:\YesAndBudget; .\scripts\release.ps1`, deleting the two stale `scripts\*.bak` first to also clear the bak residue.
- **yab-landing-page-rename-flip-2026-06-14** (P3, added 2026-06-14) - do this session. The 14 PascalCase "YesAndBudget" hits in docs/landing-page.html were grounded and the 11 display/prose ones flipped to "Yes& Budget" committed-ready, leaving the 3 X:\YesAndBudget path tokens as machine identifiers; ship doc-only via `release.ps1 -Bump none`, folding with the other committed-ready YaB doc edits.
- **yab-d013-rename-adr-2026-06-14** (P3, added 2026-06-14) - do this session. Promote the applied-but-unwritten rename rule ("brand string = Yes& Budget, machine identifiers = yesandbudget/@yab") as D-013 via adr-promoter so audits stop re-discovering the split; needs Nick's lock signal, then one append to DECISIONS.md.

### Everything

- **wts-2026-06-14-yae-apothecary-mirror-stale-tree** (P2, added 2026-06-14) - do this session. Diagnosis inverted the premise: there are no real uncommitted edits to ship, the working-tree apothecary/ copies are stale/FUSE-corrupted and behind HEAD. Correct fix is Windows-side (repair the YaE git index, then `git checkout -- apothecary/` to discard the stale copies); committing the tree would regress live, so do not.
- **handler-audit-skill-table-update-2026-06-14** (P3, cross-project, added 2026-06-14) - do this session. The handler-audit skill source in `_skill-review` was expanded to six handlers with correct paths committed-ready; the live skill cache is read-only, so the change needs a personal-skills repackage and reinstall via Cowork Settings > Capabilities to go live.
- **yae-status-json-fuse-nullpad-2026-06-14** (P2, added 2026-06-14) - do this session. The check-status-json.ps1 guard half is rewritten committed-ready (strip trailing NUL + atomic heal, unit-tested on 7 cases); ship via `release.ps1`, then close the cross-repo writer-half (each project's dashboard-JSON + bar-raise writers should write atomically so the pad stops upstream) as a follow-up.

### Auto-applied this pass

None. No qualifying item met the unambiguous-Drop bar this run: every aging non-auto-safe item is either a committed-ready ship awaiting an attended `release.ps1`, a decision-gated completion gate or scope call, or a bounded cleanup, all of which need Nick's hand on the wheel and stay in the queue. The one previous Drop (`handler-dns-registrar-pasttense-2026-06-13`) was already removed on the 2026-06-21 pass.
