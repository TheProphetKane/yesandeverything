# Domain Lens: game-design / 08 save format stability

## The question

Can old saves be loaded by the current build? Where will a save-format change next break user data? Is there a versioned save-migration path?

## What to look at

- Save files in `source/save/*.gd` or wherever the save format is defined.
- Save schema versioning. Is there a version int in the save header? When was it last bumped, and was a migration written?
- Test coverage: do any tests load a fixture save from an older version?
- BR: save format does not exist yet (M1 deliverable). Flag this as a 'plan to land' finding, not a current bug.
- HBH: was save format locked, or is it still informal? GDD §10 has the spec; reality?

## Severity grading

- **HIGH**: A change shipping that breaks an existing save without a migration.
- **MEDIUM**: A save format with no version field; future you cannot detect old-format saves.
- **LOW**: A migration that exists but has not been tested against an actual old-format fixture.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Save format stability
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
