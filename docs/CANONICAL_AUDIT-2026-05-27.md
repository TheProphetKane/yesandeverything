# HBH canonical-doc audit (2026-05-27)

Target: `X:\HereThereBeHordes` (not in this Cowork session's mount set; same gap as 2026-05-23, 24, 25, 26). Source-side walk skipped for the fifth consecutive run. Audit ran against the YaE-side mirror at `hordes/index.html`, the redirect stub, the landing card, and `.work-queue.json` state. Continues the line from `CANONICAL_AUDIT-2026-05-26.md`.

## TL;DR

No-change audit. Mirror state is byte-identical to 2026-05-26: same 1,869,717-byte `hordes/index.html`, same v0.74.46 pill in payload, same `2adfbe7` head commit. Zero HBH publishes since the last audit ran. Source-side coverage gap persists. The HBH queue is now carrying 16 pending items across six audits; queue-drain pressure is becoming the leading finding.

## What's aligned

- `hordes/index.html` is 1,869,717 bytes (unchanged) and ends with `</script>\n</body>\n</html>\n`. Frame intact.
- Decoded base64 payload is 1,393,731 chars (unchanged) and ends with `</html>\n`. No truncation.
- GDD header pill inside payload reads `v0.74.46`. Matches latest publish commit (`2adfbe7 docs(htbh): publish GDD v0.74.46`).
- HEAD of `hordes/index.html` is `2adfbe7`. Identical to the 2026-05-26 audit. No HBH publishes landed in the 24-hour window.
- Last 16 commits to `hordes/index.html` are all `docs(htbh): publish GDD v0.74.XX`. Publish pipeline shape healthy across the v0.74.29-v0.74.46 window.
- Redirect stub at `projects/here-there-be-hordes/gdd.html` still meta-refreshes to `/hordes/`. Covers legacy bookmarks.
- YaE landing card pill reads soft `v0.74.x`; current actual is `v0.74.46`. Soft pill is by design.
- Both yesterday's queue-these landed in `.work-queue.json` as `htbh-publish-gdd-integrity-guard-2026-05-26` and `htbh-audit-mount-or-sidecar-2026-05-26`. Queue-add pipeline working.

## Drift found

1. **Queue pressure on HBH carry-overs (NEW HIGH, was MEDIUM).**
   `.work-queue.json` carries 16 pending HBH items. Three are explicit audit-carry-overs from 2026-05-25 and 2026-05-26 (the integrity guard, the mount-or-sidecar setup, and the v0.74.44 rollup verification). Eleven are older drift items dating to 2026-05-19 through 2026-05-24 that all need source-side reads to close. The four-hourly `queue-drain-frequent` task is not draining HBH-tagged items, presumably because they need the same source mount that the audit needs. This is now the load-bearing blocker for closing audit findings.

2. **Integrity guard still unverifiable (MEDIUM, fifth carry-over).**
   The `Test-GddIntegrity` guard recommended on 2026-05-23 through 26 for `publish-gdd.ps1` cannot be confirmed from this session. 17 clean publishes since v0.74.30 is strong evidence the truncation is dormant; still not proof the guard landed.

3. **Source-side coverage gap persists (CANNOT VERIFY, fifth audit).**
   With `X:\HereThereBeHordes` outside the mount set, locked-decisions / roadmap "done" / sprite-tuning-table / `source/*.gd` checks did not run. Reachable mirror is publish output, not canonical source.

## Couldn't verify

- `publish-gdd.ps1` integrity guard presence or absence.
- Locked Decisions section integrity against `source/` reality.
- Roadmap "done" claims vs. `source/{buildings,units,enemies,systems}/*.gd`.
- Sprite tuning reference stamp version vs. GDD pill.
- `project.godot` `config/version=` vs. GDD pill.
- Status of carried `htbh-d01`/`d02`/`d03` items, all of which need source-side reads.

## Recommended actions

1. Mount HBH into the scheduled-audit session, or pre-pull `source/` and `docs/GDD.html` over git into a side workspace the audit can reach. Five audits blocked on this. Highest-leverage single change.
2. Verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Asserts source `docs/GDD.html` ends with `</html>` and post-injection `hordes/index.html` ends with `";\n</script>...</html>` before commit.
3. Triage the 16 pending HBH queue items in one HBH-mounted session rather than letting each audit add three more. Suggest a dedicated drain pass once mount lands.

## Queue-these (added explicitly this run)

- `htbh-publish-gdd-integrity-guard-2026-05-27` (P1, structural). Verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Fifth carry-over.
- `htbh-audit-mount-or-sidecar-2026-05-27` (P1, infra). Either mount HBH into the audit session or have the audit pre-pull source/ + docs/GDD.html before running. Promoted from P2 to P1 because it is now the root cause of every other HBH queue item stalling.
- `htbh-queue-drain-pass-2026-05-27` (P2, ops). Run one HBH-mounted session that drains the 16 pending HBH items in `.work-queue.json` in a single pass. Currently each four-hour drain skips them.
