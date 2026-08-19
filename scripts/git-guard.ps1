# git-guard.ps1 - FUSE-mount git safety helpers. Dot-source it:
#   . (Join-Path $PSScriptRoot "git-guard.ps1")
# Call Assert-GitSafe before any git write, Confirm-GitIntact after.
#
# CANONICAL COPY: X:\PortfolioOps\scripts\core\git-guard.ps1. Per-repo copies are
# exact duplicates checked nightly by check-core-drift.py. Fix here first, then
# propagate; a local-only edit will be flagged as drift the next morning.
#
# Two hazards recur on the FUSE-mounted workspace and have corrupted .git:
#  1. Stale-vs-live lock. A crashed/raced git op leaves .git\index.lock (or
#     HEAD.lock, config.lock, refs\heads\<branch>.lock). Deleting one blindly is
#     wrong if a LIVE git process (a concurrent loop tick, scheduled audit, or
#     second session) holds it - that race has NUL-truncated .git\config and
#     knocked refs/heads/main out of loose refs. So clear ONLY when no git
#     process is live; otherwise wait, then abort rather than write into the race.
#  2. Truncated git writes. A write can land truncated, leaving NUL bytes in
#     .git\config / packed-refs or an unborn HEAD. Confirm-GitIntact catches it
#     so the caller fails loud instead of pushing a half-broken repo.

function Assert-GitSafe {
    param(
        [string]$RepoRoot = (Get-Location).Path,
        [int]$WaitSeconds = 20
    )
    $gitDir = Join-Path $RepoRoot ".git"
    # A crashed update-ref or push leaves refs\heads\<branch>.lock too, not just
    # the index/HEAD/config locks (bar-raise 2026-08-06, found on Agents). Read
    # the branch from the HEAD file directly - no git spawn while possibly
    # waiting out a live one - and default to main if HEAD is unreadable.
    $branch = "main"
    $headFile = Join-Path $gitDir "HEAD"
    if (Test-Path $headFile) {
        $headTxt = [System.IO.File]::ReadAllText($headFile)
        if ($headTxt -match "ref:\s*refs/heads/(\S+)") { $branch = $Matches[1] }
    }
    $lockNames = @("index.lock", "HEAD.lock", "config.lock")
    $locks = @($lockNames | ForEach-Object { Join-Path $gitDir $_ })
    $locks += Join-Path $gitDir ("refs\heads\" + $branch + ".lock")
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    while ($true) {
        $present = @($locks | Where-Object { Test-Path $_ })
        if ($present.Count -eq 0) { return }
        $liveGit = @(Get-Process git -ErrorAction SilentlyContinue)
        if ($liveGit.Count -gt 0) {
            if ((Get-Date) -lt $deadline) {
                Write-Host "[git-guard] lock(s) held by a live git process; waiting..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
                continue
            }
            throw "[git-guard] ABORT: git lock still held by a live process after ${WaitSeconds}s. Refusing to write into a race."
        }
        foreach ($l in $present) {
            Remove-Item $l -Force -ErrorAction SilentlyContinue
            Write-Host "[git-guard] cleared stale $(Split-Path -Leaf $l) (no live git process)" -ForegroundColor DarkYellow
        }
        return
    }
}

# Run a native git command without letting its stderr become a terminating error.
#
# git writes ordinary progress to stderr ("To https://github.com/...", CRLF
# warnings). Under $ErrorActionPreference = "Stop" PowerShell 5.1 wraps that in a
# NativeCommandError and unwinds the caller, so a script aborts partway through
# on a push that actually SUCCEEDED. Not theoretical: it skipped Budget's
# release Step 2.5 on three consecutive releases on 2026-07-24, leaving its
# status card twenty days stale while the app shipped three versions.
#
# Do NOT redirect a native git call's stderr at all - neither `2>&1` NOR
# `2>$null` is safe under ErrorActionPreference Stop. Both apply the same
# redirection machinery that turns each stderr LINE into a terminating
# NativeCommandError and sets $? false even on exit 0; `2>$null` just throws
# away the object afterward, it does not avoid creating it. An unredirected
# native call does not have this problem. Route every git call through
# Invoke-Git (which flips the preference to Continue for the duration) rather
# than adding any stderr redirect by hand.
#
# Relaxing the preference here loses nothing, because git failure is detected by
# $LASTEXITCODE, which callers check explicitly.
function Invoke-Git {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & git @args
  }
  finally {
    $ErrorActionPreference = $prev
  }
}


function Confirm-GitIntact {
    param([string]$RepoRoot = (Get-Location).Path)
    # This guard runs git itself, which overwrites $LASTEXITCODE. Callers invoke
    # it right after the command they care about, so clobbering the exit code
    # made a FAILED PUSH read as success. Capture on entry, restore on every
    # exit path, so this stays a guard rather than a side effect.
    $callerExitCode = $LASTEXITCODE
    $gitDir = Join-Path $RepoRoot ".git"
    $bad = @()
    foreach ($f in @("config", "packed-refs", "HEAD")) {
        $p = Join-Path $gitDir $f
        if (Test-Path $p) {
            $bytes = [System.IO.File]::ReadAllBytes($p)
            if ($bytes -contains 0) { $bad += "$f (NUL bytes - truncated write)" }
        }
    }
    # Through Invoke-Git, never with a stderr redirect: under a caller's
    # ErrorActionPreference Stop, `2>$null` wraps git's "fatal:" line into a
    # terminating error BEFORE this diagnostic can run (found on Budget).
    # -C pins the check to $RepoRoot; the old form silently checked the
    # current directory's repo instead.
    $head = Invoke-Git -C $RepoRoot rev-parse --verify HEAD
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($head)) {
        $bad += "HEAD does not resolve (unborn / broken ref)"
    }
    if ($bad.Count -gt 0) {
        Write-Host "[git-guard] .git INTEGRITY FAIL after write:" -ForegroundColor Red
        $bad | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        Write-Host "[git-guard] Recover: if this repo has unstick-git.ps1, run it. Otherwise by hand: if HEAD is unborn but packed-refs still has the sha, run 'git update-ref refs/heads/<branch> <sha>'. If config or packed-refs shows NUL bytes (a truncated write), restore that ONE file from git history or a clean clone rather than hand-editing it, and run no further git writes here until Confirm-GitIntact passes again." -ForegroundColor Yellow
        $global:LASTEXITCODE = $callerExitCode
        throw "[git-guard] .git corruption detected post-write"
    }
    $global:LASTEXITCODE = $callerExitCode
}
