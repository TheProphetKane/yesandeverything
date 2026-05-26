# Domain Lens: static-site / 03 link rot

## The question

Are the external links and internal cross-references on this site still pointing to live resources? Where is a link going somewhere that 404s or redirects unexpectedly?

## What to look at

- External links in `index.html` and per-project pages. Check status of github.com/TheProphetKane/* repos, yesandchains.com, yesandeverything.com/hordes, yesandeverything.com/brackish-rising, yesandeverything.com/apothecary.
- Internal `<a href>` and `<link>` references. Recent reorganizations (apothecary mirror, brackish-rising rename from /brackish/) leave dangling links.
- The `projects/here-there-be-hordes/` legacy URL slug -- still a redirect stub? Or a 404?
- The `robots.txt` `/hordes/` disallow is still in place (it should be).

## Severity grading

- **HIGH**: A link in the live landing that 404s; or a misdirected redirect that lands a public visitor somewhere wrong.
- **MEDIUM**: A link to an external resource that has not moved but might (e.g. a Steam page that does not exist yet).
- **LOW**: A `<link rel>` that points at a slightly-wrong asset path.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Link rot
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
