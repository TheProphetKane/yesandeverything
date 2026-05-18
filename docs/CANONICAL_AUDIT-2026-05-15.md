# YesAndEverything — Canonical-Doc Audit (2026-05-15)

## TL;DR

Site infra is clean (CNAME, robots, hordes gate, DEPLOY). **Two of the three project cards on `index.html` are stale and the shape of the staleness matches the `publish-gdd.ps1` regex-bug pattern.** Plus a stray junk file in the repo root and a stale HTBH GDD preview.

## Findings

**Project version pills on `index.html` — 2 of 3 stale**

| Card | Claimed | Actual | Status |
|---|---|---|---|
| Chains | `v0.35.x → 1.0` | `v0.25.2` (CONTEXT.md + CLAUDE.md) | **STALE — off by 10 minor versions** |
| Here There Be Hordes | `v0.35.x` | `v0.35.6` (GDD pill) | OK |
| Scheduler | `v1.0` | `v0.1.0` (CHANGELOG.md; `package.json` still `0.0.0`) | **STALE — premature v1.0 claim** |

**Regex-bug pattern flag.** Both Chains and HTBH cards show `v0.35.x`. HTBH is genuinely at v0.35.6 — Chains is not. This is the exact shape of memory `publish_gdd_regex_bug_lesson`: an unanchored `.Replace(text, str, 1)` on the YaE landing page stamping the *first* card it finds with the HTBH version. Recommend auditing `X:\HereThereBeHordes\scripts\publish-gdd.ps1` (and any sibling publishers) for unanchored single-replace calls against `index.html`, and re-anchoring on a card-specific marker (e.g. project-id class or comment anchor).

**`projects/scheduler/` internal inconsistency.** `index.html` says `v1.0`, `design.html` says `v0.1.0`. `design.html` matches reality; `index.html` is stale.

**`projects/here-there-be-hordes/gdd.html` preview is stale.** References v0.19.0 / v0.26.15 / v0.26.16 inline. HTBH is at v0.35.6. The CLAUDE.md says this page should mirror the canonical GDD — it's drifted by ~9 minor versions.

**Stray file in repo root.** `: close §0.5 - custom SMTP shipped on yesandeverything.com via Resend"` (139 bytes, dated 2026-05-11). Looks like a `git commit -m` that got mis-quoted in PowerShell and redirected to a file. Should be `git rm`'d.

**`_skill-review/` in repo root.** Two files (SKILL.md, PENDING_SCHEDULED_TASKS.md). Not referenced by CLAUDE.md or DEPLOY.md. Likely not meant to ship — confirm it belongs (or gitignore + remove).

## Confirmed-clean items

- `CNAME` — exactly `yesandeverything.com` (20 bytes). ✓
- `robots.txt` — `Disallow: /hordes/` still in place. ✓
- `hordes/index.html` — base64 gate intact: `var ENCODED = "..."` present, 886KB inlined. Publish pipeline shape preserved. ✓
- `.nojekyll` — present (0 bytes). ✓
- `DEPLOY.md` — matches current GH Pages from `main`/root + custom domain config; no contradictions. ✓
- `404.html` — present. ✓

## Recommended actions (in order)

1. Fix Chains pill on `index.html` → `v0.25.x` (and review publisher regex).
2. Fix Scheduler pill on `index.html` → `v0.1.0` (and align `projects/scheduler/index.html`).
3. Refresh `projects/here-there-be-hordes/gdd.html` against current GDD or pin it as a snapshot.
4. `git rm` the mis-quoted stray file at repo root.
5. Decide on `_skill-review/` — ship intentionally or remove + gitignore.
