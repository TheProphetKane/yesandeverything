# Domain Lens: static-site / 01 build config

## The question

Is the static-site config (GitHub Pages, custom domain, CNAME, .nojekyll) still doing what it claims? Where does the deploy flow have a step the docs forgot?

## What to look at

- `CNAME` file content. Must contain `yesandeverything.com` exactly. Empty CNAME breaks the custom domain.
- `.nojekyll` presence (implicit; tells Pages to skip Jekyll). Has anything reintroduced Jekyll inadvertently?
- GitHub Pages source: `main` root. Has the source pointer drifted?
- `DEPLOY.md` -- does it still reflect the live config?
- Recent pushes: any push that introduced a build error visible to Pages but not locally?

## Severity grading

- **HIGH**: Pages config currently broken (custom domain unresolved, deploy failing).
- **MEDIUM**: A config that works but has a fragile dependency (CNAME regenerates from settings; a missing setting breaks it).
- **LOW**: A doc that lists an obsolete step in the deploy flow.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Build config
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
