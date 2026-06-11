# yac-context-0511-0512-entries-2026-06-11 result

- Started: 2026-06-11T13:09:03Z
- Finished: 2026-06-11T13:09:03Z
- Status: done
- Prompt: Author CONTEXT.md changelog entries for 0.51.1 + 0.51.2 and bump banner (commits 7d17200, 9f4066c shipped without entries; banner stuck at 0.51.0).

## What was done

- Summarized both commits from their diffs. 0.51.1: bag-drag scroll restore retargeted from window to #main (the actual scroll container) plus 70px edge auto-scroll, and a runtime-injected header version label tracking BUILD_VERSION in src/main.ts. 0.51.2: removed the 0.51.1 edge auto-scroll whose top zone overlapped the distance section and walked scrollTop to 0 (the jump-to-top regression), kept the save/restore.
- Two changelog bullets added directly under "### Changelog" in descending order, matching house entry style (backticked version, bold PATCH + title, asterisk-numbered sub-items). No em dashes.
- Banner bumped: Current version 0.51.0 -> 0.51.2 (2026-06-08).
- Python atomic write with fsync + full readback verify; tail (uncommitted tail-repair text) byte-identical before/after, per item instruction not to clobber. File 393454 -> 395194 chars.

## Files touched

- X:\YesAndChains\CONTEXT.md

## Followups recommended

- Commit is NOT included: YaC .git/index.lock is unremovable from the sandbox (portfolio-wide P0 wts-2026-06-05-portfolio-wide-index-lock). CONTEXT.md edit sits in the working tree alongside the existing tail repair; lands with the next YaC commit after Windows-side git-unstick.
