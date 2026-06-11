# yae-truncation-source-investigation-2026-06-11 result

- Started: 2026-06-11T16:30Z
- Finished: 2026-06-11T17:20Z
- Status: done
- Prompt: find the writer that tail-truncated 19 YaE files (Jun 8-11); harden the offending writer.

## Conclusion

No single offending script. The truncation source is the mount/storage layer itself, active across the Jun 8-11 window and coinciding with the portfolio-wide stale index.lock wedge and the spreading git object corruption (.next-loop.md tick 326). Three lines of evidence:

1. Commit b92bd1f (yae: update 17 files, 2026-06-10 18:13) committed a tail-truncated docs/BAR_RAISE_ROADMAP.md. Its file set (dashboard/index.html, status/index.html, all six status JSONs, collect-usage.ps1, bar-raise skill sources) matches the audit's victim list almost one for one. That bulk-write session is when most victims were cut.
2. scripts/collect-usage.ps1 was re-truncated TODAY at 16:20 during the audit's own restore pass, which used atomic write plus readback. Truncation can land after a successful readback, so this is flush-time data loss at the mount boundary, not a tool-usage bug in any one writer.
3. 51 .loop-* probe files at repo root (Jun 8, a prior session's write/unlink probes) include many zero-byte files whose writes were lost, plus all scripts/schedule/logs/*.log ending in null bytes, the same null-padding shape as the work/index.html victim.

## Repairs applied this run (atomic write + readback + 4-5s delayed re-verify, all held)

- scripts/collect-usage.ps1: restored from HEAD blob (14,290 -> 21,767 B). Note: the uncommitted comment/path-cleanup rewrite lost on Jun 11 02:01 remains unrecoverable; redo if still wanted.
- docs/BAR_RAISE_ROADMAP.md: HEAD itself carries the truncation (committed in b92bd1f). Repaired by splicing the 4.5 lost phase-table rows from parent 06489bd onto b92bd1f's content (19,158 -> 19,647 B). The rows were unchanged historical DONE entries, so no authored content was invented.
- _skill-review/personal-skills-src/skills/code-audit/SKILL.md: restored from HEAD (14,948 -> 15,689 B).
- _skill-review/personal-skills-src/skills/handler-audit/SKILL.md: restored from HEAD (14,483 -> 15,324 B).

## Hardening verdict

collect-usage.ps1 is a victim, not the offender; it runs host-side on Windows-native paths and needs no safe_write change. Per-script safe_write helps but cannot fully protect against post-readback flush loss. Effective mitigations: (a) delayed tail re-verify (a few seconds after write) on any FUSE-side restoration or bulk-write pass, now demonstrated in this run; (b) the queued Windows-side unblock (P0 wts-2026-06-05-portfolio-wide-index-lock: clear all six index.lock files, then git fsck YaC/YaA/YaE from the host where the real object store is visible).

## Files touched

- scripts/collect-usage.ps1
- docs/BAR_RAISE_ROADMAP.md
- _skill-review/personal-skills-src/skills/code-audit/SKILL.md
- _skill-review/personal-skills-src/skills/handler-audit/SKILL.md
- .work-queue.json (status flips only)

## Followups recommended

- The four repairs land with the already-queued yae-commit-restored-tree-2026-06-11 release.ps1 run; that item's verify-before-commit list should add these four files.
- Sweep the 51 .loop-* probe files and .work-queue.json.bak-1781024899 from the repo root before the next commit (one-line cleanup, host-side or post-unstick).
- Add a delayed tail re-verify step to any future restoration pass; immediate readback alone proved insufficient today.
