# Domain Lens: release-pipeline / 03 version pill drift

## The question

Are the version pills (CHANGELOG, package.json, GDD pill, in-app footer) actually staying in lockstep? Where has one drifted out of sync?

## What to look at

- Each project's version-source-of-truth: HBH/BR docs/GDD.html, YaC/YaB package.json, YaA PROJECT_SPEC.md.
- The validator (when present): check-version-pill.ps1 (YaA), the pill comparison in release.ps1 (YaB), Test-VersionPills helper.
- Recent releases where the validator was bypassed.
- App-displayed version (footer, sidebar, splash). Does it match the source-of-truth pill?

## Severity grading

- **HIGH**: Three or more locations disagree on the current version.
- **MEDIUM**: Two locations disagree; one is the canonical source.
- **LOW**: App display lags one patch behind; trivial fix.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Version pill drift
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
