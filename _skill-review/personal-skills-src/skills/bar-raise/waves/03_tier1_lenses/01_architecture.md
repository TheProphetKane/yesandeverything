# Tier-1 Lens 01: Architecture

## The question

Where does this codebase's module structure fight what it is trying to do? Where do dependencies cross layers that should stay separate? Where has the public surface of a module quietly drifted out of sync with its callers?

## What to look at

- The canonical doc's architecture section (GDD section 4-6 for HBH/BR; PROJECT_SPEC for YaC and YaA; DESIGN.md for Scheduler/YaB).
- Top-level folder layout in `source/` or `apps/`. A `utils/` or `helpers/` directory that grew past ~500 LOC is usually a layering violation in disguise.
- Cross-module imports. Any low-level module (data, util) importing a high-level one (gameplay, ui) is a violation.
- Public function exports. Which functions are called from 5+ sites? Has any signature drift broken callers silently?
- Parallel implementation traps. Multiple code paths achieving the same outcome (pool vs per-Node, debug-flag branches, two CSV parsers) are technical debt; check for divergence.

## Severity grading

- **HIGH**: A layering violation causing real bugs right now, OR a parallel implementation where the two paths have diverged and the user-facing behavior is non-deterministic.
- **MEDIUM**: A layering violation or parallel-path pattern with no current bug exposure but a clear 'this will bite when X happens.'
- **LOW**: Organizational drift (over-grown utils, misnamed modules, comment-vs-code disagreement) that smells off but is not blocking anything.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Architecture
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
