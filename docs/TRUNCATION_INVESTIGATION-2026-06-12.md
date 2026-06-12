# Truncation-source investigation, round 2 (2026-06-12)

Queue item: yae-truncation-source-investigation-2026-06-12 (P1). Builds on the 2026-06-11 round
(.work-queue-results/yae-truncation-source-investigation-2026-06-11.md). Three event windows in scope:
06-08..10 mass 19-file cut, 06-11 recurrence (brackish-rising/index.html 16:18, apothecary
herb-to-illustration.json 20:45), 06-12 live Edit-tool cut of CLAUDE.md at 08:11 plus the 06:45
status-JSON NUL-pad repairs. Sibling-repo hits the same days (YaA CHANGELOG/release.ps1, BR
CHANGELOG/GDD/project.godot/release.ps1) carry the same shapes.

## Verdict

The writer is not a script, a skill, or the Edit tool. It is write-back loss at the sandbox-to-host
storage boundary. The mount chain is: Windows folder -> virtiofs share (/mnt/.virtiofs-root/shared/x/...)
-> FUSE mount inside an ephemeral Linux sandbox. Writes from any sandbox session land in the sandbox
page cache and report success; same-session readback (including os.fsync + re-open + byte compare) is
served from that cache and always matches. If the session tears down before write-back to the host
completes, the host keeps whatever subset of pages arrived. Every observed corruption shape maps to a
write-back outcome:

| Shape | Mechanism | Examples |
|---|---|---|
| 0-byte file | create landed, no data pages did | 33 of 46 hourly .loop-unlink probes, Jun 9-10 |
| Correct size, NUL padding | size metadata landed, data pages did not | work/index.html (476 real + 16,618 NUL); BR/YaA status JSONs 06-12 |
| Tail cut mid-token | leading pages landed, tail pages did not | index.html, both GDD gates, CLAUDE.md 06-12, brackish-rising/index.html 06-11 |

## Evidence

1. **Measured loss rate.** The hourly loop tick writes a small probe at :02 and the session ends right
   after. Of 46 probes Jun 8 22:02 .. Jun 10 19:03, 33 are 0-byte: a 72% loss rate for end-of-session
   writes. Survivors cluster at hours with longer-lived sessions (04/08/12 on Jun 9 matches the
   every-4-hours queue drain; 06:02-07:02 on Jun 10 matches the 06:00 audit window). The longer a
   session lives past the write, the better the odds the write reaches the host.
2. **Victim mtimes sit at session-end windows, across repos.** The mass-event victims carry mtimes inside
   the 06-10 18:13 bulk-write session (commit b92bd1f committed one truncated file directly). The 06-11
   recurrences (16:18, 20:45) are the audit restore pass and the evening dashboard session: the restores
   themselves were flush-lost after a clean readback. The 06-12 CLAUDE.md cut happened during the audit
   that caught it.
3. **fsync is not a durability barrier here.** scripts/collect-usage.ps1 was re-truncated on 06-11 at
   16:20 after an atomic write + fsync + readback that passed. Matches round-1 finding; now explained.
4. **Correction to the 06-11 report.** Its evidence point that scripts/schedule/logs/*.log "end in null
   bytes" is wrong: those logs are UTF-16LE with BOM (PowerShell default), NUL-interleaved by encoding,
   intact back to 05-27. The 0-byte probe half of that point stands; the log half is retracted.
5. **Host-side writes are clean.** Schedule logs and release-script outputs written on the Windows side
   show no corruption in any window. The loss is specific to sandbox-side writes.

## Durability experiment (read out NEXT run)

Four probes written 2026-06-12T10:05Z at repo root, then a global sync(1). A FUTURE session must
re-read them; same-session verification is meaningless by the mechanism above.

| File | Method | Expected bytes | sha256 prefix |
|---|---|---|---|
| .loop-durability-a-20260612 | plain write | 43 | e1f1bc0adc52 |
| .loop-durability-b-20260612 | write+fsync | 37 | feba40586006 |
| .loop-durability-c-20260612 | fsync+os.replace | 45 | 47071a211718 |
| .loop-durability-d-20260612 | fsync then sync(1) | 42 | 43eebc2e4a2e |

If d survives where a-c fail, end every write-heavy sandbox run with sync(1). If all survive, the loss
needs a teardown-race trigger and the mitigation is the idle delay. If all fail, sandbox writes need a
host-side commit step to be considered durable at all.

## Mitigations, ranked

1. **Cross-session verification only.** A write is unconfirmed until a later session re-reads it from
   the host. The verify-before-overwrite guards in the status writers already follow this; extend the
   habit to every restoration pass (re-verify last run's restores before doing new work).
2. **End write-heavy sandbox runs with sync(1) plus a short idle**, pending the probe readout.
3. **Keep commits host-side with integrity gates.** release.ps1 on each repo is the durability barrier
   that actually works; every release script needs a Test-GddIntegrity-shaped pre-commit gate (tail must
   close, JSON must parse) so a corrupt sandbox write can never ship. HBH/YaA/YaE have gates; audit the
   other repos.
4. **Report upstream.** This is a Cowork platform defect (virtiofs write-back loss on ephemeral session
   teardown), not fixable from inside. Worth a thumbs-down report with this doc attached.

## Files touched this run

- docs/TRUNCATION_INVESTIGATION-2026-06-12.md (this report)
- .loop-durability-{a,b,c,d}-20260612 (experiment probes, gitignored via .loop-*)
- .work-queue.json (item status + notes, new probe-readout item)
- .work-queue-breadcrumb.log (one line)

## Probe readout (2026-06-12T10:05Z, fresh session)

Readout performed by the overnight queue drain (item yae-durability-probe-readout-2026-06-13), a
fresh session distinct from the writer. Host mtimes on all four probes are 08:36:14Z; the 10:05Z
stamp was the writer's pre-set readout horizon, not the write time, so roughly 89 minutes and at
least one full session teardown sit between write and readout. Verified twice (10:03Z and 10:05Z)
via sha256 on the sandbox mount plus a canonical Read-path content check on probe c.

| File | Method | Expected | Observed | Survived |
|---|---|---|---|---|
| .loop-durability-a-20260612 | plain write | 43 / e1f1bc0adc52 | 43 / e1f1bc0adc52 | yes |
| .loop-durability-b-20260612 | write+fsync | 37 / feba40586006 | 37 / feba40586006 | yes |
| .loop-durability-c-20260612 | fsync+os.replace | 45 / 47071a211718 | 45 / 47071a211718 | yes |
| .loop-durability-d-20260612 | fsync then sync(1) | 42 / 43eebc2e4a2e | 42 / 43eebc2e4a2e | yes |

**Outcome: all four survive, including the plain unfsynced write.** Per the decision table above,
the loss mechanism needs a teardown-race trigger: write-back from sandbox page cache to host
completes on its own given time, regardless of fsync discipline, and corruption occurs only when
the session tears down before write-back finishes. Note the writer session ended with a global
sync(1) after all four probes, so this round cannot separate "sync flushed everything" from
"write-back completed naturally"; either way the operative variable is time-before-teardown, not
per-file flush method.

**Mitigation selected: teardown-race + idle delay.** Concretely:

1. End every write-heavy sandbox run with a global sync(1) followed by a short idle (>= 10s)
   before the final reply, so teardown never races the flush.
2. Keep cross-session verification (mitigation 1) as the only accepted proof of durability; a
   same-session readback remains meaningless.
3. Keep host-side commit gates (mitigation 3) in force; release.ps1 integrity checks stay the
   real durability barrier.
4. fsync and os.replace add no host durability here (probe a survived without either) but stay in
   the atomic-write pattern as insurance against partial in-sandbox writes.

Residual artifact: .loop-clockprobe-tmp at the YaE root, created during readout to confirm mtime
semantics; rm returns EPERM from the sandbox. Covered by the .loop-* gitignore pattern; delete
host-side whenever convenient.
