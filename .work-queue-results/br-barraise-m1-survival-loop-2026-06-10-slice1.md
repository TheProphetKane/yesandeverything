# br-barraise-m1-survival-loop-2026-06-10 - slice 1 result

- Started: 2026-06-11T08:05:00Z (overnight-queue-drain)
- Finished: 2026-06-11T08:25:00Z
- Status: partial (bounded slice landed; item stays pending for remaining slices)
- Prompt: BR bar-raise action #1 - build Hold the Wall survival loop (wave cadence, oil-zero fail, fog of war, win/lose) on placeholder art.

## What was done

Oil-zero mission-fail wired end to end (M1 BACKLOG row "Oil consumption + mission-fail on Oil-zero", P1).

Found state: command_post.gd has drained 4 Oil/min since v0.16.0 and emitted `lantern_oil_starved` at zero, but gameplay.gd never connected the signal. The fail state was a silent no-op (the silent-listener cousin of the silent-field-guard hazard). The emit also fired every frame once oil hit zero despite the comment claiming once.

Changes:
- `source/buildings/command_post.gd`: `_oil_starved_fired` one-shot guard on the starvation emit.
- `source/ui/gameplay/gameplay.gd`: `lantern_oil_starved` connected at both CP spawn sites (test-arena ~578, standard ~850); loss flow refactored into shared `_show_loss_screen(subtitle)` used by CP-destroyed ("The Lantern has fallen.") and oil-starved ("The oil is spent. The Lantern goes dark."); `_build_loss_screen` parameterized.

Verification: applied via Python atomic write with read-back; fresh re-read confirmed wiring at both sites; tails clean; paren balance even (161/161, 1505/1505); `git diff --stat` scoped to exactly the two files (+28/-8). Win/lose precedence unchanged (loss one-shot guard covers both triggers).

Gameplay consequence now real: starting Oil 80 at 4/min = 20 minutes runway on a 30-day (30-min) mission. A colony that never runs a Tryworks loses on day ~20. That is the designed pressure.

## Files touched

- X:\BrackishRising\source\buildings\command_post.gd
- X:\BrackishRising\source\ui\gameplay\gameplay.gd

## Not committed

Commit blocked: undeletable .git/index.lock (Jun 8) in BR, same as portfolio P0 wts-2026-06-05-portfolio-wide-index-lock. Work is committed-ready. Suggested message: `feat(brackish): vNEXT - wire oil-zero mission fail: lantern_oil_starved one-shot + loss-screen routing with per-cause subtitle`. PATCH-shaped on its own; part of the in-flight M1 loop feature.

## Followups recommended (remaining slices of this item)

- Wave cadence: design call needed first. BACKLOG says 180s internal cadence replaces the day clock, but mission.gd v0.53.0 + m1_default.tres are built on target_day with hordes at days 7/14/21/28. Contradiction needs Nick before code moves.
- Sonic Pressure threshold wave-tier scaling (P1, central mechanic).
- Convoy delivery every 4-5 waves (P1).
- Fog of war: file exists (677 lines); verify wiring + continuous-position stamping, then mark the row.
- Mark BACKLOG row 66 DONE with date + commit once this ships.
