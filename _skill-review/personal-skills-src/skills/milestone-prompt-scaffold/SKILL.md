---
name: milestone-prompt-scaffold
description: Generate or extend a project's `docs/MILESTONE-PROMPTS.md` — a per-milestone pre-written prompt file that locks scope, conventions, and stop conditions before each session begins. Use whenever the user asks to scaffold milestone prompts, generate a milestone plan, set up milestone-prompts, draft a milestone prompt, write the prompt for M3 (or any specific milestone), give me the prompt for the next milestone, build a paste-ready session starter, or extract operating rules into a reusable session opener. Auto-detects project type (Godot game / web app / multi-file canonical / static site) and pulls milestone names from the project's canonical doc (GDD §17 roadmap, DESIGN.md §21, docs/launch-checklist-1.0.md, etc.). Appends to an existing `MILESTONE-PROMPTS.md` rather than overwriting, so re-running on a partially-scaffolded project is safe.
---

# Milestone prompt scaffold

Build (or extend) a project's `docs/MILESTONE-PROMPTS.md` — a single file Nick pastes from at the start of each Claude Code session to lock scope to one milestone and prevent drift.

## Why this exists

Every time a session starts cold, Claude reads CLAUDE.md and tries to infer scope. Without a milestone prompt, the model picks up wherever the last commit ended, often spilling into the next milestone "while we're here." The Scheduler project solved this by writing a paste-ready prompt per milestone, with universal Operating Rules at the top. It works — sessions stay scoped, commits stay clean, scope creep gets logged to ROADMAP instead of merged in.

This skill generalizes that pattern across project types so HBH, YaC, Scheduler, and YaE all share the same session-opener discipline without each one being reinvented.

## When to use this

Trigger on requests like:

- "Scaffold milestone prompts for [project]"
- "Generate a milestone plan"
- "Set up milestone-prompts.md"
- "What's the prompt for M3?" / "Give me the prompt for the next milestone"
- "Draft the prompt to start [milestone name]"
- "Lock down scope for the next milestone in a prompt"
- "Extract operating rules from CLAUDE.md into a session-opener"

Also trigger proactively when a project's CLAUDE.md mentions milestones but `docs/MILESTONE-PROMPTS.md` doesn't exist yet, or when the canonical doc has added new milestones since the file was last touched.

## How to scaffold

Run these phases in order. Each phase feeds the next.

### Phase 1 — Detect project type

Determine which template variant to use. Check files in this order:

| Signal | Project type | Milestone source |
|---|---|---|
| `project.godot` + `docs/GDD.html` | **Game (HBH-style)** | GDD §17 roadmap or `<section id="tab-roadmap">` |
| `apps/api/` + `apps/web/` + `docs/DESIGN.md` | **Web app (Scheduler-style)** | `docs/DESIGN.md` §21 (or whichever section names milestones) |
| `PROJECT_SPEC.md` + `CONTEXT.md` + `docs/launch-checklist-1.0.md` | **Multi-file canonical (YaC-style)** | `docs/launch-checklist-1.0.md` |
| `CNAME` + single-page `index.html`, no milestones in CLAUDE.md | **Static site (YaE-style)** | No formal milestones — skip or generate minimal "next changes" prompt |

If multiple signals match, prefer the more specific one (game over web app, multi-file over static).

### Phase 2 — Read CLAUDE.md for Operating Rules source material

Open the project's `CLAUDE.md`. Harvest:

- **Voice rules** — solo-dev voice for HBH, "no AI vocabulary," etc.
- **Convention locks** — strict TypeScript, no new deps without asking, no third-party UI kits, mobile-first, etc.
- **Update obligations** — "Update the GDD at the end of every reply" for HBH, version pill bump for YaC, etc.
- **Scope locks** — v1 scope sections, "Don't invent new features"
- **Build-order rules** — "Do one milestone at a time," "Don't peek into the next milestone"

Translate each into a numbered Operating Rule. Aim for 6–10 rules total. Be specific — "Tests: tiered" not "Write tests."

### Phase 3 — Read the canonical doc for the milestone list

For each project type, the milestone list lives in a specific place:

- **Game:** GDD Roadmap tab — each milestone is a `<div>` or `<h3>` with a name + bullet deliverables. Pull every milestone whose status is `todo` or `in-progress`; skip `done` ones (or generate a brief "verify and ship" prompt for the most recent done milestone if no in-progress one exists).
- **Web app:** DESIGN.md §21 lists milestones as `1. **M1 — Name.** description`. Pull each.
- **Multi-file canonical:** `docs/launch-checklist-1.0.md` — milestones are checklist headers. Pull each unchecked group.
- **Static site:** No milestones. Generate a single "Next changes" prompt that lists open issues from BACKLOG / open questions instead.

### Phase 4 — Check for existing MILESTONE-PROMPTS.md

Before writing, check `docs/MILESTONE-PROMPTS.md` (or repo root for static sites).

- **Doesn't exist:** generate the full file.
- **Exists:** read it. Extract which milestones already have prompt blocks. Only generate prompts for milestones *missing* from the file. Append new sections after the last existing milestone block, before any trailing footer. **Never overwrite existing prompt blocks** — Nick may have hand-tuned them after generation.

If the user explicitly says "regenerate" or "overwrite," confirm once before clobbering.

### Phase 5 — Generate the file (or append the new sections)

Use the matching template variant below. Each prompt block follows the same shape:

1. **Title:** `## M<n> — <name>`
2. **Code-fenced prompt:**
   - Opening line names the milestone and points to the canonical doc sections to read.
   - Deliverables as a bullet list.
   - Test approach in its own bullet or paragraph.
   - Scope locks (`Do NOT add X, Y, Z — those are M<n+1>`).
   - Stop conditions.
   - Closing line: `When done: commit, push, suggest PATCH/MINOR bump + changelog entry, stop.`

Keep each prompt block under ~30 lines. Longer than that and Claude won't read it carefully.

---

## Template: Game (HBH-style)

Operating Rules block:

```markdown
## Operating Rules (apply to every milestone)

1. **Scope lock.** One milestone per session. Spotted out-of-scope work goes to GDD Backlog tab, not into this PR.
2. **GDD is the source of truth.** Read the relevant §-anchored section before starting. Update the GDD at the end of every reply — version pill + changelog entry.
3. **Solo-dev voice in public artifacts.** Changelog entries and commit messages read as solo dev tracking own work. No "I/we," no em dashes, no AI vocabulary.
4. **Semver discipline.** MINOR for cohesive features/systems; PATCH for tweaks/fixes/tuning. Apply the milestone test before every bump.
5. **No accuracy, no agency removal.** Units always hit. Debuffs scale stats only — never freeze, ignore orders, or override behavior.
6. **Efficiency-first.** Hundreds-to-thousands of enemies on screen is the target. Profile before adding per-frame work; prefer batched / spatial / data-oriented patterns.
7. **Strict typed GDScript.** `warnings_as_errors` is on. Use explicit types or duck-type-by-field, never trust inference.
8. **Path-extends, not class_name.** Use `extends "res://path/to/parent.gd"` and getter/setter methods on the parent.
```

Example milestone block:

```markdown
## M2 — Combat Loop

\`\`\`
We're starting M2. Read CLAUDE.md and docs/GDD.html §4 (combat model), §8 (unit catalog rows for the v1 melee + ranged units), §17 roadmap M2 deliverables.

M2 deliverables:
- Melee unit attacks adjacent enemy on cooldown; damage applies; HP bar updates
- Ranged unit acquires line-of-sight target within range; projectile spawns, travels, applies damage
- Death state: corpse sprite, no further actions, despawns after N seconds
- Armor reduction applies before damage (no accuracy roll — units always hit)

Tests: GUT test for damage application (raw, armored, lethal). Smoke scene that spawns 1 melee + 1 ranged vs 3 dummies and runs to completion.

Out of scope (M3 and later): pathing-to-target (still hard-coded distance), morale, debuffs, AoE, squad behavior. Do NOT touch enemy AI — that's M3.

Stop conditions:
- Both unit types deal damage in a smoke scene
- Death state works
- GUT tests green
- GDD §4 reflects final damage formula
- Version pill bumped (MINOR — new combat system)

When done: commit, push, suggest the MINOR bump + one-line GDD changelog entry, stop.
\`\`\`
```

---

## Template: Web app (Scheduler-style)

Operating Rules block:

```markdown
## Operating Rules (apply to every milestone)

1. **Scope lock.** One milestone per session. Out-of-scope spots get appended to docs/ROADMAP.md as a one-liner and skipped.
2. **No pre-amble, no post-amble.** Skip "Here's my plan" and "I've completed X." Just do the work, commit, one-sentence handoff.
3. **Tests — tiered.** Required: core algorithm tests, permission/scoping tests for new role-scoped routes. Skip: trivial getters, dumb mappers, CRUD shapes already covered by integration.
4. **No new dependencies without asking.** Plain Tailwind + handwritten components per CLAUDE.md. New library = one-sentence justification + explicit ask.
5. **Don't ask routine choices.** Pick the simpler option and proceed. Ask only when DESIGN.md is silent and the tradeoff is non-obvious.
6. **UI: reuse, don't redesign.** Match prior-milestone layout, components, spacing. No restyling.
7. **TypeScript strict.** No `any` without an inline comment explaining why.
8. **Mobile-first.** Every UI works at 360px. Test by resizing DevTools.
9. **Stop at stop conditions.** Don't peek into the next milestone. Commit, push, halt.
```

Example milestone block:

```markdown
## M3 — Org & Shift Templates

\`\`\`
We're starting M3. Read CLAUDE.md and docs/DESIGN.md §3-4 (org model), §6 (shift templates), §15 data-model rows for departments / sub_departments / shift_templates / membership, §16 routes for departments / sub-departments / shift-templates / users.

M3 deliverables:
- Admin CRUDs departments and sub-departments (soft-delete only — set archived_at)
- Admin assigns managers to sub-departments via the user_managed_sub_departments join
- Managers CRUD shift templates within their managed sub-departments only
- Permission tests confirm the scoping holds

UI: extend the M2 admin/manager pages — same table, form, button components. No new layout.

Out of scope (M4 and later): preferences, shifts, schedule generation. Do NOT add the preference form or auto-fill — that's M4.

Stop conditions:
- All four bullets work end-to-end via the SPA
- pnpm dev clean, pnpm test passes, pnpm --filter web build succeeds
- No partial M4 work

When done: commit, push, suggest the version bump (MINOR — new feature surface) + one-line changelog, stop.
\`\`\`
```

---

## Template: Multi-file canonical (YaC-style)

Operating Rules block:

```markdown
## Operating Rules (apply to every checklist item)

1. **Active queue is docs/launch-checklist-1.0.md.** Pick the topmost unchecked item unless told otherwise.
2. **Versioning policy is strict pre-1.0 semver.** PATCH = bug/polish/doc; MINOR = new feature/wizard step/endpoint/screen; MAJOR is reserved for 1.0.
3. **Bump the version pill in CONTEXT.md alongside the change**, not after.
4. **localStorage is source of truth offline.** Every write goes to localStorage; cloud sync layers on top.
5. **No framework adoption.** Vanilla TypeScript + DOM. Bundle size is part of the brand.
6. **Don't mutate canonical course data.** Per-user star + overlay edits only; never touch the central record.
7. **Release pipeline is scripts/release.ps1.** Don't write per-version push runbooks; the script + scripts/README.md are canonical.
8. **CONTEXT.md is 218KB — never paste it.** Search by section header, edit in place.
```

Example checklist-item block:

```markdown
## Checklist item: Disc condition tracking

\`\`\`
We're starting "Disc condition tracking." Read PROJECT_SPEC.md (disc inventory section), CONTEXT.md glossary entries for "disc state" / "wear level," ROADMAP.md current state, and BACKLOG.md any deferred wear-tracking notes.

Deliverables:
- New `wear_level` field on a disc record (enum: pristine / used / beater / lost)
- UI control on the disc detail screen to set it
- Recommendation engine deprioritizes "lost" discs and softly downweights "beater"
- localStorage write + cloud-sync write paired

Out of scope: disc disposal flow, replacement suggestions, wear-decay over rounds. Park those in BACKLOG.md with P2 tag.

Tests: unit test on the recommendation engine showing wear weighting applied. Manual smoke on a real device for the UI control.

Stop conditions:
- Wear field round-trips local + cloud
- Recommendation engine uses it
- CONTEXT.md changelog updated, version pill bumped (MINOR — new feature)
- scripts/release.ps1 runs clean

When done: commit, run release.ps1, stop.
\`\`\`
```

---

## Template: Static site (YaE-style)

Static sites usually don't have milestones. Generate a single "Next changes" prompt instead, sourced from open issues, BACKLOG entries, or the user's verbal todo:

```markdown
## Operating Rules

1. **One file per page** — no shared CSS/JS imports. Self-contained `<style>` + `<script>` per page.
2. **Dark-mode palette** — `:root { --bg, --fg, --accent }` block at top of index.html. Match across new pages.
3. **Mono headings, sans body.** No serif without a reason.
4. **Vanilla DOM only.** No framework.
5. **External links open in new tab** — `target="_blank" rel="noopener"`.
6. **GitHub Pages auto-deploys from main root.** Push to main; hard-refresh to bust cache.

## Next changes (current open queue)

\`\`\`
Pick the topmost open item from the list below. Read CLAUDE.md for site conventions. Make the change, commit with a concise message, push.

Items:
- [ ] <pulled from BACKLOG or user-provided>
- [ ] <pulled from BACKLOG or user-provided>

Out of scope: rewriting the password gate (hordes/), changing CNAME, restructuring index.html sections beyond what the item requires.

When done: commit, push, hard-refresh to verify, one-sentence handoff, stop.
\`\`\`
```

---

## Output destination

Default target: `<project-root>/docs/MILESTONE-PROMPTS.md`.

Exceptions:
- **Static sites** that don't have `docs/`: write to `<project-root>/MILESTONE-PROMPTS.md`.
- **Multi-file canonical projects** where Nick prefers checklist-prompts.md naming: confirm the filename with him before writing.

### Append vs. overwrite

The skill defaults to **append**:

1. If `MILESTONE-PROMPTS.md` doesn't exist → create from scratch with intro + Operating Rules + all milestone blocks.
2. If it exists → read it, parse out which `## M<n>` (or `## Checklist item:`) headers already exist, and only generate sections for milestones missing from the file. Insert new sections in the canonical order, after the last existing milestone block, before any trailing `---` footer or "Maintained alongside..." line.
3. **Never** overwrite an existing prompt block. Nick edits these by hand after generation; clobbering them is a regression.
4. If the Operating Rules block exists but the user asks for a refresh, show a diff and confirm before replacing.

If the user explicitly says "regenerate from scratch" / "overwrite," ask once for confirmation, then clobber.

## What not to do

- **Don't invent milestone names.** Pull them from the canonical doc verbatim. If the doc lists M1 through M6, generate M1 through M6 — don't add M7.
- **Don't write prompts for milestones not in the canonical doc.** If the user asks for "M8" and the doc only goes to M6, ask whether to add M8 to the canonical doc first.
- **Don't extract Operating Rules from your training data** when CLAUDE.md is present. CLAUDE.md is the source — rules drift from there, not from a generic template.
- **Don't generate exhaustive deliverables** beyond what the canonical doc commits to. Mirror the doc's wording. If the doc is vague, the prompt should be vague — and the prompt's first line should say "read §X to clarify."
- **Don't add an auto-chain section by default.** It's a Scheduler-specific opt-in. Mention it as a footer option only if the user asks for it.
- **Don't write more than ~30 lines per milestone prompt block.** Longer prompts get skimmed; shorter ones get read.

## Quick interrupt phrases (to suggest including in the generated file)

Borrow from Scheduler's pattern when relevant:

- "Just code." — when Claude narrates instead of acting
- "Pick the simpler one." — when Claude asks routine choices
- "Out of scope. Stay in M<n>." — when Claude edits prior-milestone code
- "Add to BACKLOG and skip." — when Claude proposes a feature not in the canonical doc

Include the interrupt-phrases section if the project's CLAUDE.md establishes the relevant patterns; skip it for projects where the dev style is different.

## Closing footer for every generated file

End with:

```markdown
---

*Maintained alongside `<canonical doc>`. Update if the design or milestone scope shifts.*
```

Replace `<canonical doc>` with the actual doc name (`docs/GDD.html`, `docs/DESIGN.md`, etc.). This footer signals the file is generated from a source and shouldn't be the source of new milestones.
