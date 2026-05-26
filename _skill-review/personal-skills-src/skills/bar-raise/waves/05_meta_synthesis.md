# Wave 5: Meta synthesis

Collapse every lens finding from Waves 3 + 4 into a single coherent report, pick a verdict, write the Markdown file, and stage the YaE-side JSON update.

## Inputs

- Wave 2 context blob (project state).
- Wave 3 outputs (11 lens findings, each either "No findings" or a finding block).
- Wave 4 outputs (0 to ~8 domain lens findings depending on the project's tags; empty if Phase 4 has not shipped).
- Previous bar-raise report (if `$projectRoot/docs/BAR_RAISE-*.md` exists from a prior run).

## Verdict picker

Apply in order; first match wins:

1. **stalled** -- no commits in the last 14 days AND backlog has P0 items open. Or: last bar-raise was 'at-risk' and nothing has changed since.
2. **at-risk** -- two or more HIGH-severity findings, OR one HIGH from `09_dependency` (external blocker), OR one HIGH from `11_strategic_kill_this`.
3. **needs-attention** -- one HIGH-severity finding, OR three or more MEDIUM, OR a regression vs the previous bar-raise (verdict downgraded one tier or worse).
4. **healthy** -- zero HIGH, fewer than three MEDIUM, and either no previous bar-raise or stable / improved vs the previous one.

The verdict goes into both the Markdown report and the JSON `barRaise.verdict` field.

## Top finding

One paragraph (3-5 sentences). What is the single most important thing for Nick to know about this project right now, distilled from the lens findings? If the verdict is `healthy`, the top finding can be "what to keep doing" rather than "what is wrong."

This paragraph also goes into the JSON `barRaise.topFinding` field.

## Action list

Aggregate every lens finding's "Suggested action" line. Rank:

1. All HIGH actions, in lens order (Architecture before Reliability before Security, etc.).
2. All MEDIUM actions, in lens order.
3. All LOW actions, in lens order (or omit if the report is already long).

For each action, note the lens it came from in parentheses.

The JSON `barRaise.actionsOpen` field counts HIGH + MEDIUM. LOW is excluded from that count.

## What got better / what got worse

Compare against the most recent prior bar-raise (if any). For each lens:

- A previous HIGH that is now MEDIUM, LOW, or absent counts as "got better."
- A previous absence or LOW that is now MEDIUM or HIGH counts as "got worse."
- Severity unchanged counts as neither.

Produce two bullet lists. If this is the first bar-raise for the project, write "First bar-raise for this project; no delta to report."

The JSON `barRaise.actionsClosed` field counts the "got better" deltas where a previous HIGH or MEDIUM action is now absent.

## Markdown report format

Output path: `$projectRoot/docs/BAR_RAISE-$today.md`.

```markdown
# BAR_RAISE-YYYY-MM-DD: <project display name>

Verdict: <healthy | needs-attention | at-risk | stalled>
Run: per-project
Lenses applied: Tier-1 = 11, Domain = <N> (<list>)

## Top finding

<one paragraph>

## Findings by lens

### Architecture
- **Severity**: <severity>
- **Finding**: <one sentence>
- **Evidence**: <paths / function names / commits>
- **Suggested action**: <what to do>

### Reliability
<same shape, or "No findings.">

### Security
...

(... all 11 Tier-1 lenses, then domain lenses in the same shape ...)

## Action items

1. [HIGH] (architecture) Specific action sentence.
2. [HIGH] (reliability) Specific action sentence.
3. [MED] (maintainability) Specific action sentence.
4. ...

## What got better since last review

- (security) Token-leak risk on the .admin-token path closed by 0.33.1 move to local Task Scheduler.
- ...

## What got worse since last review

- (performance) FoW stamping on wide maps is regressing; new MEDIUM finding.
- ...

## Notes

<optional: anything else worth flagging that does not fit the lens structure>
```

## Write procedure

1. Build the Markdown content as a Python multiline string.
2. Use atomic-write-with-readback (the Python pattern from the FUSE-truncation memory). Five-attempt retry. Verify the tail ends with a newline.
3. Read the current `X:\YesAndEverything\status\data\$project.json`. Mutate ONLY the `barRaise` block. Preserve every other field.
4. Atomic-write the JSON back. Verify it parses.
5. Stage the JSON in YaE's git index: `git -C X:\YesAndEverything add status/data/$project.json`. Do not commit; let the next push pick it up.

## Voice

Solo-dev. No em dashes. Cite specific paths. Severity labels in square brackets. Action sentences are imperative ("Add a test for the dedupe constraint", not "It would be good to add tests").

If the report runs long (>10 KB), the synthesis is doing too much; trim the LOW findings first.
