---
description: One-stop release for YesAndEverything (commit + push + Discord notify).
---

Release. $ARGUMENTS (optional: -Path <pathspec>, ... to scope the commit instead of
staging everything).

1. cd X:\YesAndEverything and run .\scripts\release.ps1 with any arguments given. It is
   equivalent to running push-to-github.ps1 then discord-notify.ps1.
2. Pass -Path when shipping a targeted edit (e.g. -Path status/data/Ring.json); without
   it the push stages everything, which sweeps whatever another session left staged into
   this commit. Routines write status/data, dashboard/data and the queue continuously, so
   an unscoped release on this repo almost always carries someone else's work.
3. Confirm the commit landed and report what was pushed; GitHub Pages auto-deploys from
   main root within about 30 seconds.
