# GDScript hazards

Load when auditing `.gd` files. Patterns ordered by frequency of recurrence in Nick's projects.

## Parse / syntax (BLOCK)

### Empty if-block after cut-mechanic strip

```gdscript
# BAD - parse error: expected indented block
if power_supply > 0.0:

func _next_function():
    ...
```

When a mechanic gets cut, the body of `if` blocks often gets removed without removing the guard itself. The parser then expects an indented body for the `if` and finds the next `func` instead. Result: "Could not resolve super class inheritance" cascades into every file that extends this one.

Fix: remove the now-empty `if`. Or replace the body with `pass` if the guard logic still needs to be there.

Detection: `checks/godot_empty_if.py`. Hit BR v0.31.2 on building.gd; cascaded to 15+ files.

### Orphan @export annotations

```gdscript
# BAD - parse error: "Annotation @export cannot be used with another @export annotation"
@export
# var power_supply: float = 0.0  (removed in v0.31.4 cut-mechanic sweep)
@export
var hp: int = 0
```

When you strip the var that follows an `@export`, the annotation rebinds to the next var declaration. Stacking two `@export` on one var is illegal.

Fix: delete the orphan `@export` line(s).

Detection: `checks/godot_orphan_export.py`. Hit BR v0.31.4 on building.gd.

### `preload()` is parse-time, not runtime

```gdscript
# BAD - preload() resolves at parse time, NOT inside the if branch
if ResourceLoader.exists("res://path.png"):
    tex = preload("res://path.png")
```

`preload()` is evaluated when the parser walks the file, regardless of any surrounding `if`. If the file does not exist, the whole script fails to load.

Fix: use `load("res://path.png")` for runtime-conditional texture loading.

Detection: `checks/godot_preload_runtime.py`. Hit BR v0.30.0 on scout.gd + harpoonist.gd.

### Path-extends parser quirk with @export

Referencing a parent class's `@export` directly from a subclass that uses `extends "res://path/to/parent.gd"` (instead of `class_name`) can fail to resolve at boot time due to Godot 4's class-registry timing.

Fix: use getter/setter methods on the parent class instead of touching the parent `@export` directly.

Reference: memory `recurring_issues_watch`.

### Silent field guards

```gdscript
# BAD - silently no-ops for any node that doesn't declare "tile_position"
if not ("tile_position" in unit):
    return
```

Returns `false` for any class that doesn't declare the field. The entire function then no-ops; the surrounding system reports "fine"; the bug looks like an unrelated downstream issue.

Fix: derive the value from a fallback path. Example: `cursor_tile = grid.screen_to_world(grid.to_local(unit.global_position))` when `tile_position` is absent. Don't bail.

If a guard MUST bail, gate a `push_warning` (or `print` under `debug_flags.verbose_pathing`) so the silent path is visible in repro.

Detection: `checks/silent_field_guards.py`. Hit HBH for 40+ versions on `Building.dispatch_to_rally`.

## Strict-typing infractions (HIGH)

### Untyped Variant from get_script()

```gdscript
# BAD - inferred type is Variant, breaks warnings_as_errors
var x := get_script()
```

The HBH project has `warnings_as_errors` enabled. `get_script()` returns Variant. Either annotate explicitly or filter by another property.

Fix: `var x: Script = get_script()` OR filter via `building.building_name == "Foo"` instead.

Reference: HBH v0.19.3 / v0.19.4 changelog.

### `class_name` + circular import

`class_name` makes Godot register the class globally at boot. If two files use `class_name` and reference each other, the registry resolves in unpredictable order.

Fix: prefer `extends "res://path/to/parent.gd"` (path-based) over `extends ClassName` (registry-based) for parent references inside the same module.

## Logic smells (MEDIUM)

### Per-frame `_process` on Node-heavy code

HBH targets hundreds-to-thousands of enemies. A `_process(dt)` callback on a Node-heavy enemy is a per-frame cost multiplied by N enemies. At N=1000, even a 0.1ms callback is 100ms/frame budget.

Fix: prefer batched / spatial / data-oriented patterns. Tick at a lower cadence (every 4-8 frames if visual smoothness allows). Use a dedicated MultiMesh path for high-density classes.

Reference: HBH memory `efficiency_first_engineering`. Document any new perf-touching commit in `docs/OPTIMIZATION_LOG.md`.

### Magic numbers in hot paths

```gdscript
# BAD - 64 and 32 should come from constants.gd
var tile_w = 64
var tile_h = 32
```

The HBH S-39 const-centralization rule says tile dimensions, frame counts, and other shared values must live in `source/autoloads/constants.gd`. Local mirrors must annotate the mirror and be checked by `scripts/audit-dual-path.ps1` check #6.

Fix: read from `constants.TILE_W` / `constants.TILE_H` at runtime, or mirror as a local `const` with a `# MIRROR: constants.X` comment.

Detection: `checks/const_mirror_integrity.py`.

### Parallel-implementation divergence

HBH ships every gameplay enemy via two parallel implementations (per-Node `enemy_base.gd` + pool `enemy_pool.gd`). A fix landed on one is invisible on the other.

Fix: when changing anything in `enemy_base.gd` (a multiplier, a guard, a behavior), grep `enemy_pool.gd` for the analogous function and apply the same change. Run `scripts/audit-dual-path.ps1` before declaring the fix done.

Detection: `checks/parallel_implementations.py`. Reference: memory `htbh-dual-pool-per-node`.

## Style (LOW)

### Single-character variable names

In long scopes, single-letter vars (other than loop counters `i`, `j`, `k`) make code unreviewable. Prefer descriptive names.

### Mixed-level abstraction

A function that mixes a low-level math primitive with a high-level game-state mutation is hard to test and harder to refactor. Split.
