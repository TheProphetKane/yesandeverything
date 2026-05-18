# How to actually use all this

> Personal Claude implementation guide written 2026-05-15. Pairs with `CLAUDE_SETTINGS.md` (the rules) and `PERSONAL_CLAUDE_ARCHITECTURE.md` (the why). This doc is the how-to.

## The 5-minute setup

If you only do five minutes of setup, do these.

1. **Paste `CLAUDE_SETTINGS.md` into Claude's custom-instructions.** Plain text, no formatting. Use as much as the boxes accept. This sets tone, voice, and pushback expectations for every conversation.

2. **Install the four highest-leverage skills.** Drag these `.skill` files from `X:\YesAndEverything\_skill-review\` into Cowork (or your Claude.ai plugins panel):

   - `htbh-changelog-entry.skill` — fires on every HTBH commit
   - `project-canonical-audit.skill` — the audit pattern
   - `work-queue-runner.skill` — the continuous-work mechanism
   - `git-unstick.skill` — when git misbehaves on the FUSE mount

   The other 10 are useful but optional. Add them when you hit the workflow they cover.

3. **Verify the scheduled tasks ran.** Tomorrow morning (or after your next Cowork open), check `X:\HereThereBeHordes\docs\` for a fresh `CANONICAL_AUDIT-YYYY-MM-DD.md`. If it's there, the loop is alive.

That's the floor. Everything below is the full picture.

## What you do nothing for (automatic)

These run themselves. You don't need to invoke anything.

- **Daily HTBH canonical audit.** 06:01 local. Writes to `X:\HereThereBeHordes\docs\CANONICAL_AUDIT-YYYY-MM-DD.md`. Queues auto-safe drift fixes.
- **Twice-weekly YaC audit.** Mon + Thu 06:07. Writes to `X:\YesAndChains\docs\CANONICAL_AUDIT-YYYY-MM-DD.md`.
- **Weekly Scheduler audit.** Tue 06:06.
- **Weekly YaE audit.** Sun 06:06.
- **Weekly handler-drift audit.** Fri 07:01. Checks every project's `CLAUDE.md` against current state.
- **Weekly cross-project digest.** Mon 08:07. Rolls up everything.
- **Queue drain.** 08, 12, 16, 20 every day. Processes auto-safe items, surfaces structural ones for review.

All seven tasks live on Cowork's Scheduled sidebar. They only fire while Cowork is open; if the app is closed at the scheduled time they run on next launch.

## What you do by phrase (skills auto-trigger)

These trigger from natural phrasings you'd use anyway. The skill description grabs the intent and runs.

| What you say | What fires |
|---|---|
| `ship v0.37.9`, `bump GDD`, `log this`, `cut a version`, `PATCH bump for X` (any HTBH context) | `htbh-changelog-entry` |
| `release this`, `ship YaC`, `cut a version` (in non-HTBH context) | `version-bump-and-publish` |
| `audit my repo`, `is the GDD still accurate`, `do the docs match the code` | `project-canonical-audit` (chains into `backlog-hygiene`) |
| `apply the fixes`, `do the safe drift fixes`, `close the audit loop` | `drift-auto-fix` (chains into `work-queue-runner`) |
| `what's the state of the projects`, `weekly digest`, `cross-project status` | `cross-project-status-digest` (chains into `work-queue-runner`) |
| `process the queue`, `what's next`, `drain the queue` | `work-queue-runner` |
| `git is stuck`, `index.lock`, `non-FF rebase` | `git-unstick` |
| `set up a new project`, `scaffold for X`, `start a new project` | `canonical-doc-handler-init` |
| `voice audit`, `check for em dashes`, `pre-commit voice scan` | `solo-dev-voice-audit` |
| `mark this done in the backlog`, `clean up the backlog` | `backlog-hygiene` |
| `lock this decision`, `promote to ADR`, `write up the decision` | `adr-promoter` |
| `tick the loop`, `keep working`, `run the loop` | `self-reprompt-loop` |
| `new milestone for X`, `scaffold the next milestone prompt` | `milestone-prompt-scaffold` |
| `handler audit`, `check CLAUDE.md drift` | `handler-audit` |

You don't have to memorize these. The triggers are designed to catch what you'd already say.

## What you do explicitly (the day-to-day)

The everyday loop is simpler than it sounds.

**Working on HTBH.** Open Cowork in `X:\HereThereBeHordes`. The handler `CLAUDE.md` auto-loads. Code, talk, code. When the work is done say `bump GDD` or `log this` and the version pill + changelog entry happens. If you want to actually push to GitHub, add `ship it` or `release`.

**Working on YaC.** Open Cowork in `X:\YesAndChains`. The handler `CLAUDE.md` auto-loads, including the index of which canonical doc owns what. When you ship, say `release` and `version-bump-and-publish` handles the project's `release.ps1` flow.

**Working on Scheduler or YaE.** Same pattern. Open Cowork in the folder, handler loads, work, release.

**Cross-project work.** Open Cowork wherever, but when you ask about state across projects (`what's happening across the projects`, `what should I focus on`) the cross-project skills fire.

**Starting a new project.** Say `set up a new project called X`. The `canonical-doc-handler-init` skill scaffolds `CLAUDE.md`, the canonical doc, and `README.md` in one shot.

## What you do periodically (audit follow-through)

The audits run themselves but the structural findings need your eyes.

**Once a day or so.** Open the cross-project-status artifact. It shows the queue, the cadence, the latest audit findings. Scan for HIGH severity items. Most should be auto-safe and already drained. Look at the structural ones.

**When a structural item lands in the queue.** It looks like `htbh-roadmap-restatus-001`. Read the prompt. Either say `apply it` (which runs drift-auto-fix and structural fixes in one pass), say `defer this` (mark status `deferred` in the queue file), or say `hand me a recommendation` (Claude proposes the change before applying).

**Weekly.** The Monday digest lands in `outputs\digest-YYYY-MM-DD.md`. Skim it. The top of the file lists anything slipping.

## What you do once (setup checklist)

- [ ] Paste `CLAUDE_SETTINGS.md` into Claude.ai custom-instructions or Cowork user-level slot
- [ ] Install at least the 4 high-leverage `.skill` files
- [ ] Open Cowork in `X:\HereThereBeHordes` once to verify `CLAUDE.md` auto-loads
- [ ] On the Cowork Scheduled sidebar, click `Run now` on each task once to pre-approve the tools each task uses (Read, Write, Edit, Bash). Subsequent runs won't pause for permission prompts.
- [ ] Verify tomorrow morning that `audit-htbh-daily` produced `X:\HereThereBeHordes\docs\CANONICAL_AUDIT-YYYY-MM-DD.md`. If not, the scheduled-tasks subsystem isn't firing — check the Scheduled sidebar for errors.
- [ ] Optional: install the remaining 10 skills as you hit workflows that need them

## How to know the loop is working

Three signals.

1. **A `CANONICAL_AUDIT-YYYY-MM-DD.md` file lands in each project's `docs/` on the audit cadence.** If you don't see one for HTBH within 24 hours, the scheduled task isn't firing.

2. **`X:\YesAndEverything\.work-queue.json` gains items and then drains them.** Read the file or open the artifact. After a morning audit, expect 2-8 new items. By the next day, the auto-safe ones should be done.

3. **GDD changelog entries from `htbh-changelog-entry` show up on commits where you said `bump`.** If you say `bump GDD` and the entry doesn't land at the top of the changelog footer, the skill isn't installed or isn't triggering. Check the skill is enabled in your Cowork plugins panel.

If all three are happening, the loop is alive and you can mostly forget about it.

## How to stop or pause

- **Disable a scheduled task.** Cowork Scheduled sidebar, click the task, toggle off. The task stays defined but won't fire until re-enabled.
- **Empty the queue.** Edit `X:\YesAndEverything\.work-queue.json` directly. Set status to `done` or `skipped` on items you don't want processed. The drain task respects status.
- **Override a skill on a specific request.** Say `don't trigger the skill, just do X directly`. The trigger description allows opt-out.
- **Roll the whole thing back.** `git rm X:\YesAndEverything\.work-queue.json` and delete the scheduled tasks. The handler `CLAUDE.md` files in each repo are independently useful and worth keeping even if you turn off the audit cadence.

## Troubleshooting

**A scheduled task says it ran but didn't write the file.** The task probably hit a permission prompt on first run. Click `Run now` on the task to pre-approve its tools.

**The queue grows but nothing drains.** The drain task isn't running, OR every item needs Nick (no auto-safe items). Open the queue file and confirm there's at least one `auto_safe: true` item with `status: pending`. If there is and the next drain time has passed, the drain task is dormant — restart Cowork.

**A skill isn't triggering on phrases I expect.** The description-based routing is liberal but not perfect. Try a phrase from the trigger list in the table above. If still nothing, the skill probably isn't installed. Check Cowork's plugins panel.

**`.git/index.lock` errors block commits.** Run `git-unstick` skill, or manually `rm -f X:\<repo>\.git\index.lock`. This is a FUSE-mount artifact that survives between sessions.

**The dashboard artifact looks stale.** Hit the Reload button in the artifact panel. It re-pulls via `mcp__workspace__bash` on every reload.

## My pushback on the install order

You don't need all 14 skills at once. The first 4 in the 5-minute setup are doing 90% of the work. Adding `solo-dev-voice-audit`, `canonical-doc-handler-init`, and `drift-auto-fix` after that covers another 8%. The remaining 7 skills are situational — install them when you hit the workflow they cover, not preemptively. Less surface to keep mental track of, and you'll learn each one in the context where you actually need it.

If you do want to install all 14 in one go, drag the whole `_skill-review\` folder contents into Cowork in one operation. Cowork should handle bulk install.

## When this stops working

If a year from now the loop has decayed (audits aren't firing, queue has stalled items from months ago, GDD entries are inconsistent with what's shipped), the recovery procedure is the same as the original setup. Re-read `CLAUDE_SETTINGS.md`. Re-confirm the scheduled tasks are enabled. Run `project-canonical-audit` on each project manually to see what's drifted. Drain the queue. The handler pattern survives turnover; the cadence is what needs maintenance.
