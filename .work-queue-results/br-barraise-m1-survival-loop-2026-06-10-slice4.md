# br-barraise-m1-survival-loop-2026-06-10 - slice 4 result

- Started: 2026-06-12 overnight-queue-drain (07:xx hour)
- Status: done (bounded feature slice; item stays pending for the last slice)
- This slice: convoy delivery every 4-5 waves (BACKLOG M1 P1 row)

## Selection note

Completion-gate items were all blocked or self-blocked this run (br-asset-production-pass gated on M1; yaa-final-polish-close remainder is Nick-side only). Next tier was bar-raise closure on the M1 survival loop. Two prior runs deliberately skipped this slice because it would stack a new version on the unshipped v0.58.0 tree. This run took it anyway with a changed shape that removes the objection:

- No new version pill. Convoy folds into the existing uncommitted v0.58.0 changeset; markers stay lockstep at 0.58.0 (verified). One release command ships both features.
- The full uncommitted tree diff is backed up at `.work-queue-results/br-v0.58.0-uncommitted-tree-backup-2026-06-12.diff` (314 lines), so a FUSE clobber can no longer destroy the work.
- The only alternatives this run were no-ops (everything else pending was blocked-on-user, Nick-side, or shell-gated).

## What shipped (working tree, folded into v0.58.0, committed-ready)

`source/ui/gameplay/gameplay.gd`:

- Convoy schedule is deterministic from the day number: arrivals on days 4, 9, 13, 18, 22, 27, ... (alternating 4- and 5-day gaps, `day % 9 in {4, 0}` with a day-4 floor). No new save state; a loaded game derives the next arrival from `current_day`.
- Cargo per arrival (tuning values pending playtest): 20 Oil, 200 Food, 15 Wood, 15 Stone, 25 Gold. Rationale: Lantern drains 4 Oil/day (OIL_DRAIN_PER_MIN 4.0, 60s days), so 20 Oil covers a 5-day gap exactly; Food is 10% of cap; Wood/Stone meaningful against their 50 caps; Gold ~= one House-minute x25. Cargo ids come from the economy autoload constants via a per-call builder (autoload names don't resolve in const expressions, known parser quirk).
- Delivery routes through `economy.add`, so stockpile caps clamp and overflow hits the Keeper overflow hook like any other gain. Success toast lists the cargo. Handler skips once a loss or win screen is up, matching the SP-relief guard style.
- Wired via `game_clock.day_advanced.connect(_on_day_advanced_convoy)` beside the existing day handlers.

## Doc state (all amended in place, still v0.58.0)

- GDD changelog entry retitled "Sonic Pressure wave-tier scaling + convoy deliveries", convoy sentences added; Numbers-tab paragraph added with schedule + cargo; pill untouched at v0.58.0 / 2026-06-12.
- CHANGELOG.md v0.58.0 entry amended with the convoy line.
- BACKLOG.md M1 convoy row flipped to DONE 2026-06-12 with the ship note.

## Verification

check_gdscript_parse OK (99), check_source_integrity OK (152), check_godot_hazards OK, check_gdd_integrity OK (ends `</html>`), check_voice OK, check_version_markers OK (all three at 0.58.0). Tails of all four touched files verified clean (gameplay.gd ends on a complete statement).

## To ship (Nick, Windows side)

```powershell
cd X:\BrackishRising
.\scripts\release.ps1 -Message "Sonic Pressure wave-tier scaling + convoy deliveries" -Bump none
```

(`-Bump none`: pill hand-bumped to 0.58.0 with the entry already written. release.ps1 clears the stale index.lock as its first step.)

## Remaining on the item

- Wave cadence (BLOCKED on Nick: the 180s-cadence backlog row contradicts the mission.gd target_day design).
- Note: gameplay.gd already carries a win state (mission_target_day -> win screen), so the 06-11 bar-raise "no win state" claim is stale; the loop pieces now standing are fail (oil-zero, shipped s1), FoW (verified s2), SP wave scaling (s3), convoy (s4), win (pre-existing). M1 survival loop is wave-cadence away from closeout.
