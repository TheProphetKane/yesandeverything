# Domain Lens: orchestration / 01 skill suite health

## The question

Are the skills in `personal-skills-src/skills/` triggering when they should and not when they should not? Where do trigger phrases overlap badly enough that the wrong skill fires?

## What to look at

- Each `SKILL.md` description: list its trigger phrases.
- Cross-skill: phrases that match two skills (e.g. 'audit X' could match canonical-audit or handler-audit or bar-raise).
- Skills that have never fired in recent memory; either dead weight or never-triggered.
- Skills that fire too eagerly; signal-vs-noise ratio.
- The skill-creator workflow's eval pass: when was the last accuracy benchmark run on the suite?

## Severity grading

- **HIGH**: Two skills triggering on the same phrase routinely; Claude picks the wrong one and the user has to disambiguate.
- **MEDIUM**: A skill that has not fired in 60+ days; either dead or poorly described.
- **LOW**: A trigger phrase that is technically valid but produces too many false positives.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Skill suite health
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
