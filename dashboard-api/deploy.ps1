# deploy.ps1: the one door for shipping the dashboard-api Worker (usage.yesandeverything.com).
#
# Order: the self-test, then wrangler deploy. A failing self-test stops the deploy before
# anything reaches the site.
#
# Added 2026-09-24 (bar-raise dependency-01): this Worker had no deploy script of its own,
# so shipping it meant typing `npx wrangler deploy` by hand from this folder with whatever
# version npm happened to resolve that day. This pins the same version every other deploy
# script in the repository reads, and keeps shipping down to one command.
#
#     cd X:\YesAndEverything\dashboard-api
#     .\deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# The one pinned wrangler version every deploy script in this repository reads
# (bar-raise 2026-09-24, dependency-01); see scripts/wrangler-version.ps1.
. (Join-Path $PSScriptRoot "..\scripts\wrangler-version.ps1")

if (-not $env:CLOUDFLARE_API_TOKEN) {
    $tokenFile = "X:\.secrets\.cloudflare-token"
    if (Test-Path $tokenFile) { $env:CLOUDFLARE_API_TOKEN = (Get-Content $tokenFile -Raw).Trim() }
}

Write-Host "==== self-test ====" -ForegroundColor Magenta
& node worker.selftest.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "worker self-test failed; nothing deployed." -ForegroundColor Red; exit 1 }

Write-Host "==== deploy ====" -ForegroundColor Magenta
$ErrorActionPreference = "Continue"
& npx --yes "wrangler@$WranglerVersion" deploy
if ($LASTEXITCODE -ne 0) { Write-Host "wrangler deploy failed." -ForegroundColor Red; exit 1 }

Write-Host "dashboard-api deployed." -ForegroundColor Green
