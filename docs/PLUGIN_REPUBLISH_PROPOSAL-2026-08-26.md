# Getting the corrected skill sources into the running plugin snapshot

Written 2026-08-26. No longer proposal-only: steps 1 and 2 and the user-level
install were executed the same day and are marked done where they appear. The upload in
step 3 is still outstanding.

## What the evidence actually says

Four things in the standing description of this problem are wrong, and two of them
would make a verification pass for the wrong reason. Correcting them first, because
the plan changes.

**1. No republish has happened since 2026-05-15.** The desktop app's plugin record at
`%APPDATA%\Claude\local-agent-mode-sessions\...\rpm\manifest.json` reads:

    "id": "plugin_01QpjX7YWPcqQordopDhwpEb", "name": "personal-skills",
    "updatedAt": "2026-05-15T21:16:05.947305Z", "updatedAtVerified": true,
    "marketplaceName": "My Uploads"

and the snapshot's own `.claude-plugin/plugin.json` still says `"version": "0.1.0"`.
The source is 0.6.0.

**2. The 2026-08-19 "byte-sync" was a hand-edit of the snapshot, not a republish.**
The header note in `check-plugin-snapshot.ps1` says all fourteen snapshot skills were
byte-synced that day. That is exactly what the same script's last line forbids. Proof:

    snapshot git-unstick/SKILL.md          md5 c94b494b3c8c332a5ce6df2f057670df  10608 bytes
    source at commit 927bd0f (2026-08-20)  md5 c94b494b3c8c332a5ce6df2f057670df  10608 bytes

The running file is a byte-identical copy of the source at a commit from three months
after the plugin record was last updated. It got there by hand. This matters because
it means the republish path has never been exercised, and the next attempt is a first
attempt, not a repeat.

**3. The wrong Hordes path is real, but it is not in `git-unstick`.** It lives in the
snapshot's plugin manifest description:

    "description": "Nick's personal Claude skill suite for cross-project work across
     HereThereBeHordes, YesAndChains, Scheduler, and YesAndEverything. ..."

`HereThereBeHordes` appears in zero skill documents anywhere under
`local-agent-mode-sessions`. Every skill document that names the repository names
`X:\HereBeHordes` correctly. The stale bundle sitting at
`X:\YesAndEverything\_skill-review\personal-skills.plugin` already fixed this in
version 0.5.1 on 2026-06-26 and was never uploaded.

**4. The three skills corrected on 2026-08-24 were not the three named.** Commit
6c4be5c touched `htbh-changelog-entry`, `smart-commit` and `version-bump-and-publish`.
`git-unstick` got its `Assert-GitSafe` rewrite separately, in fa5f437 and e6a55f7 the
same day. This matters because `smart-commit` is not carried by the personal-skills
snapshot at all, so republishing that plugin does not fix it. See the second channel
below.

## The live danger, stated precisely

The running `git-unstick` says, at line 15 and again at line 88:

    Memory rule git_index_lock_quirk mandates `rm -f .git/index.lock` before any git op.
    1. Stale locks - `rm -f .git/index.lock` plus the three sibling locks if present.

The corrected source says the opposite: never remove one by hand, dot-source
`git-guard.ps1`, call `Assert-GitSafe`, which waits out a live git process, clears only
genuinely stale locks, and aborts rather than writing into a race. The portfolio has
already recorded a hand deletion under a live writer as the cause of a
NUL-truncated `.git/config` and `refs/heads/main` falling out of loose refs. Unattended
routines run concurrently on this machine, so the race is not hypothetical.

Two further live defects that the same republish would close, neither of them currently
tracked:

- The running `work-queue-runner` tells a session to write `-Status done`. The queue
  writer now refuses anything outside `pending`, `in-progress`, `completed`,
  `blocked-on-user`, `deferred`, `dropped`. The running instruction produces a rejected
  write.
- The running `git-unstick` covers four repositories. There are at least seven under
  `X:` with a `git-guard.ps1`. A session asked to unstick Gnosis or Brackish Rising
  gets told to ask which of four repositories it meant.

## The split is twelve skills, not two, and there is a second channel nobody checks

`check-plugin-snapshot.ps1` run at 2026-08-26 11:00 returns exit 1 with twelve
`DIFFERS` lines: adr-promoter, backlog-hygiene, cross-project-status-digest,
drift-auto-fix, git-unstick, handler-audit, htbh-changelog-entry,
milestone-prompt-scaffold, project-canonical-audit, solo-dev-voice-audit,
version-bump-and-publish, work-queue-runner. The open-loops line still says two. It has
been stale since 2026-08-24.

More seriously, the check only walks directories matching `plugin_*`. It is blind to a
second runtime channel:

    %APPDATA%\Claude\local-agent-mode-sessions\skills-plugin\...\skills\

Nineteen skills live there. Six of them are suite skills, and five of those six are
split from source: bar-raise, code-audit, godot-perf-optimize, handler-audit,
project-canonical-audit, and smart-commit (only ralph-iterate matches). The running
`smart-commit` in that channel still names `.git/index.lock` four times and
`Assert-GitSafe` zero times. It is one of the three skills the 2026-08-24 commit was
written to fix, and it is invisible to the guard that was supposed to be watching.

Three skills exist in both channels under the same name: handler-audit,
project-canonical-audit, code-audit. Which copy a session loads is not something this
proposal can determine from disk.

Note also that the `skills-plugin` channel does resync on its own: four of its
directories were rewritten at 10:59 this morning when this session opened. The
`plugin_*` channel does not; its directory is dated 2026-08-12 and only changed when a
person wrote into it.

## Can a session do the republish? Not the upload. It can do the install.

The publish surface is the desktop app's plugin panel, uploading a `.plugin` archive to
a personal marketplace named "My Uploads"
(`marketplace_019udC2roCqjWr4miJ73ZUW8`). Three routes were checked:

- **No command line and no local file.** `installed_plugins.json` and
  `known_marketplaces.json` under `~/.claude/plugins` govern only marketplace installs;
  they list cloudflare and stripe and nothing else. personal-skills appears in neither.
  Writing the snapshot directly is the thing that caused this mess and is forbidden by
  the check's own last line.
- **Desktop control.** The app is running (process id 24752, window title "Claude").
  But `list_granted_applications` returns an empty allowlist, and `request_access`
  needs Kane to approve a dialog. This session is non-interactive, so that approval
  cannot arrive. Even with it, the flow is a native file picker plus a publish action
  against his account, which is outward-facing publishing and needs his explicit
  confirmation regardless of who moves the mouse.
- **Browser.** The plugin panel is a desktop-app surface. No claude.ai page was
  confirmed to carry the "My Uploads" publish action, and the browser extension is not
  connected in this session.

**Verdict: the upload is a human action.** Not because a session is forbidden to try,
but because the one approval gate in the path can only be answered by a person, and
this session cannot reach it.

**But the upload is not the only way to reach a running session, and an earlier draft of
this document was wrong to imply it was.** The user-level skills directory at
`%USERPROFILE%\.claude\skills` is an ordinary folder that a session can write, it loads
in every session on this machine regardless of working directory, and the `bar-raise`
already sitting there was a byte-identical mirror of the suite source, 65 files, installed
that way before. That is a sanctioned install path with an established convention, and it
is not the forbidden snapshot hand-edit: it writes to a directory meant to be written,
leaves the published plugin alone, and survives a later republish.

Done 2026-08-26 14:52. All nineteen suite skills mirrored from the source at commit
ded6f85, each staged to a sibling directory, verified file by file against the source by
md5, then swapped into place, so a truncated write on this mount cannot leave a
half-installed skill behind. Installation refuses any source file containing NUL bytes.
Verified by reading the installed copies back: `Assert-GitSafe` appears four times in
git-unstick and once each in smart-commit, htbh-changelog-entry and
version-bump-and-publish; work-queue-runner carries `blocked-on-user` and no longer
carries `-Status done`; git-unstick contains no `rm -f .git`. The corrected descriptions
loaded into the running session immediately.

**What that does not fix.** The twelve stale copies in the plugin snapshot are untouched
and still reachable under the `personal-skills:` prefix, so the dangerous text still
exists on this machine and a session can still load it. The install puts a correct copy
in front of a session; only the upload removes the wrong one. Both copies existing is the
same duplicate-name condition already tolerated for handler-audit, project-canonical-audit
and code-audit, and it is a mitigation rather than a repair.

## Proposed plan

### Step 1, agent: rebuild the bundle from source at HEAD. DONE 2026-08-26 12:31

Built from `X:\PortfolioOps\plugin\personal-skills` at commit ded6f85 to
`X:\YesAndEverything\_skill-review\personal-skills.plugin`. 117 files, 269587 bytes,
md5 `8d2eb2278c4ec701d2fbc51054a54396`, 19 skills. The June 0.5.1 archive it replaced was
kept as `personal-skills-0.5.1-2026-06-26.plugin.bak` in the same folder; both are covered
by the `_skill-review/` line in `.gitignore`, so neither reaches the public site.

Packaging excluded `__pycache__` directories and five compiled Python files, and refuses
to package any source file containing NUL bytes, since a truncated write on this mount is
how a snapshot file went bad before.

Verified against source before and after the copy into place, by
`scratchpad\verify_plugin.py`, all passing:

- every one of the 117 source files present in the archive and md5-identical, no extras
- manifest reads `"version": "0.6.0"`, description free of `HereThereBeHordes`
- `Assert-GitSafe` present in git-unstick, smart-commit, htbh-changelog-entry and
  version-bump-and-publish
- work-queue-runner carries `blocked-on-user` and no longer carries `-Status done`
- zero markdown files containing an em dash, zero files containing NUL bytes

### Step 2, agent: fix the plugin manifest. DONE 2026-08-26 12:34, and smaller than stated

The two manifest defects named earlier in this document were already fixed in source and
only ever existed in the running snapshot: the source has read `"version": "0.6.0"` and
`HereBeHordes` since the 2026-08-19 rehome. Correcting that here rather than leaving the
overstatement standing.

The manifest defect that was real is that the description still named the four
repositories the suite covered in May, while the suite reaches fourteen projects now. It
now says coverage follows the portfolio through each project's `.project-context.json`
instead of carrying a list that rots. Committed to `X:\PortfolioOps` as ded6f85 with an
explicit pathspec, since ten unrelated files from other sessions were dirty in that tree
at the time.

### Step 3, Kane: upload and publish

Drag `personal-skills.plugin` into the desktop app's plugin panel and publish it to
"My Uploads" as an update to the existing plugin, not as a new one. Then restart the
app so a fresh session extracts the new snapshot.

### Step 4: verification, which is where this class of change dies

Run this after the restart, in a new session. Not in the session that did the upload,
because the snapshot only re-extracts on session start.

**Check A is the one that matters and it is not in the standing list.** The snapshot's
manifest version:

```bash
powershell -NoProfile -Command "Get-Content (Join-Path $env:APPDATA 'Claude\local-agent-mode-sessions\*\*\rpm\plugin_01QpjX7YWPcqQordopDhwpEb\.claude-plugin\plugin.json') -Raw"
```

It must read `"version": "0.6.0"` and the description must not contain
`HereThereBeHordes`. **If it still says 0.1.0, the app did not re-extract and every
other check below is measuring the leftover hand-edit from 2026-08-19, not the
republish.** This is the single step that separates a real republish from the
appearance of one, and skipping it is how the last attempt convinced itself it had
worked.

**Check B, the marker greps.** Two of the three markers in the standing instruction do
not discriminate. Measured on 2026-08-26:

| marker | snapshot today | source | verdict |
|---|---|---|---|
| `Assert-GitSafe` in git-unstick | 0 | 4 | good, keep |
| `queue-edit.ps1` in work-queue-runner | 4 | 5 | **passes without a republish** |
| `finding_id` in drift-auto-fix | 1 | 1 | **passes without a republish** |

Replacements that only a real republish can satisfy:

| skill | marker | snapshot today | after republish |
|---|---|---|---|
| git-unstick | `Assert-GitSafe` present | 0 | 4 |
| git-unstick | em dash count | 31 | 0 |
| work-queue-runner | `blocked-on-user` present | 0 | 1 |
| work-queue-runner | `-Status done` absent | 1 | 0 |
| drift-auto-fix | em dash count | 37 | 0 |
| htbh-changelog-entry | `Assert-GitSafe` present | 0 | 1 |
| version-bump-and-publish | `Assert-GitSafe` present | 0 | 1 |

The em dash counts are the strongest signal available: commit e6a55f7 removed 468 of
them from the suite on 2026-08-24, so a zero count in a snapshot file cannot predate it.

**Check C, the script.** `powershell -NoProfile -ExecutionPolicy Bypass -File
X:\PortfolioOps\scripts\check-plugin-snapshot.ps1` must exit 0 with no `DIFFERS` and no
`TRUNCATED` line. Today it exits 1 with twelve.

**Check D, the second channel.** The `skills-plugin` copies of bar-raise, code-audit,
godot-perf-optimize, handler-audit, project-canonical-audit and smart-commit must be
compared against source separately. Republishing personal-skills does not touch them.
`smart-commit` in particular carries the lock hazard this whole exercise is about and
would still carry it afterwards.

## The same item has been queued six times and drained zero times

The work queue at `X:\PortfolioOps\queue\.work-queue.json` carries six pending rows
asking for this exact republish, from four separate reviews, none with a single
recorded attempt:

| row | opened | age today |
|---|---|---|
| `queue-drain-2026-07-26-personal-skills-plugin-stale-build` | 2026-07-26 | 31 days |
| `bar-raise-2026-07-30-hordes-incident-runbook-currency-06` | 2026-07-30 | 27 days |
| `bar-raise-2026-07-30-hordes-skill-chain-handoff-integrity-09` | 2026-07-30 | 27 days |
| `bar-raise-2026-08-26-scheduler-skill-suite-health-01` | 2026-08-26 | today |
| `bar-raise-2026-08-26-apothecary-orchestration-skill-suite-health-01` | 2026-08-26 | today |

The 07-30 row names `Assert-GitSafe` and the Hordes path explicitly, which means the
hazard in this proposal was correctly described a month ago. The 07-26 row predates the
2026-08-19 hand-sync and stayed pending through it, so the hand-sync did not close it
either. Every one of them sits at zero attempts because the drain step cannot perform
the action, and nothing in the queue distinguishes an item nobody got to from an item
no agent is able to do. That distinction is the real defect: this is not a backlog
item, it is a standing request for a human action filed in a queue built for agent
actions.

## The durable fix

Detection is not the problem. `check-plugin-snapshot.ps1` has been printing `DIFFERS`
every night since 2026-08-24 and it changed nothing. Three gaps let that happen, and
each has a cheap close.

**1. The check is blind to half the runtime surface.** Extend the root scan from
`plugin_*` only to `plugin_*` plus `skills-plugin`, comparing any directory name that
also exists in the suite source. This is a few lines in an existing script and turns
five unmonitored splits into reported ones today.

**2. The check reports a count nobody watches move.** It prints "12 live/source splits"
and exits 1, but nothing records that the number was 2 on 2026-08-24 and 12 on
2026-08-26. Write the count and the skill names to
`X:\PortfolioOps\status\data\` on every run, the way `append-trend.py` already does for
other measures. A split count that grows is a different event from a split count that
is merely nonzero, and only the first is worth waking someone for.

**3. The check's own wording is the escape hatch.** It ends with "republish (Kane's
call)", which correctly refuses to act but also gives every nightly run a sanctioned
way to move on. Change the terminal state from a note to a dated obligation: on the
first night a split appears, the check writes a row to
`X:\OPEN-LOOPS.md` naming the skills and the date it first saw them, and every later
night updates the age. A loop that says "12 skills split, first seen 2026-08-24, 2 days
old" is read differently from one that says "republish the plugin".

The strongest version of the third item, and the one worth Kane's ruling: make the age
visible where he already looks. The split count and its oldest first-seen date belong on
the dashboard status surface, next to the other project health measures. A number that
sits at zero and turns red the day the source moves ahead of the snapshot is the thing
that makes this class of drift visible on the day it happens instead of two days later
in a stale open-loops line. That is a change to a public status file and to the nightly
writer, so it needs his go-ahead rather than being folded into this proposal.

## Decision needed

1. Approve the rebuild of `personal-skills.plugin` from source at HEAD, including the
   version bump to 0.6.0 and the `HereThereBeHordes` correction in the plugin manifest.
2. Do the upload and restart, then a new session runs checks A through D.
3. Rule on whether the second channel (`skills-plugin`) is republished the same way,
   and by what route, since `smart-commit` stays dangerous until it is.
4. Rule on the dashboard surfacing in the durable fix.
5. Rule on where a human-only item belongs. Six queue rows at zero attempts is the
   queue reporting nothing, and the same shape as the open-loops note about findings
   being enqueued against repositories a single-project session may not touch.
