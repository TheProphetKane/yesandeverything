# Domain Lens: public-voice / 03 brand consistency cross artifact

## The question

Do the public-facing pieces (landing page, project sub-pages, GDD, README, Discord) tell the same story about each project? Where do two artifacts contradict each other about what the project is?

## What to look at

- The YaE landing page card per project vs the project-sub-page vs the project's README vs the GDD pitch.
- Naming: 'Brackish Rising' / 'Here Be Hordes' / 'YesAndChains' -- always spelled the same in public copy?
- Tagline / pitch consistency. The 'industrial-era horror RTS' line on HBH should match across artifacts.
- Version pills in public artifacts. The YaE landing card version should match the live GDD pill.
- Color / palette consistency on per-project sub-pages.

## Severity grading

- **HIGH**: Two public artifacts make contradictory claims about a project (genre, scope, milestone).
- **MEDIUM**: A version pill that is off; cosmetic for the user but signals neglect.
- **LOW**: A taglineslightly rephrased across pages; cosmetic.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Brand consistency cross-artifact
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
