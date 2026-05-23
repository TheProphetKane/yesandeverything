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
