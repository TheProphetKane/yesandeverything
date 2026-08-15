# Backlog burndown

Last run: 2026-08-14 (Friday, 22:07 to 22:50 local)

## Counts

| | count |
|---|---|
| Considered | 803 pending items at start, plus 3 open bar-raise actions found outside the queue (Chains billing-bypass, and two already covered by existing findings) |
| Resolved (completed) | 101 this run (74 to 175 total) |
| Shipped | 9 repos released: Gnosis v0.3.435, Ring v0.17.25, Cattery v0.25.6, Chains (3 commits, worker redeployed), Here Be Hordes v0.99.43-45, Brackish Rising v0.59.66/67, Scheduler (13 commits), Budget v0.14.12, Apothecary v1.1.7, Agents v1.1.1 |
| Newly flagged blocked-on-user | 44 |
| Dropped (verified stale/already-fixed, no code change needed) | 1 net new (several more folded into "completed" with a stale-dropped resolution note) |
| Left pending, untouched | 657 |

Queue depth: 803 pending at 22:07 -> 657 pending at 22:50.

## The one thing that matters most

**A live, unauthenticated billing bypass on Chains, unpatched for 25 consecutive audit passes, is fixed and verified live.** `handleBillingCheckout` and `handleBillingPortal` trusted a client-supplied user id with no session check, so any signed-in user could open a Stripe Billing Portal session for someone else's account just by knowing their id. Fixed to verify the caller's Supabase session and derive the user id only from that; a related endpoint that was leaking real user ids unauthenticated is locked down too. Confirmed live with curl: forged requests now get `401 sign_in_required`. Commit `0770801`, deployed, worker redeployed separately (a plain push does not deploy Chains' worker).

Runner-up: three P0 findings on Gnosis (secret entity names/subtypes leaking through public pages and data files, no deploy-time check to catch it) are fixed, deployed, and now covered by a release-blocking assertion so they can't silently regress.

## Resolved, by project

**Gnosis** (v0.3.435, commit `e97b6343`) - all 3 P0 findings: secret question ids no longer reachable via the answers endpoint (now enforced at deploy time), gated entities hidden from the public type-index pages the same way the DM navigation already hides them, and the preview/search data files stopped leaking gated entities' subtype.

**Chains** (3 commits, worker redeployed) - the billing-bypass fix above; corrected several stale facts in the public readme; added a freshness check so a stale audit report can't silently go undetected on the dashboard.

**Ring** (v0.17.25) - a missing test for a previously-flagged sharing/leak scenario is now written and passing; 8 silent failure paths in the Stripe-adjacent and scraping code now log; two reliability gaps (state writes that could drift silently, a push-sync path with no retry) fixed; several stale doc/spec claims corrected.

**Cattery** (v0.25.6) - a webhook handler that could silently lose a payment event on partial failure now retries correctly (Stripe will retry on failure instead of the event vanishing); every money-path failure now logs with context; Stripe calls gained idempotency keys; a database trigger now blocks status changes on a kitten with a live order against it; release now deploys and tests before it commits, not after. **Caveat: two of these fixes (the webhook ledger split and the reservation-lock trigger) are code-complete and tested but not yet applied to production** - the Supabase credential available to this session can't see the Cattery project, so someone with real dashboard access needs to run migrations `0020` and `0021`.

**Here Be Hordes** (v0.99.43-45) - three disconnected pause systems unified into one authority (Escape now actually stops the horde); an unauthenticated worker write path that flowed unescaped into page content is closed, and the worker's origin check now rejects requests with no origin header at all (previously only mismatched origins were rejected); pause-menu save/load buttons no longer stay live after a loss. **Incident during this work: a test write against the live production canonical-state store overwrote whatever was there.** This store is the GDD editor's shared state (progress/asset tracking across editor sessions), not player save data - real players are not affected, but Kane's own current editor-progress state may have been reset and is not recoverable through any tooling this session had. Flagging plainly rather than glossing over it.

**Brackish Rising** (v0.59.66/67) - a wave-repel reward was unreachable because pooled enemy deaths never signaled the wave director; save/load was silently reverting research progress and losing keeper/wave state; the options file had no write verification or load-time type check; two code-health ratchets turned out to be counting matches inside comments, inflating one metric about 40 percent and floor-pinning another at a false 3 instead of the real 0.

**Scheduler** (13 commits) - implemented the documented but unenforced swap hour-cap rule end to end (chose block-outright over warn-only, matching what the design doc already said - flagged for override if that's not what Kane wants); fixed a severity-parser format mismatch that was showing a false clean bill of health on the dashboard; batched several N-plus-one write patterns into single atomic calls; corrected three design-doc sections that described features never built.

**Budget** (v0.14.12) - two dependency security advisories closed; the test suite was writing directly against the live 649-transaction ledger and now isolates to a temp database; a factory-reset path was reading from a different backup directory than the rest of the app; a 32-day gap with zero backup snapshots on a live ledger closed; corrected several categorization rules that were matching substrings inside unrelated merchant names.

**Apothecary** (v1.1.7) - the dashboard's stale flag was hardcoded false, now computed from real report age; three herb accent colors still failed contrast after an earlier partial fix, now cleared; 4 of 7 duplicate-module-instantiation edges fixed (3 remain, need a larger interface change).

**Agents** (v1.1.1) - a rate limiter trusted forwarded-for headers even without proof of genuine tunnel traffic, closing a lockout-bypass path; the health endpoint now signals credential trouble to remote callers; two write paths gained read-back verification.

**Yes And Everything** (this repo) - redacted exact exploit routing detail (file, line, function names for the Chains billing bug) from a status file this site serves publicly; closed the public exposure of `.work-queue.json.recon`, a reconciliation artifact with no matching ignore rule; corrected a false claim in this repo's own handler doc about where a gate password lives; backfilled 27 stranded queue items that had no prompt field so they're drainable again; closed several already-fixed-but-never-flipped items found by direct verification.

## Blocked on Kane - the decisions now waiting

**The single largest exposure in the portfolio right now**: `.work-queue.json` and `.work-queue-archive.json` (the whole internal findings queue, nearly 2 megabytes) are served in full, unauthenticated, on both `yesandeverything.com` and `raw.githubusercontent.com` - confirmed live this session. Git is currently the only backup for these two files, which is why nobody has untracked them yet. Took a one-time manual snapshot to `C:\Users\Kane\Backups\YaE-queue-snapshots` as a stopgap. Three real options: (a) build a real recurring backup outside this repo, then untrack both - closes both public surfaces at once, preferred; (b) make the repo private - blocked in practice, GitHub Pages needs a paid plan on a private repo; (c) knowingly accept the exposure and say so in the ignore file. This has been open since 2026-07-17.

**The backlog is growing faster than any burndown pass can drain it.** Pending queue depth roughly doubled from 374 to 803 over two weeks before this run, even after a strong night (44 fixes across 9 repos, roughly 90 minutes of unattended work per project). The structural options are the same ones an earlier run already surfaced: grow the daily/weekly burndown box, run more burndown passes per week, or throttle how many bar-raise findings get enqueued per run. Nobody's picked one yet.

**Three scheduled-task directories are confirmed orphaned** (`bar-raise-agents`, `bar-raise-yaag`, `audit-agents-nightly` under the scheduled-tasks folder, absent from the live registry) and this is the third session to have the delete correctly refused by the permission classifier. Backed up to a session scratchpad; needs Kane to delete them himself or grant the permission.

**The hordes/brackish-rising gate passwords are hardcoded in cleartext** in both mirror pages, contradicting this repo's own handler doc (now corrected to say so). The gate is friction-only regardless - the underlying content sits in the same page as plain base64, so the password never protected it from a determined reader. Needs a decision: move the phrase to a real secret injected at publish time, or accept it as friction and stop treating it as a security control. Same question applies to the reused 11-page shared editor password.

**Cattery has two migrations (`0020`, `0021`) shipped and tested but not applied to production** because the Supabase credential this session had access to can't see the Cattery project. Someone with real dashboard access needs to run them, or the webhook-event-loss and reservation-lock fixes above are only protecting the codebase, not the live app.

**A handful of pure product/scope calls surfaced across projects, each explicitly flagged by its own finding as needing Kane rather than a guess**: Chains' versioning policy now that it's past 1.0, whether Chains' known-issues log is still a live append-only policy, Brackish Rising's next-milestone declaration and its pooled-vs-per-entity enemy architecture, Cattery's stalled launch gates and whether it gets Discord notifications at all, Ring's user-data export/delete policy and whether to invest in offline conflict merging, Here Be Hordes' campaign win condition (wave_cap always returns 0 right now), and the retention step that already caused one real unrecoverable bar-raise report loss and needs a scope decision before it's trusted with bar-raise reports again.

Full per-item detail, including every dropped-as-stale and left-pending item, lives in `.work-queue.json` under each item's `resolution` or `drainNote` field.

## Discipline notes

Every write to `.work-queue.json` this session went through a Python port of `scripts/queue-edit.ps1`'s lock protocol (atomic lockfile, stale-break, retry) after discovering partway through that the canonical write path exists and this session's first several edits hadn't been using it - no corruption resulted, but future sessions doing ad-hoc queue edits should dot-source the real script or use the same lock file.

Nine parallel sessions worked one repo each (Gnosis, Ring, Cattery, Chains, Here Be Hordes, Brackish Rising, Scheduler, Budget, and Apothecary-plus-Agents together), all instructed not to touch `.work-queue.json` directly so results could be consolidated centrally in one pass - all but Gnosis followed that; Gnosis updated its own three items directly before the consolidation pass, which didn't collide with anything but is worth naming as a deviation.
