# Claude Primer — YesAndEverything

**Command rule (always):** Any git, push, release, deploy, or script command provided in chat must lead with `cd X:\YesAndEverything` so it never runs against the wrong repo. This repo is `X:\YesAndEverything`. (Cross-project standard; see `X:\CLAUDE.md` (the script standard is in `X:\ARCHITECTURE.md` section 6).)


You are working on **YesAndEverything** — the public-facing static site at <https://yesandeverything.com>. It is a single-page landing page listing Kane's projects, plus per-project sub-pages, plus two design documents served through a server-side gate.

## What this repo is (and isn't)

- **Is:** a static-site monorepo deployed to **GitHub Pages by a GitHub Actions workflow** (`.github/workflows/deploy-pages.yml`: `configure-pages` then `upload-pages-artifact` then `deploy-pages`, serialized through a single `pages` concurrency group with `cancel-in-progress` so a burst of pushes stops colliding at the Pages deploy API and failing). This replaced the legacy Deploy-from-a-branch builder. No framework, no SSR: pure HTML/CSS/JS, dark-mode by default, mono-font-first aesthetic. The one workflow step beyond serving the repo root as-is is `node scripts/update-project-pages.mjs`, which stamps live version and milestone numbers from `status/data/*.json` into the homepage cards and project pages. One exception now ships from here too: a small Cloudflare Worker under `dashboard-api/` (deployed separately via wrangler, not by Pages). So it's a static site PLUS one tiny API worker.
- **Is not:** the actual code of the projects it links to. Each project (Here Be Hordes, Brackish Rising, Chains, Scheduler, Apothecary, Budget, Gnosis, Cattery, Agents, Ring) lives in its own repo. This repo carries landing pages + mirrors, plus one small API worker (`dashboard-api/`, see Files at a glance).

## What belongs in this repo (the rule, Kane 2026-08-26)

The Pages workflow uploads `path: '.'`. There is no build step and no include list, so
the repository root IS the artifact and every tracked file here is a URL whether anyone
meant it to be one. `usage-log/Chains.jsonl`, `scripts/collect-usage.ps1` and
`docs/BAR_RAISE_ROADMAP.md` all answered 200 on the live domain until this ruling.

Three questions, in order, for anything new:

1. Should a request to `yesandeverything.com` be able to fetch it? If yes, it belongs here.
2. Does it exist to make that fetch correct: a build step, a gate, a guard, a deploy, or the
   target of a projection? If yes, it belongs here.
3. Anything else belongs in `X:\PortfolioOps`, the private ops repo.

**The tripwire: if you are reaching for a `.gitignore` line to keep a file out of the
deploy, the rule has already answered.** That file failed both questions, so it goes in the
other repository rather than onto the ignore list. Two thirds of that file was a denylist
grown one line per incident, each marking a place someone caught an ops artifact in time.
The only patterns that should survive here are operating-system noise, build caches, this
project's own local audit reports, and the secret-shaped defensive globs, which catch an
accident rather than house an intentional artifact.

`status/data/` is the shape to copy when something genuinely has to be public: canonical
private in the ops repo, a projector emits scrubbed public copies here, and the nightly
sweep flags a direct write. `workers/gated-docs/` is the shape to copy in the other
direction: it is tooling, and it belongs here because it serves paths on this domain.

Full reasoning and the moved inventory: `docs/IMPROVEMENTS-repo-shape-2026-08-26.md`.

## Files at a glance

| Path | Purpose |
|---|---|
| `index.html` | The site itself. Single self-contained file. Lists projects with descriptions. |
| `404.html` | Fallback for unknown paths. |
| `CNAME` | Custom-domain pointer for GitHub Pages: `yesandeverything.com`. |
| `robots.txt` | Allows crawlers on root, disallows `/hordes/`, `/brackish-rising/`, `/work/`, `/dashboard/`, `/dashboard-api/`, `/sitemap/`, `/status/`, `/docs/`, `/_skill-review/`. **Two of those are deliberately linked from the homepage** (`/status/` and `/dashboard/`, in the work section and the closing paragraph), and that is not a contradiction to be fixed: the stance is humans welcome, search engines no. Disallow keeps them out of results; it was never access control. For `/dashboard/` the client-side password gate protects the rendered page at `dashboard/index.html`, but not the JSON it reads: `dashboard/data/*.json` are plain files in the Pages-served tree, so every one of them answers 200 to a direct unauthenticated fetch regardless of whether the gate was ever passed (confirmed live 2026-08-28). The gate is a UX speed bump on the page, not access control on the data. A 2026-07-28 review read the link-plus-disallow pair as a defect, so it is written down here rather than re-found. |
| `dashboard-api/` | Small Cloudflare Worker (`worker.js` + `wrangler.toml`, git-tracked, landed 2026-06-24) backing the usage dashboard. The one server-side piece in an otherwise static repo; deployed separately by wrangler, not by GitHub Pages. **Exposure:** this folder sits inside the Pages-served tree, so `yesandeverything.com/dashboard-api/worker.js` and `/dashboard-api/wrangler.toml` are publicly fetchable. `wrangler.toml` should hold no secrets (those live in the Cloudflare dashboard); `robots.txt` now disallows `/dashboard-api/` alongside the other private paths. |
| `.nojekyll` | Real 0-byte file at the repo root. Tells GitHub Pages to serve the tree as-is (skip Jekyll processing). |
| `workers/gated-docs/` | The server-side gate for the two private design documents, at `/hordes/` and `/brackish-rising/`. Cloudflare Worker on path routes, deployed by wrangler rather than by Pages. **This replaced two static pages here that carried the whole document as base64 with the access phrase in cleartext** (2026-08-25). Those withheld nothing: the payload decoded without the phrase, and this repository is public. The documents now live in the `GATED_DOCS` key-value namespace, written by each project's `publish-gdd.ps1`, and are read only after a signed session cookie validates. Access phrases are Worker secrets, listed in `X:\.secrets\YesAndEverything\gated-docs-access.txt`. The Worker source is safe to be public: it holds no phrase and no payload. |
| `workers/coiled-guardian/` | Shipped 2026-08-27. The server-side gate for a private, unpublished, for-sale manuscript at `/coiledguardian`, source-written in `X:\CoiledGuardian`. Same shape as `workers/gated-docs/`, with one difference: that Worker serves one document per prefix, this one serves many pages under a single prefix, so the page is resolved from the rest of the path *after* the session cookie validates rather than before it — an unknown page under a valid session 404s instead of hinting that something is there. Chapter bodies live in the same `GATED_DOCS` key-value namespace under `cg:`-prefixed keys (so the two gates never collide), written by that project's own `tools/publish.mjs`. **The chapter bodies are not in this repository and must not come back to it** — same standing rule as the two design documents. The Worker source is safe to be public: it holds no phrase and no chapter text. |
| `projects/here-there-be-hordes/gdd.html` | Dead-weight legacy file from pre-v0.26.18 publish flow. Now a meta-refresh stub that redirects to `/projects/here-be-hordes/design.html` so any old bookmark still lands on a gated page — it used to point at `/hordes/`, which made it a public link into a robots-disallowed path. Folder path kept (not renamed) because no live link on the site references it; the redirect just covers external bookmarks. |
| `projects/scheduler/{index,design}.html` | Scheduler project landing + design preview. |
| `projects/{apothecary,brackish-rising,budget,cattery,chains,gnosis,here-be-hordes,ring}/` | Per-project Details + Design pages (`index.html` + `design.html` each; design pages are client-gated). `projects/budget/` also carries `pre-install`, `privacy`, `security`, and `security-notices` sub-pages, plus a nested `security/pgp-key` page. Every PUBLIC project gets a homepage card (alphabetical by project word) with Details / Design / Launch buttons plus this page pair. Version/milestone values carry `<!--live:...-->` markers stamped by `scripts/update-project-pages.mjs` (run in the Pages deploy workflow), so a project release refreshes the deployed pages via its status JSON push. Agents is deliberately absent from the homepage grid (2026-07-06, still current) but is tracked on the robots-gated dashboard and status tier (restored 2026-07-08) — don't add an Agents card without Kane's explicit ask. Counselor and Skylight are never listed. |
| `apothecary/` | Celtic apothecary label designer — multi-file ES-module app, deployed by mirroring from `X:\YesAndApothecary` via that repo's `scripts/release.ps1` (which calls `scripts/deploy-to-yae.ps1` then commits + pushes this side). Multi-file by design; the "one file per page" convention does not apply to this subdir (it's a project mirror, the one place in this repo where that's expected). Do not edit files in `apothecary/` directly; edit in the source repo and run release. |
| `budget/` | Budget project landing page. Single self-contained file; project mirror. |
| `terms/` | Terms / legal page. Single self-contained file. |
| `dashboard/` | Private portfolio dashboard (robots-gated). Reads `dashboard/data/usage.json` (tokens and cost), `dashboard/data/health-trend.json` (one row per project per day: review health, open and closed findings, completion, gates, backlog, oldest open finding, audit count, written by `collect-usage.ps1`, rolling 90 days), the live worker feeds, every `status/data/<Project>.json`, and `status/data/constellation.json` for the portfolio band. Reworked 2026-08-24, see `X:\PortfolioOps\docs\DASHBOARD-REDESIGN-2026-08-24.md`. |
| `sitemap/` | Private site map page (robots-gated). |
| `work/` | Private work page (robots-gated). |
| `DEPLOY.md` | One-time DNS + GitHub Pages setup runbook. Already executed. |
| `scripts/` | Only what makes a deploy of this site correct. `release.ps1` runs the integrity guards then commit + push, and calls `discord-notify.ps1`, which exits early because this project has no webhook by Kane's ruling of 2026-06-22. `push-to-github.ps1`, `check-status-json.ps1`, `check-page-prose-staleness.mjs`, `check-dashboard-live.ps1`, `write-dashboard-status.ps1`, `rotate-gate-phrase.mjs`, `git-guard.ps1`. `update-project-pages.mjs` stamps live version/milestone data from `status/data/*.json` into the homepage cards and project pages (runs in the Pages deploy workflow and locally). The portfolio telemetry collector and the fleet-administration helpers left on 2026-08-26; see `X:\PortfolioOps\scripts`. |
| `DISCORD_WEBHOOK_NAMING.md` | Portfolio-standard naming convention for every project's Discord webhooks (display name format `<identifier> <Role> Bot`, keyed off the `project` field in each `status/data/<Project>.json`). The New Project Template references it; every existing project's webhooks must match it. The five-role table in it is naming vocabulary, not a set of webhooks each project owes, and no handler lists a role it has not provisioned (2026-08-26). |
| `docs/` | THIS project's own audit findings, and nothing else. `CANONICAL_AUDIT-YAE-YYYY-MM-DD.md` (the project infix is what `.gitignore`'s `*AUDIT-*-20*.md` catches, so the shape matters) and `HANDLER_AUDIT-YYYY-MM-DD.md`. Every file here is gitignored and local-only. Portfolio-wide reports stopped landing here on 2026-08-26: the CONSTELLATION bar-raise reports, `ROUTINE_HEALTH.md`, the usage and cost audits, and `BAR_RAISE_ROADMAP.md` all moved to `X:\PortfolioOps\docs`, along with their writers. A cross-project report written here would be a public artifact; a report about this one project belongs to this project. |
| `status/` | Static status dashboard at `yesandeverything.com/status/`. The `PROJECTS` array in `status/index.html` drives which cards render; each listed project reads `status/data/<project>.json`. **Since 2026-08-19 every file in `status/data/` is a GENERATED projection**: canonical status data lives in the private `X:\PortfolioOps\status\data`, writers write canonical, and `X:\PortfolioOps\scripts\project-status.py` emits the public copies (never edit them directly; the nightly sweep runs the projector in `--check` mode and flags direct writes). `Everything.json` and `constellation.json` are tracked here and deliberately card-less: audits should not flag those TWO as orphaned data files. Skylight and `backlog-trend.json` have canonical files with no public copy, so they cannot be orphaned here; the projector reports the first as withheld by the privacy rule and the second as a canonical-only ops ledger. Counselor has no canonical status file at all, so there is nothing for the projector to withhold. Do not recreate any of them here. |
| `.work-queue.json` | MOVED 2026-08-19 to `X:\PortfolioOps\queue\` (private ops repo). There is no queue writer in this repository and none should be added: `X:\PortfolioOps\queue\queue_write.py` is the only writer that takes the shared lock, and an unlocked write to that file has lost updates before (incident queue-concurrency-race-2026-06-14). A forwarding shim was described here until 2026-08-27 and never existed. Cross-project drain queue. Items get added by audits, processed by `work-queue-runner` skill on the `queue-drain-hourly` scheduled task (cut from hourly to every-3-hours 2026-07-30, since the auto-safe pool was usually empty; `loop-tick-hourly`, which it used to interleave with, was retired the same day. Currently disabled in the live scheduled-tasks registry -- real judgment-tier drain lives in `backlog-burndown-daily`/`-friday`. Verified 2026-08-28: still disabled (last ran 2026-07-31), and re-enabling it would not change anything today -- 0 of the pending items in the live queue carry the auto-safe status the drain step requires, so accepting it as inert rather than re-enabling it is the standing call here, not an oversight). |
| `_skill-review/` | Staged personal `.skill` files (installable) plus their review viewer. |
| `invoices/` | MOVED 2026-08-19 to `X:\PortfolioOps\invoices\`. |

## Publishing the gated design documents

**The documents are not in this repository and must not come back to it.** `/hordes/` and
`/brackish-rising/` are served by `workers/gated-docs`, a Cloudflare Worker on path routes
that take precedence over the Pages origin. It reads each document out of the `GATED_DOCS`
key-value namespace only after a signed session cookie validates, so an unauthenticated
request gets a login form and nothing else.

To republish either document, run that project's own script, exactly as before:

```powershell
X:\HereBeHordes\scripts\publish-gdd.ps1
X:\BrackishRising\scripts\publish-gdd.ps1
```

Those now write into the namespace and read the value back to prove it landed, instead of
splicing base64 into a page here. The deploy workflow fails if either static page reappears.

What this replaced, so nobody rebuilds it: a hand-authored gate page holding the whole
document as base64 with `var PASSWORD` a few lines above it. The phrase was readable in
source, the payload decoded without the phrase, and both were in this public repository's
history. The phrases have been rotated; every phrase those files ever held is disclosed.

## Deploy flow

Direct YaE edits ship through the release script, not raw git. From the repo root:

```powershell
cd X:\YesAndEverything
# edit index.html or per-project page
.\scripts\release.ps1
```

`release.ps1` runs five numbered steps. Step 1 is the dashboard JSON integrity guard (`check-status-json.ps1`), which aborts if a corrupt `status/data/*.json` would ship. Step 2 writes this project's own status JSON and then re-runs that same guard over its output, because checking only before the write let a corrupt file written in Step 2 sail into the push. Step 3 is the project-page prose-staleness guard (`check-page-prose-staleness.mjs`), added 2026-08-24. The version pill on every project page is stamped from that project status JSON, so it is right the moment a release pushes, while the prose underneath is hand-written and nothing updates it: the Scheduler page sat at a v0.7.1 story under a v0.7.3 pill, naming the right number and describing work from two releases earlier, and the pill being automatic is what hid it. Only pages that organise a section by release are in scope, so a page describing the product without naming a version is not dragged in, and a historical mention like "the connector added in v0.13.0" is not treated as a claim to be current. Step 4 pushes through `push-to-github.ps1`. Step 5 posts to the development-log channel. It does NOT clear a git lock, and nothing here should: `Assert-GitSafe` in `scripts/git-guard.ps1` is the only sanctioned lock handling, and it waits out a live git process rather than deleting the lock under one.

Raw git is the escape hatch only. It skips every integrity guard above, so reserve it for one-off recovery when the release script itself is the thing being fixed. Scope it with an explicit pathspec even then: an unscoped commit here sweeps another session's staged work, which is decision D5 and has already happened.

For HBH GDD republishing, do **not** edit this repo directly. Run `X:\HereBeHordes\scripts\publish-gdd.ps1` and it'll push the injection here for you.

## Discord webhooks

**None, and none are owed.** Release notifications are off for this project by Kane's ruling of
2026-06-22; `scripts/discord-notify.ps1` finds no `.discord_webhook.txt` and exits 0 without nagging.
Nothing here posts to Discord and nothing should be wired to.

`scripts/check-discord-webhooks.ps1` audits the whole portfolio's webhooks from here: which URL
files exist per project and which scripts read them, names and caller paths only, never a URL. It
exits non-zero on a caller with no webhook or a webhook with no caller, and it knows about the
two intentional cases (this project is off by ruling; Gnosis builds its topic filenames at
runtime, so no literal search can find those callers).

This repo still owns `DISCORD_WEBHOOK_NAMING.md`, the naming standard every other project follows.
Owning the standard is not a reason to adopt it here. The five-role table in that file is naming
vocabulary for whichever webhooks a project actually has; a handler lists a role only once the
webhook exists on the Discord side AND a script in that repo reads its file (2026-08-26).

## Conventions

- **One file per page** — no shared CSS/JS imports. Every page is self-contained, inline `<style>` + `<script>`. Keeps GitHub Pages happy with zero build config.
- **Dark-mode by default.** Palette pulls from the `:root { --bg, --fg, --accent }` block at the top of `index.html`. Match it across new pages.
- **Mono-font headings, sans body** is the established aesthetic. Don't introduce serif unless you have a reason.
- **No JS frameworks.** Vanilla DOM only. Bundle size is part of the brand.
- **External links open in new tab** with `target="_blank" rel="noopener"`.

## Things that will bite you

- **GitHub Pages caches aggressively.** If a change doesn't appear, hard-refresh first; only debug after that.
- **`CNAME` must contain `yesandeverything.com` exactly.** GitHub regenerates it from the Pages settings; if you `git push` an empty CNAME, the custom domain breaks.
- **Robots.txt disallows `/hordes/`** because the GDD is private. That is politeness to crawlers, not protection: the Worker gate is what protects it now.
- **The design documents are fetched from key-value storage after authentication**, not inlined. They stopped shipping inside the page on 2026-08-25.
- **GDD payload integrity guard is now in place.** v0.61.8 shipped a GDD that lost 70 lines off the tail (FUSE write-truncation on the HBH side) and broke the live tab switcher silently. Both HBH's and Brackish Rising's `publish-gdd.ps1` now run a `Test-GddIntegrity` guard asserting the source GDD ends with `</html>` before injection, so this class of failure is caught before the document reaches the `GATED_DOCS` key-value namespace that `workers/gated-docs/` serves from. Memory entry: gdd_truncation_guard.
- **DNS and registrar on Cloudflare** for `yesandeverything.com` since 2026-05-06. The registrar transfer from Squarespace completed in May 2026; both DNS and registrar now sit on Cloudflare.

## When in doubt

1. `DEPLOY.md` has the one-time setup notes — anything DNS or Pages-config-related is documented there.
2. For the two gated design documents, work flows from each project's own repo (`X:\HereBeHordes\scripts\publish-gdd.ps1`, `X:\BrackishRising\scripts\publish-gdd.ps1`), never the other way — see "Publishing the gated design documents" above.
3. For per-project page content, mirror what the project's own canonical doc says (GDD for HBH, DESIGN.md for Scheduler). Don't fabricate.

## Hard-won hazards

These are bug patterns that have eaten 5+ patch cycles each on Nick's projects. Apply preemptively.

### Two-failed-fix rule

After two failed fix attempts on the same symptom, stop shipping fixes. Add instrumentation. Trace code paths. Speculation past attempt two costs more than diagnosis would. That IS the full rule; memory `debugging-discipline` carries the history.

### Parallel implementations

YaE has at least three fork points for the same content. The hand-authored landing pages in `index.html` + per-project sub-pages. The `workers/gated-docs/` Worker that serves the two design documents from the `GATED_DOCS` key-value namespace after a signed session cookie validates. The `apothecary/` mirror copied from `X:\YesAndApothecary` via that repo's `scripts/release.ps1`. A "page content is wrong" bug could be in any of three places. Identify which generator owns the page before editing the HTML directly. Memory `parallel-implementation-trap`.

### FUSE Edit-tool truncation

The Edit tool truncates files mid-write on this mount with non-trivial frequency. v0.74.30 GDD shipped without `</html>`. For `index.html` and `apothecary/*`, prefer Python atomic-write-with-readback (canonical implementation: `X:\YesAndChains\tools\safe_write.py`). Tail-check every touched file before declaring done. Memory `htbh-fuse-edit-tool-truncation`.

### Check the product, never the producer

The build dashboard froze on the previous day's payload for most of 2026-08-24 and every existing check stayed green. The collector routine ran on time, `dashboard/data/usage.json` was fresh to the minute, and the routine watchdog passed its artifact-freshness sweep. The publish to Cloudflare key-value storage had been failing since 02:19 with `2>&1 | Out-Null` eating wrangler's error text, and the script exited 0 anyway, so three ticks in a row reported success while nothing reached the page.

Two rules came out of it, and they generalize past this repo:

- **A publish that fails is a failure.** Never let a publish, deploy or upload step print a warning and exit 0. `collect-usage.ps1` now retries the key-value put three times, then reads back the live endpoint and confirms it is serving the stamp just written, and exits non-zero if it is not, including under `-NoPush` (which is how the every-4-hours routine calls it).
- **Freshness is measured at the endpoint a visitor reads.** `scripts/check-dashboard-live.ps1` hits `usage.yesandeverything.com` and fails when the payload is older than 5.5 hours, when its newest day is older than yesterday, or when the statuses bundle thins out. The daily `routine-health-watch` runs it. An mtime check on the local file is not a substitute: that file being fresh is exactly the condition that hid this outage.

The related history: the collector did not run at all from 2026-08-05 to 2026-08-12, and by the time it resumed on 08-13 the local session transcripts for 08-05 and 08-06 had passed their roughly eight-day retention window and been deleted, so those two days of token history are gone permanently. Local transcripts are the only source, retention is short, and a collector outage longer than a week is unrecoverable data loss rather than a delay.

### Cross-project consistency

Cross-project rules live in `X:\ARCHITECTURE.md`, `X:\HAZARDS.md` and `X:\DECISIONS.md` (the two old governance docs retired to `X:\_archive-2026-08-17\` on 2026-08-17 and no longer sit at this root). Per-project CLAUDE.md files inherit from that root layer and add project-local hazards. When updating a cross-project rule, update the root layer first, then propagate to the per-project handlers.


## Turn-ending behavior

End every turn in a completed ("done") state, not an input-requested state. The session's yellow "needs input" indicator fires whenever a turn ends by soliciting the user; the blue "done" indicator fires when a turn ends on a finished task. Default to finishing and stopping.

- Do not close messages with optional offers or courtesy questions ("Want me to...?", "Should I...?", "Let me know if..."). They force the needs-input state when nothing is actually required.
- When a next step is obvious and low-risk, just do it instead of asking.
- When there are genuinely optional follow-ups, state them as available options in a plain declarative sentence -- never phrase them as a question directed at the user.
- Only end a turn awaiting input when the user's answer genuinely determines what you do next -- a real fork you cannot resolve yourself. Then ask one direct question and stop.
- Never end with a question solely to be polite or to prompt continuation.