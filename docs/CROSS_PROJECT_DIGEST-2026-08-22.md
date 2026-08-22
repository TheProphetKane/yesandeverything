# Cross-project digest - 2026-08-22

Nightly sweep, twelve projects audited plus the four cross-cutting sweeps. Counselor is out of scope by rule.

## The night in one paragraph

Two live privacy defects on the hub, both closed: the two private usage ledgers a 2026-08-21 commit claimed to have untracked were never untracked and kept shipping in the public tree for another day, and a third private project, the federal research-credit tax-evidence folder, had already written its name and dollar cost into the tracked public usage payload uncommitted. Everything else was ordinary drift, and the pattern across it is repetition: Hordes drifted the same version skew as last night from the same cause, Budget's changelog block went stale for the third night running, Agents' unlogged delta grew from ten commits to thirteen, and this sweep's own retention step destroyed a fifth report. Four of tonight's five new queue rows are about making a recurrence impossible rather than fixing the instance.

## Per project

| Project | Version | Commits | Tree | Findings | What to look at next |
|---|---|---|---|---|---|
| Hordes | v0.99.49 | 5 | clean, pushed | 3 (1 fixed, 1 queued) | Same version skew as last night: v0.99.49 shipped as a bare commit and skipped the release script's sync. Preship parity guard queued. |
| Rising | v0.59.80 | 3 | clean, pushed | 2 (1 fixed) | Architecture doc quoted a hardcoded `hud.gd` line count in the same file that stripped line numbers to stop citing numbers that drift. Dropped. |
| Chains | v1.6.0 | 5 | clean, pushed | 2 (1 fixed) | Last night's em-dash sweep named the changelog and left 322 behind in it. Per-sentence pass queued, not a blanket replace. |
| Budget | v0.14.14 | 3 | clean, pushed | 1 (fixed) | Third night the Unreleased block went stale within a day of being filled. The gate queued on 08-21 is the fix; filling it nightly is not. |
| Scheduler | v0.7.3 | 4 | clean, pushed | 1 new (fixed), 2 carried | A request throttle with a 429 shipped on three endpoints and the security section did not mention it. Now documented. |
| Apothecary | v1.1.9 | 2 | clean, pushed | 0 new, 1 closed | Mid-word truncation on the back label is closed in code, the oldest user-visible finding here. |
| Everything | n/a | 16 | dirty from routine writers, pushed | 3 (all fixed) | **Both privacy defects.** See below. |
| Agents | v1.1.1 | 3 | clean, pushed | 1 closed, 1 re-confirmed open | A P0 still open: the console locks `.work-queue.json.lock` while both sanctioned writers lock `.work-queue.lock`, so console queue writes serialize against nothing. |
| Ring | v0.17.27 | 5 | clean, pushed | 3 (2 fixed) | The admin parity surface existed only in code. Now in the spec, including that a quiet weekly channel is not proof parity ran. |
| Cattery | v0.25.6 | 1 | clean, pushed | 0 | Third consecutive clean audit. Money-path observability work continues under the dormancy ruling, which is consistent with it. |
| Gnosis | v0.3.456 | 6 | clean, pushed | 1 closed in build, 1 downgraded | The four-night leak plateau broke: the built payloads drop from 815 records to 802 and carry none of the 13 gated names. Not deployed. |
| Skylight | 0.4.0 | 0 | clean, pushed | 0 new, 1 carried | No change. Remote parity proven byte-for-byte, snapshot chain has run three nights. |

## Cross-cutting

- **Structure check:** `python X:\verify.py` exit 0. 16 projects; root files, handlers, template, loops, dashes and bindings all clean. Note it carries: 7 decisions have no enforcing check.
- **Registry backup:** newest is `scheduled-tasks-2026-08-21.json`, 20.9 hours old, parses as JSON. Inside the 48-hour bar.
- **Audit pointers:** all 12 projects repointed at tonight's reports, canonical committed and pushed in PortfolioOps, projected copies committed and pushed in the hub.
- **Shared-core drift:** clean. No consumer copy diverges from the core, 23 command files pass frontmatter and cited-path checks, 16 skills carry no source-versus-snapshot split, and public status matches canonical for all 14 files.
- **Handler drift:** 1 handler fixed (the hub's exclude-list claim), plus one fix in this sweep's own skill table. All paths cited by all twelve handlers resolve; the 45 apparent misses are all globs, templates, hazard references or cross-repo paths.
- **Working trees:** 13 repos checked. Zero unpushed anywhere. Two dirty, both from routine writers: the hub (9 files) and PortfolioOps (4). No secret-shaped tracked file in any repo.
- **Queue:** 752 to 757 total, pending 358 to 361, two closed on evidence, five added. Zero of the 361 pending items are `auto_safe`, unchanged for weeks, so no drain routine can move this number.

## The two privacy defects

`usage-log/Counselor.jsonl` and `usage-log/Skylight.jsonl` were still in `HEAD` this pass, inside the tree GitHub Pages serves, carrying project name plus full token counts and dollar cost. The 2026-08-21 commit that was supposed to close this gitignored both files and never removed them from the index, which does nothing to a tracked file, and then two separate places in the repo asserted that it had: the queue item's resolution and a comment in `.gitignore` itself. That is why it survived a day and a nightly sweep. `git rm --cached` ran this pass on both.

Separately, the usage collector had discovered `SignalRD` and written its name, token counts and `costUSD` into the working-tree `dashboard/data/usage.json`, a tracked and publicly served file. That folder is the federal research-credit tax record and its own handler states it stays outside version control by design. It was never committed, so nothing shipped. Excluded on three surfaces this pass.

The general defect behind both is that the collector publishes every project it discovers and only a hand-maintained deny-list stops it. That is queued.

## The single most important thing waiting on Kane

**Rule on the two ledger blobs still reachable through the hub's public git history.** They are out of `HEAD` now, but every commit that carried them is still fetchable, and purging that needs an owner-authorized history rewrite which this sweep will not do unasked. The same ruling should settle whether the usage collector switches to an allow-list, so the next private folder is not published by default. Queued as `nightly-sweep-2026-08-22-yae-private-ledger-untrack-was-never-done` and `nightly-sweep-2026-08-22-yae-signalrd-telemetry-reached-public-payload`, both P1.
