# HBH canonical-doc audit (2026-05-26)

Target: `X:\HereThereBeHordes` (not in this Cowork session's mount set; same gap as 2026-05-23, 2026-05-24, and 2026-05-25). Source-side walk skipped for the fourth consecutive run. Audit ran against the YaE-side mirror at `hordes/index.html`, the redirect stub, the landing card, and `.work-queue.json` state. Continues the line from `CANONICAL_AUDIT-2026-05-25.md`.

## TL;DR

No production-affecting drift on the reachable surface. The published mirror rolled forward one more PATCH since the 2026-05-25 audit (v0.74.46). Frame intact, payload tail clean, internal pill matches commit. The single-commit gap between v0.74.43 and v0.74.45 is a publish-side bundle: the v0.74.45 commit injected both v0.74.44 and v0.74.45 changelog entries, same rollup shape as the v0.74.39 through v0.74.43 sequence on 2026-05-25. Source-side coverage gap persists.

## What's aligned

- `hordes/index.html` is 1,869,717 bytes and ends with `</script>\r\n</body>\r\n</html>\r\n`. Frame intact.
- Decoded base64 payload is 1,393,731 chars and ends with `</script>\n\n</body>\n</html>\n`. No mid-block truncation.
- GDD header pill inside payload reads `v0.74.46`. Matches the latest publish commit (`2adfbe7 docs(htbh): publish GDD v0.74.46`).
- Changelog tab carries fresh entries: top entry is `v0.74.46 (2026-05-25)` with the palette-retune body. `v0.74.45` and `v0.74.44` both present in the payload, dated 2026-05-25, in descending order under the Changelog label.
- Last 16 commits to `hordes/index.html` are all `docs(htbh): publish GDD v0.74.XX`. Publish pipeline healthy across the v0.74.31-v0.74.46 window.
- 16 successful HBH republishes since the v0.74.30 truncation incident with no recurrence on the mirror side.
- YaE landing card pill reads soft `v0.74.x`; current actual is `v0.74.46`. Soft pill is by design.
- Redirect stub at `projects/here-there-be-hordes/gdd.html` still meta-refreshes to `/hordes/`. Covers legacy bookmarks.
- Yesterday's two explicit queue-these items (`htbh-publish-gdd-integrity-guard-2026-05-25` and `htbh-audit-mount-or-sidecar-2026-05-25`) both land in `.work-queue.json`. Queue-add pipeline working.

## Drift found

1. **Integrity guard still unverifiable (MEDIUM, fourth carry-over).**
   The `Test-GddIntegrity` guard recommended on 2026-05-23, 24, and 25 for `publish-gdd.ps1` cannot be confirmed from this session. 16 clean publishes is good evidence the truncation is dormant; not proof the guard landed. Risk profile unchanged.

2. **v0.74.44 publish bundled into v0.74.45 commit (LOW, informational).**
   `git log` for `hordes/index.html` shows v0.74.43 then v0.74.45 with no intermediate v0.74.44 commit. The v0.74.44 changelog entry IS present in the v0.74.45 publish payload, so this is the same rollup shape as v0.74.39-v0.74.43. Not drift; flagged so the publish-history pattern is visible on the YaE side without source access.

3. **Source-side coverage gap persists (CANNOT VERIFY).**
   With `X:\HereThereBeHordes` outside the mount set, locked-decisions / roadmap "done" / sprite-tuning-table / `source/*.gd` checks did not run. Reachable mirror is publish output, not canonical source.

## Couldn't verify

- `publish-gdd.ps1` integrity guard presence or absence.
- Whether the HBH-side publish step intentionally rolls up consecutive doc-only PATCHes or whether the script skipped a commit.
- Locked Decisions section integrity against `source/` reality.
- Roadmap "done" claims vs. `source/{buildings,units,enemies,systems}/*.gd`.
- Sprite tuning reference stamp version vs. GDD pill.
- `project.godot` `config/version=` vs. GDD pill.
- Status of carried 2026-05-24 drift items (`htbh-d01` through `htbh-d03`), all of which need source-side reads.

## Recommended actions

1. Land `Test-GddIntegrity` in `publish-gdd.ps1` if not already present. Assert source `docs/GDD.html` ends with `</html>` AND post-injection `hordes/index.html` ends with `";\n</script>...</html>` before commit.
2. Mount HBH into the scheduled-audit session, or pre-pull `source/` and `docs/GDD.html` over git into a side workspace the audit can reach. Fourth audit blocked on this.
3. Drain the four carried HBH queue items via `process-one` or `drain` now that they have been sitting since 2026-05-19 through 2026-05-24.

## Queue-these (added explicitly this run)

- `htbh-publish-gdd-integrity-guard-2026-05-26` (P1, structural) - verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Fourth carry-over.
- `htbh-audit-mount-or-sidecar-2026-05-26` (P2, infra) - either mount HBH into the audit session or have the audit pre-pull source/ + docs/GDD.html before running. Recurring blocker on four audits running.
- `htbh-publish-v0-74-44-rollup-verify-2026-05-26` (P3, low) - confirm on HBH side that the missing v0.74.44 commit is an intentional bundle into v0.74.45 and not a dropped publish step. One-shot check.
