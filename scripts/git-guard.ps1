# git-guard.ps1 - FUSE-mount git safety helpers. Dot-source it:
#   . (Join-Path $PSScriptRoot "git-guard.ps1")
# Call Assert-GitSafe before any git write, Confirm-GitIntact after.
#
# Two hazards recur on the FUSE-mounted workspace and have corrupted .git:
#  1. Stale-vs-live lock. A crashed/raced git op leaves .git\index.lock (or
#     HEAD.lock). Deleting it blindly is wrong if a LIVE git process (a
#     concurrent loop tick, scheduled audit, or second session) holds it -
#     that race has NUL-truncated .git\config and knocked refs/heads/main out
#     of loose refs. So clear ONLY when no git process is live; otherwise wait,
#     then abort rather than write into the race.
#  2. Truncated git writes. A write can land truncated, leaving NUL bytes in
#     .git\config / packed-refs or an unborn HEAD. Confirm-GitIntact catches it
#     so the caller fails loud instead of pushing a half-broken repo.

function Assert-GitSafe {
    param(
        [string]$RepoRoot = (Get-Location).Path,
        [int]$WaitSeconds = 20
    )
    $gitDir = Join-Path $RepoRoot ".git"
    $locks  = @("index.lock", "HEAD.lock", "config.lock") | ForEach-Object { Join-Path $gitDir $_ }
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
# on a push that actually SUCCEEDED. Never add `2>&1` to a native git call
# either: in 5.1 that turns each stderr LINE into an ErrorRecord and sets $?
# false even on exit 0.
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
    $head = & git rev-parse --verify HEAD 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($head)) {
        $bad += "HEAD does not resolve (unborn / broken ref)"
    }
    if ($bad.Count -gt 0) {
        Write-Host "[git-guard] .git INTEGRITY FAIL after write:" -ForegroundColor Red
        $bad | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        Write-Host "[git-guard] Recover: unstick-git.ps1 clears locks; if HEAD is unborn but packed-refs has the sha, run 'git update-ref refs/heads/main <sha>'." -ForegroundColor Yellow
        $global:LASTEXITCODE = $callerExitCode
        throw "[git-guard] .git corruption detected post-write"
    }
    $global:LASTEXITCODE = $callerExitCode
}
