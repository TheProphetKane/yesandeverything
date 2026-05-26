# Domain Lens: finance-product / 01 dedupe correctness

## The question

Does the transaction dedupe key actually dedupe what it should, and not dedupe what it should not? Where is a real edge case (same merchant + same amount + same day, but actually two distinct charges) being merged?

## What to look at

- The dedupe key shape: `(account_id, posted_date, amount, raw_description)`.
- The dedupe test (`apps/api/src/dedupe.test.ts`). Does it cover the same-day-same-amount-different-description case? Different-amount-same-everything-else?
- Importer error path: a second import of the same file should fail-soft (dup_count rises), not throw.
- The `imports` table audit trail. Can a user roll back a bad import? Has the rollback path been exercised against a real bad import?

## Severity grading

- **HIGH**: A duplicate transaction surviving an import (real loss of fidelity) or a real transaction being merged into another (loss of data).
- **MEDIUM**: An edge case the test suite does not cover where the dedupe key would behave wrong.
- **LOW**: A cosmetic gap in the dup count reporting.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Dedupe correctness
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
