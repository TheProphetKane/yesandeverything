---
name: bar-raise
description: Run a periodic deep-review against one project or the whole portfolio. Use whenever the user says "bar-raise", "deep audit", "weekly review", "constellation review", "run the lenses", "raise the bar on X", or when a scheduled task fires with a `bar-raise-*` task name. Produces a Markdown findings report at `docs/BAR_RAISE-YYYY-MM-DD.md` in the target project and updates the per-project status JSON under `status/data/`. Five-wave structure covering portfolio overview, per-project discovery, Tier-1 lenses fanned out as one independent subagent per lens returning structured reports, tag-matched domain lenses fanned out the same way, then weighted no-veto meta-synthesis: every dimension is scored on its own merits, the verdict comes from a weighted health score with no single lens able to veto or dominate, and tensions between dimensions are surfaced and balanced. Two orchestrators, `per_project.md` for one project and `constellation.md` for the whole portfolio. Driven by the BAR_RAISE_ROADMAP doc in YaE.
---

## Step 0: Load project context (schema v1.1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1.1; v1 files remain valid; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `tags` -- which domain lenses apply to this project
- `canonical_docs`, `backlog_path`, `changelog_path` -- what to walk
- `hazard_catalog` -- load the per-project hazards file
- `hard_rules` -- the ONLY source of BLOCK flags; a lens marks `blocking: true` solely for a breach of one of these
- `lens_weights` -- optional per-project emphasis multipliers for the weighted synthesis (clamped 0.5 to 2.0; absent = all 1.0)
- `scheduled_tasks` + `scheduled_tasks_external` -- verify the audit-loop is wired

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# Bar-raise (periodic deep review)

The bar-raise is a structured, lens-driven review of one project (or the whole portfolio) that produces a Markdown findings report plus a JSON status update for the dashboard at `yesandeverything.com/status/`. Per-project review runs daily; constellation review runs weekly. Output is read-only: the skill never modifies code. The drift-auto-fix and work-queue-runner skills handle that downstream.

## Why this exists

The existing audit skills (`project-canonical-audit`, `handler-audit`, `backlog-hygiene`) each answer one narrow question. The bar-raise is the structured-review equivalent of the cross-project digest: it walks every dimension of project health (architecture, reliability, security, performance, data integrity, maintainability, solo-tool UX, cost, dependencies, observability, strategic fit, compliance / data stewardship) in one pass, with severity-graded findings and a single synthesized verdict per project. It is the daily heartbeat for "is this project healthy" that the dashboard surfaces visually.

It mirrors a structure a friend deployed on their own home lab: 5 waves of analysis, parallel fan-out across N projects, lens templates that each ask one sharp question and return one structured report. The shape transfers; the domains rewrite for Nick's portfolio.

## When to use this

Trigger on:

- "Bar-raise BR" / "bar-raise YaC" / "bar-raise HBH" (per-project)
- "Bar-raise all" / "constellation review" / "weekly review" (constellation)
- "Run the lenses against <project>"
- "Deep audit <project>" (when the user means structured, not the existing project-canonical-audit)
- "Raise the bar on <project>"
- Any scheduled task whose name starts `bar-raise-` (e.g. `bar-raise-br-daily`)

Do NOT trigger on:

- "Audit the GDD vs code" -> that is `project-canonical-audit`.
- "Audit the handlers" -> that is `handler-audit`.
- "Sweep the backlog" -> that is `backlog-hygiene`.
- "Status digest" / "what changed this week" -> that is `cross-project-status-digest`.

The bar-raise is the broader, slower, lens-structured pass. The existing skills are sharper and cheaper. If the user is asking a narrow question, prefer the narrower skill.

## The orchestrators

This skill ships two orchestrators. Pick based on the request:

- **`orchestrators/per_project.md`** -- per-project bar-raise. Runs Wave 2 (discovery) + Wave 3 (Tier-1 lens fan-out) + Wave 4 (matching domain lens fan-out) + Wave 5 (weighted synthesis) against one named project. Output: `<project>/docs/BAR_RAISE-YYYY-MM-DD.md` + `X:\YesAndEverything\status\data\<project>.json` update. Default target when the user names a single project. Use this for scheduled `bar-raise-<project>-daily` runs.
- **`orchestrators/constellation.md`** -- portfolio bar-raise. Runs Wave 1 (portfolio overview) + Wave 2 fanned out across all six projects in parallel + Wave 3 (Tier-1 lens fan-out per project) + Wave 4 (domain lens fan-out per project) + Wave 5 synthesis at both per-project and portfolio level, with the portfolio verdict computed as a weighted blend of the six per-project health scores. Output: a per-project `BAR_RAISE-YYYY-MM-DD.md` for each project + `X:\YesAndEverything\docs\CONSTELLATION-YYYY-MM-DD.md` + `X:\YesAndEverything\status\data\constellation.json`. Use this for scheduled `bar-raise-constellation-weekly` runs.

When the user says "bar-raise BR", the per_project orchestrator fires against BR. When the user says "bar-raise all" or "constellation review", the constellation orchestrator fires.

## The five waves

- **Wave 1: Portfolio overview** (`waves/01_portfolio_overview.md`). Constellation only. Cross-project view: which projects are healthy, which need attention, where the work-queue is bottlenecked, where the portfolio is over- or under-invested.
- **Wave 2: Per-project discovery** (`waves/02_per_project_discovery.md`). For each project: read its canonical doc, harvest the current milestone state, the last N commits, the backlog top, the outstanding open questions. Builds the situational context blob (shape locked in `waves/CONTEXT_CONTRACT.md`) for Waves 3 and 4 to operate on.
- **Wave 3: Tier-1 lenses** (`waves/03_tier1_lenses/`). Twelve lenses applied to every project regardless of domain: architecture, reliability, security, performance, data-integrity, maintainability, solo-tool-ux, cost-economics, dependency, observability, strategic-kill-this, compliance-data-steward. Each lens spins up as its own subagent, inspects the project for that one dimension, and returns the structured report defined in `waves/03_tier1_lenses/REPORT_CONTRACT.md`. All lenses for a project go out in one parallel batch.
- **Wave 4: Domain lenses** (`waves/04_domain_lenses/`). Tag-matched per project. ~22 lenses across 9 domains: game-design, static-site, cloud-edge, finance-product, generative-art, PWA, orchestration, release-pipeline, public-voice. Fanned out as subagents the same way, returning the same contract shape. Populated in Phase 4 of the bar-raise buildout; in Phase 2 this directory is empty and Wave 4 skips.
- **Wave 5: Meta synthesis** (`waves/05_meta_synthesis.md`). Weighs every lens report into a weighted health score (base weight 1.0 x clamped per-project `lens_weights` multiplier), picks the verdict from health-score bands (healthy / needs-attention / at-risk / stalled) with no single lens able to decide it, surfaces a first-class Tensions and tradeoffs section, ranks actions by impact x confidence regardless of source lens, applies the BLOCK floor where a hard rule is breached, and produces the what-got-better / what-got-worse delta numerically from the previous run's `lensScores`. Maintains run state in the JSON (`health`, `lensScores`, `openFindings` with `runsOpen` aging, `tensionsOpen`) and auto-enqueues new blocking/HIGH/MEDIUM findings with finding-id dedupe. Writes the Markdown report and updates the JSON.

## Synthesis model

- Every Tier-1 and domain lens runs as an independent subagent spawned from its template file. Each inspects the project for its one dimension and returns the structured report in `waves/03_tier1_lenses/REPORT_CONTRACT.md`. Lenses are not separately installed skills.
- The orchestrator weighs all dimensions with no veto. Each lens has base weight 1.0, multiplied by the optional per-project `lens_weights` emphasis multiplier from `.project-context.json`, clamped to 0.5-2.0 so no lens can be zeroed out and none can dominate. Project health = weighted mean of the lens dimension scores. Security does not automatically override usability, and usability does not override security; every dimension gets checked on its own merits, and no one goal prevents another from succeeding.
- Tensions are surfaced and balanced, not resolved by hierarchy. Conflicting suggested actions across lenses land in a first-class "Tensions and tradeoffs" section with a balanced resolution that does not sacrifice either dimension to zero.
- BLOCK is the only objective gate. A `blocking: true` flag is reserved for a factual breach of a `hard_rules` entry in `.project-context.json` (a committed secret, a locked-decision violation). The optional `hard_rule_checks` list pairs each checkable rule with a one-line verification command the security and compliance lenses run. A BLOCK banners the top of the report and floors the verdict at `at-risk`; it does not otherwise distort the weighted blend, and it is never used for goal-vs-goal tradeoffs.
- Run state is machine-readable. Each run writes `health`, `lensScores`, `openFindings`, and `tensionsOpen` into the status JSON (additive to the locked contract), so deltas are numeric, findings age (chronic at 5+ runs escalates to the constellation), recurring tensions get flagged for adr-promoter, and unchanged projects take a cheap carry-forward pass instead of a full fan-out (per_project Step 2.5).

## Output contract

Two artifacts per per-project run:

1. `<project>/docs/BAR_RAISE-YYYY-MM-DD.md` -- the full findings report. Shape locked in `waves/05_meta_synthesis.md`.
2. `X:\YesAndEverything\status\data\<project>.json` -- updated `barRaise` block:

```json
{
  "barRaise": {
    "latestReportPath": "docs/BAR_RAISE-2026-05-26.md",
    "latestReportAt": "2026-05-26T06:00:00Z",
    "verdict": "healthy | needs-attention | at-risk | stalled",
    "topFinding": "one-paragraph summary",
    "actionsOpen": <int>,
    "actionsClosed": <int>
  }
}
```

Additive run-state fields (`health`, `lensScores`, `openFindings`, `tensionsOpen`) ride inside the `barRaise` block alongside the locked six; the dashboard ignores fields it does not know.

The JSON write uses the Python atomic-write-with-readback pattern, and verification means re-parsing a fresh read, not just byte-comparing (a stale FUSE cache can echo back what was written while the disk holds a truncated file). If the existing JSON fails to parse before the update, restore the last good version from YaE git history first; never mutate a corrupt file in place. The Markdown write uses the same pattern with a tail check. Both are mandatory; the bar-raise never writes through the Edit tool on this FUSE mount.

## Hard rules

1. **Read-only on code.** The bar-raise never modifies code. It writes the findings report, the JSON status update, and work-queue items for new findings. Anything code-touching is a queue item for drift-auto-fix.
2. **One dimension per lens.** Each lens reports only on its own dimension. Multiple findings are allowed; every finding carries evidence plus impact (1-5) and confidence (1-5). A lens with nothing to flag returns an empty findings list and a high dimension score. A lens never proposes a verdict and never ranks itself against other lenses.
3. **Severity is three-tier.** `high` / `medium` / `low`. Anything that needs "critical" is also high and the action list flags it.
4. **Solo-dev voice.** The report is a public-adjacent artifact (lands in `<project>/docs/`). No em dashes, no "I'd be happy to", no AI vocabulary. Same voice rules as the project's CLAUDE.md.
5. **FUSE atomic-write for all output files.** Never trust Edit on this mount; always write tmp + os.rename + readback.
6. **Cite specific evidence.** Every finding above LOW severity cites at least one path or commit ref. Lenses that surface vague "the architecture feels off" without specifics get downgraded or dropped.

## Severity scale

| Tier | Meaning | Action shape |
|---|---|---|
| **high** | Causing real bugs now, OR a clear "this will bite within the current milestone." | Top of the action list by priority score. Goes to the work-queue as P0. |
| **medium** | Drift with no current bug exposure but a "this will bite when X happens." | Second tier. Queue as P1. |
| **low** | Organizational drift, polish gap, voice slip. No bug exposure. | Optional fix. Queue as P2/P3 or ignore. |
| (empty findings list) | The lens looked, nothing to flag. | Lens score still feeds the health mean; no action items. |

## Cross-references

- `X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md` -- the buildout plan. Source of truth for the JSON contract, URL slugs, lens set, and phase status.
- `X:\YesAndEverything\status\` -- the dashboard. Reads the JSONs this skill writes.
- `project-canonical-audit`, `handler-audit`, `backlog-hygiene` -- the existing narrow audits. The bar-raise references their latest reports as inputs but does not replace them.
- `drift-auto-fix`, `work-queue-runner` -- downstream skills that consume bar-raise output.
- `solo-dev-voice-audit` -- voice rule enforcement. The bar-raise's own report needs to pass this skill's checks.

## Phase status

Per the roadmap, Phase 2 ships the per_project orchestrator + Waves 2/3/5. Phase 3 adds the constellation orchestrator + Wave 1. Phase 4 fills Wave 4 (domain lenses). Phase 5 wires scheduling. This skill grows across those phases; the SKILL.md description is forward-looking but the actual `waves/04_domain_lenses/` directory may be empty in earlier phases. The orchestrator silently skips Wave 4 when the directory is empty.
