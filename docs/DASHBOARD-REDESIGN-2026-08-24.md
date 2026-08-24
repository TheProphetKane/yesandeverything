# Dashboard redesign proposal

**Date:** 2026-08-24
**Target:** `dashboard/index.html` (the gated portfolio dashboard)
**Status:** built and verified 2026-08-24, see section 7 for what shipped against what was proposed

Read against the live page, the eleven per-project status files in `status/data/`, the
constellation rollup, the live data worker feeds, and `scripts/collect-usage.ps1`.

The page is roughly seventy percent token and cost telemetry and thirty percent project
health, but every decision it drives is a health decision. Nothing below removes a number.
The work is re-weighting, surfacing what is already collected, and collapsing six
overlapping work buckets into three.

---

## 1. Things on the page that are dead or wrong

| # | Finding | Evidence |
|---|---|---|
| 1 | **Queued is dead everywhere.** The live feed at `usage.yesandeverything.com/queue.json` answers `{"private":true,"note":"queue data moved off public surfaces 2026-08-19"}`. The queued chip therefore never renders, the Queued tab reads "nothing queued", and the deferred count silently lost its work-queue half. The page says none of this. | live fetch 2026-08-24 |
| 2 | **Two of the fourteen wheel slots can never hold data.** Counselor and Skylight sit in the dashboard's project list, but the collector puts both in `$PUBLIC_EXCLUDE` alongside SignalRD, so they are stripped from every public payload. They render as permanent zeroes in the donut legend, on the wheel, and in the strip. | `collect-usage.ps1:864` |
| 3 | **Two real token streams have no card.** Architecture (81 dollars lifetime, active today) and Lexi (299 dollars lifetime, retired) land in the "not charted" apology line under the strip instead of a slot. | live page footer line |
| 4 | **The verdict chip has stopped discriminating.** Ten of eleven projects read `needs-attention`; one reads `in-progress`. Health, which spreads 52 to 73, is doing all the work and is shown only as a number inside one gauge. | status files |
| 5 | **Everything ships a commit hash where a version goes.** The pill and the ticker read `v0b86ba61`. | `status/data/Everything.json` |
| 6 | **Gnosis has no `lastReleaseAt`.** No push pulse gauge, no ticker row, for the single largest consumer in the portfolio (15.7 billion tokens, 14,025 dollars, about forty-four percent of lifetime spend). | `status/data/Gnosis.json` |
| 7 | **The queued list was truncated silently.** `itemsTruncated` is written by the collector (390 of 450 rows dropped in the last local build) and the dashboard never reads it, so a capped list looked complete. | `collect-usage.ps1:1077` |

## 2. Tracked, collected, and never shown

Everything in this table already exists in data the page fetches. None of it needs a new
collector pass except where noted.

| Field | What it answers | Current value |
|---|---|---|
| `audit.findings` (critical/high/medium/low) and `audit.latestReportPath` | the nightly canonical audit, running on all eleven projects | 0 critical, 1 high (Ring), 1 medium, 4 low |
| `barRaise.actionsClosed` | throughput, the other half of the open count | 175 closed against 530 open; Budget closed 66 against 63 open, Cattery closed 1 against 24 |
| `barRaise.openFindings[].firstSeen` and `.runsOpen` | how old the rot is | oldest finding 51 days (Budget, Chains); one Chains finding has survived 26 consecutive review runs |
| `barRaise.lensScores` | which of the twelve core lenses and up to twenty-one domain lenses is failing | Chains carries 33 lens scores, low is `discord-notify-wiring` at 27 |
| `barRaise.tensionsOpen` | lens conflicts and how long they have stood | 64 open across the portfolio; Chains has security against solo-tool-ux for 28 runs |
| `constellation.json` in full | portfolio health 63, verdict, the weekly summary prose, three top actions, at-risk projects, 564 open, 172 closed since the previous rollup | fetchable at `../status/data/constellation.json`, never requested |
| `queue.waiting` | items blocked on Kane, the only bucket he alone can clear | 74 in the last local build, currently behind the private feed |
| `stale` | which project's data has gone quiet | Apothecary and Budget both true right now |
| `tags` | which domain lenses a project attracts (payments, cloud-edge, PWA, orchestration) | present on ten projects |
| `liveUrl` | the running site, next to the repo arrow | present on three |
| `tunnel` (Scheduler) and `auth` (Agents) | live service heartbeat and credential probe | Agents `auth.ok` true, checked 2026-08-24 |

There is also one structural gap: **no health metric has a time series.** Tokens and cost
get thirty days of curve; open findings, health, and completion get a single current value.
The collector already references a `backlog-trend.json` that does not exist. Writing one
daily row per project (open, closed, health, completion, gates) into
`status/data/health-trend.json` would let the wave chart carry health the same way it
carries tokens, and is the highest-value addition on this page.

## 3. Consolidation: six buckets down to three

Today there are six top-level buckets, shown twice (as chips on the spotlight card and as
tabs in the lists overlay): Milestones, Open actions, Queued, Backlog, Items left, Deferred.
Inside `itemsLeft` the status file separately carries `open`, `queue`, `backlog`, and
`gates`, which partly restate the same four. The comments in the source show this has
already been fought over once: items left used to fold in queued and backlog, and was split
apart so nothing double-counted. The split fixed the arithmetic and left six things to read.

They answer three questions, not six:

**To done.** Completion percent, the active milestone, and the gates from
`.project-context.json`. Owner: Kane's anchor. Nothing else belongs here.

**Found.** Bar-raise open actions plus nightly audit findings, ranked by severity then age,
with closed shown next to open so throughput is visible. Parked items become a subrow
inside this bucket, labelled with the reason, not a seventh top-level number.

**Queued.** Work-queue pending plus backlog rows, with **waiting on Kane** split out as its
own line because it is the only number he can personally move. Deferred work-queue items go
in a subrow here, same treatment as parked findings.

So `deferred` stops being a first-class chip and becomes a modifier: "58 open, 12 parked".
Six chips become three, and each one has exactly one owner and one source.

## 4. Layout

Current vertical order: header, ticker, eight totals, donut and radar, wheel spotlight,
dots, strip, footer. Every health signal is crammed into chips at the bottom of the
spotlight card, below the fold on most screens.

**a. New portfolio band under the header.** Built entirely from `constellation.json`:
portfolio health, verdict, open against closed since the last rollup, at-risk projects as
chips, and the three `topActions` as one-line rows with severity colour. That band is the
"what do I do today" answer and right now it exists only inside a markdown report.

**b. Totals become two rows of four, not one row of eight.** Row one keeps the money and
token cells exactly as they are. Row two is new: portfolio health, net finding change over
seven days, oldest open finding in days, and projects flagged stale. Nothing is dropped.

**c. Radar gets a second ring.** Keep the completion polygon, overlay a bar-raise health
polygon. Where the two diverge you see the real story at a glance: Agents, Apothecary, and
Budget all sit at one hundred percent complete with health of 66, 73, and 60.

**d. Third panel: the lens grid.** Twelve core lenses across eleven projects as a coloured
grid, with the domain lenses reachable by clicking a project. This is the densest unshown
data in the whole system and it currently lives only in report markdown. Clicking a cell
opens the findings for that lens.

**e. Spotlight card additions.** Audit findings chip, stale badge, live-site link beside the
repo arrow, tag row, `actionsClosed` printed next to `actionsOpen`, oldest-finding age, and
the Scheduler tunnel and Agents credential chips where those fields exist.

**f. Lists overlay: three tabs matching the three buckets.** Each finding row carries
severity, lens, age in days, and consecutive runs open. Sort by severity then age. Print
the truncation note when `itemsTruncated` is above zero.

**g. Fourth wave view.** `flow`, `cost`, `cache`, and a new `health` view once the trend
feed exists, charting open findings and health per project over thirty days.

## 5. Queue decision, needed before the queued surfaces can be rebuilt

The queue feed went private on 2026-08-19 and the dashboard surfaces for it were left in
place, reading empty. Two coherent options:

1. **Counts-only feed.** Republish `queue.json` with `queued`, `waiting`, `deferred` per
   project plus `generatedAt`, and no `items` array. Titles and prompts stay private. This
   restores three numbers and the waiting-on-Kane bucket with nothing leaked.
2. **Strip the surfaces.** Remove the queued chip, the Queued tab, and the queue half of
   the deferred count, and say on the page that queue data is private.

Option one is recommended. The counts were the useful part and they carry no content.

## 6. Suggested order of work

1. Fix the dead things: project roster (drop Counselor and Skylight, add Architecture,
   decide on Lexi), Everything's version field, Gnosis's release stamp, truncation note.
2. Wire what already exists and needs no new data: constellation band, audit findings,
   closed counts, finding age, stale badge, live links, tags, dual-ring radar.
3. Consolidate the six buckets into three across chips and the lists overlay.
4. Rule on the queue feed, then rebuild or remove the queued surfaces accordingly.
5. Add the health trend feed to the collector, then the fourth wave view.

---

## 7. What shipped, 2026-08-24

Built against a local copy of the site on port 4520, checked in the browser with no console
errors at 1600 wide and at 375 wide with no horizontal overflow.

**Roster.** Counselor and Skylight are out of the project list and into a `PRIVATE_IDS`
constant, so the two slots that could never hold a number are gone from the wheel, the
strip, the donut legend and the radar. Architecture is registered and now has a card of its
own. Lexi is registered as retired with its stand-down date: its lifetime tokens still count
in the all-time totals, but it takes no slot. The footnote under the strip stopped reading
as an apology and now names three separate things: what is genuinely uncharted, what is
retired, and what is private on purpose.

**Portfolio band.** A new panel between the ticker and the totals, built from
`constellation.json`, which the page had never fetched. Portfolio health and verdict, open
against closed since the previous rollup, the three ranked top actions as clickable rows
that jump the wheel to that project, the at-risk and stalled lists as chips (folded from
their short codes to the canonical project word), and the full weekly summary behind one
click.

**Totals.** Eight cells became twelve. Row one is the token and cost cells, untouched. Row
two is portfolio health, findings closed, oldest open finding in days, and nightly audit
findings, each colour-coded and each opening the detail behind it. The health cells double
up only on the full eight-column grid so the two rows line up.

**Radar.** Two rings now: the completion polygon in magenta and a dashed review-health
polygon in cyan. Where they diverge the gap is the story, and three projects currently read
one hundred percent complete against health of 66, 73 and 60.

**Lens grid.** A third side panel: eleven projects against the twelve core lenses as one
hundred and thirty-two coloured cells, none of which had ever been on a screen. Enlarged, it
carries the same grid at readable size, every project domain lenses worst-first, and the
open tensions with how many runs each has stood.

**Spotlight card.** Added an oldest-finding gauge and, on the portfolio view, a mean-health
gauge. The name line gained a live-site link (the `liveUrl` field had been in the contract
and never linked) and a stale badge. Closed counts print beside open counts. Tags render as
their own row because they decide which domain lenses a project attracts. The Scheduler
tunnel heartbeat and the Agents credential probe finally have somewhere to land.

**Consolidation.** Six buckets became three, in the chips and in the lists overlay, with the
same vocabulary in both: **to done**, **found**, **queued**. Milestones folded into To done
next to the completion gates. The nightly audit folded into Found next to the review
findings, and every finding row now carries its age in days and how many consecutive review
runs it has survived. Backlog and waiting-on-Kane folded into Queued. Deferred stopped being
a top-level bucket and became a parked subrow inside whichever bucket owns it. Old tab names
still resolve through a legacy map, so nothing that linked to `actions` or `items` broke.

**Queue.** The feed has answered private since 2026-08-19 and the surfaces were reading as a
silent zero. They now say so in words, on the Queued tab and in the chip, and the local copy
under `dashboard/data/` is used as a fallback so the dashboard served from the working tree
still lists every row. Republishing a counts-only feed is still the better end state and is
still Kane's call: the privacy decision is written into `.gitignore` and points at
`X:\DECISIONS.md`, so it gets superseded there or not at all.

**Health trend.** `collect-usage.ps1` now writes `dashboard/data/health-trend.json`, one row
per project per calendar day, holding review health, open and closed findings, completion,
gates, backlog, oldest open finding and audit count. Numbers only, nothing that is not
already published in each project status file. Today rewrites in place, the ledger keeps a
rolling ninety days. On the back of it the wave chart gained a fourth view, `health`, which
charts open findings above the midline and review health below it on the same geometry as
the token wave, and the donut charts open findings by project under that view instead of
tokens. The ledger starts today, so the chart reads one day of history and fills in from
here.

**One bug found and fixed on the way.** The enrichment pass at the bottom of the page
queried `.stale-badge` unscoped and removed the first match whenever collector data was
fresh. With a per-project stale badge now on the spotlight card, a healthy collector would
have deleted the project badge instead of its own. The collector badge carries its own class
now.

### Left open

- **Everything ships a commit hash as its version** (`v0b86ba61`), so the pill and the
  ticker read as garbage for that one project. The writer is this repo's
  `scripts/write-dashboard-status.ps1` and the fix is a real decision about what that
  project versions against, not a display patch.
- **Gnosis publishes no `lastReleaseAt`**, so the biggest consumer in the portfolio has no
  push pulse and no ticker row. That field is written from the Gnosis repo, which is out of
  scope for a session working in this one.
