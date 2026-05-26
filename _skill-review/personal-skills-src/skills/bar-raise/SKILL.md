---
name: bar-raise
description: Run a periodic deep-review against one project or the whole portfolio. Use whenever the user says "bar-raise", "deep audit", "weekly review", "constellation review", "run the lenses", "raise the bar on X", or when a scheduled task fires with a `bar-raise-*` task name. Produces a Markdown findings report at `<project>/docs/BAR_RAISE-YYYY-MM-DD.md` and updates `X:\YesAndEverything\status\data\<project>.json` with the bar-raise fields. Five-wave structure modeled on a friend's `/bar-raise-*` skill: portfolio overview (Wave 1, constellation only), per-project discovery (Wave 2), Tier-1 lenses (Wave 3, 11 lenses applied to every project), domain lenses (Wave 4, ~22 lenses tag-matched per project, populated in Phase 4 of the bar-raise buildout), and meta-synthesis (Wave 5, collapses everything to verdict + actions). Two orchestrators: `per_project.md` runs Waves 2+3+4+5 against one project; `constellation.md` runs Waves 1+2(xN)+3+4+5 across the whole portfolio. Driven by `X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md`.
---

# Bar-raise (periodic deep review)

The bar-raise is a structured, lens-driven review of one project (or the whole portfolio) that produces a Markdown findings report plus a JSON status update for the dashboard at `yesandeverything.com/status/`. Per-project review runs daily; constellation review runs weekly. Output is read-only: the skill never modifies code. The drift-auto-fix and work-queue-runner skills handle that downstream.

## Why this exists

The existing audit skills (`project-canonical-audit`, `handler-audit`, `backlog-hygiene`) each answer one narrow question. The bar-raise is the structured-review equivalent of the cross-project digest: it walks every dimension of project health (architecture, reliability, security, performance, data integrity, maintainability, solo-tool UX, cost, dependencies, observability, strategic fit) in one pass, with severity-graded findings and a single synthesized verdict per project. It is the daily heartbeat for "is this project healthy" that the dashboard surfaces visually.

It mirrors a structure a friend deployed on their own home lab: 5 waves of analysis, parallel fan-out across N projects, lens templates that each ask one sharp question and produce one finding (or "no finding"). The shape transfers; the domains rewrite for Nick's portfolio.

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

- **`orchestrators/per_project.md`** -- per-project bar-raise. Runs Wave 2 (discovery) + Wave 3 (Tier-1 lenses) + Wave 4 (matching domain lenses) + Wave 5 (synthesis) against one named project. Output: `<project>/docs/BAR_RAISE-YYYY-MM-DD.md` + `X:\YesAndEverything\status\data\<project>.json` update. Default target when the user names a single project. Use this for scheduled `bar-raise-<project>-daily` runs.
- **`orchestrators/constellation.md`** -- portfolio bar-raise. Runs Wave 1 (portfolio overview) + Wave 2 fanned out across all six projects in parallel + Wave 3 (Tier-1 lenses per project) + Wave 4 (domain lenses per project) + Wave 5 synthesis at both per-project and portfolio level. Output: a per-project `BAR_RAISE-YYYY-MM-DD.md` for each project + `X:\YesAndEverything\docs\CONSTELLATION-YYYY-MM-DD.md` + `X:\YesAndEverything\status\data\constellation.json`. Use this for scheduled `bar-raise-constellation-weekly` runs.

When the user says "bar-raise BR", the per_project orchestrator fires against BR. When the user says "bar-raise all" or "constellation review", the constellation orchestrator fires.

## The five waves

- **Wave 1: Portfolio overview** (`waves/01_portfolio_overview.md`). Constellation only. Cross-project view: which projects are healthy, which need attention, where the work-queue is bottlenecked, where the portfolio is over- or under-invested.
- **Wave 2: Per-project discovery** (`waves/02_per_project_discovery.md`). For each project: read its canonical doc, harvest the current milestone state, the last N commits, the backlog top, the outstanding open questions. Builds the situational context for Waves 3 and 4 to operate on.
- **Wave 3: Tier-1 lenses** (`waves/03_tier1_lenses/`). Eleven lenses applied to every project regardless of domain: architecture, reliability, security, performance, data-integrity, maintainability, solo-tool-ux, cost-economics, dependency, observability, strategic-kill-this. Each lens template asks one sharp question and produces one finding (or "no finding").
- **Wave 4: Domain lenses** (`waves/04_domain_lenses/`). Tag-matched per project. ~22 lenses across 9 domains: game-design, static-site, cloud-edge, finance-product, generative-art, PWA, orchestration, release-pipeline, public-voice. Populated in Phase 4 of the bar-raise buildout; in Phase 2 this directory is empty and Wave 4 skips.
- **Wave 5: Meta synthesis** (`waves/05_meta_synthesis.md`). Collapses every lens finding into one verdict (healthy / needs-attention / at-risk / stalled), one "top finding" paragraph, a ranked action list, and the what-got-better / what-got-worse delta vs the previous bar-raise. Writes the Markdown report and updates the JSON.

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

The JSON write uses the Python atomic-write-with-readback pattern. The Markdown write uses the same pattern. Both are mandatory; the bar-raise never writes through the Edit tool on this FUSE mount.

## Hard rules

1. **Read-only.** The bar-raise never modifies code. It writes the findings report and the JSON status update. Anything code-touching is a queue item for drift-auto-fix.
2. **One finding per lens, max.** A lens that has nothing to say writes "No findings." Verbose lens output dilutes the synthesis.
3. **Severity is three-tier.** `high` / `medium` / `low`. Anything that needs "critical" is also high and the action list flags it.
4. **Solo-dev voice.** The report is a public-adjacent artifact (lands in `<project>/docs/`). No em dashes, no "I'd be happy to", no AI vocabulary. Same voice rules as the project's CLAUDE.md.
5. **FUSE atomic-write for all output files.** Never trust Edit on this mount; always write tmp + os.rename + readback.
6. **Cite specific evidence.** Every finding above LOW severity cites at least one path or commit ref. Lenses that surface vague "the architecture feels off" without specifics get downgraded or dropped.

## Severity scale

| Tier | Meaning | Action shape |
|---|---|---|
| **high** | Causing real bugs now, OR a clear "this will bite within the current milestone." | Top of the action list. Goes to the work-queue as P0. |
| **medium** | Drift with no current bug exposure but a "this will bite when X happens." | Second tier. Queue as P1. |
| **low** | Organizational drift, polish gap, voice slip. No bug exposure. | Optional fix. Queue as P2/P3 or ignore. |
| (no finding) | The lens looked, nothing to flag. | Not in the report. |

## Cross-references

- `X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md` -- the buildout plan. Source of truth for the JSON contract, URL slugs, lens set, and phase status.
- `X:\YesAndEverything\status\` -- the dashboard. Reads the JSONs this skill writes.
- `project-canonical-audit`, `handler-audit`, `backlog-hygiene` -- the existing narrow audits. The bar-raise references their latest reports as inputs but does not replace them.
- `drift-auto-fix`, `work-queue-runner` -- downstream skills that consume bar-raise output.
- `solo-dev-voice-audit` -- voice rule enforcement. The bar-raise's own report needs to pass this skill's checks.

## Phase status

Per the roadmap, Phase 2 ships the per_project orchestrator + Waves 2/3/5. Phase 3 adds the constellation orchestrator + Wave 1. Phase 4 fills Wave 4 (domain lenses). Phase 5 wires scheduling. This skill grows across those phases; the SKILL.md description is forward-looking but the actual `waves/04_domain_lenses/` directory may be empty in earlier phases. The orchestrator silently skips Wave 4 when the directory is empty.
