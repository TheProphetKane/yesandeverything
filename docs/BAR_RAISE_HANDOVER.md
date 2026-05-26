# Bar-raise handover

Phase 6 of `BAR_RAISE_ROADMAP.md`. This document is the operator manual for the bar-raise + dashboard system once it is running unattended. If something goes wrong, start here.

## What the system does without you

Every morning between 06:00 and 06:25, six Windows Task Scheduler entries fire in 5-minute intervals. Each runs `claude --print "bar-raise <project>"`, which triggers the bar-raise skill against one project. The skill walks Wave 2 discovery + 11 Tier-1 lenses + matching Wave 4 domain lenses + Wave 5 synthesis. It writes a Markdown findings report to `<project>/docs/BAR_RAISE-YYYY-MM-DD.md` and updates `X:\YesAndEverything\status\data\<project>.json` `barRaise` block, then commits + pushes the YaE side.

Every Monday at 07:00, a seventh entry fires `claude --print "constellation review"`. That orchestrator runs Wave 1 portfolio overview + the six per-project waves in fan-out + Wave 5 at portfolio scope. Output: six per-project reports (refreshes from that morning's daily runs), one `CONSTELLATION-YYYY-MM-DD.md` in YaE, and `status/data/constellation.json`. The dashboard banner at `yesandeverything.com/status/` reflects the constellation verdict within ~30 seconds of the YaE push.

The dashboard is static HTML/CSS/JS. It fetches the JSONs on load. There is no backend, no auth, no write path from the web. Everything is push-driven from the laptop.

## File map

| Path | Purpose |
|---|---|
| `X:\YesAndEverything\status\index.html` | The dashboard page itself. |
| `X:\YesAndEverything\status\data\<project>.json` | Per-project state, written by release scripts + bar-raise skill. |
| `X:\YesAndEverything\status\data\constellation.json` | Portfolio-level state, written only by the weekly constellation run. |
| `X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md` | The build plan. Phase status table at the bottom is the source of truth for what is shipped vs pending. |
| `X:\YesAndEverything\docs\BAR_RAISE_HANDOVER.md` | This file. |
| `X:\YesAndEverything\docs\CONSTELLATION-*.md` | Weekly constellation reports (most recent at the top of a sort). |
| `X:\YesAndEverything\_skill-review\personal-skills-src\skills\bar-raise\` | The skill source. Repackage as `.skill` and re-install to pick up changes. |
| `X:\YesAndEverything\scripts\schedule\` | The Task Scheduler shims + register/unregister + README. |
| `X:\YesAndEverything\scripts\schedule\logs\` | Per-run dated logs from each shim. First-stop debugging. |
| `X:\<project>\docs\BAR_RAISE-*.md` | Per-project bar-raise findings reports. Newest at the top of a sort. |
| `X:\<project>\scripts\write-dashboard-status.ps1` | Release-time JSON writer. Runs from the project's release.ps1. |

## What to check when something feels off

In order of cheapest to most expensive:

### 1. The dashboard itself

Open `https://yesandeverything.com/status/`. Hit refresh. Check the "last refreshed" timestamp.

If the page loads but data is missing for a project, the JSON for that project did not update on the last bar-raise run. Skip to step 3.

If the page does not load at all, GitHub Pages is having a moment OR the YaE repo got into a bad state. Check the repo state in step 4.

### 2. The scheduled tasks

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like "bar-raise-*" } | Format-Table TaskName, State, LastRunTime, LastTaskResult, NextRunTime
```

- `State = Ready` and `NextRunTime` set = healthy.
- `State = Disabled` = was disabled deliberately; re-enable with `Enable-ScheduledTask -TaskName <name>`.
- `LastTaskResult = 0` = last run succeeded (from Task Scheduler's POV; the work inside may still have failed).
- `LastTaskResult != 0` = the shim exited non-zero. Check the log.

### 3. The shim logs

```powershell
cd X:\YesAndEverything\scripts\schedule\logs
Get-ChildItem -Filter "bar-raise-*-$(Get-Date -Format yyyy-MM-dd).log" | Sort-Object LastWriteTime -Descending
```

Each shim writes a dated log. Open the most recent for the project that is misbehaving.

Common patterns:

- `ERROR: claude CLI not found on PATH` -> Claude Code is not installed or not on PATH. Reinstall or update `$ClaudeBin` in the shim.
- `claude --print` fails immediately -> the CLI flag changed. Check `claude --help` and update `$InvokeArgs` in every shim.
- The CLI runs but produces no output -> the skill is not triggering. Either the plugin install is out of date (repackage from `_skill-review/personal-skills-src/` and re-install) OR the trigger phrase has changed.
- The skill triggers, runs lenses, and writes the Markdown report, but does not update the JSON -> the JSON write step in Wave 5 failed. Check the project's `status/data/<project>.json` mtime vs the report.

### 4. The YaE repo state

```powershell
cd X:\YesAndEverything
git status
git log --oneline -10
```

Recent commits should show `status(...)` entries from each project's bar-raise run, plus the `constellation:` commit on Mondays. Missing entries = either the local commit did not happen (lock issue, push failed) or the run did not happen at all.

If the working tree is dirty with uncommitted status JSONs, something blocked the commit. Most likely culprit: `.git/*.lock` files left over from a previous interrupted run. Clear them:

```powershell
Get-ChildItem .git -Filter "*.lock" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
```

The global git wrapper (if installed) does this automatically.

### 5. Token spend

Daily token usage roughly tracks 360k/day during the per-project runs + 450k on Mondays for the constellation. If usage spikes well above this, a lens is producing unexpectedly large output OR a runaway sub-agent. Mitigation: run `unregister-all.ps1`, fix the offending lens template, re-register.

## When to repackage + re-install the skill

The skill source lives at `X:\YesAndEverything\_skill-review\personal-skills-src\skills\bar-raise\`. The running Claude Code instance loads skills from `~\.claude\skills\bar-raise\` (or wherever the plugin install puts them). Changes to the staging dir do not take effect until the plugin is repackaged and re-installed.

Repackage when you:

- Tune a lens template (severity heuristics, signals list).
- Add a domain lens to Wave 4 (after Phase 4 expansion).
- Change the orchestrator procedure (e.g. add a new step in Wave 5 synthesis).
- Change the JSON contract or the Markdown report shape.

The repackage step is currently manual (zip the `personal-skills-src/` tree into a `.skill` file, install via the Claude Code plugin manager). Automating it is a future polish task; it does not block the current build.

## When to update the schedule

- New project added to the portfolio -> add a new shim (clone an existing one, retarget) and add a new `Register-BarRaiseTask` line to `register-all.ps1`. Re-run.
- Token spend too high -> shift per-project from daily to every-other-day by changing the trigger.
- Sleep schedule changed -> move the daily window. Currently 06:00-06:25; pick whatever works.

## When the constellation report disagrees with the dashboard

The dashboard is read-on-load. If the constellation banner shows a stale verdict, force a refresh on the page. If the page still shows old data after the refresh:

- The constellation.json file did not update. Check `X:\YesAndEverything\status\data\constellation.json` mtime.
- The YaE push did not land. Check `git log` in YaE.
- GitHub Pages cache is stale. Hard-refresh (Ctrl+Shift+R).

## What is intentionally NOT automated

These are escape hatches that require a human:

- **Editing a lens template.** Changes to lens prompts go through git, repackage, re-install. No hot reload.
- **Adding a new project to the portfolio.** New project needs: a `status/data/<project>.json` seed, a `write-dashboard-status.ps1`, a `release.ps1` step, a `bar-raise-<project>.ps1` shim, a `register-all.ps1` entry, and a tag set picked from the 9 domains.
- **Changing the JSON contract.** The dashboard JS reads specific field names. Changing them requires updating `status/index.html` + every JSON writer in lockstep.
- **Killing the schedule.** `unregister-all.ps1`. No auto-disable.

## When Claude is back in the loop

Even with the schedule running, you will pull Claude in for:

- **Tuning lenses based on what they surface.** First two weeks of real runs will surface noisy lenses (always-no-finding or always-low-severity) that should be sharpened or dropped.
- **Adding new lenses to Wave 4.** New domain or new sub-question.
- **Adding a new project.** The mechanical steps above are scriptable; a Claude session is faster.
- **Debugging an opaque skill failure.** When the shim log shows the skill ran but produced empty output, walking the chain is faster with Claude than alone.
- **The post-launch v1 retrospective.** When BR or HBH ships v1, the constellation and the lens findings up to that point are a non-trivial input to "what did we learn".

The default state is no-Claude. Claude is summoned for the above, not running in the background.

## Cross-references

- `docs/BAR_RAISE_ROADMAP.md` -- the build plan. Phase status table at the bottom.
- `_skill-review/personal-skills-src/skills/bar-raise/SKILL.md` -- the skill behavior contract.
- `scripts/schedule/README.md` -- the scheduling verify-and-install runbook.
- `CLAUDE_SETTINGS.md` -- cross-project personal-Claude settings.
- `PERSONAL_CLAUDE_ARCHITECTURE.md` -- the handler-and-canonical pattern spec.
