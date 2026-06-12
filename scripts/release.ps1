# release.ps1
# One-stop release for YesAndEverything (umbrella static site).
# Equivalent to running push-to-github.ps1 then discord-notify.ps1.
#
# Usage from the YaE repo root:
#   .\scripts\release.ps1
#
# Note: HBH's publish-gdd.ps1 already pushes to this repo from the HBH
# side. THIS script is for direct YaE edits (landing-page changes, new
# project cards, apothecary mirror updates that didn't come from
# X:\YesAndApothecary\deploy.ps1, etc).

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

    Write-Host ""
    Write-Host "==== Step 3/4: push YaE to GitHub ====" -ForegroundColor Magenta
    & (Join-Path $here "push-to-github.ps1")
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
