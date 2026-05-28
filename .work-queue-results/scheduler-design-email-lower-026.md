# scheduler-design-email-lower-026 result

- Started: 2026-05-26T(queue-drain-frequent)
- Finished: 2026-05-26T(queue-drain-frequent)
- Status: done
- Prompt: DESIGN.md §15: add `email_lower (unique, NOT NULL)` and remove the `unique` qualifier from `email` in the `users` column list. Matches migrations/0002_auth.sql.

## What was done

Verified migrations/0002_auth.sql lines 13-14, 24: `email TEXT NOT NULL` (not unique), `email_lower TEXT NOT NULL`, `CREATE UNIQUE INDEX idx_users_email_lower ON users(email_lower)`. The DESIGN.md row claimed `email (unique, NOT NULL)` which contradicted the actual schema.

Edit applied to X:\Scheduler\docs\DESIGN.md line 323: changed `email (unique, NOT NULL), display_name` to `email (NOT NULL), email_lower (unique, NOT NULL), display_name`. Single-line edit, surrounding text untouched.

## Files touched

- X:\Scheduler\docs\DESIGN.md (line 323, users column list)

## Followups recommended

None standalone. The same audit pass that surfaced this item generated five sibling drift-fix queue items for the same DESIGN.md doc (scheduler-design-generation-seed-026, -routes-prune-026, -workflows-026, -claude-md-m2-026, -pii-line-026). The next queue-drain-frequent tick will pick up the next one.

Edit is staged in the Scheduler working tree; not pushed (scripts/release.ps1 is a shell command and the drain rule pauses for Nick).
