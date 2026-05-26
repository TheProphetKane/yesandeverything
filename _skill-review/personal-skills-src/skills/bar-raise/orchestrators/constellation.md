# Orchestrator: constellation bar-raise

The constellation bar-raise runs every Monday morning (per the scheduling plan in `BAR_RAISE_ROADMAP.md` Phase 5). It produces the cross-project synthesis the dashboard banner at `yesandeverything.com/status/` reads from. This file is the procedure you (Claude) follow when invoked.

## Inputs

- `$today` -- ISO date in `YYYY-MM-DD`.
- The six project IDs and roots:
  - BR -> `X:\BrackishRising`
  - HBH -> `X:\HereBeHordes`
  - YaC -> `X:\YesAndChains`
  - Scheduler -> `X:\Scheduler`
  - YaA -> `X:\YesAndApothecary`
  - YaB -> `X:\YesAndBudget`

## Procedure

### Step 1: Wave 1 portfolio overview

Follow `waves/01_portfolio_overview.md`. Read each project's `status/data/<project>.json`, run a windowed git log across each repo, harvest the cross-project work-queue, read the latest canonical audits and the latest handler audit, and build the context blob defined in Wave 1's "Output" section.

Cache this blob in working memory. Every downstream step references it.

### Step 2: Wave 2 fan-out per project

For each of the six projects:

1. Follow `waves/02_per_project_discovery.md` against that project. Build the per-project context blob.
2. Cache it under the project's ID.

These six runs can be done sequentially or, if your Claude Code session supports it, in parallel via sub-agents (one per project). Parallel is preferred when available -- the constellation run is heavier than a single per-project bar-raise and benefits from the fan-out.

### Step 3: Wave 3 Tier-1 lenses per project

For each project (in the same six-project loop):

For each of the 11 files in `waves/03_tier1_lenses/`, apply the lens to the project using its Wave 2 context blob. Produce a finding or write "No findings."

The Wave 1 portfolio blob is also available here. Lens findings can reference cross-project patterns ("this is the third project showing release-pipeline drift this week"). Cross-references are valuable when present; lenses do not need to force them.

### Step 4: Wave 4 domain lenses per project

For each project, list the domain folders matching its `tags` array. For each matching folder, apply each lens.

If `waves/04_domain_lenses/` is empty (Phase 4 has not shipped), skip silently. Wave 5 still produces a useful synthesis from Tier-1 alone.

### Step 5: Wave 5 per-project synthesis

For each project, follow `waves/05_meta_synthesis.md`:

1. Aggregate the lens findings from Steps 3 and 4.
2. Pick the per-project verdict.
3. Write `<project_root>/docs/BAR_RAISE-$today.md`.
4. Update the project's `barRaise` block in `X:\YesAndEverything\status\data\<project>.json`.

Six Markdown reports and six JSON updates result.

### Step 6: Wave 5 portfolio synthesis

Now produce the constellation-level artifact. This uses the Wave 1 portfolio blob + the six per-project verdicts.

#### Pick the portfolio verdict

Apply in order; first match wins:

1. **stalled** -- two or more projects have `verdict = stalled` OR the cross-project work-queue has not drained an item in 14+ days.
2. **at-risk** -- three or more projects have `verdict = at-risk` or worse, OR there is a cross-cutting HIGH finding hitting four or more projects.
3. **needs-attention** -- one project at-risk, OR three or more needing-attention.
4. **healthy** -- zero at-risk projects and most projects at healthy.

#### Top portfolio actions

Aggregate every per-project HIGH action plus any cross-cutting pattern flagged in Wave 1. Rank by:

1. Cross-cutting (fixes one root cause across multiple projects).
2. Blocking (one project's open action is blocking another's release).
3. High-severity standalone.

Cap at 10 entries.

#### What got better / what got worse

Compare against the previous constellation report (most recent `X:\YesAndEverything\docs\CONSTELLATION-*.md`). Cross-project deltas:

- A project that moved from at-risk to healthy.
- A pattern that hit four projects last week and only one this week.
- A new pattern that did not exist last week (early-warning).

#### Write the Markdown

Path: `X:\YesAndEverything\docs\CONSTELLATION-$today.md`.

Format:

```markdown
# CONSTELLATION-YYYY-MM-DD

Portfolio verdict: <healthy | needs-attention | at-risk | stalled>
Projects: BR, HBH, YaC, Scheduler, YaA, YaB
Summary: <one paragraph, 3-5 sentences>

## Per-project verdicts

| Project | Verdict | Top finding |
|---|---|---|
| BR | healthy | ... |
| HBH | ... | ... |
| ... |

## Top portfolio actions

1. [cross-cutting / HIGH] (release-pipeline) Specific action sentence affecting multiple projects.
2. [HIGH] (BR / data-integrity) Specific action sentence.
3. ...

## Cross-cutting patterns

- (release-pipeline) Three projects shipped the same kind of FUSE-lock workaround this week; promote to a shared helper.
- (handler-drift) Two CLAUDE.md handlers drifted past tolerance; queue handler-audit and resolve.

## What got better since last constellation

- BR moved from at-risk to healthy after the v0.74.31 -> v0.74.46 rename pass closed the dual-path enemy churn.
- ...

## What got worse since last constellation

- (cost-economics) Scheduler worker invocation count up 3x; check the M2 auth path for an N+1 problem.
- ...

## Notes

<optional cross-project observations that do not fit the structure>
```

Atomic-write the file. Five-attempt retry. Verify the tail ends with a newline.

#### Write the constellation JSON

Path: `X:\YesAndEverything\status\data\constellation.json`.

Contract (locked in `BAR_RAISE_ROADMAP.md` Phase 3):

```json
{
  "generatedAt": "<ISO-8601 UTC now>",
  "portfolioVerdict": "<verdict>",
  "projects": ["BR", "HBH", "YaC", "Scheduler", "YaA", "YaB"],
  "summary": "<one paragraph from the Markdown>",
  "topActions": [
    { "project": "BR", "severity": "high", "label": "..." },
    { "project": "<cross-cutting>", "severity": "high", "label": "..." }
  ],
  "atRiskProjects": ["HBH"],
  "stalledProjects": [],
  "totalOpenActions": 17,
  "totalClosedSinceLastConstellation": 23
}
```

Atomic-write the JSON. Verify it parses. Five-attempt retry.

### Step 7: Stage + commit + push the YaE side

The constellation produces seven files YaE needs to publish:

1. `X:\YesAndEverything\docs\CONSTELLATION-$today.md`
2. `X:\YesAndEverything\status\data\constellation.json`
3-8. Six updated `X:\YesAndEverything\status\data\<project>.json` files

Run inside `X:\YesAndEverything`:

```
git add docs/CONSTELLATION-$today.md status/data/constellation.json status/data/*.json
git commit -m "constellation: bar-raise $today (<portfolio-verdict>)"
git push
```

Self-clear all `.git/*.lock` files first (the FUSE-mount hazard). After push, the dashboard reflects the new constellation banner within ~30 seconds.

### Step 8: Report back to the user

Surface in chat:

- Portfolio verdict.
- One-paragraph summary.
- Per-project verdict table.
- Top 3 cross-project actions.
- Link to the constellation report (`computer://X:\YesAndEverything\docs\CONSTELLATION-$today.md`).

Keep the chat reply terse. The full detail is in the Markdown.

## Failure modes

- **A project's CLAUDE.md is missing**: skip that project, flag in the constellation report's "Notes" section. Do not fail the whole run.
- **A project's status JSON is missing**: same; the project is not Phase-1-wired yet, log a warning.
- **Wave 5 per-project synthesis fails for one project**: write the Markdown for the other five, fill the missing project as "synthesis failed: <reason>" in the constellation summary.
- **JSON write fails after 5 retries**: write the Markdown anyway, log the JSON failure in the chat reply.
- **YaE push fails**: leave the files committed locally; report the failure; do not auto-rebase (the constellation report is a thin artifact; if push is jammed it is safer to surface for human review than to auto-merge).
- **Parallel sub-agents not available**: fall back to sequential per-project runs. The constellation run takes longer; acceptable trade-off.

## Voice

Match the per-project bar-raise voice. Solo-dev framing. No em dashes. Cite specific paths and version references. The cross-project patterns are the highest-value content in the constellation report; lead with them, not with the per-project verdict table.
