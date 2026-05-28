# scheduler-design-pii-line-026 result

- Started: 2026-05-27T(queue-drain-frequent)
- Finished: 2026-05-27T(queue-drain-frequent)
- Status: done
- Prompt: DESIGN.md §20 opening sentence rewrite — drop "optional email, hashed password", replace with "email, Supabase user id".

## What was done

- Located the opening sentence of DESIGN.md §20 Security & Privacy at line 503.
- Replaced "no PII beyond name, optional email, hashed password, and work-preference data." with "no PII beyond name, email, Supabase user id, and work-preference data."
- §1.1 already carries the matching long-form sentence ("email (required — used as the login identifier), and the foreign key to the Supabase Auth user row"), so the two sections now agree.
- Tail-check confirms file is 607 lines and still ends with the `Document maintained in scheduler/docs/DESIGN.md` pointer (no FUSE truncation).

## Files touched

- X:/Scheduler/docs/DESIGN.md (line 503)

## Followups recommended

- Working tree is dirty in X:/Scheduler. Ship via `X:/Scheduler/scripts/release.ps1` when next Scheduler batch lands; resolves 2026-05-24 audit LOW-12.
- §1.1 phrases the same point twice with slightly different framing. Not in this item's scope, but worth a future hygiene pass to confirm §1.1 and §20 stay in lockstep on the PII inventory.
