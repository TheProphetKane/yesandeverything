# YesAndEverything — Canonical-Doc Audit (2026-05-17)

## TL;DR

HTBH card on `index.html` got fixed since 2026-05-15 audit. Chains, Scheduler, and the HTBH preview-GDD are still stale. The 2026-05-15 recommended actions #1, #2, #3, #4 were not applied. Plus one new typo (`vv0.1.0` in `projects/scheduler/design.html`) and one new infra issue (`.work-queue.json` has malformed JSON at line 248 / char 11449 — the drain queue is currently unparseable).

## Findings

**Landing-page version pills on `index.html` — 1 of 3 fixed, 2 still stale**

| Card | Claimed | Actual | Status |
|---|---|---|---|
| Chains | `v0.35.x → 1.0` | `v0.26.0` (CONTEXT.md + package.json) | **STALE — landing page ahead of reality by ~9 minor** |
| Here There Be Hordes | `v0.59.x` | `v0.59.2` (GDD header) / `v0.59.1` (latest commit) | OK ✓ |
| Scheduler | `v1.0` | `v0.1.0` (CHANGELOG + root package.json) | **STALE — premature v1.0 claim, off by 0.9 major** |

The HTBH card matches now, which removes the regex-bug suspicion from the 2026-05-15 audit (if a `Replace(..., 1)` were still pattern-matching the first card, HTBH would have stamped Chains again). Treat the Chains and Scheduler pills as plain unattended drift, not publisher contamination.

**Subpage drift**

- `projects/scheduler/index.html` line 50: `<span class="pill">v1.0</span>` — STALE (matches landing). Should be `v0.1.0`.
- `projects/scheduler/design.html` line ~?: header reads `vv0.1.0` (double `v` typo). Value would be correct as `v0.1.0`; the typo is the visible bug.
- `projects/here-there-be-hordes/gdd.html` — highest version mentioned anywhere in the file is `v0.26.16`. Actual HTBH is at `v0.59.2`. The preview is ~33 minor versions behind. CLAUDE.md says this page should mirror the canonical GDD — it has not been republished since at least the v0.26.x window.

**Repo-root hygiene (carry-overs from 2026-05-15)**

- `: close §0.5 - custom SMTP shipped on yesandeverything.com via Resend"` — 139-byte stray, mis-quoted `git commit -m` redirected to a file (2026-05-11). Still present. `git rm`.
- `files.txt` — 0 bytes, 2026-05-15. New stray since last audit. `git rm`.
- `_skill-review/` — still in repo root, still unreferenced by CLAUDE.md / DEPLOY.md. Decide intent: ship + document, or gitignore + remove.
- `digest-2026-05-15.md` in repo root — output landed at root instead of `docs/`. Move or remove.

**Infra: drain queue corruption (NEW, P0)**

`X:\YesAndEverything\.work-queue.json` no longer parses: `Unterminated string starting at line 248, column 17 (char 11449)`. The queue-drain-frequent scheduled task will silently fail on every run until repaired. There is a sibling `.work-queue.json.bak.1778937105` from 2026-05-16; either restore from it or hand-repair around char 11449.

## Confirmed-clean items

- `CNAME` — exactly `yesandeverything.com` (20 bytes). ✓
- `robots.txt` — `Disallow: /hordes/` still in place. ✓
- `hordes/index.html` — base64 gate intact: `var ENCODED = "..."` present (single occurrence), 928KB inlined. Publish-pipeline shape preserved. ✓
- `.nojekyll` — present (0 bytes). ✓
- `DEPLOY.md` — matches current GH Pages from `main`/root + custom domain config; no contradictions. ✓
- `404.html` — present. ✓

## Recommended actions (in order)

1. **Repair `.work-queue.json`** first — otherwise queued fixes below will not auto-drain. (P0)
2. Fix Chains pill on `index.html` → `v0.26.x` (drop `→ 1.0`, Chains has not cut 1.0).
3. Fix Scheduler pill on `index.html` and `projects/scheduler/index.html` → `v0.1.0`.
4. Fix `vv0.1.0` typo in `projects/scheduler/design.html`.
5. Republish `projects/here-there-be-hordes/gdd.html` from current GDD, or replace the page with an iframe / link to the live `hordes/` gate and stop maintaining a second copy.
6. `git rm` stray files: the mis-quoted commit-message file and `files.txt`.
7. Decide on `_skill-review/` and `digest-2026-05-15.md` placement.

## Queue-these (for `work-queue-runner add` after #1 is repaired)

- `yae-index-chains-pill` (drift-fix, auto_safe, P2) — 2026-05-15 carry-over.
- `yae-index-scheduler-pill` (drift-fix, auto_safe, P2) — 2026-05-15 carry-over.
- `yae-scheduler-subpage-version` (drift-fix, auto_safe, P3) — `projects/scheduler/index.html` + `design.html` typo.
- `yae-htbh-preview-republish` (structural, P2) — `projects/here-there-be-hordes/gdd.html` is 33 minor versions behind; needs republish or replacement.
- `yae-root-hygiene-sweep` (drift-fix, auto_safe, P3) — stray files + skill-review placement decision.
- `yae-work-queue-repair` (infra, P0) — restore from `.bak` or hand-fix char 11449.
