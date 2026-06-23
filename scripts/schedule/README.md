# Bar-raise scheduling

Windows Task Scheduler wiring for the periodic-review pipeline. Phase 5 of `docs/BAR_RAISE_ROADMAP.md`.

## What this directory contains

| File | Purpose |
|---|---|
| `bar-raise-br.ps1` | Per-project shim for Brackish Rising (06:00 daily). |
| `bar-raise-hbh.ps1` | Per-project shim for Here Be Hordes (06:05 daily). |
| `bar-raise-yac.ps1` | Per-project shim for YesAndChains (06:10 daily). |
| `bar-raise-scheduler.ps1` | Per-project shim for Scheduler (06:15 daily). |
| `bar-raise-yaa.ps1` | Per-project shim for YesAndApothecary (06:20 daily). |
| `bar-raise-yab.ps1` | Per-project shim for YesAndBudget (06:25 daily). |
| `bar-raise-yaag.ps1` | Per-project shim for YesAndAgents (06:30 daily). |
| `bar-raise-constellation.ps1` | Portfolio-wide constellation shim (Monday 07:00). |
| `register-all.ps1` | One-shot installer for all 8 Task Scheduler entries. |
| `unregister-all.ps1` | Teardown for all 8 tasks. |
| `logs/` | Per-run dated logs (gitignored, see .gitignore in repo root if added). |

## First-run verification

Before registering the schedule, verify each piece works in isolation.

### Step 1: confirm `claude` is on PATH

```powershell
Get-Command claude
```

If this returns nothing, Claude Code is not on PATH. Either fix PATH (preferred) or edit each shim to use an absolute path to `claude.exe`.

### Step 2: confirm the non-interactive flag is `--print`

The shims invoke `claude --print "bar-raise BR"`. If the installed Claude Code build uses a different non-interactive flag (the documented flag at buildout time was `--print`, but this evolves), every shim needs to be updated.

Quick check:

```powershell
claude --help
```

Look for the non-interactive / batch / one-shot mode flag. Edit `$InvokeArgs` in each shim if needed.

### Step 3: manual dry-run one shim

Pick the lowest-stakes project (YaB has the least churn). Run its shim by hand:

```powershell
cd X:\YesAndEverything\scripts\schedule
.\bar-raise-yab.ps1
```

This should:

1. Call `claude --print "bar-raise YaB"`.
2. Trigger the bar-raise skill via its registered trigger phrase.
3. The skill orchestrator at `orchestrators/per_project.md` runs against YaB.
4. Output lands at `X:\YesAndBudget\docs\BAR_RAISE-YYYY-MM-DD.md`.
5. The skill updates `X:\YesAndEverything\status\data\YaB.json` `barRaise` block.
6. The skill commits + pushes the YaE-side JSON.
7. The shim captures stdout+stderr to `logs/bar-raise-yab-YYYY-MM-DD.log`.

If anything in that chain fails, the log captures it. Fix before registering the schedule.

### Step 4: register all 8 tasks

```powershell
.\register-all.ps1
```

Idempotent (tears down + re-registers if anything already exists). Confirm with:

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like "bar-raise-*" } | Format-Table TaskName, State, NextRunTime
```

You should see all 8 tasks with a `NextRunTime` set.

### Step 5: monitor for one week

The dashboard at `yesandeverything.com/status/` reflects bar-raise output. After the first morning's run:

- Each project card should show a `barRaise` verdict + top finding.
- Monday morning: the constellation banner should populate.

If a task fires but the dashboard does not update, the issue is downstream (skill JSON write, git push, Pages cache). Walk it via `bar-raise-<project>-YYYY-MM-DD.log` in `logs/`.

## Settings rationale

- **StartWhenAvailable**: missed runs catch up on next wake. Critical for laptop-sleep cases.
- **AllowStartIfOnBatteries + DontStopIfGoingOnBatteries**: do not skip the run because of power state. The bar-raise is light enough.
- **RunOnlyIfNetworkAvailable**: the skill needs to push to GitHub and post to Discord. No network = pointless run.
- **WakeToRun is NOT enabled**: do not interrupt sleep just for the bar-raise. The catch-up-on-wake covers it.

## Tearing down

```powershell
.\unregister-all.ps1
```

Removes all 7 tasks. Idempotent. Log files in `logs/` are kept.

## Cost rough-cut

- 7 per-project runs/day × ~30 lenses × ~2k tokens/lens = ~420k tokens/day.
- 1 constellation/week × 7 projects × ~30 lenses + portfolio synthesis = ~520k tokens/week.
- Roughly 13M tokens/month at full schedule.

If that proves heavy in practice, the simplest dial is shifting per-project to every other day (drops by half) or cutting domain lenses to Tier-1 only during the daily run, with full domain lenses only on constellation Mondays.

## Cross-references

- `docs/BAR_RAISE_ROADMAP.md` -- the build plan.
- `_skill-review/personal-skills-src/skills/bar-raise/` -- the skill itself.
- `status/` -- the dashboard that reads the skill's output.
- `cross-project-status-digest` skill -- the cheap alternative if bar-raise proves too heavy.

## Phase status

Phase 5 ships the scheduling. Phase 6 polish + handover follows (cross-references in PERSONAL_CLAUDE_ARCHITECTURE.md, dashboard UX polish, removing Claude from the loop). The system runs without Claude in the loop once Phase 5 is wired and the dashboard reads the JSONs.
