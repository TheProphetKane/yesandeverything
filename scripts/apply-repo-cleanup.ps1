# apply-repo-cleanup.ps1
# Cleanup dead files + recover from FUSE-corrupted git indexes on HBH and YaE.
#
# Generated 2026-05-29 alongside apply-github-parity.ps1.
#
# What this does:
#   1. Recovers .git/index on HBH and YaE (FUSE-truncation hit during cleanup attempt)
#   2. Removes .pyc files from tracking on HBH, BR, YaE
#   3. Deletes 4 tombstoned files that were marked "git rm me" in their content
#   4. Stages the .gitignore additions for __pycache__/ on HBH, BR, YaE
#   5. Commits + pushes each repo
#
# Safe to re-run. Each step checks for actual state before mutating.



# --- enforce repo-root cwd (cross-project requirement) ---
$__here = $PSScriptRoot
$__repoRoot = if ((Split-Path -Leaf $__here) -eq 'scripts') { Split-Path -Parent $__here } else { $__here }
Set-Location -LiteralPath $__repoRoot
$ErrorActionPreference = "Continue"

function Step($msg) { Write-Host "  $msg" -ForegroundColor Yellow }
function Section($title) { Write-Host ""; Write-Host "=== $title ===" -ForegroundColor Cyan }
function Done($msg) { Write-Host "  OK: $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  WARN: $msg" -ForegroundColor Yellow }

function Unstick-Repo($repoPath) {
  Push-Location $repoPath
  try {
    # Clear stale locks
    if (Test-Path ".git\index.lock") {
      # [git-guard] superseded by Assert-GitSafe: Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue
      Step "removed stale index.lock"
    }
    if (Test-Path ".git\HEAD.lock") {
      # [git-guard] superseded by Assert-GitSafe: Remove-Item -Force ".git\HEAD.lock" -ErrorAction SilentlyContinue
      Step "removed stale HEAD.lock"
    }
    # Test if index is corrupt
    $st = git status 2>&1 | Out-String
    if ($st -match "bad signature" -or $st -match "index file corrupt") {
      Step "index corrupt; rebuilding from HEAD"
      Remove-Item -Force ".git\index" -ErrorAction SilentlyContinue
      git read-tree --reset HEAD
      if ($LASTEXITCODE -ne 0) {
        Warn "git read-tree failed; you may need to manually run 'git reset --hard HEAD' (DESTRUCTIVE)"
        return $false
      }
      Done "index rebuilt"
    }
    return $true
  } finally {
    Pop-Location
  }
}

# ===== Recover HBH + YaE indexes =====
Section "Recover .git/index (HBH + YaE)"
foreach ($repoPath in @("X:\HereBeHordes", "X:\YesAndEverything")) {
  Step $repoPath
  $ok = Unstick-Repo $repoPath
  if (-not $ok) {
    Warn "recovery failed for $repoPath; investigate before continuing"
  }
}

# ===== HBH cleanup =====
Section "HereBeHordes cleanup"
Push-Location "X:\HereBeHordes"
try {
  # .pyc untrack
  $pycs = @(
    "scripts/__pycache__/check_gdd_integrity.cpython-310.pyc",
    "scripts/__pycache__/check_source_integrity.cpython-310.pyc",
    "scripts/__pycache__/check_source_references.cpython-310.pyc"
  )
  foreach ($f in $pycs) {
    git rm --cached --ignore-unmatch $f 2>$null | Out-Null
    Step "untracked $f"
  }
  # Tombstone delete
  if (Test-Path "docs\NEXT_STEPS.md") {
    git rm docs/NEXT_STEPS.md 2>$null | Out-Null
    Step "deleted docs/NEXT_STEPS.md (tombstone)"
  }
  # Stage gitignore (sandbox already wrote the addition)
  Assert-GitSafe
  git add .gitignore 2>$null | Out-Null
  Step "staged .gitignore"
  # Commit if anything staged
  $staged = git diff --cached --name-only 2>$null
  if ($staged) {
    Assert-GitSafe
    git commit -m "chore(htbh): untrack __pycache__ + remove tombstoned NEXT_STEPS.md"
    if ($LASTEXITCODE -eq 0) {
      Done "committed"
      Assert-GitSafe
      git push
      if ($LASTEXITCODE -eq 0) { Done "pushed" } else { Warn "push failed" }
    }
  } else {
    Step "nothing to commit"
  }
} finally {
  Pop-Location
}

# ===== BR cleanup =====
Section "BrackishRising cleanup"
Push-Location "X:\BrackishRising"
try {
  git rm --cached --ignore-unmatch scripts/__pycache__/check_gdscript_parse.cpython-310.pyc 2>$null | Out-Null
  Step "untracked check_gdscript_parse.cpython-310.pyc"
  Assert-GitSafe
  git add .gitignore 2>$null | Out-Null
  $staged = git diff --cached --name-only 2>$null
  if ($staged) {
    Assert-GitSafe
    git commit -m "chore(brackish): untrack __pycache__"
    if ($LASTEXITCODE -eq 0) {
      Done "committed"
      Assert-GitSafe
      git push
      if ($LASTEXITCODE -eq 0) { Done "pushed" } else { Warn "push failed" }
    }
  } else {
    Step "nothing to commit (already done in earlier session?)"
  }
} finally {
  Pop-Location
}

# ===== YaE cleanup =====
Section "YesAndEverything cleanup"
Push-Location "X:\YesAndEverything"
try {
  git rm --cached --ignore-unmatch _skill-review/personal-skills-src/skills/code-audit/checks/__pycache__/_common.cpython-310.pyc 2>$null | Out-Null
  Step "untracked code-audit/_common.cpython-310.pyc"
  # Tombstone + empty file deletes
  $deletes = @(
    "_skill-review/SKILL.md",
    "_skill-review/PENDING_SCHEDULED_TASKS.md",
    "files.txt"
  )
  foreach ($f in $deletes) {
    if (Test-Path $f) {
      git rm $f 2>$null | Out-Null
      Step "deleted $f"
    }
  }
  Assert-GitSafe
  git add .gitignore 2>$null | Out-Null
  Step "staged .gitignore"
  $staged = git diff --cached --name-only 2>$null
  if ($staged) {
    Assert-GitSafe
    git commit -m "chore(yae): untrack __pycache__ + remove 3 tombstones + empty files.txt"
    if ($LASTEXITCODE -eq 0) {
      Done "committed"
      Assert-GitSafe
      git push
      Confirm-GitIntact
      if ($LASTEXITCODE -eq 0) { Done "pushed" } else { Warn "push failed" }
    }
  } else {
    Step "nothing to commit"
  }
} finally {
  Pop-Location
}

# ===== YaC: scrub PAT from .git/config =====
Section "YesAndChains: scrub PAT from .git/config"
Push-Location "X:\YesAndChains"
try {
  $origin = git remote get-url origin
  if ($origin -match "github_pat_") {
    Step "detected PAT in origin URL; rewriting"
    git remote set-url origin https://github.com/TheProphetKane/yesandchains.git
    if ($LASTEXITCODE -eq 0) {
      Done "origin rewritten (auth now via gh CLI / credential helper)"
    } else {
      Warn "rewrite failed"
    }
  } else {
    Step "origin clean (no PAT detected)"
  }
} finally {
  Pop-Location
}

# ===== Optional: scheduled-task log rotation =====
Section "Optional: rotate YaE scheduled-task logs"
$logDir = "X:\YesAndEverything\scripts\schedule\logs"
if (Test-Path $logDir) {
  $old = Get-ChildItem $logDir -Filter "*.log" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) }
  if ($old.Count -gt 0) {
    Step "found $($old.Count) log files older than 14 days"
    $reply = Read-Host "Move them to .work-queue-archive/scheduled-logs-archive/ ? (y/N)"
    if ($reply -eq "y" -or $reply -eq "Y") {
      $archive = "X:\YesAndEverything\.work-queue-archive\scheduled-logs-archive"
      New-Item -ItemType Directory -Force -Path $archive | Out-Null
      $old | ForEach-Object {
        Move-Item $_.FullName -Destination $archive -Force
      }
      Done "moved $($old.Count) log files to $archive"
    } else {
      Step "skipped log rotation"
    }
  } else {
    Step "no logs older than 14 days"
  }
}

Write-Host ""
Write-Host "===== apply-repo-cleanup complete =====" -ForegroundColor Green
