# Tier-1 Lens 03: Security

## The question

Where are secrets handled in a way that could leak them? Where does user input flow into a sink without validation? What is the threat surface for the one person who uses this, and what changes if a second person ever touches it?

## What to look at

- Secret storage. `.discord_webhook.txt`, `.cloudflare-token`, `.admin-token`, `.github-pat`. Are they gitignored? Are they read into the right scope?
- Auth flows. Magic-link senders (YaC), admin-token usage (YaC course-refresh), Supabase JWT verification (Scheduler).
- Input validation on API surfaces. YaB importer reading user CSVs, YaC worker accepting course contributions, Scheduler worker accepting schedule edits.
- Threat model for local-only projects (YaB). 'Bank data never leaves the machine' depends on no outbound calls with raw transactions; verify.
- Public-facing artifacts that might leak more than intended. GDD password gates (HBH, BR). Apothecary saved-state.

## Severity grading

- **HIGH**: Secret leak risk (a token committed, a webhook URL in a public artifact, a logged token in plaintext); OR an input-validation gap that lets a bad CSV / bad API call exfiltrate data.
- **MEDIUM**: A defense-in-depth gap (no rate limiting on a worker, no input length cap on a user-facing field) without immediate exploit exposure.
- **LOW**: Cosmetic security drift (a TODO about hardening, a deprecated auth pattern in dead code).

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Security
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
