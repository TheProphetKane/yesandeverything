# YesAndEverything — Canonical-Doc Audit

Audit date: 2026-05-14
Scope: Verify CLAUDE.md + DEPLOY.md describe what is actually in the repo / deployed.
Mode: Report-only, no fixes.

## TL;DR

The repo is in mostly-good shape, but there are several real drifts between the docs and the deployed state. The most serious is a **script bug in HTBH's `publish-gdd.ps1` that writes the HTBH version onto the Chains card on the public landing page**, leaving HTBH's own card stuck 8 minor versions behind and silently mislabeling Chains.

---

## Findings, by severity

### P0 — Affects what visitors see

**1. HTBH publish-gdd.ps1 overwrites the wrong version pill in `index.html`.**

`X:\HereThereBeHordes\scripts\publish-gdd.ps1` lines ~158-162:

```powershell
$verRe = [regex]::new('v\d+\.\d+\.[0-9x]+')
$idxText = $verRe.Replace($idxText, $newSeries, 1)
```

The regex is unanchored and the script replaces the **first** match in `index.html`. The Chains card (`v0.34.x`, line 292) appears before the HTBH card (`v0.26.x`, line 317), so every HTBH publish overwrites the Chains pill with HTBH's version, and the HTBH pill never gets touched.

Effect on production:
- HTBH card on yesandeverything.com currently reads **`v0.26.x`** — actual HTBH is at **v0.34.22** (per `docs/GDD.html` meta-pill and the most recent publish commit `cd20f41`). The HTBH card is 8+ minor versions stale.
- Chains card reads **`v0.34.x`**, but YaC `CONTEXT.md` says current is **`0.25.2` (2026-05-13)**. The number on the Chains card is HTBH's version, not Chains's.

Git history confirms: every `docs(htbh): publish GDD v0.X.Y` commit on YaE bumps the Chains pill, never the HTBH pill (e.g. `87cb7a1`, `31f2d45`, `b033a86`).

This is a script bug, not a doc bug, but CLAUDE.md does not mention it and the doc claim "For HTBH GDD republishing, do not edit this repo directly — run `publish-gdd.ps1` and it'll push the injection here for you" implicitly endorses the broken flow.

**2. `projects/here-there-be-hordes/gdd.html` is a publicly accessible, ungated, non-noindexed full GDD copy — stale at v0.26.16 — and CLAUDE.md misdescribes it.**

CLAUDE.md says: *"`projects/here-there-be-hordes/gdd.html` | Public GDD preview iframe (lighter than the full mirror)."*

Reality:
- It is **not an iframe** — `grep -c iframe` = 0. It's a 314KB self-contained copy of the full GDD.
- It is **not noindexed** — no `meta name="robots"` in the head. Compare to `hordes/index.html` (gated) and `projects/scheduler/design.html` (gated), both of which carry `noindex, nofollow, noarchive`.
- It is **not gated** — no password, no encoding, just renders directly.
- `robots.txt` only disallows `/hordes/`, so `/projects/here-there-be-hordes/gdd.html` is fully crawlable.
- It is **stale**: last touched 2026-05-08 at HTBH v0.26.16. HTBH is now v0.34.22.
- It is **orphaned**: no link from `index.html` or anywhere else in the repo (`grep -r "here-there-be-hordes"` returns 0 link hits).
- The current `publish-gdd.ps1` header explicitly says: *"The old version wrote to projects/here-there-be-hordes/gdd.html — a stale file nothing serves."* The script was deliberately changed to stop updating it. CLAUDE.md still lists it as an active component.

Net: there is a stale, public, unlinked, search-engine-indexable copy of the GDD at a known URL. If the gate at `/hordes/` is meant to keep the GDD off the open web, this file defeats that.

---

### P1 — Doc drift, no production impact yet

**3. CLAUDE.md "Files at a glance" omits two real files in the repo root.**

Untracked but present locally:
- `CLAUDE.md` itself — not in `.gitignore` (file doesn't exist), but `git status` shows it as untracked. The system reminder's CLAUDE.md content was loaded from this file; if it's not pushed, it isn't part of the deployed repo.
- `PERSONAL_CLAUDE_ARCHITECTURE.md` — meta-doc drafted 2026-05-14, untracked.

Neither appears in CLAUDE.md's "Files at a glance" table. They aren't deployed (GitHub Pages serves what's pushed), so absence-from-table is fine, but the table claims to be the file inventory; consider noting that these are project-local meta files, or add them to a `.gitignore`.

**4. `projects/scheduler/design.html` has version-pill typo `vv0.1.0`** (double `v`) on the gate page (line ~50). Cosmetic but ugly. The page is otherwise consistent with CLAUDE.md.

**5. CLAUDE.md describes `projects/scheduler/{index,design}.html` as "Scheduler project landing + design preview"** — accurate, but understated. `design.html` is in fact a full base64-inlined password gate (password: `SeeSchedule`, same shape as `hordes/index.html`). Worth pinning the password and gate-shape note alongside the `hordes/` injection rule, since these are now two pages with the same fragile contract.

---

### P2 — Hygiene

**6. Untracked junk filename in repo root.**

There is a file literally named `: close §0.5 - custom SMTP shipped on yesandeverything.com via Resend"` (with the leading `:` and trailing `"`). Contents are a single git log line — clearly an accidental shell redirect (`git log ... > "<commit message with leading colon>"`). Should be deleted.

**7. Uncommitted line-ending churn on `hordes/index.html`.**

`git diff` shows 127 lines removed and 127 lines added, all line-ending changes (CRLF/LF flip). No content difference. Likely a tool re-saved the file. Will be a noisy commit if pushed. Consider a `.gitattributes` `* text=auto` line.

**8. CLAUDE.md "Things that will bite you" mentions DNS still on Cloudflare pending registrar transfer from Squarespace (5-7 days from 2026-05-06).** Today is 2026-05-14 — 8 days in. The note is approaching stale; either the transfer completed (CLAUDE.md should drop the pending caveat) or it's lagging (CLAUDE.md should note the lag). Cross-ref point only — DNS state itself wasn't verified in this audit.

---

## What is correct

For the avoidance of doubt, these are all good:

- `CNAME` is exactly `yesandeverything.com` (no newline drama).
- `.nojekyll` is present and empty (correct).
- `robots.txt` disallows `/hordes/` as CLAUDE.md describes.
- `hordes/index.html` is a hand-authored password gate (`PASSWORD = 'SneakPeak'`), has `var ENCODED = "..."` containing a base64-encoded GDD, decodes via `atob` + `TextDecoder('utf-8')` + `document.write` — matches CLAUDE.md exactly.
- `404.html` is a simple meta-refresh to `/`, dark-mode, matches the site aesthetic.
- `projects/scheduler/index.html` faithfully mirrors what DESIGN.md says (Aquatics, Lifeguard + Swim Instructor, magic link, six-week window, etc.), uses the established dark palette, and properly disclosing the design doc as password-gated.
- Single-file-per-page convention is held throughout (no shared CSS/JS imports).
- External `meta-link` anchors on `index.html` use `rel="noopener"`.
- `unstick-git.ps1` does what CLAUDE.md says it does.

---

## Suggested action order (not executed — report-only audit)

1. **P0** — Fix `publish-gdd.ps1`'s regex to anchor on the HTBH card specifically (or add a unique marker around the HTBH version pill in `index.html` and anchor on that). Manually re-set both pills to truth on the next commit: HTBH `v0.34.x`, Chains `v0.25.x`.
2. **P0** — Decide on the fate of `projects/here-there-be-hordes/gdd.html`. Either: delete (the publish script no longer maintains it; CLAUDE.md description is wrong anyway), or convert to a true noindex+gated preview and have the script keep it fresh. Today it is the worst of all worlds: stale, public, indexable.
3. **P1** — Fix `vv0.1.0` typo on `projects/scheduler/design.html`.
4. **P1** — Update CLAUDE.md "Files at a glance" to drop the iframe claim and either note `projects/here-there-be-hordes/gdd.html` as stale-and-pending-removal or remove the row.
5. **P2** — Delete the stray `": close §0.5 ..."` file.
6. **P2** — Add `.gitattributes` with `* text=auto` to stop CRLF/LF flips on `hordes/index.html`.
7. **P2** — Update the DNS transfer line in CLAUDE.md once the registrar transfer state is known.
