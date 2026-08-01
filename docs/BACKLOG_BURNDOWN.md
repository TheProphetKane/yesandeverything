# Backlog burndown

Rolling report. Overwritten by the Friday 22:00 `backlog-burndown-friday` routine, which
deliberately spends the expiring weekly token budget on resolving work rather than
describing it.

**Last run: 2026-08-01** (window 22:07–00:35 local)

## Counts

| | |
|---|---|
| Considered | 576 pending + 60 blocked-on-user |
| Resolved (fixed, verified, shipped) | 6 |
| Repos shipped to GitHub | 9 |
| Dropped with evidence | 1 |
| Left blocked-on-user | 60 (unchanged) |
| Newly surfaced for Kane | 1 |

Queue depth: **576 pending before, 571 after.** The queue also gained 41 items from
concurrent routine writers while this run was working; the atomic round-trip preserved all
of them.

This run went for depth over breadth. One root cause, the PowerShell 5.1 git stderr wrap,
was strangling releases across the whole portfolio, so most of the window went into killing
it everywhere rather than closing more rows.

## Resolved

### Portfolio-wide (the headline)

`infra-release-stderr-wrap-harden-01` and `burndown-2026-07-24-release-stderr-unwind-propagate`,
the root cause of the 2026-07-27 mass-stranding incident.

PowerShell 5.1 promotes any stderr line from a native exe into a terminating error while
`$ErrorActionPreference` is `Stop`. git writes ordinary progress to stderr (`warning: LF
will be replaced by CRLF`, `To https://...`), so a successful `git add` or `git push`
aborted the release, after the commit but before the push finished, stranding completed
work with no backup and no rollback point.

`Invoke-Git` now wraps every git write in **YesAndChains, HereBeHordes, BrackishRising,
YesAndRing, YesAndApothecary, YesAndScheduler, YesAndAgents**. YesAndEverything already had
it; YesAndBudget was the reference implementation.

Each repo shipped by running its own `push-to-github.ps1`, so the script under test shipped
its own fix, and every one ran to completion past the stderr that used to abort it. Three
related bugs fell out along the way:

- **`2>&1 | ForEach-Object` on git calls** (Ring, Apothecary) was not just triggering the
  wrap. Piping made `$LASTEXITCODE` reflect the pipeline, so the `if ($LASTEXITCODE -ne 0)`
  failure check underneath it could never fire. Removing the pipe fixed the check too.
- **Push exit code read after `Confirm-GitIntact`** (Ring, Apothecary, Scheduler, HBH). That
  guard runs git itself, so it clobbered the code being tested. Now captured into
  `$pushExit` immediately after the push. Chains had already found and fixed this one.
- **Blind `Remove-Item .git\index.lock`** (BrackishRising, Chains, Scheduler) sitting inside
  the guarded script, defeating `Assert-GitSafe` from within: the guard then saw a clean
  tree and skipped the wait-then-abort written for exactly the concurrent-session race that
  has NUL-truncated `.git\config` before.

**Remaining scope on this item** (kept pending, note recorded): YesAndGnosis calls
git-guard with `&` rather than dot-sourcing it, so `Invoke-Git` is not reachable there
without restructuring; YesAndCattery has no `push-to-github.ps1` at all and runs git inline
in `release.ps1`. Neither is a one-line port.

### YesAndAgents, `9ce4342` plus tag `v1.1.0`

- `canonical-audit-2026-07-24-agents-script-route-blind-lock-delete`. The `/script` route
  prefixed every phone-triggered run with a blind `Remove-Item .git\index.lock` in the
  **target** repo, then invoked that repo's release script. Worse than a skipped guard: it
  laundered a live race into a clean-looking one, so the `Assert-GitSafe` inside the scripts
  it called found no lock and concluded there was none. Preamble removed after confirming
  all 8 target repos route git through a guarded `push-to-github.ps1`.
- `working-tree-2026-07-25-agents-v110-never-tagged`. Annotated `v1.1.0` created at
  `ee10fa9`, the 2026-07-16 release commit, and pushed.

### YesAndBudget, `e2a6f47`

`bar-raise-2026-07-30-yab-release-pipeline-ps1-stack-07`. `write-dashboard-status.ps1`
hardcoded `audit.findings` to zeros on every run, so the status page advertised 0 high /
0 med / 0 low while `CANONICAL_AUDIT-2026-07-30.md` carried a MEDIUM and a LOW. Counts now
come from the report itself (verified: writes 0/0/1/1, matching the report).

Preserving alone would not have been enough. Nothing else produces Budget's counts, so a
preserved value would freeze forever. If any heading under `## Drift found` carries no
severity, the parser returns nothing and the previous block is kept with a warning, so an
unreadable report can never masquerade as a clean one. Both paths negative-tested.

### YesAndGnosis, `d3118f7` plus YaE `a8c1252`

`bar-raise-2026-07-24-gnosis-reliability-02`. Real data loss, not just drift. The writer
rebuilt the status card from scratch on every release, dropping every block it does not
produce. `Gnosis.json` had shrunk to 687 bytes against siblings' 40-80KB, and the
2026-07-24 bar-raise (verdict `needs-attention`, **10 open actions**) was gone. Writer now
carries `barRaise` and `audit` through; serializer depth raised 6 to 10 so the nested
`actions[]` survives. Lost block recovered from `c77f198` and the writer re-run to prove it
now survives.

Also pushed a stranded commit (`e76bdf6`, a Council of Elder Orbs lore fix) that was sitting
committed-but-unpushed, exactly the failure mode above.

## Dropped, with evidence

`bar-raise-2026-07-24-agents-audit-loop-prune-scope` claimed the nightly audit's retention
block deletes the newest bar-raise report. It does not. The wording is "only the newest of
each type remains", which prunes within each type independently. Checked all 11 project
`docs/` folders: newest `BAR_RAISE-*` and newest `CANONICAL_AUDIT-*` are both present in
every one. No cross-type deletion is happening.

## Blocked on Kane

### New this run

**Does the portfolio tag releases, or not?**

`working-tree-2026-07-25-agents-v110-never-tagged` was written as "Agents shipped v1.1.0 but
the last tag is v1.0.0". Tagging it exposed the bigger question: **no project in the
portfolio tags releases at all.** Budget, Chains, HBH, BrackishRising, Apothecary, Ring and
Scheduler have zero tags, and not one release script has a tag step. Agents having a
`v1.0.0` was the anomaly, not the missing `v1.1.0`.

So either every release script grows a tag step, or the tag concept gets dropped and the two
Agents tags are the vestige. Both are defensible, it is a process call, and it touches 8
repos, so it was not guessed at. `v1.1.0` was tagged to close the specific row and make
Agents internally consistent; the portfolio-wide decision is yours.

### Standing (60 items, unchanged)

By project: skylight 14, cattery 9, yab 8, ring 8, gnosis 5, hordes 4, chains 3, scheduler
3, everything 2, yac 2, hbh 2.

The one that should not keep waiting:

**`canonical-audit-2026-07-16-cattery-orders-cascade-prod-unapplied` (P0).** Cattery
production still has `ON DELETE CASCADE` on `orders.cattery_id`. Migration 0019 was authored
but never applied, live-verified 2026-07-16, and it has now sat **16 days**. It is the only
P0 in the whole queue. Deleting a cattery row silently destroys its order history. Applying
a migration to production is a schema change against live data, so it is deliberately not
something this routine touches.

Ring carries four P1s from the same 2026-07-07 bar-raise (worker observability, community
ratings backup, dual-write atomicity, GDPR data endpoints) that have been re-verified
read-only several times and still hold. They are waiting on product decisions, not on
diagnosis.

## Ship-verify gate

**All touched repos clean and pushed.** Verified with `git status --porcelain` (empty) and
`git log --oneline "@{u}..HEAD"` (empty) for YesAndBudget, YesAndAgents, YesAndChains,
HereBeHordes, BrackishRising, YesAndRing, YesAndApothecary, YesAndScheduler, YesAndGnosis.

YesAndEverything shows only live-churn files (`dashboard/data/*`, `usage-log/*`,
`status/data/*`, `.work-queue.json`), which the gate permits; the Gnosis status restore was
committed and pushed scoped as `a8c1252`.

No repo was left committed-but-unpushed or edited-but-uncommitted.

## Note on release discipline

Fixes this run shipped as scoped commits rather than full `release.ps1` runs, which the
routine permits. The standing rule is to ship via the project release script; a version bump
plus changelog stub per repo for what are internal tooling fixes would have put eight
cosmetic releases on the board in one night. Agents was the exception and went through its
real `release.ps1`, which is how the stderr abort got caught in the act.
