# Claude Primer: YesAndEverything

**Command rule (always):** Any git, push, release, deploy, or script command provided in chat must lead with `cd X:\YesAndEverything` so it never runs against the wrong repo. This repo is `X:\YesAndEverything`. (Cross-project standard; see `X:\CLAUDE.md` (the script standard is in `X:\ARCHITECTURE.md` section 6).)

You are working on **YesAndEverything**, the public-facing static site at <https://yesandeverything.com>. It is a single-page landing page listing Kane's projects, plus per-project sub-pages, plus two design documents served through a server-side gate.

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

- **Files at a glance** is in `docs\HANDLER_ANNEX.md` (moved 2026-09-06); it binds exactly as if it were
  still written here.

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

`release.ps1` runs six numbered steps plus one unnumbered pre-flight check wedged between steps 3 and 4. Step 1 is the dashboard JSON integrity guard (`check-status-json.ps1`), which aborts if a corrupt `status/data/*.json` would ship. Step 2 writes this project's own status JSON and then re-runs that same guard over its output, because checking only before the write let a corrupt file written in Step 2 sail into the push. Step 3 is the project-page prose-staleness guard (`check-page-prose-staleness.mjs`), added 2026-08-24. The version pill on every project page is stamped from that project status JSON, so it is right the moment a release pushes, while the prose underneath is hand-written and nothing updates it: the Scheduler page sat at a v0.7.1 story under a v0.7.3 pill, naming the right number and describing work from two releases earlier, and the pill being automatic is what hid it. Only pages that organise a section by release are in scope, so a page describing the product without naming a version is not dragged in, and a historical mention like "the connector added in v0.13.0" is not treated as a claim to be current. Right after Step 3, an unnumbered pre-flight step runs the prose ratchet (`python X:\prose.py --project YesAndEverything --ratchet --tighten`, see Writing rules below): it aborts the release if a declared prose surface got worse and tightens the floor when the release made it better, and the floor is never raised to get past it. Step 4 re-checks that every `status/data/*.json` here still matches its private canonical projection in `X:\PortfolioOps\status\data` (`project-status.py --check`), closing the gap the nightly sweep's own `--check` run leaves open for up to a day. Step 5 pushes through `push-to-github.ps1`. Step 6 posts to the development-log channel. Nothing in the six steps clears a git lock: `Assert-GitSafe` in `scripts/git-guard.ps1` is the only sanctioned lock handling, and it waits out a live git process rather than deleting the lock under one.

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

- **One file per page**, no shared CSS/JS imports. Every page is self-contained, inline `<style>` + `<script>`. Keeps GitHub Pages happy with zero build config.
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

1. `DEPLOY.md` has the one-time setup notes, and anything DNS or Pages-config-related is documented there.
2. For the two gated design documents, work flows from each project's own repo (`X:\HereBeHordes\scripts\publish-gdd.ps1`, `X:\BrackishRising\scripts\publish-gdd.ps1`), never the other way. See "Publishing the gated design documents" above.
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

## Writing rules (Kane, 2026-09-02)

Prose in this project follows `X:\WRITING.md`, the Coiled Guardian writing rules made
portable on Kane's ask: three or more ands in a sentence never, no em dash, no aphoristic
closer, the verb belonging to whoever does it, the tics and the generated register named and
counted. The measured half is `python X:\prose.py --project YesAndEverything`; the surfaces it reads
are the `prose` block in `.project-context.json`, the floor is `.prose-ratchet.json`, and
the nightly sweep runs the ratchet across every wired project. Run `python X:\prose.py --staged --repo X:\YesAndEverything` before committing prose: a touched
file may keep its old debt and may not add to it. Never raise the floor.
