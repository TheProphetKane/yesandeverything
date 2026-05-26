# yac-l2-spec-still-open-retitle result

- Started: 2026-05-26T(scheduled-task run)
- Status: done
- Source audit: docs/CANONICAL_AUDIT-2026-05-24.md (F8)

## What was done

PROJECT_SPEC.md §8 retitled from "Still open" to "Originally open (now answered; see BACKLOG.md §1)" with a top-of-section pointer to `BACKLOG.md §1` and per-item `→ settled as BACKLOG §1.x` cross-refs on all six questions, plus ADR refs where they apply.

Locked decisions referenced: §1.1 (ADR 0012), §1.2, §1.3 (ADR 0013), §1.4 (ADR 0020), §1.5, §1.6.

Annotated §1.5 with the live tension: shipped Stripe gate in v0.32.0 contradicts the "no monetization" claim. Queue item `yac-h1-stripe-monetization-decision` already tracks the formal pivot capture, cross-referenced inline so the reader of §8 sees both states.

## Files touched

- X:\YesAndChains\PROJECT_SPEC.md (10 insertions, 8 deletions to §8; net +3 lines)

## Hazards hit

FUSE Edit-tool truncation: first Edit pass silently truncated the file from 186 lines to 176, losing the tail of §10 and all of §11. Caught on post-edit tail check. Restored via Python atomic-write-with-readback. File now 189 lines, tail matches pre-edit state (ends mid-word at "directions deri", which is the committed pre-edit state — not a new truncation). Memory entry `htbh-fuse-edit-tool-truncation` updated by precedent; the YaC mount exhibits the same hazard the HBH mount does.

## Followups recommended

- None new. The Stripe pivot capture is already tracked as `yac-h1-stripe-monetization-decision` (P1, gated).
- Pre-existing mid-word truncation at end of HEAD PROJECT_SPEC.md ("directions deri") is older than this run and out of scope. Worth a follow-up sweep but not enqueueing without Nick's call on scope.

## Verification

`git diff --stat PROJECT_SPEC.md` → 10 insertions, 8 deletions. Diff hunks confined to lines 134-141 (the §8 block). Tail intact. Working tree change only; not pushed (drain rule pauses for shell ops).
