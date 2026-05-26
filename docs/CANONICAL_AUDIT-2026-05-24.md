# HBH canonical-doc audit (2026-05-24)

Target: `X:\HereThereBeHordes` (still not mounted in this Cowork session). Source-side walk skipped again; the audit ran against the YaE-side mirror at `hordes/index.html` plus repo-level metadata reachable from `X:\YesAndEverything`. Continues the line from `CANONICAL_AUDIT-2026-05-23.md`.

## TL;DR

The HIGH-severity truncation flagged yesterday on the live mirror has cleared: subsequent republishes (v0.74.31 through v0.74.38) all landed clean payloads, and the current `hordes/index.html` ends with `</html>` and decodes to a complete GDD also ending in `</html>`. No production-affecting drift today. The root-cause `Test-GddIntegrity` guard recommendation from yesterday remains unverifiable from this side of the mount; needs an HBH-mounted session to confirm whether it landed in `publish-gdd.ps1` or whether the recent clean publishes are luck.

## What's aligned

- `hordes/index.html` (1,862,225 bytes) ends cleanly with `</script>\r\n</body>\r\n</html>\r\n`. Quote count is even at 74; `var ENCODED` opens and closes; no mid-block truncation.
- Decoded base64 payload is 1,388,114 chars and ends with `</script>\n\n</body>\n</html>\n`. GDD pill inside payload reads `v0.74.38`.
- YaE landing card (`index.html` line 1511) shows `<span class="dot"></span><span>v0.74.x</span>` for Here Be Hordes; matches the v0.74.x burn-down (currently v0.74.38).
- Project name reads "Here Be Hordes" in both the landing card (line 1495) and the GDD `<title>`; matches the v0.72.0 name lock.
- Redirect stub at `projects/here-there-be-hordes/gdd.html` is still the 16-line meta-refresh to `/hordes/`; closes legacy bookmarks cleanly.
- Last 5 commits to `hordes/index.html` all read `docs(htbh): publish GDD v0.74.XX` (b6fb74a, 0934ae2, 694de2b, aad13fd, 22fd93c). Publish pipeline is healthy.
- 8 successful HBH republishes since the v0.74.30 truncation incident, no recurrence on the mirror side.

## Drift found

1. **Root cause from yesterday is unverifiable but still load-bearing (MEDIUM).**
   - The `Test-GddIntegrity` guard on `publish-gdd.ps1` recommended by the 2026-05-23 audit cannot be confirmed from this session (HBH not mounted). Eight clean publishes since the incident are reassuring but not proof; the v0.61.8 → v0.74.30 gap was 13 patch versions of "fine" between truncations. Until the guard is observed in the script, the recurrence risk remains.

2. **Yesterday's queue-these items never landed in the queue (LOW, process).**
   - `htbh-gdd-mirror-truncation-2026-05-23`, `htbh-publish-gdd-integrity-guard`, and `htbh-audit-needs-mount-access` were listed in the previous audit's queue-these block but no items added on or after 2026-05-23 appear in `.work-queue.json`. Either the audit's "Queue-these" footer is not being picked up by the next drain, or the items were intended to be added by hand and were missed. The truncation item is moot now; the other two remain relevant.

3. **Source-side coverage gap persists (CANNOT VERIFY, same as yesterday).**
   - With `X:\HereThereBeHordes` not in the current mount set, the locked-decisions / roadmap "done" / sprite-tuning-table / `source/*.gd` checks could not run. Reachable mirror is publish output, not canonical source.

## Couldn't verify

- `publish-gdd.ps1` integrity guard presence or absence.
- Locked Decisions section integrity inside the (now-complete) decoded payload, against `source/` reality.
- Sprite tuning reference stamp version vs. GDD pill (a queued P3 from 2026-05-20 still pending: `htbh-tuning-table-stamp-v0-65-0`).
- Roadmap "done" claims vs. `source/{buildings,units,enemies,systems}/*.gd`.
- `project.godot` `config/version=` against the GDD pill.

## Recommended actions (in order)

1. Land the `Test-GddIntegrity` guard in `publish-gdd.ps1` if not already present. Asserts source `docs/GDD.html` ends with `</html>` AND post-injection `hordes/index.html` ends with `";\n</script>...</html>` before allowing commit.
2. Get HBH mounted into the scheduled-audit session, or pull `X:\HereThereBeHordes\source\` and `docs/GDD.html` over git into a side workspace the audit can reach, so the source-side walk completes.
3. Confirm the audit's "Queue-these" footer is being parsed by the queue-add path; if not, switch to explicit `work-queue-runner add` calls inside this skill.

## Queue-these (for next `work-queue-runner` drain)

- `htbh-publish-gdd-integrity-guard-2026-05-24` (P1, structural) — verify or add `Test-GddIntegrity` to `publish-gdd.ps1`. Carry-over from 2026-05-23 with one publish-cycle of corroborating evidence.
- `htbh-audit-needs-mount-access-2026-05-24` (P2, infra) — the scheduled HBH audit task needs a session that mounts the HBH repo, or a pre-step that pulls source/ + docs/GDD.html into the YaE workspace before the audit runs.
- `audit-queue-add-pipeline-broken-2026-05-24` (P2, process) — the previous audit's queue-these block did not produce queue entries; either parse the footer in the runner or have the audit skill call `work-queue-runner add` directly.
