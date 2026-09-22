# deploy.ps1: the one door for shipping the Coiled Guardian gate.
#
# Order: both self-tests, then wrangler deploy, then the live gate check in X:\CoiledGuardian.
# A failing self-test stops the deploy before anything reaches the site. A failing live check
# after the deploy exits non-zero, so a gate that locks the author out or opens a reader past
# chapter thirty is reported the minute it ships instead of the day he finds it.
#
# Written 2026-09-21, the night the share link locked Kane out of every chapter past thirty:
# the reader session and the author session shared one cookie, so opening his own link on his
# phone replaced his session with the link's. The self-tests now hold the two apart, and the
# live check proves the link never writes the author's cookie.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:CLOUDFLARE_API_TOKEN) {
    $tokenFile = "X:\.secrets\.cloudflare-token"
    if (Test-Path $tokenFile) { $env:CLOUDFLARE_API_TOKEN = (Get-Content $tokenFile -Raw).Trim() }
}

Write-Host "==== self-tests ====" -ForegroundColor Magenta
& node src/auth.selftest.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "auth self-test failed; nothing deployed." -ForegroundColor Red; exit 1 }
& node src/worker.selftest.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "worker self-test failed; nothing deployed." -ForegroundColor Red; exit 1 }

Write-Host "==== deploy ====" -ForegroundColor Magenta
$ErrorActionPreference = "Continue"
& npx --yes wrangler deploy
if ($LASTEXITCODE -ne 0) { Write-Host "wrangler deploy failed." -ForegroundColor Red; exit 1 }

Write-Host "==== live gate check ====" -ForegroundColor Magenta
Start-Sleep -Seconds 5
& python X:\CoiledGuardian\tools\gate_check.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "the live gate check failed after deploy: the gate is shipped and wrong. Fix it now." -ForegroundColor Red
    exit 1
}
Write-Host "gate deployed and proved." -ForegroundColor Green
