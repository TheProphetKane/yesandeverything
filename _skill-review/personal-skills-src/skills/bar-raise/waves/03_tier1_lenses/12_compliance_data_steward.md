# Tier-1 Lens 12: Compliance / data steward

## The question

Is the project keeping the promises it makes about other people's data and other people's work? Where does scraped, licensed, or user-contributed content flow, and would any of it embarrass the project if the source showed up asking questions?

## What to look at

- Data-residency promises. YaB's "bank data never leaves the machine" rule: any outbound call carrying raw transactions breaks it. Verify the LLM categorization fallback (when present) stays opt-in and normalized-strings-only.
- Scraped and third-party data. YaC's `course_data.json` (~6,300 scraped courses): refresh etiquette and throttles in `tools/cron_course_refresh.py`, attribution posture, upstream ToS exposure.
- User-contributed content. YaC canonical pin/geometry contributions, Scheduler employee records: retention, deletion path, who can see what, and whether anonymous vs signed-in boundaries hold.
- Licensing of shipped assets. Font licenses, purchased art packs (HBH `_ARCHIVE/` sources adopted by copy into `assets/art/`), icon sets. Adopted-by-copy assets keep their license obligations.
- PII surfaces. Scheduler stores employee names, emails, and preferences; CSV exports and logs should not leak more than the UI does.
- Stated policy vs reality. `robots.txt` promises, the YaE `terms/` page claims, password-gated mirrors actually gated, gitignore actually covering the secret paths named in `secret_exposure_paths`.

## Severity grading

- **HIGH**: A promise about data is broken in code today (raw PII or bank data leaving the machine, a shipped artifact violating an asset license, a scraped-source ToS breach with real exposure, a "gated" mirror reachable ungated).
- **MEDIUM**: A stated promise with no enforcement (policy written down but no guard or test), or a missing retention/deletion path for data already being collected.
- **LOW**: Missing attribution polish, a stale terms page, undocumented license provenance for an asset.

Hard-rule overlap: when the breach matches a `hard_rules` entry in the project's `.project-context.json` (the YaB residency rule is one), set `blocking: true` per the contract. Everything else, however severe, stays a scored finding.

## Output shape

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "compliance-data-steward"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
