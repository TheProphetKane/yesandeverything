# Tier-1 Lens 11: Strategic kill-this

## The question

Is this the right thing to be building? What would happen if we deleted this project tomorrow? What would happen if we cut the next two milestones in half? Where is sunk cost dragging us into work that is no longer worth doing?

## What to look at

- The project's v1 scope vs what is actually being built. Has scope crept silently?
- The user's stated goals for this project (look in CLAUDE.md, README, PROJECT_SPEC). Is the current work serving them?
- Recent ship velocity. Three commits in 14 days vs three commits per day: which way is it trending and what does that say?
- Cross-project competition for attention. Is this project taking effort away from another project that would benefit more?
- Anti-scope. What did the spec explicitly say NOT to build? Are we doing it anyway?
- The unsentimental question: if you were starting today, would you start this project? If not, what should change?

## Severity grading

- **HIGH**: The project is consuming attention it does not justify; OR a milestone is heading the wrong direction and continuing costs more than reversing.
- **MEDIUM**: A feature in flight that should be cut or postponed; a milestone that should be re-scoped down.
- **LOW**: A small piece of work that could be deferred indefinitely with no real loss.

## Output shape

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "strategic-kill-this"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
