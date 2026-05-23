---
name: work-queue-runner
description: Manage and drain a persistent work queue of small recurring agent tasks. Use whenever the user asks to "process the queue", "what's in the queue", "add to queue", "run my work queue", "next queue item", "queue status", "drain the queue", "queue up", "queue a task", "pick the next task", "show me the work queue", or any request to enqueue, dequeue, or report on the pending-work backlog. Also trigger when a scheduled task fires and asks for "the next queue item to run" or when the user wants to convert audit findings into queued follow-up work. This is the meta-skill that enables continuous agent work between manual reprompts and scheduled invocations.
---

# Work queue runner

Maintain a persistent work queue across discrete agent invocations. Add items, pop the next one, drain the queue, or report status. Each invocation is bounded; the queue is the memory that lets work continue between sessions.

## Why this exists

Each Cowork session is a discrete invocation. Each scheduled task fires once on its schedule. There is no daemon, no long-running agent loop. But the work to be done is continuous - small audits, drift fixes, digests, release-checks pile up faster than any single session can drain them.

The queue is the bridge. Items get added when needs are discovered (manually or by other skills like `project-canonical-audit`). Items get drained by manual invocations or by a scheduled task that fires every N hours and pulls one item. Over time the backlog drains; in the moment, no single session has to carry the whole list.

This skill is the only thing that touches `work-queue.json`. Other skills can recommend additions via chat, but this skill owns the file.

## When to use this

Trigger on requests like:
- "Process the queue"
- "What's in the queue"
- "Add to queue: <description>"
- "Run my work queue"
- "Next queue item"
- "Queue status"
- "Drain the queue"
- "Queue up a drift-fix for HBH"
- "Show me the work queue"
- "Pick the next task and run it"

Also trigger automatically when:
- A scheduled task invokes asking for "the next queue item"
- An audit skill (`project-canonical-audit`) finishes and the user says "queue those fixes"
- The user says "I'm done for the session, what should I leave running"

## The queue file

**Path:** `X:\YesAndEverything\.work-queue.json`

Why YaE? It is the umbrella repo, present in every multi-project session, and a queue file there is naturally cross-project. The file is gitignored (add to `.gitignore` if not already; the file is operational state, not source).

**Shape:** A JSON object with a `version` field and an `items` array.

```json
{
  "version": 1,
  "updated": "2026-05-14T18:32:00Z",
  "items": [
    {
      "id": "wq-2026-05-14-001",
      "added": "2026-05-14T17:05:00Z",
      "project": "htbh",
      "kind": "drift-fix",
      "prompt": "The GDD §6 still lists v0.25.0 in the version pill but project.godot is at v0.26.18. Bump the pill and add a changelog entry noting the drift was caught by audit.",
      "priority": "P2",
      "status": "pending",
      "auto_safe": true,
      "attempts": 0,
      "result_path": null,
      "notes": "Caught by project-canonical-audit 2026-05-14."
    }
  ]
}
```

### Field reference

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Unique slug. Format `wq-YYYY-MM-DD-NNN`. NNN is 3-digit zero-padded sequence within that day. |
| `added` | ISO8601 | When the item was enqueued. |
| `project` | enum | `htbh` \| `yac` \| `scheduler` \| `yae` \| `cross` |
| `kind` | enum | `audit` \| `drift-fix` \| `digest` \| `release-check` \| `custom` |
| `prompt` | string | Full prompt to run when the item is processed. Treat as you would treat a user message. |
| `priority` | enum | `P0` (blocker) \| `P1` (urgent) \| `P2` (normal) \| `P3` (whenever) |
| `status` | enum | `pending` \| `in-progress` \| `done` \| `skipped` \| `blocked` |
| `auto_safe` | bool | If true, mode B may auto-process without confirmation. Drift-fixes default to false unless the audit explicitly flagged the item as text-only. |
| `attempts` | int | How many times this item has been picked up. Increments on each in-progress transition. |
| `result_path` | string \| null | Absolute path to the output file once done. Null while pending. |
| `notes` | string | Optional free-text context. |

## Modes

The skill has four modes. Pick by what the user asked.

### Mode A - Add an item

Triggered by "add to queue", "queue up <thing>", "queue a <kind>", or by another skill saying "queue these fixes."

Steps:
1. Read the queue file. If it doesn't exist, create the skeleton `{"version": 1, "updated": "...", "items": []}`.
2. Generate the next id. Count today's entries, increment.
3. Classify `kind` from the user's description if not specified:
   - Mentions "audit" / "drift" / "match the code" -> `audit`
   - Mentions "fix the doc" / "stale" / "update" -> `drift-fix`
   - Mentions "summarize" / "digest" / "weekly" -> `digest`
   - Mentions "release" / "preship" / "ready to ship" -> `release-check`
   - Otherwise -> `custom`
4. Classify `project` from context (which CLAUDE.md is loaded, which repo path was mentioned).
5. Default `priority` to `P2` unless the user explicitly said "urgent" / "blocker" (P0/P1) or "whenever" (P3).
6. Default `auto_safe` to false for everything except `digest` and `audit`. Drift-fixes never auto-apply without explicit user say-so.
7. Append the item, update `updated` timestamp, write back.
8. Echo the new item to chat with its id, so the user knows what got queued.

**Auto-populate variant:** If invoked with no specific item (e.g., "queue up whatever needs doing for HBH"), look for the most recent `CANONICAL_AUDIT-YYYY-MM-DD.md` in the project's `docs/` folder. For each item under "Suggested fixes" tagged low-risk, add a drift-fix item with `auto_safe: true`. For each structural item, add it with `auto_safe: false`. Report how many were queued.

#### Example invocation A1

> User: Queue up a drift-fix for the HBH GDD version pill being stale.

Skill:
- Reads queue, generates `wq-2026-05-14-003`
- Classifies project=htbh, kind=drift-fix, priority=P2, auto_safe=false (drift-fix default)
- Writes back with item appended
- Reports: "Queued wq-2026-05-14-003 (htbh / drift-fix / P2). Auto_safe is false so this needs your say-so before mode B picks it up."

#### Example invocation A2

> User: Queue everything from today's HBH audit.

Skill:
- Locates `X:\HereBeHordes\docs\CANONICAL_AUDIT-2026-05-14.md`
- Parses the Suggested fixes section
- Adds N items, sets auto_safe true for the text-only ones, false for the structural ones
- Reports: "Queued 6 items from audit (3 auto-safe drift-fixes, 3 needing your review)."

### Mode B - Process one item

Triggered by "next queue item", "process the queue", "pop the next", or by a scheduled-task invocation.

Steps:
1. Read the queue. If empty or all done, report "Queue is empty" and stop.
2. Filter for `status: pending`. Sort by priority (P0 < P1 < P2 < P3), then by `added` ascending (oldest first).
3. Pick the top.
4. **Safety gates:**
   - If `priority == P0`, refuse to auto-process. Report the item and ask the user to confirm. Do not flip status.
   - If `kind == drift-fix` and `auto_safe == false`, refuse to auto-process. Report and ask.
   - If `prompt` contains shell commands (heuristic: `\.ps1`, `pnpm `, `npm `, `wrangler`, `git push`, `rm `), refuse to auto-process. Report and ask for explicit greenlight.
   - If `attempts >= 2` and previous attempts left status `pending` (meaning prior runs didn't complete), flip to `blocked` and surface to user.
5. Otherwise, flip `status` to `in-progress`, increment `attempts`, write back.
6. Run the prompt. Treat the `prompt` field as the user request for this turn. Use whatever skills are relevant (audit, voice-audit, version-bump, etc.).
7. When done, save output to a result file:
   - Path: `X:\YesAndEverything\.work-queue-results\<id>.md`
   - Contents: timestamp header + the work output + any diffs applied + any followups
8. Flip `status: done`, set `result_path`, update `updated`, write back.
9. **Recommend next:** look at the next-highest pending item and report it to chat so the user (or a scheduled task that chains) can decide to keep going. Format: "Next up: wq-XXX (project / kind / priority). Run again to process."

If the run failed mid-prompt (exception, blocked tool, ambiguity), leave `status: in-progress` but report what blocked you. The next mode-B invocation will see `attempts >= 1` and either retry (if status is still pending after a manual reset) or escalate to `blocked` on the second attempt.

#### Example invocation B1

> User: Run the next queue item.

Skill:
- Picks wq-2026-05-14-002 (yac / digest / P2 / auto_safe true)
- Flips in-progress
- Runs the digest prompt - produces a 1-week YaC changelog summary
- Writes `.work-queue-results/wq-2026-05-14-002.md`
- Flips done
- Reports: "Done. wq-2026-05-14-002 result at <path>. Next up: wq-2026-05-14-003 (htbh / drift-fix / P2, needs your greenlight - auto_safe=false)."

#### Example invocation B2 (safety refusal)

> User: Process the next queue item.

Skill, finding next is P0:
- Reports the item
- Refuses to flip status
- Asks: "Top item is P0: '<prompt summary>'. P0 items don't auto-process. Greenlight to proceed?"

### Mode C - Drain up to a token budget

Triggered by "drain the queue", "run as much of the queue as you can", "process everything safe to auto-run."

Steps:
1. Read queue. Sort pending by priority + added.
2. Estimate per-item budget. Default budget cap: 80,000 tokens total across all items processed this invocation, or stop when 5 items processed - whichever first. (Hard cap is the session token budget itself - watch it.)
3. Loop:
   - Pick top pending.
   - Apply mode-B safety gates. If gated, skip (do not flip status), move to next pending.
   - If safe, run as mode B.
   - Track tokens consumed. If next item would exceed budget, stop.
4. At end, report a digest: N processed, M skipped (with reasons), K still pending. List the still-pending top 3.

This mode is the one most useful from a scheduled task - "every 4 hours, drain what's safe."

#### Example invocation C1

> User: Drain the queue.

Skill:
- Loops mode B for safe items
- Processes 3 items, skips 1 (auto_safe false), stops at budget
- Reports: "Drained 3 (wq-001, wq-002, wq-005). Skipped 1 (wq-003 needs your greenlight). 4 pending. Top remaining: wq-004 (htbh / audit / P1)."

### Mode D - Status

Triggered by "queue status", "what's in the queue", "show me the work queue."

Steps:
1. Read queue.
2. Count by status: pending, in-progress, done, skipped, blocked.
3. Sort pending by priority + added; show top 5.
4. Note any item with `attempts >= 2` as a flag.
5. Output as a compact table.

#### Example invocation D1

> User: What's in the queue?

Skill output:
```
Work queue status (as of 2026-05-14T18:45:00Z)

Pending:    7
In-progress: 1  (wq-2026-05-13-004, attempts=2 - flag)
Done:       12
Skipped:    1
Blocked:    0

Top 5 pending:
1. wq-2026-05-14-001  htbh   drift-fix   P1  (auto_safe)
2. wq-2026-05-14-003  yac    audit       P2  (auto_safe)
3. wq-2026-05-14-004  htbh   drift-fix   P2  (needs greenlight)
4. wq-2026-05-13-007  cross  custom      P2  (needs greenlight - shell cmd)
5. wq-2026-05-13-008  yae    digest      P3  (auto_safe)

Flag: wq-2026-05-13-004 has attempts=2 and is still in-progress. Likely blocked. Recommend marking 'blocked' and surfacing the underlying issue.
```

## Safety rules (recap, non-negotiable)

These are reasserted because the skill must enforce them every run:

1. **P0 never auto-processes.** Mode B and C must skip and surface P0 items, always.
2. **drift-fix needs `auto_safe: true`** to auto-process. Default is false. Only an audit explicitly marking an item as text-only safe can flip it true.
3. **Items with shell commands** (matches against `\.ps1`, `pnpm`, `npm`, `wrangler`, `git push`, `rm`, `mv`, `cp`, `Invoke-`, `Remove-Item`) must be greenlit before mode B picks them.
4. **Two failed attempts -> blocked.** If `attempts >= 2` and status never reached `done`, mode B flips to `blocked` and refuses further auto-runs.
5. **Never delete items.** Done items stay in the file (with `result_path` set). The queue is also a log.
6. **Never silently flip status backwards.** `done` does not become `pending` again. If a redo is needed, the user adds a new item that references the prior id in `notes`.

## Output destination for run results

Per-item results go to: `X:\YesAndEverything\.work-queue-results\<id>.md`

Create the directory if missing. Add `.work-queue-results/` to `.gitignore` (it's operational state).

Format of each result file:

```markdown
# <id> result

- Started: <ISO timestamp>
- Finished: <ISO timestamp>
- Status: done | partial | blocked
- Prompt: <verbatim or trimmed>

## What was done
<bullet summary>

## Files touched
<paths>

## Followups recommended
<bullets - usually new queue items to add>
```

If a result recommends followups, the skill should suggest queuing them (mode A) at the end of its chat output. It should not auto-queue them without asking.

## Pairing with the scheduled-tasks MCP

The intended deployment pattern:

1. Nick adds items as he discovers needs (manual mode A).
2. A scheduled task fires every 4 hours and invokes the agent with: "Run mode C of work-queue-runner. Drain up to budget."
3. The agent drains safe items, skips gated ones, leaves a result trail.
4. Gated items pile up until Nick reviews them and either greenlights (mode B with explicit confirmation), bulk-greenlights via "drain the queue with my pre-approval for everything currently gated", or marks them blocked.

The scheduler does not bypass safety. The scheduler only invokes the skill; the skill enforces the gates.

## What not to do

- **Do not invent items.** Mode A always reflects either a user instruction or a parsed audit finding. Never speculate "you probably want to do X."
- **Do not chain modes without telling the user.** Mode B does not auto-flow into another mode B. Each invocation processes one (B) or up to budget (C), then stops and reports.
- **Do not edit the queue file outside of this skill.** Other skills should recommend items; only this skill writes `work-queue.json`.
- **Do not delete or rewrite history.** The queue is append-and-flip-status only.
- **Do not run shell commands from a queued prompt without the gate.** Even if the prompt says "just run release.ps1," the safety check refuses without greenlight.

## When the queue is empty

That is the success state. Report "Queue is empty - nothing pending. Want me to auto-populate from any recent audit findings, or are you good?"
