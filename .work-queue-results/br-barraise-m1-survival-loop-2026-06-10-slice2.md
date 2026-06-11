# br-barraise-m1-survival-loop-2026-06-10 - slice 2 result

- Started: 2026-06-11T09:05:00Z (overnight-queue-drain)
- Finished: 2026-06-11T09:25:00Z
- Status: done (bounded verify slice; item stays pending for remaining slices)
- Prompt: BR bar-raise action #1, M1 Hold the Wall survival loop. This slice: verify fog of war wiring + continuous-position stamping, then mark the row (bk-fow, P0, MVP).

## Verdict

bk-fow ("Fog of War with continuous-position stamping") is SHIPPED and correctly wired. Zero code changes needed this slice.

## What was verified

1. **Instantiation.** gameplay.gd mission setup (~line 324) creates FogOfWar fresh per mission, parented under iso_grid for the iso transform. Always-on across layouts including Test Arena (v0.74.19 decision recorded in-code). F8 debug toggle at ~2162 guards null + has_method. Fresh node per mission means no stale explored-state carryover; reset() exists for the load path.

2. **Continuous-position stamping (the row's specific claim).** fog_of_war.gd `_process` stamps each unit's explored-memory disc at the unit's actual world position (sub-pixel, v0.74.37 port), gated on moved-since-last-stamp per instance id (v0.35.4 perf). Cell-state recompute for game queries runs at 4Hz; visuals render via GPU shader into a 20%-resolution SubViewport (v0.35.6). Persistent explored-memory texture present (v0.61.67 port). Shader uniforms pushed in _ready + defensive per-frame sync, viewport_half sourced from get_visible_rect (the v0.34.5 alignment fix is in place).

3. **Consumers.** enemy_base.gd: fog-hidden fade (modulate.a = 0), re-sleep gating for ALERT enemies back in shroud, and the targeted-walk exception so a spawning Lunger with a target still acts. minimap.gd: renders HIDDEN/EXPLORED/VISIBLE per get_tile_state, gates entity dots on is_tile_visible, resolves fog ref defensively. Vision tiers in _vision_for were repaired against post-rename script names in v0.34.0.

## Known divergence (dormant, not fixed this run)

The pool path does not consume FoW. enemy_renderer.gd plumbs `.w = anim_alpha` per instance and reads `EnemyData.modulate_a`, but nothing ever writes modulate_a from fog state (defaults 1.0, reset to 1.0 on init). Pool-path enemies would render fully visible inside fog. Dormant because every `use_multimesh_*` flag in debug_flags.gd defaults false (lungers explicitly parked as R&D). This is the same dual-path divergence class as HBH's pool/per-Node split. Left as a flagged follow-up rather than patched unattended: wiring a per-frame fog query into the pool tick is a perf-sensitive change on the hot path and the path is disabled.

## Files touched

None. Verification only. The BR working tree still carries slice 1 (command_post.gd, gameplay.gd) plus pre-existing harpoonist/preview edits, all uncommitted behind the index.lock blocker.

## Row marking

BR backlog status is localStorage-rendered (brackish-backlog-status-v1), not HTML-stamped, so the bk-fow row gets flipped in the GDD UI by hand. Doc-side: no version bump warranted (no code change), and no commit is possible anyway (.git/index.lock from Jun 8 returns EPERM on delete from the sandbox; portfolio P0 wts-2026-06-05-portfolio-wide-index-lock still open).

## Followups recommended

- Queue a P3 row: wire FoW fade into the pool path (write EnemyData.modulate_a from is_tile_visible in the pool tick, throttled) BEFORE any use_multimesh_* flag is enabled. Cheap insurance against the HBH 10-patch wrong-path hunt repeating on BR.
- Remaining slices of this item: wave cadence (BLOCKED on Nick: 180s-cadence backlog row contradicts mission.gd target_day design), Sonic Pressure wave-tier scaling (P1), convoy delivery every 4-5 waves (P1).
- bk-fow can be marked done in the GDD backlog UI.
