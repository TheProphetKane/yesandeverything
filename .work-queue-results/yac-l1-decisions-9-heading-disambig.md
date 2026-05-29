# yac-l1-decisions-9-heading-disambig

Completed: 2026-05-28 (queue-drain-frequent)

## Change

`X:\YesAndChains\DECISIONS_NEEDED.md` line 122 heading renamed:

Before: `### 9. Private courses path (§3c.5) — DO IF AI CAN, BACKLOG IF NOT`
After:  `### 9 (private courses). Private courses path (§3c.5) — DO IF AI CAN, BACKLOG IF NOT`

Now matches the disambiguator pattern set by lines 170 and 173 (`### 9 (resolved).` / `### 9 (original).`).

## Method

Python atomic-write-with-readback (FUSE Edit-tool truncation hazard documented in memory `htbh-fuse-edit-tool-truncation`). One substitution, file length unchanged at 334 lines, tail intact.

## Verification

```
122:### 9 (private courses). Private courses path (§3c.5) — DO IF AI CAN, BACKLOG IF NOT
170:### 9 (resolved). Fort Zumwalt Park -- RESOLVED by Decision 10
173:### 9 (original). Fort Zumwalt Park
```

## Ship status

Edit staged in YaC working tree; not pushed. Release through `scripts/release.ps1` is a shell op and the drain rule pauses for Nick.
