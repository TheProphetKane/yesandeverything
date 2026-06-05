# YesAndEverything canonical-doc audit — 2026-05-31

Scope: YaE static site + project landing cards + handler. Canonical = `DEPLOY.md` + `index.html`, handler = `CLAUDE.md`. Generated/mirrored areas are presence-checked only, never content-edited: `hordes/` (injected by HBH `publish-gdd.ps1`), `brackish-rising/` (published from the BR repo), `apothecary/` (mirrored from the YaA repo).

## TL;DR
Structurally healthy, but the landing-card version pills have drifted broadly: five of six cards trail their projects, only Brackish is current. Worst is Here Be Hordes (card `v0.75.x` vs shipped `0.80.1`, five MINORs) and Budget (`v0.7.x` vs `0.10.0`, plus an "M0-M4 shipped" subtitle while the project is on M5). The three 2026-05-24 drift items (apothecary card, brackish omission, budget gate) are all resolved: cards exist, dirs exist. One privacy inconsistency remains (robots.txt gates `/hordes/` but not the equally private `/brackish-rising/`). Two items queued; neither auto-safe because both fixes land in `index.html`/`robots.txt`, which route through `release.ps1`.

## What's aligned (no fix needed)
- CNAME reads `yesandeverything.com`. `index.html` ends with `</html>`; `hordes/index.html` has its single `var ENCODED` payload; `brackish-rising/index.html` ends with `</html>`.
- All six project cards present and ordered to match the meta/og descriptions: Here Be Hordes, Brackish Rising, Chains, Scheduler, Apothecary, Budget.
- On-disk targets exist for every card link: `hordes/`, `brackish-rising/`, `apothecary/`, `projects/scheduler/`, `projects/budget/`, `budget/`.
- `apothecary/` local mirror present and full (index.html + data + src + styles + CHANGELOG.md), matching the CLAUDE.md handler.
- `status/index.html` `PROJECTS` array lists six ids (HBH, Scheduler, YaA, YaB, YaC, br); all six `status/data/*.json` files exist and parse.
- `projects/here-there-be-hordes/gdd.html` legacy stub redirects to `/hordes/` via working `<meta http-equiv="refresh">` plus a `location.replace` script.
- robots.txt disallows `/hordes/`; `404.html`, `.nojekyll` present.
- Brackish card pill `v0.36.x` matches shipped `0.36.0`.

## Drift found
1. **Landing-card version pills stale on 5 of 6 cards** (medium, public-facing). Pill vs shipped (truth from `status/data/*.json`):
   - Here Be Hordes `v0.75.x` vs `0.80.1` (5 MINORs)
   - Budget `v0.7.x` vs `0.10.0` (3 MINORs) and subtitle "M0-M4 shipped" vs project on M5
   - Chains `v0.32.x` vs `0.33.1` (1 MINOR)
   - Scheduler `v0.2.0` vs `0.3.0` (1 MINOR)
   - Apothecary `v0.15.2` vs `0.15.8` (6 PATCHes)
   Cards using the `vX.Y.x` form age more gracefully than the two pinned exact (`v0.2.0`, `v0.15.2`). Consider standardizing on the `x` form.
2. **robots.txt gates hordes but not brackish-rising** (low, privacy). `/hordes/` is disallowed because the GDD is private; `/brackish-rising/` is the same password-gate pattern but is crawlable. Either intentional or an oversight.

Minor (grouped, not separately queued):
- Body's one external link (`yesandchains.com`) has `rel="noopener"` but not `target="_blank"`; CLAUDE.md convention is new-tab external links. One anchor, trivial.
- `status/index.html` fetches `data/constellation.json`, which does not exist yet. The fetch is wrapped in a `console.warn` catch so it degrades cleanly; this is the unbuilt Phase 3 deliverable per `docs/BAR_RAISE_ROADMAP.md`, expected-pending rather than drift.
- CLAUDE.md "Files at a glance" predates the `budget/` and `brackish-rising/` top-level gates; handler-audit owns that completeness gap.

## Suggested fixes
1. Sweep all five stale card pills in `index.html` to their `status/data/*.json` values and refresh the Budget subtitle to M5, via release.ps1. — drift-fix (not auto-safe; FUSE-sensitive file)
2. Decide brackish privacy; if private like hordes, add `Disallow: /brackish-rising/` to robots.txt. — structural (privacy-intent call)

## Auto-fix outcome
No auto-safe items. Both fixes touch `index.html` or `robots.txt`, which route through `release.ps1` rather than direct edits (FUSE truncation hazard on `index.html`; CNAME/Pages regeneration risk near robots). drift-auto-fix applied zero automatic text fixes and enqueued both (`q-2026-0531-yae-card-pills-sweep`, `q-2026-0531-yae-robots-brackish`). They need one manual `release.ps1` pass.

## Couldn't verify
- Live `yesandeverything.com` serving + Cloudflare->Pages chain (no outbound HTTP this pass).
- GitHub repo description/homepage (`gh` CLI not available here).
