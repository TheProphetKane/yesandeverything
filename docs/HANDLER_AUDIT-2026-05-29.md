# Handler audit 2026-05-29

## TL;DR

Three of the six requested handlers were audited (YaC, Scheduler, YaE). The other three (HTBH, YaApothecary, YaBudget) live outside the connected-folder set and could not be inspected this run. Of the three audited, **Scheduler** has the highest drift: the entire "Build order — do this milestone-by-milestone" section is now obsolete (M1-M6 all shipped in v0.1.0; current version 0.3.0). **YaE** carries an HBH-path inconsistency across three call sites (`X:\HereBeHordes` vs. user-preferences/task-runner `X:\HereThereBeHordes`). Both YaC and YaE still carry the 2026-05-06 DNS-transfer time-bound note that has aged ~23 days past its 5-7 day window.

## HIGH severity

1. **Scheduler `CLAUDE.md` lines 12-23 ("Build order — do this milestone-by-milestone").** Frames v1 as in-progress milestones to work through one at a time. `docs/DESIGN.md §21` (line 517) now reads "v0.1.0 shipped 2026-05-10 with all six complete. v0.2.0 followed on 2026-05-18 as a major tenancy expansion." `package.json` is at 0.3.0; CHANGELOG.md shows v0.1.0 / v0.2.0 / v0.3.0. The handler still tells a fresh session "Do them one at a time, in order. Don't get ahead." A new session reading the handler would write v1 code into a post-v1 polish repo. Recommended fix: replace the M1-M6 prose block with a one-paragraph "v1 shipped 2026-05-10; current work is post-v1 polish + tenancy follow-ups (see DESIGN.md §22 and CHANGELOG.md top entry for what's open)" pointer. Not a safe auto-fix; queueing as a structural item.

2. **YaE `CLAUDE.md` references `X:\HereBeHordes` three times (lines 49, 65, 88).** The scheduled-task input and the active user_preferences for HBH both spell the folder `X:\HereThereBeHordes`. `CLAUDE_SETTINGS.md` line 14 and `PERSONAL_CLAUDE_ARCHITECTURE.md` line 24 also use `HereBeHordes`, so YaE's three siblings agree with each other but disagree with the operational context. Cannot resolve from inside YaE alone; the folder is not in the connected set. Recommended action: confirm the actual folder name on disk, then propagate the correct path to YaE `CLAUDE.md`, `CLAUDE_SETTINGS.md`, and `PERSONAL_CLAUDE_ARCHITECTURE.md` in one pass. Not a safe auto-fix; flagging for user decision.

## MEDIUM

3. **YaC `CLAUDE.md` line 56 + YaE `CLAUDE.md` line 66 — DNS Squarespace transfer claim.** Both say "registrar transfer from Squarespace pending 5-7 days from 2026-05-06". Today is 2026-05-29; the window closed ~2026-05-13. The note is now time-stale even if no one has confirmed completion. Replace with current state ("DNS on Cloudflare since 2026-05-06; registrar transfer expected complete by mid-May 2026 — confirm at Cloudflare dashboard") or strip the time-bound phrasing entirely. Queueing as a safe text fix.

4. **YaE `CLAUDE.md` "Files at a glance" omits several real top-level entries.** Actual root carries `IMPLEMENTATION_GUIDE.md`, `brackish-rising/`, `budget/`, `invoices/`, `terms/`, `scripts/`, `digest-2026-05-15.md`, and three `.work-queue.json.bak*` / `.recon` siblings. The handler table is incomplete. Not strictly wrong on what it lists, but a new session won't know `brackish-rising/` and `budget/` exist as sub-mirrors. Recommend a table refresh.

## LOW

5. **YaC `CLAUDE.md` line 17 — ADR count.** Says "15+ entries". Actual: 21 (`0001-0021`). Still technically correct ("15+") but understated. Queueable as a minor update to "20+".

6. **YaC `CLAUDE.md` line 47 — BACKLOG §34 status.** Says "Implementation lives in BACKLOG §34 for 0.27.0". Section is now marked `✅ DONE (0.27.0)` in BACKLOG. Phrasing reads as future-tense for shipped work. Soften to past tense.

## What's healthy

- All three audited handlers correctly point at canonical docs that exist (`PROJECT_SPEC.md`, `CONTEXT.md`, `ROADMAP.md`, `BACKLOG.md`, `DECISIONS_NEEDED.md`, `docs/launch-checklist-1.0.md`, `docs/DESIGN.md`, `docs/MILESTONE-PROMPTS.md`, `docs/BACKEND-SETUP.md`, `index.html`, `hordes/index.html`, `apothecary/`, `CLAUDE_SETTINGS.md`, `PERSONAL_CLAUDE_ARCHITECTURE.md`, `status/`).
- YaC `tools/preship.sh` exists and matches the release-pipeline description.
- Scheduler `scripts/release.ps1`, `push-to-github.ps1`, `deploy-worker.ps1`, `discord-notify.ps1` all exist and match the described flow. Migration count (`0001`-`0008`) matches D1 convention.
- YaE `hordes/index.html` injection rule is internally consistent with the YaC + memory descriptions of the publish flow. No "copy gdd.html" drift.
- YaC `auth@yesandeverything.com` sender claim is consistent with the "kane@" feedback-inbox claim (no reversion to `chains@`).
- CNAME contains `yesandeverything.com` exactly. robots.txt disallows `/hordes/` as claimed.
- YaC ROADMAP refresh-date note ("Refreshed 2026-05-04") matches the live file's header text.

## Recommended actions

1. (HIGH, Scheduler) Rewrite the "Build order" section to reflect v1-shipped state. User decision; not auto-fixed.
2. (HIGH, YaE × 3 sites) Reconcile `X:\HereBeHordes` vs. `X:\HereThereBeHordes` across YaE `CLAUDE.md`, `CLAUDE_SETTINGS.md`, `PERSONAL_CLAUDE_ARCHITECTURE.md`. User decision; not auto-fixed.
3. (MEDIUM, YaC + YaE) Update DNS Squarespace time-bound note. Queued.
4. (MEDIUM, YaE) Expand "Files at a glance" table to include `brackish-rising/`, `budget/`, `invoices/`, `terms/`, `scripts/`, `IMPLEMENTATION_GUIDE.md`. Queued.
5. (LOW, YaC) Bump ADR count "15+" → "20+". Queued.
6. (LOW, YaC) Past-tense BACKLOG §34 phrasing. Queued.

## Scope note

HTBH, YaApothecary, YaBudget handlers were not audited — those folders are outside the connected-folder set for this session (only `X:\YesAndEverything`, `X:\YesAndChains`, `X:\Scheduler` are mounted). Re-run with those folders connected to complete the six-handler sweep.
