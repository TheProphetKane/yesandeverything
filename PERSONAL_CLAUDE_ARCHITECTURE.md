# Personal Claude architecture

> Drafted 2026-05-14 in response to applying the org "Claude usage — restructuring proposal" (May 14, 2026) to a personal setup. The org pitch was to stop selling 200 seats and start enabling 5 experts who build agent-driven products. The personal pitch is the same idea, scaled to one expert: stop chatting and start curating.

## The translation

| Org concept (Dan's proposal) | Personal analog |
|---|---|
| 5 dept "handler" seats build products for 200 staff | One `CLAUDE.md` per project — a handler for that project's domain |
| Canonical knowledge cache (Jira → markdown, once) | One source-of-truth doc per project, referenced never pasted |
| Sub-agents under each handler | Subagent invocations (Task tool) + scoped skills |
| JSM tickets / dashboards / Slack for end-users | Scheduled tasks + artifacts + slash commands instead of one-off chat |
| Reusable skills built by experts | Personal skills for the workflows you do repeatedly |
| Microsoft Copilot for general AI | (Skipped — Claude is the only AI tool. Architecture still distinguishes "reasoning over repos" from "open chat") |

The single insight that carries across: **Claude is a reasoning engine over curated knowledge, not a search engine over personal data dumps.** Every minute spent on the curation side saves ten minutes of paste-and-explain on the chat side.

## What's in place now (after the 2026-05-14 pass)

### Handler layer — one `CLAUDE.md` per project

| Project | Canonical doc | `CLAUDE.md` handler |
|---|---|---|
| **HereBeHordes** | `docs/GDD.html` | ✓ Created — encodes memory rules (GDD-every-reply, solo-dev voice, no accuracy, no agency removal, version-control standard) + repo-specific gotchas (git index.lock, path-extends quirk) |
| **Scheduler** | `docs/DESIGN.md` | ✓ Already existed — the template the other handlers were modeled on |
| **YesAndEverything** | `index.html` + `DEPLOY.md` | ✓ Created — covers the static-site monorepo, GitHub Pages deploy, `hordes/` injection rule |
| **YesAndChains** | `PROJECT_SPEC.md` + `CONTEXT.md` + `ROADMAP.md` + `BACKLOG.md` + `DECISIONS_NEEDED.md` (multi-file canonical) | ✓ Created — acts as the index into the multi-file layer, telling future sessions which doc owns which slice |

Every project now self-bootstraps a new Claude session with project-local context. No memory-only state, no "let me re-explain how this repo works."

### Canonical knowledge layer — already healthy, freshly audited

The org proposal calls this the highest-leverage move. Personal status:

- **HBH** — `docs/GDD.html` is mature; memory rule keeps it current every reply.
- **Scheduler** — `docs/DESIGN.md` is the spec; `MILESTONE-PROMPTS.md` carries the operating rules.
- **YaC** — multi-file canonical layer (PROJECT_SPEC / CONTEXT / ROADMAP / BACKLOG / DECISIONS_NEEDED). New audit at `docs/CANONICAL_AUDIT.md` confirms the structure is healthier than it looks; cleanup items are housekeeping only.
- **YaE** — DEPLOY.md + index.html are the de facto canonical for a static site this small. Doesn't need more.

### Skill candidates — top 3 identified, not yet built

See `outputs/SKILL_CANDIDATES.md`. Highest leverage:

1. **`project-canonical-audit`** — doc-vs-code drift check, cross-project, works against any canonical doc
2. **`version-bump-and-publish`** — release flow, project-aware
3. **`canonical-doc-handler-init`** — scaffold for the next project you start

Recommend starting with #1 because today's HBH audit is the reference implementation.

### Memory layer — already strong

15+ memory entries in place covering version control, voice, project overview, recurring quirks, lock signals, asset rules, midjourney standard. The new `CLAUDE.md` files in HBH / YaE / YaC mostly *pin* memory rules to disk so they survive memory wipes or new sessions. Memory remains the cross-project layer; CLAUDE.md is the project-local layer; canonical docs are the per-domain truth.

## How this changes day-to-day

### Before (chat-substrate model)

- Open a new session
- Paste a slab of context to remind Claude what we're doing
- Or upload the same PDF/screenshot again
- Or run an exploratory chat that grows context indefinitely
- Each session starts from zero; each context wipe loses ground

### After (handler-and-canonical model)

- Open a new session in a project folder
- `CLAUDE.md` auto-loads, telling Claude where the canonical doc lives and the core conventions
- Reference files by path; never paste their bodies
- Long-running work is broken into Task-tool subagents (Explore for search, Plan for design, general-purpose for execution)
- Recurring work routes through skills, not chat
- Snapshots / status / digests live in scheduled tasks + artifacts (the personal analog of dashboards), not in repeat chat queries

## Anti-patterns to watch for

These are the personal versions of the audit-log findings in Dan's proposal.

| Org pattern (waste source) | Personal version (avoid) |
|---|---|
| 87% of uploads are images (most expensive token format) | Pasting screenshots when text in the file would do. Reference the file, ask Claude to read it. |
| Same file uploaded 8 separate times | Pasting the same code/spec into different chats. Reference by path; let Claude `Read` it. |
| Long open-ended chats grow context indefinitely | Sprawling chats with no checkpoint. Break into scoped agent calls. Use `Plan` mode before execution. |
| Only one user building reusable capability (skills) | One-off chats that solve a problem and disappear. If you'd do it again, draft a skill candidate. |
| 19 projects = sprawl, no canonical structure | Letting projects accumulate without a `CLAUDE.md` handler and a single canonical doc. New project starts with both, day one. |

## Routing rules (the "everyday tasks" layer)

Since Claude is the only AI tool, the architecture has to handle both "reasoning over my repos" *and* "general chat / quick lookups." Suggested routing:

- **Project work** → open Cowork in the project folder. Handler + canonical doc auto-load. This is the optimized path.
- **Quick factual lookups** → a fresh Cowork session with no folder context, or just use chat. Doesn't burn project-context tokens.
- **Recurring digests** → scheduled tasks. (e.g. "weekly review of YaC BACKLOG.md top-10 items")
- **Status pages** → artifacts. (e.g. "live cross-project status page that pulls from each canonical doc")
- **Heavy multi-step work** → Task-tool subagents (`Explore`, `Plan`, `general-purpose`) instead of inline tool calls in the main thread.

## What to do next

| Priority | Action | Effort |
|---|---|---|
| P0 | Read the new `CLAUDE.md` in each repo. Tweak phrasing/wording to your voice. | 15 min |
| P0 | Cleanup pass on YaC per `docs/CANONICAL_AUDIT.md` action items (remove tombstoned `NEXT_SESSION_QUEUE.md`, fix the `PRIORITY_QUEUE.md` phantom reference) | 5 min |
| P1 | Build `project-canonical-audit` skill via `/skill-creator`. Use today's HBH audit as the reference run. | ~1 evening |
| P2 | Set up one scheduled task as a proof: weekly "what's changed across all 4 projects" digest. | 30 min |
| P2 | Try one artifact: a live "current state across all canonical docs" page that pulls version pills + current milestone from each. | 1 hour |
| P3 | Build `version-bump-and-publish` skill once you've shipped a few more releases and the pattern is fully stable. | ~3 hours |

## The honest version

This isn't a transformation; it's recognizing what you've already been doing and giving it structure. HBH was already a canonical-doc-first project. Scheduler already had a handler. The new work pins the pattern down for YaE and YaC, makes the routing explicit, and clears the road for the skills layer.

The proposal's 93% cost reduction at work doesn't translate one-to-one (you're not paying per token), but the productivity equivalent does: less time re-explaining, less context lost between sessions, more time on actual work.

Debugging discipline
====================

Layered with the architecture above. Memory entries `debugging-discipline` and `parallel-implementation-trap` load every session and carry the full rule set. `CLAUDE_SETTINGS.md` has the prose version. Per-project `CLAUDE.md` files (HBH, YaC, Scheduler, YaE) carry the project-specific hazards. Together they short-circuit the speculate-ship-fail loop that ate 75% of one month's token budget across the HBH v0.74.22-v0.74.32 cycle.

The two cross-project rules in one sentence each.

Two-failed-fix rule. After two failed fix attempts on the same symptom, stop shipping fixes; instrument and trace instead.

Parallel-implementation trap. Every active project has fork points (debug flags, env vars, route conditions, mirror copies); enumerate paths before patching, or the fix lands on the wrong path and the bug stays alive.



## Bar-raise pipeline (2026-05-26)

Periodic deep-review skill + static dashboard at `yesandeverything.com/status/`. Adds a daily per-project bar-raise + weekly portfolio constellation review to the existing audit-loop pattern.

- Skill source: `_skill-review/personal-skills-src/skills/bar-raise/`. SKILL.md + README.md + two orchestrators (`per_project.md`, `constellation.md`) + five waves (portfolio overview, per-project discovery, 11 Tier-1 lenses, 42 domain lenses across 9 domains, meta synthesis).
- Dashboard: `status/index.html` reads `status/data/<project>.json` per project + `status/data/constellation.json`. Static page, no backend.
- Release-time JSON writer: each project's `scripts/write-dashboard-status.ps1` writes its own JSON during `release.ps1`. Self-contained commit + push to YaE.
- Schedule: Windows Task Scheduler entries at `scripts/schedule/`. Six daily per-project runs at 06:00-06:25 staggered; one weekly constellation Monday 07:00.
- Build plan: `docs/BAR_RAISE_ROADMAP.md`. Phase status table at the bottom.
- Operator manual: `docs/BAR_RAISE_HANDOVER.md`. First-stop when something feels off.

Domain lens domains: `game-design`, `static-site`, `cloud-edge`, `finance-product`, `generative-art`, `PWA`, `orchestration`, `release-pipeline`, `public-voice`. Each project's `tags` array in its dashboard JSON selects which domain lenses apply.

Cross-cutting: every project's `release.ps1` ends by calling `write-dashboard-status.ps1`. The bar-raise skill never modifies code; it produces Markdown findings + JSON status only. Drift-fix and work-queue-runner consume the findings downstream.

---

## Project-context layer (added 2026-05-29)

### What it is

Each project repo now ships a `.project-context.json` at its root. Schema version 1.1 (additive over v1; v1 files remain valid). This file is the **machine-readable** per-project metadata that any skill can load in one step, replacing the LLM-driven "re-derive everything from CLAUDE.md prose" pattern.

### Schema (v1.1)

```json
{
  "$schema": "https://yesandeverything.com/schema/project-context-v1.1.json",
  "schema_version": 1.1,           // 1 also accepted; v1.1 is additive
  "name": "ProjectName",           // canonical name (matches repo dir + scheduled-task target)
  "short": "PN",                   // abbreviation used in commit messages, status JSON
  "display_name": "Pretty Name",
  "path": "X:\\Project",          // absolute Windows path
  "type": "godot-game | node-web-app | browser-pwa | browser-app | static-site | multi-canonical",
  "milestone": {                   // v1.1: the active (or last shipped) milestone; the
    "id": "M4",                    // dashboard writers read THIS, never hardcode it.
    "label": "Pre-Production Lock",// Update here when the milestone changes.
    "status": "in-progress | shipped | not-started"
  },
  "engine": "Godot 4.6",           // optional, game projects only
  "stack": ["Vite", "React", ...], // optional, web projects only
  "primary_language": "GDScript | TypeScript | JavaScript | HTML",

  "canonical_docs": ["docs/DESIGN.md", ...],
  "handler": "CLAUDE.md",
  "locked_decisions_log": "docs/DECISIONS.md",
  "changelog_path": "CHANGELOG.md",
  "backlog_path": "BACKLOG.md",
  "decisions_log_format": "appended-DECISIONS.md | in-GDD | in-DESIGN-section | in-PROJECT_SPEC-section | none",

  "version_pill_locations": [
    {"file": "package.json", "pattern": "...regex with one capture group...", "label": "..."},
    ...
  ],

  "release_script": "scripts/release.ps1",
  "preship_script": "scripts/preship.ps1",
  "publish_script": "scripts/publish-gdd.ps1",   // optional
  "publish_target": "X:\\YesAndEverything\\...", // optional

  "voice_strictness": "standard | strict",
  "voice_scope": ["changelog", "readme", ...],
  "public_artifact_globs": ["CHANGELOG.md", ...],

  "secret_exposure_paths": [".finances/**", ".env", ...],
  "critical_files_for_python_atomic_write": [...],
  "skip_files_too_large": ["CONTEXT.md", ...],  // optional

  "hazard_catalog": "personal-skills-src/skills/code-audit/hazards/per-project/<NAME>.md",
  "scheduled_tasks": ["audit-X-weekly", ...],
  "scheduled_tasks_external": ["audit-X-daily (Windows Task Scheduler)", ...],

  "repo_url": "https://github.com/TheProphetKane/...",
  "tags": ["...", ...],

  "lens_weights": {                // optional (v1.1): bar-raise emphasis multipliers
    "security": 1.5,               // lens id -> multiplier; consumers clamp to 0.5-2.0
    "solo-tool-ux": 0.8            // so no lens can be zeroed out and none can dominate
  },

  "hard_rule_checks": [            // optional (v1.1): objective verification per hard rule
    {"rule": "D-006 loopback bind", "check": "one-line command or test that proves compliance"}
  ],

  "hard_rules": ["...", ...],            // one-line strings, matched by the hazard catalog
  "locked_decisions_summary": ["...", ...],
  "release_message_format": "feat(name): vX.Y.Z - <summary>",
  "notes": ["...", ...]
}
```

### How skills should consume it

**Step 0 of every skill that operates on a specific project:**

```
Read <project-path>/.project-context.json. Use it to drive:
- which canonical doc(s) to walk
- which files to flag for voice violations (public_artifact_globs)
- which files to use Python atomic-write on (critical_files_for_python_atomic_write)
- which hazard catalog to load (hazard_catalog)
- which voice severity rubric (voice_strictness: standard -> HIGH, strict -> BLOCK)
- which release script to invoke (release_script)
- which version pills to keep in sync (version_pill_locations)

If .project-context.json is missing or its schema_version is unsupported, fall back to reading CLAUDE.md prose. Log a queue item asking Nick to add or migrate the context file.
```

The CLAUDE.md handler remains the human-readable narrative. The `.project-context.json` is the structured-data complement; both stay in sync via the `handler-audit` skill.

### When to update each

- **CLAUDE.md** — when conventions, hazards, or the why-it-exists narrative changes
- **.project-context.json** — when paths, scripts, version-pill locations, or hard-rule lists change; also when a new locked decision is added (mirror into `locked_decisions_summary`)
- Both whenever the project type or stack shifts

### Migration notes (v1 → v1.1)

v1.1 is purely additive: an optional `lens_weights` map (lens id → emphasis multiplier) and an optional `hard_rule_checks` list (per-rule one-line verification commands the bar-raise security and compliance lenses run; a BLOCK is only as good as a checkable rule). Consumers clamp every weight multiplier to the 0.5-2.0 range at read time, so no lens can be zeroed out and none can dominate. Existing v1 context files validate unchanged; absent fields mean all weights 1.0 and no scripted checks. Both `schema_version: 1` and `schema_version: 1.1` are supported.

### Migration notes (schema v1.x → v2)

Reserved for future. Any field rename / removal increments `schema_version` to 2 and ships with a migration recipe in this doc.

### Skills currently consuming v1/v1.1

- `project-canonical-audit` (canonical_docs, locked_decisions_log)
- `drift-auto-fix` (canonical_docs, hard_rules)
- `bar-raise` (everything; this is the heaviest consumer, and the only v1.1 `lens_weights` consumer so far)
- `backlog-hygiene` (backlog_path)
- `handler-audit` (handler, hard_rules, locked_decisions_summary)
- `htbh-changelog-entry` (version_pill_locations, changelog_path)
- `version-bump-and-publish` (release_script, version_pill_locations, release_message_format)
- `cross-project-status-digest` (path, tags, scheduled_tasks)
- `solo-dev-voice-audit` (voice_strictness, public_artifact_globs)
- `code-audit` (critical_files_for_python_atomic_write, hazard_catalog, voice_strictness, public_artifact_globs, secret_exposure_paths)

Future skills should consume `.project-context.json` first and CLAUDE.md prose only as fallback.
