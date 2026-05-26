# Tier-1 Lens 09: Dependency

## The question

Which third-party dependencies has this project pinned, and which are floating? Where is a transitive update about to break things? Where does the project depend on a tool or service whose roadmap might not match yours?

## What to look at

- `package.json` / `package-lock.json` for the web projects. Major-version floats are risky.
- Godot engine version (HBH + BR; both on 4.6).
- Cloudflare Workers runtime (YaC, Scheduler); Wrangler version.
- Supabase JS client version + Postgres major version.
- Tailwind major version, Vite major version, React major version.
- External services not in package.json: Cloudflare account state, Squarespace -> Cloudflare DNS transfer (YaE), GitHub Actions account state (YaC course-refresh was killed by an account suspension).

## Severity grading

- **HIGH**: A dependency that has shipped a breaking change in the version we are floating to; an external service that has revoked access or shut down a feature we depend on.
- **MEDIUM**: A floating major version that has a known-incompatible release within the next minor cycle; a dependency with no recent release activity (potentially abandoned).
- **LOW**: A pin that should be relaxed for security updates; a transitive dependency with a known low-severity advisory.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Dependency
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
