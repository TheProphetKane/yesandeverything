# HTBH project-specific hazards

`X:\HereBeHordes`. Exoplanet colony-defense RTS in Godot 4.6, native-3D stack (orthographic 2:1-iso camera, real models) under `source/world3d/`. GDScript-first, hundreds-to-thousands of enemies on screen target.

## Always-on checks for this project

Run on every code-audit pass against HBH:

- `checks/silent_field_guards.py` — `"X" in node` no-op bails
- `checks/fuse_truncation.py` — critical files (see list below)
- `checks/godot_preload_runtime.py` — preload in conditionals
- `checks/godot_tscn_comments.py` — # in .tscn
- `checks/godot_orphan_export.py` — orphan @export
- `checks/godot_empty_if.py` — empty if-block after cut-mechanic sweep
- `checks/const_mirror_integrity.py` — autoload mirror drift
- `checks/voice_violations.py` — GDD changelog footer + commit messages
- `checks/version_drift.py` — project.godot config/version vs docs/GDD.html pill vs git tag

The old `checks/parallel_implementations.py` dual-enemy-path check and `scripts/audit-dual-path.ps1` are dead artifacts: the 2D dual per-Node/pool enemy stack they enforced was retired in v0.98.5 (see "Dual enemy path" below). The 3D path is a single pooled field, so there is no second implementation to keep in parity.

## Critical files (FUSE-truncation BLOCK)

The following files MUST end syntactically clean. Tail-check every audit run:

- `docs/GDD.html` — must end with `</html>\n`
- `project.godot` — lost its `[display]` section to a FUSE cut once; keep it whole
- `source/autoloads/*.gd` — every autoload script
- Files referenced by `[autoload]` in `project.godot`
- `source/world3d/*.gd` — the native-3D render, pathfinding, and gameplay stack (`world_3d.gd`, `enemy_field_3d.gd`, `wave_director.gd`, `grid3d.gd`, `nav3d.gd`, etc.)

The pre-v0.98.5 2D entry points (`source/main/gameplay.gd`, `source/systems/wave_director.gd`, `source/world/fog_of_war.gd`, `source/buildings/building.gd`, `source/units/unit.gd`, `source/enemies/*.gd`) were deleted with the 2D-layer retirement; the gameplay brain now lives under `source/world3d/` and `source/autoloads/`.

## Recurring patterns

### Dual enemy path (retired v0.98.5)

Reference memory `htbh-dual-pool-per-node`. The 2D stack ran two parallel enemy implementations, `enemy_base.gd` (per-Node) and `enemy_pool.gd` (data pool), selected by `debug_flags.use_multimesh_<type>`, and every behavior change had to land in both. Both files plus the `enemy_pool`/`projectile_pool` autoloads were dropped in v0.98.5. The 3D path uses one pooled field (`source/world3d/enemy_field_3d.gd`), with `source/world3d/crowd3d.gd` as the MultiMeshInstance3D render lever. The dual-path parity hazard no longer applies; kept here as a pointer for anyone reading pre-v0.98.5 commits.

### Lore direction: Alien Portal canonical

Per memory `lore-direction-resolved` and HBH CLAUDE.md. Any code referencing "Out of the Depths", coral, brackish, navy themes belongs to Brackish Rising, not HBH. Cross-contamination is a HIGH finding.

### class_name is the live subclassing pattern

`source/world3d/` registers `class_name` on roughly ten files (`EnemyField3D`, `Grid3D`, `Nav3D`, and so on) and the world3d integration test boots them clean; `source/` has zero path-extends. The old `extends "res://source/buildings/building.gd"` path-based rule was a 2D-layer workaround for a Godot 4 class-registry boot-timing quirk and was retired with that layer in v0.98.5. New world3d files should use `class_name`; flag a reintroduced path-extends LOW with a fix suggestion. The residual quirk is autoload resolution, not subclassing: an autoload identifier does not always resolve by bare name under a `--script` SceneTree run (a headless test does not register autoload globals at compile time), so a `preload` of any script that references the bare name can fail to compile. Use an explicit `preload("res://...")` const or a `/root/<name>` node lookup. Flag a bare-autoload-name reference inside a preloaded script MEDIUM. Memory `recurring_issues_watch`.

### No accuracy in gameplay (HIGH)

Per memory `no_accuracy_in_htbh`. Units always hit. Debuffs use damage and/or armor reduction, never accuracy. Code introducing `hit_chance`, `accuracy`, `miss`, or any roll-to-hit pattern → BLOCK.

### No agency removal (HIGH)

Per memory `no_agency_removal`. Never freeze units, ignore orders, or override player behavior. Debuffs scale stats only. Code introducing `is_stunned`, `is_frozen`, `cannot_move`, `force_idle`, or any orders-override path → BLOCK.

### Per-frame work in the 3D enemy field

Hundreds-to-thousands target. New per-frame work in `source/world3d/enemy_field_3d.gd`'s tick, or a per-Node `_process` reintroduced on an enemy instance, is HIGH: keep the field tick batched and data-oriented and push instance transforms through the pooled `crowd3d.gd` MultiMesh rather than per-Node nodes. Document any perf-touching change in `docs/OPTIMIZATION_LOG.md`. The 2D-era `TILE_W`/`TILE_H`/`FRAMES_PER_ROW` constants were retired in the v0.99.x best-practices pass (S-39 closed for the 3D stack); the 3D grid uses `Grid3D.TILE = 1`.

### Commit-per-patch rule

Per memory `commit_per_patch_on_htbh`. Stacking versions without commits compounds FUSE truncation risk. If the audit detects an uncommitted working tree on HBH AND the working tree was modified > 24 hours ago, queue a HIGH item: "commit pending HBH work before next version bump".

## Asset workflow

Assets live in both `_ARCHIVE/` (master library) and `assets/art/` (project-active copy). Per memory `asset_dual_residence`. New assets present only in `assets/art/` without an `_ARCHIVE/` counterpart → MEDIUM finding.

## GDD publish discipline

Per memory `publish_gdd_routing`. `publish-gdd.ps1` injects base64 into `hordes/index.html` `var ENCODED`. Never copies `gdd.html` anywhere. Any new publish script that does plain file copy → HIGH.

Per memory `gdd_truncation_guard`. publish-gdd.ps1 must call `Test-GddIntegrity` before injection. If the function is missing from publish-gdd.ps1 → BLOCK.

## Version-pill drift sources

- `project.godot` `config/version` (HBH bar-raise 2026-05-28 found this 5 patches behind GDD)
- `docs/GDD.html` pill at top of the meta-pill div
- `docs/GDD.html` changelog footer first entry
- Latest git tag

All four must agree on the same `vX.Y.Z`. `version_drift.py` checks.
