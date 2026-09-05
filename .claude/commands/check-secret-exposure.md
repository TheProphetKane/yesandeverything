---
description: Receiving-side secret-shape scan over everything another project publishes into this repo.
---

Check secret exposure. $ARGUMENTS

1. cd X:\YesAndEverything and run .\scripts\check-secret-exposure.ps1. It scans every
   artifact another project's own script pushes into this public repository (the
   landing-page patch, workers/gated-docs) since a publisher's own gate cannot reach
   across repositories.
2. Report any match verbatim: a Discord webhook URL, a private key, a GitHub token, an
   API key, or a secret-named key holding a high-entropy value.
3. A match blocks the release; never loosen the pattern list to get past it. Fix it at
   the source repo that published the artifact.
