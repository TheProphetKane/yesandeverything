# Domain Lens: cloud-edge / 03 auth token hygiene

## The question

Are auth tokens, admin tokens, and Supabase JWTs handled in ways that do not leak them? Where is a token stored in plaintext in a place it should not be?

## What to look at

- `.admin-token`, `.cloudflare-token`, `.github-pat` files. Gitignored?
- Worker bindings. Are secrets actually configured as bindings, not committed as constants?
- Supabase JWT verification on the worker. JWKS endpoint trusted? Token expiry checked?
- Magic-link sender flows (YaC `auth@yesandeverything.com` via Resend SMTP). Sender reputation; any DKIM/SPF issues?
- Recent commit diffs that mention tokens; any plaintext leaks even via test fixtures?

## Severity grading

- **HIGH**: A token committed to git history.
- **MEDIUM**: A token logged to the worker tail or to a Discord post.
- **LOW**: A token visible in an error message but the channel is the dev's only.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Auth + token hygiene
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
