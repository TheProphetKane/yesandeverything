---
name: version-bump-and-publish
description: Bump a project's version everywhere it's tracked and run its release flow. Use whenever the user asks to ship a release, cut a version, bump and push, publish a new build, do a release, tag a version, or run the release script. Also trigger on phrases like `release v0.27.0`, `patch bump`, `minor bump`, `ship it`, `publish the GDD`, `cut a release`, `version up and push`, or any request that combines version-bumping with commit/push/publish. Auto-detects project type (Godot, Node/web, static site, multi-file canonical) and updates every tracked version location in lockstep so they never drift. On HBH specifically, defers the per-commit GDD changelog-entry authoring to htbh-changelog-entry then resumes for the release.ps1 execution. The split — htbh-changelog-entry owns `bump pill + write entry` (5-15x daily), version-bump-and-publish owns `execute the project release script + push` (1x per release). Defaults to dry-run staging; only executes the release when the user explicitly says ship it or release.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `release_script` — which script to invoke
- `preship_script` — verify it ran (or invoke directly)
- `version_pill_locations` — all must agree before release
- `release_message_format` — the commit message shape
- `publish_script` + `publish_target` — separate publish step if present

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# Version bump and publish

Bump a project's version across every tracked location, draft a changelog entry in the project's voice, and (on explicit go-ahead) run its release flow. Keeps version pills, package files, and changelogs aligned so the project's source of truth never drifts from its public artifacts.

## Why this exists

Every project Nick maintains tracks its version in multiple places: a Godot project file, a GDD HTML pill, a `package.json`, a CONTEXT.md heading, a landing-page card on YaE. A release is "done" only when all of them agree, the changelog has a fresh entry, the commit message references the new version, and the publish pipeline has run. Doing this by hand is where drift sneaks in: the GDD says v0.27.0 but `project.godot` still says v0.26.91, the YaE card shows last month's version, the changelog entry has em dashes Nick doesn't write.

This skill centralizes the release pattern. It knows which locations to touch per project type, what voice the changelog entry should use, and which release script to delegate to. It defaults to staging a dry run so Nick can sanity-check before anything ships.

## When to use this

Trigger on requests like:
- "Bump HBH to v0.27.0"
- "Cut a patch release for YaC"
- "Ship it" / "release it" / "publish"
- "Minor bump on the scheduler"
- "Push a new GDD version"
- "Run the release script"

Also trigger proactively at the natural end of a cohesive task where the user clearly intends to ship — e.g., after the last edit in a feature push, ask "want me to version-bump-and-publish?"

Do **not** trigger for: routine commits with no version change, draft work, WIP pushes to a branch that isn't main.

## How to run a bump

Follow these phases in order. Default to dry-run unless the user said "ship it" or "release".

### Phase 1 — Detect project type

Look at the repo root. Match the first pattern that fits:

| Marker | Project type | Notes |
|---|---|---|
| `project.godot` + `docs/GDD.html` | **HBH-style Godot game** | Two version locations; release script publishes GDD to YaE |
| `PROJECT_SPEC.md` + `CONTEXT.md` + `ROADMAP.md` | **YaC-style multi-file canonical** | Version pill lives in CONTEXT.md |
| `package.json` + `apps/` (pnpm workspace) | **Scheduler-style monorepo** | Bump root `package.json`; apps may have their own |
| `package.json` only | **Plain Node project** | One file to bump |
| `index.html` + `CNAME` at root, no package.json | **YaE-style static site** | No version tracking — just commit + push |

If multiple markers are present, prefer the most specific (Godot wins over Node if both are present). If none match, ask the user which release pattern to follow.

### Phase 2 — Determine bump type

If the user named it explicitly (MINOR / PATCH / "v0.27.0"), use that. Otherwise apply the **milestone test** (from HBH's version control standard):

- **MINOR** (`0.x.y → 0.x+1.0`) — cohesive new feature, new system, new building/unit/enemy, new screen, new endpoint, new schema-shape addition. Something a user could point at and say "that's new".
- **PATCH** (`0.x.y → 0.x.y+1`) — tweaks, fixes, tuning, doc updates, polish on existing surfaces. Includes in-flight work that isn't user-visible yet.
- **MAJOR** is reserved for v1 launches — never auto-pick this; if the user asks for it, confirm explicitly.

When in doubt: if the change is part of an in-progress feature that hasn't shipped to users, it's a PATCH. Only bump MINOR when the cohesive thing is actually done and reachable.

### Phase 3 — Read current version from canonical location

Per project type, the **authoritative** version source:

| Project type | Authoritative source | Regex |
|---|---|---|
| HBH | `docs/GDD.html` meta-pill near line ~584 | `meta-pill">v(\d+\.\d+\.\d+)<` |
| YaC | `CONTEXT.md` "Current version:" line in "Version & changelog" section | `Current version:\s*v?(\d+\.\d+\.\d+)` |
| Scheduler / Node | `package.json` `version` field | JSON parse |
| YaE | No source — skip version logic entirely | n/a |

Compute the next version by applying the bump type. Print it so the user can see what's about to change.

### Phase 4 — Enumerate every location to update

A bump only counts if every tracked location moves in lockstep. Per project:

**HBH:**
- `project.godot` — `config/version="X.Y.Z"` line
- `docs/GDD.html` — `<span class="meta-pill">vX.Y.Z</span>` (around line ~584)
- `docs/GDD.html` — date pill just below the version pill, set to today (`YYYY-MM-DD`)
- `docs/GDD.html` — new changelog entry at the **top** of the changelog footer (changelog is descending-version-order, new entry goes immediately below the `Changelog` label as `<strong>vX.Y.Z</strong> ... `)

**YaC:**
- `CONTEXT.md` — "Current version:" line at the top of the "Version & changelog" section
- `CONTEXT.md` — new changelog entry in the same section (descending order)

**Scheduler / Node:**
- `package.json` — `version` field
- `CHANGELOG.md` if it exists; otherwise just the commit message carries the version

**YaE:**
- Nothing to bump. Skip to commit + push.

Read each file, find each location, list them for the user. If any expected location is missing (e.g., GDD has no version pill matching the regex), stop and report — don't guess.

### Phase 5 — Draft the changelog entry

Get the one-line summary from the user (or infer from recent uncommitted diffs if the user said "infer it"). Then format per project's voice:

**HBH (solo-dev voice — STRICT):**
- Written as the dev describing own work, not as AI collaboration
- **No em dashes** (use hyphens, commas, or periods)
- **No "per Nick"**, no "we", no "I", no AI vocabulary
- Past-tense verbs, terse, factual
- Format: `<strong>vX.Y.Z</strong> (YYYY-MM-DD) - <summary>. <optional detail sentence>.`

Example (correct): `<strong>v0.27.0</strong> (2026-05-14) - new sapper enemy type with breach attack on walls. Sapper pathfinding prefers wall tiles within line of sight of an active spawner.`

Example (wrong — has em dash + AI voice): `<strong>v0.27.0</strong> — added a new sapper enemy, per Nick's request, that we wired up to the spawner system.`

**YaC / Scheduler / others:** neutral changelog voice. Plain past-tense, no marketing speak, but em dashes and standard prose are fine. No solo-dev constraint.

### Phase 6 — Stage the dry run

Show the user:
1. **Current version → new version**
2. **Files that will change** with the specific edits queued for each
3. **Changelog entry** as drafted
4. **Commit message** that will be used (HBH convention: `feat(htbh): vX.Y.Z - <summary>`; Scheduler/YaC: `chore: bump to vX.Y.Z` or `feat: <summary>` plus the version in the body)
5. **Release script** that would run (if any)

Then **stop and wait**. Do not execute writes, commits, or pushes. The user must say "ship it" / "release" / "go" / "do it" before Phase 7 runs.

### Phase 7 — Execute the release (only on explicit go-ahead)

Apply the edits to all files. Then run the project's release flow:

| Project | Release command |
|---|---|
| HBH | `cd X:\HereBeHordes; .\scripts\release.ps1` (commit + push HBH + publish GDD to YaE in one shot) |
| YaC | check `package.json` scripts or `sync.ps1` at repo root; otherwise manual: `git add -A; git commit -m "..."; git push` |
| Scheduler | manual: `git add -A; git commit -m "..."; git push` (release is via `pnpm --filter api deploy` separately, not part of the version bump) |
| YaE | manual: `git add -A; git commit -m "..."; git push` |

**Critical operational rules (from memory):**

- **Always `cd` to the repo root before running its scripts.** Nick works across multiple folders; PowerShell suggestions must start with `cd X:\<repo>` or use an absolute path.
- **Clear `.git/index.lock` before any git op.** On Nick's FUSE-mounted setup the lock file survives between sessions and blocks the next git command. Every git-touching script must `Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue` first.
- **No confirmation prompts.** HBH's release scripts auto-commit and auto-push with no y/n; do not introduce prompts when delegating to them. The confirmation already happened in Phase 6 (the user said "ship it").
- **HBH GDD publishing goes through `publish-gdd.ps1`**, which injects base64 into `X:\YesAndEverything\hordes\index.html`'s `var ENCODED` line. Never copy `gdd.html` into YaE manually — the publish script owns that injection.

If the release script exits non-zero, stop and report the error verbatim. Don't retry blindly.

### Phase 8 — Report back

After the script returns (or after a successful manual push), report:

```
Released vX.Y.Z

Files updated:
  - <path>: vOLD -> vNEW
  - <path>: changelog entry added
  ...

Commit: <SHA from `git log -1 --format=%H`>
Branch: main (or whichever)
Pushed to: <remote URL>

Publish URL: <https://... per project>
  HBH GDD:  https://yesandeverything.com/hordes/  (refresh in ~30s after GitHub Pages rebuild)
  YaC:       https://yesandchains.com/
  Scheduler: (none — deploy step is separate)
  YaE:       https://yesandeverything.com/
```

Keep it terse. If the user wants the full output of the release script, they'll ask.

## Special cases

### Bump but don't publish

If the user says "bump only" or "stage the bump", apply the file edits and commit locally, but don't push. End with: "Bumped to vX.Y.Z and committed locally. Run `git push` when ready."

### Already-current version

If the new version equals the current version (user asked for PATCH but nothing changed), report and stop. Don't create an empty release.

### Version mismatch between locations

If Phase 3 finds the GDD pill at v0.27.0 but `project.godot` still at v0.26.91, flag it as drift before bumping. Offer to either (a) align them at the lower version first, then apply the requested bump, or (b) align them at the higher version and treat the bump as a no-op. Don't silently overwrite a higher version with a lower one.

### Multiple bumps queued

If the user did several small things and wants to ship them all together, ask whether they want **one** MINOR/PATCH that covers everything, or **one bump per task**. Default to one bump (the changelog entry summarizes the batch); only do per-task if asked.

## What not to do

- **Don't bump MAJOR without explicit confirmation.** Even if the user typed "MAJOR", confirm "this will cut v1.0 — sure?" before proceeding. v1.0 is reserved for actual launches.
- **Don't invent changelog content.** If the user didn't give a summary and you can't infer one cleanly from the diff, ask.
- **Don't use em dashes in HBH content.** This is a hard rule from `solo_dev_voice`. Hyphens, commas, periods only.
- **Don't bypass the project's own release script** when one exists. HBH's `release.ps1` handles edge cases (rebase-on-push, lock-clearing, GDD injection) that a generic git-push won't.
- **Don't push to a branch that isn't main** without flagging it. The HBH `push-to-github.ps1` script aborts if not on main; respect the same guardrail for other projects unless the user explicitly says otherwise.
- **Don't leave the GDD behind the code.** For HBH, the GDD pill bump + changelog entry are part of the same commit as the code change. Never push code without bumping the GDD.

## Output destination

This skill doesn't produce a file — it produces edits + a release. The "output" is the released artifact + the report in Phase 8. If the user wants a written summary of what shipped, append a `RELEASE_NOTES.md` entry in the repo root, but only on request.