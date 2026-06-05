# HBH Canonical Audit — 2026-06-05 (mount gap, no source coverage)

Status: SKIPPED. HBH repo not in the Cowork session mount set.

## Mount set this run

Mounted: Scheduler, YesAndChains, YesAndEverything (plus outputs/uploads).
Absent: HereBeHordes / HereThereBeHordes. The scheduled audit cannot read
source/ or docs/GDD.html, so project-canonical-audit was not invoked and
drift-auto-fix was not chained (no findings report to act on).

## Action taken

No new queue item enqueued. The standing infra item
`htbh-audit-mount-or-sidecar-2026-05-28` (P1, pending) already tracks this
root cause; its lastNoticedAt was bumped to this run and noticeCount is now 9.
This is the ninth consecutive run blocked on the same mount gap.

## Unblock

Add X:\HereThereBeHordes (mount path HereBeHordes) to the scheduled audit
session's folder set, OR have audit-htbh-daily pre-pull source/ + docs/GDD.html
from origin into a reachable workspace before invoking project-canonical-audit.
Until one of those lands, every HBH canonical-audit run no-ops here and the
HBH-scoped queue items stay stalled.
