# Wave 5: Meta synthesis

Collect every lens report from Waves 3 + 4, compute the weighted health score, pick the verdict from score bands, surface tensions between dimensions, write the Markdown file, and stage the YaE-side JSON update.

The synthesis weighs all dimensions together. No single lens decides the verdict and no lens outranks another by default. Security does not override usability and usability does not override security; every dimension gets checked on its own merits, and no one goal prevents another from succeeding. The job here is to balance the dimensions and surface the tradeoffs, not to let one win silently. The only exception is a BLOCK, which is a factual hard-rule gate, not a goal winning over another goal.

## Inputs

- Wave 2 context blob (project state).
- Wave 3 reports: 12 Tier-1 lens reports in the `waves/03_tier1_lenses/REPORT_CONTRACT.md` shape.
- Wave 4 reports: 0 to ~8 domain lens reports in the same shape (empty if Phase 4 has not shipped).
- `lens_weights` from `$projectRoot/.project-context.json` (schema v1.1; optional map of lens id to emphasis multiplier).
- Previous run state from the status JSON `barRaise` block (`health`, `lensScores`, `openFindings`, `tensionsOpen`); fall back to the most recent prior `BAR_RAISE-*.md` only when that block is absent.

## Health score

1. Each lens weight = `1.0 x clamp(lens_weights[lens], 0.5, 2.0)`. Absent entries mean 1.0. The clamp guarantees no lens can be zeroed out and none can dominate.
2. Project health = weighted mean of all lens `dimension_score`s, rounded to an integer: `health = round(sum(weight_i x score_i) / sum(weight_i))`.
3. Domain lens reports participate at weight 1.0 unless `lens_weights` names them.
4. A lens that failed to return a usable report after one re-spawn is excluded from the mean (never counted as zero) and flagged in Notes.

## BLOCK handling

If any report has `blocking: true`:

- Put a BLOCK banner at the very top of the Markdown report, above the verdict line, naming the breached hard rule and the evidence.
- Force the verdict to `needs-attention`. A project with an open hard-rule breach is broken by definition, whatever its health score says.
- Do not otherwise distort the weighted blend. The BLOCK gates the verdict; it does not rewrite any score.

## Verdict bands

Verdict vocabulary (revised 2026-06-10): a project that works is never "needs-attention" just because it carries polish debt. Attention is reserved for actual breakage. The verdict comes from breakage signals plus the health score, never from any single lens's opinion:

- **working** -- no breakage signals, health >= 65, and the project is substantially done (`completion.pct >= 90` in `.project-context.json`) or live and functioning for its users.
- **in-progress** -- no breakage signals; the project is being built. Doc drift, missing tests, and polish debt are normal in-progress findings and belong in the action list, not the verdict.
- **needs-attention** -- something is actually broken: any open BLOCK, OR a HIGH finding with live breakage (runtime bug, failing release pipeline, data-loss exposure, corrupted shipped artifact), OR health < 50.
- **stalled** -- no commits in the last 14 days AND a P0 backlog item open. Stalled overrides in-progress, never needs-attention.

For deltas against pre-revision runs, map healthy -> working and at-risk -> needs-attention.

The verdict goes into both the Markdown report and the JSON `barRaise.verdict` field.

## Top finding

One paragraph (3-5 sentences). The single most important thing to know about this project right now, distilled from the lens reports. If the verdict is `healthy`, the top finding can be "what to keep doing" rather than "what is wrong."

This paragraph also goes into the JSON `barRaise.topFinding` field.

## Tensions and tradeoffs

This section is the point of the whole model. It is first-class; never skip it when conflicts exist.

1. Scan every finding's `tensions_with` list.
2. Also scan for opposing `suggested_action`s across lenses (one lens wants a gate added on a path, another wants friction removed from the same path), even when neither finding declared the tension.
3. For each conflict:
   - Name the lenses in tension.
   - Describe the conflict in one line.
   - Propose a balanced resolution that does not sacrifice either dimension to zero. "Do the token-handling fix but keep the one-command release flow by scripting it" beats "security wins."

If no tensions exist, write "No tensions between dimensions this run."

## Action list

Pool every finding from every lens into one list. Rank lens-agnostically:

1. Priority score = `impact x confidence`, descending.
2. Tie-break by severity (high > medium > low), then by impact.

Never order by which lens emitted the action. The lens appears only as a provenance tag in parentheses at the end of the line.

The JSON `barRaise.actionsOpen` field counts HIGH + MEDIUM findings. LOW is excluded from that count.

A finding open for 5+ consecutive runs carries a `[CHRONIC xN]` tag on its action line (see Run state below).

## What got better / what got worse

Compare against the previous run state (`lensScores` + `openFindings` from the status JSON). The comparison is numeric; never re-parse the previous Markdown report when the JSON state exists. Per lens:

- A previous HIGH or MEDIUM finding id now absent, or a lens score up 10+ points vs the previous `lensScores`, counts as "got better."
- A new HIGH or MEDIUM finding id, or a lens score down 10+ points, counts as "got worse."
- Anything else counts as neither.

Produce two bullet lists. If this is the first bar-raise for the project, write "First bar-raise for this project; no delta to report."

The JSON `barRaise.actionsClosed` field counts the "got better" deltas where a previous HIGH or MEDIUM action is now absent.

## Run state, finding aging, and auto-enqueue

The synthesis maintains machine state in the status JSON so the next run never re-parses old Markdown and the queue never receives duplicates. All fields are additive to the locked `barRaise` contract; the dashboard ignores fields it does not know.

- `health`: this run's weighted health score.
- `lensScores`: map of lens id to this run's `dimension_score`. The numeric basis for the next run's deltas; the dashboard can sparkline it.
- `openFindings`: list of `{ id, severity, priority, runsOpen, firstSeen }` for every open HIGH and MEDIUM finding. A finding carried from the previous run increments `runsOpen`; a new one starts at 1 with `firstSeen` set to the run date.
- `tensionsOpen`: list of `{ lenses: [a, b], runsSeen }` for tensions surfaced this run.

Aging rules:

- `runsOpen >= 5` marks a finding chronic. Chronic findings get a `[CHRONIC xN]` tag in the action list and are escalated into the next constellation report instead of being silently re-reported daily.
- A tension with `runsSeen >= 3` is no longer a tradeoff to re-balance; it is an undecided decision. Flag it in the report as "promote via adr-promoter" so it lands in the project's decision log once.

Auto-enqueue (closes the report -> queue -> drift-auto-fix loop):

- `blocking: true` -> queue priority P0. P0 pauses the drain for review, which is right for a hard-rule breach.
- HIGH -> P1. MEDIUM -> P2. LOW is not queued.
- Each queue item carries the finding id. Before enqueuing, check the previous run's `openFindings` and the current `X:\YesAndEverything\.work-queue.json` for that id; if it is present in either, skip. The daily run must never enqueue the same finding twice.
- Enqueue through the work-queue-runner add flow so the queue file's shape and triage log stay consistent.

## Markdown report format

Output path: `$projectRoot/docs/BAR_RAISE-$today.md`.

```markdown
# BAR_RAISE-YYYY-MM-DD: <project display name>

> **BLOCK: <breached hard rule>** -- <evidence>. Verdict forced to needs-attention until resolved.

(The BLOCK banner appears only when a lens returned `blocking: true`; omit the line entirely otherwise.)

Verdict: <working | in-progress | needs-attention | stalled>
Health: <int 0-100> (weighted mean across <N> lenses)
Run: per-project
Lenses applied: Tier-1 = 12, Domain = <N> (<list>)

## Top finding

<one paragraph>

## Tensions and tradeoffs

- security <-> solo-tool-ux: <one-line conflict>. Resolution: <balanced action>.
- <or exactly: "No tensions between dimensions this run.">

## Lens scores

| Lens | Score | Weight | Findings |
|---|---|---|---|
| architecture | 84 | 1.0 | 1 |
| security | 65 | 1.5 | 2 |
| ... | | | |

## Findings by lens

### architecture
- **[architecture-01] [HIGH, impact 4, confidence 5]** <one sentence>
  - Evidence: <paths / function names / commits>
  - Suggested action: <imperative sentence>
  - Tensions with: <lens ids, or "none">

### reliability
No findings. (score 92)

(... all 12 Tier-1 lenses, then domain lenses in the same shape ...)

## Action items

1. [P20] [HIGH] Specific action sentence. (security)
2. [P16] [HIGH] Specific action sentence. (architecture)
3. [P12] [MED] Specific action sentence. (maintainability)
4. ...

## What got better since last review

- (security) Token-leak risk on the .admin-token path closed by 0.33.1 move to local Task Scheduler.
- ...

## What got worse since last review

- (performance) FoW stamping on wide maps is regressing; new MEDIUM finding.
- ...

## Notes

<optional: anything else worth flagging that does not fit the lens structure, including any lens that failed to report>
```

## Write procedure

Verify before overwriting, always. A corrupt input never propagates and a bad write never replaces a good file.

1. Read the current `X:\YesAndEverything\status\data\$project.json`. If it fails to parse (truncation, NUL padding, cut strings), do NOT mutate it in place and do NOT rebuild from nulls: restore the last good version from YaE git history (`git -C X:\YesAndEverything show HEAD:status/data/$project.json`) first, then apply this run's update on top. Note the restoration in the report's Notes.
2. Build the Markdown as a Python multiline string. Build the updated JSON in memory and `json.loads` it BEFORE any write. Never write content that does not parse.
3. Write both files through atomic-write-with-readback: write a tmp sibling, fsync, replace, then reopen a fresh handle and verify. Verification means byte-compare AND re-parse (JSON) or tail-check (Markdown ends with a newline; no NUL bytes anywhere). The FUSE cache can echo back the bytes just written while the disk holds a truncated file, so the re-parse of a fresh read is the real check, not the byte compare. Five-attempt retry.
4. Mutate ONLY the `barRaise` block. Preserve every other field. The locked fields keep their shape (`latestReportPath`, `latestReportAt`, `verdict`, `topFinding`, `actionsOpen`, `actionsClosed`); `health`, `lensScores`, `openFindings`, `tensionsOpen` are additive inside the same block.
5. Stage the JSON in YaE's git index: `git -C X:\YesAndEverything add status/data/$project.json`. Do not commit; let the next push pick it up.
6. Final gate: re-validate every status JSON touched this run (parse, no NUL bytes, closing brace). `X:\YesAndEverything\scripts\check-status-json.ps1` is the Windows-side equivalent and runs as Step 0 of the YaE release; the run is not done until the same checks pass here.

## Voice

Solo-dev. No em dashes. Cite specific paths. Severity labels in square brackets. Action sentences are imperative ("Add a test for the dedupe constraint", not "It would be good to add tests").

If the report runs long (>10 KB), the synthesis is doing too much; trim the LOW findings first.
