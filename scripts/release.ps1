# release.ps1
# One-stop release for YesAndEverything (umbrella static site).
# Equivalent to running push-to-github.ps1 then discord-notify.ps1.
#
# Usage from the YaE repo root:
#   .\scripts\release.ps1
#
# -Path forwards pathspecs to push-to-github.ps1 so the release stages only
# what you shipped. Without it the push stages everything, which sweeps
# whatever another session left staged into your commit. Routines write
# status/data, dashboard/data and the queue continuously, so an unscoped
# release almost always carries someone else's work:
#   .\scripts\release.ps1 -Path status/data/Ring.json
#
# Note: HBH's publish-gdd.ps1 already pushes to this repo from the HBH
# side. THIS script is for direct YaE edits (landing-page changes, new
# project cards, apothecary mirror updates that didn't come from
# X:\YesAndApothecary\deploy.ps1, etc).

param(
    [string[]]$Path = @()
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

# Save + restore caller's cwd. push-to-github.ps1 Set-Locations into the
# repo; if it exits leaving the cwd elsewhere, callers get stranded.
Push-Location

try {
    Write-Host "==== Step 1/4: dashboard JSON integrity guard ====" -ForegroundColor Magenta
    & (Join-Path $here "check-status-json.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Aborting release: corrupt status JSON would ship to the live dashboard." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "==== Step 2/4: write YaE's own dashboard status JSON ====" -ForegroundColor Magenta
    # Non-fatal: a failed status write never unships a release.
    try {
        $global:LASTEXITCODE = 0
        & (Join-Path $here "write-dashboard-status.ps1")
    } catch {
        Write-Host "WARN: YaE status write failed ($_). Dashboard card may be stale." -ForegroundColor Yellow
    }

    # Step 2 is itself a writer, so re-run the guard over its output. Checking
    # only before the write let a corrupt JSON written in Step 2 sail into the
    # Step 3 push and onto the live dashboard.
    & (Join-Path $here "check-status-json.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Aborting release: the Step 2 status write produced corrupt JSON." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "==== Step 3/4: push YaE to GitHub ====" -ForegroundColor Magenta
    if ($Path.Count -gt 0) {
        Write-Host "Scoped to: $($Path -join ', ')" -ForegroundColor DarkGray
        & (Join-Path $here "push-to-github.ps1") -Path $Path
    } else {
        & (Join-Path $here "push-to-github.ps1")
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "push-to-github.ps1 exited $LASTEXITCODE." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "==== Step 4/4: post to #yae-dev-log on Discord ====" -ForegroundColor Magenta
    # If scripts\.discord_webhook.txt is missing, discord-notify.ps1 logs a
    # warning and exits 0. Release is unaffected; Discord is optional.
    & (Join-Path $here "discord-notify.ps1")

    Write-Host ""
    Write-Host "==== Release complete ====" -ForegroundColor Green
}
finally {
    Pop-Location
}

# --- Refresh the live usage dashboard for this release (best-effort) ---
# Pushes fresh per-project token usage to the dashboard's Cloudflare KV so the live
# page (usage.yesandeverything.com) updates within seconds. -NoPush = KV + local only:
# no extra git commit and no GitHub Pages build. Never fails the release.
try { & "X:\YesAndEverything\scripts\collect-usage.ps1" -NoPush } catch { Write-Host "usage dashboard refresh skipped: $_" -ForegroundColor DarkGray }
