# Domain Lens: game-design / 06 sound design discipline

## The question

Is the audio shipping at the quality and the cadence the GDD locked? Where is a placeholder loop killing the demo's tone? Where is the audio gap going to bite at MVP demo time?

## What to look at

- BR GDD Roadmap M1 MVP audio list: rifle reports, Drowned vocalizations, oil-flame ambient, UI clicks, main theme + ambient music. Are these on disk, or still TODO?
- HBH equivalent in the GDD Assets tab Audio section.
- Audio file presence under `assets/audio/`. Compare to the GDD's manifest.
- Mix balance: is anything peaking? Are music + SFX + ambient on separate buses?
- BR specifically: the 'mute-MVP is not shippable' lock (v0.4.0). MVP without audio is a HIGH finding.

## Severity grading

- **HIGH**: MVP audio assets missing within the M1 timeline and no plan to source them.
- **MEDIUM**: Audio present but at placeholder quality (royalty-free Freesound clips with no edit).
- **LOW**: Mix issue on a non-demo path; a missing tooltip click sound.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Sound design discipline
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
