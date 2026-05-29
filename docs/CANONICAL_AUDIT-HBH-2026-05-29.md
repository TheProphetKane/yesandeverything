# HBH canonical-doc audit (2026-05-29)

Target: `X:\HereThereBeHordes` (still outside this Cowork session's mount set; seventh consecutive run blocked at the same boundary). Source-side walk skipped. Audit ran against the YaE-side mirror at `hordes/index.html`, the redirect stub, the landing card, the GDD payload pill, and `.work-queue.json` state. Continues the line from `CANONICAL_AUDIT-2026-05-28.md`.

## TL;DR

Two new HBH PATCH publishes landed in the 24-hour window (v0.75.1, v0.75.2), continuing the v0.75.x family. Mirror frame intact across both. Yesterday's queued landing-card pill bump from `v0.74.x` to `v0.75.x` landed (drift fix applied). HBH queue pressure eased: 16 pending items, down from 19. No new HIGH-severity findings this run. Source-side gap persists as the load-bearing blocker; rather than adding a new mount-gap notice, the two carry-over P1 items have their `lastNoticedAt` bumped per task spec.

## What's aligned

- `hordes/index.html` is 1,901,453 bytes (was 1,893,477 yesterday) and ends with `</script>\n</body>\n</html>\n`. Frame intact across two more publishes.
- Decoded base64 payload is 1,417,534 chars (was 1,411,553) and ends with `</html>\n`. No truncation across the v0.75.0 to v0.75.2 jump.
- GDD header pill inside payload reads `v0.75.2` dated `2026-05-28`. Matches latest publish commit (`b81b2d8 docs(htbh): publish GDD v0.75.2`).
- HEAD of `hordes/index.html` is `b81b2d8`. Three publishes recorded since the 2026-05-27 audit: `3779655` (v0.75.0, yesterday), `2c519b5` (v0.75.1, new), `b81b2d8` (v0.75.2, new).
- Changelog at top of decoded payload references v0.75.2, v0.75.1, v0.75.0 in descending order. Publish pipeline shape healthy.
- v0.75.2 entry calls out the chmillout / Navy / unit1_lookdev temp-folder relocation and the Scout mesh wired into Skirmish via `command_post.gd CP_3D_SCENE_PATH` and `runner.gd RUNNER_3D_SCENE_PATH`. Solo-dev voice intact in the changelog text.
- `index.html` line 1499 pill now reads `v0.75.x`. Yesterday's queued `yae-landing-card-pill-bump-0-75-2026-05-28` drift fix has been applied.
- Redirect stub at `projects/here-there-be-hordes/gdd.html` still meta-refreshes to `/hordes/`. Legacy bookmarks covered.

## Drift found

1. **Source-side coverage gap persists (CANNOT VERIFY, seventh audit).**
   With `X:\HereThereBeHordes` outside the mount set, locked-decisions / roadmap "done" / sprite-tuning-table / `source/*.gd` checks did not run. Reachable mirror is publish output, not canonical source.

2. **Integrity guard still unverifiable (MEDIUM, seventh carry-over).**
   The `Test-GddIntegrity` guard recommended on 2026-05-23 through 28 for `publish-gdd.ps1` cannot be confirmed from this session. Three more clean publishes (v0.75.0, v0.75.1, v0.75.2) push the streak since v0.74.30 to 22; still evidence not proof.

3. **HBH queue carry-over (MEDIUM, easing).**
   `.work-queue.json` now carries 16 pending HBH items (down from 19). Three items drained since yesterday: `htbh-publish-gdd-integrity-guard-2026-05-27`, `htbh-queue-drain-pass-2026-05-27`, and the landing-card pill bump (which was a YaE item but tracked alongside). Source-mount items remain stuck behind the same boundary.

## Couldn't verify

- `publish-gdd.ps1` integrity guard presence or absence.
- Locked Decisions section integrity against `source/` reality.
- Roadmap "done" claims vs. `source/{buildings,units,enemies,systems}/*.gd`. v0.75.1 + v0.75.2 are PATCH-flavored per the changelog (asset relocations + Scout mesh wiring), consistent with PATCH discipline.
- Sprite tuning reference stamp version vs. GDD pill `v0.75.2`.
- `project.godot` `config/version=` vs. GDD pill `v0.75.2`.
- Status of carried `htbh-d01`/`d02`/`d03` items, all of which need source-side reads.

## Recommended actions

1. Mount HBH into the scheduled-audit session, or pre-pull `source/` and `docs/GDD.html` over git into a side workspace the audit can reach. Seven audits blocked on this. Highest-leverage single change. (Bumped, not re-added.)
2. Verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Seventh carry-over. (Bumped, not re-added.)
3. Triage the 16 pending HBH queue items in one HBH-mounted session.

## Queue-these (this run)

No new items added. Per task spec, daily mount-gap notices are not piled up; the two carry-over P1 items have their `lastNoticedAt` bumped to `2026-05-29` instead:

- `htbh-audit-mount-or-sidecar-2026-05-28` — `lastNoticedAt` bumped to `2026-05-29`.
- `htbh-publish-gdd-integrity-guard-2026-05-28` — `lastNoticedAt` bumped to `2026-05-29`.

Yesterday's `htbh-v0-75-0-minor-rollup-verify-2026-05-28` (P2) still covers the v0.75.x family rollup verification once source-mount returns; no separate item for v0.75.1 / v0.75.2 needed.
