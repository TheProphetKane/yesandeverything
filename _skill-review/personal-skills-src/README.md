# Personal skills

Nick's personal Claude skill suite. 14 skills covering the cross-project work across HereBeHordes, YesAndChains, Scheduler, and YesAndEverything.

## What it does

The skills cluster around five jobs:

- **Audit and drift detection.** `project-canonical-audit`, `handler-audit`, `solo-dev-voice-audit`, `backlog-hygiene`.
- **Drift fixing and queue drains.** `drift-auto-fix`, `work-queue-runner`, `self-reprompt-loop`.
- **Release and changelog.** `version-bump-and-publish`, `htbh-changelog-entry`.
- **Cross-project visibility.** `cross-project-status-digest`.
- **Project scaffolding and tooling.** `canonical-doc-handler-init`, `milestone-prompt-scaffold`, `adr-promoter`, `git-unstick`.

The patterns pair with the user-level `CLAUDE_SETTINGS.md` doc and per-project `CLAUDE.md` handler files. See `X:\YesAndEverything\IMPLEMENTATION_GUIDE.md` for the day-to-day usage flow.

## Installation

Drag the `personal-skills.plugin` file into Cowork's plugin panel. After install, the 14 skills appear in the slash menu and trigger from the natural-language phrasings their descriptions cover.

## Skills

| Skill | Job |
|---|---|
| `project-canonical-audit` | Doc-vs-code drift check, auto-detects project type |
| `htbh-changelog-entry` | Bump HBH GDD pill + write changelog entry in solo-dev voice |
| `version-bump-and-publish` | Cross-project release flow |
| `canonical-doc-handler-init` | Scaffold a new project with the handler-and-canonical pattern |
| `solo-dev-voice-audit` | Pre-commit scan for em dashes, AI tells, first-person, AI tool names |
| `backlog-hygiene` | Mark backlog items DONE with date + commit, scan stale refs |
| `cross-project-status-digest` | Weekly cross-project rollup |
| `git-unstick` | Recover from `.git/index.lock` and non-FF rebase on the FUSE mount |
| `milestone-prompt-scaffold` | Generalize Scheduler's MILESTONE-PROMPTS.md pattern across projects |
| `work-queue-runner` | Maintain and drain the cross-project work queue |
| `drift-auto-fix` | Apply low-risk audit fixes, queue structural items |
| `self-reprompt-loop` | Meta-orchestrator for continuous work |
| `handler-audit` | Audit each CLAUDE.md handler against project state |
| `adr-promoter` | Promote lock-signal conversations into written ADR or decisions-log entries |

## Pairs with

- Seven scheduled tasks for the audit cadence and queue drain.
- The cross-project-status artifact in Cowork's sidebar.
- The work queue at `X:\YesAndEverything\.work-queue.json`.
- The per-project `CLAUDE.md` handler files.
- `X:\YesAndEverything\CLAUDE_SETTINGS.md` for the cross-project voice and behavior rules.

## Version

0.1.0 — initial bundle.
