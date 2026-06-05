# Godot 4 optimization patterns catalog

Indexed by symptom -> pattern. For each pattern: when-it-applies, the fix, typical speedup, risk class, before/after example. The skill consults this file; do NOT inline these from memory.

## Index by symptom

| Symptom | Patterns to consider |
|---|---|
| Frame-budget overrun under load (FPS drops at high N) | per-frame-process-at-scale, multimesh-conversion, batched-tick, get-nodes-in-group-loop, find-node-string-lookup, untyped-variant-hot-path, signal-vs-poll, spatial-bucketing |
| Stutter / hitch (occasional 1-frame spikes) | gc-allocation-churn, scene-instantiate-runtime, preload-vs-load, audio-stream-load, shader-compile-stall, async-vs-sync-load |
| Slow scene load | preload-explosion, oversized-imported-asset, mesh-without-lod, audio-without-stream-mode, texture-atlas-missing |
| Slow editor / slow build | huge-tscn-flattening, ext-resource-cascade, import-cache-stale |
| Memory growth over time | leaked-signal-connection, autoload-state-balloon, packed-scene-cache-never-evicted, render-target-leak |
| GPU bottleneck (high frame time but low CPU profiler) | overdraw, transparent-overuse, shader-branching, light2d-overuse, viewport-resolution |
| Pathfinding slow | astar-grid-rebuild-per-frame, astar-no-throttle, navigation-region-too-fine |
| Physics slow | physics-bodies-when-area-suffices, physics-tick-rate, collision-mask-overuse |
| Particle slowdown | cpu-particle-when-gpu-fits, particle-amount-too-high, particle-collision-overkill |

## CPU patterns

### per-frame-process-at-scale
**When it applies:** A class with `_process(dt)` or `_physics_process(dt)` exists at high count (>50 instances). Every frame costs N * tick_time.
**Fix:** Convert to a single "manager" tick (one autoload or system Node walks the active set and ticks each). Or batch via MultiMesh + a data-pool that ticks in a tight `for` (no per-Node callback). Or stagger via modulo: enemy at index `i` ticks only when `(frame_count + i) % stagger == 0`.
**Speedup:** 5-50x at 1000 instances. Eliminates per-Node callback overhead entirely.
**Risk:** medium (changes when the tick fires, can cause visible jitter if naive). High if it replaces a per-frame visual effect.
**Before / after:** Per-Node `_process(dt)` callback in `enemy_base.gd` -> pool-tick in `enemy_pool.gd` walking `EnemyData[]`. See HBH `source/enemies/enemy_pool.gd` for the locked pattern.
**HBH note:** Already adopted for the high-density enemy classes. Per-Node path retained for low-density / Skirmish art-preview use (debug_flags.use_multimesh_<type> selects which).

### multimesh-conversion
**When it applies:** Many visually-identical instances (trees, grass, debris, projectiles, low-detail enemies) each as their own Node2D/Sprite2D. Per-instance Node + per-instance draw call is wasteful when they could share a single mesh + per-instance transform buffer.
**Fix:** MultiMeshInstance2D (or MultiMeshInstance3D). One Node, one mesh, N transforms in a packed buffer. Update only the moved instances; static ones cost nothing per frame after upload.
**Speedup:** 10-100x at 1000+ instances. Major draw-call reduction.
**Risk:** medium for static decor (trees), high for animated/interactive (enemies). MultiMesh has no per-instance signals, no per-instance script, no per-instance collision.
**Pairing:** Use with a parallel data pool that owns the gameplay state (position, velocity, HP). The MultiMesh holds only the visual transforms.

### batched-tick
**When it applies:** A behavior needs to run "every N frames" not every frame. Cooldowns, AI re-target, regen ticks, area damage.
**Fix:** Maintain a `_tick_accumulator` and only execute when it crosses the threshold. Or use Godot's `Timer` Node for >0.5s intervals (the Timer is implemented natively). For sub-frame timing, just count frames.
**Speedup:** Proportional to the tick interval (every-4-frames = 4x).
**Risk:** low for cooldowns and regen. Medium for movement/animation (visible jitter).
**HBH example:** `TARGET_REACQUIRE_SEC = 1.0` in enemy_pool means re-target runs once per second per enemy, not per frame. The accumulator pattern lives in `_tick_target_acquisition`.

### get-nodes-in-group-loop
**When it applies:** `get_tree().get_nodes_in_group("X")` called inside `_process` or a hot loop. The call walks the SceneTree's group index every time -- not cached.
**Fix:** Cache the array in an autoload or system Node. Refresh it on group membership change (group_added / group_removed signals on each node). For high-churn groups, use a dirty-flag instead of caching.
**Speedup:** 2-10x depending on N and group size. The cost is O(group_size) per call.
**Risk:** low. The behavior is unchanged; you just stop re-querying.

### find-node-string-lookup
**When it applies:** `get_node("NodePath")` or `find_node("name")` called per-frame. String-based lookup walks the SceneTree.
**Fix:** Cache in `_ready` as a typed `@onready var`. If the target Node can change at runtime, cache it on the change event, not on every access.
**Speedup:** Marginal per call but adds up. More important: typed reference enables compile-time autocomplete + warnings.
**Risk:** low. Pure refactor with no behavior change.
**Pattern:**
```gdscript
# BAD - per-frame string walk
func _process(dt):
    var hp_bar = get_node("UI/HUD/HPBar")
    hp_bar.value = current_hp

# GOOD - cached + typed
@onready var hp_bar: ProgressBar = $UI/HUD/HPBar
func _process(dt):
    hp_bar.value = current_hp
```

### untyped-variant-hot-path
**When it applies:** A variable in a hot loop has no type annotation. GDScript treats it as Variant; every operation pays the dispatch cost.
**Fix:** Annotate with the actual type. For HBH this is mandatory anyway (`warnings_as_errors`).
**Speedup:** 2-5x on the hot loop itself.
**Risk:** low. The bytecode is faster; the behavior is identical.
**Pattern:**
```gdscript
# BAD
for tx in transactions:
    var amt = tx.amount  # Variant
    total += amt

# GOOD
for tx: TxRow in transactions:
    var amt: int = tx.amount
    total += amt
```

### signal-vs-poll
**When it applies:** A class checks "did X change since last frame?" via polling in `_process`.
**Fix:** Connect to the change signal. The check now only fires when the change actually happens.
**Speedup:** Eliminates per-frame check entirely (1 / framerate -> 0). Huge for events that fire rarely.
**Risk:** medium. Need to handle signal disconnect on Node free (or use `connect(callable, CONNECT_ONE_SHOT)` for one-time hooks).
**Edge case:** If the polled value changes >once per frame, signals introduce ordering issues. Keep polling for high-frequency state.

### spatial-bucketing
**When it applies:** A "find all X within radius Y of point Z" query runs per-Node or per-frame. Naive O(N) walk over all candidates.
**Fix:** Maintain a spatial hash (dict keyed by tile coord -> array of candidates). Insert on spawn, remove on free, lookup by tile range. For HBH's enemy targeting this is the foundation of the pool's bucket query.
**Speedup:** O(N) -> O(K) where K is the average candidates per bucket. Easily 10-100x at high N.
**Risk:** medium. Bucket invalidation on movement is the bug class to watch.

### gc-allocation-churn
**When it applies:** Per-frame array/dict construction, string concatenation in hot paths, lambda captures inside loops.
**Fix:** Hoist constants out of the loop. Reuse a pre-allocated array via `.clear()` + `.append`. Use `String.format` ONCE, not in every frame.
**Speedup:** Stutter elimination (the allocations themselves are fast; the periodic GC sweep is what hits). 0 GC pauses is the goal.
**Risk:** low. Pure refactor.

## Loading / scene patterns

### preload-explosion
**When it applies:** A scene's script `preload`s 20+ resources at the top. Every scene load pays the full cost.
**Fix:** Convert non-critical preloads to `load()` calls inside the functions that use them. `preload()` is parse-time; `load()` defers.
**Speedup:** Scene-load time scales with preload count.
**Risk:** low for non-critical resources, medium for resources used on the critical path of `_ready()`.

### scene-instantiate-runtime
**When it applies:** A scene gets `instantiate()`-ed on demand during gameplay (projectile spawn, particle burst). The first instantiate is slow (parse + setup); subsequent ones are faster but still allocate.
**Fix:** Pre-instantiate N copies into a pool at boot. Reuse via `set_visible(false) + remove from active set` instead of `queue_free`.
**Speedup:** Eliminates first-spawn hitch entirely. Subsequent spawns cost array index assignment, not allocation.
**Risk:** medium. Pool management has its own bugs (double-free, dangling reference, leak on level change).

### preload-vs-load
**When it applies:** Choosing between `preload(path)` and `load(path)` for a resource.
**Fix:** `preload` for resources needed during parse / class init that are guaranteed to exist. `load` for runtime-conditional, optional, or large resources.
**Risk:** preload of a missing path BREAKS THE WHOLE SCRIPT at parse time. The if-guard around preload does NOT defer; it still resolves at parse. (BR v0.30.0 hit this; see code-audit's godot_preload_runtime.py.)

### shader-compile-stall
**When it applies:** First use of a shader in a scene causes a frame stall while it compiles.
**Fix:** Pre-warm shaders by rendering a 1x1 quad with each shader during a loading screen, before the gameplay scene starts.
**Speedup:** Eliminates first-use stall entirely.
**Risk:** medium. Pre-warm code is fiddly and needs maintenance as shaders are added.

## Rendering / GPU patterns

### overdraw
**When it applies:** Frame time high but CPU profiler shows the CPU is idle waiting on GPU. Usually means many transparent layers stacked.
**Fix:** Audit the transparency stack. Reduce particle alpha. Switch transparent UI panels to opaque where possible. Use the visual profiler's "overdraw" view (Project > Project Settings > Rendering > Driver > Debug > Overdraw).
**Speedup:** Proportional to fragments saved.
**Risk:** low (mostly visual) -> high (if you accidentally make UI opaque that was supposed to be a glass overlay).

### light2d-overuse
**When it applies:** Many `Light2D` Nodes in a scene. Each one adds a render pass.
**Fix:** Bake the static lighting into the tilemap texture. Reserve dynamic Light2D for player-following / movable lights.
**Speedup:** Frame time scales with light count.
**Risk:** low for static lighting (visual-only change).

### viewport-resolution
**When it applies:** Game runs at native resolution on a high-DPI display. Fragment shader cost scales with pixel count.
**Fix:** Use Project > Display > Stretch > 2D (or canvas_items) to render at a fixed lower resolution and upscale. Already done on HBH at 1920x1080.
**Speedup:** 4x going from 4K native to 1080p stretched.
**Risk:** low for pixel-art games, high for visually-detailed games (upscaling artifacts).

## Pathfinding patterns

### astar-grid-rebuild-per-frame
**When it applies:** `AStarGrid2D.update()` or `set_point_solid()` called per frame for moving obstacles.
**Fix:** Maintain a dirty flag. Mark dirty on building placement / removal. Only call `update()` when dirty AND a unit needs a path THIS frame.
**Speedup:** Massive. AStarGrid2D.update() is O(W*H).
**Risk:** medium. Stale grid = paths through new buildings = bug.

### astar-no-throttle
**When it applies:** Every unit re-paths every frame. At 50 units that's 50 A* runs per frame.
**Fix:** Throttle re-path: only re-path if the target moved >N tiles OR M ticks elapsed since last re-path. Or: only re-path the first K units per frame, round-robin.
**Speedup:** Scales with the throttle ratio.
**Risk:** medium. Stale paths cause visible "wandering toward old position" until next re-path.

## Per-project notes

### HereBeHordes
- Dual enemy paths (enemy_base.gd + enemy_pool.gd). Any perf fix on one MUST be mirrored. Run `scripts/audit-dual-path.ps1` check #6 after the fix.
- S-39 const-centralization. New tuning constants go in `source/autoloads/constants.gd` with mirror annotations.
- `efficiency_first_engineering` memory: this is the WHOLE POINT of HBH's engineering posture. Lean toward applying.
- `no_accuracy_in_htbh` + `no_agency_removal` block specific "perf wins" that would change gameplay feel. Honor them.

### BrackishRising
- Same Godot scaffolding as HBH, denser grid (32x16 instead of 64x32). Per-unit cost matters more.
- Voice rules are stricter on log content (no em dash, no AI tool names, no inline svg).
- Sibling project, do NOT cross-contaminate enemy code between projects.

### Other Godot projects
- Generic Godot 4 catalog applies. Fall back to CLAUDE.md if no .project-context.json exists.
