# yae-yaa-pill-bump-2026-06-12 — result

Run: overnight-queue-drain, 2026-06-13
Status: committed-ready (Nick-side shell remaining)

## What changed

Apothecary project card pill in `X:\YesAndEverything\index.html` bumped `v0.17.x` -> `v0.18.x`
to match YaA HEAD (v0.18.1 across CHANGELOG, PROJECT_SPEC pill, and index.html pill).

Single scoped replacement of `<span class="dot"></span><span>v0.17.x</span>` (one known occurrence,
inside the Apothecary card block). No unanchored regex; the shared-landing-page first-card-stamp
hazard does not apply.

## Breakage found and fixed first

The working-tree `index.html` was FUSE-truncated before this run: 2658 lines, ending mid-script inside
the collapsible-project-cards IIFE with no `</html>`. That state would trip the release integrity guard
(`index.html` must end with `</html>`) and, if shipped via the raw-git escape hatch, would break the live
site tail (animation script + closing tags gone).

HEAD copy was intact (2684 lines, ends `</html>`). The working diff vs HEAD was +1/-26, i.e. pure
truncation damage with no real edits and the same `v0.17.x` pill. Recovery: restored byte-exact from
`git show HEAD:index.html` via atomic write + fresh readback, then folded the pill bump on the clean file.

Final: 2685 lines, ends `</html>`, diff vs HEAD is a single +1/-1 (the pill only).

## Queue file repair

The live `.work-queue.json` was itself FUSE-truncated mid `_drain_log` (cut at byte 76361 on a bare
`"outcome"` key, the 2026-06-12T12:45:00Z hbh-gdd-dualpath entry). Items array fully intact (31, matches
HEAD). Repaired in place: dropped the one incomplete trailing drain-log entry and re-closed the JSON,
preserving all 31 items and their live state (live items are newer than HEAD, so an in-place tail repair
was correct rather than a HEAD restore).

## Remaining (Nick-side, shell — paused)

Covered by `yae-index-lock-clear-2026-06-12`:
1. Clear stale `.git/index.lock` (sandbox cannot remove it, EPERM across the FUSE boundary).
2. Commit the YaE working tree (index.html restore + pill bump, queue, dashboard/loop state) through
   `cd X:\YesAndEverything; .\scripts\release.ps1`.

## Verdict note (rule 5)

The `index.html` truncation was a real breakage signal on YaE/Everything and is now fixed. Next review
pass can clear the Everything verdict toward working.

## Follow-up worth considering

Second consecutive audit caught this card pill stale because YaA's `deploy-to-yae.ps1` mirrors runtime
files but does not stamp the YaE landing-card pill. Auto-stamping the Apothecary card pill from
`deploy-to-yae.ps1` at mirror time would stop the recurrence.
