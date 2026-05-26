# Domain Lens: static-site / 05 seo and open graph

## The question

Does each page have the metadata it needs for sharing (title, description, og:image, twitter:card)? Where is a project page sharing as a blank preview?

## What to look at

- `<title>`, `<meta name='description'>`, `<meta property='og:title'>`, `<meta property='og:image'>`, `<meta name='twitter:card'>` per page.
- The og:image for each per-project sub-page. Is there a card image, or does Twitter render a blank preview?
- Canonical URL meta. Multiple URL slugs (legacy + new) should canonicalize to one.
- robots.txt: still disallowing `/hordes/`? Has search indexing of anything else gone wrong?

## Severity grading

- **HIGH**: Public-facing landing has no og:image; any social share renders blank.
- **MEDIUM**: Project sub-pages have generic og:* fields that read as the same page everywhere.
- **LOW**: A canonical URL pointing at an old slug; cosmetic, no SEO impact yet.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### SEO + Open Graph
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
