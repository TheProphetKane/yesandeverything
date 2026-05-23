# HBH canonical-doc audit (2026-05-23)

Target: `X:\HereThereBeHordes` (not mounted this session). Source-side walk skipped; the audit ran against the YaE-side mirror at `hordes/index.html` plus repo-level metadata reachable from `X:\YesAndEverything`.

## TL;DR

HIGH severity: the live mirror at `yesandeverything.com/hordes/` is shipping a truncated base64 payload from the most recent publish (v0.74.30, committed 2026-05-22 23:28). The inlined `var ENCODED = "..."` block has no closing quote and no closing `</script></html>`; the file ends mid-base64. This is the same shape as the v0.61.8 truncation incident the YaE CLAUDE.md flagged. The integrity guard recommended in that note (`Test-GddIntegrity` on the source GDD ending in `</html>` before injection) is still missing on the HBH-side `publish-gdd.ps1`. Version pills agree at v0.74.x across landing card, GDD header, and project meta.

## What's aligned

- YaE landing card (`index.html` line 320): `<span class="dot"></span>v0.74.x` matches the GDD version pill (`v0.74.30`, dated 2026-05-22) extracted from the inlined payload.
- Project name reads "Here Be Hordes" on the landing card and inside the GDD `<title>`, matching the v0.72.0 name lock.
- Redirect stub at `projects/here-there-be-hordes/gdd.html` is a 16-line meta-refresh to `/hordes/` (matches the YaE CLAUDE.md description; closes the 33-version-stale finding from `CANONICAL_AUDIT-2026-05-17.md`).
- `hordes/index.html` head still carries the `HBH-GATE-PALETTE-V0.40.0` marker plus the password gate UI; the publish-pipeline shape was preserved (the publish script injected into the existing gate file rather than replacing it).
- Latest five commits on `hordes/index.html` all read `docs(htbh): publish GDD v0.74.XX` (9ac3e43 .. 3dc6f8c). Publish cadence matches the v0.74.x burn-down.

## Drift found

1. **`hordes/index.html` base64 payload is truncated (HIGH, production-affecting).**
   - File size on disk: 1,830,217 bytes.
   - The `var ENCODED = "` block opens at byte 4370 and never closes; raw tail reads `...uY3Rpb24gcmVuZGVyU2NvcGVDZWxsKHJvdykgewo` with no `"` after it. Total `"` count in the entire file is 59 (every other quote in the gate UI), confirming the JS string is open.
   - Decoded payload (padded for tolerant decode) ends mid-function: `function renderScopeCell(row) {` with no body and no closing `</script></html>`. Decoded length is 1,367,491 chars vs. the head of the doc indicating a several-tab structure that should end in JS handlers + `</html>`.
   - Net effect: at the gate, the JS that decodes the password into the GDD payload throws a SyntaxError on script parse; the password unlock cannot complete. The live mirror is effectively broken until republish.
   - The truncation matches the v0.61.8 / v0.61.10 incident pattern (FUSE write truncation during base64 injection). Recovery script for the prior incident lives at `X:\HereThereBeHordes\outputs\v0_61_10_gdd_tail_recover.py` per memory.

2. **`Test-GddIntegrity` guard still absent (HIGH, root cause of #1).**
   - The YaE CLAUDE.md notes: "Add a `Test-GddIntegrity` guard that asserts the source GDD ends with `</html>` before injection." The recurrence of the same truncation 13 patch-versions later shows the guard never landed in `publish-gdd.ps1`. Same regex-shape lesson noted in `publish_gdd_regex_bug_lesson.md`: any cross-project publish script needs an integrity gate.

3. **Source-side coverage gap (CANNOT VERIFY).**
   - The scheduled task asked for a walk of `docs/GDD.html` against `source/`. With `X:\HereThereBeHordes` not in the current Cowork mount set (only YaE, Scheduler, YaC are mounted), the locked-decisions / roadmap "done" / sprite-tuning-table checks could not run. The reachable mirror is the publish output, not the canonical source.

## Couldn't verify

- Locked Decisions section integrity (offset 237,993 in decoded payload; the payload itself is truncated downstream of this, so the section may still render but post-section content is missing).
- Sprite tuning table at offset 216,138 (same caveat).
- Roadmap "done" claims vs. `source/{buildings,units,enemies,systems}/*.gd`.
- `project.godot` `config/version=` against the GDD pill.

## Recommended actions (in order)

1. Republish the GDD from the HBH side: `cd X:\HereThereBeHordes; .\release.ps1` (or the equivalent `scripts\publish-gdd.ps1` direct call). The next publish overwrites the truncated payload.
2. Land the `Test-GddIntegrity` guard in `publish-gdd.ps1` before any further publish; refuse to inject any payload whose source `docs/GDD.html` does not end in `</html>` AND whose post-injection target `hordes/index.html` does not end in `";\n</script>...</html>`.
3. Reschedule this audit to fire from a session that mounts `X:\HereThereBeHordes` so the source-side walk can complete.

## Queue-these (for next `work-queue-runner` drain)

- `htbh-gdd-mirror-truncation-2026-05-23` (P0, structural) — republish GDD; live mirror currently broken.
- `htbh-publish-gdd-integrity-guard` (P1, structural) — add `Test-GddIntegrity` to `publish-gdd.ps1`.
- `htbh-audit-needs-mount-access` (P2, infra) — scheduled audit task should run from a session that mounts the HBH repo, or pull source/ over git into a side workspace first.
