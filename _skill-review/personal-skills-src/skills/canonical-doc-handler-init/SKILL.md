---
name: canonical-doc-handler-init
description: Scaffold a new project with Nick's canonical-doc + CLAUDE.md handler + README pattern. Use when the user wants to start a new project, scaffold a repo, bootstrap a project, init a new game/web app/static site/library, set up a canonical doc, create a fresh CLAUDE.md handler, or stand up a new GDD/DESIGN.md/PROJECT_SPEC. Triggers include "new project", "start a new repo", "scaffold X", "bootstrap a Godot game", "init a web app", "set up the canonical doc", or "give me a fresh handler". The skill picks the right canonical-doc shape for the project type (game / web app / static site / library) and writes a matching CLAUDE.md, README, and starter docs folder.
---

# Canonical-doc + handler scaffolder

Stand up a new project with the canonical-doc + `CLAUDE.md` handler + `README.md` pattern Nick has converged on across HBH, Scheduler, YesAndEverything, and YesAndChains.

## Why this exists

Every new project repeats the same setup work: pick a canonical doc, write a CLAUDE.md handler that points at it, draft a README, decide a versioning policy, decide what "things that will bite you" look like for that stack. After four projects, the shape is stable enough to scaffold from a template — and the cost of the *missing* scaffold is real: an unscaffolded project drifts hard in its first two weeks because there's no source of truth for AI assistants (or future humans) to read first.

This skill produces the scaffold once, correctly, so the project starts with the canonical layer already wired.

## When to use this

Trigger on requests like:
- "Start a new project called X"
- "Scaffold a new Godot game"
- "Bootstrap a web app repo"
- "Set up a fresh static site"
- "I want to start a spec-led library — give me the canonical layer"
- "Generate a CLAUDE.md + README + DESIGN doc for a new project"

Do *not* trigger to retrofit an existing project — that's a different operation (an audit + selective patching, not scaffolding).

## Inputs the skill needs

Before writing anything, confirm with the user:

1. **Project name** — used in titles, README header, and CLAUDE.md primer. Display name (human-readable) plus short codename if different.
2. **One-paragraph pitch** — the vision statement. Lands in the README and the canonical doc's section 1.
3. **Project type** — one of:
   - `game` — Godot or similar, gets `docs/GDD.html`
   - `web-app` — Node/TS web app, gets `docs/DESIGN.md`
   - `static-site` — pure HTML/CSS landing or doc site, gets `index.html` + `DEPLOY.md`
   - `library` — spec-led, multi-file canonical (`PROJECT_SPEC.md` + `ROADMAP.md` + `BACKLOG.md` + `DECISIONS_NEEDED.md`)
4. **Target directory** — where to write. Must exist. Default: current working directory.
5. **Git init?** — optional, ask once at the end.

If the user provides fewer than name + pitch + type, ask for the missing ones. Don't guess project type from name — confirm.

## Safety rules

- **Never overwrite existing files.** If `CLAUDE.md`, `README.md`, the canonical doc, or `.gitignore` already exists at the target path, halt the relevant write and tell the user. Offer to write the new file under a `.new` suffix instead so they can diff.
- **If `docs/` exists**, scaffold *inside* it (only adding the missing canonical doc), don't touch existing files.
- **Never auto-`git init`** without explicit confirmation. Same for the first commit.

## How to run the scaffold

### Phase 1 — Gather inputs and confirm

Echo back to the user what's about to be created. Specifically:

- Target path
- Files that will be written (full list, full paths)
- Any files at the target that would conflict

Wait for confirmation before writing. This is the single point of "are you sure" — no per-file prompts after.

### Phase 2 — Write files in this order

1. `.gitignore` (project-type specific, see templates below)
2. `README.md` (pitch + link to canonical doc)
3. `CLAUDE.md` (handler — the longest file)
4. Canonical doc(s) (project-type specific)
5. Empty `docs/` folder if not part of the canonical doc set

Write each file using the templates below. Substitute these placeholders consistently:

- `{{PROJECT_NAME}}` — display name (e.g., "Here There Be Hordes")
- `{{SHORT_NAME}}` — short codename (e.g., "HBH"). Default: PROJECT_NAME with words capitalized, no spaces.
- `{{PITCH}}` — the one-paragraph pitch the user gave.
- `{{TODAY}}` — today's date in `YYYY-MM-DD` format.
- `{{REPO_URL}}` — leave as `TBD` if not provided.

### Phase 3 — Report what was written

List every file written with its absolute path. Note any files skipped because they already existed. Offer the optional `git init` + first commit as a follow-up.

---

## Templates

### .gitignore — game (Godot)

```gitignore
# Godot 4+
.godot/
.import/
export.cfg
export_presets.cfg
*.translation

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Secrets
.env
.env.local
*.token
.*-token

# Logs
*.log

# Local archive — large reference asset library, not for git
_ARCHIVE/
```

### .gitignore — web-app (Node/TS)

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
build/
.output/
.vite/
.wrangler/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Secrets
*.token
.*-token
```

### .gitignore — static-site

```gitignore
# Build output (if any)
dist/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Secrets
*.token
.*-token

# Local-only
.env
```

### .gitignore — library

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
build/
lib/
*.tsbuildinfo

# Test artifacts
coverage/
.nyc_output/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Secrets
.env
*.token
.*-token
```

---

### README.md — all project types

```markdown
# {{PROJECT_NAME}}

{{PITCH}}

## Status

Pre-1.0. Started {{TODAY}}.

## Where to look

- **Canonical doc:** `{{CANONICAL_DOC_PATH}}` — source of truth for design, scope, roadmap.
- **Handler:** `CLAUDE.md` — what AI assistants (and humans) should read first.

## License

TBD.
```

Substitute `{{CANONICAL_DOC_PATH}}` per project type:
- game -> `docs/GDD.html`
- web-app -> `docs/DESIGN.md`
- static-site -> `DEPLOY.md` + `index.html`
- library -> `PROJECT_SPEC.md`

---

### CLAUDE.md — game (Godot)

```markdown
# Claude Primer — {{PROJECT_NAME}}

You are working on **{{PROJECT_NAME}} ({{SHORT_NAME}})**. Read [`docs/GDD.html`](./docs/GDD.html) **before starting any task** — it is the source of truth for every design, scope, milestone, decision, and tuning number. The GDD has six tabs: **Design**, **Backlog**, **Roadmap**, **Assets**, **Decisions** (locked + open questions), **Numbers** (cost/HP/damage tables).

## The single hard rule

**Update the GDD at the end of every reply.** This is non-negotiable. Final action of every assistant turn on {{SHORT_NAME}} is bringing the GDD up to date — version pill bump in the header + a changelog entry at the top of the changelog footer. The changelog is in descending-version order; new entries go just below the `Changelog` label. If the work was trivial enough to not warrant a version bump, say so explicitly and skip — but never silently leave the GDD behind the code.

## The shape of the project

- **Engine:** Godot 4.x. GDScript first; C# fallback only.
- **Folder layout:** `source/` for code, `assets/` for art/audio/fonts, `tests/`, `docs/`, `scripts/`.
- **Autoloads:** registered in `project.godot` `[autoload]` section.

(Refine this section as the architecture firms up. The GDD section 16 is the canonical home for folder layout.)

## Version control standard

**Semver discipline:** MINOR for cohesive features or systems (new mechanic, new enemy, new building), PATCH for tweaks/fixes/tuning. Apply the milestone test before every bump — if it's part of an in-flight feature and not yet user-visible, it's a patch.

Commit convention: `feat({{SHORT_NAME}}): vX.Y.Z - <one-line summary>`.

## Voice and tone for public artifacts

GDD changelog entries and GitHub-visible content **read as a solo dev tracking own work**, not as AI collaboration. Forbidden: "per Nick", em dashes (use hyphens or commas), AI vocabulary ("I", "we", explanations of reasoning unless directly useful).

## Conventions

- **Strict typing in GDScript.** `warnings_as_errors` on. Use explicit types over `var x := get_script()` inference.
- **Path-extends, not `class_name`, for subclasses** — Godot 4's class-registry timing trips up `extends Building` at boot.
- **No accuracy in gameplay** (if combat is involved). Units always hit; debuffs use damage/armor reduction.
- **No agency removal.** Never freeze units, ignore orders, or override player behavior. Debuffs scale stats only.
- **Efficiency-first engineering.** Profile before adding per-frame work; prefer batched / spatial / data-oriented patterns over per-Node `_process`.

## Things that will bite you

- **`.git/index.lock` can survive between sessions** on FUSE-mounted repos. Any PowerShell script that touches git should `rm -f .git/index.lock` first.
- **Godot path-extends parser quirk:** referencing a parent class's `@export` directly from a subclass can fail. Use getter/setter methods on the parent.
- **Asset paths drift.** Centralize tile sizes and frame counts in a constants autoload rather than re-defining them per scene.

## Lock signals

When the user says "perfect" / "ideal" / "exactly how I want it" about a value, it **locks** — promote to a GDD Locked Decision and drop the tuning framing. "Let's try X" means keep in tuning state.

## Useful commands

```powershell
# From the project root
git add . ; git commit -m "feat({{SHORT_NAME}}): vX.Y.Z - <summary>" ; git push
```

(Add a `scripts/release.ps1` once the publish flow is needed.)

## When in doubt

1. Re-read the relevant GDD section.
2. If the GDD is silent, file under Decisions -> Open Questions and ask.
3. Don't invent new features. v1 scope lives in the GDD.
```

---

### CLAUDE.md — web-app

```markdown
# Claude Code Primer — {{PROJECT_NAME}}

You are working on **{{PROJECT_NAME}}**. Read [`docs/DESIGN.md`](./docs/DESIGN.md) **before starting any task** — it is the source of truth for every architectural and product decision.

## The shape of the project

- **Frontend:** TypeScript + a minimal framework (or vanilla). Mobile-first.
- **Backend:** TBD — fill in once chosen (Cloudflare Worker / Node / Express / etc.).
- **Database:** TBD.
- **Auth:** TBD.

(Refine as architecture firms up. DESIGN.md sections 3-5 are the canonical home for this.)

## Build order — milestone by milestone

The design doc breaks v1 into milestones. **Do them one at a time, in order.** Don't get ahead. Each milestone should land as its own PR.

When the user asks for "the next milestone" without naming it, infer from git history.

## Conventions

- **TypeScript strict mode** everywhere. No `any` without a comment justifying it.
- **Utility-first CSS** (Tailwind or equivalent). No CSS-in-JS, no styled-components.
- **Mobile-first.** Every UI must work down to 360px wide.
- **Accessibility.** All interactive elements keyboard-reachable; form fields have `<label>`s; color is never the sole signal.
- **No third-party UI kits** without asking. Keeps the bundle tiny.
- **No new dependencies without asking.** Each `pnpm add` is a discussion, not a default.
- **API style:** REST-ish, JSON only, errors as `{ error: string, code: string }` with appropriate status codes.
- **Names:** kebab-case for files and routes, PascalCase for components, camelCase for variables/functions, snake_case for DB columns.
- **Tests:** co-locate `*.test.ts` next to source.

## When in doubt

1. Re-read the relevant DESIGN.md section.
2. If DESIGN.md is silent, mark the question in `docs/DESIGN.md` "Open Questions" and ask.
3. Don't invent new features. Stick to v1 scope.

## Things that will bite you

- **`.git/index.lock` can survive between sessions** on FUSE-mounted repos. `rm -f .git/index.lock` and retry if a `git commit` fails with "Another git process seems to be running".
- **Strict TS will catch real bugs and also annoy you.** Don't `any` your way out — fix the type.
- **Deploy targets are different runtimes** (e.g., Cloudflare Workers vs. Pages Functions). Don't mix them by accident.

## Lock signals

When the user says "perfect" / "ideal" / "exactly how I want it" about a value or design decision, it **locks** — promote to a DESIGN.md Locked Decision and drop the tuning framing.

## Useful commands

```bash
pnpm install                          # install everything
pnpm dev                              # run dev server(s)
pnpm build                            # build production
pnpm test                             # run tests
```

## Coding voice

Prefer small, well-named functions over clever one-liners. Write comments only when the *why* isn't obvious from the code.
```

---

### CLAUDE.md — static-site

```markdown
# Claude Primer — {{PROJECT_NAME}}

You are working on **{{PROJECT_NAME}}** — a static site. {{PITCH}}

## What this repo is (and isn't)

- **Is:** a static site deployed by **GitHub Pages from `main`/root** (or equivalent). No build step, no framework, no SSR. Pure HTML/CSS/JS.
- **Is not:** a framework-driven app. Every page is self-contained.

## Files at a glance

| Path | Purpose |
|---|---|
| `index.html` | The site itself. Single self-contained file. |
| `404.html` | Fallback for unknown paths. |
| `CNAME` | Custom-domain pointer (if applicable). |
| `robots.txt` | Crawler rules. |
| `.nojekyll` (implicit) | Tells GitHub Pages to skip Jekyll. |
| `DEPLOY.md` | One-time DNS + Pages setup runbook. |

## Deploy flow

GitHub Pages auto-deploys from `main` root. There is no CI. Push to `main`, wait ~30s, refresh in production. Hard-refresh (Ctrl+Shift+R) to bust the CDN cache if needed.

```powershell
git add .
git commit -m "<concise description>"
git push
```

## Conventions

- **One file per page** — no shared CSS/JS imports. Every page is self-contained, inline `<style>` + `<script>`.
- **Dark-mode by default** (unless the brand dictates otherwise). Palette pulls from a `:root { --bg, --fg, --accent }` block at the top of `index.html`.
- **Mono-font headings, sans body** is the established aesthetic across Nick's sites. Match it unless there's a reason to break.
- **No JS frameworks.** Vanilla DOM only.
- **External links open in new tab** with `target="_blank" rel="noopener"`.

## Things that will bite you

- **GitHub Pages caches aggressively.** If a change doesn't appear, hard-refresh first; only debug after that.
- **`CNAME` must contain the custom domain exactly.** GitHub regenerates it from the Pages settings; if you `git push` an empty CNAME, the custom domain breaks.
- **`.git/index.lock` can survive between sessions** on FUSE-mounted repos. `rm -f .git/index.lock` before retrying.

## Lock signals

When the user says "perfect" / "ideal" / "exactly how I want it" about a layout or copy choice, it **locks** — note it in `DEPLOY.md` or a `DECISIONS.md` so future edits don't drift.

## When in doubt

1. `DEPLOY.md` has the one-time setup notes — anything DNS or Pages-config-related lives there.
2. For copy and visual choices, mirror the canonical content already on the page; don't fabricate.
```

---

### CLAUDE.md — library / spec-led

```markdown
# Claude Primer — {{PROJECT_NAME}}

You are working on **{{PROJECT_NAME}}**. {{PITCH}}

## The canonical knowledge layer (read this index first)

This project uses a **multi-file canonical layer**. Each file owns a distinct role. Read what's relevant; never paste any of them into chat — reference by path.

| File | Role |
|---|---|
| [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) | **Vision** + product source of truth. Architectural and core-decision lock. |
| [`ROADMAP.md`](./ROADMAP.md) | **Current state + what's next.** |
| [`BACKLOG.md`](./BACKLOG.md) | **Deferred items**, every "we'll come back to that" parked with a priority tag (P0-P3). |
| [`DECISIONS_NEEDED.md`](./DECISIONS_NEEDED.md) | **Answered-decision log.** Every "decided X" lives here in append-only form. |
| [`docs/adr/`](./docs/adr) | Architecture Decision Records — append-only, one per structural choice. |

## The shape of the project

- **Type:** Library / spec-led project.
- **Language:** TBD — fill in once chosen.
- **Distribution:** TBD (npm? cargo? GitHub release?).

## Versioning policy (strict pre-1.0 semver)

- **PATCH** (`0.x.y -> 0.x.y+1`) — bug fix, polish, doc update, no API change.
- **MINOR** (`0.x.y -> 0.x+1.0`) — new feature, new export, new endpoint.
- **MAJOR** (`0.x -> 1.0`) — reserved for v1 launch.

The version pill lives at the top of `PROJECT_SPEC.md`. Bump it alongside the change, not after.

## Conventions

- **Spec before code.** Every public API entry point exists in `PROJECT_SPEC.md` *before* it lands in code.
- **Single source of truth per topic.** Vision in PROJECT_SPEC, state in ROADMAP, deferred in BACKLOG, locked decisions in DECISIONS_NEEDED. Don't duplicate.
- **ADRs are append-only.** Once written, an ADR is never edited — only superseded by a new ADR.

## Things that will bite you

- **`.git/index.lock` can survive between sessions** on FUSE-mounted repos. `rm -f .git/index.lock` before retrying any git op.
- **The canonical layer is fragile if duplicated.** If a fact is in two files, it will drift. Pick one home and link to it from elsewhere.

## Lock signals

When the user says "perfect" / "ideal" / "exactly how I want it" about a decision, **promote it** to `DECISIONS_NEEDED.md` under a new dated "Answered" entry and drop the tuning framing.

## When in doubt

1. The index above is the routing table. Pick the right doc.
2. If a decision needs to be made, draft it as a question and add to `DECISIONS_NEEDED.md` under a new "Pending" section.
3. ADRs (`docs/adr/`) carry the *why* behind structural choices. Look there before re-litigating an architecture call.
4. v1 scope sits in `PROJECT_SPEC.md`. Anything outside is BACKLOG, parked.
```

---

## Canonical-doc templates

### docs/GDD.html — game (skeleton)

Use a minimal HTML scaffold matching the HBH GDD shape: dark theme, sticky header with title + meta-pill version + meta-pill date, tab navigation (Design / Backlog / Roadmap / Assets / Decisions / Numbers), one section per tab, and a changelog footer in descending-version order.

Write this file with:
- `<title>{{PROJECT_NAME}} — Game Design Document</title>`
- Title row: `<h1>{{PROJECT_NAME}}</h1>` + `<span class="meta-pill">v0.1.0</span>` + `<span class="meta-pill">{{TODAY}}</span>`
- Tabs as `<nav class="tabs">` with buttons toggling `<section id="tab-design">` etc.
- Initial content per tab:
  - **Design** — `## 1. Vision` (paste the pitch), `## 2. Glossary`, `## 3. Player loop`, `## 16. Folder layout` placeholders.
  - **Backlog** — empty table: `ID | Title | Priority | Notes`.
  - **Roadmap** — `## Milestones` heading with `M1 — Foundation` placeholder.
  - **Assets** — `## Active assets` empty table.
  - **Decisions** — two subsections: `## Locked Decisions` (empty) and `## Open Questions` (empty).
  - **Numbers** — empty table placeholder.
- Footer: `<footer><strong>Changelog</strong><br>v0.1.0 ({{TODAY}}) — initial scaffold.</footer>`

Keep CSS in a `<style>` block inside `<head>`; no external stylesheets. Match the palette used in HBH (dark warm tones, mono for pills, serif for title) unless the user requests a different aesthetic.

If the user prefers Markdown over HTML for the GDD, write `docs/GDD.md` instead with the same section structure as flat Markdown headers — but note that the tab UI is lost.

### docs/DESIGN.md — web-app

```markdown
# {{PROJECT_NAME}} — Design Document

**Project codename:** {{SHORT_NAME}}
**Display name (public):** {{PROJECT_NAME}}
**Repo:** {{REPO_URL}}
**Deploy target:** TBD
**Document version:** v0.1.0 — initial design draft, {{TODAY}}
**Status:** Incubating

---

## 1. Vision & Scope

{{PITCH}}

### 1.1 Non-goals (v1)

(Fill in. What this project explicitly will not do.)

### 1.2 Success criteria

(Fill in. Measurable conditions for v1 being "done".)

---

## 2. Glossary

(Domain terms. Define each once, here, and link to it from elsewhere.)

---

## 3. User Roles

(Who uses this and what each role can do.)

---

## 4. Architecture

(High-level: frontend, backend, database, auth, hosting. One paragraph each.)

---

## 5. Data Model

(Tables / collections / types. Schema sketches go here before they go in migrations.)

---

## 6. API

(REST routes or GraphQL operations. Path, method, request shape, response shape, errors.)

---

## 7. UI / Pages

(One subsection per page. Layout, key components, states.)

---

## 8. Algorithms

(Anything non-trivial — schedule generation, matching, ranking, etc. Pseudocode plus edge cases.)

---

## 16. Routes & file layout

(Where in the repo each thing lives. Update as architecture firms up.)

---

## 21. Milestones (v1)

- **M1 — Foundation.** Scaffold the workspace, get a "hello world" round-trip working.
- **M2 — Auth & users.** (Or whatever the second slice is.)
- **M3 — ...**

Do these in order, one PR per milestone.

---

## 22. Roadmap (post-v1)

(Items explicitly out of v1 scope, parked for later.)

---

## 23. Open Questions

(Questions the doc can't answer yet. Each gets a date and a status: Pending / Answered.)

---

## Changelog

- **v0.1.0** ({{TODAY}}) — initial design draft.
```

### DEPLOY.md — static-site

```markdown
# {{PROJECT_NAME}} — Deploy Runbook

One-time setup notes for {{PROJECT_NAME}}.

## Hosting

- **Platform:** GitHub Pages, served from `main` branch, root directory.
- **Custom domain:** TBD (set in `CNAME` once chosen).
- **DNS:** TBD (Cloudflare DNS preferred — A records for apex, CNAME for `www`).

## First-time setup

1. Create repo on GitHub.
2. Push initial commit.
3. Go to **Settings -> Pages**. Set source: `main` branch, `/` (root). Save.
4. Wait ~30s for first deploy.
5. (Optional) Add custom domain in **Settings -> Pages**. GitHub will write `CNAME` for you — commit it.
6. Update DNS at the registrar: A records for apex pointing at GitHub Pages IPs (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`), CNAME for `www` pointing at `<github-user>.github.io`.

## Ongoing deploys

```powershell
git add .
git commit -m "<concise description>"
git push
```

Wait ~30s, hard-refresh the live URL to bust the CDN cache.

## Things to remember

- **Hard-refresh first** when a change doesn't appear (Ctrl+Shift+R).
- **Don't `git push` an empty CNAME** — it breaks the custom domain.
- **`.nojekyll`** is implicit; add it as an empty file if Pages tries to Jekyll-process the site.
```

Plus a stub `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{PROJECT_NAME}}</title>
<style>
  :root {
    --bg: #1a1614;
    --fg: #e8dcc8;
    --accent: #e0a458;
    --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 48px 24px;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--sans);
    line-height: 1.6;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-family: var(--mono); color: var(--accent); }
</style>
</head>
<body>
<main>
  <h1>{{PROJECT_NAME}}</h1>
  <p>{{PITCH}}</p>
</main>
</body>
</html>
```

### PROJECT_SPEC.md + ROADMAP.md + BACKLOG.md + DECISIONS_NEEDED.md — library

**PROJECT_SPEC.md:**

```markdown
# {{PROJECT_NAME}} — Project Spec

**Version:** v0.1.0 ({{TODAY}})
**Status:** Pre-1.0

## 1. Vision

{{PITCH}}

## 2. Scope (v1)

(What's in v1. Bullet list.)

## 3. Non-goals

(Explicit list of what this is NOT.)

## 4. Architecture

(High-level. One paragraph per layer.)

## 5. Public API

(Every exported function / type / constant. The lock — once here, it's a public contract.)

## 6. Internal modules

(Brief description per file/module.)

## 7. Versioning policy

- PATCH: bug fix or doc, no API change.
- MINOR: additive feature, new export.
- MAJOR: reserved for v1.0.

## 8. Success criteria for 1.0

(Measurable conditions.)
```

**ROADMAP.md:**

```markdown
# {{PROJECT_NAME}} — Roadmap

**Last refreshed:** {{TODAY}}

## Now (in flight)

(What's being worked on right now.)

## Next (queued)

(What comes after Now.)

## Later (this version)

(Still in v1 scope, but not next.)

## Done

(Completed items, descending by date.)
```

**BACKLOG.md:**

```markdown
# {{PROJECT_NAME}} — Backlog

Deferred items. Every "we'll come back to that" lands here with a priority tag.

## P0 — must-have for v1

(empty)

## P1 — should-have for v1

(empty)

## P2 — nice-to-have

(empty)

## P3 — post-v1 / maybe never

(empty)
```

**DECISIONS_NEEDED.md:**

```markdown
# {{PROJECT_NAME}} — Decisions log

Append-only log of decisions. Despite the filename, this is where **answered** decisions live; pending decisions go at the bottom.

## Answered

(empty — first entry will land here once a decision locks.)

## Pending

(empty)
```

---

## What not to do

- **Don't overwrite existing files.** Halt and ask. If the user insists, write to `<file>.new` first so they can diff.
- **Don't auto-`git init`.** Ask once at the end, run only on yes.
- **Don't invent content beyond what the user gave.** The pitch lands in section 1 / vision; everything else stays as placeholder. Filling in "Non-goals" with guesses is worse than leaving the placeholder.
- **Don't deviate from the templates without asking.** If the user wants Markdown GDD instead of HTML, that's fine — but flag the tradeoff (lost tab UI) before doing it.
- **Don't add extra files** (CONTRIBUTING, LICENSE, CHANGELOG at root, etc.) unless asked. The skill produces the minimum viable canonical scaffold, not a full repo template.

## After scaffolding

Tell the user:
1. The list of files written, with absolute paths.
2. Any files skipped because they existed.
3. The next two suggested actions:
   - Fill in section 1 / vision in the canonical doc (it has the pitch, but the surrounding sections are placeholders).
   - Run `git init && git add . && git commit -m "chore: initial scaffold"` if they didn't already do it during the skill run.
4. Remind them that the canonical doc is the source of truth from this point forward — the next session should read it first.
