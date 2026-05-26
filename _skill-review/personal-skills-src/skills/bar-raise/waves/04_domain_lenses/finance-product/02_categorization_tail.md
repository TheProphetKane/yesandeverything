# Domain Lens: finance-product / 02 categorization tail

## The question

How much of the transaction set is auto-categorized via the rule engine vs the manual long tail? Where is the rule engine failing in the same pattern repeatedly?

## What to look at

- The `rules` table size and coverage. What fraction of transactions match a rule on import?
- Uncategorized transactions count from the latest import. Is the long tail shrinking month-over-month, or is it stable / growing?
- Merchant-normalization quality. Are similar merchants collapsing to the same normalized string?
- The 'save as rule' UI affordance. Is it being used when bulk-categorizing?
- LLM-fallback opt-in: not in scope for v1, but worth flagging when uncategorized rows hit 40%+.

## Severity grading

- **HIGH**: Uncategorized fraction >40% after three months of use; the rules engine is not learning.
- **MEDIUM**: A specific merchant family that fails normalization repeatedly (Whole Foods vs Wholefoods vs WHOLEFOODS#123).
- **LOW**: A handful of rare merchants in the long tail; expected.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Categorization tail
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
