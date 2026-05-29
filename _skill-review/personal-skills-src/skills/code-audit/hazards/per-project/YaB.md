# YesAndBudget project-specific hazards

`X:\YesAndBudget`. Local-first personal budget tool. Solo + close-friends scope. Each user runs their own local copy.

## Always-on checks

- `checks/secret_exposure.py` (HIGH on .finances/, .env, *.db, *.pem)
- `checks/version_drift.py` (package.json + apps/web/package.json + apps/api/package.json + packages/shared/package.json + apps/web/src/App.tsx pill + docs/DESIGN.md "Version:" line + git tag must all agree)
- `checks/voice_violations.py` (CHANGELOG.md, README.md, docs/DESIGN.md, docs/DECISIONS.md)

## Locked-decision enforcement (BLOCK)

### D-001 / D-002 / D-005: bank data never leaves the machine

Code or config introducing outbound network calls with raw transaction data → BLOCK. The LLM categorization fallback (when added) is opt-in and sees ONLY normalized merchant strings.

### D-003: cents everywhere

Any new money column declared as REAL / FLOAT / NUMERIC → BLOCK. JS `number` is OK as long as integer cents are carried; `packages/shared/src/money.ts` is the only place dollars-to-cents conversion happens. New code at the API boundary that accepts user-supplied money values must call `guardCents`.

### D-006: API binds to loopback only

`apps/api/src/server.ts` must call `serve({ ..., hostname: HOSTNAME })` where `HOSTNAME = process.env.YAB_HOSTNAME ?? "127.0.0.1"`. Any new `serve(` call missing the hostname arg, or defaulting to `0.0.0.0` → BLOCK.

Regression test at `apps/api/src/server-bind.test.ts` enforces this; if that test gets deleted or `it.skip`-ed → BLOCK.

### D-007: import + rollback fail strict on backup-fail

`runImport` and `rollbackImport` in `apps/api/src/import-pipeline.ts` must `throw new BackupFailedError(...)` when `createBackup` throws. The route at `POST /api/imports/file` and `DELETE /api/imports/:id` must catch and return HTTP 503 with `code: "backup_failed"`. Any new code that warn-and-proceeds on backup failure → BLOCK.

Regression test at `apps/api/src/import-pipeline.test.ts` enforces the error shape; if deleted or skipped → BLOCK.

## Bank-data leak watch (HIGH)

`.finances/` was git-tracked through 2026-05-28. Now in `.gitignore` and removed from index. If audit finds:
- `.finances/` files newly git-tracked → BLOCK
- Any new `.csv` / `.pdf` file outside `.gitignore`d paths that contains real account numbers, real balances, or real merchant transactions → HIGH (manual triage)

## API-shape consistency

- All errors as `{ error: string, code?: string }` with appropriate status codes (DESIGN §16).
- 400 for validation, 503 for backup-fail, other 5xx for genuine server errors.
- Routes follow REST-ish conventions (kebab-case paths, JSON request/response).

## Analytics surface modules

`apps/api/src/analytics.ts` was logically split into `apps/api/src/analytics/{outliers,subscriptions,forecast,swaps,money-left}.ts` in v0.10.0. The physical extract is queued in BACKLOG as P2. New analytics code should import from the surface module (`./analytics/forecast.js`) not the barrel (`./analytics.js`).

## Test discipline

- Co-locate `*.test.ts` next to source.
- New analytics functions without tests → MEDIUM (covered by 2026-05-26 bar-raise action 4).
- `vitest --passWithNoTests` was retired; do not reintroduce.

## SQLite quirks

better-sqlite3 + integer cents per D-003. The integrity guard ALWAYS uses `pragma foreign_keys = ON`. Migrations are sequential and additive (PRAGMA table_info check before ALTER TABLE).

## Release-script-specific

`scripts/release.ps1` has:
- Step 0: preship.ps1 gate
- Step 1: version bump + stamp + CHANGELOG prepend
- Step 1.5: byte-identical CHANGELOG body refusal (v0.10.0)
- Step 2: push-to-github.ps1
- Step 2.5: write-dashboard-status.ps1 (with barRaise block preservation, v0.10.0)
- Step 3: discord-notify.ps1

If any step gets removed or any of the v0.10.0 hardenings get reverted → HIGH.
