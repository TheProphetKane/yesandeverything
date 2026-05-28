# HBH canonical-doc audit (2026-05-28)

Target: `X:\HereThereBeHordes` (still outside this Cowork session's mount set; sixth consecutive run blocked at the same boundary). Source-side walk skipped. Audit ran against the YaE-side mirror at `hordes/index.html`, the redirect stub, the landing card, the GDD payload pill, and `.work-queue.json` state. Continues the line from `CANONICAL_AUDIT-2026-05-27.md`.

## TL;DR

Two new HBH publishes landed in the 24-hour window: v0.74.47 and v0.75.0. The MINOR bump to v0.75.0 tips the YaE landing-card pill from "soft" into actually stale (was `v0.74.x`, current family is `0.75.x`). Mirror frame is intact, payload pill matches commit. Source-side gap persists; HBH queue grew from 16 pending items to 19. The landing-card pill drift is the lone HIGH-severity finding this run.

## What's aligned

- `hordes/index.html` is 1,893,477 bytes (was 1,869,717 yesterday) and ends with `</script>\n</body>\n</html>\n`. Frame intact through the publish.
- Decoded base64 payload is 1,411,553 chars (was 1,393,731) and ends with `</html>\n`. No truncation across the v0.74.46 to v0.75.0 jump.
- GDD header pill inside payload reads `v0.75.0`. Matches latest publish commit (`3779655 docs(htbh): publish GDD v0.75.0`).
- HEAD of `hordes/index.html` is `3779655`. Two publishes recorded since yesterday's audit: `883b388` (v0.74.47) then `3779655` (v0.75.0).
- Changelog at top of decoded payload references v0.75.0, v0.74.47, v0.74.46 in descending order. Publish pipeline shape healthy.
- Redirect stub at `projects/here-there-be-hordes/gdd.html` still meta-refreshes to `/hordes/`. Legacy bookmarks covered.
- All three queue-these from 2026-05-27 landed in `.work-queue.json` as `htbh-publish-gdd-integrity-guard-2026-05-27`, `htbh-audit-mount-or-sidecar-2026-05-27`, and `htbh-queue-drain-pass-2026-05-27`. Queue-add pipeline working.

## Drift found

1. **Landing-card pill is now stale (HIGH, NEW this run).**
   `index.html` line 1493 reads `<span>v0.74.x</span>`. Current HBH version family is `0.75.x` after the v0.75.0 publish. The previous "soft pill" rationale (track the minor only, ignore the patch noise) held while v0.74.46 stayed the head; with a MINOR bump landing, the pill needs to follow. Low-risk text edit. Queued as `yae-landing-card-pill-bump-0-75-2026-05-28`.

2. **Queue pressure on HBH carry-overs (HIGH, growing).**
   `.work-queue.json` now carries 19 pending HBH items (up from 16). Three new queue-adds landed cleanly; the older 16 remain. Six audits worth of carry-over. The four-hourly `queue-drain-frequent` task is still skipping HBH items because they need the same source mount the audit needs. This is now the load-bearing blocker for closing audit findings.

3. **Integrity guard still unverifiable (MEDIUM, sixth carry-over).**
   The `Test-GddIntegrity` guard recommended on 2026-05-23 through 27 for `publish-gdd.ps1` cannot be confirmed from this session. Two more clean publishes (v0.74.47 and v0.75.0) push the streak since v0.74.30 to 19; still evidence not proof.

4. **Source-side coverage gap persists (CANNOT VERIFY, sixth audit).**
   With `X:\HereThereBeHordes` outside the mount set, locked-decisions / roadmap "done" / sprite-tuning-table / `source/*.gd` checks did not run. Reachable mirror is publish output, not canonical source.

## Couldn't verify

- `publish-gdd.ps1` integrity guard presence or absence.
- Locked Decisions section integrity against `source/` reality.
- Roadmap "done" claims vs. `source/{buildings,units,enemies,systems}/*.gd`. The v0.75.0 MINOR bump implies a cohesive new system or feature landed; nothing in this session can confirm what.
- Sprite tuning reference stamp version vs. GDD pill.
- `project.godot` `config/version=` vs. GDD pill `v0.75.0`.
- Status of carried `htbh-d01`/`d02`/`d03` items, all of which need source-side reads.

## Recommended actions

1. Mount HBH into the scheduled-audit session, or pre-pull `source/` and `docs/GDD.html` over git into a side workspace the audit can reach. Six audits blocked on this. Highest-leverage single change.
2. Verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Asserts source `docs/GDD.html` ends with `</html>` and post-injection `hordes/index.html` ends with `";\n</script>...</html>` before commit.
3. Triage the 19 pending HBH queue items in one HBH-mounted session rather than letting each audit add three more.
4. Apply the landing-card pill bump on the YaE side (single-character edit, low risk).

## Queue-these (added explicitly this run)

- `yae-landing-card-pill-bump-0-75-2026-05-28` (P2, auto-safe text). Bump `index.html` line 1493 from `v0.74.x` to `v0.75.x`. Low-risk text alignment; first time landing-card pill has been actually stale rather than soft.
- `htbh-publish-gdd-integrity-guard-2026-05-28` (P1, structural). Verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Sixth carry-over.
- `htbh-audit-mount-or-sidecar-2026-05-28` (P1, infra). Either mount HBH into the audit session or have the audit pre-pull source/ + docs/GDD.html before running. Sixth audit confirms this as the root cause of every other HBH queue item stalling.
- `htbh-v0-75-0-minor-rollup-verify-2026-05-28` (P2, audit). Once source-side access exists, confirm what cohesive feature drove the MINOR bump and whether the GDD §17 roadmap recorded it as "done".
