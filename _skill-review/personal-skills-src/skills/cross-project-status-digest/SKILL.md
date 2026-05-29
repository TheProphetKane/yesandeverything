---
name: cross-project-status-digest
description: Produce a single at-a-glance markdown digest across Nick's four projects (HBH, YaC, Scheduler, YaE) covering current version, commits since last digest, active milestone, working-tree state, drift flags, and a "what to look at next" recommendation. Then chain the recommendations into work-queue-runner so they become trackable items rather than scrollback. Use whenever the user asks for a status update across projects, a weekly or daily digest, a roll-up of what changed this week, a cross-repo check-in, or anything matching phrases like "status update", "what's happening across projects", "weekly digest", "what changed this week", "give me the rundown", "check in on my projects", "cross-project status", "where are things at", or "what's the state of everything". Designed to power a scheduled task; also runnable on demand. After the digest, auto-enqueue each "look at next" recommendation as a queue item via work-queue-runner add. Output caps around 80 lines.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- All seven project context files at once
- `path`, `repo_url`, `tags` for each
- `scheduled_tasks` to verify the audit loop is firing
- `version_pill_locations` to spot version drift across the portfolio

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# Cross-project status digest

Produce one short markdown digest that covers all four projects at once. Built for scheduled execution (weekly/daily) and for ad-hoc "where are things at" check-ins.

## Why this exists

A roll-up across HBH, YaC, Scheduler, and YaE answers the one question the per-project audit can't: *which project deserves attention this week?* Running the canonical-audit skill four times produces four exhaustive reports — useful when something's wrong, overkill for routine check-ins. This skill is the opposite: scan-only, short, one file, comparative.

It's also designed to feed a scheduled task. The output format is stable enough that a weekly cron-style run produces a comparable series — week-over-week drift becomes visible.

## When to use this

Trigger on requests like:
- "Status update on everything"
- "What's happening across projects"
- "Weekly digest"
- "What changed this week"
- "Give me the rundown"
- "Check in on my projects"
- "Where are things at"
- "Cross-project status"
- "What's the state of everything"

Also runs autonomously when a scheduled task fires this skill — in that case there's no chat prompt, just produce the digest and exit.

## How this differs from `project-canonical-audit`

| `project-canonical-audit` | `cross-project-status-digest` |
|---|---|
| One project, deep | All four, shallow |
| Reads canonical docs end-to-end | Reads version markers + git log + working-tree state |
| Output is long (drift report) | Output capped at ~80 lines |
| Triggered when something might be wrong | Triggered routinely |
| Writes into the project's own `docs/` | Writes to `outputs/digest-YYYY-MM-DD.md` |

If the digest surfaces concerning drift in one project, the right next step is to run the audit skill on *that one* project. The digest is the cheap scan; the audit is the deep dive.

## Configurable inputs

The skill accepts optional inputs (default values in bold):

- `period` — **`since-last-digest`** | `last-N-days` (e.g. `last-7-days`) | `last-N-commits` (e.g. `last-20-commits`)
  - `since-last-digest`: read most recent `outputs/digest-*.md`, use that date as the cutoff. If no prior digest exists, default to `last-7-days`.
- `repos` — comma-separated subset of `htbh,yac,scheduler,yae`. **Defaults to all four.**

If the user says "weekly digest" infer `period=last-7-days`. "Daily" infers `last-1-day`. "Since last" or unspecified infers `since-last-digest`.

## How to produce the digest

Follow these phases. Keep each phase fast — the whole skill should be a scan, not an audit.

### Phase 1 — Determine the period

1. If `period` is `since-last-digest`, glob `outputs/digest-*.md` and pick the most recent. Parse the date from the filename. The period is "commits since that date."
2. If no prior digest exists, fall back to `last-7-days`.
3. If the user named an explicit period, use it.
4. Record the period as a one-line subtitle under the digest header (`_Period: 2026-05-07 → 2026-05-14_`).

### Phase 2 — Per-repo data collection

For each repo in scope, gather four things. Keep this mechanical — don't read into the data yet.

#### HBH (`X:\HereBeHordes`)

- **Version:** read `project.godot` for `config/version=`. Cross-check against the `<span class="meta-pill">` near line 584 of `docs/GDD.html`. If they disagree, that's a drift flag.
- **Last bumped:** `git log -1 --format=%ad --date=short -- docs/GDD.html` (or the commit that touched the version pill).
- **Commits since period:** `git log --oneline --since="<date>" -- .` — count and capture subjects.
- **Active milestone:** read the GDD's roadmap tab for the first milestone *not* marked `done` / `shipped` / `complete`. Capture its name and status.
- **Working tree:** `git status --porcelain | wc -l` for uncommitted file count.

#### YaC (`X:\YesAndChains`)

- **Version:** read top of `CONTEXT.md` "Version & changelog" section for the version pill. (`CONTEXT.md` is 218KB — grep for the section header `## Version & changelog` and read 5 lines after, don't full-read.)
- **Last bumped:** `git log -1 --format=%ad --date=short -- CONTEXT.md` filtered to commits that touched the pill line (heuristic: the most recent commit touching `CONTEXT.md`).
- **Commits since period:** as above.
- **Active milestone:** read `docs/launch-checklist-1.0.md` (the active 1.0 queue) for the next unchecked item or section header.
- **Working tree:** as above.

#### Scheduler (`X:\Scheduler`)

- **Version:** `package.json` `"version"` field (root + `apps/web` + `apps/api` if they diverge).
- **Last bumped:** most recent commit touching `package.json`.
- **Commits since period:** as above.
- **Active milestone:** parse from `docs/DESIGN.md` §21 — the six milestones M1–M6. The active one is the latest milestone with at least one commit referencing it but no "milestone complete" marker. If unsure, infer from git history: look at the most recent commit subjects for `M[1-6]` prefixes.
- **Working tree:** as above.

#### YaE (`X:\YesAndEverything`)

- **Version:** none. Skip the version line — write `- **Version:** _(not versioned)_`.
- **Commits since period:** as above.
- **Active milestone:** none. Replace with `- **Recent focus:** <inferred from commit subjects>`.
- **Working tree:** as above.

### Phase 3 — Headline extraction (1-3 bullets per repo)

For each repo, look at the commit subjects gathered in Phase 2 and produce **1-3** short bullets summarizing the *material* changes. Rules:

- Group related commits (e.g. five commits all touching the same enemy → one bullet).
- Skip pure formatting / dependency-bump / typo-fix commits unless that's *all* there was.
- For HBH: write the bullets in **solo-dev voice** — no em dashes, no "I" / "we" / "Claude", no AI-collaboration framing. Match the GDD changelog tone.
- For YaC / Scheduler / YaE: neutral but friendly. Em dashes allowed. First-person allowed sparingly.
- If zero commits in period, write `Headlines: no commits this period.`

### Phase 4 — Drift flags

For each repo, scan for drift signals and surface anything material as a one-line flag. If nothing's drifting, write `none`.

**Things to watch for** (lean on the memory entries `personal_claude_architecture` and `publish_gdd_regex_bug_lesson` if present):

- **Version pill mismatch.** Code says vA.B.C, canonical doc says vX.Y.Z. (HBH and YaC are the usual offenders.)
- **Stale working tree.** More than 10 uncommitted files = "uncommitted work piling up."
- **GDD-vs-code lag on HBH.** If commits landed but `docs/GDD.html` wasn't touched in the same period, flag it — the GDD-every-reply rule is in force.
- **YaC publish injection risk.** If a recent commit touched `hordes/index.html` directly (not via `publish-gdd.ps1`), flag it. See `publish_gdd_regex_bug_lesson` memory.
- **Per-project canonical doc bypass.** If a YaC commit touched `app.js` directly, flag it (`app.js` is the build output, not source).
- **Stale `.git/index.lock` on HBH** — if `unstick-git.ps1` or `rm -f .git/index.lock` shows up in recent commits, the FUSE corruption is recurring; not blocking, just worth noting.
- **CNAME drift on YaE.** If the most recent commit touched `CNAME` to anything other than `yesandeverything.com`, flag it.
- **Milestone scope creep.** Scheduler commit messages reference features not in `docs/DESIGN.md` §21 v1 scope.

Don't fabricate flags. If the data doesn't say drift, write `none`.

### Phase 5 — Compose the digest

Write to `outputs/digest-YYYY-MM-DD.md` (today's date). Structure:

```markdown
# Cross-project status digest — YYYY-MM-DD
_Period: YYYY-MM-DD → YYYY-MM-DD_

## Here There Be Hordes
- **Version:** vX.Y.Z (last bumped YYYY-MM-DD)
- **This period:** N commits. Headlines:
  - bullet 1
  - bullet 2
- **Active milestone:** <name>, <status>
- **Working tree:** clean | N uncommitted files
- **Drift flags:** <anything stale, or "none">

## YesAndChains
- **Version:** vX.Y.Z (last bumped YYYY-MM-DD)
- **This period:** N commits. Headlines:
  - bullet 1
- **Active milestone:** <name>, <status>
- **Working tree:** clean | N uncommitted files
- **Drift flags:** <anything stale, or "none">

## Scheduler
- **Version:** vX.Y.Z (last bumped YYYY-MM-DD)
- **This period:** N commits. Headlines:
  - bullet 1
- **Active milestone:** <name>, <status>
- **Working tree:** clean | N uncommitted files
- **Drift flags:** <anything stale, or "none">

## YesAndEverything
- **Version:** _(not versioned)_
- **This period:** N commits. Headlines:
  - bullet 1
- **Recent focus:** <one phrase>
- **Working tree:** clean | N uncommitted files
- **Drift flags:** <anything stale, or "none">

## What to look at next
<one paragraph, 2-4 sentences. Based on most-recent commits + open drift,
suggest the top 1-2 items deserving attention. Be specific — point at a
file, a milestone, or a flag. No fluff.>

## Needs your review
<read X:\YesAndEverything\.work-queue.json. For every item where
status == "pending" AND auto_safe == false, emit one line in this format,
grouped by project (HBH first, then YaC, Scheduler, YaE, YaApothecary),
sorted within each project by `added` date ascending (oldest first):

- **<id>** (P<priority>, added YYYY-MM-DD, <N> days old) — first sentence of the prompt, trimmed to 80 chars.

If a project has zero such items, omit its sub-header entirely.
If the entire list is empty, write `_No items pending your review. Auto-safe items will be drained automatically._` and skip the sub-headers.

Cap: 12 items total. If there are more than 12, list the 12 oldest and add a
trailing line `_…and N more pending review. Run `work-queue-runner` for the full list._`

This section exists so structural items (auto_safe=false) surface visibly
every digest instead of aging silently in the queue file.>
```

### Phase 6 — Length check

Count the final line total. If above ~80 lines, trim:

1. First cut: drop bullets where `Headlines:` has three when two would do.
2. Second cut: collapse multi-line drift flags to one line each.
3. Last cut: tighten the "what to look at next" paragraph to two sentences.

Never cut the per-project section headers, version lines, working-tree state, or the `## Needs your review` section — those are the load-bearing data points. Cap is target, not absolute; the digest is allowed to exceed 80 lines if the Needs-Your-Review backlog is long, because that backlog growth IS the signal the digest exists to surface.

### Phase 7 — Save and report

Write the file to `outputs/digest-YYYY-MM-DD.md`. If a digest with that exact filename already exists (re-run on the same day), append `-N` (`digest-2026-05-14-2.md`) rather than overwriting — series continuity matters more than filename cleanliness.

Then report to the user:
- Absolute path to the saved digest
- One-sentence headline of the highest-priority finding (drawn from "what to look at next")
- Whether the period was inferred from the prior digest or specified explicitly

## Voice rules per project

These come from each project's `CLAUDE.md`. Apply them when writing headlines and drift flags:

- **HBH:** solo-dev voice. No em dashes (hyphens or commas instead). No "I" / "we". Reads as the developer tracking own work. Memory: `solo_dev_voice`.
- **YaC:** neutral but friendly. The release pipeline (`scripts/release.ps1`) writes its own commit messages; quote them lightly. Memory: `yac_release_pipeline`.
- **Scheduler:** neutral, milestone-focused. Reference DESIGN.md milestones by name (M1, M2, etc.).
- **YaE:** neutral. It's the umbrella brand site; describe in plain terms.

## Memory awareness

If memory contains these entries, use them when generating drift flags:

- `personal_claude_architecture` — confirms the handler-CLAUDE.md-per-project pattern. If a project lacks a CLAUDE.md or its handler is empty, that's a drift flag.
- `publish_gdd_regex_bug_lesson` — watch any commit touching `hordes/index.html` directly. The publish script is the only safe path.
- `git_index_lock_quirk` — surface as informational, not blocking.
- `no_confirmation_prompts` — if a release script gained interactive prompts in recent commits, that's a regression to flag.

Don't enumerate memory entries in the digest itself. Use them as context for drift detection.

## Things to avoid

- **Don't re-run the canonical-audit skill.** This skill is shallow on purpose. If the user wants a deep audit, they'll say so or the digest will recommend it.
- **Don't full-read large files.** `CONTEXT.md` (218KB), `course_data.json` (12MB), `app.js` (1MB), `docs/GDD.html` (large). Grep, head, or read by line range only.
- **Don't fabricate version numbers.** If `project.godot` and the GDD pill disagree, report both, flag the drift, don't pick a winner.
- **Don't recommend more than two items at the bottom.** "What to look at next" is meant to focus attention, not list everything that could be improved.
- **Don't write a separate file per project.** One markdown file, per-project sections, plus the final `## What to look at next` and `## Needs your review` sections. That's the format.
- **Don't push to git.** This is a read-only skill against the source repos. Output lands in `outputs/`, never in any of the four project trees.

## Scheduled-task usage

When this skill is invoked by a scheduled task, the conversation has no user prompt. In that case:

1. Default to `period=since-last-digest`, `repos=all four`.
2. Run all seven phases.
3. Save the file.
4. Exit. No chat reply is needed — the file is the deliverable.

If a scheduled task fires and there's a critical drift flag (version mismatch, uncommitted-work pile-up >20 files, GDD update rule violated on HBH), prepend an `> CRITICAL:` line at the top of the digest below the period subtitle so the file is visibly flagged when opened.

## Output destination

Always `outputs/digest-YYYY-MM-DD.md` relative to the session's outputs directory. Never write into any of the four project repos — drift detection should never itself cause drift.
