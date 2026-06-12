# yac-share-protocol-boot-route - 2026-06-12 overnight drain (09:33Z run)

## What shipped (to the working tree)
`src/main.ts`: web+yac protocol boot route, placed directly after the
onShareTargetReceive handler it mirrors. A bare `?course=<slug>` launch
(the manifest protocol_handlers target `/?course=%s`) is now consumed at
boot: skips when `?share=1` owns the params (that path already routes via
onShareTargetReceive), strips a passed-through `web+yac:` scheme plus
leading slashes, trims trailing slashes, then calls `showCourseDetail(slug)`
after the same 500ms hydration tick the page_view bootstrap uses. Whole
block try/caught so a bad launch URL can never block boot. +25 lines, one
file.

## Verification
- esbuild bundle (0.28.0, linux binary in sandbox tmp; repo node_modules is
  win32 and was not touched): clean.
- `node --check` on the bundle: pass. Boot-route code confirmed present.
- `tsc --noEmit`: clean.
- src/main.ts tail verified intact after atomic write (fsync + os.replace +
  full readback compare).

## Not done / hand-off
- NOT committed: commit goes through `cd X:\YesAndChains; .\scripts\release.ps1`
  (shell pauses for Nick). Pre-existing tree dirt: CLAUDE.md +
  docs/launch-checklist-1.0.md were already modified before this run.
- Versioning: this is a new user-visible capability (protocol launches now
  work), so the release that carries it is a MINOR -> 0.52.0 per YaC pre-1.0
  policy. CONTEXT.md changelog entry deferred to release time and folds with
  the pending yac-0513-changelog item (which authors the 0.51.3 entry for
  faf1223/9c78081); one CONTEXT.md edit session covers both rather than two
  passes over a 398KB FUSE file in a dirty tree.
- Manual test once shipped: from a PWA-installed profile, open
  `web+yac:<known-slug>` and confirm the course detail opens after boot.
