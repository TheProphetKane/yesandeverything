# hbh-gdd-dualpath-doc-cleanup-2026-06-12 result

- Started: 2026-06-12T12:35:00Z
- Finished: 2026-06-12T12:45:00Z
- Status: done (applied to working tree; release is Nick-side)
- Source: X:\HereBeHordes\docs\BAR_RAISE-2026-06-12.md MED action 2 (maintainability)
- Prompt: Rewrite the GDD architecture-tree and section-16 rendering prose to describe the single 3D render path; remove the dual-path / audit-dual-path.ps1 / "2D keeps booting alongside" lines that v0.98.5 made false.

## What was done

GDD bumped v0.98.5 -> v0.98.6 (PATCH, docs only), changelog entry written in solo-dev voice. 20 edits, all via Python atomic write + readback (FUSE hazard rule):

1. Section 16 Rendering rewritten: native 3D, orthographic 2:1-iso camera, only render path since v0.98.5, grid3d owns tile-to-world.
2. Section 16 Pathfinding rewritten: NavigationServer3D + runtime-baked NavigationRegion3D (nav3d.gd), replacing the NavigationServer2D claim.
3. Section 16 architecture sketch: real folder tree (13 autoloads incl. run_config/debug_flags; buildings/units/enemies/world/missions/save rows dropped; world3d added).
4. Architecture tab header: snapshot baseline restamped v0.98.6, engine line corrected to native 3D.
5. Section 0 frame-tick list redrawn single-path: wave_director/enemy_pool/gameplay rows replaced by world_3d._process (_tick_waves at :285, _tick_terror) + enemy_field_3d + 3D scene nodes.
6. Both visual maps redrawn: flow boxes (game_clock -> economy -> world_3d -> enemy_field_3d -> auto_pause -> render) and module layers centered on world3d/.
7. Dual-path enemy panel replaced by the single pooled enemy_field_3d + crowd3d description; "run scripts/audit-dual-path.ps1" rule removed (script deleted in v0.98.5). Second instruction in the section-4 checklist removed too; section 6 hazards row marked retired; section 7 intro de-staled.
8. Autoload table: enemy_pool / projectile_pool rows dropped, "14 are registered" -> 13 (matches project.godot).
9. Retired-layer banner inserted before the section 1-4 deep-dive so the remaining 2D internals read as a historical snapshot.
10. File tree regenerated at v0.98.6: 24 scripts. Added run_config, choose_mode, fog_overlay.gdshader, assets3d, building_catalog_3d, fog_3d, runner_import_post rows; dropped the 11 retired 2D screen tables plus buildings/units/enemies/projectiles/world; units/ noted as sprite assets only; snapshot blockquote rewritten.

Verification: tail ends `</html>` on fresh re-read, blockquote/table/tbody/ul/div tag counts balanced, zero em dashes in new content, no remaining audit-dual-path / "keeps booting" / "alongside the shipping" tokens in live prose (only intentional retired-in-v0.98.5 historical mentions). Pre-edit backup: session outputs/GDD_backup_pre_v0986.html.

## Files touched

- X:\HereBeHordes\docs\GDD.html (only file; 1,642,419 -> ~1,630,300 bytes)

## Nick-side to ship

```powershell
cd X:\HereBeHordes
.\scripts\release.ps1
```

Pre-existing tree dirt rides along: project.godot (tripo last_cleanup stamp), scripts/publish-gdd.ps1, outputs/bar_raise_2026_06_12.py.

## Followups recommended

- Reality drift found: source/vfx/damage_number.gd is still tracked although the v0.98.5 changelog says it was dropped. Either drop it or amend intent; noted in the GDD tree footnote.
- The remaining HBH bar-raise open action is the 3D crowd profile-and-log at 1000-3000 enemies (runtime capture, needs the editor; pairs with godot-perf-optimize).
- docs/ARCHITECTURE.md (the tab's source doc) presumably carries the same v0.95.0-era dual-path prose; same cleanup applies there if it is still maintained.
