---
name: htbh-changelog-entry
description: Bump the HBH GDD version pill and write a new changelog entry in solo-dev voice. Use on every single HBH commit. Implements the update_gdd_every_reply hard rule. Scope is HBH per-commit GDD work specifically, with the release-script execution delegated to version-bump-and-publish on explicit ship-it. Trigger LIBERALLY when HBH work is done. Triggers include `log this`, `bump GDD`, `add changelog entry`, `version bump`, `PATCH bump`, `MINOR bump`, `bump HBH`, `GDD update`. On HBH it also takes phrases that overlap with version-bump-and-publish (`release v0.X.Y`, `cut a version`, `tag a version`) for the changelog portion, then hands off for the actual release.ps1 execution. False-positive cost is near-zero and false-negative cost is Nick authoring the entry by hand. Defaults to draft-only, shipping only on explicit ship-it or release or go.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `version_pill_locations` — which files get the bump
- `changelog_path` — where the entry lands
- `release_message_format` — commit message shape

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# HBH changelog entry

Bump the HBH GDD version pill and author one changelog entry for the day's work, in the solo-dev voice the project uses. This skill runs on every HBH commit Nick ships — it is the operational form of the `update_gdd_every_reply` hard rule.

## Why this exists

Nick ships 5-15 HBH commits per day. Every one of them needs the same shape of work: bump the version pill on line ~584 of `docs/GDD.html`, bump the date pill on line ~585, and prepend a `<strong>vX.Y.Z</strong>` block to the changelog footer. The format is fixed, the voice is strict, and the location is the same every time. Doing this by hand five times a day burns attention that should be on the code. This skill collapses it to one step: bump-type + summary in, GDD edits + draft entry out.

The skill enforces the rules that get forgotten in a hurry: solo-dev voice (no em dashes in body, no "I/we", no "per Nick"), the milestone test for MINOR-vs-PATCH, and the publish-routing rule that says the GDD must move with the code, not after.

## When to use this

Trigger on anything that implies HBH work is done and needs to be logged. The trigger list is intentionally wide:

- "Log this" / "log this to HBH" / "log this to the GDD"
- "Bump GDD" / "bump the GDD" / "GDD update"
- "Add changelog entry" / "new changelog entry"
- "Version bump" / "PATCH bump" / "MINOR bump"
- "PATCH bump for the worker-draw fix" / "MINOR bump for the sapper enemy"
- "Bump HBH" / "bump to v0.35.2"
- "Ship it" / "ship this" / "release it" / "publish it" / "push it"
- "Cut a version" / "tag a version" / "release v0.35.2"
- Anything at the end of an HBH code-change reply where the user implies the work is complete

Do **not** trigger for: edits to projects other than HBH (YaC / Scheduler / YaE have their own version flows), pure GDD doc edits that don't change behavior and the user explicitly said "no bump", draft / WIP work the user said is not done yet.

When in doubt: surface a draft. The user can say "not yet" cheaply; missing the trigger costs Nick a manual entry.

## How to run a bump

Five phases. Default stops at Phase 4 (draft + apply edits). Phase 5 only runs when the user explicitly said "ship" / "release" / "go" / "do it" / similar in the original request.

### Phase 1 — Read current state

Pull the current version pill, date pill, and most recent commit context.

```powershell
# Current version + date pills (lines ~584-585)
Select-String -Path X:\HereBeHordes\docs\GDD.html -Pattern 'meta-pill' | Select-Object -First 5

# Last few commits, for context on what just landed
cd X:\HereBeHordes; git log --oneline -5

# Top of changelog footer, to see the most recent entries' format
Select-String -Path X:\HereBeHordes\docs\GDD.html -Pattern 'Changelog</strong>'
# then read the next ~20 lines from that match
```

The version pill regex: `<span class="meta-pill">v(\d+\.\d+\.\d+)</span>`. The date pill is the next `meta-pill` span immediately below it, format `YYYY-MM-DD`. If the regex doesn't match exactly, stop and report. Don't guess at the location.

### Phase 2 — Compute next version

Apply the **milestone test** from the version-control-standard:

- **PATCH** (`0.x.y → 0.x.y+1`) — tweaks, fixes, tuning, hotfixes, doc updates, recruitment-doc updates, polish on existing surfaces. **Includes in-flight work that isn't user-visible yet.** Default to PATCH unless the user explicitly named MINOR or the change is clearly a cohesive new system.
- **MINOR** (`0.x.y → 0.x+1.0`) — cohesive new feature, new building, new unit, new enemy, new system, new screen. Something a player could point at and say "that's new and reachable from the running game".
- **MAJOR** — reserved for v1 launch. Never auto-pick. If the user asks for MAJOR, confirm explicitly.

When the change is part of an in-progress feature push that hasn't shipped to the player yet, it's a PATCH (e.g., wiring research effects into the lab that's already live = PATCH, not a new MINOR).

Today's date is the new date pill. Read it from system clock; don't reuse the current pill's date.

### Phase 3 — Draft the changelog entry

This is the load-bearing phase. The entry format is fixed and the voice rules are strict.

**Format (study the existing entries near line 928 of `GDD.html`):**

```html
      <strong>v0.X.Y</strong> (YYYY-MM-DD) — <strong>Headline summary in title case</strong>. PATCH. Body paragraph in past-tense factual prose. Names specific files and functions. Trailing <br>
```

Or for multi-change entries:

```html
      <strong>v0.X.Y</strong> (YYYY-MM-DD) — <strong>Two thing summary</strong>. PATCH.
        <ol>
          <li><strong>First change.</strong> Body for first change.</li>
          <li><strong>Second change.</strong> Body for second change.</li>
        </ol>
```

**Voice rules (HARD — these come from the `solo_dev_voice` memory):**

- **No em dashes in body text.** The em dash *between the date and the headline* is OK because it's a structural separator the existing entries all use; this is HTML markup, not voice. The voice rule applies to the prose. Use hyphens, commas, or periods inside the body.
- **No "I" / "we" / "per Nick" / "the user".** The dev describes own work. Past-tense, factual.
- **No AI vocabulary.** No "let me explain", no "the assistant added", no "we worked together to". The entry reads as if the dev wrote it.
- **No explanations of reasoning** unless the reasoning is directly useful. Describe what changed and why it works, not why you chose this approach.
- **Terse, specific, technical.** Name files with `<code>path/to/file.gd</code>`. Name function names. Name affected systems. Cite the version a previous decision came from when relevant.

**Tag rules for PATCH entries:**

- Documentation-only changes: lead the body with `PATCH (documentation only).`
- Recruitment-doc-only: `PATCH (recruitment doc only).` or `PATCH (recruitment docs only).`
- Hotfix: headline starts with `Hotfix:` — e.g., `<strong>Hotfix: crash on selection clear after unit death</strong>`
- Normal PATCH with no special tag: just `PATCH.` after the closing `</strong>.` of the headline.

**Examples (correct):**

> `<strong>v0.35.2</strong> (2026-05-14) — <strong>Lab tier 2 worker-count fix</strong>. PATCH. Tier 2 lab was still drawing 8 workers instead of the v0.35.1 spec of 12; the <code>research.lab_tier_changed</code> handler in <code>source/buildings/research_lab.gd</code> read the new tier but never wrote the worker delta. Added the assignment and re-emitted <code>workforce_changed</code>. Verified against the tier-up signal flow added in v0.35.1.<br>`

> `<strong>v0.35.2</strong> (2026-05-14) — <strong>Hotfix: barracks queue accepts locked unit types</strong>. PATCH. The v0.35.1 defense-in-depth check in <code>try_queue_unit</code> read the unlock state with the wrong key (passed unit display name where the registry expects unit id). Result: Tommy / Shotgunner / Sniper queued from hotkeys even before the unlock research completed. Fix: pass the unit id directly, matching how the HUD train-button gate already looks it up.<br>`

**Examples (wrong — these violate the voice rule):**

> `<strong>v0.35.2</strong> — added a worker-count fix per Nick's request, where we wired up the tier handler to also write the delta.` (em dash in body, "we", "per Nick")

> `<strong>v0.35.2</strong> — I fixed the barracks queue bug. The assistant noticed that the wrong key was being passed.` ("I", "the assistant", AI vocabulary)

Show the draft to the user before applying.

### Phase 4 — Apply edits to the GDD

Three writes to `docs/GDD.html`, all in one pass:

1. **Version pill** (line ~584): replace the version-pill span's inner text with `v<new-version>`.
2. **Date pill** (line ~585): replace the date-pill span's inner text with today's `YYYY-MM-DD`.
3. **Changelog entry** (immediately below the `<strong style="color: var(--text-dim);">Changelog</strong><br>` line, ~line 927): insert the new `<strong>vX.Y.Z</strong>` block as the **topmost** entry. Entries are in descending-version order — new ones always go at the top of the changelog footer, just below the `Changelog` label.

If the `meta-pill` regex matched multiple lines, anchor to the two pills inside the `.title-row` div at lines ~584-585. If the `Changelog</strong><br>` line doesn't match exactly, stop and report — don't guess at the insert point.

After applying, stop and report what changed. Do not commit, do not push, unless Phase 5 is triggered.

### Phase 5 — Optionally ship (explicit opt-in only)

Run **only** when the original request contained an explicit ship signal: "ship", "ship it", "release", "release it", "go", "do it", "publish", "push it". If none of those appeared, stop after Phase 4 with the edits staged and report.

When triggered:

```powershell
cd X:\HereBeHordes
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue
.\scripts\release.ps1
```

Operational rules (these come from memory, all load-bearing):

- **Always `cd X:\HereBeHordes` first.** Nick works across multiple folders; never assume cwd. (Memory: `always_cd_before_htbh_scripts`.)
- **Clear `.git/index.lock` before any git op.** The FUSE-mounted repo leaves stale lock files between sessions. (Memory: `git_index_lock_quirk`.)
- **No confirmation prompts.** `release.ps1` auto-commits and auto-pushes with no y/n. Do not wrap it in a confirmation prompt. The user already confirmed by saying "ship it" in their original request. (Memory: `no_confirmation_prompts`.)
- **`release.ps1` handles GDD publish.** It commits HBH, pushes HBH, then runs `publish-gdd.ps1` which injects the new base64 GDD into `X:\YesAndEverything\hordes\index.html`'s `var ENCODED` line. Never copy `gdd.html` into YaE manually. (Memory: `publish_gdd_routing`.)

If `release.ps1` exits non-zero, stop and report the error verbatim. Don't retry blindly.

## Output format

After Phase 4 (default stop):

```
Drafted v0.X.Y — <headline>

GDD edits staged:
  - line 584: v0.OLD -> v0.X.Y
  - line 585: 2026-05-OLD -> 2026-05-14
  - changelog: new entry inserted at top

Changelog entry:
  <strong>v0.X.Y</strong> (2026-05-14) — <strong>...</strong>. PATCH. ...

Run release.ps1 now? Say "ship it" / "release" to push, or keep working and I'll re-bump on the next change.
```

After Phase 5 (ship triggered):

```
Released v0.X.Y

Commit: <sha>
GDD pushed: https://yesandeverything.com/hordes/  (refresh in ~30s, hard-refresh to bust the cache)
Discord post: <if release.ps1 reported a successful webhook>
```

## What not to do

- **Don't use em dashes in body prose.** Hyphens, commas, periods only. The em dash in the entry header line (between date and headline `<strong>`) is structural HTML and is fine.
- **Don't write "I added X" or "we fixed Y" or "per Nick".** Past-tense factual prose, no first person.
- **Don't bump MINOR for in-flight work that isn't user-reachable yet.** The milestone test exists to keep MINOR meaningful. PATCH is the default.
- **Don't bump MAJOR.** v1.0 is reserved. If the user asks, confirm explicitly first.
- **Don't push without the user saying ship.** Phase 5 is opt-in.
- **Don't edit `hordes/index.html` in YaE directly.** `release.ps1` → `publish-gdd.ps1` owns that injection.
- **Don't introduce confirmation prompts.** When the user said ship, just ship.
- **Don't author the entry as if it explains your work to the user.** The audience is future-Nick and any future collaborator reading the GDD. Solo-dev voice means it reads as own work, not as an AI changelog.

## Output destination

This skill produces edits in place on `X:\HereBeHordes\docs\GDD.html`, optionally followed by a commit + push via `release.ps1`. No standalone report file. The release script's own output is the artifact.
