---
name: godot-perf-optimize
description: Find and implement performance optimizations in Godot 4 projects. Profiles hot paths, identifies the optimization pattern that fits (per-frame _process to batched tick, per-Node to MultiMesh, AStarGrid2D throttling, spatial bucketing, RenderingServer direct calls, signal-vs-polling, typed-vs-untyped GDScript, lazy preload, texture atlasing, FoW occlusion, etc.), applies low-risk fixes via Python atomic-write, prompts for confirmation on high-impact ones, and writes a row to docs/OPTIMIZATION_LOG.md per HBH's discipline. Use whenever the user mentions performance, optimization, lag, FPS drop, stutter, hitching, frame budget, slow scene, slow load, GC churn, MultiMesh, batched tick, spatial partitioning, "make this faster", "why is the game lagging", "the editor is dropping frames", "scene loads slow", "build takes forever", "memory growing", "particle slowdown", "shader cost", or anything Godot 4 performance-flavored. Designed for HBH (hundreds-to-thousands enemies target) and BR (denser-grid colony defense), but applies to any Godot 4 project. Honors per-project .project-context.json + the OPTIMIZATION_LOG history so it never re-suggests an optimization already tried.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:

- `critical_files_for_python_atomic_write` — every perf fix that touches one of these MUST use the atomic-write-with-readback pattern, never the Edit tool
- `hazard_catalog` — load the per-project hazards file (HTBH/BR/etc.) for project-specific perf rules
- `hard_rules` — never apply a fix that violates one (e.g., `no_agency_removal` blocks "freeze enemies to skip their tick", `no_accuracy_in_htbh` blocks "skip hit-resolution rolls", `efficiency_first_engineering` is what triggered this skill in the first place)
- `engine` + `primary_language` — confirm this is a Godot project before invoking GDScript-specific patterns

If the context file is missing or the project is not Godot, log a queue item and exit.

## Why this skill exists

HBH targets hundreds-to-thousands of enemies on screen. Every per-frame allocation, every untyped Variant, every `find_node` string lookup compounds at scale. The HBH CLAUDE.md says: "Always check `docs/OPTIMIZATION_LOG.md` before suggesting a perf change — that doc tracks every shipped optimization (so we do not re-ship the same change), the active investigations (suspected hot paths needing profiler data), and a profiler walkthrough Nick can follow to capture frame data. Every perf-touching commit MUST add a row to that log."

This skill operationalizes that discipline. It does NOT speculate about hot paths without evidence; it walks the project context, the OPTIMIZATION_LOG history, the relevant hazard catalog, and the actual code, then suggests fixes grounded in observed shape (typed signatures, batched-tick eligibility, MultiMesh density, etc.). For ambiguous cases, it asks for profiler data before guessing.

## When to invoke

The trigger description hits the obvious cases (perf, optimize, lag, FPS drop). Also invoke proactively when:

- A `_process(dt)` body is being added to a class that may exist at high count (enemies, projectiles, terrain tiles, particle systems)
- A new system is being added that walks `get_tree().get_nodes_in_group(...)` per frame
- A new `_input` or `_unhandled_input` handler is being added (these run per-Node, per-event)
- A `preload()` is being added inside a function body (it is parse-time anyway, but the cost shows up at scene-load)
- The bar-raise or code-audit findings include anything under the `perf` / `performance` / `efficiency` category

Do NOT invoke for:

- Pure correctness fixes (bugs that are about behavior, not speed)
- One-time setup code (boot path, save/load — those run once, perf doesn't matter)
- Editor-time tooling unless explicitly called out

## Run flow

Four phases. Each one produces evidence for the next.

### Phase 1: Walk the context

Read in order:

1. `<project-path>/.project-context.json` (per Step 0)
2. `<project-path>/docs/OPTIMIZATION_LOG.md` if it exists. This is the source of truth for what has already been tried. Note each "Shipped optimizations" row, each "Active investigations" row (those are hot paths waiting on profiler data), and any "Tried but rejected" rows (those failed for a reason worth understanding).
3. `<project-path>/docs/GDD.html` Decisions tab (HBH/BR) or `docs/DECISIONS.md` (other projects) for any locked-down architectural decisions that constrain options. Notable on HBH: no accuracy, no agency removal, dual-path enemy implementations, S-39 constants centralization.
4. `hazards/per-project/<PROJECT>.md` from the code-audit skill — has Godot-specific hazards already cataloged.
5. The user's actual prompt — what symptom are they reporting? "Lag when 200 enemies spawn" is different from "scene load takes 3s" is different from "GC stutter during combat".

If the user has not provided profiler data and the prompt is symptom-based (not code-pointer-based), ask once for profiler output OR for the offending function/file. Do not guess at hot paths without evidence — that is how the 11-patch v0.74.22-v0.74.32 cycle happened. See `references/profiler-workflow.md` for how to capture data quickly.

### Phase 2: Diagnose the pattern

Use `references/optimization-patterns.md` as the catalog. The catalog is organized by symptom (frame-budget overrun, scene-load slow, allocation churn, GPU bottleneck, etc.) and within each section by pattern (per-frame allocation, untyped Variant, etc.). Each pattern has: when-it-applies, the fix, the typical speedup, the risk class (low/medium/high), and an example before/after.

For each candidate pattern:

- Confirm it applies to the actual code (don't pattern-match on speculation)
- Estimate the impact (% of frame budget, lines affected)
- Note the risk class — low-risk gets auto-applied, medium/high gets confirmation

Run `scripts/scan_perf_hazards.py --target <project-path>` to surface regex-detectable patterns the catalog covers (per-frame allocs, untyped Variant in `_process`, `find_node` string lookups, etc.). Feed its findings into the diagnosis.

### Phase 3: Apply the fixes

The "Modify + log" mode (per Nick's locked preference):

- **LOW risk** (typed annotations, hoisted lookups, lazy preload, `@onready` shortcuts, signal cleanup) — apply automatically. Use Python atomic-write-with-readback for any file in `critical_files_for_python_atomic_write`. Tail-check after every write.
- **MEDIUM risk** (batched-tick conversion, `_process` to `_physics_process` migration, throttle constant tuning) — present the diff and ask "apply this?" once per change. If user says "yes to all" once, batch the remaining mediums.
- **HIGH risk** (MultiMesh refactor, system cadence change, removing a per-frame callback altogether, changing a tuning constant the GDD has locked) — present the design, the trade-off, the expected speedup, and ask explicitly. Do NOT batch these; each one gets its own confirm.

Never apply a fix that:

- Violates a hard rule from `.project-context.json` (e.g., HBH's `no_agency_removal` blocks "skip enemy tick when off-screen by freezing")
- Changes a value locked in DECISIONS / GDD without an explicit user override
- Touches the dual-path enemy code without running through `scripts/audit-dual-path.ps1`'s check #6 (mirror integrity)

### Phase 4: Write the OPTIMIZATION_LOG.md row

After EVERY applied fix, append a row to `<project-path>/docs/OPTIMIZATION_LOG.md`. Format:

```markdown
## YYYY-MM-DD — <one-line summary>

- **What**: <the change in one sentence>
- **Where**: `<file>:<line>` and any related sites
- **Why**: <the symptom or the hot-path measurement>
- **Pattern**: <name from references/optimization-patterns.md catalog>
- **Risk**: low | medium | high
- **Before**: <measurement if available, or "unmeasured (low-risk text change)">
- **After**: <measurement if available, or "expected speedup per catalog">
- **Verified**: <how to verify; e.g., "FPS in Skirmish at 1000 enemies" or "frame time on Wave 5">
- **Reverted-if-broken-by**: <commit-revert-able? rollback steps if not>
```

If OPTIMIZATION_LOG.md does not exist in the project, create it with this header:

```markdown
# OPTIMIZATION_LOG

Every perf-touching change to this project. Audit before suggesting a new optimization — do not re-ship something already tried, and do not chase a hot path already measured cold.

Newest at the top. Each entry follows the godot-perf-optimize skill template.

## Active investigations

(Hot paths suspected to be expensive but not yet measured. Move to "Shipped optimizations" once a fix lands.)

## Tried but rejected

(Optimizations that looked good on paper but failed in practice. Note WHY so the next session does not re-litigate.)

---
```

After the row is written, run the project's tail-check to verify OPTIMIZATION_LOG.md ended syntactically clean (the FUSE truncation hazard applies to this file too).

## Severity rubric (for findings)

When this skill is invoked without "apply" intent (e.g., the user asks "audit perf"), use the same rubric as code-audit:

- **BLOCK** — a perf regression that would crash the game (memory leak, infinite allocation, render-thread starvation). Stop the release.
- **HIGH** — measurable frame-budget overrun in the target scenario (e.g., HBH 1000 enemies dropping below 60 FPS due to a single fixable hot path).
- **MEDIUM** — wasteful pattern that does not yet bite but will at the target scale (e.g., per-frame allocation in a class that exists at low count today).
- **LOW** — micro-optimization with measurable but small impact (typed annotation, hoisted const).

## Project-aware behavior

The skill loads `hazards/per-project/<PROJECT>.md` from the code-audit skill. Notable per-project rules:

**HTBH** — `no_accuracy_in_htbh` blocks "skip enemy hit roll" optimizations. `no_agency_removal` blocks "freeze unit to skip tick". S-39 const-centralization means any new tuning constant goes in `source/autoloads/constants.gd`, not a local mirror. Dual enemy paths (`enemy_base.gd` + `enemy_pool.gd`) MUST be updated together; run `scripts/audit-dual-path.ps1` after any enemy-side perf fix.

**BR** — Same Godot scaffolding as HBH. Stricter voice rules in any docs/log content written. Sibling project, do NOT cross-contaminate.

**Other Godot projects** — Use the generic Godot 4 catalog. If a project has no `.project-context.json`, fall back to reading `CLAUDE.md`.

## Integration points

### code-audit skill

The code-audit skill flags perf-related hazards (per-frame `_process` issues, untyped Variant in hot paths). When invoked, this skill cross-references the most recent `CODE_AUDIT-*.md` report and prioritizes addressing the perf-flagged findings first.

### work-queue-runner

MEDIUM findings that the user does not approve immediately get queued into `X:\YesAndEverything\.work-queue.json` with `tag: godot-perf` and the perf-catalog pattern name. The work-queue-runner drains them on its 4-hourly cadence (low-risk apply for the medium ones, or escalation back to the user for high-risks).

### preship.ps1

Add to `scripts/preship.ps1`:

```powershell
# Optional: perf-hazard scan (does not block; warn-only)
python "<skill-path>\scripts\scan_perf_hazards.py" --target "$PWD" --warn-only
```

The scanner exits 0 (warn-only by default) so it does not block releases. Run with `--exit-on-high` to make HIGH findings block.

### bar-raise

The bar-raise skill reads OPTIMIZATION_LOG.md as part of its broader review. If this skill has just written a row, bar-raise picks it up next run and includes the impact in its next dashboard JSON.

## Reference files

- `references/optimization-patterns.md` — the deep catalog. Load this for any pattern lookup; do NOT inline the patterns into your reasoning from memory.
- `references/profiler-workflow.md` — how to capture profiler data from Godot 4 (editor walkthrough + in-game overlay snippet). Reference this whenever the user has a symptom but no measurement.

## Constraints

- Never auto-apply HIGH-risk changes without explicit user confirmation.
- Never modify a file in `critical_files_for_python_atomic_write` via the Edit tool — always Python atomic-write-with-readback.
- Never violate a hard rule from `.project-context.json` even if the rule technically allows it (e.g., `no_accuracy_in_htbh` was written specifically because someone might rationalize "but this would be SO much faster" — answer is still no).
- Never bump versions, never run release scripts.
- Solo-dev voice on any committed content (the OPTIMIZATION_LOG.md row, commit messages).
- Do NOT load >100KB files into the LLM context for analysis. Slice or use the deterministic scanner.
- Respect the OPTIMIZATION_LOG history — if a pattern has been tried and rejected, do not re-suggest it without addressing the original rejection reason.

## How to extend

New optimization pattern:
1. Add to `references/optimization-patterns.md` with the standard format (when-it-applies, fix, speedup, risk, before/after).
2. If regex-detectable, add a check to `scripts/scan_perf_hazards.py`.

New per-project rule:
1. Append to the project's `hazards/per-project/<PROJECT>.md` in the code-audit skill (the source of truth for per-project hazards).
2. If it constrains an optimization, document the reason — future sessions need to know WHY a fix is off the table.

New profiler workflow tip:
1. Append to `references/profiler-workflow.md`.

## Reference: lessons that motivated this skill

- The 11-patch v0.74.22 through v0.74.32 cycle (HBH 2026-05) was burned on the WRONG perf path. The dual enemy implementations meant a fix landed on `enemy_base.gd` was invisible on `enemy_pool.gd`. The audit-dual-path.ps1 script now enforces parity. Lesson: identify which code path actually runs (debug flags, branch state) before touching anything.
- v0.61.0 halved TILE_W/TILE_H from 128/64 to 64/32 for the cell-density rework. Massive perf gain but came with a 30-file mirror-update bill because S-39 const-centralization was not yet in place. Lesson: centralize before optimizing.
- The "fog dormancy" hot path was suspected for 4 patches before profiler data revealed the actual cost was elsewhere (in target acquisition). Lesson: measure before refactoring.
- v0.70.0 doubled the target-reacquire interval from 0.5s to 1.0s for pool enemies and got a measurable scan-rate reduction. The same logic took until 2026-05-28 to land on per-Node (the bar-raise caught the divergence). Lesson: when tuning a constant, audit every mirror for consistency.
- The FUSE Edit-tool truncation hazard is real for the GDD, autoloads, and system entry points. Every perf fix that touches one of those files MUST use Python atomic-write-with-readback. Reference scripts live in HBH `outputs/v0_74_3*_apply.py`.
