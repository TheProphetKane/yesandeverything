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

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "solo-tool-ux"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
