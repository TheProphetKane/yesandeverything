# Deploy

This file is a pointer on purpose. The old setup runbook described a branch deploy,
Squarespace domain records and raw `git push`, all retired, and a long runbook drifts.

- **Pages deploy:** `.github/workflows/deploy-pages.yml`, which publishes through the Actions source.
- **Domain and registrar:** Cloudflare, since 2026-05-06.
- **Shipping a change:** `scripts/release.ps1`. The flow is in `CLAUDE.md` under "Deploy flow".
- **Pulling the remote:** `python scripts/pull-safe.py`, never a bare `pull --rebase --autostash`.
