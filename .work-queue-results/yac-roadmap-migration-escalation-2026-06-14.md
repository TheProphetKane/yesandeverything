# yac-mnew-roadmap-escalation-clarify — decision-ready

Run: 2026-06-14 overnight-queue-drain. Source: docs/CANONICAL_AUDIT-2026-06-01.md#F7.

## Finding (grounded)

ROADMAP.md:134 "How AI-vs-human work splits" lists under escalate-to-Nick:
"Supabase Storage buckets, Supabase migrations (SQL), worker secrets, Anthropic API key
changes, scope decisions, breaking schema changes, anything that touches live KV without a
backup, anything that costs money beyond tier limits."

State on disk: supabase/migrations/ holds 0001-0017. Migrations 0015 (shared_rounds),
0016 (subscription), 0017 (admin_roles) shipped in the 0.30-0.36 release band. The audit
read this as "autonomous migration ships contradict the escalate-to-Nick line."

Commit authorship is not separable from the evidence: every migration-touching commit uses
the release script's generic "feat(yac): vX.Y.Z - code update" auto-summary, so the log does
not prove a migration shipped without Nick's review. The likely reality is the current policy
working as intended: AI drafts the SQL, Nick reviews and ships via release.ps1.

## Why this is not auto-resolved

Relaxing a safety-escalation boundary is a risk-tolerance call, not doc drift. A bad migration
against the live multi-user Supabase DB is destructive and not cleanly reversible. The cost of a
one-line Nick approval per migration is near-zero; the cost of an autonomous bad migration is real.

## Recommendation (one-line lock for Nick)

KEEP migrations as escalate-to-Nick, and tighten the wording so future audits stop re-flagging it:
change the line to read that AI may DRAFT migration SQL autonomously but Nick reviews and approves
the SQL before any ship. That makes the doc describe the actual working split and removes the
apparent contradiction without loosening the safety gate.

If Nick instead wants AI to ship migrations autonomously, say so and the line gets cut from the
escalate list; that is the values call this item is waiting on.
