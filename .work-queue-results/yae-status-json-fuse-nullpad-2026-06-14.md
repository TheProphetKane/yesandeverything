# yae-status-json-fuse-nullpad-2026-06-14 - guard hardening

Run: 2026-06-14 overnight-queue-drain. Status: committed-ready (guard half).

## Problem

The 06:33 dashboard writers (each project `release.ps1` dashboard-JSON writer + the
bar-raise status writer) routinely leave `status/data/*.json` working-tree files
null-padded on the FUSE mount: a valid JSON body followed by a run of 0x00. On
2026-06-14, Budget/Chains/Hordes/Rising/Scheduler each carried 183-823 trailing NUL
bytes, so `json.load` failed with "Extra data". HEAD blobs were clean (live dashboard
unaffected) and the de-nulled bodies equalled HEAD. The old `check-status-json.ps1`
(YaE release Step-0 guard) treated any NUL as fatal, so this padding would trip the
release every morning and force a manual restore.

## Change

`scripts/check-status-json.ps1` rewritten to distinguish recoverable trailing-NUL pad
from real corruption:

- Reads bytes (`ReadAllBytes`), measures the trailing-NUL run, and computes the real
  body length.
- Fails hard on: empty file, all-NUL, **embedded** NUL anywhere before the trailing run
  (genuine mid-file truncation), non-brace tail, or JSON parse failure.
- When the body is valid but trailing NULs are present, **heals** the working-tree file
  byte-exact: copy `bytes[0..end)` -> write `$path.tmp` -> `Move-Item -Force` -> read back
  and compare every byte. Reports each healed file; only fails if the readback mismatches.
- Exit 0 when clean or successfully healed; exit 1 listing bad files (unchanged contract).

## Verification

No `pwsh` in the sandbox, so the `.ps1` was not executed directly. The algorithm was
ported to Python and unit-tested on seven inputs:

| case | result |
|---|---|
| clean (ends `}`) | pass |
| trailing NUL x183 | heal, body byte-exact to original |
| embedded NUL | fail |
| empty | fail |
| all NUL | fail |
| non-brace tail | fail |
| truncated/bad JSON | fail |

The PowerShell is a direct transcription of this validated logic using standard .NET
APIs (`System.IO.File`, `System.Array.Copy`, `System.Text.Encoding.UTF8`).

## Remaining (separate, cross-repo - not this item)

Root-cause the producer side: each project `release.ps1` dashboard-JSON writer and the
bar-raise status writer should write atomically (tmp + fsync + replace) so the pad stops
being generated upstream. That spans HBH/BR/YaC/Scheduler/YaB repos and is a distinct
unit from this YaE guard fix.

## Ship

Doc/script change only, committed-ready. Ship from Windows:

    cd X:\YesAndEverything
    .\scripts\release.ps1

Note: YaE git index is reportedly corrupt (see `yae-index-lock-clear-2026-06-12`); clear
that first or the release Step will stall.
