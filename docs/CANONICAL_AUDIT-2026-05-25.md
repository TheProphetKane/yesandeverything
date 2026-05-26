# HBH canonical-doc audit (2026-05-25)

Target: `X:\HereThereBeHordes` (not in this Cowork session's mount set; same gap as 2026-05-23 and 2026-05-24). Source-side walk skipped again. Audit ran against the YaE-side mirror at `hordes/index.html`, the redirect stub, the landing card, and the `.work-queue.json` state. Continues the line from `CANONICAL_AUDIT-2026-05-24.md`.

## TL;DR

No production-affecting drift on the reachable surface. The published mirror has rolled forward seven more PATCHes since the 2026-05-24 audit (v0.74.39 through v0.74.45) with clean payload framing on every publish. The apparent five-version gap in the GDD changelog (v0.74.39 through v0.74.43 missing between v0.74.44 and v0.74.38) is intentional and explained inside the v0.74.44 entry as a rollup of the Lore-tab design history. Source-side coverage gap persists.

## What's aligned

- `hordes/index.html` is 1,866,121 bytes and ends with `</script>\r\n</body>\r\n</html>\r\n`. Frame is intact.
- Decoded base64 payload is 1,391,036 chars and ends with `</script>\n\n</body>\n</html>\n`. No mid-block truncation.
- GDD pill inside payload reads `v0.74.45`. Matches the latest publish commit (`fd6210d docs(htbh): publish GDD v0.74.45`).
- Last 15 commits to `hordes/index.html` are all `docs(htbh): publish GDD v0.74.XX`. Publish pipeline is healthy across 15 consecutive PATCHes.
- 15 successful HBH republishes since the v0.74.30 truncation incident with no recurrence on the mirror side.
- Apparent v0.74.39 through v0.74.43 changelog gap is **intentional**: the v0.74.44 entry rolls them up under "Lore tab restored to single-content; design-history rolled up". Not drift.
- YaE landing card pill reads `v0.74.x` (soft); current actual is `v0.74.45`. Soft pill is by design.
- Redirect stub at `projects/here-there-be-hordes/gdd.html` still meta-refreshes to `/hordes/`; covers legacy bookmarks.
- Three of yesterday's queue-these items did land in `.work-queue.json` (`htbh-audit-needs-mount-access-2026-05-24`, `htbh-d01-project-godot-version-bump`, `htbh-d02-sprite-tuning-stale-13-minors`, `htbh-d03-s39-tile-constants-stale`, `audit-queue-add-pipeline-broken-2026-05-24`). The footer-parse claim from yesterday's audit was wrong; the pipeline works.

## Drift found

1. **Integrity guard still unverifiable (MEDIUM, carry-over).**
   The `Test-GddIntegrity` guard recommended on 2026-05-23 and 2026-05-24 for `publish-gdd.ps1` cannot be confirmed from this session. 15 clean publishes is good evidence the truncation is dormant; not proof the guard landed. Risk profile unchanged.

2. **Yesterday's `htbh-publish-gdd-integrity-guard-2026-05-24` queue-these did not produce a queue item (LOW, process).**
   Two of yesterday's three queue-these footer items landed; the integrity-guard one did not. Either a duplicate-id collision against a similar earlier item, or the parser dropped that row. Replacing with an explicit `work-queue-runner add` call below.

3. **Source-side coverage gap persists (CANNOT VERIFY).**
   With `X:\HereThereBeHordes` outside the mount set, locked-decisions / roadmap "done" / sprite-tuning-table / `source/*.gd` checks did not run. Reachable mirror is publish output, not canonical source.

## Couldn't verify

- `publish-gdd.ps1` integrity guard presence or absence.
- Locked Decisions section integrity against `source/` reality.
- Roadmap "done" claims vs. `source/{buildings,units,enemies,systems}/*.gd`.
- Sprite tuning reference stamp version vs. GDD pill.
- `project.godot` `config/version=` vs. GDD pill.
- Status of three carried 2026-05-24 drift items (`htbh-d01` through `htbh-d03`), all of which need source-side reads.

## Recommended actions

1. Land `Test-GddIntegrity` in `publish-gdd.ps1` if not already present. Assert source `docs/GDD.html` ends with `</html>` AND post-injection `hordes/index.html` ends with `";\n</script>...</html>` before commit.
2. Mount HBH into the scheduled-audit session, or pre-pull `source/` and `docs/GDD.html` over git into a side workspace the audit can reach.
3. Drain the four carried HBH queue items via `process-one` or `drain` now that they have been sitting since 2026-05-19 through 2026-05-24.

## Queue-these (added explicitly this run)

- `htbh-publish-gdd-integrity-guard-2026-05-25` (P1, structural) — verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Third carry-over.
- `htbh-audit-mount-or-sidecar-2026-05-25` (P2, infra) — either mount HBH into the audit session or have the audit pre-pull source/ + docs/GDD.html before running. Recurring blocker on three audits running.
