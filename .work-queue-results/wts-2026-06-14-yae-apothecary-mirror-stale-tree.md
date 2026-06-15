# wts-2026-06-14-yae-apothecary-mirror-stale-tree — diagnosis

Run: overnight-queue-drain 2026-06-14
Verdict: **premise inverted. No work to ship. Live site is fine. Working tree must be discarded, not committed.**

## What the item assumed

"A prior YaA release mirrored into YaE but the YaE-side commit never landed; the apothecary/ working tree carries uncommitted edits 27+ days old. Triage: let the pending YaE working-tree commit carry it, or re-run the YaA release to re-mirror and push."

## What is actually true

Ground-truth content comparison (git index in YaE is corrupt, so comparisons were done by content, reading HEAD blobs via `git show` which bypasses the index):

| Layer | State |
|---|---|
| YaA HEAD | `81907ca` v0.18.2 (2026-06-13), working tree clean |
| YaE `apothecary/index.html`, `data/`, `styles/` | identical to YaA truth |
| YaE `apothecary/src/` (7 files) HEAD-committed | **identical to YaA v0.18.2 truth** |
| YaE `apothecary/src/` (7 files) working tree | **stale / FUSE-corrupted, older than HEAD** |

The 7 working-tree files: `src/ui/editor.js`, `src/ui/shop-name.js`, `src/util/{autofit,lookup,persist,print,saved-labels}.js`.

`src/ui/editor.js` is the clearest case: HEAD blob and YaA source are both 1602 lines and intact; the working-tree copy is **1586 lines, truncated mid-`wireTiles()`** (FUSE write-truncation), missing the tail `wireTiles()` / `paint()` / `state.subscribe(paint)` block. autofit.js / print.js working-tree copies carry 2026-05-18 mtimes versus 2026-06-12 on the YaA source.

So: the deployed/committed apothecary on yesandeverything.com is current (v0.18.2) and intact. The "uncommitted edits" the weekly working-tree scan flagged are not real edits. They are stale and partially truncated local working-tree copies sitting **behind** HEAD.

## Why the item's remediation is dangerous

Committing the working tree (the item's first option) would overwrite the correct committed `editor.js` with the 16-line-truncated copy and revert six other src files to 2026-05-18 state, **regressing the live site and breaking the editor's illustration-picker wiring**. Do not commit this working tree.

## Correct remediation (Nick-side; shell, so it pauses per gate)

YaE's git index is corrupt (`error: index uses @<bytes>5 extension ... fatal: index file corrupt` on first access; intermittently readable due to FUSE staleness). Repair the index first, then discard the stale working-tree copies:

```powershell
cd X:\YesAndEverything
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Remove-Item .git\index            # drop the corrupt index
git reset                          # rebuild index from HEAD (no working-tree change)
git checkout -- apothecary/        # discard stale/truncated working-tree copies
git status                         # expect: apothecary/ clean
```

This is git-unstick territory (corrupt-index recovery on the FUSE mount). The `yae-index-lock-clear-2026-06-12` item is the same root cause and can close on the same pass.

## Pipeline-health conclusion

No evidence the YaA `release.ps1` skipped its `push-yae-mirror` step. The mirror content that matters (HEAD) is correct and current; the divergence is local working-tree corruption on the YaE side, not a missed mirror push. The apothecary release pipeline is behaving.

## Disposition

Reclassified pending -> blocked-on-user. All diagnostic work is done; the only remaining action is the Windows-side index repair + `git checkout -- apothecary/`, which cannot run from the sandbox (shell pauses; index repair is Windows-side). attempts NOT incremented: investigation succeeded.
