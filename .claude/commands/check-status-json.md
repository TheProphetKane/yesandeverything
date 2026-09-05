---
description: Integrity guard for the dashboard data files (status/data/*.json).
---

Check status JSON. $ARGUMENTS

1. cd X:\YesAndEverything and run .\scripts\check-status-json.ps1. It verifies every
   status/data/*.json parses as JSON, carries no embedded NUL bytes, and ends with a
   closing brace, catching FUSE / interrupted-write truncation before it ships to the
   live dashboard.
2. A trailing-NUL run at the tail is healed automatically (atomic tmp + move +
   readback); an embedded NUL before that run, an empty file, or a non-brace tail all
   fail hard.
3. Report which files were healed, if any, and confirm every file passed before calling
   this step done.
