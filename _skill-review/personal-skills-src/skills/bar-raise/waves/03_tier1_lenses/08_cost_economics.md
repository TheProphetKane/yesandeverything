# Tier-1 Lens 08: Cost economics

## The question

Where is this project burning money or token budget in a way that is not justified by the value produced? Where is a free-tier limit about to bite? Where is a third-party cost projection wrong for the actual usage?

## What to look at

- Cloudflare Worker invocations + KV reads/writes (YaC, Scheduler). Free tier is generous but not infinite.
- Supabase rows + auth events (YaC, Scheduler).
- Resend SMTP sends (YaC magic-link).
- LLM token spend on scheduled audits + bar-raises + cross-project digests. Cap and budget.
- GitHub Pages bandwidth (YaE; the 12 MB course_data.json on YaC, served via worker so not Pages).
- Local resources: SQLite file growth (YaB), git repo size (BR has 137 MB of assets).

## Severity grading

- **HIGH**: A free-tier limit will hit within the current milestone (YaC course-refresh quota; Supabase row cap); OR token spend on scheduled work has tripled in the last 30 days without a feature change to justify it.
- **MEDIUM**: A cost projection that is wrong by 2-5x; a free-tier limit that will hit within 6 months at current trajectory.
- **LOW**: A nominal cost the user has not budgeted for (a one-time fee, a renewal).

## Output shape

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "cost-economics"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
