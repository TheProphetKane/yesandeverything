# Domain Lens: static-site / 04 gh pages quirks

## The question

Are we tripping any of GitHub Pages's documented quirks (cache, slug behavior, default-branch deploys, build timeouts)? Where is a recent change about to surface a quirk?

## What to look at

- The CDN cache. Recent changes that should have appeared in production but did not (hard-refresh required suggests a missing cache-bust query string).
- Custom 404.html present. Does it look right?
- Build time. If `main` root has grown past a build-time limit (rare but possible), the deploy starts failing.
- The Apothecary `apothecary/` subdir has its own conventions (ES modules from HTTP). Pages serves them; any header / mime-type issues?
- Recent issues in the GitHub Pages status dashboard.

## Severity grading

- **HIGH**: A deploy that has been failing without notice; the site shows stale content for >30 minutes.
- **MEDIUM**: A new feature that depends on a Pages quirk we have not verified.
- **LOW**: A doc claim about Pages behavior that is no longer accurate.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### GH Pages quirks
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
