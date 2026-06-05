# Handler audit 2026-06-05

## TL;DR

Three of the six target handlers (HTBH, YaApothecary, YaB) were not mounted in this session and could not be audited. The three that were reachable (YaC, Scheduler, YaE) are mostly healthy: every claimed file path resolves, the hordes injection contract is intact, and no stale sender email survives in YaC. Two MEDIUM drifts: the Scheduler handler still teaches a pre-v1 milestone-by-milestone build order that the project has already moved past, and the time-bound DNS "registrar transfer initiated" note in YaC + YaE is now a month stale.

## Scope limitation (run-environment, not handler drift)

Only `Scheduler`, `YesAndChains`, and `YesAndEverything` were mounted. `X:\HereThereBeHordes`, `X:\YesAndApothecary`, and `X:\YesAndBudget` were not reachable, so their CLAUDE.md files were not verified. A follow-up run with all six folders connected is needed to close the cross-handler `hordes/` injection check (HTBH side) and to audit the Apothecary and Budget handlers at all.

## HIGH severity

None among the three accessible handlers.

## MEDIUM (handler is out of date)

1. **Scheduler — build-order section is pre-v1, project is post-v1.** Lines 12-23 teach "do the six v1 milestones one at a time, in order, don't get ahead." Git history shows v0.1.0 shipped as "feature-complete employee scheduling app," v0.2.0 added multi-tenant orgs, v0.3.0 added admin-configurable shift options plus a visual-polish pass. The app is past the milestone-gated foundation and into feature/polish iteration. A new session reading this handler is told to build M1 first when M1-M6 are effectively done. Recommend reframing the build-order section to "v1 feature-complete as of v0.1.0; current work is feature + polish iteration, semver per change" and keeping the milestone list as historical context only.

2. **YaC + YaE — DNS transfer note is time-stale.** Both handlers state the Squarespace→Cloudflare registrar transfer was "initiated on 2026-05-06" and tell the reader to "verify completion at the Cloudflare dashboard." That was ~30 days ago; a 5-7 day transfer window is long closed. The claim is stale by time even though nobody edited it. Recommend confirming the transfer completed and rewriting both lines to past tense ("DNS and registrar on Cloudflare since May 2026") to drop the open-ended "verify completion" framing. Not auto-fixed because completion can't be confirmed from inside the repo.

## LOW (cosmetic)

- **YaC — tombstone reference points at a file that no longer exists.** The handler says `NEXT_SESSION_QUEUE.md` "is tombstoned — it just redirects to docs/launch-checklist-1.0.md." The file is gone entirely (not a redirect stub). Harmless, but the handler implies a stub that isn't there. Either restore the one-line redirect stub or change the wording to "removed."
- **YaC — ADR count phrasing.** Handler says "20+ entries"; actual `docs/adr/` holds 22. Within tolerance, no change needed.

## What's healthy

- YaC: all 10 canonical-layer files present (PROJECT_SPEC, CONTEXT, ROADMAP, BACKLOG, DECISIONS_NEEDED, launch-checklist-1.0, HOW_TO_ADMIN, both PLASTICS files, docs/adr/).
- YaC: `tools/` holds exactly the six scripts the handler lists; no orphan drift.
- YaC: no stale `chains@yesandeverything.com` feedback address; sender is `auth@yesandeverything.com` as claimed. Email-drift exemplar is clean.
- YaC: version is not pinned in the handler by design (defers to CONTEXT.md, currently 0.43.0), so no version-pill drift is possible.
- Scheduler: every claimed file and dir resolves (DESIGN, MILESTONE-PROMPTS, BACKEND-SETUP, apps/web, apps/api, packages/shared, migrations, all four release scripts, CHANGELOG). No shadcn/Material/Chakra in web deps, matching the "no third-party UI kits" convention.
- YaE: all 24 claimed paths resolve, including the `projects/here-there-be-hordes/gdd.html` redirect stub, `brackish-rising/`, `apothecary/`, `budget/`, `terms/`, and `digest-2026-05-15.md`.
- YaE: `hordes/index.html` injection contract intact (`var ENCODED` present, no `gdd.html` copy). CNAME reads exactly `yesandeverything.com`.
- Cross-handler: YaC and YaE agree on the `auth@yesandeverything.com` sender and on the DNS state (both stale in the same way, so consistent).

## Recommended actions

1. (MEDIUM) Reframe Scheduler CLAUDE.md build-order section to post-v1 reality. Requires a convention rewrite, so confirm before editing.
2. (MEDIUM) Confirm the Cloudflare registrar transfer completed, then update the DNS lines in both YaC (line 77) and YaE (line 75) to past tense.
3. (LOW) Fix the YaC `NEXT_SESSION_QUEUE.md` tombstone wording (or restore the stub).
4. (OPS) Re-run this audit with HTBH, YaApothecary, and YaB mounted to cover the three unverified handlers and complete the `hordes/` cross-handler check.

## Queue note

No clean auto-safe fixes (stale email / stale path / stale version) were found in the accessible handlers, so nothing was added to `.work-queue.json`. The two MEDIUM items both need a human decision (convention rewrite; external transfer-status confirmation) and the queue file is at 52KB, over the FUSE-truncation threshold noted in memory, so no append was made this run.
