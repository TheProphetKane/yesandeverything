# Domain Lens: finance-product / 03 threat model

## The question

Is the 'bank data never leaves the machine' line being held? Where does an outbound call risk leaking a raw transaction? Where is the local threat model wider than it should be?

## What to look at

- The Hono server bind address. Listening on 127.0.0.1 only, not 0.0.0.0?
- CORS config. The YaB API allows `https://yesandeverything.com` for the probe only; verify the probe is GET / -- no data endpoints are CORS-allowed.
- LLM categorization (future): explicit opt-in, normalized-merchant only (no amounts, no dates, no account IDs).
- Backup file location. `data/backups/*.db` are gitignored?
- The landing-page sessionStorage gate. Soft gate, not real security; flag if the user mistakes it for security.

## Severity grading

- **HIGH**: The API binds to 0.0.0.0 (LAN-visible), OR raw transactions reach an outbound call.
- **MEDIUM**: A CORS-allowed endpoint that probably should not be; or a backup file written to an unsafe location.
- **LOW**: Documentation that overstates the threat model strength.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Threat model (local-only)
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
