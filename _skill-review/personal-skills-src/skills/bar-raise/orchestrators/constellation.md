# Orchestrator: constellation bar-raise

The constellation bar-raise runs every Monday morning (per the scheduling plan in `BAR_RAISE_ROADMAP.md` Phase 5). It produces the cross-project synthesis the dashboard banner at `yesandeverything.com/status/` reads from. This file is the procedure you (Claude) follow when invoked.

Same model as the per-project run, applied portfolio-wide: every lens is an independent subagent returning a structured report, the per-project synthesis weighs all dimensions with no single-lens veto, and the portfolio verdict is a weighted blend of the per-project health scores rather than a count of projects in any one state.

## Inputs

- `$today` -- ISO date in `YYYY-MM-DD`.
- The six project IDs and roots:
  - BR -> `X:\BrackishRising`
  - HBH -> `X:\HereBeHordes`
  - YaC -> `X:\YesAndChains`
  - Scheduler -> `X:\YesAndScheduler`
  - YaA -> `X:\YesAndApothecary`
  - YaB -> `X:\YesAndBudget`

## Procedure

### Step 1: Wave 1 portfolio overview

Follow `waves/01_portfolio_overview.md`. Read each project's `status/data/<project>.json`, run a windowed git log across each repo, harvest the cross-project work-queue, read the latest canonical audits and the latest handler audit, and build the context blob defined in Wave 1's "Output" section.

Cache this blob in working memory. Every downstream step references it.

### Step 2: Wave 2 fan-out per project

Spawn one discovery subagent per project, in a single parallel batch of six. Each follows `waves/02_per_project_discovery.md` against its project and returns the per-project context blob in the `waves/CONTEXT_CONTRACT.md` shape. Cache each blob under the project's ID.

If parallel subagents are not available, fall back to sequential discovery; slower but identical output.

### Step 3: Wave 3 Tier-1 lens fan-out per project

For each project, spawn one subagent per Tier-1 lens template in `waves/03_tier1_lenses/` (12 lenses). Batch as widely as the session allows; at minimum all 12 lenses for a project go out in one parallel batch, and batching across projects is better.

Each subagent receives the project's Wave 2 context blob (`waves/CONTEXT_CONTRACT.md` shape), its lens template file, and `waves/03_tier1_lenses/REPORT_CONTRACT.md`, and returns the contract-shaped report for its one dimension. No verdicts, no cross-lens ranking.

The Wave 1 portfolio blob is also available as input. Lens findings can reference cross-project patterns ("this is the third project showing release-pipeline drift this week"). Cross-references are valuable when present; lenses do not need to force them.

A report that comes back malformed gets one re-spawn; on a second failure, exclude that lens from that project's weighted mean and flag the gap.

### Step 4: Wave 4 domain lens fan-out per project

For each project, map its `tags` array to domain folders under `waves/04_domain_lenses/` and fan out one subagent per matching lens file, same inputs and same contract.

If `waves/04_domain_lenses/` is empty (Phase 4 has not shipped), skip silently. Wave 5 still produces a useful synthesis from Tier-1 alone.

### Step 5: Wave 5 per-project synthesis

For each project, follow `waves/05_meta_synthesis.md` against its full report set:

1. Compute the weighted health score (base weight 1.0 x clamped `lens_weights` multiplier from that project's `.project-context.json`).
2. Pick the per-project verdict from the health bands, applying the BLOCK floor where a lens returned `blocking: true`.
3. Write `<project_root>/docs/BAR_RAISE-$today.md` (BLOCK banner, top finding, tensions, lens scores, action list ranked by impact x confidence).
4. Update the project's `barRaise` block in `X:\YesAndEverything\status\data\<project>.json`, including the run-state fields (`health`, `lensScores`, `openFindings`, `tensionsOpen`).
5. Auto-enqueue new blocking/HIGH/MEDIUM findings with finding-id dedupe, per the Wave 5 rules.

Six Markdown reports, six health scores, and six JSON updates result. The per-project skip-unchanged gate does not apply here; the weekly constellation pass is always full, which is also what resets the 7-day full-pass floor.

### Step 6: Wave 5 portfolio synthesis

Now produce the constellation-level artifact. This uses the Wave 1 portfolio blob + the six per-project health scores and verdicts.

#### Portfolio health and verdict

Portfolio health = mean of the six per-project health scores (all projects weigh equally; a lens excluded from one project's mean simply does not participate there).

The portfolio verdict comes from bands over that mean, never from a count of projects in any one state and never from a single project's verdict:

- **healthy** -- portfolio health >= 80 and no project has an open BLOCK.
- **needs-attention** -- portfolio health 65-79.
- **at-risk** -- portfolio health 50-64, OR any project has an open BLOCK (the same factual floor as per-project: a portfolio with an open hard-rule breach cannot be called healthy).
- **stalled** -- portfolio health < 50, OR the cross-project work-queue has not drained an item in 14+ days.

#### Top portfolio actions

Pool every per-project HIGH and MEDIUM finding plus any cross-cutting pattern flagged in Wave 1 into one list. Rank lens-agnostically and project-agnostically by priority score:

1. Effective impact: for a cross-cutting action whose one root cause fixes N projects, `effective_impact = min(5, impact + (N - 1))`. Single-project actions keep their stated impact.
2. Priority score = `effective_impact x confidence`, descending.
3. Tie-break by severity, then effective impact.

There is no categorical "cross-cutting always first" override; a high-impact single-project action can outrank a low-impact cross-cutting one. Chronic findings (`runsOpen >= 5` on any project) are always included, tagged `[CHRONIC xN]`; a finding that has survived five daily runs has earned portfolio attention. Cap at 10 entries. Lens and project appear only as provenance tags.

#### What got better / what got worse

Compare against the previous constellation report (most recent `X:\YesAndEverything\docs\CONSTELLATION-*.md`). Cross-project deltas:

- A project whose health score moved 10+ points either way.
- A pattern that hit four projects last week and only one this week.
- A new pattern that did not exist last week (early-warning).

#### Write the Markdown

Path: `X:\YesAndEverything\docs\CONSTELLATION-$today.md`.

Format:

```markdown
# CONSTELLATION-YYYY-MM-DD

> **BLOCK: <project>: <breached hard rule>** -- <evidence>. Portfolio verdict floored at at-risk until resolved.

(BLOCK banner only when some project has an open BLOCK; omit otherwise.)

Portfolio verdict: <healthy | needs-attention | at-risk | stalled>
Portfolio health: <int 0-100> (mean of six per-project health scores)
Projects: BR, HBH, YaC, Scheduler, YaA, YaB
Summary: <one paragraph, 3-5 sentences>

## Per-project verdicts

| Project | Health | Verdict | Top finding |
|---|---|---|---|
| BR | 86 | healthy | ... |
| HBH | ... | ... | ... |
| ... |

## Top portfolio actions

1. [P20] [HIGH] Specific action sentence affecting four projects. (release-pipeline, cross-cutting x4)
2. [P16] [HIGH] Specific action sentence. (BR / data-integrity)
3. ...

## Cross-cutting patterns

- (release-pipeline) Three projects shipped the same kind of FUSE-lock workaround this week; promote to a shared helper.
- (handler-drift) Two CLAUDE.md handlers drifted past tolerance; queue handler-audit and resolve.

## Tensions and tradeoffs

- <project>: security <-> solo-tool-ux: <one-line conflict>. Resolution: <balanced action>.
- <or "No cross-dimension tensions this run.">

## What got better since last constellation

- BR health 62 -> 86 after the v0.74.31 -> v0.74.46 rename pass closed the dual-path enemy churn.
- ...

## What got worse since last constellation

- (cost-economics) Scheduler worker invocation count up 3x; check the M2 auth path for an N+1 problem.
- ...

## Notes

<optional cross-project observations that do not fit the structure, including any lens exclusions>
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

The constellation produces eight files YaE needs to publish:

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

- Portfolio verdict + portfolio health.
- Any open BLOCK, called out first.
- One-paragraph summary.
- Per-project health/verdict table.
- Top 3 portfolio actions.
- Link to the constellation report (`computer://X:\YesAndEverything\docs\CONSTELLATION-$today.md`).

Keep the chat reply terse. The full detail is in the Markdown.

## Failure modes

- **A project's CLAUDE.md is missing**: skip that project, flag in the constellation report's "Notes" section, and compute the portfolio mean over the remaining projects. Do not fail the whole run.
- **A project's status JSON is missing**: same; the project is not Phase-1-wired yet, log a warning.
- **A lens subagent fails twice for one project**: exclude that lens from that project's mean, flag, continue.
- **Wave 5 per-project synthesis fails for one project**: write the Markdown for the other five, fill the missing project as "synthesis failed: <reason>" in the constellation summary, and exclude it from the portfolio mean.
- **JSON write fails after 5 retries**: write the Markdown anyway, log the JSON failure in the chat reply.
- **YaE push fails**: leave the files committed locally; report the failure; do not auto-rebase (the constellation report is a thin artifact; if push is jammed it is safer to surface for human review than to auto-merge).
- **Parallel subagents not available**: fall back to sequential per-project, per-lens runs with the same contract-shaped reports. The constellation run takes longer; acceptable trade-off.

## Voice

Match the per-project bar-raise voice. Solo-dev framing. No em dashes. Cite specific paths and version references. The cross-project patterns and tensions are the highest-value content in the constellation report; lead with them, not with the per-project verdict table.
