---
name: git-unstick
description: Diagnose and recover a stuck git repo on Nick's FUSE-mounted Windows workspace. Use whenever git fails with stale `.git/index.lock`, "Another git process seems to be running", non-fast-forward push rejections ("Updates were rejected because the remote contains work"), interrupted rebases, mid-merge state, or any "git is stuck / git won't push / fix my git / unstick git / push rejected / stale lock / rebase in progress / remote ahead / cant push" situation. Also trigger on terse forms like "git broken", "pull is jammed", "FUSE killed my repo again". Pushy triggering on purpose — false-positive cost is one extra `git status` read, false-negative cost is Nick fighting PowerShell. Works on any of his repos (HBH, YaC, Scheduler, YaE) by auto-detecting from cwd or accepting a path.
---

# git-unstick

Diagnose a stuck git repo, report what's broken in plain language, then (only on explicit go) recover. Built for Nick's recurring FUSE-mount git pain across HBH, YaC, Scheduler, and YaE.

## Why this exists

Nick's repos are FUSE-mounted on Windows. Four failure modes recur:

1. **Stale `.git/index.lock`** survives between sessions. Every git op then refuses with "Another git process seems to be running" until the lock is removed. Memory rule `git_index_lock_quirk` mandates `rm -f .git/index.lock` before any git op.
2. **Non-fast-forward push rejection** — remote moved while local was working. The default recovery (pull --rebase) opens an interactive editor, and **the editor opening crashes PowerShell on this machine** (documented in HBH `publish-gdd.ps1` v0.26.71). The safe path is `GIT_SEQUENCE_EDITOR=true git rebase` so no editor opens.
3. **Stale rebase / merge state** from a prior interruption. `.git/REBASE_HEAD`, `.git/MERGE_HEAD`, `.git/rebase-merge/`, or `.git/rebase-apply/` linger and every subsequent git command complains.
4. **Real conflict** that needs human resolution. Never auto-resolve — surface the file and let Nick decide.

This skill encodes the recovery flow already proven in `X:\HereBeHordes\scripts\publish-gdd.ps1` (lines ~220–270), `X:\YesAndEverything\unstick-git.ps1`, and `X:\YesAndChains\sync.ps1`, and applies it consistently across all four repos.

## When to use this

Trigger pushy. Any of these phrases or shapes:

- "git is stuck" / "git is jammed" / "git won't push" / "git is broken"
- "push rejected" / "remote ahead" / "non-fast-forward" / "updates were rejected"
- "stale lock" / "index.lock" / "Another git process seems to be running"
- "rebase in progress" / "stuck in rebase" / "mid-rebase" / "merge in progress"
- "fix git" / "unstick git" / "FUSE killed my repo" / "mount corruption"
- Generic: "what's wrong with git", "git status looks weird"

Also trigger when a different skill or script has just failed with a git error — recover first, then resume the original task.

## Operating rules

These are not optional.

- **Always `cd` to the repo first.** Nick works across `X:\HereBeHordes`, `X:\YesAndChains`, `X:\YesAndScheduler`, and `X:\YesAndEverything`. Run every git command with a known cwd. If the cwd isn't already one of those four, ask which repo.
- **Never prompt y/n inside recovery.** Diagnose-then-recover is a two-step gate — once Nick says "go" / "fix it", run the whole recovery without further interaction. Reintroducing prompts is a regression per memory rule `no_confirmation_prompts`.
- **Never auto-resolve a real conflict.** Surface the file paths and stop. Nick decides what wins.
- **Never `git reset --hard` without warning.** YaC's `sync.ps1` does it intentionally because course-data churn is mount noise, but as a general recovery tool, hard-reset is an explicit-opt-in operation, not a default.
- **`GIT_SEQUENCE_EDITOR=true` is the rebase escape hatch.** Any `git rebase` this skill runs sets that env var first so no editor opens. PowerShell crashes when the rebase editor opens — that's the entire reason this skill exists.

## Phases

Run in order. Don't skip Phase 1 even if the user already named the failure mode — verifying state is cheap and stops a wrong-fix.

### Phase 1 — Diagnose

Gather state without modifying anything:

1. Confirm cwd is a git repo (or `cd` into the one the user named).
2. Check for stale locks: `Test-Path .git/index.lock`, `.git/HEAD.lock`, `.git/MERGE_HEAD.lock`, `.git/CHERRY_PICK_HEAD.lock`.
3. Check for in-progress operations: `Test-Path .git/MERGE_HEAD`, `.git/REBASE_HEAD`, `.git/rebase-merge`, `.git/rebase-apply`, `.git/CHERRY_PICK_HEAD`.
4. Read working tree state: `git status --porcelain` (silent if clean).
5. Read divergence vs. upstream:
   - `git fetch --quiet` first (so the upstream ref is current — but only if `.git/index.lock` is already clear).
   - `git rev-list --count @{upstream}..HEAD` → ahead count.
   - `git rev-list --count HEAD..@{upstream}` → behind count.
6. Read current branch: `git branch --show-current`.

If `git fetch` itself fails because of a lock, note that and defer fetch until after the lock is cleared (Phase 3).

### Phase 2 — Report

Print a plain-language summary. Use these labels exactly so Nick can scan them at a glance:

| Symptom | Label | Severity |
|---|---|---|
| `.git/index.lock` present, no other issues | **Stale lock from prior session** | Trivial — auto-fixable |
| Ahead N, behind 0, clean tree | **Local has unpushed commits, remote unchanged** | Trivial — just push |
| Ahead 0, behind N, clean tree | **Behind remote, fast-forward available** | Trivial — pull |
| Ahead N, behind M, clean tree | **Diverged from remote by N local / M remote commits** | Needs rebase |
| `.git/rebase-merge` or `.git/rebase-apply` present | **Mid-rebase interruption** | Needs `--continue` or `--abort` decision |
| `.git/MERGE_HEAD` present | **Mid-merge interruption** | Needs `--continue` or `--abort` decision |
| Unmerged paths in `git status` | **Conflict on file(s) X, Y** | Needs human resolution |
| Uncommitted changes blocking pull/rebase | **Uncommitted work in the tree** | Needs stash-or-commit decision |

End the report with: *"Say 'go' or 'fix it' to proceed. Conflict-on-file cases stop here regardless — those need you to decide what wins."*

### Phase 3 — Recover

Only run after explicit "go" / "fix it" / "do it" / "yes recover".

Apply fixes in this order (each later fix assumes the earlier ones already ran):

1. **Stale locks** — `rm -f .git/index.lock` plus the three sibling locks if present. Print which were removed.
2. **Mid-rebase / mid-merge** — ask once at the top of Phase 3 if not already specified: "Continue or abort?" Map "continue" → `git rebase --continue` (with `GIT_SEQUENCE_EDITOR=true`) or `git merge --continue`. Map "abort" → `git rebase --abort` / `git merge --abort`.
3. **Non-fast-forward (diverged)** — the canonical safe pattern:
   ```powershell
   git fetch origin $branch
   $env:GIT_SEQUENCE_EDITOR = "true"
   git rebase "origin/$branch"
   ```
   If the rebase produces a conflict, stop and surface the file list. Don't auto-pick a side.
4. **Behind-only** — `git pull --ff-only origin $branch`. If that refuses (because something snuck a divergence in), fall through to step 3.
5. **Uncommitted work blocking the operation** — never silently discard. Offer: stash (`git stash push -u -m "git-unstick auto-stash <timestamp>"`), commit (ask for a one-line message), or skip recovery until Nick decides.
6. **Push if and only if the user asked** — "fix it and push" / "and push" / "ship it" triggers a final `git push origin $branch`. Bare "fix it" leaves the working tree clean but unpushed so Nick can verify.

Conflict surface format:
```
Rebase conflict — these files need you:
  source/units/scout.gd
  source/world/spawner.gd
Resolve manually, then:
  git add <file>
  git rebase --continue
Or to bail:
  git rebase --abort
```

### Phase 4 — Verify

After recovery, re-run a slim diagnose:

- `git status --porcelain` — should be empty (or show only the deliberate stash if step 5 ran).
- `git rev-list --count @{upstream}..HEAD` and `HEAD..@{upstream}` — both should be 0 if a push happened, otherwise ahead-only.
- One-line summary: *"Clean. N commits ahead of origin, 0 behind."* or *"Clean and pushed."*

Don't push unless explicitly asked (see Phase 3 step 6).

## Repo detection

If cwd is already one of `X:\HereBeHordes`, `X:\YesAndChains`, `X:\YesAndScheduler`, or `X:\YesAndEverything`, use it. Otherwise:

1. If the user named a project ("fix git on HBH"), map: HBH → `X:\HereBeHordes`, YaC → `X:\YesAndChains`, Scheduler → `X:\YesAndScheduler`, YaE → `X:\YesAndEverything`.
2. If unclear, ask: *"Which repo — HBH, YaC, Scheduler, or YaE?"*

Every git command runs with `Set-Location` to the chosen repo first. Never assume cwd persists across tool calls — Cowork resets it.

## What not to do

- **Don't `git reset --hard` by default.** That's a YaC `sync.ps1` choice, not a universal recovery.
- **Don't `git push --force` or `--force-with-lease` as part of recovery.** If the situation seems to need a force-push, stop and ask.
- **Don't run an interactive `git rebase -i`.** PowerShell crashes when the editor opens. Always `GIT_SEQUENCE_EDITOR=true` for any rebase.
- **Don't combine Phase 2 (Report) and Phase 3 (Recover).** The user must get a chance to read the diagnosis. The only exception is if the user's opening message already includes a clear "go" directive ("unstick git and push" — one shot).
- **Don't silently delete uncommitted work.** Stash it with a labelled message so it's recoverable.
- **Don't loop.** If a recovery attempt fails, report the failure and stop. Don't retry blindly.

## Reference implementations in Nick's repos

- `X:\HereBeHordes\scripts\publish-gdd.ps1` lines ~241–270 — the self-healing non-FF rebase with `GIT_SEQUENCE_EDITOR=true`. Canonical pattern.
- `X:\YesAndEverything\unstick-git.ps1` — minimal lock-removal one-liner; the simplest case this skill handles.
- `X:\YesAndChains\sync.ps1` — full pull-from-origin with FUSE-mount workaround (backup + reset + fetch + rebase + push). Useful when the working tree is full of mount-corruption noise specifically; not the default path.

## Example diagnose-phase output

```
=== git-unstick: X:\HereBeHordes ===
Branch: main
Locks: .git/index.lock present (stale from prior session)
In-progress ops: none
Working tree: clean
Divergence: 2 ahead of origin/main, 3 behind origin/main

Diagnosis: Stale lock from prior session + diverged from remote by 2 local / 3 remote commits. Needs rebase.

Say "go" or "fix it" to proceed.
```
