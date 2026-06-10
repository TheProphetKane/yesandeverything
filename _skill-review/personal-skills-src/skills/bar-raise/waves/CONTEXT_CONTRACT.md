# Wave 2 context contract

Every lens subagent receives the same discovery blob. Standardizing the input keeps the fan-out lenses consistent and makes dimension scores comparable run to run. Wave 2 builds it; the orchestrator passes it verbatim to every Tier-1 and domain lens.

## Blob shape

```json
{
  "project": "YaB",
  "display_name": "YesAndBudget",
  "root": "X:\\YesAndBudget",
  "generated_at": "<ISO-8601>",
  "version": "0.13.0",
  "milestone": { "id": "M5", "label": "Multi-format import", "status": "in-progress" },
  "locked_decisions_recent": ["...", "...", "..."],
  "open_questions": ["...", "...", "..."],
  "hard_rules": ["..."],
  "hard_rule_checks": [ { "rule": "...", "check": "..." } ],
  "lens_weights": { "security": 1.5 },
  "canonical_docs": ["docs/DESIGN.md"],
  "handler_notes": "voice rules, hazards, lock signals, one tight paragraph",
  "backlog": { "p0": 1, "p1": 4, "p2": 7, "p3": 3, "top_p0": ["..."] },
  "changelog_recent": [ { "version": "...", "date": "...", "headline": "..." } ],
  "commits_recent": [ { "hash": "...", "date": "...", "subject": "..." } ],
  "commits_since_last_bar_raise": 0,
  "worktree": { "clean": true, "dirty_count": 0, "sample": [] },
  "latest_audits": { "canonical": { "high": 0, "medium": 0, "low": 0, "top": ["..."] }, "handler": null },
  "previous_run": { "verdict": "...", "health": 72, "lensScores": {}, "openFindings": [] },
  "tags": ["..."]
}
```

## Rules

- Fields may be null or empty when a source is missing. Lenses treat null as "unknown", never as "bad"; a missing backlog is a maintainability observation, not a zero score.
- `previous_run` comes from the status JSON `barRaise` block, so lenses can see what was already flagged and avoid re-deriving it.
- A lens that needs something not in the blob may read the filesystem directly, but should say so in its report `notes` so the contract grows deliberately instead of by side channel.
- The blob is working memory only. It is never written to disk and never pasted into the report.
