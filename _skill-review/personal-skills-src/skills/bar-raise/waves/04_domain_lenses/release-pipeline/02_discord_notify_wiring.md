# Domain Lens: release-pipeline / 02 discord notify wiring

## The question

Are the Discord channels each project posts to actually wired? Is the webhook file present and correct? Where is a notify path silently failing?

## What to look at

- `scripts/.discord_webhook.txt` per project: gitignored?
- Discord channel topology: per-project dev-log channels. Are they all live, or are some still placeholder?
- The dedupe file `scripts/.discord_last_posted.txt`: present, recent timestamps?
- Cross-project webhook misconfiguration (YaC's webhook ending up in BR's webhook file).
- The webhook URL guild-check (YaC has YAC_DISCORD_GUILD_ID strict mode).

## Severity grading

- **HIGH**: A release script silently fails the notify step (webhook missing/wrong) and the user has not noticed.
- **MEDIUM**: A notify channel that posts but no human reads it; signal wasted.
- **LOW**: A dedupe gap that produced one double-post.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Discord notify wiring
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
