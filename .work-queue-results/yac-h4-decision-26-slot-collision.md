# yac-h4-decision-26-slot-collision

**Completed:** 2026-05-28 (queue-drain-frequent)
**Source audit:** docs/CANONICAL_AUDIT-2026-05-28.md#H4

## Problem

PROJECT_SPEC.md line 142 referenced `pending Decision 26 capture per queue item yac-h1-stripe-monetization-decision`. Slot 26 was already claimed by the 2026-05-26 "Course-refresh cron host" answer (DECISIONS_NEEDED.md lines 7-22). The monetization decision needed a fresh slot.

## Fix

Two-file edit:

1. **DECISIONS_NEEDED.md.** Appended a new `## Pending decisions (post-2026-05-26)` block at the end of the file with `### 27. Stripe monetization gate, record the v0.32.0 pivot or revert it`. Captures the contradiction (BACKLOG §1.5 said no monetization, v0.32.0 shipped a Stripe gate), the decision options (record as locked Answer + add N6 to launch-checklist, or revert the scaffolding), and the queue-item cross-ref.
2. **PROJECT_SPEC.md line 142.** Single-character change: `Decision 26` to `Decision 27`.

## Notes

- First DECISIONS_NEEDED.md append via Edit tool silently truncated (FUSE Edit-tool truncation, memory `htbh-fuse-edit-tool-truncation`). Recovered via Python atomic-write-with-readback. Final size 334 lines, tail intact.
- New text scrubbed for em dashes (zero in Section 27). Historical em dashes elsewhere in the file untouched.
- Working tree dirty on YaC; not pushed (release.ps1 is a shell command, drain rule pauses for Nick).
- Carries over to unblock `yac-h1-stripe-monetization-decision` now that the slot is reserved.

## Files touched

- `X:\YesAndChains\DECISIONS_NEEDED.md`
- `X:\YesAndChains\PROJECT_SPEC.md`
