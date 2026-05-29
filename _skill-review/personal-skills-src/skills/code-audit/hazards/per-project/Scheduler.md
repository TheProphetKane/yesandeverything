# Scheduler project-specific hazards

`X:\Scheduler`. Employee-scheduling SaaS. Cloudflare Workers + D1 SQLite + React/Vite frontend.

## Always-on checks

- `checks/secret_exposure.py` (`.discord_webhook.txt`, JWKS keys, Supabase service role keys)
- `checks/version_drift.py` (package.json vs CHANGELOG.md vs git tag)
- `checks/voice_violations.py` (CHANGELOG.md, README.md, docs/DESIGN.md)

## D1 SQLite quirks (BLOCK)

- No `RIGHT JOIN`
- No `FULL OUTER JOIN`
- Limited `ALTER TABLE` (no DROP COLUMN, limited RENAME)

Any new SQL using these constructs → BLOCK.

## Worker free-tier limits (HIGH)

- 50ms CPU per request
- 30s wall-clock

Schedule auto-fill (DESIGN §8) must complete well under 30s for ~25 employees * 6 weeks. New per-request code that increases CPU cost on the auto-fill path → HIGH (profile required).

## Pages vs Workers (HIGH)

Cloudflare Pages Functions and Workers are DIFFERENT runtimes. Don't conflate. The Scheduler API is a standalone Worker; the SPA is Pages-deployed. New code that imports Worker APIs from Pages or vice-versa → HIGH.

## Tenant isolation (BLOCK)

Multi-tenant. Cross-org access must return 404, never 403. Returning 403 leaks tenant existence. Any new route that returns 403 for cross-org access → BLOCK.

## Auth flow

- Supabase magic-link via custom SMTP (`auth@yesandeverything.com`)
- JWT verification via Supabase JWKS
- `users` sidecar table joined by `supabase_user_id`
- No passwords, no own session table

New code that introduces password fields, own session table, or bypasses Supabase JWT verification → BLOCK.

## Milestone discipline

DESIGN §21 breaks v1 into M1-M6. Do them ONE AT A TIME, IN ORDER. New code that gets ahead (e.g. M4 features before M3 ships) → MEDIUM with a request to verify scope.

## Release pipeline

`scripts/release.ps1`:
- push-to-github.ps1 (commit + push, kicks SPA deploy via GitHub Actions)
- deploy-worker.ps1 (applies pending D1 migrations + wrangler deploy)
- discord-notify.ps1 (non-fatal)

Pre-flight guards: (a) package.json version differs from `scripts/.discord_last_posted.txt`; (b) CHANGELOG.md has matching `## [vX.Y.Z]` entry. Either guard bypassable via `$env:RELEASE_FORCE = "1"`. Any new release.ps1 that drops these guards → HIGH.
