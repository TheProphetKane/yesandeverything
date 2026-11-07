# Handler annex

Standing rules and reference blocks moved out of `CLAUDE.md` on 2026-09-06 so the handler stays
under the 20-kilobyte cap `X:\verify.py` enforces (a handler is delivered whole into every
session under its project). Everything here binds exactly as if it were still written in the
handler; the handler keeps a one-line pointer where each block stood. Move a block back only
by moving it, never by copying it, so one owner holds each fact.

## Files at a glance (moved from CLAUDE.md, 2026-09-06)

| Path | Purpose |
|---|---|
| `index.html` | The site itself. Single self-contained file. Lists projects with descriptions. |
| `404.html` | Fallback for unknown paths. |
| `CNAME` | Custom-domain pointer for GitHub Pages: `yesandeverything.com`. |
| `robots.txt` | Allows crawlers on root, disallows `/hordes/`, `/brackish-rising/`, `/work/`, `/dashboard/`, `/dashboard-api/`, `/sitemap/`, `/status/`, `/docs/`, `/_skill-review/`. **Two of those are deliberately linked from the homepage** (`/status/` plus `/dashboard/`, in the work section as well as the closing paragraph), which is not a contradiction to be fixed: the stance is humans welcome, search engines no. Disallow keeps them out of results; it was never access control. For `/dashboard/` the client-side password gate protects the rendered page at `dashboard/index.html`, but not the JSON it reads: `dashboard/data/*.json` are plain files in the Pages-served tree, so every one of them answers 200 to a direct unauthenticated fetch regardless of whether the gate was ever passed (confirmed live 2026-08-28). The gate is a UX speed bump on the page, not access control on the data. A 2026-07-28 review read the link-plus-disallow pair as a defect, so it is written down here rather than re-found. |
| `dashboard-api/` | Small Cloudflare Worker (`worker.js` + `wrangler.toml`, git-tracked, landed 2026-06-24) backing the usage dashboard. The one server-side piece in an otherwise static repo; deployed separately by wrangler, not by GitHub Pages. **Exposure:** on the private list in `scripts/stage-site.mjs`, so the site has not served it since 2026-10-23, but the GitHub repository is public and the source is readable there. `wrangler.toml` should hold no secrets (those live in the Cloudflare dashboard). |
| `.nojekyll` | Real 0-byte file at the repo root, left from the branch-deploy builder, where it told Pages to skip Jekyll. The Actions artifact never runs Jekyll, so it does nothing now and sits on the private list. |
| `workers/gated-docs/` | The server-side gate for the two private design documents, at `/hordes/` and `/brackish-rising/`. Cloudflare Worker on path routes, deployed by wrangler rather than by Pages. **This replaced two static pages here that carried the whole document as base64 with the access phrase in cleartext** (2026-08-25). Those withheld nothing: the payload decoded without the phrase, and this repository is public. The documents now live in the `GATED_DOCS` key-value namespace, written by each project's `publish-gdd.ps1`, and are read only after a signed session cookie validates. Access phrases are Worker secrets, listed in `X:\.secrets\YesAndEverything\gated-docs-access.txt`. The Worker source is safe to be public: it holds no phrase and no payload. |
| `workers/coiled-guardian/` | Shipped 2026-08-27. The server-side gate for a private page set at `/coiledguardian`. Same shape as `workers/gated-docs/`, with one difference: that Worker serves one document per prefix, this one serves many pages under a single prefix, so the page is resolved from the rest of the path *after* the session cookie validates rather than before it, so an unknown page under a valid session 404s instead of hinting that something is there. Page bodies live in the same `GATED_DOCS` key-value namespace under `cg:`-prefixed keys (so the two gates never collide), written by the owning project's own publish step. **The page bodies are not in this repository and must not come back to it**, the same standing rule as the two design documents. The Worker source is safe to be public: it holds no phrase and no page. What the pages are, where they are written and why they are private is that project's business and is recorded there, not here (compliance-data-steward-03, 2026-09-23). |
| `workers/family-votes/` | The family vote behind `/thanksgiving-2026/`: a thumbs up or down per listing, one record per device id, kept in a SQLite-backed Durable Object (`VoteBox`). Route `/thanksgiving-2026/api/*`; no secrets. Abuse bounds: 200-voter cap and 12 new device ids per address per hour (per-address counter in the same Durable Object, keyed on `CF-Connecting-IP`, answers 429 with `Retry-After`). `/thanksgiving-2026/api/version` reports the build, the git short hash that `deploy.ps1` passes as `BUILD_HASH`. Since 2026-11-03 it also keeps the house plan's shared state in a third Durable Object, `PlanState`, on the route `/house-plan/api/*`: per job card, a Needed or Wanted switch and a Done box, each change logged with the name typed and the time. Ship through `workers/family-votes/deploy.ps1` (self-test, deploy, live check). |
| `projects/here-there-be-hordes/gdd.html` | Dead-weight legacy file from pre-v0.26.18 publish flow. Now a meta-refresh stub that redirects to `/projects/here-be-hordes/design.html` so any old bookmark still lands on a gated page. It used to point at `/hordes/`, which made it a public link into a robots-disallowed path. Folder path kept (not renamed) because no live link on the site references it; the redirect just covers external bookmarks. |
| `projects/scheduler/{index,design}.html` | Scheduler project landing + design preview. |
| `projects/{apothecary,brackish-rising,budget,cattery,chains,gnosis,here-be-hordes,ring}/` | Per-project Details + Design pages (`index.html` + `design.html` each; design pages are client-gated). `projects/budget/` also carries `pre-install`, `privacy`, `security`, and `security-notices` sub-pages, plus a nested `security/pgp-key` page. Every PUBLIC project gets a homepage card (alphabetical by project word) with Details / Design / Launch buttons plus this page pair. Version/milestone values carry `<!--live:...-->` markers stamped by `scripts/update-project-pages.mjs` (run in the Pages deploy workflow), so a project release refreshes the deployed pages via its status JSON push. Agents is deliberately absent from the homepage grid (2026-07-06, still current) but is tracked on the robots-gated dashboard and status tier (restored 2026-07-08), so don't add an Agents card without Kane's explicit ask. The two private projects (see the private handler list) are never listed. |
| `apothecary/` | Celtic apothecary label designer, a multi-file ES-module app, deployed by mirroring from `X:\YesAndApothecary` via that repo's `scripts/release.ps1` (which calls `scripts/deploy-to-yae.ps1` then commits + pushes this side). Multi-file by design; the "one file per page" convention does not apply to this subdir (it's a project mirror, the one place in this repo where that's expected). Do not edit files in `apothecary/` directly; edit in the source repo and run release. |
| `budget/` | Budget project landing page. Single self-contained file; project mirror. |
| `terms/` | Terms / legal page. Single self-contained file. |
| `dashboard/` | Private portfolio dashboard (robots-gated). Reads `dashboard/data/usage.json` (tokens, cost), `dashboard/data/health-trend.json` (one row per project per day: review health, open and closed findings, completion, gates, backlog, oldest open finding, audit count, written by `collect-usage.ps1`, rolling 90 days), the live worker feeds, every `status/data/<Project>.json`, and `status/data/constellation.json` for the portfolio band. Reworked 2026-08-24, see `X:\PortfolioOps\docs\DASHBOARD-REDESIGN-2026-08-24.md`. |
| `sitemap/` | Private site map page (robots-gated). |
| `work/` | Private work page (robots-gated). |
| `house-search/` | Kane's house hunt, unlisted (noindex, robots-disallowed): a list page and one buyer report per house, all generated by `scripts/build-house-search.py` from `data/house-search.json`, the one source. Never edit the pages by hand. `scripts/house-search-scan.py` is the twice-daily check (the `house-search-sync` routine, 05:44 and 17:44): it reads the MLS feed through Realtor.com and Redfin, brings prices and statuses current, and keeps `data/house-search-seen.json` (the ledger of every listing that matched, with the decision on it) and `data/house-search-drafts.json` (filled-in drafts for new houses). The rules are the House search section of `CLAUDE.md` (2026-10-27). |
| `DEPLOY.md` | Pointer to the deploy workflow, the release script and the pull helper. |
| `scripts/` | Only what makes a deploy of this site correct. `release.ps1` runs the integrity guards, then commits, pushes, then calls `discord-notify.ps1`, which exits early because this project has no webhook by Kane's ruling of 2026-06-22. `push-to-github.ps1`, `check-status-json.ps1`, `check-page-prose-staleness.mjs`, `check-dashboard-live.ps1`, `write-dashboard-status.ps1`, `rotate-gate-phrase.mjs`, `git-guard.ps1`. `update-project-pages.mjs` stamps live version/milestone data from `status/data/*.json` into the homepage cards plus the project pages (runs in the Pages deploy workflow, locally too). The portfolio telemetry collector and the fleet-administration helpers left on 2026-08-26; see `X:\PortfolioOps\scripts`. `check-secret-exposure.ps1` scans anything another project pushes into this public repo for secret-shaped strings. `sync-claude-desktop-config.mjs` pushes the tracked tool-server list into the live Claude Desktop config. |
| `DISCORD_WEBHOOK_NAMING.md` | Portfolio-standard naming convention for every project's Discord webhooks (display name format `<identifier> <Role> Bot`, keyed off the `project` field in each `status/data/<Project>.json`). The New Project Template references it; every existing project's webhooks must match it. The five-role table in it is naming vocabulary, not a set of webhooks each project owes, and no handler lists a role it has not provisioned (2026-08-26). |
| `docs/` | Only THIS project's own audit findings. `CANONICAL_AUDIT-YAE-YYYY-MM-DD.md` (the project infix is what `.gitignore`'s `*AUDIT-*-20*.md` catches, so the shape matters) and `HANDLER_AUDIT-YYYY-MM-DD.md`. Every file here is gitignored and local-only. Portfolio-wide reports stopped landing here on 2026-08-26: the CONSTELLATION bar-raise reports, `ROUTINE_HEALTH.md`, the usage audits, the cost audits, `BAR_RAISE_ROADMAP.md`, all moved to `X:\PortfolioOps\docs` with their writers. A cross-project report written here would be a public artifact; a report about this one project belongs to this project. |
| `status/` | Static status dashboard at `yesandeverything.com/status/`. The `PROJECTS` array in `status/index.html` drives which cards render; each listed project reads `status/data/<project>.json`. **Since 2026-08-19 every file in `status/data/` is a GENERATED projection**: canonical status data lives in the private `X:\PortfolioOps\status\data`, writers write canonical, then `X:\PortfolioOps\scripts\project-status.py` emits the public copies (never edit them directly; the nightly sweep runs the projector in `--check` mode, which flags direct writes). `Everything.json` and `constellation.json` are tracked here and deliberately card-less: audits should not flag those TWO as orphaned data files. Skylight and `backlog-trend.json` have canonical files with no public copy, so they cannot be orphaned here; the projector reports the first as withheld by the privacy rule and the second as a canonical-only ops ledger. The second private project has no canonical status file at all, so there is nothing for the projector to withhold. Do not recreate any of them here. |
| `.work-queue.json` | MOVED 2026-08-19 to `X:\PortfolioOps\queue\` (private ops repo). There is no queue writer in this repository and none should be added: `X:\PortfolioOps\queue\queue_write.py` is the only writer that takes the shared lock, and an unlocked write to that file has lost updates before (incident queue-concurrency-race-2026-06-14). A forwarding shim was described here until 2026-08-27 and never existed. Cross-project drain queue. Items get added by audits, processed by `work-queue-runner` skill on the `queue-drain-hourly` scheduled task (cut from hourly to every-3-hours 2026-07-30, since the auto-safe pool was usually empty; `loop-tick-hourly`, which it used to interleave with, was retired the same day. Currently disabled in the live scheduled-tasks registry, real judgment-tier drain lives in `backlog-burndown-daily`/`-friday`. Verified 2026-08-28: still disabled (last ran 2026-07-31), and re-enabling it would not change anything today, 0 of the pending items in the live queue carry the auto-safe status the drain step requires, so accepting it as inert rather than re-enabling it is the standing call here, not an oversight). |
| `_skill-review/` | Staged personal `.skill` files (installable) plus their review viewer. |
| `invoices/` | MOVED 2026-08-19 to `X:\PortfolioOps\invoices\`. |

## House search (Kane, 2026-10-27)

Moved here from `CLAUDE.md` on 2026-10-27 to keep the handler under its size cap; it binds as if written there.

`/house-search/` is Kane's house hunt: houses under $335,000 within a 20-minute drive of the
children's daycare, each with a full buyer report. The page is unlisted (noindex, robots
disallowed) and withholds the daycare's exact location (the page names its town, nothing finer);
private prior owners stay unnamed, companies may be named. The pieces:

- `data/house-search.json` is the one source: criteria, the search note, the change list, the
  watch list, and one entry per house. Every house carries three answers or the build refuses
  it: `mainFloorBeds`, `basement` (finished, none, unfinished, split, unsure) and `fence`.
- `python scripts/build-house-search.py` writes `house-search/index.html` and one report page per
  house. Edit the data, build, ship; never edit the pages by hand.
- The Want to view and No marks are votes, one per person per house, kept by the family-votes
  Worker (`workers/family-votes`, its `HouseMarks` Durable Object, on the route
  `yesandeverything.com/house-search/api/*`) at `/house-search/api/marks`. The page asks for a
  first name the first time someone votes on a phone or laptop, and the vote is kept under that
  name, so the same name on two devices is one person and one person's tap never undoes
  another's. A GET returns `{votes: {slug: {voter: {mark, name, at}}}, marks, at, log}`: `marks`
  is the one-word summary older pages and the live checks read (view while anyone has ticked
  it), and `log` is the newest 40 changes with who made each, which the list page shows as
  Recent votes. A POST of `{slug, mark, name, set}` sets or clears that person's vote; `set` is
  the tap time, and a tap older than that person's stored one is answered `stale` and ignored,
  so a tap that waited offline cannot undo a newer one. Each browser keeps the last answer and
  its own unsent taps in local storage. The Worker ships with `workers\family-votes\deploy.ps1`
  (self-test, `wrangler deploy`, a live read of both routes), apart from the Pages release; the
  self-test also runs as step 2.5 of the release.
- Why votes are per person (2026-10-31): from 2026-10-28 to 2026-10-31 a house held one shared
  mark and the last tap won, with no record of who changed what. Kane found ticks he had set
  missing from Want to view, and nothing on the server could say who cleared them. The three
  marks left on 2026-10-31 carried over as unnamed votes, shown as "a mark from before names",
  each claimed by the first person who sets the same mark under a name; a different mark sits
  beside one and never removes it. The single-mark records are kept under `bak:m:<slug>`.
- A house that goes under contract or leaves the market is never dropped from the page. The scan
  writes `state` (active, contingent, pending, gone) and `stateSince` on each house; the list
  page moves it to "Under contract or off the market" with a dated tag, a tick keeps it in Want
  to view with the same tag, and its report opens on a banner saying so. A watch-list house that
  drops off the watch list gets a line in What changed saying where it went.
- `leftOut` in `data/house-search.json` lists houses someone sent or asked about (the realtor's
  picks) that were checked and left off, each with the reason, shown as "Checked and left out".
- The realtor keeps a saved-search list for the family on Home Platform (the collection "Nick and
  Lexi home search"), behind Kane's Google sign-in, so the unattended check cannot read it; a
  session reads it through Kane's own Chrome. A house on that list carries `realtor: true` and
  shows the tag On the realtor's list; one that fails goes in `leftOut` with the reason. First
  read 2026-10-31: 16 houses, 8 on the page and 8 left out.
- The scan applies no size floor (2026-10-31). The 1,600 square foot minimum carried over from
  the first Zillow search hid every ranch whose listed size leaves out the basement, cut the MLS
  read from 310 listings to 135, and missed 524 Prairie Creek Ct, which the realtor sent; dropping
  it raised 15 houses the same day. It also reads the must-haves for a borderline drive, for a
  house back on the market (9 Pedrotti Ln came back on 2026-10-30 and got no draft), and for a
  candidate left without a draft; it reads "slab foundation" in the listing as no basement,
  "ready for your finishing touches" as unfinished, and a bedroom whose level line says basement
  as off the main floor.
- `python scripts/house-search-scan.py --write --build` is the check: it reads the MLS feed
  through Realtor.com (served by homefinder.com, which carries the same search and detail
  routes without the bot wall) and Redfin's regional feed, routes every new candidate to the
  daycare through the public OSRM router (the daycare's location is read at run time from
  `X:\PortfolioOps\config\house-search.json`, in the private repository, because this one is
  public and the page never names it), reads the MLS detail record for the must-haves,
  brings each tracked house's price and status current with a dated line on its timeline and
  in the page's change list, and writes `data/house-search-seen.json` (the ledger: every
  listing that ever matched, with the decision taken on it, so nothing is raised twice) and
  `data/house-search-drafts.json` (a filled-in draft entry per new house, for a session to
  turn into the report). Without `--write` it is a dry run. Zillow refuses every unattended
  read (bot wall on curl, headless Chrome and the fetch tool); Zillow facts refresh only when a
  session has the Claude in Chrome tools. The county assessor site sits behind a browser
  challenge too, so ownership history is pulled in a browser session, never by the scan.
- The routine `house-search-sync` runs the scan at 05:44 and 17:44 every day as a scheduled
  task in the desktop app, where the Claude in Chrome tools can read Zillow (its prompt is
  `C:\Users\Kane\.claude\scheduled-tasks\house-search-sync\SKILL.md`; a cloud trigger was
  tried on 2026-10-27 and cut the same day on Kane's word, because a cloud-fired session has
  no Chrome; the registration prompt is `X:\PortfolioOps\docs\PROMPT-house-search-sync-chrome.md`,
  in the private repository because it names the daycare), writes the report for
  each new house, and ships with `.\scripts\release.ps1 -Path
  data/house-search.json,data/house-search-seen.json,data/house-search-drafts.json,house-search`
  (one `-Path`, the values comma-separated), after its own commit with a message that
  says what moved. A run where only the checked-at stamps moved ships them too, so the
  last-checked line on the live page stays true; a run where neither feed answered ships
  nothing.
- Drive times for the first nine houses are Google Maps at midday on a Tuesday; a house the
  scan adds carries the OSRM estimate, marked "(est.)", until Google Maps is run. The nine
  measured drives landed within two minutes of the OSRM figure, which is why the 20-minute
  limit is applied to it with a 20-to-23-minute band that waits for a person.

### House search: last-run record, accepted external risks, end condition (2026-10-29)

- Every `--write` run of `scripts/house-search-scan.py` leaves `data/house-search-last-run.json`
  (time, whether it finished, the listing count each feed returned, the errors), including a run
  that exits early because no feed answered. The ledger stamp moves only when a listing changed,
  so it cannot tell a dead feed from a quiet day. `scripts/check-dashboard-live.ps1` goes red when
  the record is older than 48 hours or missing, and notes a last run that failed. The routine
  ships the record only if it is named in its `-Path` list; the local copy is what the check reads.
- Accepted external risks, no mitigation owed: the Redfin regional endpoint is unofficial and can
  change or block without notice, and the OSRM routing server is a public demo service with no
  guarantee. Either failing shows in the last-run record and the page's last-checked line goes stale.
- End condition: when a house is under contract, stop the `house-search-sync` routine, wipe the
  shared marks (the `HouseMarks` storage in `workers/family-votes`), remove `house-search` from
  `scripts/stage-site.mjs`, and delete `house-search/`, `data/house-search*.json` and the two
  `house-search` scripts. Take the house report crumb (`REPORT`) out of
  `scripts/build-house-plan.py` and rebuild in the same change, or the plan's first link goes dead.
  The `/house-search/api/*` route can then drop with the Worker's next deploy; the Worker itself
  stays, because the house plan's `PlanState` lives in it.

### House search: under contract, routine stopped (2026-11-02)

The family went under contract on 45 Autumn Crest Ct on 2026-11-01 at the asking price, $330,000;
the sellers close on their next house on 2026-11-30, so this one closes by then. Kane stops the
`house-search-sync` routine the same day from the desktop app, where the scheduled task lives; a
cloud session cannot reach it. The page stays up until closing. The house carries an `ours` block
(`since`, `note`), and `scripts/build-house-search.py` renders it as the "Our contract" group at the
top of the list, a tag in place of the state tag, and a green banner on the report, whatever state
a feed reports. `data/house-search.json` carries `scanStopped: "2026-11-02"`. The list page states
that date in place of the twice-a-day line, and `scripts/check-dashboard-live.ps1` reads it to note
the last-run age instead of failing on it. The marks route check stays until the votes go at
closing. The rest of the end condition above (wipe the `HouseMarks` storage, drop `house-search`
from `scripts/stage-site.mjs`, delete the page, the data and the two scripts) waits for closing.

### House plan for 45 Autumn Crest Ct (2026-11-02)

`/house-plan/` is the family's plan for the house under contract: the facts known about it, every
step from the inspection through the basement rooms with planned dates, and two estimate columns,
the family's materials and the same job hired out. `/house-plan/basement/` holds the basement
layout Nick chose, drawn to a 1-foot grid (the other two options came off on 2026-11-02 at his word), and `/house-plan/floors/` holds the
main and upper floors in the same colors, with the basement drawing repeated below them. The site shows only these color-coded plans: Nick does not want
traditional floor plans, so the builder's drawing and the gridded sheet made from it came off on
2026-11-03 and stay off. Nick asked for the plan live beside the house search and linked from
it, and the site names him Nick, never by his gamer tag, because the family reads it. The pages call
it the new house and never print its street address (bar-raise compliance-data-steward-01,
2026-11-06); a relative's trade shows only where the plan turns on it, as AJ's does for the permit. The sources are
`docs/HOUSE-PLAN-45-AUTUMN-CREST.md`, `docs/HOUSE-PLAN-BASEMENT-LAYOUTS.md` and `docs/HOUSE-PLAN-FLOORS.md`,
which the prose gate measures; `python scripts/build-house-plan.py` writes all three pages, and `--check`
exits 1 when any is stale. `python scripts/draw-house-floors.py` draws the main and upper floor plans. `python scripts/draw-basement-layouts.py` draws the layout picture from the fixed stair,
rough-in, slider, window and the likely furnace spot. Never edit a page by hand. Since 2026-11-03, at Nick's ask for a plan he can read through, every
plan table carries the columns Job, When, Date, What it takes, Who, Family and Hired, and the builder
turns each row into a card: the mark and a short job name, both prices, the date, then the detail. Each
section closes on its totals, needed, wanted and the two together (his ask of 15:22 that day). The
{{headline}} marker becomes the budget at a glance, and {{summary}} becomes "Everything on one list" at
the bottom: every needed and wanted job by its short name, linked to its card, with one total and no
dates. A cost cell must open on that row's total: the first dollar figure counts, a colon or semicolon
starts the detail, and a figure marked a year, if needed, credit or closing costs is left out of the
totals and listed under the list. The Job cell opens on a mark, **Needed.**, **Wanted.** or **When it
fails.**, by Nick's budget rule of 2026-11-02 (save wherever the result holds up); when-it-fails rows
stay out of every total as a reserve. A cost row with no mark stops the build, and so does a family price
on a row nobody in the family does, since the family column must read as what the family pays. A cell
that opens on a price per unit stops the build too,
and so does a date whose weekday is wrong or whose "Move-in + N days" offset disagrees with the anchor
rows (Contract day, Closing day, Move-in day): move the closing and every derived date must move with it.
The floor plan
sheet beside the plan is a committed copy of the one built in `X:\PortfolioOps\docs`. The Inkarnate
basement map stays off the site by Nick's ruling of 2026-11-02: it is for working out ideas only.
The house report links the plan through `ours.plan` in `data/house-search.json`. Both pages are
unlisted like the search (noindex, robots-disallowed). They are not part of the house search end
condition: when the search retires at closing, `house-plan` stays on the allowlist, and the link
from the report goes with the report.

Every job card carries a Done box, and every Needed or Wanted card a switch between the two, by
Nick's ask of 2026-11-03. The state is shared: the `PlanState` Durable Object in
`workers/family-votes` keeps it on `/house-plan/api/state`, and the page redraws every total from
it, so moving a job moves its money between the needed and wanted figures. A Done box can be
unticked, and the page's Recent changes list names who ticked or moved what and when, under the
first name the house search already asks for (the same `house-search-name` in local storage).
The built page is the plan as written; the shared state only overrides it, keyed by each card's id.
Every job row ends its Job cell on `{#short-name}`, the card's pinned id, so renaming a job keeps its
saved state (pinned on 2026-11-06 at the ids the names gave then, and the build came out byte for
byte the same). The build stops on a row with no pin, a pin used twice, or one past 80 characters,
the Worker's limit. A new row takes a new pin; never change or reuse one the family has used. `PlanState` is not wiped at closing; it goes at the plan's retirement below.

### Retirement: house plan, due 2027-06-02 (2026-11-06)

The plan's last dated job is the play room, lounge and hall, Move-in + 105 to 135 days, which ends
Monday 2027-05-03 on the planned move-in of Saturday 2026-12-19. Thirty days after that, on
2027-06-02:

- remove `house-plan` from the allowlist in `scripts/stage-site.mjs`;
- wipe the `PlanState` storage in `workers/family-votes`, which holds every job's Done and
  Needed or Wanted state with the first names and times in the Recent changes list;
- delete `house-plan/`, the three `docs/HOUSE-PLAN-*.md` sources, `scripts/build-house-plan.py`,
  `scripts/draw-house-floors.py` and `scripts/draw-basement-layouts.py`, or move the page set and
  its sources to a private repository and serve it from there.

The Thanksgiving page goes on 2026-12-15 and the house search at closing, so the house plan is the
Worker's last user: the `family-votes` Worker comes down the same day. If the plan's last date
moves, this date moves with it, to thirty days after the new last date. The bar-raise finding of
2026-11-05 (strategic-kill-this-01) asked for move-in plus thirty days, 2027-01-18, which would take
the page down with six of its jobs still ahead; the date above meets the same end, a page with a
date it comes off, without cutting the plan short.

### Retirement: Thanksgiving 2026 page, due 2026-12-15 (2026-10-29)

The stay runs 22 to 29 November 2026. On 2026-12-15: remove `thanksgiving-2026` from the
allowlist in `scripts/stage-site.mjs`, delete the `thanksgiving-2026/` page, wipe the `VoteBox`
storage in `workers/family-votes` (votes and device ids), and keep the Worker for the house
marks and the house plan. The removal happens on that date; this entry is the instruction. The
Worker stays after the house search ends, since the house plan's state lives in it.

## Hard-won hazards (moved from CLAUDE.md, 2026-11-06)

These are bug patterns that have eaten 5+ patch cycles each on Nick's projects. Apply preemptively.

#### Two-failed-fix rule

After two failed fix attempts on the same symptom, stop shipping fixes. Add instrumentation. Trace code paths. Speculation past attempt two costs more than diagnosis would. That IS the full rule; memory `debugging-discipline` carries the history.

#### Parallel implementations

YaE has at least three fork points for the same content. The hand-authored landing pages in `index.html` + per-project sub-pages. The `workers/gated-docs/` Worker that serves the two design documents from the `GATED_DOCS` key-value namespace after a signed session cookie validates. The `apothecary/` mirror copied from `X:\YesAndApothecary` via that repo's `scripts/release.ps1`. A "page content is wrong" bug could be in any of three places. Identify which generator owns the page before editing the HTML directly. Memory `parallel-implementation-trap`.

#### FUSE Edit-tool truncation

The Edit tool truncates files mid-write on this mount with non-trivial frequency. v0.74.30 GDD shipped without `</html>`. For `index.html` and `apothecary/*`, prefer Python atomic-write-with-readback (canonical implementation: `X:\YesAndChains\tools\safe_write.py`). Tail-check every touched file before declaring done. Memory `htbh-fuse-edit-tool-truncation`.

#### Check the product, never the producer

The build dashboard froze on the previous day's payload for most of 2026-08-24 and every existing check stayed green. The collector routine ran on time, `dashboard/data/usage.json` was fresh to the minute, and the routine watchdog passed its artifact-freshness sweep. The publish to Cloudflare key-value storage had been failing since 02:19 with `2>&1 | Out-Null` eating wrangler's error text, and the script exited 0 anyway, so three ticks in a row reported success while nothing reached the page.

Two rules came out of it, and they generalize past this repo:

- **A publish that fails is a failure.** Never let a publish, deploy or upload step print a warning and exit 0. `X:\PortfolioOps\scripts\collect-usage.ps1` now retries the key-value put three times, then reads back the live endpoint and confirms it is serving the stamp just written, and exits non-zero if it is not, including under `-NoPush` (which is how the every-4-hours routine calls it).
- **Freshness is measured at the endpoint a visitor reads.** `scripts/check-dashboard-live.ps1` hits `usage.yesandeverything.com` and fails when the payload is older than 5.5 hours, when its newest day is older than yesterday, or when the statuses bundle thins out. The daily `routine-health-watch` runs it. An mtime check on the local file is not a substitute: that file being fresh is exactly the condition that hid this outage.

The related history: the collector did not run at all from 2026-08-05 to 2026-08-12, and by the time it resumed on 08-13 the local session transcripts for 08-05 and 08-06 had passed their roughly eight-day retention window and been deleted, so those two days of token history are gone permanently. Local transcripts are the only source, retention is short, and a collector outage longer than a week is unrecoverable data loss rather than a delay.

#### Cross-project consistency

Cross-project rules live in `X:\ARCHITECTURE.md`, `X:\HAZARDS.md` and `X:\DECISIONS.md` (the two old governance docs retired to `X:\_archive-2026-08-17\` on 2026-08-17 and no longer sit at this root). Per-project CLAUDE.md files inherit from that root layer and add project-local hazards. When updating a cross-project rule, update the root layer first, then propagate to the per-project handlers.
