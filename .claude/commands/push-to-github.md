---
description: Commit + push YesAndEverything with an auto-detected commit message.
---

Push to GitHub. $ARGUMENTS (optional: -Path <pathspec>, ... to scope the commit).

1. cd X:\YesAndEverything and run .\scripts\push-to-github.ps1 with any arguments given.
   It auto-detects what changed and writes a matching commit message; no confirmation
   prompts.
2. Pass -Path to scope staging to explicit pathspecs. Without it the script stages
   everything, which sweeps whatever another session left staged into this commit; this
   repo has routines writing status/data, dashboard/data and the queue continuously, so
   that risk is live here more often than in a single-session repo.
3. Confirm the push landed and report the commit message it generated.
