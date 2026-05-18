# Handler Audit — 2026-05-15

Audit of CLAUDE.md handler files across HTBH, YaC, Scheduler, YaE against current repo state.

## TL;DR

Four HIGH-confidence drift items found. None block work. All are doc-side staleness in CLAUDE.md vs. shipped code or files. Four safe auto-fixes queued for the next `queue-drain-frequent` run.

- HTBH handler omits two new `source/` subdirs (`data`, `vfx`) and one new autoload (`research`)
- YaC handler still pins version to v0.25.2; actual is v0.25.3 (shipped 2026-05-15)
- YaE handler "Files at a glance" table is missing four load-bearing root files added recently (`CLAUDE_SETTINGS.md`, `PERSONAL_CLAUDE_ARCHITECTURE.md`, `docs/`, `.work-queue.json`)
- Scheduler handler still narrates "do milestones one at a time" but all six migration files (0001-0006) are shipped and polish PRs are merged

## HIGH severity

### HTBH — `source/` folder layout drift

`X:\HereThereBeHordes\CLAUDE.md` "Folder layout" lists `source/{autoloads,buildings,units,enemies,world,systems,ui,missions,save}`. Actual `source/` tree also contains `data/` and `vfx/` plus root files `main.gd`, `main.tscn`. New session bootstrap reads handler before code, so the omission misleads about where to look for VFX scripts and data tables.

### HTBH — autoload list incomplete

Handler lists five autoloads (`debug_flags`, `constants`, `global`, `economy`, `game_clock`). `project.godot [autoload]` block has six: same five plus `research`. `research.gd` is wired and load-bearing for the tech-tree branch.

### YaC — version pin stale

Handler pre-amble line: "Pre-1.0, currently at v0.25.2 (2026-05-13)". `CONTEXT.md` "Current version" is `0.25.3` (2026-05-15). Latest commit `21a556e feat(yac): v0.25.3 - code update`.

### YaE — handler missing four load-bearing root files

`X:\YesAndEverything\CLAUDE.md` "Files at a glance" table omits: `CLAUDE_SETTINGS.md` (the load-bearing how-to-work-with-Nick doc — top-level reference in memory), `PERSONAL_CLAUDE_ARCHITECTURE.md` (handler/canonical pattern spec), `docs/` directory (carries the audit findings — created today), `.work-queue.json` (the cross-project drain queue referenced from memory + scheduled tasks). New session opening YaE has no pointer to these without grepping.

## MEDIUM severity

### Scheduler — build order narration stale

Handler's "Build order" section describes M1-M6 as forward-looking ("Do them one at a time, in order. Don't get ahead."). All six migration files exist (`0001_initial.sql` through `0006_polish.sql`). Recent commits include `polish: design-system pass across all authed pages` and a merged `polish/foundation` PR. Handler should reflect that the project is in launch-prep / polish state, not greenfield-milestone state. `docs/LAUNCH.md` and `docs/ROADMAP.md` exist but aren't referenced in the handler.

### YaC — minor file-size drift in handler

`CONTEXT.md is 218KB` — actual 221KB. `app.js (~1MB bundled)` — actual 1.09MB. Both within the rounding the handler implies, but if these are wayfinding numbers ("don't full-read"), they'll keep growing past stated bounds. No-op for now; revisit if either crosses 250KB / 1.5MB.

## LOW severity

### YaE — registrar transfer status note past its window

Handler bullet: "DNS is on Cloudflare for `yesandeverything.com` as of 2026-05-06. Registrar transfer from Squarespace is pending 5-7 day completion." As of 2026-05-15 that window has closed (+9 days). Can't verify registrar state from filesystem; flag for manual check on next YaE pass.

### HTBH — anchor versions in handler are historical

Handler line "Walls are edge-occupants since v0.26.18" — still factually accurate at v0.37.1, but the wording suggests the rendering/pathfinding paragraph hasn't been touched in ~11 minor versions. Optional polish.

## Cross-handler

No cross-handler contradictions found. HTBH + Scheduler both call out the `.git/index.lock` FUSE quirk; YaC + YaE don't, but the quirk applies repo-wide (Cowork mount level), so it'd be reasonable to add a one-liner to both. Not flagged as drift; flagged as opportunity.

## Auto-fix queue

Four items queued via `.work-queue.json` for the next `queue-drain-frequent` drain. All `auto_safe: true`, P2 or P3. Substantive items (Scheduler build-order rewrite, YaE registrar status check) left unqueued for Nick's review.

Sources: audit run from `handler-audit-weekly` scheduled task. Per-project canonical audits from today live at `X:\HereThereBeHordes\docs\CANONICAL_AUDIT-2026-05-15.md`, `X:\YesAndChains\docs\CANONICAL_AUDIT-2026-05-15.md`, `X:\Scheduler\docs\CANONICAL_AUDIT-2026-05-15.md`.
