# yae-durability-probe-readout-2026-06-13 result

- Started: 2026-06-12T10:03:39Z
- Finished: 2026-06-12T10:08:00Z
- Status: done
- Prompt: read out the four .loop-durability-{a,b,c,d}-20260612 probes from a fresh session, append the survival matrix to docs/TRUNCATION_INVESTIGATION-2026-06-12.md, pick the mitigation per its decision table.

## What was done

- Verified readout-gate validity: probes' host mtimes are 08:36:14Z; the 10:05Z stamp was the writer's pre-set readout horizon (confirmed by clock probe: this mount stamps mtimes from the writing sandbox's clock, and this session's clock agrees with its own stamps). Waited until 10:05:28Z, after the stated gate, then re-verified.
- Survival matrix: ALL FOUR probes survived byte-exact (size + sha256 prefix match on every method: plain write, write+fsync, fsync+os.replace, fsync+sync(1)). Cross-checked probe c via the canonical Read path in addition to sha256 on the mount.
- Appended the readout section + matrix to docs/TRUNCATION_INVESTIGATION-2026-06-12.md (atomic write, readback verified, tail intact, then sync(1)).
- Mitigation per the decision table ("all survive -> teardown-race + idle delay"): end every write-heavy sandbox run with global sync(1) plus a >=10s idle before the final reply; keep cross-session verification and host-side release.ps1 integrity gates in force; fsync/os.replace stay as partial-write insurance only.
- Caveat recorded: the writer ended with a global sync(1) after writing all four, so this round cannot isolate per-method durability; the operative variable is time-before-teardown.

## Files touched

- X:\YesAndEverything\docs\TRUNCATION_INVESTIGATION-2026-06-12.md (appended readout section)
- X:\YesAndEverything\.work-queue.json (item closed)
- X:\YesAndEverything\.work-queue-breadcrumb.log (one line)
- X:\YesAndEverything\.loop-clockprobe-tmp (residual, EPERM on rm, .loop-* gitignored; delete host-side)

## Followups recommended

- Adopt the sync(1)+idle tail in the loop/drain operating procedure (this run already follows it).
- The four .loop-durability-* probes + .loop-clockprobe-tmp can be deleted host-side; gitignored, no urgency.
- Round 3 (optional): repeat with NO trailing sync(1) in the writer to isolate whether sync is required or write-back alone suffices given idle time.
