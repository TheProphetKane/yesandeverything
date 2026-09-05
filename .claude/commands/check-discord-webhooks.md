---
description: Report, per project, which Discord webhook URL files exist and which scripts read them.
---

Check discord webhooks. $ARGUMENTS

1. cd X:\YesAndEverything and run .\scripts\check-discord-webhooks.ps1. It prints file
   names and caller paths only across the whole portfolio; it never opens a webhook file
   and never prints a URL.
2. Report the result verbatim, including the two known intentional cases: this project is
   off by ruling (no webhook owed), and Gnosis builds its topic filenames at runtime so no
   literal search finds those callers.
3. Exit 0 means every webhook has a caller and every caller has a webhook; a nonzero exit
   names the mismatch to fix, never a check to relax.
