# Queue triage 2026-05-29

## TL;DR

Eight non-auto-safe queue items have aged past the 7-day threshold. Oldest is `anti-drift-htbh-numbers-tab-autogen-017` at 14 days. HTBH and YaA are tied for largest stale backlog (3 items each). Two items dropped on this pass for stale premises (referenced file replaced or removed).

## HTBH

**anti-drift-htbh-numbers-tab-autogen-017** (P2, added 2026-05-15, 14 days old)

- Prompt summary: Numbers tab in `docs/GDD.html` hand-encodes HP, cost, defense, worker counts, footprint for every v1 building, and the `.gd` files in `source/buildings/` are the actual truth. Structural fix is a build-time pre-processor in `publish-gdd.ps1` that reads the building files and rewrites the rows.
- Recommended verdict: Defer to HBH-mount unblock
- Why: Requires `X:\HereThereBeHordes\source\buildings\*.gd` access; blocked behind `htbh-audit-mount-or-sidecar-2026-05-28`. Real and worth doing once mount lands.

**htbh-wonders-s9-effects-021** (P2, added 2026-05-16, 13 days old)

- Prompt summary: GDD §9 Tier 4 Wonders Effect column drifts from shipped code on every row (Cornucopia, Perpetual Engine, Pyre, Sanctum). Decision needed: amend §9 to match code, or rewrite code to match §9.
- Recommended verdict: Do this session
- Why: Pure design call; takes one Nick decision per wonder, no engineering. Read once, decide four times, done.

**htbh-repair-priority-storage-shed-key** (P3, added 2026-05-19, 10 days old)

- Prompt summary: `REPAIR_ALL_PRIORITY` dict in `gameplay.gd` carries `'Storage Shed': 3` but no building uses that name. Dead key. Decision: rename to `'Warehouse'`, remove the key, or add the intended building.
- Recommended verdict: Do this session
- Why: Tiny decision, single edit, no design knock-on. Easy hand-on-wheel call.

## YaE

(no aging non-auto-safe items remain after this pass; see `## Auto-applied`)

## YaA (YesAndApothecary)

**yaa-roadmap-trailing-m3-m4-036** (P2, added 2026-05-18, 11 days old)

- Prompt summary: `PROJECT_SPEC.md` §9 roadmap carries duplicate milestone headers after M5: a second M3 Export and M4 Themes that conflict with the real M3 (Back label) and M4 (Multi-culture data). Decision: delete, demote to Backlog, or renumber into M6/M7.
- Recommended verdict: Do this session
- Why: Three-option call, single file, no code involvement. Fast.

**yaa-delete-categories-stub-047** (P3, added 2026-05-20, 9 days old)

- Prompt summary: `data/categories.js` is a tombstoned stub with no functional code and no importers in `src/`. Delete the file via `scripts/release.ps1 -Message "remove tombstoned categories.js stub" -Bump none`.
- Recommended verdict: Do this session
- Why: Verified `data/categories.js` still exists. Shell op (release script) needs Nick's go but the call itself is decided. One sentence of authorization closes it.

## Scheduler

**scheduler-design-preference-log-decision-042** (P2, added 2026-05-19, 10 days old)

- Prompt summary: `DESIGN.md` §7.3 claims a `preference_log` table for auditability, but no such table exists in any migration and no code writes to it. Options: (a) add migration + write logic, (b) remove the claim, (c) emit `audit_log` events from the preferences route on every change.
- Recommended verdict: Do this session
- Why: Three-option architectural call, no code yet committed either way. Cheapest path is (c) since `audit_log` already exists; Nick should still call it.

## Auto-applied

**yae-htbh-preview-republish** (P2, added 2026-05-19, 10 days old) — Dropped.

- Evidence: `X:\YesAndEverything\projects\here-there-be-hordes\gdd.html` is already a 3-line meta-refresh stub redirecting to `/hordes/`. Path B from the queue prompt has shipped. YaE `CLAUDE.md` documents the file's current state as "Dead-weight legacy file from pre-v0.26.18 publish flow. Now a 3-line meta-refresh stub that redirects to `/hordes/` so any old bookmark still lands on the gate."

**yapothecary-integrity-guard** (P2, added 2026-05-18, 11 days old) — Dropped.

- Evidence: `X:\YesAndApothecary\push.ps1` does not exist; the release pipeline moved to `scripts/release.ps1` orchestrating `check-version-pill.ps1` + `push-to-github.ps1` + `deploy-to-yae.ps1` + `push-yae-mirror.ps1` + `discord-notify.ps1`. The version-pill integrity check the queue prompt asks for is already implemented as `scripts/check-version-pill.ps1` and is run inside `release.ps1`. The Discord webhook URL concern is resolved: `scripts/.discord_webhook.txt` is the documented webhook store per YaA `CLAUDE.md`.
- Note: If a broader `Test-ApothecaryIntegrity` (HTML tail check, node `--check` on `src/main.js`, no conflict markers in tracked files) is still wanted, that wants a fresh queue item shaped against the live `release.ps1`, not this one.
