# scheduler-design-routes-prune-026 result

- Started: 2026-05-27 (queue-drain-frequent)
- Finished: 2026-05-27
- Status: done
- Prompt: DESIGN.md §17 Page/Route Map: remove the `/auth/callback` line and remove the `/admin` Admin overview line. Resolves 2026-05-24 audit LOW-7 + LOW-8.

## What was done

- Verified against `apps/web/src/App.tsx`: no `<Route path="/auth/callback">` (Supabase SDK swallows the magic-link return inside AuthProvider, no React route); no `<Route path="/admin">` overview (only the four sub-routes under RequireAdmin).
- Deleted DESIGN.md line 423 (`/auth/callback ...`).
- Deleted DESIGN.md line 439 (`/admin ... Admin overview`).
- §17 block now matches the actual App.tsx route table for /admin/{departments,users,audit,settings}.

## Files touched

- X:\YesAndScheduler\docs\DESIGN.md (2 line deletions in §17)

## Verification

- Re-read §17 after edits. Block is clean, 24 lines, ends correctly.
- Tail of file still intact (no FUSE truncation).

## Followups recommended

- App.tsx exposes `/admin/holidays` (line 65) which is missing from DESIGN.md §17. Same shape as the just-fixed drift, separate row. Queue as a new drift-fix.

## Drain context

- Working tree dirty in X:\YesAndScheduler. Not pushed (release.ps1 is a shell command; drain rule pauses for Nick).
