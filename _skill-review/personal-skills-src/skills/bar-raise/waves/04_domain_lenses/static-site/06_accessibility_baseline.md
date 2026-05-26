# Domain Lens: static-site / 06 accessibility baseline

## The question

Does the site pass the basic accessibility check the friend's PT lens equivalents would catch here? Keyboard nav? Contrast? Screen reader landmarks?

## What to look at

- Keyboard navigation through `index.html` and any interactive sub-page. Can a sighted keyboard user reach every link?
- Color contrast on the dark-mode palette. Is body text against `--ink-0` at ≥4.5:1?
- ARIA landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`). Are they present?
- Focus-visible styling. Does the user see what is focused?
- The status dashboard at `/status/` -- does it work without JS? (Spoiler: no, the fetch is JS-driven; that is intentional but should be acknowledged.)

## Severity grading

- **HIGH**: A contrast violation on a primary text + background pair on the landing.
- **MEDIUM**: Missing focus styles; keyboard nav works but the user cannot see where they are.
- **LOW**: A heading-level skip (h1 -> h3) in a sub-page.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Accessibility baseline
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
