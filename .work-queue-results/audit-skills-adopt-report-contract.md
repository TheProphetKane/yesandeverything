# audit-skills-adopt-report-contract result

- Finished: 2026-06-11T16:35:00Z
- Status: done (skill installs pending user click)

## What was done
Adopted the bar-raise REPORT_CONTRACT finding shape (id, severity, impact 1-5, confidence 1-5, evidence, finding, suggested_action, tensions_with) across the audit family so all output is machine-readable and queue items are uniform:

- project-canonical-audit: Drift-found findings now carry the contract fields; Phase 8 queue items carry severity/impact/confidence/evidence/tensions_with through to .work-queue.json with the severity-to-priority map.
- handler-audit: Phase 4 findings formatted in contract shape; Phase 6 enqueue carries the fields through.
- code-audit: findings-by-category lines carry id + impact/confidence + evidence; Phase 4 queue append carries the contract fields verbatim (deterministic hits are confidence 5).

## Files touched
- _skill-review/personal-skills-src/skills/{project-canonical-audit,handler-audit,code-audit}/SKILL.md
- Repackaged + staged: _skill-review/{project-canonical-audit,handler-audit,code-audit}.skill

## Followups
- Install the three .skill cards (Save skill) so scheduled audit runs pick up the contract.
