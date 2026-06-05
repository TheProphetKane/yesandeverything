# HBH Canonical Audit — 2026-06-02 (STUB: mount gap)

Status: NOT RUN. Source repo not mounted.

The scheduled daily HBH canonical audit could not execute. `X:\HereBeHordes`
(aka `X:\HereThereBeHordes`) is not in this Cowork session's mount set. The
session mounted only `YesAndEverything`, `Scheduler`, and `YesAndChains`.
Per the audit task's Step 3, no source-side analysis was attempted; doing so
without the real GDD and code would fabricate findings.

This is the fifth consecutive stub (2026-05-29 through 2026-06-02) and at least
the tenth recorded occurrence overall. The tracking item already exists on the
cross-project work queue as `htbh-audit-mount-or-sidecar-2026-05-28` (P1,
pending). Rather than enqueue a duplicate, its `lastNoticedAt` was bumped to
2026-06-02 and its notice count incremented.

## What this blocks

- Daily GDD-vs-code drift detection for HBH.
- The GDD-publish end-of-file integrity guard follow-up
  (`</html>` tail assertion before injection), tracked as
  `htbh-publish-gdd-integrity-guard-2026-05-28`, which needs source-mount access.
- Any structural HBH queue item that requires reading source or the GDD.

## To resume

Mount `X:\HereBeHordes` into the audit Cowork session, or stand up a sidecar
pull so the audit can read the GDD and code without a live mount. Once mounted,
run a single dedicated drain pass over the accumulated HBH queue items
(`htbh-audit-mount-or-sidecar-2026-05-28`, `htbh-publish-gdd-integrity-guard-2026-05-28`,
and the carry-overs they track).

No drift fixes applied. No version bumped. No release run.
