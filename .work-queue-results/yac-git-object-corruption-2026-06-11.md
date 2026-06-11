# yac-git-object-corruption-2026-06-11 result

- Started: 2026-06-11T21:08:00Z
- Finished: 2026-06-11T21:11:00Z
- Status: done
- Prompt: git object corruption in X:\YesAndChains: git status fails with 'fatal: unable to read d763fc428d6e266532bdefe0ffcf000000000000'. Run git fsck, recover the object from origin or re-clone.

## What was done

- Root cause: NOT a missing object. The reported hash is the last 14 bytes of a truncated .git/index zero-padded to 20 -- FUSE cut the index file mid-write on 2026-06-08. The object database is intact (HEAD 2c78281 readable, trees listable). No recovery from origin and no re-clone needed.
- rm on .git/index and .git/index.lock both denied from the sandbox (Operation not permitted, same FUSE boundary as the P0 portfolio lock item).
- Workaround: rebuilt a valid index from HEAD via GIT_INDEX_FILE=/tmp/yac-rebuilt-index git read-tree HEAD, then overwrote .git/index bytes in place (O_WRONLY|O_TRUNC + fsync + readback verify, 27786 bytes).
- git status now works. Working tree shows 6 modified files vs HEAD: README.md (line-endings only), app.js (+1), index.html (23 lines), manifest.json (line-endings only), src/legal-view.ts (15 lines), src/mobile-hooks-2.ts (6 lines). Real WIP preserved; nothing lost from the working tree. Whatever was staged in the corrupt index is unstaged now but present on disk.

## Files touched

- X:\YesAndChains\.git\index (rebuilt in place from HEAD)

## Followups recommended

- .git/index.lock in YaC is still present and unremovable from the sandbox; commits stay blocked until the host-side unstick (already covered by P0 wts-2026-06-05-portfolio-wide-index-lock).
- The 6-file WIP in YaC should be reviewed and shipped via release.ps1 once the lock clears.
