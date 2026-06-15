# htbh-minimap-float-mirror-drift-2026-06-11 - resolution

Run: overnight-queue-drain 2026-06-14
Verdict: CLOSED - resolved-by-retirement (premise stale)

## Finding
The item flags `source/ui/minimap/minimap.gd` declaring `TILE_W: float = 64.0` /
`TILE_H: float = 32.0` (pre-v0.76.0 values, 2x the current 32/16) and evading
`scripts/check_constants_mirrors.py` because the guard regex only matches int-typed consts.

## Ground truth at HEAD
- `source/ui/minimap/minimap.gd` no longer exists. `git ls-files source/ui/minimap/`
  returns 0 tracked files. The whole 2D minimap was dropped with the 2D-layer
  retirement in v0.98.5 (last touch of that path: commit 9af7f4f, v0.98.5).
- The live minimap is `source/world3d/minimap_3d.gd`. It carries zero float-typed
  TILE consts; its only numeric literal of interest is `16.0/9.0` (aspect ratio, L84).
- The ONLY `TILE_W`/`TILE_H` declarations anywhere under `source/` are the canonical
  int consts in `source/autoloads/constants.gd` (`TILE_W: int = 32`, `TILE_H: int = 16`).

## Disposition of the two sub-questions
1. Genuine drift vs intentional cell-scale: MOOT. The file that carried the halved-behind
   float values is gone; there is no drifted value left to fix or to render-check.
2. Extend `check_constants_mirrors.py` to also match float-typed consts: NOT NEEDED for
   correctness. No float-typed TILE mirror exists in the tree, so the int-only regex is
   currently sufficient. A defensive float-regex + allowlist could be added later as guard
   hardening against a FUTURE float mirror, but that is a low-value guard-script code change
   (the reason this item was tagged auto_safe:false) and is not tracked here as required work.

## Side note (not this item's scope)
`constants.gd` header comment (L16-20) still lists the retired 2D mirror paths
(source/world/iso_grid.gd, source/buildings/building.gd, source/enemies/enemy_base.gd,
source/units/unit.gd, source/world/tree_sprite.gd). That is stale doc-comment drift from the
2D drop, separate from this item. Worth a small constants-comment refresh if not already queued.

## Actions
- No code change shipped. No HBH GDD bump warranted (queue-item close only, no code touched).
- Item closed verified; no shell op, no commit needed.
