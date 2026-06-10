# Tier-1 Lens 06: Maintainability

## The question

Where will future-Nick struggle to understand what current-Nick wrote? Where do conventions disagree across the codebase? Where does the comment density / naming / test coverage suggest the next bug will be hard to chase?

## What to look at

- Naming. Are function and variable names load-bearing or are they `foo` / `tmp` / `data2`?
- Comments. Density on the gnarly bits (subscription detector, fog of war, schedule auto-fill). Are they explaining WHY or just restating the code?
- Test coverage. Which fragile spots have tests (merchant.ts has them; the auto-fill algorithm should but maybe does not; the wave director does not)?
- Convention drift. PascalCase vs camelCase in the same file; tabs vs spaces; `let` vs `const` consistency.
- Doc currency. CLAUDE.md vs reality (handler-audit catches this; reference its latest report).
- Voice slips on commits and CHANGELOGs (solo-dev voice rule; em dashes; AI tells).

## Severity grading

- **HIGH**: A widely-used function with no comment and a non-obvious behavior; a module the user has admitted is hard to reason about; tests missing on a path that has shipped a bug in the last month.
- **MEDIUM**: Convention drift on a frequently-edited file; a comment that is now wrong.
- **LOW**: Cosmetic naming gripe; a TODO that has been around for >90 days.

## Output shape

Return the structured report defined in `REPORT_CONTRACT.md` (this directory), with `lens: "maintainability"`. Report only on this dimension: no verdicts, no ranking against other lenses. Multiple findings allowed; every finding carries evidence plus impact (1-5) and confidence (1-5), and lists any `tensions_with` lens ids. Nothing to flag means an empty `findings` list and a high `dimension_score`.
