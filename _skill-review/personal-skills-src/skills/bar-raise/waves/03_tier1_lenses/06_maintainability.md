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

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Maintainability
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
