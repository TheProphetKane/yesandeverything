# check-status-json.ps1 - integrity guard for the dashboard data files.
#
# Verifies every status/data/*.json parses as JSON, contains no NUL bytes,
# and ends with a closing brace. Catches FUSE / interrupted-write truncation
# before it ships to the live dashboard. Exit 0 when clean; exit 1 listing
# the bad files. Called as Step 0 of release.ps1; also runnable standalone
# after any bulk status write.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$bad = @()
Get-ChildItem "status\data\*.json" -ErrorAction SilentlyContinue | ForEach-Object {
  $raw = [System.IO.File]::ReadAllText($_.FullName)
  $why = $null
  if ($raw.Length -eq 0) { $why = "empty file" }
  elseif ($raw.Contains([char]0)) { $why = "NUL bytes (truncation padding)" }
  elseif (-not $raw.TrimEnd().EndsWith("}")) { $why = "does not end with a closing brace" }
  else {
    try { $null = $raw | ConvertFrom-Json } catch { $why = "does not parse: $($_.Exception.Message)" }
  }
  if ($why) { $bad += "$($_.Name): $why" }
}

if ($bad.Count -gt 0) {
  Write-Host "FAIL: corrupt dashboard JSON detected:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "Restore the last good version (git show HEAD:status/data/<file>) before releasing." -ForegroundColor Yellow
  exit 1
}

Write-Host "All status/data JSONs parse clean." -ForegroundColor Green
exit 0
