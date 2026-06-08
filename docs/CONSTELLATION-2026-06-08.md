# CONSTELLATION-2026-06-08

Portfolio verdict: at-risk
Projects: BR, HBH, YaC, Scheduler, YaA, YaB
Summary: The portfolio lifted off last week's stalled verdict to at-risk. Three repos (HBH, Scheduler, YaC) shipped releases, the portfolio-wide git lock that froze every write last week cleared for most of the portfolio, and no project is stalled this week. But three projects sit at-risk (YaC, YaA, YaB) and the defining problem moved into the release pipeline itself. The write-dashboard-status.ps1 clobber that nulls the dashboard barRaise block went from latent to live: YaC (0.49.0/0.50.0) and Scheduler (0.4.1) both nulled their own dashboard data on release this week, and the same one fix is owed in four projects. Scheduler's first release in thirteen cycles shipped three known defects at once (a leaked webhook used twice, a raw em-dash to the public Discord, and a deploy-breaking TypeScript error) because no release.ps1 carries a preship gate. The worst single exposure is YaB: a ten-day-cold tree now holds un-recreatable backend source, one FUSE clobber from losing an unreleased MINOR.

## Per-project verdicts

| Project | Verdict | Top finding |
|---|---|---|
| BR | needs-attention | Second quiet cycle: HEAD still f9d690d (v0.57.5, 06-06), all six 06-07 actions open. Tooling churn correctly stopped, but the M1 slice is unbuilt, the audio set is still zero files against the v0.4.0 mute-MVP lock, and five scripts/*.bak files committed in v0.57.4 are still tracked with no *.bak gitignore rule. |
| HBH | needs-attention | Strong build cycle (3D-migration stage-1 landed, v0.97.1-0.97.3) but write-dashboard-status.ps1:99-106 still hardcodes barRaise=null so every report is invisible to the dashboard (fourth cycle as top action), the GDD now self-contradicts on the 2D-vs-3D render spec, and save_version is still absent while the menu Continue loads world3d_save.json directly. |
| YaC | at-risk | Thirteenth review; the writer HIGH is dropping data live (0.49.0/0.50.0 shipped, live barRaise null again). Two more mobile sweeps, two more stylesheets (cascade now twelve layers), a sixth mobile-hooks module, while three AI-autonomous HIGHs sit untouched. One good delta: a fresh 06-08 audit ran and ROADMAP + launch-checklist anchors bumped to 0.50.0. |
| Scheduler | needs-attention | v0.4.0/0.4.1 broke the 13-cycle uncommitted blocker but shipped carrying every known defect: nulled the live barRaise block, posted a raw em-dash to the public channel (broken sanitizer), released twice on the still-tracked leaked webhook, and shipped a TypeScript error that broke the SPA deploy (no preship build gate). |
| YaA | at-risk | One quiet day from stalled. Nothing since v0.16.0 (06-06); both HIGHs untouched; write-dashboard-status.ps1 still hardcodes barRaise/audit/queue to null. Tree went dirty again (aliases.json plus the 06-07 report uncommitted). 17 pending yaa queue items, oldest 21 days. Label engine healthy; the whole risk surface is the writeback, queue, and docs perimeter. |
| YaB | at-risk | HEAD still e6cac08 (05-29), ten days cold. The uncommitted tree now holds un-recreatable backend source (ten /api/insights/* endpoints plus insights.ts, server.ts 63->73 routes), not just regenerable reports, so one stray FUSE clobber destroys an unreleased MINOR. DESIGN section 12 documents none of the ten endpoints. The loop has diagnosed its own non-commit for nine straight audits and acted zero times. |

## Top portfolio actions

1. [cross-cutting / HIGH] (release-pipeline) Make write-dashboard-status.ps1 read-modify-write in all four projects that ship it (HBH, YaC, Scheduler, YaA): parse the existing JSON, preserve the barRaise block and audit.findings, mutate only release-owned fields. The bug is now firing live, not latent: YaC (0.49.0/0.50.0) and Scheduler (0.4.1) nulled their own dashboard data on release this week. Land the queued YaC fix (yac-barraise-writer-rmw) and propagate the same diff to the other three.
2. [cross-cutting / HIGH] (release-pipeline) Add a preship gate to every release.ps1: build/typecheck must pass and the version markers must agree before push. Scheduler v0.4.0 shipped a TypeScript error that broke the SPA deploy because there is no build gate; BR's release stamps the GDD pill but not project.godot, so the engine marker drifts a MINOR every release. One shared guard pattern.
3. [P0 / HIGH] (security) Scheduler scripts/.discord_webhook.txt is git-tracked with a live webhook URL and was used by two real releases (0.4.0, 0.4.1) this week while exposed. gitignore it, git rm --cached, commit, and rotate the webhook on Discord. Tenth day live; needs Nick.
4. [HIGH] (maintainability) Commit YaB before a FUSE clobber destroys it: the 10-day-cold tree now carries un-recreatable backend source (ten insights endpoints plus insights.ts), past the point where it was only regenerable reports. The index lock is cleared per the 06-07 audit. Decide wire-or-drop on the six orphaned polish files and reconcile the fictional v0.11.0 POLISH_LOG claim first, then ship via release.ps1.
5. [HIGH] (data-integrity) HBH: add save_version to world3d_save.json plus a load guard; the menu Continue loads the save directly with no version field, so the 2D-to-3D migration can silently load an incompatible save. Bundle with the GDD render-spec reconciliation (the GDD body still names 2D as the spec while the boot flow is 3D-only).
6. [HIGH] (strategic) BR and YaA are both one quiet cycle from stalled with the next move being product, not pipeline. BR needs the M1 slice or a named audio source against the v0.4.0 mute-MVP lock; YaA needs anything shipped and the dirty tree committed. Pick one slice each.
7. [MEDIUM] (architecture) YaC: the two numbered-file accretion patterns (styles-v2 through styles-v13, mobile-hooks through mobile-hooks-6) each grow one file per release; the cascade is now twelve parallel stylesheets. Consolidate before 1.0 or the launch cascade is unmaintainable.
8. [HIGH] (orchestration) Route the standing AI-autonomous structural HIGHs to an attended drain: YaC's three (writer RMW, missing Decision 30 body, absent N7 basket-coordinate gate) have sat thirteen reviews; YaA's two many. The autonomous drain cannot land non-mechanical fixes, so the bar-raise is re-finding, not closing.
9. [HIGH] (maintainability) Clear the committed *.bak files portfolio-wide and add a *.bak gitignore rule: BR carries five scripts/*.bak from v0.57.4, YaB's close-out flags the same pattern. Build-hygiene drift that ossifies if left.
10. [MEDIUM] (cost-economics) The daily bar-raise still runs on cold repos (YaB ten days, YaA and BR two days) re-printing near-identical lists. Gate the daily run on "HEAD moved or tree changed since last review" to stop spending Opus budget on no-delta reprints.

## Cross-cutting patterns

- (release-pipeline) The dashboard-writer clobber went from latent to live. Last week it was a risk in three projects; this week three projects shipped and actively nulled their own barRaise blocks. The same one fix (read-modify-write the writer) is owed across HBH, YaC, Scheduler, YaA. This is the portfolio's defining problem this week and a direct cause of the at-risk verdict.
- (release-pipeline) "Ship the whole defect pile at once." When a long-stalled repo finally releases, it ships every accumulated defect because no release.ps1 has a preship gate. Scheduler's first release in thirteen cycles carried the leaked webhook, the broken em-dash sanitizer, and a deploy-breaking TypeScript error in one push.
- (maintainability) The uncommitted-tree pile crossed from regenerable to un-recreatable. YaB now holds unreleased backend feature source in a ten-day-cold tree; the FUSE-clobber blast radius graduated from "lose audit reports" to "lose a MINOR of code." YaA's tree went dirty again the same way.
- (orchestration) The autonomous loop re-finds the same structural HIGHs it cannot land. Thirteen cycles on the YaC writer, nine on YaB non-commit. The drain is structurally unable to land non-mechanical fixes or anything in an unmounted repo, so the highest-value findings never close without an attended pass.

## What got better since last constellation

- Portfolio lifted off stalled: last week was 3 stalled / 3 at-risk / 0 healthy; this week is 0 stalled / 3 at-risk / 3 needs-attention. The portfolio-wide git lock that froze every write cleared for most repos, and the YaE corrupt-index P0 that blocked the constellation push itself is resolved (git status, log, and staging all work this run).
- HBH stalled -> needs-attention: 2D-to-3D migration stage-1 landed and committed (v0.97.1-0.97.3), boot flow now 3D-only, first commits since 05-29.
- Scheduler stalled -> needs-attention: shipped v0.4.0/0.4.1, breaking the thirteen-cycle uncommitted-release blocker.
- BR at-risk -> needs-attention: the tooling churn stopped as advised in the prior review.
- YaC canonical layer caught up: a fresh 06-08 audit ran and the ROADMAP plus launch-checklist anchors bumped from 0.42.2 to 0.50.0.

## What got worse since last constellation

- The dashboard-writer clobber is now firing live in production: YaC (0.49.0/0.50.0) and Scheduler (0.4.1) nulled their own live barRaise blocks on release this week, where last week it was only a latent risk.
- Scheduler's release shipped three known defects at once: the leaked webhook used twice, a raw em-dash to the public Discord, and a deploy-breaking TypeScript error.
- YaB's uncommitted blast radius escalated: the cold tree now carries un-recreatable backend source, not just regenerable reports, and DESIGN fell behind the code for the first time in the streak.
- YaA's tree went dirty again (aliases.json plus the 06-07 report), the same uncommitted-pile pattern that caused its earlier stall.

## Notes

- Per-project synthesis (Step 5) was already produced by today's scheduled per-project bar-raises: all six projects carry a 2026-06-08 BAR_RAISE report and a fresh barRaise JSON block. This constellation consumes those rather than regenerating them, since four of the six source repos (BR, HBH, YaA, YaB) are not mounted in this session and re-running would duplicate today's work. No per-project report was rewritten this run.
- The queue is not stalled by the 14-day rule: real drains landed inside the window (yac-mnew-tool-ref-repoint 06-07, yaa-aliases 06-07, htbh-d02 archived 06-07). But the four standing P0s (Scheduler webhook, portfolio-lock remnants, YaB commit, and the decision items) are all Nick-action-blocked, so the highest-priority items never move autonomously.
- Total open actions across the six boards: 50 (BR 6, HBH 7, YaC 9, Scheduler 6, YaA 12, YaB 10).
