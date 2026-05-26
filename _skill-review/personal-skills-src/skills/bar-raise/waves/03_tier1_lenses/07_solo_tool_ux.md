# Tier-1 Lens 07: Solo tool UX

## The question

Does this thing work for the one person who uses it? Where does a single-user workflow have friction that would not survive a second user, but it is friction for the one user too? Where is the affordance for the next action obvious vs hidden?

## What to look at

- The most common workflow for the user of THIS project. For YaB: import a CSV, see categorized spend. For HBH: open the editor, run the game, edit a scene. For YaC: open the PWA, start a round.
- Click counts to the next obvious action. If the user has to navigate three menus to do the one thing the app is for, that is friction.
- Settings and discoverability. Are advanced features hidden behind admin tokens (YaC course-edit was, until 0.33.0)? Is there a way to find them without reading the source?
- Error surfacing. Does the user see what went wrong, or does the app just refuse to do the thing?
- Empty states. Does the app handle 'no data yet' well, or does it just render blank?
- Keyboard / accessibility for the YaE-side dashboards and the YaC PWA.

## Severity grading

- **HIGH**: A workflow blocker (the user can't do the main thing the app exists to do) or a regression that just landed.
- **MEDIUM**: A frequently-used path with discoverability friction (the user has to ask Claude how to do it instead of finding it in-app).
- **LOW**: A polish gap (button states, hover affordances, loading spinners) that does not block work.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Solo-tool UX
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
