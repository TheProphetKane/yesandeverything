# Domain Lens: public-voice / 02 ai tell concealment currency

## The question

Is the list of AI-tells being checked actually current? Where has the AI-vocabulary frontier moved and the audit has not caught up?

## What to look at

- The solo-dev-voice-audit skill's pattern list. When was it last updated?
- Recent commits: any new AI-tell phrase that has slipped through (e.g. 'I'll', 'Let me know if...', 'Hope this helps').
- New AI models / tools that might leave fingerprints not yet in the audit (specific phrasing, em-dash propensity, etc.).
- Cross-project: does the audit cover every project equally, or are some out of scope?

## Severity grading

- **HIGH**: A new AI-tell pattern is shipping repeatedly and the audit does not catch it.
- **MEDIUM**: An audit pattern that has not been verified against recent AI output.
- **LOW**: A minor phrasing shift in AI output that is borderline.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### AI-tell concealment currency
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
