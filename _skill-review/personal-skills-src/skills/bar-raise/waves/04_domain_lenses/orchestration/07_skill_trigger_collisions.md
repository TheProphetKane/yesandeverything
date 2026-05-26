# Domain Lens: orchestration / 07 skill trigger collisions

## The question

Where do two skills both claim the same phrase? Where does a skill description over-promise or under-promise relative to its actual behavior?

## What to look at

- Walk each SKILL.md trigger-phrase list. Compute the pairwise overlap.
- High-overlap pairs: bar-raise vs project-canonical-audit on 'audit'; cross-project-status-digest vs constellation-bar-raise on 'status update'.
- Skill descriptions that claim behavior the skill does not exhibit (e.g. 'modifies code' when the skill is read-only).
- A 'do not trigger on' clause in each SKILL.md: present, correct?

## Severity grading

- **HIGH**: Two skills both fire on a common phrase, producing noise and confusion.
- **MEDIUM**: A SKILL.md description that misrepresents the skill's actual capability.
- **LOW**: A trigger phrase that is slightly ambiguous; usually picks right but occasionally wrong.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Skill trigger collisions
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
