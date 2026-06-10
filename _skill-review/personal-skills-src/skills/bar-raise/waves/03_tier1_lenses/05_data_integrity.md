# Tier-1 Lens 05: Data integrity

## The question

Where can the data model end up in a state the code does not expect? Where is the schema correct on paper but enforced loosely in practice? Where do migrations and backups guard against the failures that actually happen?

## What to look at

- Schema vs reality. YaB transactions table; Scheduler users/shifts/preferences; YaC courses/overlays/contributions.
- Dedupe keys. Are they enforced at the DB layer (UNIQUE) or trust-based?
- Migration safety. Do they run on a non-empty DB without data loss? Are backups taken first?
- Save-format stability for games (HBH save format, BR save format -- BR has not authored saves yet, flag).
- Foreign-key integrity. Does the code rely on FK constraints, and are they actually present?
- Audit trails. Is there an `imports` table with row counts? An ADR for every Decision? A CHANGELOG entry per release?

## Severity grading

- **HIGH**: A path that can write a malformed record OR a migration that loses data on a pre-existing row.
- **MEDIUM**: An enforced constraint that the code does not handle gracefully on violation (UNIQUE conflict throws a 500 instead of returning a dedup count).
- **LOW**: A nice-to-have audit trail gap that has never bitten in practice.

## Output shape

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "data-integrity"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
