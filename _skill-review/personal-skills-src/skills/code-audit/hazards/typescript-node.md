# TypeScript + Node hazards

Load when auditing `.ts` / `.tsx` files in YaB / YaC / Scheduler.

## Locked-decision violations (BLOCK on YaB)

### Money as REAL or float (YaB D-003)

```ts
// BAD - D-003 says integer cents everywhere
const amount: number = 19.99;
```

D-003 is the cents-everywhere rule. Schema columns `transactions.amount`, `accounts.starting_balance`, `budgets.cents_per_month` all hold INTEGER cents. JS `number` is fine if you carry integer cents (1999 for $19.99); REAL/float columns at the DB layer are forbidden.

Fix: use integer cents; `packages/shared/src/money.ts` is the only place dollars-to-cents conversion happens. Validate at API boundary via `guardCents`.

### serve() without hostname (YaB D-006)

```ts
// BAD - binds to all interfaces; D-006 requires loopback
serve({ fetch: app.fetch, port: PORT });
```

D-006 locks loopback-only binding. `@hono/node-server` forwards undefined hostname to `net.Server.listen()`, which Node resolves to `0.0.0.0`/`::`.

Fix:
```ts
const HOSTNAME = process.env.YAB_HOSTNAME ?? "127.0.0.1";
serve({ fetch: app.fetch, port: PORT, hostname: HOSTNAME });
```

Regression test at `apps/api/src/server-bind.test.ts` enforces this.

### Backup-fail proceeds anyway (YaB D-007)

```ts
// BAD - D-007 says BLOCK the import if backup fails
try {
  await createBackup("pre-import");
} catch (e) {
  console.warn("backup failed, proceeding without snapshot:", e);
}
```

D-007 (supersedes part of D-004): backup-fail must throw `BackupFailedError`, route returns HTTP 503 with `code: "backup_failed"`. The import does NOT proceed.

Fix:
```ts
try {
  await createBackup("pre-import");
} catch (e) {
  throw new BackupFailedError(`backup failed; refusing to import without rollback path: ${(e as Error).message}`, e);
}
```

## Logic smells (MEDIUM)

### Swallowing errors with `console.warn` then proceeding

`try { ... } catch (e) { console.warn(e); }` is almost always a bug. The error usually means the operation didn't do what the rest of the code assumes happened. Either: (a) handle the failure explicitly (return early, return a typed error, retry), or (b) let the throw propagate.

Exception: bounded best-effort operations like logging (the `logEvent` helper itself wraps its insert in try/catch to avoid the logger taking down the request that produced the event).

### Async function never awaited

```ts
// BAD - the promise is fire-and-forget; errors disappear
runImport(format, content, accountId, filename, mapping);
```

If the route handler is async, every async call needs `await` (or a deliberate `.catch(...)`).

### Building regex inside a hot loop

```ts
// BAD - new RegExp per (tx, rule) pair
for (const tx of txs) {
  for (const r of rules) {
    if (new RegExp(r.pattern, "i").test(tx.description)) { ... }
  }
}
```

Fix: precompile once before the outer loop. YaB rules-engine hit this (2026-05-26 bar-raise); fix landed in v0.10.0.

### Forgotten `--break-system-packages` on pip

(Not TypeScript but lives in this catalog because it bites the scripts that wrap these projects.) On Debian/Ubuntu pip without that flag refuses to install. Always include it in install instructions.

## Cloudflare Workers / D1 quirks (Scheduler-specific)

- No `RIGHT JOIN`, no `FULL OUTER JOIN` in D1 SQLite. Use `LEFT JOIN` with reversed table order.
- Limited `ALTER TABLE` (no DROP COLUMN, limited RENAME). Plan migrations accordingly.
- Worker free-tier: 50ms CPU limit, 30s wall-clock. Profile schedule auto-fill on ~25 employees * 6 weeks to confirm it stays under.
- Cloudflare Pages Functions and Workers are DIFFERENT runtimes. Don't conflate.

## Test discipline (MEDIUM)

- Co-locate `*.test.ts` next to source.
- Schedule auto-fill (Scheduler DESIGN §8) needs comprehensive unit tests covering all phases.
- New analytics function in YaB without a co-located test → MEDIUM finding (subscriptions + forecast got tests this way 2026-05-28).
- `vitest --passWithNoTests` is a CI lie. Retire it (YaB did v0.10.0).
