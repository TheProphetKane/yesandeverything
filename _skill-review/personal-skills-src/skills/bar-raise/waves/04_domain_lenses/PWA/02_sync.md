# Domain Lens: PWA / 02 sync

## The question

Does cloud sync (anonymous -> signed-in transition, multi-device, conflict resolution) behave the way the PROJECT_SPEC claims?

## What to look at

- The `cloudSyncProfile` + `cloudLoadProfile` paths in `src/cloud.ts` (or wherever sync lives).
- Conflict resolution: last-write-wins vs merge vs prompt. What is the actual policy?
- Anon -> signed-in transition: does the local data migrate cleanly into the cloud row?
- Multi-device: opening the app on phone B should reflect the round started on phone A within seconds.
- The recent 0.28.0 onboarding cloud sync work + the 0.20.0 skill-profile data layer. Are they still consistent?

## Severity grading

- **HIGH**: A sync path that loses data (anon -> signed-in transition drops rounds, multi-device overwrites a fresher edit).
- **MEDIUM**: A sync delay longer than the user expects, or a conflict prompt that confuses users.
- **LOW**: A small race in a non-critical sync (e.g. score history vs current round).

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Sync correctness
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
