# wts-2026-06-12-yab-stale-working-tree — drain result 2026-06-12 (overnight)

## Verdict

Tree triaged, two fresh FUSE truncations repaired, the 06-12 bar-raise release-script finding fixed, rename propagation completed. Tree is one coherent cohort, committed-ready. Ship is Nick-side (release.ps1 = shell, paused).

## What was found (11 modified files at start, 13 at end)

**Cohort A — Yes& Budget rebrand (6 files, intended, complete in code):** README.md H1, apps/web/index.html title, App.tsx (titles + BrandMark), FirstLaunchConsent.tsx, useDocumentTitle.ts, Dashboard.tsx empty-state copy. Zero `YesAndBudget` display-name hits remain in apps/web src. README's remaining 3 hits are `X:\YesAndBudget` filesystem paths, correct to keep.

**Cohort B — doc hygiene (4 files, intended):** BACKLOG.md DONE sweep (Chase/AMEX importers, Plaid rows, Discord wiring, SECURITY.md), CHANGELOG.md v0.13.1 stub backfill ("Orchestrator Push" replaced with the real D-011 entry) + Unreleased note, docs/DECISIONS.md em-dash scrub (D-008..D-012 headers), uninstall-yab-protocol.ps1 BOM strip.

**Cohort C — release.ps1 -Message-optional feature (intended, but shipped a defect):** see fix below.

## Repairs (FUSE truncation, both restored from HEAD via atomic write + readback)

1. **BACKLOG.md** — cut mid-row on the SECURITY.md DONE line, no trailing newline; the analytics-extract DONE row after it was lost. Completed the row (`Shipped 2026-06-08 in 7e06fa7`) and restored the analytics row byte-equivalent to HEAD.
2. **scripts/release.ps1** — cut at line 311 mid-`catch` (Step 5); lost the rest of Step 5, all of Step 6 (post-decisions), and the release footer. Restored 22-line tail from HEAD, converted to the file's CRLF convention. Brace-balance scan: depth 0, no underflow.

## Fix: bar-raise 06-12 finding (auto-message stub into CHANGELOG)

The -Message-optional edit piped its generated file-count stub ("update scripts (3 files)") straight into CHANGELOG.md via Prepend-Changelog on any bump, undoing the 06-11 stub cleanup. Now gated: auto-generation is allowed only with `-Bump none` (no changelog write); any bump without a real `-Message` aborts with a clear error; `RELEASE_FORCE=1` bypasses. This closes the one genuinely new issue in the 06-12 YaB bar-raise.

## Rename propagation (prevents the YaC-style partial-rename HIGH)

Finished display-name stragglers: docs/DESIGN.md title, CLAUDE.md handler title (em dash in that title also scrubbed), DECISIONS.md D-012 prose. Filesystem paths, repo slug, and package names (`yesandbudget`, `@yab/*`) intentionally untouched.

## Ship (Nick-side)

```powershell
cd X:\YesAndBudget
.\scripts\release.ps1 -Message "Yes& Budget rename across app + docs; BACKLOG DONE sweep; v0.13.1 changelog backfill; DECISIONS em-dash scrub; release.ps1 -Message-optional gated to -Bump none"
```

PATCH (default) fits: rename + docs + script hardening, no new feature surface. The same release also clears yab-tracked-bak-rm's residue if the two stale `scripts\*.bak` disk files are deleted first (still EPERM from sandbox).

## Not done / hand-offs

- Tests not run (pnpm virtual-store symlinks do not cross the FUSE mount); preship.ps1 gate covers it at release.
- `.git/index.lock` was removable from sandbox this run (cleared before triage); release.ps1 re-clears as step one regardless.
- yab-polish-orphan-files + yab-orphans-14 (wire-vs-drop decisions) untouched, separate items.

## Verdict note (rule 5)

The only YaB breakage signals this run were the two FUSE truncations, both repaired in-tree. Once this tree ships, the recurring "stale working tree" finding clears; next review pass should move YaB toward in-progress rather than needs-attention.
