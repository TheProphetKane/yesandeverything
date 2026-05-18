# YesAndChains canonical-doc audit — 2026-05-14

## TL;DR

The multi-file canonical layer (PROJECT_SPEC / CONTEXT / ROADMAP / BACKLOG / DECISIONS_NEEDED + CLAUDE.md handler + `docs/launch-checklist-1.0.md`) is structurally healthy — each file owns a distinct, non-overlapping slice — but there is real drift in **`ROADMAP.md`** (lists shipped work as Tier B "needs Nick's hands" and references a stale migration filename), plus a **phantom `PRIORITY_QUEUE.md` reference in `CONTEXT.md`** and a still-resident `NEXT_SESSION_QUEUE.md` tombstone that ROADMAP.md still treats as live. `package.json` version (`0.5.57`) is stale relative to the canonical CONTEXT.md version (`0.25.2`), but this is an intentional repo convention (CONTEXT.md is the version pill source-of-truth) rather than a doc-drift bug.

A prior audit at `docs/CANONICAL_AUDIT.md` (dated 2026-05-14) already documented findings #1 and #2 below. Both items it flagged are still unresolved.

---

## What's aligned (no fix needed)

- **CLAUDE.md handler** correctly indexes every canonical-layer file with the right role assignment and stays in sync with the actual roles each doc plays. Version pill `v0.25.2 (2026-05-13)` matches CONTEXT.md.
- **CONTEXT.md changelog** matches the deployed feature set the other docs describe (0.25.2 most recent, deletes-account migration `0012_delete_my_account.sql` exists, `0.25.0` token-system pass + `0.24.0` TechDisc importer + `0.21.x` cost cap policy + `0.20.0` skill-profile data layer + `0.19.0` strategies — all real).
- **Migrations on disk** (`supabase/migrations/0001_init.sql` through `0012_delete_my_account.sql`, 12 files) match the changelog claims version-by-version. `0011_skill_profile.sql` shipped in 0.20.0 ✓, `0012_delete_my_account.sql` shipped in 0.25.1 ✓.
- **Code files claimed by the changelog exist on disk:** `src/main.ts`, `src/onboarding.ts`, `src/techdisc-import.ts`, `src/strategies.ts`, `tools/audit_window_exposure.py`, `manifest.json`, `app.js` — all present.
- **`docs/launch-checklist-1.0.md`** sits under `docs/`, signaling its transient/active-queue role, and is consistent with itself (says migration `0011` applied; matches real filename).
- **`BACKLOG.md` priority-tag schema** (P0–P3 + ✅) is internally consistent and matches the role CLAUDE.md assigns to it.
- **PROJECT_SPEC.md** sticks to vision + locked architecture + decision history; no status fields bleeding in. Role-clean.
- **DECISIONS_NEEDED.md** + **HOW_TO_ADMIN.md** + **PLASTICS_REFERENCE.md** + **PLASTICS_FLIGHT_DATA.md** — all present and on-role per CLAUDE.md's index.
- **ADRs in `docs/adr/`** — 17 files numbered 0001–0017 (CLAUDE.md says "15+", which is correct as a floor).
- **The append-only multi-file canonical pattern itself** holds up. No two docs claim the same authority over the same slice. The prior canonical audit's "healthier than it looks at first glance" assessment still stands.

---

## Drift found

### 1. Phantom reference — `PRIORITY_QUEUE.md` cited in CONTEXT.md but does not exist at root
**Severity:** high (every new AI session reading CONTEXT.md hits a dead link)

`X:\YesAndChains\CONTEXT.md` lines 22–26:

> 🔒 **Active priority queue:** `PRIORITY_QUEUE.md` is the canonical to-do list until everything in it is checked off. New backlog items can be added at any time, but they don't preempt items already on the queue. AI re-reads PRIORITY_QUEUE.md at the start of every session and works the next unchecked item.

There is **no `PRIORITY_QUEUE.md` at the root.** The file does exist at `_archived/PRIORITY_QUEUE.md` (archived per 0.21.5 changelog entry). The actual active queue is `docs/launch-checklist-1.0.md`, per CLAUDE.md, per the launch-checklist file itself, and per the redirect in `NEXT_SESSION_QUEUE.md`.

This was already flagged in the prior `docs/CANONICAL_AUDIT.md` (Finding #2). Still unfixed.

### 2. `ROADMAP.md` references a stale migration filename
**Severity:** medium

`X:\YesAndChains\ROADMAP.md` line 51:

> §22 User skill profile + TechDisc CSV import — needs migration `0009_skill_profile.sql` applied. Parser + UI scaffolding can ship around it.

The actual migration is **`0011_skill_profile.sql`** (shipped in 0.20.0, applied per `docs/launch-checklist-1.0.md` "What's already done"). `0009_*` is `0009_profile_home_course.sql`, an unrelated migration. ROADMAP.md is the only canonical-layer file with the wrong migration number.

### 3. `ROADMAP.md` lists work as Tier B "needs Nick's hands" that has shipped
**Severity:** medium (the doc says these are blocked on Nick when they're done)

ROADMAP.md Tier B (lines 49–53):

- **§22 User skill profile + TechDisc CSV import** — flagged as Tier B "needs migration applied." Per CONTEXT.md changelog, §22a data layer shipped 2026-05-05 in `0.20.0` and §22b TechDisc importer + Throw Power profile + recommender wiring shipped 2026-05-06 in `0.24.0`. Migration is applied. Code module `src/techdisc-import.ts` exists.

The "what's live" header of ROADMAP.md also says `(as of 0.24.5, deployed)` — but CONTEXT.md is now on `0.25.2` (2026-05-13). The deployed-version anchor on ROADMAP is one week and three minor/patch entries behind.

### 4. `NEXT_SESSION_QUEUE.md` tombstone still at repo root, still referenced as live by ROADMAP + BACKLOG
**Severity:** medium

The file `NEXT_SESSION_QUEUE.md` at the repo root contains only a redirect to `docs/launch-checklist-1.0.md` (per 0.21.5 changelog). CLAUDE.md correctly describes it as tombstoned.

But ROADMAP.md (line 11) lists it in its companion-docs block as:

> `NEXT_SESSION_QUEUE.md` — what AI picks up if no live request

…as if it were still live. And BACKLOG.md item 3c.3 (line 149) says:

> **Top of NEXT_SESSION_QUEUE.md.**

…again treating the tombstone as authoritative.

The prior audit (`docs/CANONICAL_AUDIT.md` Finding #1) recommended `git rm NEXT_SESSION_QUEUE.md`. Still present. As long as it stays, ROADMAP and BACKLOG's references aren't strictly broken (the redirect file IS there), but they're misleading.

### 5. `package.json` version (`0.5.57`) is far behind CONTEXT.md (`0.25.2`)
**Severity:** low / convention-aware

`X:\YesAndChains\package.json` carries `"version": "0.5.57"` while CONTEXT.md is on `0.25.2` and CLAUDE.md confirms CONTEXT is the version pill. Per the CONTEXT.md changelog `0.25.2` entry, there's also an internal `YAC_VERSION` in `src/util.ts` that was "stuck at 0.18.0" and got synced to BUILD_VERSION.

Given CLAUDE.md explicitly says "the version pill lives in CONTEXT.md," this is more "package.json hasn't been kept current" than "canonical doc drift." Not a Phase-1 audit blocker, but worth flagging since downstream tooling (npm tooling, CI) may key off `package.json`.

### 6. `crawler_project_notes.md` is still at repo root
**Severity:** very low (housekeeping)

Single-purpose crawler notes file living at root next to canonical docs. Prior `docs/CANONICAL_AUDIT.md` (Finding #4) suggested moving it to `tools/` or `docs/`. Still at root.

### 7. ROADMAP.md "✓ shipped 0.13.61" annotations refer to a never-deployed version
**Severity:** low (cosmetic; the work landed regardless)

ROADMAP.md uses `✓ shipped 0.13.61` to mark §32.1 storage projection, §27 daily welcome message rotation, §28 In-Regulation surfacing, and the 9th preship gate. But the `0.13.61` CONTEXT.md changelog entry is annotated:

> `0.13.61` (2026-05-04, never deployed — see 0.13.62 entry)

So the work technically went out under 0.13.62 (or later). ROADMAP's "shipped 0.13.61" tags are accurate as a code-landed marker but inaccurate as a "deployed" marker, which is the more common reading of "shipped."

---

## Suggested fixes

All low-risk text edits unless flagged otherwise.

1. **Fix the `PRIORITY_QUEUE.md` phantom in CONTEXT.md.** Edit `CONTEXT.md` lines 22–26 to point at `docs/launch-checklist-1.0.md` instead of `PRIORITY_QUEUE.md`. One short find-replace. (Already on the prior audit's action list.)

2. **Fix the migration filename in ROADMAP.md.** Line 51: `0009_skill_profile.sql` → `0011_skill_profile.sql`.

3. **Strike or rewrite the §22 Tier-B entry in ROADMAP.md.** Both §22a and §22b are shipped. Either move to a "shipped since this refresh" note, or delete from Tier B and add to the "What's live" section.

4. **Bump the "as of 0.24.5, deployed" anchor in ROADMAP.md** to the current CONTEXT.md version (`0.25.2`), and either run a one-pass refresh of "What's live" to capture 0.25.0 (visual modernization), 0.25.1 (account deletion), 0.25.2 (feedback inbox swap), or add a one-line "last refreshed YYYY-MM-DD against vX.Y.Z" stamp at the top so future drift is obvious.

5. **Either `git rm NEXT_SESSION_QUEUE.md` and clean up the two stale references (ROADMAP line 11, BACKLOG line 149), OR keep the redirect and update both references to call it a tombstone.** The prior audit picked the `git rm` path. Either is fine, but the current half-state (file present + docs treating it as live) is the worst option.

6. **Optional: bump `package.json` `version` to `0.25.2`.** Not strictly required since CONTEXT.md is the source of truth, but it would stop external tooling from displaying a wildly stale number. Low-risk.

7. **Optional: move `crawler_project_notes.md` into `tools/` or `docs/`.** Cleanup, not correctness. (Already on the prior audit's action list.)

8. **Optional / cosmetic: change "shipped 0.13.61" tags in ROADMAP.md** to "shipped 0.13.62" (or "landed 0.13.61, deployed 0.13.62") for the four affected items.

---

## Couldn't verify

- **Whether the canonical KV courses count is still "~6,300"** as CLAUDE.md and ROADMAP.md both state. Verifying would require querying live KV; out of scope for a doc-audit.
- **Whether the worker is actually deployed at version-parity with CONTEXT.md.** The 0.25.0/0.25.1/0.25.2 changelog entries describe worker-side changes; verification would need a live `caddy-api.theprophetkane.workers.dev` request.
- **Whether Supabase migration `0012_delete_my_account.sql` has actually been applied to the live database.** The changelog says it's idempotent and needs manual application; the file exists on disk, but I can't confirm runtime application from docs alone.
- **DNS registrar transfer status from Squarespace to Cloudflare** (CLAUDE.md says pending 5-7 days from 2026-05-06; today is 2026-05-14, so it should be at or near completion, but that's a DNS check not a doc check).
- **Whether `legal/terms.md` / `legal/privacy.md` / `legal/README.md` exist.** Launch checklist N1 implies they should; not glob-checked in this audit (out of scope for canonical-layer drift, would belong in a 1.0 launch readiness audit).
