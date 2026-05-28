# scheduler-design-workflows-026 — result

**Completed:** 2026-05-27 (queue-drain-frequent)
**Status:** done
**Auto-safe:** true (drift-fix)

## Change

`X:\Scheduler\docs\DESIGN.md` §19 repo-layout tree, lines 490-492.

**Before:**

```
├── .github/workflows/
│   └── deploy.yml           # on push to main: deploy worker + pages
```

**After:**

```
├── .github/workflows/
│   ├── ci.yml               # install + typecheck + test + build on push/PR
│   └── deploy-pages.yml     # build + deploy SPA to GitHub Pages on push to main (worker deploys via scripts/release.ps1)
```

## Notes

- Verified both `.github/workflows/ci.yml` and `.github/workflows/deploy-pages.yml` exist in the repo. No `deploy.yml` exists.
- `ci.yml` triggers on `push` to main and `pull_request` to main. Job name is `install + typecheck + test + build`. Used that wording rather than the queue prompt's "lint/typecheck/test on PR" because the workflow runs on push too and includes a build step.
- `deploy-pages.yml` builds the SPA and deploys to GitHub Pages only. It does NOT deploy the Worker. The queue prompt's "deploy SPA + worker on push to main" was inaccurate; the Worker deploys via `scripts/release.ps1` → `deploy-worker.ps1` per the project's release flow (Scheduler CLAUDE.md §Release flow). Wrote the row accordingly with the worker-side pointer.
- Tail-checked the file: 607 lines, ends with the document-maintained footer + `---`. No FUSE truncation.

## Not pushed

Edit staged in the Scheduler working tree only. The drain rule pauses for shell ops, so `scripts/release.ps1` was not invoked. Nick can ship this as part of the next Scheduler release.

## Resolves

2026-05-24 Scheduler canonical audit LOW-9.
