# check-dashboard-live.ps1 - freshness guard for the LIVE build dashboard.
#
# Reads the two endpoints the dashboard page itself reads and fails when what a
# visitor would see is stale. Deterministic, no judgment, exit code is the answer.
#
# Why it exists (2026-08-24): the dashboard froze on the previous day's payload
# for most of a day and every existing check stayed green. The routine ran on
# time, the local usage.json was fresh to the minute, and the routine watchdog
# passed the artifact-freshness sweep, because every one of those checks looks at
# the PRODUCER. Nothing anywhere looked at the PRODUCT. The publish to Cloudflare
# key-value storage had been failing since 02:19 with its error text piped to
# Out-Null, so the only signal was an exit code the script threw away.
#
# The same blindness hid a worse outage earlier: the collector did not run at all
# from 2026-08-05 to 2026-08-12, and by the time it resumed the local session
# transcripts for 08-05 and 08-06 had passed their retention window and been
# deleted. Those two days of token history are gone for good. A check that reads
# the live endpoint catches both shapes: a collector that publishes nothing, and
# a collector that is not running.
#
# Checks:
#   1. usage.json is reachable and parses
#   2. its generatedAt stamp is younger than -MaxAgeHours
#   3. the newest day present in it is today or yesterday, so a fresh stamp on an
#      empty payload cannot pass
#   4. statuses.json is reachable, parses, and carries at least -MinProjects
#
# Exit 0 clean, exit 1 listing what failed. Called by the routine watchdog and
# runnable standalone any time the page looks wrong.

param(
  # The collector runs every 4 hours. 5.5 catches a single missed or failed tick
  # without alarming on ordinary jitter.
  [double]$MaxAgeHours = 5.5,
  [int]$MinProjects = 8
)

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$USAGE_URL    = "https://usage.yesandeverything.com/usage.json"
$STATUSES_URL = "https://usage.yesandeverything.com/statuses.json"

$fail = @()
$note = @()

function Get-LiveJson([string]$url) {
  # no-cache on the request as well as the Worker's own no-store, so a proxy
  # between here and Cloudflare cannot hand back the very staleness being checked.
  return Invoke-RestMethod -Uri $url -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 45
}

# ----- 1 + 2 + 3: the usage payload -----------------------------------------
$usage = $null
try { $usage = Get-LiveJson $USAGE_URL }
catch { $fail += "usage.json unreachable: $($_.Exception.Message)" }

if ($usage) {
  if (-not $usage.generatedAt) {
    $fail += "usage.json carries no generatedAt stamp"
  } else {
    $gen = $null
    try { $gen = [datetime]::Parse($usage.generatedAt, $null, [Globalization.DateTimeStyles]::AdjustToUniversal) }
    catch { $fail += "usage.json generatedAt does not parse: $($usage.generatedAt)" }
    if ($gen) {
      $ageH = ([datetime]::UtcNow - $gen).TotalHours
      $note += ("usage.json generated {0:yyyy-MM-dd HH:mm}Z, {1:N1}h old" -f $gen, $ageH)
      if ($ageH -gt $MaxAgeHours) {
        $fail += ("usage.json is {0:N1}h old (limit {1}h); the live dashboard is frozen" -f $ageH, $MaxAgeHours)
      }
    }
  }

  # A fresh stamp on a payload with no recent days is still a broken dashboard.
  $newest = $null
  if ($usage.projects) {
    foreach ($p in $usage.projects.PSObject.Properties) {
      foreach ($row in @($p.Value.daily)) {
        if (-not $row.d) { continue }
        if (-not $newest -or $row.d -gt $newest) { $newest = $row.d }
      }
    }
  }
  if (-not $newest) {
    $fail += "usage.json carries no daily rows at all"
  } else {
    $cut = (Get-Date).ToUniversalTime().Date.AddDays(-1).ToString("yyyy-MM-dd")
    $note += "newest day in the payload: $newest"
    if ($newest -lt $cut) {
      $fail += "newest day in usage.json is $newest; nothing since the day before yesterday"
    }
  }
}

# ----- 4: the statuses bundle ------------------------------------------------
try {
  $statuses = Get-LiveJson $STATUSES_URL
  $count = @($statuses.PSObject.Properties).Count
  $note += "statuses.json carries $count projects"
  if ($count -lt $MinProjects) { $fail += "statuses.json carries only $count projects (expected at least $MinProjects)" }
} catch {
  $fail += "statuses.json unreachable: $($_.Exception.Message)"
}

# ----- verdict ---------------------------------------------------------------
$note | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

if ($fail.Count -gt 0) {
  Write-Host "DASHBOARD STALE:" -ForegroundColor Red
  $fail | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "Republish with: powershell -NoProfile -ExecutionPolicy Bypass -File X:\PortfolioOps\scripts\collect-usage.ps1 -NoPush" -ForegroundColor Yellow
  exit 1
}

Write-Host "Live dashboard is fresh." -ForegroundColor Green
exit 0
