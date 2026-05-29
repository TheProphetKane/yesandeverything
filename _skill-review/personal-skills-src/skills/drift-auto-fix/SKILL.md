---
name: drift-auto-fix
description: Close the loop on project-canonical-audit by applying the low-risk fixes it surfaced, then chain the structural items into work-queue-runner so nothing dies on the floor. Use whenever the user asks to apply audit fixes, fix the drift, apply the suggested fixes, close the audit loop, auto-fix from audit, or make the drift fixes. Also trigger on phrases like `go ahead and apply the easy ones`, `do the safe audit fixes`, `land the low-risk drift fixes`, or any request to take a recent audit findings report and act on it. The skill is the executor half of the audit pair — project-canonical-audit reports, drift-auto-fix applies, work-queue-runner picks up what couldn't be auto-applied. After applying safe fixes, automatically enqueue any structural items via work-queue-runner add before exiting. Refuses to operate without an audit findings file in hand.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `canonical_docs` — which files the safe text fixes apply to
- `hard_rules` — never auto-fix anything that violates a hard rule
- `critical_files_for_python_atomic_write` — use atomic-write for these, never the Edit tool

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# Drift auto-fix

Take a recent `project-canonical-audit` findings report and apply the items it tagged as low-risk. Surface the structural ones for the user to decide. Log every change to a dated diff file so the run is reviewable.

## Why this exists

The audit skill produces a tidy list of drift and a "Suggested fixes" section split into low-risk and structural tags. In practice the low-risk ones are nearly always boring — a version pill that needs to match the latest commit, a date stamp that's gone stale, a `todo` that should be `placeholder` now the sprite is on disk, a typo, a phantom path that should point at the new file. Doing them by hand is rote work; leaving them undone lets the audit's value decay before the user gets to act on it.

This skill closes the loop. The audit step is its own deliberate work — this skill does not re-run it. It strictly consumes an existing report and applies the obviously-safe items.

## When to use this

Trigger on requests like:
- "Apply the audit fixes"
- "Fix the drift"
- "Apply the suggested fixes from the audit"
- "Close the audit loop"
- "Auto-fix from the audit"
- "Make the drift fixes"
- "Go ahead and land the safe ones"

If the user asks to *audit and fix in one go*, invoke `project-canonical-audit` first, then this skill — but as two separate phases with the user seeing the audit report between them. Never collapse them into a single silent pass.

## Hard refusal

**No audit findings file = no operation.** This skill exists to act on a deliberate audit report. If no findings file is present and the user hasn't pointed at one, stop and ask whether they want to run `project-canonical-audit` first. Do not improvise edits from scratch — that's a different skill's job.

## How to run a fix pass

Follow these phases in order.

### Phase 1 — Locate the audit findings file

Default lookup, in order:

1. `<project>/docs/CANONICAL_AUDIT-YYYY-MM-DD.md` — pick the most recent by date in the filename
2. `<project>/CANONICAL_AUDIT.md` — single-file appended history; use the latest dated section inside
3. A path the user explicitly handed you in the prompt

If nothing matches, surface this and ask:
> No audit findings file found at `<project>/docs/CANONICAL_AUDIT-*.md`. Want me to run `project-canonical-audit` first, then come back here?

Do not proceed without a findings file. The skill is the executor half of the pair.

### Phase 2 — Parse the findings

Read the report and extract every entry under the **Suggested fixes** section. Each entry is one fix proposal. Parse:

- **Target file** — the path the fix touches (often called out as "in `docs/GDD.html`" or "edit `ROADMAP.md`").
- **Change description** — what the audit thought should happen.
- **Risk tag** — the audit tags each entry as low-risk or structural. Use that tag as your first filter.

Then apply this skill's own classifier on top of the audit's tag. The audit can be wrong; this skill has the final say:

**Auto-apply when the fix is:**
- Version-pill bump to match the most recent commit's `vX.Y.Z` (only if the version pill is behind the commit, not ahead)
- Date-stamp refresh on an "as of YYYY-MM-DD" table when the existing date is older than 7 days
- Status flag flip: `todo` → `placeholder` when the named asset is confirmed on disk; `placeholder` → `done` when the implementation file is confirmed present and non-stub
- Stale table row update (e.g., the "Currently Used in HBH" assets table when the audit confirmed new assets are present)
- Typo fixes the audit flagged (e.g., `vv0.1.0` → `v0.1.0`, double-period sentence ends, misspelled section anchors)
- Phantom-reference rewrite when the audit identified both the broken path and its replacement (e.g., `PRIORITY_QUEUE.md` → `docs/launch-checklist-1.0.md`)

**Never auto-apply — always surface to the user — when the fix involves:**
- Deleting a file, even one the audit calls tombstoned or obsolete
- Architecture changes (engine version bump, dependency add/remove, framework swap)
- Scope changes to the canonical doc (adding a new feature, dropping a feature, retitling a milestone)
- Anything inside a section labeled "Locked Decisions" — those are policy, not drift
- README rewrites or restructures
- `CLAUDE.md` changes — handler files are deliberate, never auto-edited

When in doubt, surface it. The cost of asking is low; the cost of silently editing a locked decision is high.

### Phase 3 — Preview before any edit

Before touching a file, print a short preview:

```
Found <N> suggested fixes in <findings file>.
  - <A> classified as auto-apply (low-risk)
  - <B> surfaced for your decision (structural)

Auto-apply queue:
  1. <file>: <one-line description>
  2. <file>: <one-line description>
  ...

Surfaced for decision:
  1. <file>: <one-line description> — <why structural>
  ...

Proceed with the <A> auto-applies?
```

Wait for confirmation. If the user says "yes" / "go" / "proceed" / "apply", continue. If they say "skip #3" or similar, honor the exclusion.

### Phase 4 — Apply the low-risk fixes

For each item in the auto-apply queue:

1. Read the target file.
2. Make the minimal edit — exact text replacement, no rewriting of surrounding lines.
3. Save.
4. Record the change to an in-memory log (file path, before snippet, after snippet, audit-finding ID).

If a fix fails (target text not found because the file already moved, e.g.), log the failure and continue — don't halt the pass over one stale fix. The diff log will show what landed and what didn't.

Special case: if the target file is `docs/GDD.html` for HBH, apply edits to the inner content but **do not** bump the version pill yet — that happens in Phase 6 once the whole pass is done.

### Phase 5 — Surface structural items

After the auto-applies land, print the structural list with enough context for the user to act:

```
Structural items needing your decision:

1. <file>: <change description>
   Why structural: <reason — e.g., "touches Locked Decision §17">
   Audit's recommendation: <quote from findings>

2. ...
```

Don't pre-decide for the user. Don't bury these — they're the substantive half of the audit's value.

### Phase 6 — HBH-only: bump the GDD

If the project touched was HBH (`X:\HereBeHordes`), the GDD update rule applies. After Phase 4:

- Bump the version pill in `docs/GDD.html` (near line ~584) by one PATCH increment unless the changes were trivial enough that no bump is warranted — in which case say so explicitly and skip.
- Add a changelog entry at the top of the changelog footer, in descending-version order, summarizing the drift-fix pass. Match solo-dev voice: no "per Nick", no em dashes, no AI vocabulary. Example:

```
v0.27.4 - drift-fix pass against CANONICAL_AUDIT-2026-05-14.md - corrected stale "as of" stamps, flipped two placeholders to done, fixed PRIORITY_QUEUE phantom reference
```

For non-HBH projects, skip this phase — they don't have the GDD update rule.

### Phase 7 — Write the diff log

Save a dated diff log to `<project>/docs/drift-fixes-YYYY-MM-DD.md` (or the project root if no `docs/` folder exists). Structure:

```markdown
# Drift auto-fix pass — YYYY-MM-DD

Source audit: <findings file path>

## Applied (N)

### 1. <file path>
**Audit finding:** <quoted summary>
**Before:**
```
<exact original text>
```
**After:**
```
<exact replacement text>
```

### 2. ...

## Surfaced for user decision (M)

### 1. <file path>
<description> — flagged structural because <reason>

## Failed to apply (K)

### 1. <file path>
<description> — target text not found, possibly already changed

## Notes
<any other context>
```

If a drift-fixes file already exists for today's date, append a new "Pass 2 — HH:MM" section rather than overwriting.

## Safety rules

- **Never operate without an audit findings file.** Phase 1 has the refusal logic; obey it.
- **Always preview before applying.** Phase 3 is non-skippable, even if the user prompt sounds urgent.
- **Per-file diff log is mandatory.** Phase 7 produces it. Without the log, the run is not auditable and is a regression on the skill's promise.
- **Never delete files.** Even tombstoned ones. Deletion is always a structural decision.
- **Never edit `CLAUDE.md` in any project.** Handler files are deliberate.
- **Never edit anything in a "Locked Decisions" section.** Locked is locked.
- **Honor user exclusions from preview.** If they said "skip #3," don't apply #3, no matter how low-risk it looked.

## What not to do

- **Don't re-run the audit.** That's a different skill. This one consumes audit output, full stop.
- **Don't invent fixes the audit didn't suggest.** If the audit missed something, that's a feedback loop into improving `project-canonical-audit` — not a freelance edit here.
- **Don't bundle structural and low-risk into a single "applied" list.** The split is the whole point.
- **Don't silently fail.** If a fix can't be applied, log it as a failure in Phase 7 and surface it to the user in the final summary.
- **Don't bump the HBH GDD version pill for a no-op pass.** If no fixes landed, no version bump.

## Output

The skill writes:
1. Edits to the target files identified by the audit (low-risk only)
2. A dated diff log at `<project>/docs/drift-fixes-YYYY-MM-DD.md`
3. For HBH: a GDD version-pill bump + changelog entry (Phase 6)

The skill returns a concise summary to the user:
- N fixes applied
- M structural items surfaced (listed)
- K failed-to-apply items (listed)
- Path to the diff log
