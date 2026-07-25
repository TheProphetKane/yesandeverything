# Deferred review

Last review: 2026-07-24

Weekly pass over everything the portfolio has parked: work-queue items marked `deferred`, `blocked`
or `blocked-on-user`, plus judgment-bound `pending` items older than 10 days, plus every
`barRaise.deferred` entry in `status/data/*.json`. Each item gets one verdict — KEEP (worth doing),
DROP (noise, culled and logged to [WONT_DO.md](WONT_DO.md)), or ESCALATE (a real call for Kane).

## TL;DR

| | count |
|---|---|
| Reviewed | **150** (68 work-queue: 46 blocked/deferred + 22 aged judgment-pending · 82 bar-raise deferred) |
| KEEP | **118** |
| DROP | **16** (3 queue → archive, 13 bar-raise deferred) |
| ESCALATE | **16** distinct decisions |

Trend: first run of this review, so no prior baseline. The next pass compares against these numbers.

The parked pile is mostly **real**, which is the honest finding: 10.7% was noise. The dominant
pattern is not speculation, it is **work that no unattended routine is allowed to finish** — fixes
that need a release, a deploy, prod DDL, or a decision. Drains have re-verified several of these
five and six times without being able to land them.

**Top thing worth doing:** Cattery prod still has `ON DELETE CASCADE` on `orders.cattery_id` —
migration 0019 is authored but never applied, so a breeder deleting their cattery or account
hard-deletes every order row for that cattery, including held and released escrow.

**Top decision waiting:** Budget — cut or keep Plaid. It has never been credentialed (0 synced rows)
yet it gates four other parked items and drove a security questionnaire, the SQLCipher migration and
a Worker.

---

## Worth doing (KEEP), by project

### Cattery
- `canonical-audit-2026-07-16-cattery-orders-cascade-prod-unapplied` (**P0/high**) — live prod
  `orders_cattery_id_fkey` is still `ON DELETE CASCADE`; escrow order rows are destroyable by a
  breeder deleting their account. **Next:** attended session — commit the two untracked migrations,
  apply 0019 to `emrerjdyujylgutfmool`, re-verify with `pg_constraint`.
- `canonical-audit-2026-07-10-cattery-photos-bucket-listing` (P1/med) — the `photos public read`
  policy makes the bucket enumerable, exposing unscreened catteries' photos. Repo fix is staged as
  migration 0018. **Next:** apply to prod + re-run the Supabase security advisor.
- `bar-raise-2026-07-08-cattery-webhook-event-loss` (P1) — mark a Stripe webhook processed only
  after the DB write, 5xx on failure so Stripe retries. **Next:** money-path session with a deploy.
- `bar-raise-2026-07-08-cattery-money-path-logging` (P1), `-stripe-idempotency-key` (P2),
  `-ratelimit-key-bypass` (P2), `-stuck-escrow-reconcile` (P2), `-server-side-queries` (P2) — the
  same attended money-path pass covers all five.
- `bar-raise-2026-07-16-cattery-verdict-enum-stale` (P3) — **do this session.** One line:
  `scripts/write-dashboard-status.ps1:83` still lists `healthy/needs-attention/at-risk/stalled`, so
  the next run silently nulls Cattery's live `in-progress` verdict. Verified stale 2026-07-24.
- `canonical-audit-2026-07-02-cattery-missing-migrations` (P1) — three migrations applied in prod
  with no repo file; a fresh `db push` builds a broken DB. **Next:** reconcile files, then push.

### Gnosis
- `bar-raise-2026-07-16-gnosis-secret-answers-ungated-api` (**P0/high**) — gated DM content is
  reachable on an open data path. **Next:** attended Gnosis session; scope the store, require the
  gate on its export, repoint the snapshot tool (detail stays in the gitignored bar-raise doc).
- `gnosis-release-62-proposed-dm-answers-2026-07-16` (P1) — 62 proposed DM answers sit on a branch,
  fast-forward + `release.ps1` away from live. **Next:** attended run; drains are forbidden to ship.

### Budget
- `bar-raise-2026-07-16-yab-data-integrity-02` (**P1/high**) — the Plaid sync's bare
  `ON CONFLICT(plaid_transaction_id)` does not match the partial index, so `applyAdded` throws at
  PREPARE time and the page replays forever. Reproduced against the project's own build.
  **Next:** predicate the conflict target, regression test, ship.
- `bar-raise-2026-07-04-yab-bulk-delete-no-backup` (P1/high) — the only destructive user path that
  skips `createBackup`. **Next:** add `createBackup("pre-bulk-delete")` + 503 on snapshot failure.
- `bar-raise-2026-07-16-yab-dependency-02` (P1/high) — Dependabot alerts are off; the doc half
  landed in a962350, the repo-settings toggle is a two-click owner action.

### Ring
- `bar-raise-2026-07-16-ring-verdict-enum-stale` (P3) — **do this session.** Same one-line enum fix
  as Cattery's, at `scripts/write-dashboard-status.ps1:96`; Ring.json currently carries `working`,
  which the next writer run nulls. Verified stale 2026-07-24.
- `bar-raise-2026-07-07-ring-seed-pii-fictionalize` (P2) — `public/data/seed.json` ships real names
  and a real email on a live domain to every visitor. **Next:** fictionalize per the portfolio rule.
- `bar-raise-2026-07-07-ring-gdpr-data-endpoints` (P1) — a paid product with no export/delete path.
- `bar-raise-2026-07-07-ring-community-ratings-backup` (P1) — months of judge votes live in KV only;
  migration 0008 and the dual-write plan are staged.
- `bar-raise-2026-07-07-ring-worker-observability` / `-dualwrite-atomicity` / `-worker-freetier-budget`
  (P1) — one attended Ring session with a deploy clears all three.
- `working-tree-2026-07-10-ring-stale-tree` (P2) — verified still dirty (6 files, incl. real XSS
  backstop comments in `public/app.js`). **Next:** commit before it rots further.
- Everything.json deferred, MED: the live Ring page ships five em dashes including its title and
  social-card titles — **verified true today** (`public/index.html` lines 6, 21, 27, 84, 89).

### Skylight
Ten bar-raise findings from 2026-07-10 plus two canonical-audit items, all verified and all inert
until someone deploys. The cheapest three first:
- `bar-raise-2026-07-10-skylight-observability-01` (P2) — **do this session-ish.** One
  `console.error` in the `index.ts` fetch catch; today every failure is a causeless 500.
- `bar-raise-2026-07-10-skylight-data-integrity-02` (P2) — treat a 2xx with an unreadable body as
  success, so a parse failure stops duplicating an event that already landed.
- `bar-raise-2026-07-10-skylight-reliability-03` (P2) — retry the Google write once after clearing
  a stale `g:token`.
- Then: `-data-integrity-01` (high, idempotent event ids), `-data-integrity-03` (Message-ID dedupe),
  `-data-integrity-04` (mixed naive/absolute time compare), `-observability-02`, `-observability-03`,
  `-solo-tool-ux-01`, `-architecture-01`, `-maintainability-02`, `-dependency-01`, `-dependency-02`
  (wrangler is on the EOL v3 major), `canonical-audit-2026-07-10-skylight-frame-id-empty-var`
  (an empty `vars` entry can shadow the secret on every deploy), and
  `canonical-audit-2026-07-02-skylight-google-phase2-framing` (verified still stale today).

### Chains
- `chains-br-auth-01-2026-07-04` (**P1**) — the Worker trusts a client-supplied `body.userId` for
  every entitlement decision, so a known UUID spoofs Pro access to paid AI-spend endpoints. Patch is
  staged and line numbers still valid. **Next:** attended session + deploy + end-to-end auth test.

### Hordes / Rising
- `hbh-velocity-off-critical-path-mission-layer-2026-07-10` (P1/high) — the mission data layer still
  does not exist; the re-aim landed in the GDD but the code half has not.
- `hbh-multimesh-crowd-migration-2026-06-28` (P1) — `crowd3d.gd` is written and unwired; the A/B
  measured 1248 fps against 26 fps shipped.
- `hbh-observability-frame-time-logger-2026-07-11` (P2), `hbh-gdd-world3d-classname-count-2026-07-11`
  (P3) — the GDD still says "10 registered classes"; **verified today the live count is 11 of 23**.
  Doc-only, **do this session**.
- `br-bp-terrain-tilemaplayer-2026-06-16` / `br-bp-polling-to-event-2026-06-16` (P1) — the two prime
  lag suspects; still the right calls after this week's scene-node work.
- `br-bp-stats-to-resources` (P2), `br-bp-main-world-gui-scene` (P3), `br-asset-production-pass` (P2,
  trigger: M1 close).
- `canonical-audit-2026-07-11-rising-assets-tab-artdrop-stale` (P2) — **verified still true today**:
  Lumberyard, the wall pair and 186 rows sit at `todo` though the art is wired. v0.59.45's truth pass
  fixed the Progress tab, not the Assets tab.

### Scheduler / cross-portfolio
- `bar-raise-2026-07-24-scheduler-gate-pages-v041-prose` (P2) — the public Scheduler page describes a
  surface three minors old. **Next:** rewrite the two prose blocks, leave the version marker alone.
- `working-tree-2026-07-11-scheduler-stale-tree` (P2) — **verified still dirty** (8 changes incl. the
  untracked 0011 migration) and `scheduler-auditlog-composite-index-2026-07-10` (P3) is its decided
  other half. One attended ship closes both.
- `handler-audit-2026-07-10-webhook-boilerplate` (P2) — now the single owner of the webhook
  reconcile (its duplicate was dropped this pass); the Budget `#budget-resources` mismatch is real.
- `handler-audit-2026-07-17-skill-itself-stale` (P2) — the handler-audit skill names 4 handlers of
  12 and two paths that no longer exist. Now also carries the older table-update item's scope.
- `handler-audit-2026-07-17-skylight-audit-task-husk` (P2) — a broken Windows task (last result 1)
  shadows the native routine.

### Bar-raise deferred entries kept
69 of 82 stay. They are overwhelmingly gate-sequenced (Cattery's four launch gates, Chains' post-1.0
list, Hordes' art-delivery chain) or owner-decision items — see the escalation list below for the
ones that are actually blocking. Notable kept-because-real: Apothecary's "adr-promoter is invoked by
nothing" (two other projects' deferred entries say "promote via adr-promoter", so those pointers are
dead), and Everything's `queue-drain-4h` orphan routine directory — **verified still on disk**.

---

## Your call (ESCALATE)

Sixteen real decisions. The first five unblock the most parked work:

1. **Budget — cut or keep Plaid.** Never credentialed, 0 synced rows, yet it gates the takeover-window
   fix, the production-tier question and the archive-window derivation. Killing it retires four items.
2. **Hordes — park it or book the session.** Every milestone path is blocked on you while automation
   re-verifies a frozen HEAD (last code commit 2026-07-11). Either file a locked "HBH parked"
   decision or book an R3D-04 mission-layer session. Same run: is the v0.99.x band staying, given it
   contradicts the locked milestone-versioning decision and collides with M7's name?
3. **Chains — subscriptions and the `CHAINS_VISIBLE` flip** (`yac-subscriptions-enable-ai`) plus the
   store launch (`yac-store-launch`). These are the only two items between 92% and done, parked since
   2026-06-10, and the entitlement fail-open is coupled to the same flip.
4. **YaE — pick the lever for the 954 MiB public repo** (~95% of GitHub's 1 GB advisory, growing
   ~3.4 MB/day against a 28 MB site): cut the generated-data commit cadence, or revisit the base64
   gate payloads in two other repos. Neither is mine to mint.
5. **YaE — are the two mirror gates secret, or merely unadvertised?** Both are client-side equality
   checks whose payload ships to every requester. If secret, they need a server-side check; if not,
   record the decorative gate as a locked decision and stop re-raising it.

Then:

6. **Budget — engage SQLCipher on the live DB?** The file is still plaintext and `--finalize` is a
   documented point of no return. Related: how much friction do you want on the destructive loopback
   endpoints (security vs solo-tool-ux, 15 runs unresolved)?
7. **Budget — make the repo public, or change the launcher's install path?** Today the published
   clone step 404s for everyone but you.
8. **Scheduler — driven to a first real user now, or parked at v0.7.x?**
   (`bar-raise-2026-07-24-scheduler-posture-decision`.) Both completion gates dead-end on this, and
   the answer goes in DESIGN section 23 either way.
9. **Cattery — launch go/no-go** (external legal review of the escrow custody model, one founding
   breeder, register the apex) before any more dev polish.
10. **Cattery — was "Yes& Cats" renamed to Yes& Ring?** PROJECT_SPEC still names it at :20/:23/:25
    and in the locked line :92 (**verified today**); CLAUDE.md was repointed on 2026-07-13. Touches a
    locked line, so it needs your word, not an inference.
11. **Ring — v1.0 freeze or a scoped Phase 2** (ownership, invites, cert verification), and the
    $1/mo unit economics (~500 users to cover hosting).
12. **Ring — which Discord role is real, "Ring" or "Cats"?** One word, two docs disagree, and only
    the live server settles it.
13. **Gnosis — the gate password fork:** accept it as a committed literal in a private repo and drop
    the `.secrets` framing, or scrub all five files and rotate `GATE_PASSWORD`. Scrubbing only
    CLAUDE.md accomplishes nothing.
14. **Gnosis — "questions are never closed" vs `QSTATUS`,** which has two closed states. Soften the
    spec, or remove `[~]` from the code and the renderer.
15. **Rising — Git LFS and the pack-history rewrite** (`br-bp-git-lfs-2026-06-16`). The "do it before
    the art lands" window has closed — Navy's art landed without it, and 5.4 MB of Spine DLLs are now
    committed. History rewrite is risky on FUSE, so this is a real tradeoff call.
16. **Skylight — share `TheProphetKane` and the Family secondary calendar with the service account**
    so the last seven series can be migrated; browser-driven deletion proved unreliable. Same pass:
    rule the owner colour for D&D and the 51 pre-existing ad-hoc-coloured entries.

---

## Dropped this pass

Mirrors [WONT_DO.md](WONT_DO.md). Future bar-raise and audit runs should treat these as decided.

### Work queue → `.work-queue-archive.json`

| id | reason |
|---|---|
| `working-tree-2026-07-17-yae-stale-tree` | Resolved — all four named files committed in afb8c6d today; the sitemap self-heal is live. |
| `handler-audit-skill-table-update-2026-06-14` | Superseded by `handler-audit-2026-07-17-skill-itself-stale` (strictly larger scope). |
| `handler-audit-2026-07-03-portfolio-discord-webhook-reconcile` | Duplicate of `handler-audit-2026-07-10-webhook-boilerplate`; its unique Budget `#budget-resources` detail is carried forward in WONT_DO.md. |

### Bar-raise deferred entries

| project | entry | reason |
|---|---|---|
| Apothecary | "work-queue at 244 items and …-apothecary-stale-tree pending against a resolved claim" | Stale snapshot (queue is 355; tree dirty again with different files); the queue item stands alone. |
| Budget | "Log the tailwindcss v4 pin as a tracked deferred-migration item" | Self-referential — the entry is the record it asked to create. |
| Everything | "Status dashboard skeleton loader and count-up" | Cosmetic polish, no exposure, re-confirmed and never prioritized. |
| Everything | "The legacy gdd.html redirect stub keeps recurring" | Decided against deletion; the WONT_DO entry is now the settled record. |
| Everything | "GitHub Actions pinned to floating major tags" | Accepted tradeoff — all first-party actions, zero third-party floating. |
| Hordes | "The game ships fully silent" | On plan: GDD schedules the audio pass at M5 with a tracked manifest. |
| Rising | "Capture a pre/post frame-time diff for the v0.59.32/33 decomposition" | The pre-decomposition build is waves back; the A/B can't be run honestly. Subsumed by performance-01. |
| Scheduler | "Record an explicit DESIGN section 23 posture decision" | Triplicate of the MED entry and the queue item. |
| Skylight | "Re-anchor .project-context.json…" | Duplicate of queue item `canonical-audit-2026-07-02-skylight-google-phase2-framing`. |
| Skylight | "Confirm SKYLIGHT_FRAME_ID via a live GET /api/setup" | Duplicate of queue item `canonical-audit-2026-07-10-skylight-frame-id-empty-var`. |
| Skylight | "Null out changelog_path or create the CHANGELOG.md" | Duplicate of queue item `canonical-audit-2026-07-02-skylight-changelog-phantom`. |
| Skylight | "Retire or repair the yac-skylight-audit task husk" | Duplicate of queue item `handler-audit-2026-07-17-skylight-audit-task-husk`. |
| Ring | "Trim the handler's five-webhook list" | Duplicate of queue item `handler-audit-2026-07-10-webhook-boilerplate`. |

Ten of the sixteen drops were **duplicate records, not dropped work** — the same finding tracked in
both the queue and a dashboard deferred list. The work survives in the queue; only the double-count
is gone.
