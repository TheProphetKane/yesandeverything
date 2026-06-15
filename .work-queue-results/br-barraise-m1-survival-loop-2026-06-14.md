# br-barraise-m1-survival-loop-2026-06-10 — resolution

Run: overnight-queue-drain 2026-06-14T10:04Z
Selection: priority (b) open BAR_RAISE finding; P1; feature kind (auto_safe gate N/A); attempts=1 (not auto-blocked).

## Premise vs current HEAD

Item premise (2026-06-10): oil-zero mission-fail wiring existed only in an uncommitted working tree (10 modified + 3 untracked since 2026-06-08); Nick action was to commit it, then wire the remaining loop pieces (wave cadence, fog of war, win state).

That premise is now stale. HEAD is `bd24d32` v0.58.1 (2026-06-13); the v0.58.0 MINOR and v0.58.1 both landed. Working tree is effectively clean (CHANGELOG.md + docs/GDD.html only, plus one `.audit_write_test` artifact).

## Survival-loop pieces verified present in committed code

- Oil-zero mission-fail: `gameplay.gd` connects `cp.lantern_oil_starved` → `_on_lantern_oil_starved` (lines 581/853/1160), which routes to `_open_summary("defeat")`. Committed at bd24d32.
- Win condition: `gameplay.gd` "v0 win condition per GDD §11 — survive MISSION_TARGET_DAY, win fires 2 days after final horde", wired via `game_clock.day_advanced` → `_on_day_advanced_check_win` (lines 153-272). Committed.
- Wave cadence + Sonic-Pressure tier scaling: shipped v0.58.0 per CHANGELOG/GDD.
- Convoy resupply: shipped v0.58.0/v0.58.1 (4-5 day cadence, cargo lock).
- Fog of war: `source/systems/fog_of_war.gd` + `fog_overlay.gdshader` present, referenced by `gameplay.gd`, last touched committed at 23d4595 (v0.54.2).

Every loop piece the item named is implemented and committed. The actionable content is done; closing as resolved-by-prior-commits so it stops re-firing against finished work.

## Verdict-clear (task step 5)

BR's 2026-06-13 bar-raise verdict was `needs-attention` driven entirely by the uncommitted v0.58.0 survival-loop tree ("build then sit"). That breakage signal is cleared (HEAD at v0.58.1, tree clean). BR's verdict should clear from needs-attention to in-progress at the next review pass. No breakage remains; M1 survival loop is in place at 40% completion against its broader content scope.

## One remaining housekeeping thread (Nick-side shell, gate-paused)

The bar-raise's secondary MEDIUM still stands: 5 `.bak` files are tracked in the git index despite `*.bak` being gitignored (`.gitignore:285`) and the changelog claiming they were dropped:

```
scripts/discord-notify.ps1.bak
scripts/find-godot.ps1.bak
scripts/publish-gdd.ps1.bak
scripts/run_headless.ps1.bak
scripts/run_tests.ps1.bak
```

All five DIFFER from their live counterparts (stale older snapshots, not byte-identical duplicates), so they are safe to drop from tracking. Removal is a git-index op, which pauses for Nick per the queue safety gates:

```powershell
cd X:\BrackishRising
git rm --cached scripts\discord-notify.ps1.bak scripts\find-godot.ps1.bak scripts\publish-gdd.ps1.bak scripts\run_headless.ps1.bak scripts\run_tests.ps1.bak
# optional: delete the stale snapshots from disk, then ship via scripts\release.ps1
```

This thread is tracked separately and does not gate M1. attempts unchanged: investigation succeeded, no failure.
