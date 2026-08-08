# Backlog burndown

Rolling report. Overwritten by the Friday 22:00 `backlog-burndown-friday` routine, which
deliberately spends the expiring weekly token budget on resolving work rather than
describing it.

**Last run: 2026-08-07** (window 22:07–00:10 local)

## Counts

| | |
|---|---|
| Considered | 672 pending + 57 blocked-on-user |
| Resolved (fixed, verified, shipped) | 7 |
| Dropped with evidence | 1 |
| Repos touched | 2 (YaAg, Scheduler) — both clean + pushed |
| Left blocked-on-user | 57 (unchanged this run) |

Queue depth: **672 pending before, 664 after.**

This run went for depth over breadth: two repos, fully finished and verified, rather than
a wide shallow sweep. 672 pending judgment-bound items (auto_safe is false on effectively
all of them) is far more than one window can clear; see the blocked-on-user note below on
why the queue keeps growing faster than the daily/Friday drain can close it.

## Resolved

### Yes& Agents (YaAg)

- `yaag-runs-plaintext-credential-exposure` — the code fix (scrub known secret shapes from
  future run receipts) had already shipped this morning (commit c7144b0), but two old
  `runs/*.jsonl` receipts from a June 18 password-recovery session still held the live
  dashboard gate password in plaintext plus a full brute-force candidate-password
  dictionary and its SHA-256 hashes, sitting on disk and re-servable over `GET /runs/:file`.
  Redacted both in place. One redaction pass corrupted a JSON record (a regex lookbehind
  matched a real newline instead of the intended literal `\n`, eating the JSON envelope);
  repaired by reconstructing the `tool_result` wrapper from the adjacent `tool_use` id.
  Verified every `runs/*.jsonl` file parses as valid JSONL and zero password-shaped or
  64-hex-hash strings remain anywhere in `runs/`.
- `yaag-loadprojects-destroys-registrations-on-parse-fail` — already shipped this morning
  (commit 18f1781, backs up `projects.json` before overwriting with defaults). Verified on
  `origin/main`, nothing to do.
- `yaag-queue-drain-hourly-disabled-6-days` — **dropped, not a regression.** The task's own
  SKILL.md description documents the 2026-07-30 disable as an intentional consolidation
  ("real judgment drain lives in backlog-burndown-daily/-friday"), and both replacement
  routines are confirmed live and running on schedule. The underlying complaint (chronic
  findings not closing) is real but is a capacity problem for the daily/Friday judgment
  drain, not something re-enabling an auto-safe-only hourly pass would touch — auto_safe is
  false on essentially the entire pending pool. See blocked-on-user below.

### Yes& Scheduler — shipped v0.7.3

- `bar-raise-2026-08-05-scheduler-hono-cve` / `-react-router-cve` — bumped `hono` to
  `^4.13.1` and `react-router-dom` to `^7.18.2`, closing both flagged CVE ranges.
- `bar-raise-2026-08-05-scheduler-replacejointable-nonatomic` — `replaceJoinTable`
  (users.ts) now issues its DELETE + INSERTs as one `db.batch()` instead of separate round
  trips.
- `bar-raise-2026-08-05-scheduler-swap-assignment-nonatomic` — the change-request swap
  decision (`applyDecision` in change-requests.ts) batches its DELETE + INSERT OR IGNORE so
  a shift can't end up assigned to neither party.
- `bar-raise-2026-08-05-scheduler-shift-assignment-race` — migration 0012 adds
  `UNIQUE(shift_id, user_id)` (dedupes first). The open-shift claim handler and the manager
  manual-add path now enforce capacity + dedup inside the INSERT itself via a guarded
  subquery, not a separate SELECT the write could race behind.

All five verified via `pnpm run verify` (typecheck + 139 tests + build, all green — one
test's hardcoded `schema_version` fixture was updated for migration 0012) and the migration
was dry-run against local D1 before shipping. Released as v0.7.3: pushed to
`origin/main` (commit 1d54364), migration applied to remote D1, Worker deployed, Discord
notified.

## Ship-verify gate

- **YaAg** — `git status --porcelain` clean, no unpushed commits. (`runs/*.jsonl` edits are
  gitignored local files, not a git concern.)
- **YaScheduler** — `git status --porcelain` clean, no unpushed commits, remote D1 schema
  confirmed at 0012, Worker deployed.
- **YaE** (this repo) — dirty only with expected live-churn files
  (`.work-queue.json`, `dashboard/data/*`, `status/data/*`, `usage-log/*`) written by the
  Scheduler release's cross-repo dashboard/usage sync; no code changes pending here.

## Blocked on Kane

**Queue throughput.** 672 items were pending at the start of this run and 664 remain —
the daily + Friday judgment drains are not keeping pace with intake (portfolio-wide item
count has grown steadily week over week per `yaag-queue-drain-hourly-disabled-6-days`'s
own finding). Nothing here needs a decision to *start* — auto_safe is false on nearly the
whole pool by design (everything is judgment-bound) — but at this size, the real question
is whether the current cadence (backlog-burndown-daily + -friday only) is enough, or
whether some class of routine (e.g. per-project bar-raise output) should be tuned down so
it stops out-producing what the drain can close. No action taken; flagging so it doesn't
stay invisible.

No other new blocked-on-user items surfaced this run (57 pre-existing ones untouched).
