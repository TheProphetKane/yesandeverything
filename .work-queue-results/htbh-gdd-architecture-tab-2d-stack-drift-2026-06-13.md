# htbh-gdd-architecture-tab-2d-stack-drift-2026-06-13 — drain result

Run: 2026-06-14 overnight-queue-drain. Status: committed-ready (file work done + verified; release is the Nick-side shell step).

## What the finding was

Audit `docs/CANONICAL_AUDIT-2026-06-13.md#D1`: the GDD Architecture tab intro (section 0) and file map (section 7) were updated to the 3D-only v0.98.6 state, but body sections 2-5 still documented the 2D file stack retired in v0.98.5 (`building.gd`, `unit.gd`, the dual-path `enemy_base`/`enemy_pool`/`enemy_renderer`, `hud.gd`, `gameplay.gd`, `iso_grid.gd`) as live, with `path:LINE` claims and no disclaimer. None of those files exist on disk.

## Ground-truth correction to the audit's assumption

The audit assumed buildings -> `building_catalog_3d.gd` etc. and that "the gameplay brain is tile-based and unchanged, reached through systems and world3d." Reading the real tree showed a bigger drift: the entire 2D gameplay layer is gone, `source/systems/` is empty (one shader), and the gameplay logic has been **inlined into the convergence scene `world_3d.gd` (1254 lines)** alongside the `world3d/` modules. The autoloads (economy, game_clock, research, noise_field, auto_pause, save_load, run_config) survive and hold all state. The rewrite documents that reality rather than the audit's cleaner assumption.

## What changed (docs/GDD.html only)

- Rewrote Architecture tab sections 2-5 against the real `world3d/` tree:
  - **§2 Buildings** -> `building_catalog_3d.gd` (CATALOG:10, 38-entry roster with `src` back-refs), `building_registry_3d.gd` (MODELS:10, CP real + placeholder boxes), `placement_3d.gd` (ground-raycast ghost), build flow in `world_3d.gd` (`_build_menu:517`, `_on_building_placed:351`).
  - **§3 Units** -> `world_3d.gd` `UNIT_TYPES:680`, `_train_unit:688`, `_spawn_unit:703`, `_tick_units:719`, `_kill_unit:773`.
  - **§4 Enemies** -> collapsed the dual-path narrative into the single pooled `enemy_field_3d.gd` (`ENEMY_TYPES:14`, `spawn_wave:52`, `_physics_process:110`, `damage_in_range_typed:188`), `crowd3d.gd` MultiMesh renderer, wave cadence `_tick_waves:301` / `_tick_defenders:317`.
  - **§5 UI/world/save** -> inline HUD panels, world-render modules (`iso_cam_3d`, `scene3d`, `grid3d`, `nav3d`, `fog_3d`, `minimap_3d`), save/run-config (`_save_run:1058` / `_load_run:1097`). New §5.4 migration-state note folds the §7 residuals (empty `missions/` + `save/` folders, surviving `vfx/damage_number.gd`).
- Version pill `v0.98.6` -> `v0.98.7`, date -> `2026-06-14` (PATCH, doc-only).
- Changelog entry added at top of the footer, descending order, solo-dev voice.

## Verification

- Both edits via atomic Python write (tmp + fsync + os.replace + readback), FUSE-truncation-safe per the HBH hazard catalog.
- Tail confirmed `</html>`; 0 em dashes in the file; pill present in 2 places (header + changelog).
- Dead `path:LINE` claims confirmed removed from the §2-§5 live body; the 6 remaining matches in the file are all historical changelog/backlog/decisions text (correctly untouched).
- Not run: Godot parse (doc-only change, no `.gd` touched).

## Nick-side to close

The GDD is committed-ready. Publish via the project flow:

```
cd X:\HereBeHordes
.\scripts\release.ps1
```

That commits + pushes + republishes the GDD to yesandeverything.com/hordes. The §7 file map and the "Snapshot at v0.98.6" stamp were left at v0.98.6 on purpose (the tree was not regenerated this pass); a future full-tree regeneration can restamp them.
