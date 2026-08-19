# Deferred review

Last review: 2026-08-19 (attended cull; the weekly routine was re-registered the same day and
takes over from Friday 2026-08-21)

## TL;DR

Reviewed the whole queue (991 items at start). Verdicts applied through queue_write.py:

- 276 DROPPED to the archive: 272 superseded-generation review items (source report at least a
  week older than the project's newest full re-review, below high severity, absent from the
  living action ledger), 1 by ruling (the Cattery connector was removed deliberately), 3
  duplicate ids. Every drop is one line in WONT_DO.md.
- 16 CLOSED with evidence: the queue-exposure item (privatized today), the Cattery v0.25.6
  money-path trio, two YesAndEverything bare-commit items (now blocked mechanically by the
  PreToolUse guard), the Agents probe-context item (cwd fix committed), the archived tombstone
  item, six Skylight single-copy/backup items (private remote plus native backup task), two
  Gnosis release-stack items (guard order plus idempotency).
- 5 REOPENED: the 2026-07-25/26 mis-attributed batch closes (agents 1, scheduler 3, ring 1),
  each carrying a re-verify note; trusting a completion stamped by the wrong session is worse
  than the item being open.
- 2 DEFERRED by ruling: the Cattery prod-verification items are unverifiable without the
  connector Kane removed on purpose; they come back only if Cattery resumes.

Queue after: 375 pending (was 653), 105 blocked-on-user (was 116).

## Your call (the escalations that remain)

- 107 pending items from superseded reports carry HIGH or P1 severity and were deliberately NOT
  dropped; the nightly audit should re-verify them against the current reports (its carried-
  findings reconcile rule).
- The blocked-on-user pile (105) is decision-shaped work; the biggest slices are Cattery (13),
  Ring (14), Skylight (8 after today's closes). A weekly decisions-only digest remains the
  missing primitive.

## Dropped this pass

276 lines appended to WONT_DO.md, by project: hordes 99, rising 43, gnosis 34, skylight 30, everything 22, ring 14, cattery 13, apothecary 6, agents 5, scheduler 4, budget 4, yab 2
