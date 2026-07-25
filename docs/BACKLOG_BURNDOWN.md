# Backlog burndown

Rolling report. Overwritten by the Friday 22:00 `backlog-burndown-friday` routine, which
deliberately spends the expiring weekly token budget on resolving work rather than
describing it.

**Last run: 2026-07-24**

## Counts

| | |
|---|---|
| Considered (read and ranked) | 309 pending + 33 blocked/deferred |
| Worked end to end | 49 |
| **Resolved** | **45** |
| Shipped through a release script | 34, across 16 releases in 5 repos |
| Dropped as stale | 0 |
| Newly escalated to Kane | 4 |

**Queue depth: 309 pending at 22:00 -> 244 pending at 23:35.**

The 98 unpruned terminal items are also gone: the queue closed the night at 244 pending /
54 blocked-on-user / 10 deferred, with the last handful of completions pruned inline. Not
all of the 65-item drop is mine - the hourly drain fired during the run and its severity
guard escalated a batch of aging structural items to `blocked-on-user`, which is why that
bucket went 29 -> 54 while I added only 4.

Sixteen releases: Chains v0.58.0 through v0.58.3, Budget v0.14.6 through v0.14.10,
Rising v0.59.46 and v0.59.47, Hordes twice at v0.99.40, and seven scoped YaE commits.

---

## Resolved

### YesAndEverything (28)

**Security and exposure**

- **`yae-public-link-to-gated-mirrors`** (P0, open for TEN runs) - all eight public anchors
  into the robots-disallowed GDD mirrors now point at the client-gated `design.html` pages;
  404 link deleted, legacy stub's canonical tag dropped. Re-grepped: zero hits outside the
  mirrors. `4c22697`.
- **`yae-gate-secret-in-tracked-public-doc`** + **`yae-gate-secret-republished-in-status-json`** -
  `CLAUDE.md` now points at `X:\.secrets` instead of quoting the gate phrase, and the literal
  came out of the skill-review artifacts, the status JSON and the queue/dashboard JSONs.
  `check-status-json.ps1` gained a guard that reads the live literals out of the mirror pages
  and fails the release if a status JSON republishes one - it stores no secret itself.
  Verified: passes clean, fails on a planted literal. `4b71fa5`.
- **`yae-budget-auditable-claim-404`** - six anchors on the Plaid-facing Budget compliance
  pages pointed at a repo the GitHub API confirms is private. Rewritten as plain text, and
  the privacy page no longer claims the source "is auditable". `5c2d9ef`.

**The homepage said six projects against nine cards, and had for ten runs**

- **`yae-hero-stats-stale-count`**, **`yae-intro-prose-six-omits-three`**,
  **`yae-meta-og-omits-cattery-gnosis`**, **`yae-sitemap-page-six-of-nine`**,
  **`yae-ring-status-label-contradiction`** - every count and list was typed by hand. The
  stat strip now counts `.project` articles and their status class at runtime, and
  `update-project-pages.mjs` regenerates the meta/og/twitter descriptions and the JSON-LD
  `hasPart` from the same `SLUGS` registry that gates the cards - it throws if a slug ships
  without public copy. Verified live. `1e9c1f4`.
- **`yae-sitemap-no-parity-guard`** - already shipped; verified 13 `<loc>` against 9 cards
  plus 4 static URLs and closed with evidence rather than re-doing it.

**The work queue's own plumbing**

- **`yae-queue-edit-ps-serializer-roundtrip`** - `queue-edit.ps1` was one working pwsh
  invocation away from rewriting all 600 KB of the queue into PS 5.1's `ConvertTo-Json`
  shape. It now renders through `scripts/queue_canonical_json.py`, keeping the lock, the
  tmp+parse+rename and the 5-attempt readback untouched. Verified on a scratch copy: an
  add-then-drop round trip is byte-identical bar the timestamp. `af2e2cb`.
- **`yae-queue-lock-bypassed-in-practice`** - new `scripts/queue_write.py` gives the python
  writers the same `.work-queue.lock` protocol the PowerShell helper had implemented and
  nobody took; both hourly routine SKILL.md files now require it. Verified: acquires,
  releases, blocks on a held lock, breaks a 60s-stale one.
- **`yae-queue-uncommitted-multiday-gap`** - `.gitignore` listed `.work-queue.json` while git
  tracked it, so one `git rm --cached` would have silently ended the only backup.
- **`yae-queue-terminal-items-never-pruned`** - queue now carries zero terminal rows.

**Health checks that lied**

- **`yae-status-stale-check-fails-open`** - `isStale()` returned false for a missing or
  unparseable `lastReleaseAt`. Gnosis has no such key and had been rendering fresh on the
  strength of data nobody writes. Now fails closed; verified live that Gnosis alone flipped.
- **`yae-kv-missing-key-200-empty`** - `dashboard-api` answered a missing KV key with 200 and
  `{}`, which is not null, so the dashboard would render zeroes over its last known-good
  static copy. Now 404. Verified live keys still serve, plus a stubbed-env unit test.
- **`yae-statusjson-guard-mojibake-blindspot`** - the guard globbed `status/data` only, so the
  two files the dashboard actually reads crossed no guard at all, and it could not see
  mojibake (valid UTF-8, parses clean, renders as garbage). Now covers both and matches the
  byte signatures of double-encoded punctuation. Repaired the eight live occurrences.
  `304a3b1`.
- **`yae-collect-usage-exits-zero-on-failure`** - every failure path printed a warning and
  exited 0, so the 30-minute routine reported success while the live dashboard froze on
  last-good data. Those paths now exit 1. The push branch was dead code anyway: YaE's
  `Confirm-GitIntact` clobbered `$LASTEXITCODE` exactly as Hordes' did. `b082dbb`.
- **`yae-superseded-rows-leak-to-dashboard`** + **`yae-dashboard-queue-payload-uncapped`** -
  `superseded` was missing from the terminal list, so those rows shipped as live work while
  counted in no bucket; the payload was also unbounded, at 34 rows / 19 KB three weeks ago
  and 177 / 97 KB now, pushed to KV and fetched on every dashboard load. Superseded is now
  terminal, and the rows are capped at the 60 highest-priority with `itemsTotal` and
  `itemsTruncated` published alongside so nothing hides. Counts are computed before the cap
  and now reconcile exactly at 313. Payload 97 KB -> 35 KB. `b082dbb`.
- **`yae-dashboard-aggregation-paths-diverge`** (P1) - the ALL series walked the DATA while
  every per-project bar walked the REGISTRY, so ALL counted projects that had no bar. ALL is
  now registry-scoped and the two agree by construction; anything unregistered is named in a
  "not charted" line rather than folded in. Verified against the deployed page and live data:
  old ALL $10,559.75 vs bars $10,228.43; new ALL $10,228.43, exactly equal. `2c2b84c`.
- **`yae-dashboard-usage-double-fetched`** - the enrichment re-read the same usage.json on
  load and every 5 minutes, and the comment calling it "(cached)" was wrong. It now consumes
  the payload the main render already has, which also happens to be fresher (60s vs 300s).
  `4057b89`.

**Public-page quality**

- **`yae-fg2-fg3-contrast-aa-fail`** - both muted greys failed WCAG AA against the page AND
  the card background; `--fg-3` missed even AA-large at 2.65:1. Lifted inside the same family
  to 6.61/6.24 and 5.30/5.00, ladder intact.
- **`yae-design-titles-copypaste-chains`** - three design pages carried the Chains title.
- **`yae-subpage-og-image-absent`** - every project page shared as a blank preview. All nine
  now carry the full Open Graph and twitter set; Budget and Scheduler had no canonical or OG
  markup at all.
- **`yae-external-links-missing-rel`** - eight external anchors got `target`/`rel`.
- **`yae-privacy-claim-overreaches-portfolio`** - the no-trackers line was written
  portfolio-wide but is only true of that one page; Ring loads Google Fonts and a bot check.
  It now says what it can stand behind. `14ff18a`.

### Yes& Chains (5)

- **`compliance-01`** - a paying subscriber could not cancel. `openBillingPortal()` opened
  with `if (!CHAINS_VISIBLE) return`, and that flag is false because the AI recommender is
  hidden - nothing to do with billing. Now gated on `PRO_PAYWALL_ENABLED`. **v0.58.0**.
- **`webhook-01`** - the Stripe webhook granted Pro without checking `payment_status`,
  re-applied on every at-least-once retry, dropped the subscription id, and 200-ACKed updates
  it had not applied. All four fixed, plus migration `0019`. **v0.58.0**.
- **`finance-03`** - checkout could open a *second* subscription for someone who already had
  one. Now a 409 that never touches Stripe, plus an idempotency key per user+plan+price.
  **v0.58.2**.
- **`reliability-02`** - every gated request hit Supabase live, so one blip denied a feature
  the user pays for. Positive-only 120s entitlement cache; denials never cached. Also
  corrected a comment that claimed the code fails open while it denies. **v0.58.3**.
- **`observability-01`** - `audit_dashboard.py` exists because a silent 0/0/0 once masked a
  real CRITICAL, and had regressed into exactly that. Now reads all three report formats with
  a self-check that exits 3 on anything unreadable. **v0.58.1**.

New `worker/tests/billing_webhook.test.mjs` covers all of the above (19 assertions) and is
preship gate 8d.

### Yes& Budget (6)

- **`threat-model-01`** - the CORS allow-list was flat on `/*`, so a page on
  `yesandeverything.com` could read `GET /api/transactions` and every analytics route with no
  auth to fail. New `cors-policy.ts` grants the landing page the `GET /` probe and nothing
  else; six tests including header-level proof. `DECISIONS.md` D-005 carries a dated
  correction retracting the "the API doesn't bind to a public address" rationale. **v0.14.7**.
- **`backup-cadence-02`** - backups were created by events but deleted by the clock, so a user
  who stopped importing for 30 days converged to zero; both backup directories were empty
  right then. Keeps the three newest regardless of age. **v0.14.6**.
- **`incident-runbook-currency-04`** - every documented restore said to swap the file and
  nothing about the WAL sidecars, which replay into the restored database. **v0.14.6**.
- **`threat-model-02`** - reproduced first, then corrected four docs claiming SQLCipher
  at-rest encryption is shipped and default when the live DB is plaintext. **v0.14.8**.
- **`release-pipeline-gate-page-publish-06`** - the public Budget pages claimed "no Plaid"
  while the privacy page describes pulling transactions from Plaid. `8d1e91b`.
- **`work-queue-hygiene-05`** - `queue-triage-nightly` now triages `blocked` and
  `blocked-on-user` nightly with a per-item re-verify and a mandatory unblock-condition line.

### Here Be Hordes (3)

- **`playability-05`** - `DEBUG_INFINITE_RESOURCES` was a compile-time `const true`, so every
  shipped build started with 10000 of each stockpile and no price was real. Now resolved from
  a `debug_flags` export defaulting FALSE. Verified across three headless boots: default gives
  provisions 2000 and `cap(biomass)` 50, flipping the export gives 10000 and `inf`. `de46692`.
- **`reliability-02b`** - F5/F9 gated on `not _game_over`, and `_load_run` clears the end
  state. A defeated player could overwrite a good save with an unwinnable run. `63c4534`.
- **`per-project-ps1-stack-02`** - `Confirm-GitIntact` clobbered `$LASTEXITCODE`, so a
  **failed push read as success** at four call sites. Fixed inside the guard. `63c4534`.

### Brackish Rising (3)

- **`data-integrity-01`** - `save_to` opened the live slot with `FileAccess.WRITE`, which
  truncates on open: a crash anywhere after that cost the save with nothing to fall back on.
  Now temp -> readback -> parse -> `.bak` -> rename, restoring the old save if the commit
  fails. **v0.59.46**.
- **`reliability-01`** + **`performance-02`** - the A* core was extracted in v0.59.9 and
  shipped untested, including the v0.59.26 unreachable-goal freeze fix. 33 headless assertions
  against a stub grid: optimal paths, the octile diagonal, blocked-edge routing, the diagonal
  corner rule, partial-path fallback, the `MAX_EXPANSIONS` budget, heap ordering, and exact
  spatial-index membership. Verified non-vacuous by mutating an assertion. **v0.59.47**.

### Found during the run, not from the queue

`release.ps1` aborting on git's ordinary stderr is not cosmetic. Under
`$ErrorActionPreference = "Stop"`, PowerShell 5.1 turns the `To https://github.com/...`
progress line into a terminating error, so every step **after** the push is silently skipped.
Measured cost: Budget's Step 2.5 never ran, so `status/data/Budget.json` sat at v0.14.5 for
twenty days while the app shipped v0.14.8, and the status page has been showing a stale card
the whole time. Chains' worker deploy was skipped twice tonight and run by hand.

Fixed in Budget (**v0.14.9**, **v0.14.10**): `git-guard.ps1` now defines `Invoke-Git`, which
drops the preference to `Continue` around the native call and restores it. Failure detection
is unchanged - every caller already checks `$LASTEXITCODE`. Also removed the `2>&1` redirects
in `write-dashboard-status.ps1`, which were the real cause of the long-standing "YaE-side
dashboard write failed" WARN on a write that had actually landed. Verified by a full release
running end to end with zero WARNs, the first tonight to do so. Enqueued as
`burndown-2026-07-24-release-stderr-unwind-propagate` for the other four repos.

---

## Waiting on Kane

Four decisions. Each is a real fork where two answers are both defensible, so guessing would
have been worse than surfacing.

### 1. The GDD gate: real auth, or drop the pretence?

`bar-raise-2026-07-24-hordes-gate-page-publish-01` (+ `security-03`, same decision)

`yesandeverything.com/hordes/` answers an unauthenticated GET with **both gate passwords in
cleartext**, next to a payload that decodes with plain `atob()`. Re-verified tonight.

- **(a) Real gate.** A Worker in front of `/hordes/` and `/brackish-rising/` that checks a
  secret held in Cloudflare and only then returns the payload. `publish-gdd.ps1` stops
  emitting any literal.
- **(b) Drop it.** Re-scope the mirrors as public and delete the gate.

I narrowed the exposure as far as it goes without that call: the phrase is out of `CLAUDE.md`,
the status JSONs, the skill-review artifacts and the queue, and a release that republishes it
now fails. What is left is the gate page itself, which is exactly what this decision governs.
**This is the most important open item in the portfolio.**

### 2. Chains refund policy

`bar-raise-2026-07-17-chains-compliance-02` (blocks `compliance-03`)

Chains takes real recurring payments and `legal/terms.md` contains **zero** occurrences of
subscription, billing or refund, while the upgrade modal promises "Cancel anytime - no
surprise bills". Everything else follows from how Stripe is already configured. The one thing
I will not write for you is the refund line: **"no refund for the unused part of a paid
period"** versus **"prorated refund on request"** is a real legal position, and
`legal/terms.md` is a counsel-drafted master. Give me that sentence and the section plus the
DRAFT-banner removal ship in one pass.

### 3. Chains migration `0019`

Needs running in the Supabase SQL editor, same as every other migration here. Until then the
webhook records everything except `stripe_subscription_id`; that write is deliberately
non-fatal, so entitlement keeps working and starts recording the moment you run it. The
reconciliation sweep (`dataint-01`) and dunning (`finance-02`) both need it.

### 4. Budget repo visibility

Not blocking - the truthful text is shipped. The Budget compliance pages now say the source
repo is private, because it is. If you want the auditability claim back on a Plaid-facing
privacy page, the repo has to go public.

---

## Notes on the run

- **Nothing was dropped.** No item was archived as stale; everything touched was either
  resolved with evidence or escalated with a named decision.
- **No guard was loosened.** Two Budget tests failed after the backup keep-floor landed
  because their setup planted a single stale file the floor now protects. I gave them enough
  backups to clear the floor so they still measure the once-per-day gate, rather than
  weakening the assertions. Rising's `release-descriptive` gate caught a missing GDD footer
  entry from my own earlier release; I wrote the entry rather than bypassing the gate.
- **One pre-existing uncommitted change was swept.** `apps/api/src/backup.ts` carried a
  one-line doc-comment correction from an earlier routine at 02:51. I verified it against the
  code before including it in v0.14.6.
- **Corrections to two findings.** `work-queue-hygiene-05` claimed `blocked`/`blocked-on-user`
  had zero readers; they now have two, but both weekly, so the nightly surface it asked for
  was still missing and was added. `archive-not-clean-terminal-store` cites 4 duplicate ids;
  it is now 108, re-measured and noted on the item.
- **Two release scripts write low-information changelog entries** when invoked without a
  message. Rising did it twice tonight and I replaced both with real entries; Budget's script
  refuses to do it at all, which is the better design.
