# YesAndEverything canonical-doc audit — 2026-05-14

## TL;DR

The deploy plumbing (CNAME, robots.txt, .nojekyll, hordes/ base64 gate) is sound and matches CLAUDE.md / DEPLOY.md. The **content** has two real drifts: (1) the auto-publish script writes the wrong version pill onto the Chains project card (it stamps the HTBH version onto Chains because of a first-match regex), leaving the HTBH card stuck at `v0.26.x` while live HTBH is `v0.34.22`; (2) `projects/here-there-be-hordes/gdd.html` is an abandoned tombstone at `v0.26.16` (2026-05-08) — the publish script's own header comment says nothing serves it, but it's still on disk and CLAUDE.md still describes it as a live "GDD preview iframe."

---

## What's aligned (no fix needed)

- **CNAME** — contains exactly `yesandeverything.com`. Matches CLAUDE.md's "must contain `yesandeverything.com` exactly" rule and the custom domain in DEPLOY.md §4.
- **robots.txt** — `Allow: /`, `Disallow: /hordes/`. Matches CLAUDE.md's rule that "/hordes/ is private GDD."
- **.nojekyll** — present at root, matches CLAUDE.md table and DEPLOY.md inventory.
- **404.html** — present, dark-mode, mono font, auto-refreshes to `/`. Matches the "dark-mode by default, mono-font-first" aesthetic.
- **hordes/index.html base64-injection structure** — password gate intact (`var PASSWORD = 'SneakPeak'` on line 98), `var ENCODED = "..."` on line 99 holds the live GDD payload. Most recent commit `cd20f41 docs(htbh): publish GDD v0.34.22` confirms the publish script is hitting the gate page correctly. CLAUDE.md's "Never copy `gdd.html` into `hordes/`" injection rule is being respected.
- **DEPLOY.md** — accurate one-time runbook; the GitHub Pages + DNS setup described matches the live CNAME and the four `185.199.108-111.153` A-record pattern that GitHub Pages requires.
- **File inventory in CLAUDE.md "Files at a glance"** — every listed file exists at the claimed path (`index.html`, `404.html`, `CNAME`, `robots.txt`, `hordes/index.html`, `projects/scheduler/{index,design}.html`, `DEPLOY.md`, `unstick-git.ps1`).
- **Chains description** (index.html line 277-289) — broadly matches `X:\YesAndChains\PROJECT_SPEC.md` and `CONTEXT.md`. Course count (~6,300), TechDisc/UDisc CSV import, PWA + offline, opt-in AI caddy with per-user spend caps, Cloudflare Worker proxy all confirmed in the YaC canonical layer. The "v0.34.x → 1.0" version is wrong (see Drift #1) but the prose is right.
- **Scheduler description** (index.html line 327-337 + `projects/scheduler/index.html`) — matches `X:\YesAndScheduler\docs\DESIGN.md` §1, §2, §3. Aquatics department, Lifeguard + Swim Instructor sub-departments, preference-driven six-week auto-fill, review queue, mobile-first, Cloudflare Workers + D1 + Vite/React/Tailwind + Supabase magic-link. Stack and feature scope all reconcile.
- **Scheduler design.html** — password-gated (`var PASSWORD = 'SeeSchedule'`) base64 mirror of `X:\YesAndScheduler\docs\DESIGN.md`. Same shape as hordes/index.html. Note: CLAUDE.md doesn't document this password, only `SneakPeak` for hordes/.
- **hordes/ is not linked from index.html** — only the HTBH card's "GDD →" anchor (line 318) goes to `hordes/`, matching robots.txt's noindex intent. The orphan `projects/here-there-be-hordes/gdd.html` is also not linked from any page in the site.

---

## Drift found

### 1. The auto-publish script bumps the wrong project's version pill — HIGH severity

`X:\HereThereBeHordes\scripts\publish-gdd.ps1` lines 159-163 use this regex to update the YaE landing page after every GDD publish:

```powershell
$verRe = [regex]::new('v\d+\.\d+\.[0-9x]+')
$idxText = $verRe.Replace($idxText, $newSeries, 1)   # `, 1` = first match only
```

The first `v#.#.x` in `index.html` is on **line 292**, which is the **Chains** project card (`v0.34.x &nbsp;&rarr;&nbsp; 1.0`). The HTBH card's pill on **line 317** (`v0.26.x`) is therefore never reached.

Net result on the live site right now:
- Chains card shows `v0.34.x → 1.0` — **wrong** (YaC is actually at `0.25.2` per `CONTEXT.md` line 9).
- HTBH card shows `v0.26.x` — **wrong** (HTBH is actually at `v0.34.22` per `docs/GDD.html` line 584; commit history confirms 11+ GDD publishes since v0.26.x).

The numbers are essentially swapped: Chains is wearing HTBH's version, and HTBH is wearing the version Chains was at the last time the page was hand-edited.

Git evidence: commit `b033a86 docs(htbh): publish GDD v0.34.0` bumped Chains' pill from `v0.33.x` to `v0.34.x` while leaving the HTBH pill alone. This has been happening for at least 9 publish commits.

### 2. `projects/here-there-be-hordes/gdd.html` is a stale tombstone — MEDIUM severity

The file exists at `X:\YesAndEverything\projects\here-there-be-hordes\gdd.html`, version pill `v0.26.16` dated `2026-05-08`. The HTBH GDD's live version is `v0.34.22` (2026-05-14). Eight minor versions and one Research tab behind.

The publish script's own header comment (`publish-gdd.ps1` lines 7-11) explicitly says:

> v0.26.18: rewrite. The old version wrote to projects/here-there-be-hordes/gdd.html — **a stale file nothing serves**. The actual user-facing URL is /hordes/...

So the file has been abandoned by the publish pipeline for ~6 weeks of GDD publishes but is still on disk and still being served by GitHub Pages (it's reachable at `https://yesandeverything.com/projects/here-there-be-hordes/gdd.html`, just not linked from anywhere).

`CLAUDE.md` line 20 describes it as:

> `projects/here-there-be-hordes/gdd.html` | Public GDD preview iframe (lighter than the full mirror).

Two inaccuracies in that one row: (a) it's not an iframe, it's a full standalone GDD HTML page, and (b) it's not "lighter than the full mirror" — it's the same shape as `docs/GDD.html`, just frozen at v0.26.16.

### 3. HTBH project blurb in `index.html` uses retired pitch language — LOW severity

`index.html` lines 303-313 describe HTBH as:

> A hand-painted grim-dark survival RTS in true 2:1 isometric — pitched as *an industrial nightmare in oil paint*: *They Are Billions*'s gameplay with *Risen Kingdom*'s brush.

The current GDD (`X:\HereThereBeHordes\docs\GDD.html` line 611) gives the one-line pitch as:

> *An industrial nightmare where silence is a currency. Build a colony loud enough to survive but quiet enough to live.*

And the GDD changelog (line 964-965) explicitly notes the §1 + §15 rewrite that **moved away** from execution-anchored framing ("oil-painted", "Risen Kingdom technique + They Are Billions palette") toward mood-anchored framing:

> Pillar 3 reframed from a specific art-execution commitment (oil-painted, painterly) to a mood commitment ... Anchor moved from execution ("Risen Kingdom technique + They Are Billions palette") to mood ("the colony is the only candle in a graveyard").

So the YaE blurb is still using the framing the GDD has deliberately retired. Per `CLAUDE.md` line 63: "For per-project page content, mirror what the project's own canonical doc says." The current blurb doesn't.

### 4. HTBH milestone status overstated — LOW severity

`index.html` line 312-313:

> Currently pre-alpha: M0 (Foundation) closed; M1 (Core Loop Vertical Slice) and M2 (Noise System) in flight.

Per `docs/GDD.html` roadmap tab (line 1692-1740):
- M0 Foundation — `status-done` (matches)
- M1 Core Loop Vertical Slice — `status-in-progress` ("in flight" is accurate)
- M2 Noise System Vertical Slice — `status-todo` (not in flight; only the Stone Wall + Wood Watchtower checklist items inside M2 are pre-shipped)

Calling M2 "in flight" overstates progress.

### 5. Chains version pill on index.html is shaped wrong even after Drift #1 is fixed — LOW severity

The Chains pill renders as `v0.34.x → 1.0` (line 292) — even after fixing the auto-publish script, the static text " → 1.0" is unique to Chains; the publish script doesn't preserve that suffix because its regex only replaces the version literal. Fine in isolation, but worth noting that the script's "patch the first version pill" behavior was originally written assuming a single project card and never adapted when the page grew to three cards.

### 6. CLAUDE.md doesn't mention `PERSONAL_CLAUDE_ARCHITECTURE.md` — INFO

`X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` exists at the repo root (drafted 2026-05-14). It is not listed in CLAUDE.md's "Files at a glance" table. It appears to be a meta-architecture doc not intended for deploy, but it is committed to the repo and therefore deploys to `https://yesandeverything.com/PERSONAL_CLAUDE_ARCHITECTURE.md` whether intended or not.

### 7. CLAUDE.md doesn't document the Scheduler password — INFO

CLAUDE.md line 19 documents the hordes/ password (`SneakPeak`) but doesn't mention that `projects/scheduler/design.html` is also password-gated with `SeeSchedule`. If someone is grepping the handler doc for "password," they'd miss the second gate.

---

## Suggested fixes

### Low-risk text alignments (canonical-doc only)

1. **Fix HTBH version pill in `index.html` line 317** — change `v0.26.x` to `v0.34.x`. Structural fix: see #1 below.
2. **Fix Chains version pill in `index.html` line 292** — change `v0.34.x` to `v0.25.x` (matches YaC `CONTEXT.md` "Current version: 0.25.2").
3. **Update HTBH blurb in `index.html` lines 303-313** — replace "*an industrial nightmare in oil paint*: *They Are Billions*'s gameplay with *Risen Kingdom*'s brush" with a mood-first phrasing matching GDD §1. Drop "hand-painted" if you want to honor the retired execution commitment, or keep it if you want a public-facing aesthetic hint that's looser than the GDD's locked direction.
4. **Update HTBH milestone status in `index.html` line 312-313** — change to "M0 closed; M1 (Core Loop Vertical Slice) in flight; M2 (Noise System) queued." Or just "M1 in flight."
5. **Fix `CLAUDE.md` line 20** — replace "Public GDD preview iframe (lighter than the full mirror)." with something accurate, e.g. "Abandoned standalone GDD mirror — replaced by `hordes/index.html` in v0.26.18 of `publish-gdd.ps1`. Tombstone; safe to delete." (Pairs with structural fix #2.)
6. **Add password reference in `CLAUDE.md`** — append the Scheduler password under the same row format. Or note that each gated mirror has its own password and they're embedded as plain `var PASSWORD = '...'` in the gate page.

### Structural changes (need user decision)

1. **Fix the publish script's regex in `X:\HereThereBeHordes\scripts\publish-gdd.ps1`** — the `v\d+\.\d+\.[0-9x]+` pattern matched against `index.html` should anchor specifically to the HTBH card's pill, not "first match." Two ways to scope it: (a) wrap a marker like `<!-- htbh-version -->` next to the right pill and have the regex match only inside the marker, or (b) match the regex against a window of text that's preceded by "Here There Be Hordes" within the previous ~30 lines. The script currently does (1) with `, 1` flag for first-match-only, which is the bug. Same applies to the `\d{4}-\d{2}-\d{2}` date replace on line 167.
2. **Decide what to do with `projects/here-there-be-hordes/gdd.html`** — three options: (a) delete it (publish script header comment treats it as dead), (b) keep it but re-enable publishing into it as a no-password public preview (would need a robots.txt change since gdd.html doesn't currently advertise as public), (c) leave it as-is and just fix CLAUDE.md to call it a tombstone. The robots.txt currently only disallows `/hordes/`, so this file IS crawlable as a public preview right now — it just happens to be 8 versions stale.
3. **Decide whether `PERSONAL_CLAUDE_ARCHITECTURE.md` should be deployed.** If it's meant to stay private to the local repo, add it to `.gitignore` (and remove from index — but it's already pushed, so it's been public since 2026-05-14). If it's fine being public, mention it in CLAUDE.md's file inventory.

---

## Couldn't verify

- **GitHub Pages settings (Source = main / root, Enforce HTTPS, Custom domain field)** — would need `gh repo view --json` or the Settings UI. Inferred from CNAME + DEPLOY.md but not directly confirmed.
- **Cloudflare DNS state for `yesandeverything.com`** — CLAUDE.md line 57 says DNS is on Cloudflare as of 2026-05-06 with registrar transfer pending. Couldn't dig into actual nameservers from inside the repo.
- **GitHub repository description / topics / homepageUrl** — `gh` CLI wasn't invoked. If the public repo description on github.com still says something stale, that wouldn't surface here.
- **Whether `https://scheduler.yesandeverything.com` actually resolves** — `projects/scheduler/index.html` lines 67-68 link to both that custom domain and `theprophetkane.github.io/yesandscheduler/`. The fact that both are listed suggests the custom domain is still cert-provisioning. Worth a manual check.
- **Whether the live GitHub Pages deploy matches the local repo HEAD** — `git log` shows `cd20f41` as the latest commit; CDN may still be serving an older version until the next ~30s deploy window.
