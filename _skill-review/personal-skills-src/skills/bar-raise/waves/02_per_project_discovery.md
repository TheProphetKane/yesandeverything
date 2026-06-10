# Wave 2: Per-project discovery

Build the situational context for one project so Waves 3 + 4 have something concrete to operate on. The discovery output is internal (working memory), not written to disk.

## Inputs

- `$project` (short ID).
- `$projectRoot` (absolute path).

## What to harvest

Read each of the following and capture the salient state. Be tight: a one-sentence summary per source unless the source has a critical finding to flag.

### Canonical doc

Pick the right canonical for the project:

- HBH / BR -> `docs/GDD.html`. Read the version pill, the active milestone (from the Roadmap tab), the most recent Locked Decisions, and the Open Questions tab.
- YaC -> `PROJECT_SPEC.md` (vision) + `ROADMAP.md` (current state) + `docs/launch-checklist-1.0.md` (active queue) + the most recent `DECISIONS_NEEDED.md` entries.
- Scheduler -> `docs/DESIGN.md`. Read the version, milestone, open questions.
- YaA -> `PROJECT_SPEC.md`. Read the locked decisions and the active milestone in `CHANGELOG.md`.
- YaB -> `docs/DESIGN.md` + `docs/DECISIONS.md` + `BACKLOG.md`. Read the active milestone and any locked decisions.

Capture: current version, active milestone (id + label + status), the three most recent locked decisions, the three most pressing open questions.

### Handler

Read `$projectRoot/CLAUDE.md`. Capture: voice rules specific to this project, FUSE-truncation flags, lock-signal phrases, and any "hard-won hazards" sections. Lenses reference these; do not re-read CLAUDE.md inside each lens.

### Backlog

Read `BACKLOG.md` (when present). Capture: the count of P0/P1/P2/P3 items, the top three P0 items, the most-recent DONE entry. If no BACKLOG.md exists, note that and proceed.

### Changelog

Read `CHANGELOG.md` (when present). Capture: the last five entries' versions + dates + headlines. Look for cadence signals (3 patches in one day implies churn; 14 days of silence implies stall).

### Recent commits

Run `git -C $projectRoot log -20 --pretty=format:'%h %cI %s'`. Capture the message shape (are commits being squashed properly? are they version-tagged?), the cadence (one per day vs one per week), and any "WIP" / "fix" / "revert" patterns that suggest hot debugging.

### Working tree

Run `git -C $projectRoot status --porcelain`. Capture clean vs dirty. If dirty, note the number of files and a representative subset.

### Latest audit reports

Find the most recent `docs/CANONICAL_AUDIT-*.md` and `docs/HANDLER_AUDIT-*.md` (in YaE for handler audits). Capture the findings counts (high/medium/low) and the top three suggestions. Lenses reference these; do not re-derive findings from scratch.

### Latest bar-raise (if any)

Find the most recent `docs/BAR_RAISE-*.md` in the project. Capture the previous verdict, the top finding, and the action list. Wave 5 uses this for the "what got better / what got worse" delta.

### Tags

The project's `tags` array (from `status/data/<project>.json`) determines which Wave 4 domain lenses apply. Cache it.

## Output (working memory)

Assemble the harvest into the structured blob defined in `waves/CONTEXT_CONTRACT.md`. Every Tier-1 and domain lens subagent receives that blob verbatim; lenses do not re-read the filesystem for anything the blob already carries. That keeps lens runs cheap, consistent, and comparable across runs.

Include the previous run state (`barRaise` block from `X:\YesAndEverything\status\data\<project>.json`) as `previous_run`. If that JSON fails to parse, pull the last good version from YaE git history and flag the corruption; never feed lenses a corrupt blob field.
