# Backlog burndown

Rolling report. Overwritten by the Friday 22:00 `backlog-burndown-friday` routine, which
deliberately spends the expiring weekly token budget on resolving work rather than
describing it.

**Last run: 2026-07-24**

## Counts

| | |
|---|---|
| Considered (read and ranked) | 309 pending + 33 blocked/deferred |
| Worked end to end | 30 |
| **Resolved** | **26** |
| Shipped through a release script | 22 (11 releases across 5 repos) |
| Dropped as stale | 0 |
| Newly escalated to Kane | 4 |

**Queue depth: 309 pending at 22:00 -> 262 pending at 23:40.**
Not all of that 47 is mine: the hourly drain fired twice during the run and its severity
guard escalated a batch of aging structural items to `blocked-on-user`, which is why that
bucket went 29 -> 54 while I only added 4. My 26 resolutions were pruned into
`.work-queue-archive.json` by the same drain, which is the intended flow.

Eleven releases: Chains v0.58.0 and v0.58.1, Budget v0.14.6 / v0.14.7 / v0.14.8,
Rising v0.59.46, Hordes twice at v0.99.40, and four scoped YaE commits.

---

## Resolved

### YesAndEverything (13)

- **`yae-public-link-to-gated-mirrors`** (P0, open for TEN runs) - all eight public anchors
  into the robots-disallowed GDD mirrors now point at the client-gated `design.html` pages;
  404 link deleted, legacy stub's canonical tag dropped. Re-grepped: zero hits outside the
  mirrors. YaE `4c22697`.
- **`yae-gate-secret-in-tracked-public-doc`** - `CLAUDE.md` pointed at `X:\.secrets` instead
  of quoting the gate phrase; the literal also came out of the skill-review artifacts, the
  status JSON and the queue/dashboard JSONs. YaE `4b71fa5`.
- **`yae-gate-secret-republished-in-status-json`** - `check-status-json.ps1` now reads the
  live literals out of the mirror pages and fails the release if a status JSON republishes
  one. Stores no secret itself. Verified: passes clean, fails on a planted literal.
- **`yae-hero-stats-stale-count`**, **`yae-intro-prose-six-omits-three`**,
  **`yae-meta-og-omits-cattery-gnosis`**, **`yae-sitemap-page-six-of-nine`**,
  **`yae-ring-status-label-contradiction`** - the homepage said six or seven projects
  against nine cards, and had for ten review passes, because every count and list was typed
  by hand. The stat strip now counts `.project` articles and their status class at runtime,
  and `update-project-pages.mjs` regenerates the meta/og/twitter descriptions and the
  JSON-LD `hasPart` from the same `SLUGS` registry that gates the cards - it throws if a
  slug ships without public copy. Verified live. YaE `1e9c1f4`.
- **`yae-queue-edit-ps-serializer-roundtrip`** - `queue-edit.ps1` was one working pwsh
  invocation away from rewriting all 600 KB of the queue into PS 5.1's `ConvertTo-Json`
  shape. It now hands the object to `scripts/queue_canonical_json.py` to render, keeping the
  lock, the tmp+parse+rename and the 5-attempt readback untouched. Verified on a scratch
  copy: an add-then-drop round trip is byte-identical bar the timestamp. YaE `af2e2cb`.
- **`yae-queue-lock-bypassed-in-practice`** - new `scripts/queue_write.py` gives the python
  writers the same `.work-queue.lock` protocol the PowerShell helper already implemented and
  nobody took; both hourly routine SKILL.md files now require it. Verified: acquires,
  releases, blocks on a held lock, breaks a 60s-stale one.
- **`yae-queue-uncommitted-multiday-gap`** - `.gitignore` listed `.work-queue.json` while
  git tracked it, so one `git rm --cached` would have silently ended the only backup. Fixed,
  and the drain now has to commit the queue with an explicit pathspec.
- **`yae-budget-auditable-claim-404`** - six anchors on the Plaid-facing Budget compliance
  pages pointed at a repo the GitHub API confirms is private. Rewritten as plain text, and
  the privacy page no longer claims the source "is auditable". YaE `5c2d9ef`.
- **`yae-sitemap-no-parity-guard`** - already shipped; verified 13 `<loc>` against 9 cards
  plus 4 static URLs and closed with evidence rather than re-doing it.

### Yes& Chains (3)

- **`compliance-01`** - a paying subscriber could not cancel. `openBillingPortal()` opened
  with `if (!CHAINS_VISIBLE) return`, and that flag is false because the AI recommender is
  hidden - nothing to do with billing. The "Manage / cancel subscription" button rendered
  for every subscriber and did nothing. Now gated on `PRO_PAYWALL_ENABLED`. **v0.58.0**.
- **`webhook-01`** - the Stripe webhook granted Pro without checking `payment_status`,
  re-applied on every at-least-once retry, dropped the subscription id, and 200-ACKed
  updates it had not applied. All four fixed, plus migration `0019`. New
  `worker/tests/billing_webhook.test.mjs` (9 assertions, all passing) is preship gate 8d.
  **v0.58.0**, worker version `cedfb3ce`.
- **`observability-01`** - `audit_dashboard.py` exists because a silent 0/0/0 once masked a
  real CRITICAL, and it had regressed into exactly that: its severity regex only matched the
  old bracketed tag. Now reads one severity per numbered item across all three report
  formats, with a self-check that exits 3 and names anything it cannot read. **v0.58.1**.

### Yes& Budget (6)

- **`threat-model-01`** - the CORS allow-list was mounted flat on `/*`, so a page on
  `https://yesandeverything.com` could read `GET /api/transactions`, `/api/accounts` and
  every analytics route, with no auth to fail. New `cors-policy.ts` grants the landing page
  the `GET /` launcher probe and nothing else; six tests, including header-level proof that
  the landing origin gets no `access-control-allow-origin` on `/api/transactions`.
  `DECISIONS.md` D-005 carries a dated correction retracting the "the API doesn't bind to a
  public address" rationale without reversing the decision. **v0.14.7**.
- **`backup-cadence-02`** - backups were created by events but deleted by the clock, so a
  user who stopped importing for 30 days converged to zero backups; both backup directories
  were empty right now. `pruneOldBackups` keeps the three newest regardless of age. **v0.14.6**.
- **`incident-runbook-currency-04`** - every documented restore said to swap the file and
  said nothing about the WAL sidecars, which replay into the restored database. All three
  paths fixed. **v0.14.6**.
- **`threat-model-02`** - reproduced first (`SQLite format 3` header, no `.sqlcipher`
  sentinel), then corrected four docs that stated SQLCipher at-rest encryption as shipped and
  default. SQLCipher deliberately NOT engaged. **v0.14.8**.
- **`release-pipeline-gate-page-publish-06`** - the public Budget pages claimed "no Plaid,
  no third-party API touching raw transactions" while the same site's privacy page describes
  pulling transactions from `production.plaid.com`. YaE `8d1e91b`.
- **`work-queue-hygiene-05`** - `queue-triage-nightly` now triages `blocked` and
  `blocked-on-user` at any age with a per-item re-verify and a mandatory unblock-condition
  line, and all four `blocked` items were normalized to `blocked-on-user`.

### Here Be Hordes (3)

- **`playability-05`** - `DEBUG_INFINITE_RESOURCES` was a compile-time `const true`, so every
  shipped build started with 10000 of each stockpile and no price was real. Now resolved in
  `_ready` from a new `debug_flags.infinite_resources` export defaulting FALSE. Verified in
  production shape across three headless boots: default gives provisions 2000 and
  `cap(biomass)` 50; flipping the export gives 10000 and `inf`; restoring gives the real
  economy back. `de46692`.
- **`reliability-02b`** - F5 and F9 are gated on `not _game_over`, and `_load_run` clears the
  end state. A defeated player could previously overwrite a good save with an unwinnable
  `cp_hp = 0` run. `63c4534`.
- **`per-project-ps1-stack-02`** - `Confirm-GitIntact` ran git itself and clobbered
  `$LASTEXITCODE`, so a **failed push read as success** at four call sites. Fixed inside the
  guard, so it covers all four and any fifth. Verified against a deliberate `exit 7`. `63c4534`.

### Brackish Rising (1)

- **`data-integrity-01`** - `save_to` opened the live slot with `FileAccess.WRITE`, which
  truncates on open: a crash anywhere after that cost the player the save with nothing to
  fall back on. Now temp -> readback -> parse -> previous slot to `.bak` -> rename, with the
  old save restored if the commit rename fails. 11 new headless assertions; 569 passed / 0
  failed and the full preship gauntlet including the Skirmish boot smoke is green. **v0.59.46**.

---

## Waiting on Kane

Four decisions. Each is a genuine fork where two answers are both defensible, so guessing
would have been worse than surfacing.

### 1. The GDD gate: real auth, or drop the pretence?

`bar-raise-2026-07-24-hordes-gate-page-publish-01` (+ `security-03`, same decision)

`yesandeverything.com/hordes/` answers an unauthenticated GET with **both gate passwords in
cleartext**, next to a payload that decodes with plain `atob()`. Re-verified tonight.

Two ways out, and they lead to completely different work:

- **(a) Real gate.** A Worker in front of `/hordes/` and `/brackish-rising/` that checks a
  secret held in Cloudflare and only then returns the payload. `publish-gdd.ps1` stops
  emitting any literal.
- **(b) Drop it.** Re-scope the mirrors as public and delete the gate. The GDD stops being
  private; the theatre stops costing anything.

I narrowed the exposure as far as it goes without that call: the phrase is out of
`CLAUDE.md`, the status JSONs, the skill-review artifacts and the queue, and a release that
republishes it now fails. What is left is the gate page itself, which is exactly what this
decision governs. **This is the most important open item in the portfolio.**

### 2. Chains refund policy

`bar-raise-2026-07-17-chains-compliance-02` (blocks `compliance-03`)

Chains takes real recurring payments and `legal/terms.md` contains **zero** occurrences of
subscription, billing or refund, while the upgrade modal promises "Cancel anytime - no
surprise bills". Everything else in the clause follows from how Stripe is already configured
(cancel stops the next renewal, access runs to the end of the paid period). The one thing I
will not write for you is the refund line: **"no refund for the unused part of a paid
period"** versus **"prorated refund on request"** is a real legal position with consumer-law
exposure, and `legal/terms.md` is a counsel-drafted master. Give me that one sentence and
the section plus the DRAFT-banner removal (`compliance-03`) ship in a single pass.

### 3. Budget repo visibility

Not blocking - I shipped the truthful text - but worth a decision. The Budget compliance
pages now say the source repo is private, because it is. If you want the auditability claim
back on a Plaid-facing privacy page, the repo has to go public.

### 4. Chains migration `0019`

Needs running in the Supabase SQL editor, same as every other migration in this repo. Until
then the webhook records everything except `stripe_subscription_id`; that write is
deliberately non-fatal, so entitlement keeps working and starts recording the moment you run
it. The reconciliation sweep (`dataint-01`) and dunning (`finance-02`) both need it.

---

## Notes on the run

- **Nothing was dropped.** No item was archived as stale this pass; everything I touched was
  either resolved with evidence or escalated with a named decision.
- **No guard was loosened.** Two Budget tests failed after the backup keep-floor landed
  because their setup planted a single stale file the floor now protects. I gave them enough
  backups to clear the floor so they still measure the once-per-day gate, rather than
  weakening the assertions.
- **One pre-existing uncommitted change was swept.** `apps/api/src/backup.ts` in the Budget
  tree carried a one-line doc-comment correction from an earlier routine at 02:51. I verified
  it against the code (the filename really is `<ts>-<reason>.db`) before including it in the
  v0.14.6 commit.
- **Correction to a finding.** `work-queue-hygiene-05` claimed `blocked`/`blocked-on-user`
  had zero readers. They now have two - `deferred-review-weekly` and this routine - but both
  are weekly, so the nightly surface it asked for was still genuinely missing and has been
  added.
- **Release scripts keep aborting on PowerShell-wrapped git stderr.** Six of eleven releases
  stopped at the push step with the work already committed and pushed. Finished via the Bash
  tool each time, per the standing note. Chains needed its worker deployed by hand twice
  because the abort happens before that step.
- **Rising's release script wrote a stub changelog entry** ("update tests + source (2
  files)") because it was invoked without `-Message`. Replaced with the real entry in
  `78ae58f`. Budget's script refuses to do this; Rising's does not.
