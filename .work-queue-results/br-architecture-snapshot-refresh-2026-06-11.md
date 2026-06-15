# br-architecture-snapshot-refresh-2026-06-11 - drain slice (2026-06-15T01:09:51Z)

Run: queue-drain-4h (every-4-hours cross-project drain).
Item: P2 drift-fix. docs/ARCHITECTURE.md was a v0.39.0 snapshot; repo is now v0.58.2 (HEAD 847f6a8).

## Done this slice (committed-ready in X:\BrackishRising working tree)

Added a "Deltas since the v0.39.0 body (current at v0.58.2)" section to docs/ARCHITECTURE.md
(after the intro, before section 0) and refreshed the snapshot header. Each delta verified
against source before citing:

1. Keeper draft layer - keepers autoload (source/autoloads/keepers.gd): REGISTRY:58, DRAFT_TIERS:50,
   OFFER_SIZE:51, STYLE_*:45-47, signals:41-43, toggles:142-144. On-kill effects via
   enemy_base.gd:1200 _apply_keeper_kill_effects() (called :891). Read across building/economy sites.
2. EnemyData.NUMBERS single-sourcing - enemy_data.gd:56 const NUMBERS (8 enemy stat lines; pool+Node
   both read it; buffs multiply at use site; move_speed folded in v0.57.8).
3. 4-direction facing - unit.gd:36 (4 dirs x 15 frames), _facing:334,
   _update_facing_from_screen_delta():1064, _last_drawn_facing:346.
4. ASSET_SCALE_MASTER - constants.gd:31; applied at building.gd:958, enemy_base.gd:1156,
   enemy_renderer.gd:67, unit.gd:1844.
5. v0.57.0 grid overlay rework - documented as known-stale; precise path:LINE NOT fabricated.
   Candidate sites flagged for the re-weave (source/systems/, ui/gameplay/gameplay.gd).

Atomic write + readback; em-dash check passed; tail intact (308 lines).

## Remaining (full-session sized, left pending)

- Re-weave ARCHITECTURE.md sections 1-9 to v0.58.2 (the v0.39.0 body is still inline above the deltas).
- Refresh the GDD Architecture tab (docs/GDD.html, 666KB). NOT touched this run - 666KB over FUSE in a
  5-minute scheduled window is the exact truncation hazard the queue _note history is full of; do it in
  a focused attended session with the Python atomic-write path.
- Pin the v0.57.0 grid-overlay anchor.

## Ship
Doc-only. cd X:\BrackishRising; .\scripts\release.ps1 -Bump none  (no version bump; this is a
code-doc snapshot, not a game change). Shell paused per drain constraints (no release from this task).
