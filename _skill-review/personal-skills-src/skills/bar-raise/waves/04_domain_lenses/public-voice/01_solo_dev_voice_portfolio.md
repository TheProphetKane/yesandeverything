# Domain Lens: public-voice / 01 solo dev voice portfolio

## The question

Are all public-facing artifacts (README, CHANGELOG, GDD changelog, landing pages, Discord posts, store page copy) holding the solo-dev voice? Where has an AI-tell slipped through?

## What to look at

- The solo-dev-voice-audit skill's last report.
- Em dashes in any public artifact. Banned by the voice rule.
- 'Per Nick' / 'I'll' / 'Let me' / 'as an AI' / 'happy to' phrases.
- AI tool names (Midjourney, Claude, GPT) in any public artifact.
- First-person collective ('we did X', 'our codebase') vs solo first-person ('I did X', 'my codebase'). Solo is correct; collective implies a team.

## Severity grading

- **HIGH**: An AI-tell shipped to a public artifact (GDD changelog, GitHub-visible doc, store page copy).
- **MEDIUM**: An AI-tell in an artifact that is technically public but rarely viewed.
- **LOW**: An internal comment with an AI-tell; never user-visible.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Solo-dev voice portfolio
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
