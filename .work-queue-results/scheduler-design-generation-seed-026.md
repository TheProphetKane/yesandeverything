# scheduler-design-generation-seed-026 — result

**Completed:** 2026-05-26 (queue-drain-frequent)
**Source audit:** 2026-05-24 Scheduler canonical audit (LOW-6)

## Change

`docs/DESIGN.md` §15 `shifts` row: added `generation_seed` (INTEGER, nullable) to the column list with a short parenthetical pointing at §8.6 (determinism claim).

Before:

> `shifts` — ... `is_published` (bool), `published_at`, `published_by_user_id`

After:

> `shifts` — ... `is_published` (bool), `published_at`, `published_by_user_id`, `generation_seed` (INTEGER, nullable; backs the §8.6 determinism claim)

## Verification

- `migrations/0004_schedule.sql` line 16: `generation_seed INTEGER,` — matches.
- `docs/DESIGN.md` file integrity: 608 lines, tail intact (ends with the standard "Document maintained..." footer).
- No other §15 column lists touched.

## Push status

Edit staged in Scheduler working tree. Not pushed — release.ps1 is a shell command and queue-drain rule pauses for Nick on shell ops. Nick should batch this with the other pending P3 DESIGN.md drift-fix items (-routes-prune, -workflows, -claude-md-m2, -pii-line) into one release.
