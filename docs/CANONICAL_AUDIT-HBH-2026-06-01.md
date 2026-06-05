# HBH Canonical Audit — 2026-06-01 (STUB: mount gap)

Status: NOT RUN. Source repo not mounted.

The scheduled daily HBH canonical audit could not execute. `X:\HereBeHordes`
(aka `X:\HereThereBeHordes`) is not in this Cowork session's mount set. The
session mounted only `YesAndEverything`, `Scheduler`, and `YesAndChains`.
Per the audit task's Step 3, no source-side analysis was attempted; doing so
without the real GDD and code would fabricate findings.

This is the sixth recorded occurrence of the mount gap (prior: 2026-05-23
through 2026-05-28 audit logs). The tracking item already exists on the
cross-project work queue as `htbh-audit-mount-or-sidecar-2026-05-28` (P1,
pending). Rather than enqueue a duplicate, its `lastNoticedAt` was bumped to
2026-06-01 and its notice count incremented to 4.

## What this blocks

- Daily GDD-vs-code drift detection for HBH.
- Verification that v0.75.0 (shipped 2026-05-28, commit 3779655) marked its
  GDD §17 roadmap item done with a top-of-footer changelog entry.
- The GDD-publish end-of-file integrity guard follow-up
  (`</html>` tail assertion before injection), which needs source-mount access.

## To resume

Mount `X:\HereBeHordes` into the audit Cowork session, or stand up a sidecar
pull so the audit can read the GDD and code without a live mount. Once mounted,
run a single dedicated drain pass over the accumulated HBH queue items
(`htbh-audit-mount-or-sidecar-2026-05-28` and the carry-overs it tracks).

No drift fixes applied. No version bumped. No release run.
