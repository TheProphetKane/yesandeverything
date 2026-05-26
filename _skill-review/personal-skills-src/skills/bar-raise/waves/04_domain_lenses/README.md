# Wave 4: Domain lenses

This directory holds the per-domain lens templates. Each project's `tags` array (in its `status/data/<project>.json`) determines which domain folders the per-project orchestrator pulls from.

## Domain -> tag mapping

| Domain folder | `tags` value | Projects that bear the tag |
|---|---|---|
| `game-design/` | `game-design` | BR, HBH |
| `static-site/` | `static-site` | YaE |
| `cloud-edge/` | `cloud-edge` | YaC (worker), Scheduler (worker) |
| `finance-product/` | `finance-product` | YaB |
| `generative-art/` | `generative-art` | YaA |
| `PWA/` | `PWA` | YaC |
| `orchestration/` | `orchestration` | every project (via YaE-side skill suite) |
| `release-pipeline/` | `release-pipeline` | every project |
| `public-voice/` | `public-voice` | YaE, YaC, YaA, BR, HBH |

## Lens count per domain

| Domain | Lenses |
|---|---|
| game-design | 8 |
| static-site | 6 |
| cloud-edge | 3 |
| finance-product | 4 |
| generative-art | 3 |
| PWA | 3 |
| orchestration | 8 |
| release-pipeline | 4 |
| public-voice | 3 |
| **Total** | **42** |

## Per-project lens budgets

Each per-project bar-raise pulls Tier-1 (11) + the lenses from its matching domains:

| Project | Domains | Domain lenses | Total run |
|---|---|---|---|
| BR | game-design, orchestration, release-pipeline, public-voice | 8+8+4+3 = 23 | 34 |
| HBH | same as BR | 23 | 34 |
| YaC | cloud-edge, PWA, orchestration, release-pipeline, public-voice | 3+3+8+4+3 = 21 | 32 |
| YaE | static-site, orchestration, release-pipeline, public-voice | 6+8+4+3 = 21 | 32 |
| YaA | generative-art, orchestration, release-pipeline, public-voice | 3+8+4+3 = 18 | 29 |
| YaB | finance-product, orchestration, release-pipeline | 4+8+4 = 16 | 27 |
| Scheduler | cloud-edge, orchestration, release-pipeline | 3+8+4 = 15 | 26 |

Most lenses short-circuit with "No findings" on a healthy project, so the per-run token cost is dominated by the 5-10 lenses that actually surface something.

## Lens output shape

Same as Tier-1: question + signals + severity grading + output block (severity / finding / evidence / suggested action). The synthesis (Wave 5) aggregates these alongside the Tier-1 findings.
