# YesAndChains project-specific hazards

`X:\YesAndChains`. Pocket disc-golf caddy PWA. Pre-1.0; CONTEXT.md is 218KB.

## Always-on checks

- `checks/secret_exposure.py` (`.admin-token`, `.cloudflare-token`, `.github-pat` must stay gitignored)
- `checks/version_drift.py` (CONTEXT.md pill + worker/package.json + git tag)
- `checks/voice_violations.py` (CONTEXT.md changelog entries, README.md)

## Canonical layer (multi-file)

YaC has a deliberate multi-file canonical layer. New code that adds documentation to the WRONG file → MEDIUM:

- `PROJECT_SPEC.md` — vision + product source of truth
- `CONTEXT.md` — shared vocabulary + per-version changelog (218KB, search not load)
- `ROADMAP.md` — current state + what's next
- `BACKLOG.md` — deferred items
- `DECISIONS_NEEDED.md` — answered decision log (append-only)
- `docs/launch-checklist-1.0.md` — active 1.0 queue
- `docs/adr/` — architecture decision records

`NEXT_SESSION_QUEUE.md` is tombstoned; do not write to it.

## Versioning policy

Revised 2026-05-05 (supersedes Decision 15):
- PATCH (`0.x.y → 0.x.y+1`) — bug fix, polish, doc update, no user-visible surface change
- MINOR (`0.x.y → 0.x+1.0`) — new feature, wizard step, endpoint, screen, schema addition
- MAJOR (`0.x → 1.0`) — reserved for v1 launch

The version pill lives in `CONTEXT.md` at the top of "Version & changelog". Bump alongside the change, not after.

## Data integrity (HIGH)

- `course_data.json` (~12MB) is canonical reference data. Do not paste or full-read.
- `disc_database.json` (~647KB), `plastic_db.json` (~200KB) same.
- v0.27.0+ allows signed-in users to contribute pin positions + hole metadata (ADR 0019, Decision 25). Anonymous users stay read-only.
- Per memory: don't load these files into the LLM. Slice or skip.

## Magic-link auth flow

- Sender: `auth@yesandeverything.com` via Resend SMTP.
- Don't change sender domain. v0.25.2 moved from `chains@` to `auth@`.
- Per memory: same pattern as `kane@yesandeverything.com` feedback inbox.

## Build output

`app.js` is the build output (~1MB). NEVER edit directly. Source in `src/` (TypeScript). Run the build (`sync.ps1` or `package.json`) to regenerate.

## Release pipeline

`scripts/release.ps1`:
- preship gauntlet (tools/preship.sh)
- push-to-github.ps1
- auto-deploys Cloudflare worker if worker/src/ changed
- discord-notify.ps1

Webhook URL in `scripts/.discord_webhook.txt` (gitignored). Per memory `yac_release_pipeline`.

## Lock signals

"perfect" / "ideal" / "exactly how I want it" promotes a tuning value to a locked decision. Locked decisions go into `DECISIONS_NEEDED.md` (the answered log; filename is slightly misleading).
