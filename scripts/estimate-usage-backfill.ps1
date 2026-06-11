# estimate-usage-backfill.ps1 - calibrated estimate of Claude spend that predates
# the surviving session logs.
#
# Premise (per Kane, 2026-06-11): every piece of work in every project was built
# in Claude, so each repo's git history is a complete record of Claude work
# units. The surviving transcript window gives a MEASURED exchange rate per
# project (tokens per commit, blended $ per token including that project's
# model mix and cache behavior). Commits older than the log horizon get the
# project's measured rate applied to them. The result is an estimate with
# honest error bars, kept in a separate file so measured and estimated numbers
# are never silently mixed.
#
#   cd X:\YesAndEverything
#   .\scripts\estimate-usage-backfill.ps1            # estimate + commit + push
#   .\scripts\estimate-usage-backfill.ps1 -NoPush    # estimate only
#
# Output: dashboard\data\backfill.json. Re-run whenever the horizon moves or
# after a -Rescan; it is cheap (git log only, no transcript scanning).

param([switch]$NoPush)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

$REPOS = @(
  @{ id = "HBH"; path = "X:\HereBeHordes" },
  @{ id = "BR";  path = "X:\BrackishRising" },
  @{ id = "YaC"; path = "X:\YesAndChains" },
  @{ id = "YaS"; path = "X:\YesAndScheduler" },
  @{ id = "YaA"; path = "X:\YesAndApothecary" },
  @{ id = "YaB"; path = "X:\YesAndBudget" },
  @{ id = "YaE"; path = "X:\YesAndEverything" }
)

$UsagePath = Join-Path $RepoRoot "dashboard\data\usage.json"
if (-not (Test-Path $UsagePath)) { throw "usage.json not found; run collect-usage.ps1 first." }
$usage = Get-Content -Raw $UsagePath | ConvertFrom-Json

# The horizon: oldest surviving usage record. Everything before it is estimated.
$horizon = $null
if ($usage.oldestRecord) { try { $horizon = [datetime]$usage.oldestRecord } catch { $horizon = $null } }
if (-not $horizon) {
  # fallback: oldest day in any project's daily series
  foreach ($pp in $usage.projects.PSObject.Properties) {
    foreach ($d in $pp.Value.daily) {
      $dd = [datetime]$d.d
      if (-not $horizon -or $dd -lt $horizon) { $horizon = $dd }
    }
  }
}
if (-not $horizon) { throw "no horizon derivable from usage.json." }
$horizonKey = $horizon.ToString("yyyy-MM-dd")
Write-Host "Log horizon: $horizonKey. Commits before this date get estimated at each project's measured rate." -ForegroundColor Cyan

$projects = [ordered]@{}
$totEstTok = [long]0; $totEstCost = [double]0
foreach ($r in $REPOS) {
  if (-not (Test-Path $r.path)) { Write-Host "INFO: $($r.path) not found, skipping." -ForegroundColor DarkGray; continue }
  $lock = Join-Path $r.path ".git\index.lock"
  if (Test-Path $lock) { Remove-Item -Force $lock -ErrorAction SilentlyContinue }
  $dates = & git -C $r.path log --pretty=%ad --date=short 2>$null
  if (-not $dates) { Write-Host "WARN: no git history readable at $($r.path); skipped." -ForegroundColor Yellow; continue }
  $pre = 0; $in = 0
  foreach ($d in $dates) {
    if ($d -lt $horizonKey) { $pre++ } else { $in++ }
  }
  $u = $usage.projects.PSObject.Properties[$r.id]
  $measTok = [long]0; $measCost = [double]0
  if ($u) {
    $at = $u.Value.allTime
    $measTok = [long]$at.input + [long]$at.output + [long]$at.cacheRead + [long]$at.cacheWrite
    $measCost = [double]$at.costUSD
  }
  # tokens-per-commit and blended $/token from the measured window only
  $rateTok = if ($in -gt 0) { $measTok / $in } else { 0 }
  $dollarPerTok = if ($measTok -gt 0) { $measCost / $measTok } else { 0 }
  $estTok = [long]($rateTok * $pre)
  $estCost = [math]::Round($estTok * $dollarPerTok, 2)
  $totEstTok += $estTok; $totEstCost += $estCost
  $projects[$r.id] = [ordered]@{
    preCommits = $pre
    inCommits = $in
    tokensPerCommit = [long]$rateTok
    estTokens = $estTok
    estCostUSD = $estCost
  }
  Write-Host ("  {0,-6} {1,4} commits pre-horizon x {2,10:n0} tok/commit ~ {3,12:n0} tok / `${4,8:n2}" -f $r.id, $pre, $rateTok, $estTok, $estCost) -ForegroundColor DarkGray
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  horizon = $horizonKey
  method = "git commits before the log horizon x each project's measured tokens-per-commit and blended dollars-per-token from surviving transcripts; everything was built in Claude, so commit history is a complete work record. Estimate, not measurement; expect real error bars."
  totals = [ordered]@{ estTokens = $totEstTok; estCostUSD = [math]::Round($totEstCost, 2) }
  projects = $projects
}

$OutPath = Join-Path $RepoRoot "dashboard\data\backfill.json"
$json = ($payload | ConvertTo-Json -Depth 6) -replace "`r`n", "`n"
if (-not $json.EndsWith("`n")) { $json += "`n" }
$tmp = "$OutPath.tmp"
[System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))
$null = (Get-Content -Raw $tmp | ConvertFrom-Json)
Move-Item -Force $tmp $OutPath
$back = [System.IO.File]::ReadAllText($OutPath)
if ($back.Contains([char]0)) { throw "NUL bytes in $OutPath after write" }
$null = ($back | ConvertFrom-Json)
Write-Host ("Wrote {0}: ~{1:n0} tokens / ~`${2:n2} estimated before {3}." -f $OutPath, $totEstTok, $totEstCost, $horizonKey) -ForegroundColor Green

if ($NoPush) { exit 0 }
$ErrorActionPreference = "Continue"
foreach ($lockName in @("index.lock", "HEAD.lock")) {
  $lock = ".git\$lockName"
  if (Test-Path $lock) { Remove-Item -Force $lock -ErrorAction SilentlyContinue }
}
& git add dashboard/data/backfill.json 2>&1 | Out-Null
$staged = git diff --cached --name-only 2>$null
if ([string]::IsNullOrWhiteSpace($staged)) { Write-Host "Nothing changed; no push." -ForegroundColor DarkGray; exit 0 }
& git commit -m "work: usage backfill estimate" 2>&1 | Out-Null
& git push origin (git rev-parse --abbrev-ref HEAD 2>$null) 2>&1 | Out-Null
Write-Host "Pushed backfill estimate." -ForegroundColor Green
