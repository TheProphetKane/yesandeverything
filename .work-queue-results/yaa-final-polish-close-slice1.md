# yaa-final-polish-close — slice 1 (overnight drain 2026-06-11)

## What happened this run

1. **Repaired FUSE-truncated CHANGELOG.md in X:\YesAndApothecary.** The working copy had lost its 29-line tail (ended mid-sentence at `Layout: editor panel narro`, no trailing newline; v0.4.0 and v0.3.0 entries gone). HEAD copy was intact. Restored via Python atomic write from `git show HEAD:CHANGELOG.md` with tmp-write + fsync + readback verify at both stages. Final file: 85,626 bytes, correct tail. Working copy now matches HEAD; the truncation never reached a commit.
2. **Verified the 2026-06-11 bar-raise's two "still open" spec drifts are closed at HEAD** (the 11:26Z report predates the 15:51Z v0.17.0-v0.17.2 releases): PROJECT_SPEC section 2 area now states PNG-only with the SYMBOL_ALIASES resolution path (line 76), and section 8 carries the v0.8.2 PNG-only locked decision verbatim (line 288). Those bar-raise actions are stale and should not be re-opened.

## State of the gate (98 → done)

The remaining close-out path is short and mostly attended:

- **apothecary-preset-custom-items (P2, decision, needs Nick):** whether layout presets snapshot customItems. Note: the uncommitted `src/state.js` working-tree edit already changes the layoutPresets comment to exclude customItems, which presupposes one side of this decision. Resolve the decision before committing that line, or strip it from the commit.
- **apothecary-release-double-fire (P2, investigate):** confirmed real this run; v0.17.1 and v0.17.2 are back-to-back commits with byte-identical messages, the bump-and-stub step fired twice in one release.
- **apothecary-handler-export-png-row (P3, one-row drift fix):** add `src/util/export-png.js` to the CLAUDE.md file table.
- **Commit the in-flight tree:** PROJECT_SPEC.md (schemaVersion doc line + saved-labels localStorage key doc) and src/state.js (pending the decision above). Not committed this run: zero-byte `.git/index.lock` from Jun 8 still visible on the mount with contradictory FUSE stat results, and the state.js line presupposes an unmade decision.

One attended session covering the preset decision plus the double-fire fix, then a final patch release, closes the gate.

## Verdict note (rule 5)

The CHANGELOG truncation was the only breakage signal found on YaA this run and it is fixed. Nothing else above LOW in the product itself per the last four reviews. At the next review pass YaA's verdict should read working/in-progress, not needs-attention.
