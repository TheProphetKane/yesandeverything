---
name: self-reprompt-loop
description: The orchestrator skill for continuous bounded agent work across sessions. Use whenever the user wants to `keep working`, `tick the loop`, `process the next unit`, `run the loop`, `what's next on the auto-pile`, `drain the work`, `continue from where you left off`, `pick up where we stopped`, or `loop me`. Also trigger proactively at the end of any session where the user implied work should continue (`I'm afk for a few hours`, `keep things moving`, `make progress while I'm out`). This is the meta-orchestrator. It does NOT execute queue items itself - it reads state (work-queue, audit findings, breadcrumb) and delegates to the right downstream skill (work-queue-runner, drift-auto-fix, project-canonical-audit, backlog-hygiene). Triggers should not collide with work-queue-runner, which owns queue add/process/drain. This skill owns the decision of WHICH skill to invoke next.
---

# Self-reprompt loop

Drive bounded, repeatable agent work across discrete invocations. Each tick is one unit of work plus a breadcrumb describing what the next tick should do. The "constant" part comes from cadence (scheduled task) plus continuity (breadcrumb), not from a long-running process.

## Why this exists

Nick wants the agent to *keep working* between his check-ins. Sessions are discrete, scheduled tasks fire once on their schedule, and no skill on its own decides what should happen next. Work-queue-runner is an executor for queued items. project-canonical-audit produces findings reports. drift-auto-fix consumes findings. None of them decide *what to do when invoked with no specific instruction*.

This skill is that decider. It reads the world state (queue depth, recent audit reports, breadcrumb from last loop), picks the most productive next bounded action, delegates to the right downstream skill, then leaves a breadcrumb for the next tick.

Cadence + breadcrumb = continuity without a daemon. Each tick stands alone but inherits context.

## When to use this

Trigger on requests like:
- `keep working`
- `tick the loop`
- `process the next unit`
- `run the loop`
- `what's next on the auto-pile`
- `drain the work`
- `continue from where you left off`
- `pick up where we stopped`
- `loop me`
- `make progress while I'm afk`

Also trigger automatically when:
- A scheduled task fires asking to `tick the self-reprompt loop`
- The user ends a session with `keep things moving` or similar
- The end-of-reply heuristic detects an open continuation Nick implied

Do NOT trigger when:
- The user asked specifically for `process the queue` or `next queue item` - that's work-queue-runner's job directly
- The user asked for `audit` specifically - that's project-canonical-audit
- The user named a downstream skill by name - go to that skill, not this orchestrator

## The breadcrumb file

**Path:** `X:\YesAndEverything\.next-loop.md`

Why YaE? Same reason work-queue-runner lives there - umbrella repo, present in every multi-project session, naturally cross-project. The file is gitignored.

**Shape:** Markdown with a YAML frontmatter for machine-readable state, plus prose for the next-loop hint.

```markdown
---
last_tick: 2026-05-15T14:30:00Z
last_action: drained-queue
last_result: 2 items processed, 1 skipped
ticks_today: 4
consecutive_failures: 0
loop_status: active
next_eligible_at: 2026-05-15T18:30:00Z
---

## Next-loop hint

Queue is at 5 pending, top is wq-2026-05-15-007 (yac / digest / P2 / auto_safe).
Next tick should invoke work-queue-runner mode B.
If queue drains to zero, fall back to scanning for stale audits (>7 days old) and queue refresh audits.
```

### Frontmatter field reference

| Field | Type | Purpose |
|---|---|---|
| `last_tick` | ISO8601 | Timestamp of the most recent tick. |
| `last_action` | enum | `drained-queue` \| `ran-audit` \| `applied-drift-fix` \| `hygiene-pass` \| `idle-no-work` \| `gated-surfaced` |
| `last_result` | string | One-line human summary of what got done. |
| `ticks_today` | int | How many ticks fired since local midnight. Reset at the first tick of a new day. |
| `consecutive_failures` | int | How many ticks in a row failed or surfaced as blocked. Two in a row -> loop_status flips to `blocked`. |
| `loop_status` | enum | `active` \| `blocked` \| `paused` \| `complete` |
| `next_eligible_at` | ISO8601 | Earliest time the next tick should fire. Enforced cooldown. |

## Modes

The skill has three modes. Pick by what the user asked.

### Mode A - tick

Triggered by `keep working`, `tick the loop`, `run the loop`, by a scheduled task firing, or by end-of-session continuation.

Steps:
1. Read `X:\YesAndEverything\.next-loop.md`. If missing, create a fresh skeleton with `loop_status: active`, `ticks_today: 0`, `consecutive_failures: 0`.
2. **Cooldown check.** If `next_eligible_at` is in the future, report `Loop on cooldown until <time>` and exit.
3. **Loop-status check.** If `loop_status` is `blocked` or `paused`, refuse to tick. Report current status and the last_result that caused it. Suggest mode C (reset) if user wants to resume.
4. **Runaway check.** If `ticks_today >= 12` (12 ticks in 24h = roughly one every 2 hours - 4 hours of consecutive coverage assuming 4-hour cadence with 2 catch-ups per window), refuse and surface. Nick must explicitly OK continuation.
5. **Decide what to do.** In this priority order:
   1. **Read `X:\YesAndEverything\.work-queue.json`.** If queue has pending items with `auto_safe: true` and no shell-command red flags, delegate to work-queue-runner mode B.
   2. **Scan for unprocessed audit findings.** Glob `X:\{HereBeHordes,YesAndChains,Scheduler,YesAndEverything}\docs\CANONICAL_AUDIT-*.md` (and `<root>\CANONICAL_AUDIT-*.md`). For the most recent in each project, check if its "Suggested fixes" section has any low-risk items NOT yet reflected as `done` queue items. If yes, delegate to drift-auto-fix for that project. If the audit has structural items only, queue them via work-queue-runner mode A and report.
   3. **Check audit staleness.** For each project, if no audit exists in the last 7 days, queue a fresh audit via work-queue-runner mode A (project / audit / P3 / auto_safe).
   4. **Check BACKLOG.md drainability.** If any project's `BACKLOG.md` has items tagged `P0` or `P1` with no `attempts` in the queue, delegate to backlog-hygiene to triage. (backlog-hygiene is the still-to-build skill; if not present, fall through.)
   5. **Idle.** No work surfaces. Set `last_action: idle-no-work`, report "Loop is idle - nothing to do", exit.
6. **Execute one bounded unit.** Invoke the chosen downstream skill with the chosen prompt. Treat the invocation as a delegated subtask. Do not chain more than one downstream skill per tick.
7. **Update the breadcrumb.** Write back `.next-loop.md` with:
   - `last_tick` = now
   - `last_action` = what was done
   - `last_result` = one-line summary
   - `ticks_today` incremented (or reset to 1 if first of the day)
   - `consecutive_failures` = 0 if successful, +1 if the downstream skill returned `blocked` / `failed` / refused
   - `next_eligible_at` = now + 2h (default cooldown; scheduler can fire sooner, but the cooldown holds)
   - Prose hint describing what the next tick should expect
8. **Optionally re-arm.** If the user is going AFK and asked for sustained looping, create or update a scheduled task that invokes this skill in mode A again at `next_eligible_at`. Only do this if the user explicitly opted in this session ("schedule the loop", "keep firing every 4 hours", etc.) - never auto-arm without that signal.
9. **Report.** Single chat output: what was done, what's next, when the next tick is eligible.

If consecutive_failures hits 2 after this tick, flip `loop_status` to `blocked` and surface clearly. Do not silently keep trying.

#### Example invocation A1

> User: keep working

Skill:
- Reads breadcrumb (last_tick 6h ago, status active, ticks_today 3)
- Reads queue: 4 pending, top is wq-2026-05-15-007 (yac / digest / auto_safe)
- Delegates to work-queue-runner mode B for that item
- Work-queue-runner processes the digest, writes result, returns success
- Updates breadcrumb: last_action=drained-queue, ticks_today=4, consecutive_failures=0
- Reports: "Tick complete. Processed wq-2026-05-15-007 (yac digest). 3 queue items remain. Next eligible at 16:30."

#### Example invocation A2 (idle path)

> Scheduled task fires.

Skill:
- Reads breadcrumb (last_tick 4h ago, ticks_today 5)
- Reads queue: 0 pending
- Scans audits: most recent HBH audit was 3 days ago, no untouched low-risk items
- Scans staleness: all projects audited within 7 days
- No backlog P0/P1 surfacing
- Sets last_action=idle-no-work, writes breadcrumb
- Reports: "Loop is idle. No work surfaced. Next eligible at 22:30."

### Mode B - status

Triggered by `loop status`, `what's the loop doing`, `is the loop active`.

Steps:
1. Read `.next-loop.md`. If missing, report "Loop has never run; no breadcrumb yet."
2. Read `.work-queue.json`. Count pending / in-progress / done.
3. Glob audit files. Count how many exist and their newest dates per project.
4. Compose a compact status report:

```
Self-reprompt loop status (as of <now>)

Loop status:    active
Last tick:      2026-05-15T14:30:00Z (4h ago)
Last action:    drained-queue (2 items processed, 1 skipped)
Ticks today:    4 / 12 budget
Consec fails:   0
Next eligible:  2026-05-15T18:30:00Z

Queue:          5 pending (2 auto_safe, 3 gated)
Audits:
  htbh   - 2026-05-12 (3d ago, 2 low-risk fixes unapplied)
  yac    - 2026-05-14 (1d ago, fully drained)
  scheduler - never audited
  yae    - 2026-05-10 (5d ago, fully drained)

Next-loop hint: process wq-2026-05-15-007 (yac digest).
```

Do not mutate state in mode B. Read-only.

### Mode C - reset

Triggered by `reset the loop`, `clear the breadcrumb`, `unblock the loop`, `loop is stuck`.

Steps:
1. Read current breadcrumb.
2. Confirm the reset with the user first if `loop_status` is `blocked` and `consecutive_failures >= 2` - they should see what was failing before flushing the signal. Show the last_result and ask `confirm reset?` unless the user already said `force reset`.
3. Write a fresh breadcrumb:
   - `loop_status: active`
   - `ticks_today: 0`
   - `consecutive_failures: 0`
   - `next_eligible_at: now`
   - `last_action: reset`
   - `last_result: manual reset by user`
   - Prose hint: "Reset by user. Next tick should run mode A fresh decision pass."
4. Optionally also flip any queue items stuck `in-progress` back to `pending` IF the user explicitly says `also reset stuck queue items`. Default: do not touch the queue file. Queue resets are work-queue-runner's territory.
5. Report what was reset.

## Safety gates (non-negotiable)

Inherited from work-queue-runner and re-enforced here:

1. **Never modify code without explicit `auto_safe`.** The loop delegates to skills that respect auto_safe. The loop itself does not edit source files. Drift-fixes against canonical docs are fine; source-code edits require user greenlight.
2. **Never run shell commands without pause.** If a delegated tick would require running `.ps1`, `pnpm`, `wrangler`, `git push`, or any other shell command, the downstream skill must refuse and surface. The loop must not bypass that gate.
3. **Two consecutive failed ticks -> loop_status: blocked.** Loop refuses to tick further until user resets (mode C) or unblocks manually.
4. **Daily tick cap.** `ticks_today >= 12` halts auto-ticking. Caps total auto-work at roughly 4 hours of effective coverage even if a scheduler misfires repeatedly.
5. **HBH GDD update is mandatory.** If the tick's downstream work touched HBH (code, docs, GDD, asset registry), the breadcrumb must record `gdd_updated: true`. If false, surface as a finding - the next tick should patch the GDD before doing other HBH work.
6. **Never silently chain ticks within one invocation.** One tick per invocation. The breadcrumb + scheduler are how the next tick fires. If the user wants multiple ticks in one session, they invoke mode A multiple times explicitly.
7. **P0 queue items never auto-process.** Even if the loop sees them, it delegates them to work-queue-runner which will refuse and surface.

## Integration points

This skill is the orchestrator. It does not execute - it picks and delegates.

| Downstream skill | When the loop calls it |
|---|---|
| `work-queue-runner` mode B | Queue has auto_safe pending items. |
| `work-queue-runner` mode A | New work was discovered (stale audit, new audit findings, BACKLOG triage). |
| `drift-auto-fix` | Recent audit has unapplied low-risk fixes for a project. |
| `project-canonical-audit` | A project hasn't been audited in >7 days. (Or the loop queues this rather than running it inline to keep ticks bounded.) |
| `backlog-hygiene` | A BACKLOG.md has P0/P1 items needing triage. (Skill TBD; fall through if not present.) |

The loop does not directly read or write source code, queue files (work-queue-runner owns those), or canonical docs (drift-auto-fix and project-canonical-audit own those). Its only owned file is `.next-loop.md`.

## Scheduled task integration

The intended deployment pattern:

1. Nick invokes mode A once manually: `keep working`.
2. Loop ticks, writes breadcrumb, finishes.
3. If Nick said `keep firing` or similar, the loop creates a scheduled task via `mcp__scheduled-tasks__create_scheduled_task` to fire `tick the self-reprompt loop` every 4 hours during 09:00-21:00 local.
4. Each scheduled fire invokes mode A. The cooldown + tick cap + loop_status gates do the safety enforcement.
5. Nick checks back occasionally, reads mode B status, manually intervenes if blocked.

The scheduler does not bypass safety. The skill enforces every gate on every tick regardless of who invoked it.

## What not to do

- **Do not execute queue items directly.** Delegate to work-queue-runner. The loop's job is to pick the next bounded unit, not to run it.
- **Do not edit canonical docs.** That's drift-auto-fix's job. The loop delegates.
- **Do not chain multiple downstream skills in one tick.** One tick = one delegation. The breadcrumb carries continuity to the next tick.
- **Do not auto-arm scheduled tasks without user opt-in.** Creating a recurring scheduled task without an explicit `schedule the loop` from the user is overreach.
- **Do not run during off-hours by default.** Scheduled tasks created by the loop should default to 09:00-21:00 local on weekdays unless the user said otherwise.
- **Do not delete the breadcrumb.** Mode C overwrites; it does not delete. The breadcrumb file is operational memory.

## Output destination

Breadcrumb: `X:\YesAndEverything\.next-loop.md` (gitignored).

Per-tick chat output should be compact - one paragraph max:
- What this tick did (or didn't, if idle)
- What's next (top of queue, next eligible time)
- Any flags (failures, gated items, GDD-update-pending)

Do not dump the full breadcrumb to chat unless mode B was asked. The breadcrumb is operational state, the chat output is the human surface.

## When the loop is idle

That is fine. Report `Loop is idle - nothing surfaced as work`. Do not invent tasks. Idle is a valid steady state and means the canonical layer + queue + audit findings are all current. The user can decide whether to add new work or pause the loop.
