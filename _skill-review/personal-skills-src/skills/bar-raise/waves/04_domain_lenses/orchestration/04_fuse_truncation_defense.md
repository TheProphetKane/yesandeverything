# Domain Lens: orchestration / 04 fuse truncation defense

## The question

Are scripts and skills using the atomic-write-with-readback pattern for any FUSE-mounted write? Where is a fresh Edit-tool call still being trusted to write a file at risk?

## What to look at

- HBH/BR memory `htbh-fuse-edit-tool-truncation`. The pattern is Python tmp + os.rename + readback + retry.
- Recent commits that touched docs/GDD.html, source/ files, autoloads. Were they via Edit (risky) or atomic-write (safe)?
- The recovery scripts under `outputs/v0_74_3*_apply.py`: still around as reference?
- Discovery: any new project (BR, YaB) doing FUSE writes without the atomic pattern.

## Severity grading

- **HIGH**: An Edit-tool call shipped a truncated file (caught by a tail check after, or worse, in a live deploy).
- **MEDIUM**: A workflow that does FUSE writes via Edit and has not been hit yet, but will.
- **LOW**: A script that does Set-Content without readback; lower-risk write but still vulnerable.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### FUSE truncation defense
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
