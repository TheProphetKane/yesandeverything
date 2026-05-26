# Domain Lens: game-design / 07 art direction consistency

## The question

Are the assets from the same hand (or coherent hands) staying coherent across the roster? Where is a recent asset breaking the established register? Where does the artist credit on one batch contradict another?

## What to look at

- HBH artist: chmillout. BR artist: Navy. Cross-pollination across the two games would break either's register.
- The Midjourney prompt standard: three personalization profiles, web UI only. Mid-batch drift from this kills consistency.
- Recent commits with art changes. Were they generated under the same profile / by the same artist / under the same locked decisions?
- Asset-style docs (BR has `OUT-OF-THE-DEPTHS-ASSET-STYLE.md` from v0.1.0). Are recent assets following them?
- HBH 'Twisted Jungle 2026' mistake in memory: do not invent pack names from working filenames.

## Severity grading

- **HIGH**: An asset shipping in MVP that visibly clashes with the rest of the roster.
- **MEDIUM**: A recent batch trending away from the locked art-style spec.
- **LOW**: A single rough-draft asset in a non-demo path.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Art direction consistency
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
