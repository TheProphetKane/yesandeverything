# deploy.ps1: the one door for shipping the family-votes Worker (yesandeverything.com/thanksgiving-2026/api/*).
#
# Order: the self-test, then wrangler deploy, then a live read of the vote route. A failing
# self-test stops the deploy before anything reaches the site, and a route that does not answer
# afterwards fails the script.
#
#     cd X:\YesAndEverything\workers\family-votes
#     .\deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

. (Join-Path $PSScriptRoot "..\..\scripts\wrangler-version.ps1")

if (-not $env:CLOUDFLARE_API_TOKEN) {
    $tokenFile = "X:\.secrets\.cloudflare-token"
    if (Test-Path $tokenFile) { $env:CLOUDFLARE_API_TOKEN = (Get-Content $tokenFile -Raw).Trim() }
}

Write-Host "==== self-test ====" -ForegroundColor Magenta
& node src\worker.selftest.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "self-test failed; nothing deployed." -ForegroundColor Red; exit 1 }

Write-Host "==== deploy ====" -ForegroundColor Magenta
$ErrorActionPreference = "Continue"
& npx --yes "wrangler@$WranglerVersion" deploy
if ($LASTEXITCODE -ne 0) { Write-Host "wrangler deploy failed." -ForegroundColor Red; exit 1 }

Write-Host "==== live check ====" -ForegroundColor Magenta
$ok = $false
foreach ($i in 1..6) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "https://yesandeverything.com/thanksgiving-2026/api/votes" -TimeoutSec 15
        if ($r.StatusCode -eq 200 -and $r.Content -match '"voters"') { $ok = $true; break }
    } catch { }
    Start-Sleep -Seconds 5
}
if (-not $ok) { Write-Host "the vote route is not answering on the live domain." -ForegroundColor Red; exit 1 }
Write-Host "family-votes deployed and answering." -ForegroundColor Green
