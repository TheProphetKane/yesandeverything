# br-v0581-changelog-reconcile-2026-06-14

Run: 2026-06-14T07:06Z (overnight-queue-drain)
Status: committed-ready

## What the item asked
Reconcile the v0.58.0/v0.58.1 version-numbering smear. The v0.58.0 design work
(Sonic Pressure wave-tier scaling + convoy deliveries) shipped under commit bd24d32
tagged v0.58.1; no v0.58.0 commit exists. CHANGELOG.md and the GDD changelog footer
both carried the full body under v0.58.0 while the meta-pill and the actual commit
read v0.58.1.

## What changed (BR working tree, uncommitted)
1. `CHANGELOG.md` - collapsed the two-entry smear into one. Removed the bare v0.58.1
   stub ("update source + project.godot + BACKLOG.md (6 files)") and retitled the full
   v0.58.0 Sonic-Pressure + convoy entry to `## [v0.58.1] - 2026-06-13` (date and number
   now match commit bd24d32 and the meta-pill). Result: exactly one v0.58.1 header, zero
   v0.58.0 headers, body unchanged, v0.57.10 follows directly.
   - Bonus repair: the working-tree CHANGELOG.md was FUSE-truncated at the tail (lost the
     last 3 lines: `- README.md baseline`, `.gitignore...`, `Artist credit: Navy.`).
     Rebuilt from intact HEAD content, so the reconcile and the tail-repair land together.
2. `docs/GDD.html` - footer changelog line retitled `v0.58.0 (2026-06-12)` ->
   `v0.58.1 (2026-06-13)`. No prior v0.58.1 footer entry existed. Historical v0.57.7
   prose that references "a v0.58.0 that does not exist" was left untouched (correct).

## Verification
- Python atomic-write-with-readback on both files (FUSE hazard path).
- Fresh independent re-read: CHANGELOG top = single v0.58.1 + full body + v0.57.10;
  CHANGELOG tail = `Artist credit: Navy.`; GDD footer line 3174 = v0.58.1; GDD tail =
  `</html>`; meta-pill (line 1047) = v0.58.1 - all agree.
- `git diff --stat`: `CHANGELOG.md | 4 ----`, `docs/GDD.html | 2 +-`. Scoped to 2 files.

## Remaining (Nick-side)
- Ship via `cd X:\BrackishRising; .\scripts\release.ps1 -Bump none`. This is a doc-only
  reconcile of an already-shipped version; do NOT let it bump to v0.58.2. Alternatively
  fold into the next real release.
- Sandbox cannot clear the Windows-held `.git/index.lock`; release.ps1 handles it.
- Untracked `docs/.audit_write_test` (0-byte audit write-probe leftover) is harmless;
  not part of this item.

attempts NOT incremented: slice succeeded, no failure.
