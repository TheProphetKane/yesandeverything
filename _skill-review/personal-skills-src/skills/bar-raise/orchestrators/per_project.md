# Orchestrator: per-project bar-raise

This is the procedure you (Claude) follow when the user invokes a per-project bar-raise. The user names a project (BR, HBH, YaC, YaS, YaA, or YaB; "Scheduler" is a legacy alias for YaS). You run Waves 2 + 3 + 4 + 5 against it and write the artifacts.

The model: every lens is an independent check that runs as its own subagent, inspects the project for that one dimension, and returns a structured report. The orchestrator collects every report and weighs them. No single lens gets veto power and no lens outranks another by default; the synthesis balances all dimensions and surfaces the tradeoffs.

## Inputs

- `$project` -- the short project ID (BR, HBH, YaC, YaS, YaA, YaB). Map the legacy alias "Scheduler" to YaS on entry; every artifact (report header, status JSON filename, queue item project field) uses YaS.
- `$projectRoot` -- the absolute path to the project (derive from the ID):
  - BR -> `X:\BrackishRising`
  - HBH -> `X:\HereBeHordes`
  - YaC -> `X:\YesAndChains`
  - YaS -> `X:\YesAndScheduler`
  - YaA -> `X:\YesAndApothecary`
  - YaB -> `X:\YesAndBudget`
- `$today` -- ISO date in `YYYY-MM-DD`.

## Procedure

### Step 1: Read the project handler

Read `$projectRoot/CLAUDE.md`. This is the primer for the project's hazards, conventions, voice rules, and pointers to canonical docs. Also read `$projectRoot/.project-context.json` (schema v1.1) for `tags`, `hard_rules`, and the optional `lens_weights` map.

### Step 2: Wave 2 -- per-project discovery

Follow `waves/02_per_project_discovery.md`. The wave produces an internal context blob in the `waves/CONTEXT_CONTRACT.md` shape (the user does not see this directly; it feeds Waves 3 + 4). Keep this in working memory; do not write it to disk.

### Step 2.5: Skip-unchanged gate

Before fanning out 12 subagents, check whether a full pass would measure anything new:

- zero commits since the previous bar-raise (`latestReportAt` in the status JSON), AND
- the working tree is unchanged vs what the previous run saw, AND
- no open BLOCK, AND
- the work queue shows no movement on this project's items.

When all four hold, run a carry-forward pass instead of the full fan-out: keep the previous `lensScores` and `health`, increment `runsOpen` on every open finding (aging still ticks; a stalled project gets staler, not invisible), re-check only the cheap signals (queue depth, scheduled-task firing, dirty tree), and write a short report noting "carry-forward; no change since YYYY-MM-DD, day N". Refresh the JSON timestamps.

Force a full pass at least every 7 days regardless, so drift cannot hide behind the gate. A BLOCK always forces a full pass. Projects that ship daily (HBH) never hit this gate; projects that ship in bursts (YaC, Scheduler between milestones) hit it most days, which is the point: the daily re-confirmation of an identical finding set is exactly the waste the gate removes.

### Step 3: Wave 3 -- Tier-1 lens fan-out

Spawn one subagent per Tier-1 lens template in `waves/03_tier1_lenses/` (12 lenses), in a single parallel batch. Lenses run as spawned subagents from their existing template files; they are not separately installed skills.

Each subagent receives three things:

1. The Wave 2 context blob (shape locked in `waves/CONTEXT_CONTRACT.md`).
2. Its lens template file (the question, what to look at, severity grading).
3. `waves/03_tier1_lenses/REPORT_CONTRACT.md`.

Each subagent inspects the current state of the project for its one dimension and returns the structured report defined in the contract. It does not propose a verdict, does not rank itself against other lenses, and does not compare its importance to other dimensions.

Collect all 12 reports. A report that comes back malformed gets one re-spawn; if it fails again, exclude that lens from the weighted mean (never count it as zero) and flag the gap in the report's Notes.

### Step 4: Wave 4 -- domain lens fan-out (matching only)

Map the project's `tags` (from `.project-context.json`, falling back to what Wave 2 saw) to domain folders under `waves/04_domain_lenses/`. Fan out the same way: one subagent per matching domain lens file, in a single parallel batch, with the same three inputs and the same contract-shaped return.

If `waves/04_domain_lenses/` is empty or no tags match, skip Wave 4 silently. The skill still produces a useful report from Tier-1 alone.

### Step 5: Wave 5 -- weighted synthesis

Hand the full set of reports (Tier-1 + domain) to `waves/05_meta_synthesis.md`. The synthesis:

1. Computes the weighted health score: weight = 1.0 x clamped `lens_weights` multiplier (0.5 to 2.0, absent = 1.0); health = weighted mean of the `dimension_score`s.
2. Picks the verdict from the health-score bands. No single lens picks the verdict.
3. Applies the BLOCK gate if any lens returned `blocking: true` (banner at the top, verdict forced to `needs-attention`).
4. Writes the top finding, the Tensions and tradeoffs section, and the action list ranked by `impact x confidence` (lens shown only as a provenance tag).
5. Compares numerically against the previous run state (`lensScores` + `openFindings` in the status JSON) and produces "what got better" and "what got worse" deltas.
6. Updates run state (`health`, `lensScores`, `openFindings` with `runsOpen` aging, `tensionsOpen`) and auto-enqueues new blocking/HIGH/MEDIUM findings with finding-id dedupe, per the Wave 5 rules.

### Step 6: Write the Markdown report

Output path: `$projectRoot/docs/BAR_RAISE-$today.md`.

Use the format defined in `waves/05_meta_synthesis.md`. Solo-dev voice. No em dashes. Cite specific paths / commit refs / line numbers wherever possible.

**Write through the Python atomic-write-with-readback pattern.** Never trust the Edit tool on this FUSE mount. If running via Bash, build the content in a temp file, `os.rename` into place, read it back, retry on mismatch. Five attempts before failing.

### Step 7: Update the YaE-side JSON

Read `X:\YesAndEverything\status\data\$project.json`. Mutate only the `barRaise` block:

```json
"barRaise": {
  "latestReportPath": "docs/BAR_RAISE-2026-05-26.md",
  "latestReportAt": "<ISO-8601 UTC now>",
  "verdict": "<verdict>",
  "topFinding": "<one paragraph from Wave 5>",
  "actionsOpen": <count of high+medium actions>,
  "actionsClosed": <count of previous-actions now closed>
}
```

Other fields (version, lastReleaseAt, milestone, audit, etc.) are written by the release script and the canonical-audit skill, not by this skill. Do not overwrite them.

Atomic-write the JSON. Verify the fresh read-back parses as JSON before declaring done; a byte-compare alone can be satisfied by a stale cache. Five-attempt retry.

If the existing JSON fails to parse before the update (truncation, NUL padding), restore the last good version from YaE git history (`git -C X:\YesAndEverything show HEAD:status/data/$project.json`) before mutating. Never rebuild from nulls and never mutate a corrupt file in place. The run-state fields (`health`, `lensScores`, `openFindings`, `tensionsOpen`) ride inside the `barRaise` block, additive to the locked six.

If the JSON file does not exist yet, the project is not Phase-1-wired. Surface a warning in the Markdown report but do not fail: the bar-raise report itself still lands at `<project>/docs/`.

### Step 8: Stage the JSON in the YaE git index

```
git -C X:\YesAndEverything add status/data/$project.json
```

Do NOT commit or push. The next release of any project will pick this up alongside other YaE-side changes. For the daily scheduled bar-raise, a separate "commit + push the dashboard JSONs" task can wrap the bar-raise; that is wired in Phase 5.

If the bar-raise was triggered manually (not scheduled) and the user wants the dashboard to update immediately, they can:

```
cd X:\YesAndEverything
> **Git safety (FUSE mounts):** Before any `git add`/`commit`/`push`, dot-source `scripts/git-guard.ps1` and call `Assert-GitSafe` (clears a stale lock ONLY when no git process is live; waits then aborts on a live one), then `Confirm-GitIntact` after the push. Do NOT blind-delete `.git/index.lock` - deleting a lock a live process holds is what NUL-corrupts `.git/config` and knocks `refs/heads/main` out of loose refs on this mount. Standard: `CLAUDE_SETTINGS.md` section "Git safety on FUSE mounts".

git commit -m "status($project): bar-raise YYYY-MM-DD"
git push
```

### Step 9: Report back to the user

Surface in chat:

- Verdict + health score.
- Top finding (one paragraph).
- Any open BLOCK, called out first.
- Action count (X high, Y medium, Z low) and the top tension if one exists.
- Chronic findings (open 5+ runs), if any.
- Anything auto-enqueued this run (count + top item), or "carry-forward pass" when the skip gate fired.
- Link to the report file (`computer://$projectRoot/docs/BAR_RAISE-$today.md`).
- Whether the dashboard JSON was staged successfully.

Keep this terse. The full detail is in the Markdown report. The chat reply is a heads-up, not the report itself.

## Failure modes

- **Project handler not found**: abort with an error. The bar-raise requires CLAUDE.md to ground the lenses.
- **Canonical doc not found** (GDD/PROJECT_SPEC/DESIGN): proceed with a degraded Wave 2; flag in the report's "what got worse" section.
- **A lens subagent fails twice** (malformed report after one re-spawn): exclude the lens from the weighted mean, flag the gap in Notes, continue. Never fail the run for one lens.
- **Parallel subagents not available**: fall back to running the lens templates sequentially, but each still returns the contract-shaped report and the synthesis is unchanged.
- **No previous bar-raise**: skip the "what got better / what got worse" comparison; note "first bar-raise for this project."
- **JSON write fails after 5 retries**: write the Markdown report anyway, flag the JSON write failure in chat, leave a TODO comment in the report.
- **YaE not mounted / not present**: skip Steps 7 and 8; write only the Markdown report; flag in chat.

## Voice

The output report is public-adjacent (lands in `<project>/docs/`, gets committed). Match the project's CLAUDE.md voice. Solo-dev framing. No em dashes. Cite specific files. Be sharp; a lens with nothing to flag returns an empty findings list -- do not pad.
