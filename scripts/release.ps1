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
    Write-Host "==== Step 1/2: push YaE to GitHub ====" -ForegroundColor Magenta
    & (Join-Path $here "push-to-github.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "push-to-github.ps1 exited $LASTEXITCODE." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "==== Step 2/2: post to #yae-dev-log on Discord ====" -ForegroundColor Magenta
    # If scripts\.discord_webhook.txt is missing, discord-notify.ps1 logs a
    # warning and exits 0. Release is unaffected; Discord is optional.
    & (Join-Path $here "discord-notify.ps1")

    Write-Host ""
    Write-Host "==== Release complete ====" -ForegroundColor Green
}
finally {
    Pop-Location
}
