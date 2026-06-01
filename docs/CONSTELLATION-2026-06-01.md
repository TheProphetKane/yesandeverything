# CONSTELLATION-2026-06-01

Portfolio verdict: stalled
Projects: BR, HBH, YaC, Scheduler, YaA, YaB
Summary: Three projects are stalled (HBH, Scheduler, YaA) and three are at-risk (BR, YaC, YaB); zero are healthy. The products themselves are mostly fine. The per-project top findings repeat the same phrase: "code is healthy, process-stalled not product-dead." What has seized is the automation harness around the portfolio. Audits and bar-raises generate reports every morning, but nothing lands: the installed personal-skills plugin lacks the enqueue phases, HBH is not mounted into the audit session, the YaE git-index is corrupt, and the four-hourly drain is forbidden from shell and release ops. So six repos accumulate untracked report files that a single git checkout would erase. The fix is not more analysis. It is putting an executor back in the loop.

## Per-project verdicts

| Project | Verdict | Top finding |
|---|---|---|
| BR | at-risk | Two standing HIGHs persist into a sixth cycle: Lantern Oil starvation fail-path is dead (command_post.gd:284/299 emit to zero listeners) and the banned AI-tool name is live in three public artifacts (GDD.html:2637, CHANGELOG.md:554/617). v0.39.0 batch staged but uncommitted again. |
| HBH | stalled | Second consecutive stalled cycle, zero commits since 2026-05-29. fog_of_war.gd:483/487-494 and save_load.gd:347/502 still reference pre-rename filenames, so every tower/house ships the wrong fog radius and renamed buildings drop on load. |
| YaC | at-risk | Six-day stall broke (HEAD at v0.34.1, truncation window closed, Decision-29 renumber landed), but write-dashboard-status.ps1 is still not merge-aware so the 05-31 release nulled live YaC.json, and the pin-completeness launch gate is still unwired. |
| Scheduler | stalled | Sixth consecutive identical action list. Discord webhook still git-tracked, write-dashboard-status.ps1:82-86 hardcodes M2, DESIGN.md drift unfixed. The daily bar-raise itself is now a cost re-printing a list no one lands. |
| YaA | stalled | Sixth consecutive cycle, repo cold since 2026-05-29. Label engine is healthy; the loop is what is stuck. Six untracked review reports plus em-dash voice slips across six public files. A human must drain it once and fix the handoff. |
| YaB | at-risk | Code and docs aligned for a second audit, but the uncommitted F1-F11 batch plus seven untracked reports grade P0, and seven of the eight skills CLAUDE.md names are not installed, so the audit re-proves the same state with no executor to land it. |

## Top portfolio actions

1. [cross-cutting / HIGH] (orchestration) Reinstall the personal-skills plugin so the installed copies regain project-canonical-audit Phase 8 and handler-audit Phase 6. This is the root cause of the broken self-correction across all six projects: audit footers never enqueue, so the queue starves and reports pile up. Diagnosed in docs/QUEUE_PIPELINE_DIAGNOSIS-2026-05-30.md; needs Nick.
2. [cross-cutting / HIGH] (release-pipeline) Make write-dashboard-status.ps1 merge-aware so a release stops clobbering the barRaise block and pinning audit findings to 0/0/0. Same bug shipped in YaC, Scheduler, and YaA; fix once and propagate.
3. [cross-cutting / HIGH] (maintainability) Drain the four uncommitted working trees before a git checkout erases them: BR v0.39.0, YaB F1-F11 plus seven reports, Scheduler dirty tree, YaA six reports. Ship each through its release.ps1.
4. [HIGH] (dependency) Mount HBH into the audit/drain session or set up a sidecar source pull. Noticed four times; it blocks every stalled HBH queue item and both correctness HIGHs below.
5. [P0 / HIGH] (security) Scheduler scripts/.discord_webhook.txt is git-tracked with a live webhook URL. gitignore it, git rm --cached, commit, and rotate the webhook on Discord (the leaked URL is permanent in history).
6. [HIGH] (data-integrity) HBH fog_of_war.gd:483/487-494 and save_load.gd:347/502 reference deleted pre-rename filenames: wrong fog radius on every armed tower and housing tier, and renamed buildings silently dropped on load. No save_version field exists. Ship with the HBH mount.
7. [HIGH] (public-voice) BR banned AI-tool name live in GDD.html:2637 and CHANGELOG.md:554/617, plus the dead Lantern Oil starvation fail-path. Both fit inside the prepared v0.39.0 push.
8. [HIGH] (public-voice) YaE index.html:1490 still pitches HBH as an "industrial nightmare in oil paint" with Mines/lumberyards/farms, contradicting the far-colony canonical; landing-card version pills are stale on five of six cards.
9. [P0 / HIGH] (data-integrity) YaE git-index corruption is one of the two root causes of three consecutive null queue drains. Rebuild the index so the drain can run.
10. [MEDIUM] (cost-economics) The daily bar-raise on stalled repos (Scheduler, YaA) now spends Opus budget re-printing identical lists nothing consumes. Gate the daily run on "HEAD moved since last review" or pause it until the tree moves.

## Cross-cutting patterns

- (orchestration) The self-correcting loop has no executor. Audits and bar-raises run daily and produce findings, but the installed skills lack the enqueue phases, HBH is not mounted, the drain is forbidden from shell/release ops, and the YaE git-index is corrupt. Net effect: six repos accumulate untracked report files and zero fixes land. This is the portfolio's defining problem this week and the source of the stalled verdict.
- (release-pipeline) write-dashboard-status.ps1 is not merge-aware in three projects (YaC, Scheduler, YaA). Every release erases the barRaise block it was supposed to publish, so the dashboard reports null for projects that were actually reviewed. One shared fix.
- (maintainability) Uncommitted-tree pile-up in four projects (BR, YaB, Scheduler, YaA). The FUSE-truncation window is being held open for days, and the report pile grows one file each morning. Each tree is one git checkout from losing multiple audits of work.
- (cost-economics) Daily bar-raise on a stalled repo is net-negative: it re-prints the same action list with no executor to land it, burning token budget while signalling false activity on the dashboard.

## What got better since last constellation

- First constellation bar-raise; no prior CONSTELLATION report to delta against. Per-project deltas below are pulled from each project's own prior daily bar-raise.
- YaC broke a six-day stall: HEAD moved to v0.34.1, the truncation window closed, the Decision-27 slot collision was renumbered to 29, and the 0.34.2 code audit auto-applied real worker fixes (3 actions closed).
- BR closed 2 actions across its design cadence (v0.37-v0.39 resolved real doc drift and shipped Gold Deposits).

## What got worse since last constellation

- YaB regressed from needs-attention to at-risk: today's canonical audit grades the uncommitted F1-F11 state P0, escalating the maintainability finding to HIGH, and the skills-not-installed HIGH still stands.
- The untracked-report pile is now compounding across four repos (YaA, YaB, Scheduler, HBH), one file per morning, with no drain pass landing anything.
- The cross-project queue has logged three consecutive null drains (2026-05-31 01:07, 13:10, 21:08), the longest dry stretch on record. Root causes named in the drain log: unmounted repos plus the YaE git-index corruption.

## Notes

- Both standing root causes (plugin reinstall, HBH mount) require Nick; neither is auto-safe. Until one of them ships, the daily loop cannot self-correct and the next constellation will read the same.
- The scheduled bar-raise-constellation run started at 2026-06-01T07:00 but did not complete (the log holds only the START and ClaudeBin lines, and no CONSTELLATION-2026-06-01.md was produced). This report was generated by a manual constellation invocation. Worth checking why the scheduled run aborted before publish.
