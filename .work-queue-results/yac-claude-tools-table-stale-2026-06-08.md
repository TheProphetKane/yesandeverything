# yac-claude-tools-table-stale-2026-06-08 result

- Started: 2026-06-11T01:09:00Z
- Finished: 2026-06-11T01:09:00Z
- Status: done
- Prompt: CLAUDE.md tools table claims 'six active scripts (as of 0.34.2)'; tools/ now holds eleven. Update the table and bump the marker to 0.50.0.

## What was done

Verification only; no edits needed. The drift this item reports was already fixed in the live handler after the 2026-06-08 audit:

- X:\YesAndChains\CLAUDE.md line 59 reads "## Tools layout (as of 0.51.0)" (marker is 0.51.0, past the requested 0.50.0).
- Line 61 reads "tools/ is eleven active scripts."
- The table lists all eleven: audit_window_exposure.py, cron_course_refresh.py, force_refresh_courses.py, course_parser.py, safe_write.py, update_repo_metadata.py, chat_smoke.py, fill_flight_numbers.py, pdga_crosscheck.py, pdga_type_backfill.py, preship.sh.
- Cross-checked against the actual tools/ directory: all eleven scripts present, names match the table exactly.

The "drift-auto-fix never auto-edits CLAUDE.md" constraint in the item notes was honored; nothing was edited. Closed as already-fixed.

## Files touched

None (verification only).

## Followups recommended

None.
