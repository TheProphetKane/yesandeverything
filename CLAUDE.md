# Claude Primer — YesAndEverything

**Command rule (always):** Any git, push, release, deploy, or script command provided in chat must lead with `cd X:\YesAndEverything` so it never runs against the wrong repo. This repo is `X:\YesAndEverything`. (Cross-project standard; see `X:\YesAndEverything\CLAUDE_SETTINGS.md` § "Script standard: self-locating cwd".)


You are working on **YesAndEverything** — the public-facing static site at <https://yesandeverything.com>. It is a single-page landing page listing Kane's projects, plus per-project sub-pages, plus a password-gated mirror of the HBH GDD.

## What this repo is (and isn't)

- **Is:** a static-site monorepo deployed by **GitHub Pages from `main`/root**. No build step, no framework, no SSR. Pure HTML/CSS/JS, dark-mode by default, mono-font-first aesthetic.
- **Is not:** the actual code of the projects it links to. Each project (HBH, Chains, Scheduler, Apothecary, Budget) lives in its own repo. This repo only carries landing pages + mirrors.

## Files at a glance

| Path | Purpose |
|---|---|
| `index.html` | The site itself. Single self-contained file. Lists projects with descriptions. |
| `404.html` | Fallback for unknown paths. |
| `CNAME` | Custom-domain pointer for GitHub Pages: `yesandeverything.com`. |
| `robots.txt` | Allows crawlers on root, disallows the private paths: `/hordes/`, `/brackish-rising/`, `/work/`, `/dashboard/`, `/sitemap/`. |
| `.nojekyll` (implicit) | Tells GitHub Pages to skip Jekyll processing. |
| `hordes/index.html` | Password-gated HBH GDD mirror. Password: `SneakPeak`. Contains base64-inlined GDD via `var ENCODED = "..."`. **Generated, not hand-edited.** |
| `projects/here-there-be-hordes/gdd.html` | Dead-weight legacy file from pre-v0.26.18 publish flow. Now a 16-line meta-refresh stub that redirects to `/hordes/` so any old bookmark still lands on the gate. Folder path kept (not renamed) because no live link on the site references it; the redirect just covers external bookmarks. |
| `projects/scheduler/{index,design}.html` | Scheduler project landing + design preview. |
| `projects/{apothecary,brackish-rising,budget,chains,here-be-hordes}/` | Per-project landing + design-preview pages (`index.html` + `design.html` each). `projects/budget/` also carries `pre-install`, `privacy`, `security`, and `security-notices` sub-pages. |
| `apothecary/` | Celtic apothecary label designer — multi-file ES-module app, deployed by mirroring from `X:\YesAndApothecary` via that repo's `scripts/release.ps1` (which calls `scripts/deploy-to-yae.ps1` then commits + pushes this side). Multi-file by design; the "one file per page" convention does not apply to this subdir (it's a project mirror, same as `hordes/`). Do not edit files in `apothecary/` directly; edit in the source repo and run release. |
| `brackish-rising/` | Password-gated Brackish Rising GDD mirror. Same base64-inlined gate pattern as `hordes/`; generated from the BR repo, not hand-edited. |
| `budget/` | Budget project landing page. Single self-contained file; project mirror. |
| `terms/` | Terms / legal page. Single self-contained file. |
| `dashboard/` | Private usage dashboard (robots-gated). Reads `dashboard/data/usage.json`. |
| `sitemap/` | Private site map page (robots-gated). |
| `work/` | Private work page (robots-gated). |
| `DEPLOY.md` | One-time DNS + GitHub Pages setup runbook. Already executed. |
| `unstick-git.ps1` | Recovery script if git lock or remote desync. |
| `scripts/` | Release tooling. `release.ps1` runs the integrity guards then commit + push + Discord; `push-to-github.ps1`, `discord-notify.ps1`, plus repo-parity and branch-protection helpers. |
| `CLAUDE_SETTINGS.md` | Cross-project personal-Claude settings doc (the how-to-work-with-Nick rules). Source of truth for tone, pushback, voice. |
| `PERSONAL_CLAUDE_ARCHITECTURE.md` | The handler-and-canonical pattern spec applied to all six personal projects. Companion to CLAUDE_SETTINGS. |
| `IMPLEMENTATION_GUIDE.md` | How-to for the personal-Claude setup. Pairs with `CLAUDE_SETTINGS.md` (the rules) and `PERSONAL_CLAUDE_ARCHITECTURE.md` (the why). |
| `docs/` | Per-project audit findings live here as `CANONICAL_AUDIT-YYYY-MM-DD.md` (written by the scheduled audit tasks). Handler audits land here too as `HANDLER_AUDIT-YYYY-MM-DD.md`. Cross-portfolio CONSTELLATION bar-raise reports also land here once Phase 3 of the bar-raise buildout ships. |
| `docs/BAR_RAISE_ROADMAP.md` | Active build plan for the periodic-review skill + status dashboard. Multi-session; check phase status table before resuming. Source of truth for the JSON contract and URL slugs. |
| `status/` | Static status dashboard at `yesandeverything.com/status/`. Reads per-project JSON files at `status/data/<project>.json` and renders cards. See BAR_RAISE_ROADMAP.md Phase 1+. Each project's release.ps1 writes its own dashboard JSON. |
| `.work-queue.json` | Cross-project drain queue. Items get added by audits, processed by `work-queue-runner` skill on the every-4-hours `queue-drain-frequent` scheduled task. |
| `_skill-review/` | Staged personal `.skill` files (installable) plus their review viewer. |
| `invoices/` | Generated contract-drafting invoices and email templates (md + pdf + txt). Working files, not part of the public site. |
| `digest-2026-05-15.md` | Archived cross-project weekly digest snapshot from 2026-05-15. Output of the digest task; superseded by later runs. |

## The hordes/ injection rule (critical)

**Never copy `gdd.html` into `hordes/`.** The `hordes/index.html` is a hand-authored password gate that loads `var ENCODED = "..."` (a base64 string) and decodes it inline. The HBH-side `scripts/publish-gdd.ps1` injects a new base64 payload into the existing `hordes/index.html` — it does not replace the file. If you change `hordes/index.html`'s shape, you break the publish pipeline.

## Deploy flow

Direct YaE edits ship through the release script, not raw git. From the repo root:

```powershell
cd X:\YesAndEverything
# edit index.html or per-project page
.\scripts\release.ps1
```

`release.ps1` first runs the dashboard JSON integrity guard (Step 0: `check-status-json.ps1`, aborting if a corrupt `status/data/*.json` would ship), clears any stale `.git\index.lock`, runs the integrity guards (`index.html` must end with `</html>`; `CNAME` must read `yesandeverything.com`), auto-detects what changed and writes a matching commit, pushes to `main`, then posts the changelog line to `#yae-dev-log` on Discord. GitHub Pages auto-deploys from `main` root within ~30s. Hard-refresh (Ctrl+Shift+R) to bust the CDN cache if a change doesn't appear.

Raw git (`git add . && git commit && git push`) is the escape hatch only. It skips the integrity guards and the `index.lock` clear, so reserve it for one-off recovery when the release script itself is the thing being fixed.

For HBH GDD republishing, do **not** edit this repo directly. Run `X:\HereBeHordes\scripts\publish-gdd.ps1` and it'll push the injection here for you.

## Conventions

- **One file per page** — no shared CSS/JS imports. Every page is self-contained, inline `<style>` + `<script>`. Keeps GitHub Pages happy with zero build config.
- **Dark-mode by default.** Palette pulls from the `:root { --bg, --fg, --accent }` block at the top of `index.html`. Match it across new pages.
- **Mono-font headings, sans body** is the established aesthetic. Don't introduce serif unless you have a reason.
- **No JS frameworks.** Vanilla DOM only. Bundle size is part of the brand.
- **External links open in new tab** with `target="_blank" rel="noopener"`.

## Things that will bite you

- **GitHub Pages caches aggressively.** If a change doesn't appear, hard-refresh first; only debug after that.
- **`CNAME` must contain `yesandeverything.com` exactly.** GitHub regenerates it from the Pages settings; if you `git push` an empty CNAME, the custom domain breaks.
- **Robots.txt disallows `/hordes/`** because the GDD is private. Don't add public links to it from `index.html`.
- **The HBH GDD mirror is base64-inlined**, not fetched. The whole GDD ships in the page. That's intentional (zero-dependency, works offline).
- **GDD payload integrity is not checked before injection.** `publish-gdd.ps1` will happily base64-inline a truncated GDD into `hordes/index.html`. v0.61.8 shipped a GDD that lost 70 lines off the tail (FUSE write-truncation on the HBH side), which broke the live tab switcher silently. Add a `Test-GddIntegrity` guard that asserts the source GDD ends with `</html>` before injection. Recovery for the actual truncation lives in `X:\HereBeHordes\outputs\v0_61_10_gdd_tail_recover.py`. Memory entry: gdd_truncation_guard.
- **DNS and registrar on Cloudflare** for `yesandeverything.com` since 2026-05-06. The registrar transfer from Squarespace completed in May 2026; both DNS and registrar now sit on Cloudflare.

## When in doubt

1. `DEPLOY.md` has the one-time setup notes — anything DNS or Pages-config-related is documented there.
2. For the `hordes/` mirror, work flows from the HBH repo, never the other way.
3. For per-project page content, mirror what the project's own canonical doc says (GDD for HBH, DESIGN.md for Scheduler). Don't fabricate.

## Hard-won hazards

These are bug patterns that have eaten 5+ patch cycles each on Nick's projects. Apply preemptively.

### Two-failed-fix rule

After two failed fix attempts on the same symptom, stop shipping fixes. Add instrumentation. Trace code paths. Speculation past attempt two costs more than diagnosis would. Full rule in `CLAUDE_SETTINGS.md` "Debugging discipline" section and memory `debugging-discipline`.

### Parallel implementations

YaE has at least three fork points for the same content. The hand-authored landing pages in `index.html` + per-project sub-pages. The `hordes/index.html` password gate that base64-inlines the HBH GDD. The `apothecary/` mirror copied from `X:\YesAndApothecary` via that repo's `scripts/release.ps1`. A "page content is wrong" bug could be in any of three places. Identify which generator owns the page before editing the HTML directly. Memory `parallel-implementation-trap`.

### FUSE Edit-tool truncation

The Edit tool truncates files mid-write on this mount with non-trivial frequency. v0.74.30 GDD shipped without `</html>`. For `index.html`, `hordes/index.html`, `apothecary/*`, prefer Python atomic-write-with-readback (reference scripts in `X:\HereBeHordes\outputs\v0_74_30_apply.py`). Tail-check every touched file before declaring done. Memory `htbh-fuse-edit-tool-truncation`.

### Cross-project consistency

CLAUDE_SETTINGS.md is the load-bearing how-to-work-with-Nick doc. PERSONAL_CLAUDE_ARCHITECTURE.md is the handler-and-canonical pattern spec. Both live at the YaE root because YaE is the cross-project hub. Per-project CLAUDE.md files (HBH, YaC, Scheduler, YaE) inherit from these two and add project-local hazards. When updating cross-project rules, update them HERE first, then propagate to the per-project CLAUDE.md files.
