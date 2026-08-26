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

| Secrets file                          | Channel it posts to      | Role      |
|---------------------------------------|--------------------------|-----------|
| `.discord_webhook.txt`                | `#<proj>-dev-log`        | Release   |
| `.discord_announcements_webhook.txt`  | `#<proj>-announcements`  | Headline  |
| `.discord_audit_webhook.txt`          | `#<proj>-resources`      | Audit     |
| `.discord_backlog_webhook.txt`        | `#<proj>-ideas`          | Backlog   |
| `.discord_resources_webhook.txt`      | `#<proj>-resources`      | Resources |

**Two of those file names do not match their channel, and that is correct.** Every project category
in Discord holds exactly five channels: `-dev-log`, `-announcements`, `-resources`, `-general`,
`-ideas`. There is no `-audit` channel and no `-backlog` channel in any project, checked across
Chains, Hordes, Rising, Budget, Ring, Scheduler and Apothecary on 2026-08-26. Audit and bar-raise
digests go to `-resources`; backlog diffs go to `-ideas`. The scripts have always said so:
`post-audit-digests.ps1` prints `#<proj>-resources` and `post-backlog-changes.ps1` prints
`#<proj>-ideas`.

This table used to name `#<proj>-audit` and `#<proj>-backlog`, which never existed anywhere. That
error propagated into seven project handlers before it was caught. **Read a webhook file name as a
label for what it carries, never as the channel it reaches, and never create a channel to make a
file name true.** The one project to fix a script to match the old table, Budget, ended up printing
`#budget-audit`, a channel nobody can open.

### Example — a project whose dashboard identifier is `Budget`

    Budget Release Bot     -> #budget-dev-log
    Budget Headline Bot    -> #budget-announcements
    Budget Audit Bot       -> #budget-resources
    Budget Backlog Bot     -> #budget-ideas

## What this file is not (ruled 2026-08-26)

**The five-role table above is naming vocabulary, not a checklist any project owes.** It answers
"what do I call this webhook", never "which webhooks should exist here".

Every project handler used to carry all five rows regardless, and the provisioned count ran from
one of five to four of five. That cost two live failures: Chains' `post-audit-digests.ps1` reads a
`Chains Audit Bot` webhook that was never created, so it exits at the missing-webhook check on
every release and no audit document has ever been announced; and Hordes' equivalent step was
deleted outright in v0.99.38 for the same reason, so nothing announces a Hordes audit at all.

Worth knowing while fixing those: `post-audit-digests.ps1` announces audit DOCUMENTS that landed
in `docs/`. It has no failure path and never reports on a run, so a crashed audit posts nothing
and a quiet week posts nothing, and the two are indistinguishable in every project that has the
script. Creating a missing Audit webhook does not close that; the routine posting its own
pass-or-fail outcome would.

So the rule for every handler is:

- A handler lists a webhook only once it exists on the Discord side AND a script in that repo
  reads its file. Name the script in the row so the claim can be checked.
- A role with no webhook and no caller does not appear, not even annotated. Naming it here is
  enough to get the name right when one is made.
- A role with a caller but no webhook is written as a gap, with what it takes to close it, not as
  a row that reads like working wiring.

Applied across every project handler on 2026-08-26. `scripts/check-discord-webhooks.ps1` in this
repo is how the claim gets checked: it lists which webhook files exist per project and which
scripts read them, printing names and caller paths only, never a URL. It exits non-zero on a
caller with no webhook or a webhook with no caller.

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
