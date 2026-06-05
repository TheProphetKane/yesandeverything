---
name: smart-commit
description: Generate a commit message that matches the project's existing style, stage the appropriate files (excluding secrets), commit, and optionally push or open a PR. Replaces the manual cycle of git diff, eyeballing changes, writing a message, staging, committing, pushing. Three modes, (1) commit only, (2) commit plus push to origin, (3) commit plus push plus open a GitHub PR via gh CLI. Also exposes a branch-hygiene mode that prunes local branches deleted on origin. Use whenever the user says "commit this", "commit these changes", "make a commit", "stage and commit", "commit and push", "smart commit", "open a PR", "send this to GitHub", "clean up merged branches", "delete gone branches", "git tidy", "branch cleanup". If the project has a scripts/release.ps1 and the change qualifies as a release, it recommends release.ps1 instead and does not commit directly.
---

## Step 0: Load project context (schema v1)

Read `<project-path>/.project-context.json` first. Use:

- `release_message_format` - the commit message shape (e.g. `feat(yab): vX.Y.Z - summary`). Match this exactly for code commits.
- `release_script` - if a release-worthy change is detected (version bump implied, CHANGELOG touched, multiple files in apps/), suggest invoking the release script instead of raw commit
- `secret_exposure_paths` - never stage these
- `voice_strictness` + `voice_scope` - commit messages count as public artifacts; honor the voice rule on the message itself

If `.project-context.json` is missing, fall back to reading the project's CLAUDE.md and parsing the release-message-format from there.

## When to use this skill

User wants something committed. Common phrasings:

- "commit this"
- "commit these changes"
- "smart commit"
- "make a commit"
- "stage and commit"
- "commit and push"
- "open a PR"
- "clean up branches"
- "delete gone branches"

Do NOT use when:

- The user named the project's `release.ps1` explicitly - they want the full release pipeline, not a doc-only commit
- The user is mid-rebase or mid-merge - resolve the conflict state first
- Files staged for commit include secrets or large data files (see exclusion list below)

## Modes

This skill exposes three commit modes plus one branch-hygiene mode. Pick based on the trigger phrase:

| Trigger | Mode | What it does |
|---|---|---|
| "commit this", "make a commit" | `commit` | analyze + stage + commit (no push) |
| "commit and push" | `commit-push` | commit + push to origin |
| "open a PR", "send this to GitHub" | `commit-push-pr` | commit + push + `gh pr create` |
| "clean up branches", "delete gone branches" | `clean-gone` | prune local branches deleted on origin |

## Mode 1: commit

### Phase 1: understand what changed

```bash
git -C <project-path> status --short
git -C <project-path> diff --stat
git -C <project-path> diff --cached --stat  # if anything is already staged
git -C <project-path> log -10 --oneline  # what's the existing commit style
```

Categorize the change:

- **docs-only**: only `*.md`, `*.html` (under docs/), CHANGELOG, README touched. Cheapest commit.
- **code**: source files under apps/, src/, source/. Real change.
- **mixed**: code + docs. Real change with documentation.
- **config**: package.json, *.config.{ts,js}, *.toml, tsconfig, .gitignore. Often paired with code.
- **release**: package.json `version` bumped, CHANGELOG.md prepended, multiple files in apps/. STOP and recommend `scripts/release.ps1` instead.

### Phase 2: write the message

Match the project's existing style. From `git log -10 --oneline`, learn:

- Prefix convention (`feat(yab):`, `fix(htbh):`, `docs:`, `chore:`)
- Use of version pill (`v0.10.0 - ` after the type)
- Summary length (short vs verbose)

For non-release commits, use the project's convention WITHOUT a version pill:

- HBH/BR: `feat(htbh): <summary>` or `docs(htbh): <summary>` or `fix(htbh): <summary>`
- YaB: `feat(yab): <summary>` etc.
- YaC: `feat(yac): <summary>` etc.
- Scheduler: `feat(scheduler): <summary>`
- YaApothecary: `<type>: <summary>` (no prefix in apothecary commits per its release script)
- YaE: `<concise message>` (no convention)

Voice rules on the message itself:

- No em dash (use hyphen or comma). Honors solo-dev-voice rule.
- No "per Nick" framing.
- No AI tool names (Claude, ChatGPT, OpenAI, Anthropic).
- No `Co-Authored-By` AI trailer.
- No first-person collective (`I`, `we`).
- BR specifically: also no inline `<svg>` references, no entity-form em dash (`&mdash;`, `&ndash;`).

### Phase 3: stage

Always exclude:

- Anything matching `secret_exposure_paths` from `.project-context.json`
- `.env`, `.env.local`, `.env.*.local`
- `*.pem`, `private_key*`
- `.discord_webhook.txt`, `.cloudflare-token`, `.github-pat`, `.admin-token`
- `**/credentials.json`, `**/service-account*.json`
- `**/.finances/**`
- `**/yesandbudget.db*`
- `node_modules/`, `dist/`, `build/`, `.venv/`, `__pycache__/`

Use `git add -A` minus the exclusion set, OR `git add` per-file. The conservative pattern is per-file when in doubt.

### Phase 4: commit (FUSE-aware)

ALWAYS clear stale `.git/index.lock` first - the FUSE mount leaves it between sessions:

```powershell
Remove-Item -Force <project-path>\.git\index.lock -ErrorAction SilentlyContinue
```

Then commit:

```bash
git -C <project-path> commit -m "<message>"
```

If the commit succeeds, verify with `git log -1 --oneline`.

If the commit fails for any reason OTHER than a hook rejection, abort and surface the error. Do not retry blindly.

## Mode 2: commit-push

Same as commit, then:

```bash
git -C <project-path> push origin <current-branch>
```

If the push is rejected as non-fast-forward, run `git pull --rebase origin <branch>` ONCE then re-push. If the second push fails too, surface and stop - do not force-push.

## Mode 3: commit-push-pr

Same as commit-push, then open a PR:

```bash
gh pr create \
  --repo <repo_url-from-context> \
  --base main \
  --head <current-branch> \
  --title "<commit subject>" \
  --body "<commit body OR generated summary>"
```

If the current branch IS main (Nick works on main for most projects), skip the PR step and report "committed to main directly; no PR needed."

## Mode 4: clean-gone

Branch hygiene - delete local branches that no longer exist on origin.

```bash
git -C <project-path> fetch --prune origin
# List local branches whose upstream is gone
$gone = git -C <project-path> branch -vv | Select-String ": gone\]" | ForEach-Object { ($_ -split "\s+", 3)[1] }
foreach ($b in $gone) {
  if ($b -ne "main" -and $b -ne "master") {
    git -C <project-path> branch -D $b
  }
}
```

Also clean fully-merged branches:

```bash
git -C <project-path> branch --merged main | grep -v "^\*\|main\|master" | xargs -r git -C <project-path> branch -d
```

Skip both if HEAD is detached. Report what got removed.

## Constraints

- NEVER commit anything in the secret-exposure list.
- NEVER force-push.
- NEVER bump versions or update CHANGELOG.md from this skill - if a release is intended, hand off to `version-bump-and-publish` or invoke `release.ps1`.
- Always clear FUSE `.git/index.lock` before any git op.
- Solo-dev voice on commit messages (no AI tells).
- If the working tree has more than 50 modified files OR an uncategorized mix of code + secrets + config, STOP and ask the user to split the commit - do not auto-stage a giant grab-bag.

## Integration

- `release.ps1` handles version-bumping releases. This skill handles everything else.
- `code-audit` may have flagged staged files - check the latest `CODE_AUDIT-*.md` before committing if it exists; surface any BLOCK findings before the commit completes.
- `solo-dev-voice-audit` should be invoked on commit messages OVER 100 chars - the message is a public artifact.

## Reference: lessons from this codebase

- FUSE `.git/index.lock` survives between sessions on the Windows mount. Memory `git_index_lock_quirk`. Clear before every git op.
- YaB `.finances/` was git-tracked for weeks before being caught (2026-05-28). The exclusion list above prevents recurrence.
- Co-Authored-By AI trailers shipped on YaB commit 7130ae4. Strip from the message before committing; if a git hook is injecting it, remove the hook.
- Two YaB releases (v0.8.0 + v0.9.0) shipped with byte-identical CHANGELOG bodies - the release.ps1 dedup guard catches this for releases; for normal commits, refuse to commit if the new message is byte-identical to the last commit.
