# br-barraise-m1-survival-loop-2026-06-10 - slice 3 result

- Started: 2026-06-12 overnight-queue-drain
- Status: done (bounded feature slice; item stays pending for remaining slices)
- This slice: Sonic Pressure wave-tier scaling (the second half of bk-sonic, P0 MVP)

## Selection note

br-asset-production-pass (completion-gate, P2) was the top eligible gate item but is self-blocked: its spec defers it until the M1 survival loop lands. This slice advances M1 directly, which is the blocking gate at 40%.

## Pre-work repair

Fresh FUSE tail-truncation found in the BR working tree on arrival: CHANGELOG.md, docs/GDD.html, project.godot, scripts/release.ps1 all cut mid-line at EOF (pure tail loss, no intentional edits in the diffs). All four restored byte-exact from HEAD cdb16e7 via atomic write + fresh-read verify. Stale 0-byte .git/index.lock from the 06-11 22:02 release present; EPERM on delete from sandbox (known portfolio P0).

## What shipped (working tree, v0.58.0, committed-ready)

wave_director.gd previously never read Sonic Pressure; economy.gd owned the meter, tiers, and player-side debuffs, but waves never scaled. Now:

- WAVE_TIER_THRESHOLDS [25, 50, 75, 90] per the GDD Numbers tab (crisis opens at 90, distinct from the player-debuff curve that opens its top band at 100). WAVE_TIER_COUNT_MULTS [1.0, 1.15, 1.35, 1.6, 2.0], tuning values.
- get_wave_pressure_tier() + _scaled_wave_count() helpers; ceil so any tier above Calm adds at least one enemy.
- Pulses sample the meter as they commit in _spawn_pulse.
- Hordes sample on the prep day: _on_day_advanced stamps _horde_scaled[horde_day] when the dormant pre-spawn commits, and that one number flows through the announce toast, horde_day_announced/landed signals, get_next_horde_count (HUD countdown), the landing toast, and the _spawn_horde live-spawn fallback. Fallback re-samples only if the prep branch never ran (day skip).
- GDD section 11 semantics preserved: SP scales the committed wave, never triggers one.

## Doc + version state

GDD pill + date pill bumped to v0.58.0 / 2026-06-12 (MINOR: new user-visible mechanic). v0.58.0 changelog entry at top of the footer, plus backfilled one-line entries for the entry-less v0.57.9 (ROADMAP tombstone) and v0.57.10 (audit-digest release step). CHANGELOG.md sidecar entry prepended. project.godot config/version stamped 0.58.0.

## Verification

check_gdscript_parse OK (99 files), check_source_integrity OK (152), check_godot_hazards OK, check_gdd_integrity OK (ends </html>), check_voice OK (zero em dashes), check_version_markers OK (all three at 0.58.0). Tails of all touched files verified clean.

## To ship (Nick, Windows side)

cd X:\BrackishRising
.\scripts\release.ps1 -Message "Sonic Pressure wave-tier scaling" -Bump none

(-Bump none: the pill was hand-bumped to 0.58.0 with the entry already written.)

## Remaining slices

- Convoy delivery every 4-5 waves (P1).
- Wave cadence (BLOCKED on Nick: 180s-cadence backlog row contradicts mission.gd target_day design).
- bk-sonic markable done in the GDD backlog UI (status is localStorage).
