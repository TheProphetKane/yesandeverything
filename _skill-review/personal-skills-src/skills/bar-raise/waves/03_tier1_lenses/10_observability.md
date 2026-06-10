# Tier-1 Lens 10: Observability

## The question

When something goes wrong, can the user see it? When something is going wrong slowly, will the user notice before it bites? Where is the signal-to-noise ratio in logs and alerts wrong?

## What to look at

- Log calls in the worker / API code (YaC worker, Scheduler worker, YaB API). Are they structured? Are they sampled?
- Discord notify channels. Are post-failure logs going somewhere useful?
- Dashboards. The new yesandeverything.com/status/ page is the meta-observability surface; is it actually being used? Are the JSONs current?
- Game-side telemetry. HBH + BR profile data: where does it land, who reads it?
- Audit report cadence. Are the scheduled audits actually firing? Check `_skill-review/PENDING_SCHEDULED_TASKS.md` for the registry.

## Severity grading

- **HIGH**: A failure mode that has shipped without observability and was caught only by user notice (or worse, by a downstream user) -- log retroactively + add the signal.
- **MEDIUM**: A path that logs but at the wrong level (info-level for a real error; debug-level for a 5xx response).
- **LOW**: Verbose logging that drowns the signal you want.

## Output shape

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "observability"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
