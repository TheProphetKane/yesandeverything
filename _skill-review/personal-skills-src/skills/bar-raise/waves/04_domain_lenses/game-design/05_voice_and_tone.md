# Domain Lens: game-design / 05 voice and tone

## The question

Does the in-game text (building names, unit barks, mission briefings, lore snippets) read as the world the GDD describes? Where is a name from one tonal register colliding with another?

## What to look at

- Building names in `source/buildings/*.gd` `building_name = ...`. Are they archaic-cartographic (HBH) / industrial-medieval-WWI-naval (BR), or did one slip through as too modern / too generic?
- Unit names + barks. BR units (Picket, Rifleman, Marksman, Trench Sweeper, Tommy) carry trench-warfare register; an HBH-residual 'Soldier' or 'Sniper' would be a violation.
- Mission briefing copy. Tone-consistent with the lore tab?
- 'Drowned' / 'Beached' / 'The Lantern' / 'Aquifer' (BR) and equivalent HBH register. The recent v0.11.3 'mission-fail subtitle' is a good example of voice-locking.

## Severity grading

- **HIGH**: A user-facing string in the MVP that breaks tone egregiously.
- **MEDIUM**: An internal identifier (display name) that is tone-correct but the bark / hover-text is wrong.
- **LOW**: A code comment in the wrong register; user never sees it but next-Nick-reading-the-code will.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### In-game voice and tone
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
