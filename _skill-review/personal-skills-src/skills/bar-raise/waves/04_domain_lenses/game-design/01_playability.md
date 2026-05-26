# Domain Lens: game-design / 01 playability

## The question

Is the moment-to-moment loop actually fun to operate? Where is friction punishing the player without serving design intent? Where does the player not know what to do next?

## What to look at

- The current MVP mission script (HBH: gameplay.gd / wave_director.gd; BR: same after the v0.11.0 port). What does a typical play session look like end-to-end?
- Recent CHANGELOG entries flagged as 'rebalance' or 'pacing'. Two or more in the last 30 days suggests the loop is still finding itself.
- Wave cadence numbers (HBH GDD Numbers tab; BR GDD same). Are they tuned or placeholder?
- Build/train/defend/sortie ratio. If a player spends >70% of session time on one phase, the other phases need a buff or a cut.
- Player-facing affordances: build menu, command UI, minimap, alerts. Is the next obvious action surfaced?

## Severity grading

- **HIGH**: A loop that does not work end-to-end (mission unplayable, soft-locked, unwinnable due to a bug).
- **MEDIUM**: A loop that works but feels off in a specific recurring way (waves too sparse, sortie phase pointless, sonic pressure feels arbitrary).
- **LOW**: Polish gap: a hover state missing, a tooltip wrong, a sound effect placeholder.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Playability
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
