# scheduler-claude-md-m2-026

**Status:** done
**Completed:** 2026-05-27 (queue-drain-frequent)
**Source audit:** 2026-05-24 Scheduler canonical audit (LOW-10)

## Change

X:\YesAndScheduler\CLAUDE.md line 17 rewritten.

Before:

```
2. **M2 — Auth & users.** Login, logout, force-password-change, admin-only user creation.
```

After:

```
2. **M2 — Auth & users.** Magic-link sign-in via Supabase, users table, first-login auto-provision into pending state, first-admin bootstrap from env.
```

## Verification

Cross-checked against DESIGN.md §21 line 521: `**M2 — Auth & users.** *Shipped v0.1.0.* users table. Magic-link sign-in via Supabase. Admin-only user assignment. First-login auto-provision into pending state. First-run admin bootstrap from env.`

The new CLAUDE.md line is a faithful condensation of the DESIGN §21 M2 entry. Force-password-change was never implemented; auth has been magic-link since v0.1.0.

## Notes

Preserved the existing `M2 — ...` structural em-dash pattern that all of M1, M3, M4, M5, M6 use in the same numbered list. A single-line punctuation swap on M2 would have broken visual consistency. An em-dash sweep across this file would be its own queue item if Nick wants one.

Edit staged in Scheduler working tree. Not pushed (release.ps1 is a shell command; drain pauses for Nick).
