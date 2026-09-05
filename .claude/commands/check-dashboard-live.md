---
description: Freshness guard for the LIVE build dashboard (checks the product, not the producer).
---

Check dashboard live. $ARGUMENTS

1. cd X:\YesAndEverything and run .\scripts\check-dashboard-live.ps1. It reads the same
   two endpoints the dashboard page itself reads and fails when what a visitor would see
   is stale, rather than checking whether the writer routine merely ran on schedule.
2. Report the exit code and, on failure, which endpoint is stale and how old its payload
   is.
3. A failure here means the publish to the live endpoint is broken even if every
   producer-side check is green; fix the publish path, never the check.
