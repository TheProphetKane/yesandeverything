# Handler audit 2026-05-24

Audit of CLAUDE.md handler files across HBH, YaC, Scheduler, YaE against current repo state. Triggered on-demand. HBH today is at v0.74.42 (per user) / v0.74.38 in `project.godot` — note that drift is a separate canonical-audit concern, not a handler-audit one.

## TL;DR

Two handlers were accessible this session (HBH, YaE). YaC and Scheduler are not mounted in the current Cowork folder set, so their handlers could not be verified — same verification gap as 2026-05-22. Of the two audited, **three HIGH severity issues** cluster around stale path references — the HBH handler points five times at an `outputs/` folder that no longer exists in the repo, and the YaE handler points at one file inside that missing folder. The "version pill bump in the header (line ~584)" claim in HBH is also stale; the pill is now at line 1300. The 2026-05-22 audit's queued YaE fixes have all landed. One HIGH-severity auto-fix applied this run.

Total concrete claims audited across the two accessible handlers: **~78** (HBH: 51, YaE: 27). Severity tally for accessible handlers: **3 HIGH / 4 MED / 3 LOW**.

## HIGH severity (handler is teaching the wrong thing)

### HBH — `outputs/` folder no longer exists, five reference scripts broken

`X:\HereBeHordes\CLAUDE.md` references reference scripts under `outputs/` in two places:

Line 39:
> Recovery pattern lives in `outputs/v0_61_8_recover.py` / `v0_61_10_gdd_tail_recover.py` from the May 2026 incident.

Line 114:
> Reference scripts live in `outputs/v0_74_30_apply.py`, `outputs/v0_74_31_apply.py`, `outputs/v0_74_32_apply.py`.

`ls X:\HereBeHordes\` shows no `outputs/` directory — the FUSE recovery scripts the handler points at are unreachable from where the handler tells the reader to look. New sessions trying to follow the documented atomic-write pattern will hit "no such file or directory" on all five referenced paths.

**Recommended fix:** confirm where the scripts actually live (likely under `_ARCHIVE/` or moved to `scripts/`) and update both lines; or recreate the `outputs/` folder with the reference scripts; or drop the specific path claims and keep just the pattern description. Not auto-safe — the canonical location of the recovery scripts has to be confirmed first.

### HBH — line number for version pill is stale (~584 → 1300)

`X:\HereBeHordes\CLAUDE.md` line 7:
> bringing the GDD up to date — version pill bump in the header (line ~584)

Actual location of `<span class="meta-pill">v0.74.42</span>` in `docs/GDD.html` is **line 1300**. The "~584" hint has been stale long enough that following it lands deep inside a CSS block, not anywhere near the version pill. New sessions doing the mandatory end-of-reply GDD bump will scroll to the wrong region first.

**Auto-applied this run** — see "Auto-applied" section below.

### YaE — broken cross-repo path to recovery script

`X:\YesAndEverything\CLAUDE.md` line 63:
> Recovery for the actual truncation lives in `X:\HereBeHordes\outputs\v0_61_10_gdd_tail_recover.py`.

Same broken `outputs/` reference as the HBH handler. The 2026-05-22 audit corrected this line from `X:\HereThereBeHordes` to `X:\HereBeHordes`, which fixed the prefix — but the `outputs/v0_61_10_gdd_tail_recover.py` tail is still pointing into a folder that doesn't exist on the HBH side.

**Recommended fix:** coordinate with the HBH fix above. Same canonical-location question.

## MEDIUM (handler is incomplete or out of date)

### HBH — autoload list omits 6 of 14 actually wired

`X:\HereBeHordes\CLAUDE.md` line 13 says:
> Notable ones include `economy`, `game_clock`, `research`, `noise_field` (M2 noise system).

Actual `[autoload]` block in `project.godot` has **14 entries**: `debug_flags`, `constants`, `global`, `economy`, `game_clock`, `research`, `noise_field`, `auto_pause`, `save_load`, `input_defaults`, `locale`, `tutorial`, `enemy_pool`, `projectile_pool`. The handler mitigates this by saying "grep `project.godot` for the `[autoload]` section" for the authoritative list, so the claim is hedged. But the "notable ones" list is missing `enemy_pool` and `projectile_pool` which are load-bearing for the data-oriented enemy/projectile paths the handler later spends ~30 lines describing. Worth promoting both to the "notable" list.

**Recommended fix:** add `enemy_pool` and `projectile_pool` to the line-13 notable list (since they're the foundation of the dual pool/per-Node section).

### HBH — source/ subdir list omits `projectiles`

Line 12 lists `source/` subdirs as `autoloads`, `buildings`, `units`, `enemies`, `world`, `systems`, `ui`, `data`, `vfx`, missions/save/main scaffolding. Actual `ls source/` shows an additional `projectiles/` directory, referenced by the `projectile_pool` autoload. The handler hedges with "this list drifts as new categories are added" so it's not actively misleading, but `projectiles/` is now permanent and pairs with the pool architecture described in the hazards section.

### HBH — FUSE truncation claim references "yesandeverything.com tabs" but the actual breakage was the GDD tab switcher

Line 39 says:
> the GDD itself shipped a truncated tail in v0.61.8 breaking yesandeverything.com tabs

Per memory `gdd_truncation_guard` and the YaE handler line 63, the actual breakage was the GDD tab switcher inside `hordes/index.html` — not "yesandeverything.com tabs" generally. The cross-handler descriptions diverge slightly: YaE says "broke the live tab switcher silently", HBH says "broke yesandeverything.com tabs." Both technically describe the same event but the HBH phrasing reads like the public landing page broke, which it didn't.

**Recommended fix:** tighten HBH line 39 to "breaking the hordes/index.html tab switcher" for cross-handler consistency.

### YaC + Scheduler — handler files not accessible this session (verification gap)

Same gap as the 2026-05-22 run. The session has mounts for `X:\HereBeHordes` and `X:\YesAndEverything` only. The scheduled task asked for four handlers; two are blind spots. Per the 2026-05-22 recommendation, the `handler-audit-weekly` task should mount all four project folders before invoking, or this skill should request the missing directories at startup. Until that lands, every audit run covers a different subset.

## LOW (cosmetic)

### HBH + YaE — "GDD must end with `</html>`" duplicated in both handlers

HBH line 41 and YaE line 63 both carry the integrity-guard warning. The duplication is intentional (per the cross-project-consistency hazard at the bottom of the YaE handler), but the phrasings differ enough that a reader catching one won't immediately recognize the other as the same hazard. Not a bug; flag as "tighten if convenient."

### HBH — `scripts/audit-dual-path.ps1` annotation says "added v0.74.32"

Line 122 says the script was added in v0.74.32. Verified the file exists. Phrasing is fine; flag only because the annotation will keep drifting as more dual-path additions happen. Consider dropping the "(added v0.74.32)" tail once the script is stable.

### YaE — `digest-2026-05-15.md` exists at repo root but isn't in "Files at a glance"

The handler's table at lines 12-29 doesn't list `digest-2026-05-15.md` or `IMPLEMENTATION_GUIDE.md`. Both are root-level files. The table doesn't claim to be exhaustive but it's labelled "Files at a glance" so the omission reads like they don't exist. Low priority — neither is load-bearing for active workflows.

## What's healthy

Confirmed correct across the two accessible handlers:

- **HBH** `project.godot config/features` claim of `"4.6"` matches reality (`config/features=PackedStringArray("4.6", "Forward Plus")`).
- **HBH** Godot version claim of 4.6.2 — no easy way to verify the engine binary from inside the workspace, but the GDD line 1967 carries "Verified in Godot 4.6.2" so the claim is consistent with the canonical doc.
- **HBH** `scripts/release.ps1`, `publish-gdd.ps1`, `push-to-github.ps1`, `diagnose-gdd-publish.ps1` all exist in `scripts/`.
- **HBH** `scripts/audit-dual-path.ps1` exists in `scripts/`. Both `enemy_base.gd` and `enemy_pool.gd` exist in `source/enemies/` with the documented `force_aggressive_target` / `set_target_node(id, target)` APIs.
- **HBH** `docs/OPTIMIZATION_LOG.md` exists, has 17 shipped-wins rows, references S-34 / S-39 as the handler describes.
- **HBH** `docs/GDD.html` ends with `</html>` (integrity guard satisfies).
- **YaE** `CNAME` contains exactly `yesandeverything.com` (no newline cruft, single line).
- **YaE** `robots.txt` allows `/` and disallows `/hordes/` exactly as documented.
- **YaE** `hordes/index.html` exists and is a single file (not a folder of copies).
- **YaE** `apothecary/` exists and is multi-file (`CHANGELOG.md`, `data/`, `index.html`, `src/`, `styles/`) — handler's "multi-file by design" claim holds.
- **YaE** `projects/here-there-be-hordes/gdd.html` is a 16-line redirect stub — matches the "3-line meta-refresh stub" claim in spirit (slightly larger than 3, includes a JS fallback, but the intent is identical).
- **YaE** `CLAUDE_SETTINGS.md`, `PERSONAL_CLAUDE_ARCHITECTURE.md`, `docs/`, `.work-queue.json`, `_skill-review/` all exist at the documented paths (the 2026-05-15 audit's MED items have been resolved).
- **YaE** Project list at line 8 enumerates HBH, Chains, Scheduler, Apothecary, Budget — matches what's actually mirrored under `projects/` and `apothecary/`. The 2026-05-22 fix landed.
- **YaE** "six personal projects" phrasing at line 26 — matches the 2026-05-22 fix.

## Top 3 cross-handler inconsistencies

1. **`outputs/` folder reference** appears in both HBH (lines 39, 114) and YaE (line 63), all pointing into a folder that doesn't exist in `X:\HereBeHordes\`. The cross-handler shape means a fix has to land on both sides in lockstep.
2. **GDD truncation event description** — HBH calls it "breaking yesandeverything.com tabs" but YaE more precisely calls it "broke the live tab switcher" inside `hordes/index.html`. Cross-handler divergence on the same incident.
3. **`scripts/release.ps1`** — HBH handler documents it as the standard release path; YaE handler does NOT mention that YaE has its own `scripts/release.ps1` (it does, with `push-to-github.ps1` + `discord-notify.ps1`). YaE handler's "Deploy flow" section still shows raw `git push`, which the 2026-05-22 audit also flagged. Could land as a MEDIUM but it's a missing-information drift rather than a contradicting claim.

## Structural recommendations

1. **Mount all four project folders for handler-audit-weekly.** The verification gap is the biggest persistent issue across the last three audits (2026-05-15, 2026-05-22, today). Two consecutive audits missing YaC and Scheduler means real drift may have accumulated unverified. Either expand the scheduled task's mount set or have the skill block-and-request at startup.
2. **Decide the canonical location of the FUSE recovery scripts.** Both handlers reference `outputs/v0_74_30_apply.py` and friends. If they were intentionally removed, drop the path claims and keep only the pattern. If they should still exist, restore them. Right now both handlers point at a phantom folder.
3. **Stop hard-coding line numbers in HBH handler.** Line 7's "~584" reference rotted as the GDD grew. The GDD is the most-edited file on the project; any line-number hint will go stale. Recommend `grep meta-pill docs/GDD.html` style hints instead, matching how the handler already handles autoloads at line 13.
4. **Cross-handler section for shared facts.** HBH and YaE both carry the GDD/`hordes/` injection rule, the FUSE truncation hazard, and the integrity-guard recommendation. Phrasings drift in low-stakes ways every audit. Worth promoting one to canonical (likely YaE since it's the publisher's side) and having the other reference it by link.

## Recommended actions (sorted by severity)

1. **HBH + YaE** — resolve the `outputs/` folder question and update all three referencing lines (HBH 39 + 114, YaE 63). Not auto-safe.
2. **HBH** — replace line-7 "(line ~584)" with a grep hint or accurate current line. **Auto-applied** below as a grep hint (line numbers will drift again).
3. **HBH** — add `enemy_pool` + `projectile_pool` to the "notable autoloads" list at line 13. Auto-safe.
4. **HBH** — add `projectiles` to the `source/` subdir list at line 12. Auto-safe.
5. **HBH** — rephrase line 39 "breaking yesandeverything.com tabs" to "breaking the hordes/index.html tab switcher" for cross-handler consistency. Auto-safe.
6. **YaE** — add `scripts/` row to the "Files at a glance" table and update Deploy flow to reference `scripts/release.ps1`. Carryover from 2026-05-22 audit. Not auto-safe (workflow change).
7. **Audit infra** — expand `handler-audit-weekly` mount set to include `X:\YesAndChains` and `X:\Scheduler`. Out-of-band fix.

## Auto-applied

This run applied one HIGH-severity trivially-correctable fix per the audit invocation:

- **HBH line 7** — replaced the stale `line ~584` hint with a grep instruction (`grep meta-pill docs/GDD.html`) so future drift doesn't re-rot it. The pill is currently at line 1300; rather than encoding that number, the fix points at the durable signal.

All other findings left as report-only per skill default.

## Queued items

The auto-safe but not-yet-applied items (#3, #4, #5 above) should be added to `X:\YesAndEverything\.work-queue.json` for the next `queue-drain-frequent` run. The `outputs/` folder question (#1) is gated on confirming the canonical location of the recovery scripts and should NOT be auto-queued.
