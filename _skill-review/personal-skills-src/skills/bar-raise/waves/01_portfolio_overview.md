# Wave 1: Portfolio overview (constellation only)

Build the cross-project situational map that Waves 2-5 will operate against during a constellation bar-raise. Wave 1 produces an internal context blob; it does not write to disk. The constellation synthesis (Wave 5 portfolio-level) consumes the blob and produces the human-readable artifact.

## When this runs

Only on a constellation bar-raise (invoked via `orchestrators/constellation.md`). Per-project bar-raises skip Wave 1 entirely.

## What to harvest

For the six projects (BR, HBH, YaC, YaS, YaA, YaB), read each of the following and capture the salient cross-project pattern. Be tight: per-project detail belongs in Wave 2; Wave 1 is the bird's-eye view.

### Active set

Read each project's `status/data/<project>.json`. Build a list:

- "Shipping" (commit in last 7 days): project IDs.
- "Slow" (no commit in 7-14 days): project IDs.
- "Stalled" (no commit in 14+ days): project IDs.

Tag the constellation verdict candidate based on the distribution. All six shipping is `healthy`. One or two slow is `needs-attention`. Any stalled, or three or more slow, escalates to `at-risk` or `stalled`.

### Recent cross-project commit cadence

Run a 7-day windowed git log across each project. Note: project shipping spikes (BR shipped v0.10.0-v0.12.0 in one day) vs steady cadence (YaC shipped 0.32-0.33 across the week) vs silence. Spikes and silence both warrant attention; steady cadence is the goal state.

### Cross-project work-queue depth

Read `X:\YesAndEverything\.work-queue.json`. Bucket the items by project (most queue items tag a project in their `project` field). Note bottlenecks: which project has the deepest queue? Which has the oldest unprocessed items? Where is one project's queue blocking another's release?

### Cross-project audit findings

Read the most recent `CANONICAL_AUDIT-*.md` per project (paths in each project's `status/data/<project>.json` -> `audit.latestReportPath`). Look for cross-cutting patterns:

- The same lens hitting in multiple projects (e.g. "release-pipeline drift" found in 3 of 6 audits this week).
- The same fix shipped in one project but pending in others.
- A new pattern surfacing in one project that the other five do not yet show (early-warning signal).

### Cross-project handler drift

Read the most recent `HANDLER_AUDIT-*.md` in YaE's docs. Note which handlers are most out of sync with reality. Drift in CLAUDE.md is corrosive because every new Claude session reads them; the handler-audit findings count is a key constellation signal.

### Portfolio time allocation

Inferred from commit cadence and queue depth: where is the user's attention actually going this week? Compare to where the user said it should go (recent stated priorities, locked decisions, milestone targets). A divergence here is a `strategic_kill_this` flag at the portfolio level.

### Cross-project pattern bundles

Look for patterns that imply a shared root cause:

- FUSE truncation hits in multiple projects -> tooling fix at the shell/wrapper level.
- The same release-script bug in two scripts -> consolidate into a shared helper.
- Voice slips on multiple public artifacts -> trigger `solo-dev-voice-audit` portfolio-wide.
- Three projects all stalled on the same external dependency -> dependency lens, HIGH at portfolio level.

## Output (working memory)

A structured context blob:

```
{
  "projects": [
    { "id": "BR",       "verdict_candidate": "healthy", "shipping": true,  "stalled": false, "queue_depth": 2 },
    { "id": "HBH",      "verdict_candidate": "needs-attention", "shipping": true, "stalled": false, "queue_depth": 5 },
    ...
  ],
  "weekly_commit_cadence": {
    "BR": { "commits": 12, "shape": "spike" },
    "YaC": { "commits": 4, "shape": "steady" },
    ...
  },
  "queue": {
    "total_open": 22,
    "by_project": { "BR": 2, "HBH": 5, "YaC": 4, ... },
    "oldest_item_age_days": 11
  },
  "audit_patterns": [
    "release-pipeline drift in 3 projects (HBH, YaA, YaB)",
    "FUSE truncation hits in 2 projects (BR, HBH)"
  ],
  "handler_drift": { "stale_handlers": ["YaC"], "count_total_findings": 3 },
  "portfolio_time_allocation": "BR + YaC absorbing 80% of commits this week, matching stated active-iteration intent",
  "cross_cutting_root_causes": [
    "FUSE Edit-tool truncation affects every write-heavy project; consider session-level Edit avoidance in favor of Python atomic-write"
  ]
}
```

The portfolio synthesis (Wave 5 at constellation scope) reads this blob, runs each project through Waves 2-5 individually, then produces the human-readable `CONSTELLATION-YYYY-MM-DD.md` and updates `status/data/constellation.json`.
