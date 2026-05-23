# scheduler-design-security-section-041 result

- Started: 2026-05-23T (queue-drain-frequent automated run)
- Finished: 2026-05-23T
- Status: done
- Prompt: Replace the bcrypt/cookie sentence in DESIGN.md §20 with the magic-link/JWT sentence.

## What was done

Single-line text swap on X:\Scheduler\docs\DESIGN.md line 507.

Before:
> Passwords are bcrypt-hashed at cost 12. Sessions are HttpOnly secure cookies. CSRF protection via SameSite=Lax + an Origin-header check on state-changing routes. SQL is parameterized; no string concat into queries.

After:
> Identity is delegated to Supabase Auth (magic-link). No passwords are stored. Sessions live in browser storage as Supabase JWTs; each request carries the JWT as a Bearer token verified by the Worker. CSRF protection via SameSite=Lax plus Origin-header check on state-changing routes. SQL is parameterized; no string concat into queries.

Kept the trailing "no string concat into queries" clause that the prompt template dropped, since it adds substantive detail and removing it would be a regression.

## Files touched

- X:\Scheduler\docs\DESIGN.md (line 507)

## Followups recommended

DESIGN.md §20 line 503 still describes stored PII as "name, optional email, hashed password, and work-preference data." With magic-link auth there is no hashed password, and email is required (it is the login identifier) not optional. Recommend queueing a sibling drift-fix to rewrite that sentence as: "name, email (required, used as the login identifier), and work-preference data" and drop the "hashed password" item.

## Notes

Uncommitted; will land in next Scheduler push via release.ps1.
