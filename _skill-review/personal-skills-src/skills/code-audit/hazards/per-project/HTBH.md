# HTBH project-specific hazards

`X:\HereBeHordes`. Industrial-era horror RTS in Godot 4.6. GDScript-first, hundreds-to-thousands of enemies on screen target.

## Always-on checks for this project

Run on every code-audit pass against HBH:

- `checks/parallel_implementations.py` — dual enemy paths (enemy_base.gd + enemy_pool.gd)
- `checks/silent_field_guards.py` — `"X" in node` no-op bails
- `checks/fuse_truncation.py` — critical files (see list below)
- `checks/godot_preload_runtime.py` — preload in conditionals
- `checks/godot_tscn_comments.py` — # in .tscn
- `checks/godot_orphan_export.py` — orphan @export
- `checks/godot_empty_if.py` — empty if-block after cut-mechanic sweep
- `checks/const_mirror_integrity.py` — autoload mirror drift
- `checks/voice_violations.py` — GDD changelog footer + commit messages
- `checks/version_drift.py` — project.godot config/version vs docs/GDD.html pill vs git tag

## Critical files (FUSE-truncation BLOCK)

The following files MUST end syntactically clean. Tail-check every audit run:

- `docs/GDD.html` — must end with `</html>\n`
- `source/autoloads/*.gd` — every autoload script
- Files referenced by `[autoload]` in `project.godot`
- System entry points: `source/main/gameplay.gd`, `source/systems/wave_director.gd`, `source/world/fog_of_war.gd`
- `source/buildings/building.gd` (extends-base for every building subclass)
- `source/units/unit.gd` (extends-base for every unit subclass)

## Recurring patterns

### Dual-path enemy divergence (HIGH, recurring)

Reference memory `htbh-dual-pool-per-node`. enemy_base.gd (per-Node) and enemy_pool.gd (data pool) are two parallel implementations selected by `debug_flags.use_multimesh_<type>`. Every behavior change to one needs the same change to the other.

The 2026-05-28 bar-raise unified the TARGET_REACQUIRE constants. If new divergence appears, flag as HIGH. The `scripts/audit-dual-path.ps1` check #6 enforces equality between constants.gd and the local mirrors; honor that script's findings.

### Lore direction: Alien Portal canonical

Per memory `lore-direction-resolved` and HBH CLAUDE.md. Any code referencing "Out of the Depths", coral, brackish, navy themes belongs to Brackish Rising, not HBH. Cross-contamination is a HIGH finding.

### Path-extends, not class_name

HBH uses `extends "res://source/buildings/building.gd"` to avoid Godot 4 class-registry boot timing issues. New files using `extends Building` (registry-name) instead of path-based should be flagged MEDIUM with a fix suggestion.

### No accuracy in gameplay (HIGH)

Per memory `no_accuracy_in_htbh`. Units always hit. Debuffs use damage and/or armor reduction, never accuracy. Code introducing `hit_chance`, `accuracy`, `miss`, or any roll-to-hit pattern → BLOCK.

### No agency removal (HIGH)

Per memory `no_agency_removal`. Never freeze units, ignore orders, or override player behavior. Debuffs scale stats only. Code introducing `is_stunned`, `is_frozen`, `cannot_move`, `force_idle`, or any orders-override path → BLOCK.

### Per-frame `_process` on per-Node enemies

Hundreds-to-thousands target. Anything new in `_process(dt)` on `enemy_base.gd` is HIGH — must move to pool path, batched tick, or lower-cadence callback. Document in `docs/OPTIMIZATION_LOG.md`.

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
