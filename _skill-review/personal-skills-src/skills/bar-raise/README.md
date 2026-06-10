# bar-raise

Periodic deep-review skill for Nick's portfolio. Five-wave structure, lens-driven, produces Markdown findings + JSON status for the dashboard at `yesandeverything.com/status/`. Tier-1 and domain lenses fan out as one independent subagent per lens, each returning a structured report (`waves/03_tier1_lenses/REPORT_CONTRACT.md`); synthesis is a weighted, no-veto blend of the lens dimension scores with tensions surfaced explicitly. The only hard gate is a BLOCK on an objective hard-rule breach.

## Invocation

```
bar-raise BR
bar-raise YaC
bar-raise all
constellation review
```

Or fire from a scheduled task tagged `bar-raise-<project>-daily` / `bar-raise-constellation-weekly`. See `X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md` Phase 5 for scheduling specifics.

## What it produces

- Per-project: `<project>/docs/BAR_RAISE-YYYY-MM-DD.md` + a JSON update at `X:\YesAndEverything\status\data\<project>.json`.
- Constellation: per-project reports for every project plus `X:\YesAndEverything\docs\CONSTELLATION-YYYY-MM-DD.md` plus `status/data/constellation.json`.

The dashboard reads the JSONs and renders cards.

## What it does NOT do

- Modify code. The bar-raise is read-only. Code changes go through drift-auto-fix or the work-queue-runner.
- Replace the narrow audits. `project-canonical-audit` / `handler-audit` / `backlog-hygiene` still run on their own schedules; the bar-raise references their latest reports as inputs.
- Self-trigger. The skill fires on user invocation or a scheduled task. It does not chain-trigger from other skills.

## File layout

```
bar-raise/
  SKILL.md                                   skill registration + behavior contract
  README.md                                  this file
  waves/
    01_portfolio_overview.md                 Wave 1 (constellation only, Phase 3)
    02_per_project_discovery.md              Wave 2 (per-project context harvest)
    CONTEXT_CONTRACT.md                      the discovery blob every lens subagent receives
    03_tier1_lenses/                         Wave 3 (12 lenses, every project)
      REPORT_CONTRACT.md                     structured report every lens subagent returns
      01_architecture.md
      02_reliability.md
      03_security.md
      04_performance.md
      05_data_integrity.md
      06_maintainability.md
      07_solo_tool_ux.md
      08_cost_economics.md
      09_dependency.md
      10_observability.md
      11_strategic_kill_this.md
      12_compliance_data_steward.md
    04_domain_lenses/                        Wave 4 (Phase 4 buildout)
    05_meta_synthesis.md                     Wave 5 (weighted no-veto synthesis to verdict + actions)
  orchestrators/
    per_project.md                           Waves 2 + 3 + 4 + 5 against one project
    constellation.md                         Waves 1 + 2(xN) + 3 + 4 + 5 portfolio-wide
```

## Phase status

- Phase 2 (per-project orchestrator + Waves 2/3/5): ship target.
- Phase 3 (constellation orchestrator + Wave 1): next.
- Phase 4 (Wave 4 domain lenses): later.
- Phase 5 (scheduling via Windows Task Scheduler): later.

See `X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md` for the canonical phase status.
