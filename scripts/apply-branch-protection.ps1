# apply-branch-protection.ps1
# Apply linear-history + no-force-push to main across all 7 repos.
# Standalone (does not require apply-github-parity.ps1). Verbose: prints the
# full API error when a call fails so the actual GitHub message is visible.
#
# Usage:
#   cd X:\YesAndEverything
#   .\scripts\apply-branch-protection.ps1
#
# Or limit to one repo for diagnosis:
#   .\scripts\apply-branch-protection.ps1 -OnlyRepo here-be-hordes

param(
  [string]$OnlyRepo = ""
)

$ErrorActionPreference = "Continue"

$repos = @(
  "here-be-hordes",
  "brackish-rising",
  "yesandbudget",
  "yesandchains",
  "yesandscheduler",
  "yesandapothecary",
  "yesandeverything"
)
if ($OnlyRepo) { $repos = @($OnlyRepo) }

# Request body. PowerShell $null/$false/$true serialize to JSON null/false/true.
$protectionObj = @{
  required_status_checks         = $null
  enforce_admins                 = $false
  required_pull_request_reviews  = $null
  restrictions                   = $null
  allow_force_pushes             = $false
  allow_deletions                = $false
  required_linear_history        = $true
  required_conversation_resolution = $false
  lock_branch                    = $false
  allow_fork_syncing             = $true
}
$protectionJson = $protectionObj | ConvertTo-Json -Depth 5 -Compress

Write-Host ""
Write-Host "Branch-protection body:" -ForegroundColor DarkGray
Write-Host "  $protectionJson" -ForegroundColor DarkGray
Write-Host ""

foreach ($slug in $repos) {
  $repo = "TheProphetKane/$slug"
  Write-Host "=== $repo ===" -ForegroundColor Cyan

  # Send the PUT. Write the body as UTF-8 WITHOUT BOM - PowerShell's
  # Out-File -Encoding utf8 emits EF BB BF which GitHub's JSON parser rejects.
  $tmpFile = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmpFile, $protectionJson, [System.Text.UTF8Encoding]::new($false))

  $result = gh api -X PUT "/repos/$repo/branches/main/protection" --input $tmpFile 2>&1
  $exit = $LASTEXITCODE
  Remove-Item -Force $tmpFile

  if ($exit -eq 0) {
    Write-Host "  PUT succeeded" -ForegroundColor Green
    # Verify the read-back
    $check = gh api "/repos/$repo/branches/main/protection" --jq ".required_linear_history.enabled, .allow_force_pushes.enabled, .allow_deletions.enabled" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  linear_history / force_pushes / deletions: $check" -ForegroundColor Green
    } else {
      Write-Host "  WARN: read-back failed: $check" -ForegroundColor Yellow
    }
  } else {
    Write-Host "  PUT FAILED (exit $exit)" -ForegroundColor Red
    Write-Host "  --- full API response ---" -ForegroundColor Red
    $result | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "  --- end response ---" -ForegroundColor Red
  }
  Write-Host ""
}

Write-Host "===== branch-protection pass complete =====" -ForegroundColor Green
Write-Host ""
Write-Host "If you saw '403 Upgrade' or 'Branch protection is only available' errors:" -ForegroundColor Yellow
Write-Host "  - User-owned PRIVATE repos require GitHub Pro for branch protection." -ForegroundColor Yellow
Write-Host "  - The modern alternative is Rulesets (Settings > Rules > Rulesets in the web UI)." -ForegroundColor Yellow
Write-Host "  - Rulesets work on private repos in the free plan and cover the same protections." -ForegroundColor Yellow
