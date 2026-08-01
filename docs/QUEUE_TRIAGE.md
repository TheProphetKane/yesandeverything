# Queue triage (rolling)

Single living triage doc for `.work-queue.json`. Supersedes the dated
`QUEUE_TRIAGE-YYYY-MM-DD.md` snapshots and `QUEUE_PIPELINE_DIAGNOSIS-*.md`,
which were folded in here and removed; their point-in-time history remains in
git. The nightly queue-triage task overwrites the "Current state" section below
on each run, so this file always reflects the latest pass rather than spawning a
new dated file.

Last pass: 2026-08-01.
## Current state

Pass: `nightly-sweep` (consolidated portfolio pass), 2026-08-01. Queue read and written through `scripts/queue_write.py`, which takes the shared lock and verifies the readback.

### Depth

| Measure | Count |
|---|---|
| Total items | **619** (606 on entry, +13 added by tonight's sweep) |
| `pending` | 548 |
| `blocked-on-user` | 60 |
| `deferred` | 10 |
| `completed` | 1 |
| Promptless (structurally undrainable) | **0** |

**Every pending item is `auto_safe: false`** - 548 of 548. The auto-safe pool is not low, it is empty, which matches the standing record that this queue is essentially all judgment-bound. Nothing an unattended drain can take without a decision.

The promptless count being zero is a real improvement: the class of items sitting at `attempts: 0` with a blank `prompt`, and therefore incapable of ever draining, has been cleared.

### Aged structural items (`auto_safe: false`, `pending`, older than 7 days)

**203 items.** Severity: 155 medium, **39 high**, 8 low, 1 unset. Priority: 154 P2, **39 P1**, 10 P3.

By project: hordes 103, everything 25, rising 19, gnosis 11, ring 10, agents 8, chains 7, skylight 5.

Nothing in the queue is older than **15 days**, so the backlog is being worked. What is accumulating is one specific band.

### The finding that matters: the aged P1 band has never been attempted

All **39** aged P1/high items carry `attempts: 0`. Not one has been picked up and failed. It is a clean 39 out of 39, not a mixed distribution.

That changes the correct disposition. The severity guard says never archive `high`/`P0`/`P1` and to set `blocked-on-user` with a `drainNote` instead. **That was deliberately not applied here**, because `blocked-on-user` would assert something untrue: these items are not waiting on Kane, they were never started. Marking them so would misrepresent their state and would also hide them from `backlog-burndown-daily`, which is explicitly authorized to attempt judgment-bound work.

Disposition this run: **leave all 39 pending, and report that the burndown is not reaching them.**

Supporting evidence: `backlog-burndown-friday` ran at 03:07 today, about three and a half hours before this sweep, and the aged P1 band came out of it unchanged at `attempts: 0`. The oldest were queued on 2026-07-17.

Hordes alone accounts for 103 of the 203 aged items and 12 of the 39 aged P1s. That is not neglect of Hordes specifically: its canonical doc is `docs/GDD.html`, and `CLAUDE.md` binds any GDD edit to a version bump plus a changelog entry plus a release, none of which an unattended routine may do. Every GDD-side finding is queued by construction and can only drain in an attended session. Six consecutive nightly passes have recorded an empty Applied section there for exactly this reason.

### Actions taken

- **Archived: 0.** No aged item was archived. The 8 aged `low` items are the only ones the guard would permit, and none is stale enough to be worth losing.
- **Status changes: 0**, for the reason above.
- **Closed: 1.** `bar-raise-2026-07-24-gnosis-reliability-02` marked `completed` - `d3118f7` fixed the Gnosis status-writer clobber at its source instead of restoring the block a third time. Its `drainNote` records what was fixed and what remains, so the residue is not lost with the close.
- **Schema normalisation: 13.** Tonight's new items were written with a `createdAt` field; this queue's actual date key is `added`. All 13 were rewritten to use `added`, plus the `kind` and `attempts` defaults the rest of the corpus carries. Without this they would have been invisible to every future age-based triage pass.

### Intake vs close

Tonight added 13 and closed 1. `backlog-burndown-daily` targets intake + 2 with a floor of 5, so tomorrow needs to close at least 15 to hold the line. On current evidence it will not, and the shortfall will sit in the high-severity band rather than the tail.

### Recommendation

This queue does not need triage. It needs the burndown to reach the P1 band, or an explicit decision that those 39 are attended-session work and should move to `blocked-on-user` deliberately rather than by a nightly's guess. Archiving further down the tail would only improve the numbers while leaving the same 39 items untouched.
