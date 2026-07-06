# Discord webhook naming convention (portfolio standard)

This is the single source of truth for how every Yes& project's Discord webhooks
are **named on the Discord side**. Every new project follows it (the New Project
Template references this file); every existing project's webhooks must match it.

## The rule

Every Discord webhook's **display name** — the name shown in Discord under
**Channel Settings → Integrations → Webhooks**, i.e. the webhook's `name` field —
MUST be:

    <identifier> <Role> Bot

### `<identifier>` = the project's ONE-WORD DASHBOARD IDENTIFIER

The exact string in the `project` field of that project's status card at
`status/data/<Project>.json` in the YesAndEverything repo.

Examples: `Budget`, `Rising`, `Hordes`, `Chains`, `Apothecary`, `Scheduler`, `Ring`.

It is **NOT** the repo folder name (e.g. "YesAndBudget") and **NOT** the short code
(e.g. "YaB").

### `<Role>` = the webhook's purpose, keyed by which secrets file / channel it serves

| Secrets file                          | Channel                  | Role      |
|---------------------------------------|--------------------------|-----------|
| `.discord_webhook.txt`                | `#<proj>-dev-log`        | Release   |
| `.discord_announcements_webhook.txt`  | `#<proj>-announcements`  | Headline  |
| `.discord_audit_webhook.txt`          | `#<proj>-audit`          | Audit     |
| `.discord_backlog_webhook.txt`        | `#<proj>-backlog`        | Backlog   |
| `.discord_resources_webhook.txt`      | `#<proj>-resources`      | Resources |

### Example — a project whose dashboard identifier is `Budget`

    Budget Release Bot
    Budget Headline Bot
    Budget Audit Bot
    Budget Backlog Bot

## Sanctioned exceptions

- **Gnosis** (dashboard identifier `Gnosis`, the Elder Domain vault app, renamed from
  Yes& RPG 2026-07-06): its webhooks keep the display names **`RPG <Role> Bot`**
  (Release on #all-chat; Characters / Items / Monsters / Maps / One-Shot Ideas on the
  topic channels). Reason: the Discord category is "Yes and... RPG" and that is the
  community-facing name; the app name is internal. The daily content posts override
  the post username to "A Librarian of Gnosis" instead. Do not rename these webhooks.

## Notes

- The webhook **display name** (governed by this convention) is distinct from the
  **post username** the release tooling sends (e.g. `discord-notify.ps1` posts with
  `username="<short>-release-bot"`). This rule governs only the Discord-side webhook name.
- Set the name at **webhook-creation time**. Never leave Discord's defaults
  ("Captain Hook", "Spidey Bot").
- To fix an existing webhook **without recreating it**: `PATCH` the webhook's own URL
  with a `name` body — the URL itself authorizes the rename, no bot token needed:

      curl -X PATCH "https://discord.com/api/webhooks/{id}/{token}" \
           -H "Content-Type: application/json" \
           -d '{"name":"<identifier> <Role> Bot"}'

- Webhook URL files live at `X:\.secrets\<RepoFolder>\scripts\.discord_*.txt`
  (gitignored, never committed). See `X:\.secrets\README.md`.
