# Orchestrator: per-project bar-raise

This is the procedure you (Claude) follow when the user invokes a per-project bar-raise. The user names a project (BR, HBH, YaC, Scheduler, YaA, or YaB). You run Waves 2 + 3 + 4 + 5 against it and write the artifacts.

## Inputs

- `$project` -- the short project ID (BR, HBH, YaC, Scheduler, YaA, YaB).
- `$projectRoot` -- the absolute path to the project (derive from the ID):
  - BR -> `X:\BrackishRising`
  - HBH -> `X:\HereBeHordes`
  - YaC -> `X:\YesAndChains`
  - Scheduler -> `X:\YesAndScheduler`
  - YaA -> `X:\YesAndApothecary`
  - YaB -> `X:\YesAndBudget`
- `$today` -- ISO date in `YYYY-MM-DD`.

## Procedure

### Step 1: Read the project handler

Read `$projectRoot/CLAUDE.md`. This is the primer for the project's hazards, conventions, voice rules, and pointers to canonical docs. Every lens reads from this implicitly; reading it once up front saves N lens-time reads.

### Step 2: Wave 2 -- per-project discovery

Follow `waves/02_per_project_discovery.md`. The wave produces an internal context map (the user does not see this directly; it feeds Waves 3 + 4). Keep this in working memory; do not write it to disk.

### Step 3: Wave 3 -- Tier-1 lenses

For each of the 11 files in `waves/03_tier1_lenses/`, in order:

1. Read the lens template.
2. Apply it to the project using the Wave 2 context.
3. Produce a finding (one short paragraph + severity + evidence) OR write "No findings" for that lens.

Keep all 11 lens outputs in working memory.

### Step 4: Wave 4 -- domain lenses (matching only)

Read `$projectRoot/CLAUDE.md` again or recall its `tags` if you saw them in Wave 2. Map tags to domain folders under `waves/04_domain_lenses/`. For each matching domain folder:

1. List the lens templates inside.
2. For each, apply and produce a finding or "No findings."

If `waves/04_domain_lenses/` is empty (Phase 4 has not shipped), skip Wave 4 silently. The skill still produces a useful report from Tier-1 alone.

### Step 5: Wave 5 -- synthesis

Follow `waves/05_meta_synthesis.md`. The synthesis:

1. Aggregates the lens findings.
2. Picks a verdict: `healthy` | `needs-attention` | `at-risk` | `stalled`.
3. Writes one paragraph as the top finding.
4. Ranks the action list (high first, then medium, then low).
5. Compares against the previous bar-raise (if `$projectRoot/docs/BAR_RAISE-*.md` exists) and produces "what got better" and "what got worse" deltas.

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

Atomic-write the JSON. Verify it parses as JSON before declaring done. Five-attempt retry.

If the JSON file does not exist yet, the project is not Phase-1-wired. Surface a warning in the Markdown report but do not fail: the bar-raise report itself still lands at `<project>/docs/`.

### Step 8: Stage the JSON in the YaE git index

```
git -C X:\YesAndEverything add status/data/$project.json
```

Do NOT commit or push. The next release of any project will pick this up alongside other YaE-side changes. For the daily scheduled bar-raise, a separate "commit + push the dashboard JSONs" task can wrap the bar-raise; that is wired in Phase 5.

If the bar-raise was triggered manually (not scheduled) and the user wants the dashboard to update immediately, they can:

```
cd X:\YesAndEverything
git commit -m "status($project): bar-raise YYYY-MM-DD"
git push
```

### Step 9: Report back to the user

Surface in chat:

- Verdict.
- Top finding (one paragraph).
- Action count (X high, Y medium, Z low).
- Link to the report file (`computer://$projectRoot/docs/BAR_RAISE-$today.md`).
- Whether the dashboard JSON was staged successfully.

Keep this terse. The full detail is in the Markdown report. The chat reply is a heads-up, not the report itself.

## Failure modes

- **Project handler not found**: abort with an error. The bar-raise requires CLAUDE.md to ground the lenses.
- **Canonical doc not found** (GDD/PROJECT_SPEC/DESIGN): proceed with a degraded Wave 2; flag in the report's "what got worse" section.
- **No previous bar-raise**: skip the "what got better / what got worse" comparison; note "first bar-raise for this project."
- **JSON write fails after 5 retries**: write the Markdown report anyway, flag the JSON write failure in chat, leave a TODO comment in the report.
- **YaE not mounted / not present**: skip Steps 7 and 8; write only the Markdown report; flag in chat.

## Voice

The output report is public-adjacent (lands in `<project>/docs/`, gets committed). Match the project's CLAUDE.md voice. Solo-dev framing. No em dashes. Cite specific files. Be sharp; if a lens has nothing to say, write "No findings" -- do not pad.
