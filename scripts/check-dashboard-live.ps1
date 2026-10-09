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
#   5. the weekly rollup (constellation.json, Pages-served) is reachable and younger
#      than -MaxRollupAgeDays, because the band's health score and verdict come from
#      it and nothing else; its open and closed counts the page recounts live from
#      the statuses since 2026-09-23, after the band read "213 open" for three days
#      with every one of them closed
#
#   6. the repository holds no unmerged index entry, unfinished merge or rebase, or
#      conflict marker in dashboard/data or status/data (check-index-state.py)
#
# Exit 0 clean, exit 1 listing what failed. Called by the routine watchdog and
# runnable standalone any time the page looks wrong.

param(
  # The collector runs every 4 hours. 5.5 catches a single missed or failed tick
  # without alarming on ordinary jitter.
  [double]$MaxAgeHours = 5.5,
  [int]$MinProjects = 8,
  # The rollup runs on Sundays. Eight days catches a missed run without alarming on
  # a run that finished late in the day.
  [double]$MaxRollupAgeDays = 8,
  [double]$MaxUnsyncedHours = 6
)

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$USAGE_URL    = "https://usage.yesandeverything.com/usage.json"
$STATUSES_URL = "https://usage.yesandeverything.com/statuses.json"
$ROLLUP_URL   = "https://yesandeverything.com/status/data/constellation.json"

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

# ----- 5: the weekly rollup behind the band ------------------------------------
try {
  $rollup = Get-LiveJson $ROLLUP_URL
  if (-not $rollup.generatedAt) {
    $fail += "constellation.json carries no generatedAt stamp"
  } else {
    $rgen = [datetime]::Parse($rollup.generatedAt, $null, [Globalization.DateTimeStyles]::AdjustToUniversal)
    $ageD = ([datetime]::UtcNow - $rgen).TotalDays
    $note += ("rollup generated {0:yyyy-MM-dd HH:mm}Z, {1:N1} days old, health {2} {3}" -f $rgen, $ageD, $rollup.portfolioHealth, $rollup.portfolioVerdict)
    if ($ageD -gt $MaxRollupAgeDays) {
      $fail += ("the rollup is {0:N1} days old (limit {1}); the band's score and verdict are stale, run the constellation bar-raise" -f $ageD, $MaxRollupAgeDays)
    }
  }
} catch {
  $fail += "constellation.json unreachable: $($_.Exception.Message)"
}

# ----- 6: a stuck merge in this repository ---------------------------------------
# 2026-09-30: a pull left dashboard/data/usage.json unmerged and every commit failed
# for a day with nothing raising it. The check only ran inside release.ps1. It runs
# here because the routine health watch calls this script daily.
$indexCheck = Join-Path $PSScriptRoot "check-index-state.py"
$indexOut = & python $indexCheck 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
  $fail += "the repository is stuck mid-merge or holds conflict markers: " + (($indexOut.Trim().Split([char]10) | ForEach-Object { $_.Trim() }) -join " | ")
} else {
  $note += "index clean: no unmerged entries, no conflict markers"
}

# 2026-10-08: local main sat 2 commits ahead and 6 behind origin/main with two status
# commits unpushed for a day, and only the nightly audit prose said so. Neither the index
# check above nor pull-safe.py counts commits. Either side non-zero fails once its oldest
# commit is older than -MaxUnsyncedHours (default 6): a few hours is a session in flight,
# a day is a push that never happened. The tracking ref is refreshed first; a failed
# fetch is noted, and then the counts describe the last known state of origin.
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  try { & git fetch --quiet origin | Out-Null } catch { $note += "git fetch origin failed: $($_.Exception.Message)" }
  $lr = (& git rev-list --left-right --count "origin/main...main" | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $lr -notmatch '^(\d+)\s+(\d+)$') {
    $fail += "could not count local main against origin/main (git rev-list said: $lr)"
  } else {
    $behind = [int]$Matches[1]
    $ahead = [int]$Matches[2]
    $nowEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $oldestAhead = 0
    $oldestBehind = 0
    if ($ahead -gt 0) {
      $oldestAhead = [long](((& git log --format=%ct "origin/main..main" | Out-String).Trim().Split([char]10) | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Sort-Object { [long]$_ } | Select-Object -First 1))
    }
    if ($behind -gt 0) {
      $oldestBehind = [long](((& git log --format=%ct "main..origin/main" | Out-String).Trim().Split([char]10) | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Sort-Object { [long]$_ } | Select-Object -First 1))
    }
    $note += "local main is $ahead ahead and $behind behind origin/main"
    if ($ahead -gt 0) {
      $hrs = ($nowEpoch - $oldestAhead) / 3600.0
      if ($hrs -gt $MaxUnsyncedHours) {
        $fail += ("local main holds {0} commit(s) not pushed to origin/main, the oldest {1:N1} hours old (limit {2}); push them" -f $ahead, $hrs, $MaxUnsyncedHours)
      }
    }
    if ($behind -gt 0) {
      $hrs = ($nowEpoch - $oldestBehind) / 3600.0
      if ($hrs -gt $MaxUnsyncedHours) {
        $fail += ("local main is {0} commit(s) behind origin/main, the oldest {1:N1} hours old (limit {2}); pull them" -f $behind, $hrs, $MaxUnsyncedHours)
      }
    }
  }
} finally {
  Pop-Location
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
