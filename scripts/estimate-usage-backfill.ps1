# estimate-usage-backfill.ps1 - calibrated estimate of Claude spend the surviving
# session logs do not cover.
#
# Premise (per Kane, 2026-06-11): every piece of work in every project was built
# in Claude, so each repo's git history is a complete record of work volume.
# The 31-day commit record runs ~49 commits/day all month (peaks of 100-158),
# flat-to-heavier than today, while measured spend thins out going backward:
# transcripts get purged not just before one horizon date but progressively
# inside the window too. So this is a DAY-LEVEL RECONCILIATION, not a simple
# pre-horizon extrapolation:
#
#   expected(project, day) = commits(project, day) x rate(project)
#   shortfall(project, day) = max(0, expected - measured)
#   estimate(project) = sum of shortfall over all days before today
#
# rate(project) is the median cost-per-commit / tokens-per-commit over the
# project's most recent 7 active days (commits > 0 AND measured > 0), the
# best-retained stretch of the logs. The median keeps one monster session from
# setting the rate. Projects without enough samples use portfolio-median rates.
# Days where measured >= expected contribute nothing; measured data is never
# scaled down. Tokens are in+out only (cache is priced into dollars but never
# displayed as volume). Estimates land in a separate file and render with an
# approx mark; they are never mixed into measured data.
#
#   cd X:\YesAndEverything
#   .\scripts\estimate-usage-backfill.ps1            # estimate + commit + push
#   .\scripts\estimate-usage-backfill.ps1 -NoPush    # estimate only
#
# Output: dashboard\data\backfill.json. Cheap to re-run (git log only).
# Caveat: usage.json's daily series is capped at 60 days; once the portfolio
# is older than that, extend the cap in collect-usage.ps1 before trusting this.

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
  @{ id = "YaE"; path = "X:\YesAndEverything" },
  @{ id = "YaAg"; path = "X:\YesAndAgents" }
)

$UsagePath = Join-Path $RepoRoot "dashboard\data\usage.json"
if (-not (Test-Path $UsagePath)) { throw "usage.json not found; run collect-usage.ps1 first." }
$usage = Get-Content -Raw $UsagePath | ConvertFrom-Json

$todayKey = (Get-Date).ToString("yyyy-MM-dd")

function Median($arr) {
  $s = @($arr | Sort-Object)
  $n = $s.Count
  if ($n -eq 0) { return 0 }
  if ($n % 2 -eq 1) { return $s[[int](($n - 1) / 2)] }
  return ($s[$n / 2 - 1] + $s[$n / 2]) / 2
}

# ----- Pass 1: per-project day tables --------------------------------------
$P = @{}   # id -> @{ commits = @{date->n}; cost = @{date->$}; tok = @{date->n} }
foreach ($r in $REPOS) {
  if (-not (Test-Path $r.path)) { Write-Host "INFO: $($r.path) not found, skipping." -ForegroundColor DarkGray; continue }
  $lock = Join-Path $r.path ".git\index.lock"
  if (Test-Path $lock) { Remove-Item -Force $lock -ErrorAction SilentlyContinue }
  $dates = & git -C $r.path log --pretty=%ad --date=short 2>$null
  if (-not $dates) { Write-Host "WARN: no git history readable at $($r.path); skipped." -ForegroundColor Yellow; continue }
  $cByDay = @{}
  foreach ($d in $dates) { if ($cByDay.ContainsKey($d)) { $cByDay[$d]++ } else { $cByDay[$d] = 1 } }
  $cost = @{}; $tok = @{}; $cin = @{}; $cout = @{}; $ccr = @{}; $ccw = @{}
  $u = $usage.projects.PSObject.Properties[$r.id]
  if ($u) {
    foreach ($d in $u.Value.daily) {
      $cost[$d.d] = [double]$d.costUSD
      $tok[$d.d] = [long]$d.input + [long]$d.output
      $cin[$d.d] = [long]$d.input; $cout[$d.d] = [long]$d.output
      $ccr[$d.d] = [long]$d.cacheRead; $ccw[$d.d] = [long]$d.cacheWrite
    }
  }
  $P[$r.id] = @{ commits = $cByDay; cost = $cost; tok = $tok; cin = $cin; cout = $cout; ccr = $ccr; ccw = $ccw }
}

# ----- Pass 2: per-commit token BUNDLES from the best-retained recent days --
# The bundle (input, output, cache-read, cache-write per commit) is measured;
# the PRICE applied to estimated work is Opus 4.8 ($5/$25, cache 0.5/6.25),
# per the standing assumption: historical work ran Opus-class unless a
# transcript confirms otherwise (measured records carry confirmed models and
# keep their recorded pricing).
$OPUS = @{ inP = 5.0; outP = 25.0; crP = 0.5; cwP = 6.25 }
function BundleCostUSD($bIn, $bOut, $bCr, $bCw) {
  return ($bIn * $OPUS.inP + $bOut * $OPUS.outP + $bCr * $OPUS.crP + $bCw * $OPUS.cwP) / 1e6
}
$rates = @{}   # id -> @{ in;out;cr;cw per commit; samples }
$allIn = @(); $allOut = @(); $allCr = @(); $allCw = @()
foreach ($id in $P.Keys) {
  $t = $P[$id]
  $sampleDays = @($t.commits.Keys | Where-Object { $_ -lt $todayKey -and $t.cost[$_] -gt 0 } | Sort-Object -Descending | Select-Object -First 7)
  $rIn = @(); $rOut = @(); $rCr = @(); $rCw = @()
  foreach ($d in $sampleDays) {
    $n = $t.commits[$d]
    if ($n -gt 0) {
      $rIn += $t.cin[$d] / $n; $rOut += $t.cout[$d] / $n
      $rCr += $t.ccr[$d] / $n; $rCw += $t.ccw[$d] / $n
    }
  }
  $rates[$id] = @{ in = (Median $rIn); out = (Median $rOut); cr = (Median $rCr); cw = (Median $rCw); samples = $rIn.Count }
  $allIn += $rIn; $allOut += $rOut; $allCr += $rCr; $allCw += $rCw
}
$pf = @{ in = (Median $allIn); out = (Median $allOut); cr = (Median $allCr); cw = (Median $allCw) }

# ----- Pass 3: day-level shortfall ------------------------------------------
$projects = [ordered]@{}
$totEstTok = [long]0; $totEstCost = [double]0
$totPerDay = @{}   # date -> @{ tok; cost } summed across projects
foreach ($r in $REPOS) {
  if (-not $P.ContainsKey($r.id)) { continue }
  $t = $P[$r.id]
  $rate = $rates[$r.id]
  $useOwn = ($rate.samples -ge 4)
  $b = if ($useOwn) { $rate } else { $pf }
  $perCommitCost = BundleCostUSD $b.in $b.out $b.cr $b.cw
  $perCommitTok = $b.in + $b.out
  $estCost = [double]0; $estTok = [long]0; $shortDays = 0; $commitsCovered = 0
  $perDay = @()
  foreach ($d in ($t.commits.Keys | Sort-Object)) {
    if ($d -ge $todayKey) { continue }   # today is in-flight; never estimated
    $n = $t.commits[$d]
    $mC = [double]$t.cost[$d]
    $mT = [long]$t.tok[$d]
    $dC = ($n * $perCommitCost) - $mC
    if ($dC -gt 0) {
      $dT = [long][Math]::Max(0, ($n * $perCommitTok) - $mT)
      $estCost += $dC
      $estTok += $dT
      $shortDays++
      $commitsCovered += $n
      $perDay += [ordered]@{ d = $d; tok = $dT; cost = [math]::Round($dC, 2) }
      if (-not $totPerDay.ContainsKey($d)) { $totPerDay[$d] = @{ tok = [long]0; cost = [double]0 } }
      $totPerDay[$d].tok += $dT; $totPerDay[$d].cost += $dC
    }
  }
  $estCost = [math]::Round($estCost, 2)
  $totEstTok += $estTok; $totEstCost += $estCost
  $projects[$r.id] = [ordered]@{
    opusRatePerCommitUSD = [math]::Round($perCommitCost, 2)
    rateSamples = $rate.samples
    rateBasis = $(if ($useOwn) { "own bundle median (7 recent active days), Opus 4.8 priced" } else { "portfolio bundle median, Opus 4.8 priced" })
    shortfallDays = $shortDays
    commitsOnShortfallDays = $commitsCovered
    estTokens = $estTok
    estCostUSD = $estCost
    perDay = $perDay
  }
  Write-Host ("  {0,-6} opus rate `${1,6:n2}/commit ({2}) -> {3,3} thin day(s), {4,4} commits ~ {5,12:n0} tok / `${6,9:n2}" -f $r.id, $perCommitCost, $(if ($useOwn) { "own" } else { "pf" }), $shortDays, $commitsCovered, $estTok, $estCost) -ForegroundColor DarkGray
}
$totPerDayArr = @()
foreach ($d in ($totPerDay.Keys | Sort-Object)) {
  $totPerDayArr += [ordered]@{ d = $d; tok = $totPerDay[$d].tok; cost = [math]::Round($totPerDay[$d].cost, 2) }
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  horizon = $(if ($usage.oldestRecord) { $usage.oldestRecord } else { $null })
  method = "day-level reconciliation: expected = commits x median per-commit token bundle (in/out/cacheRead/cacheWrite) from each project's 7 most recent active days, PRICED AT OPUS 4.8 (5/25, cache 0.5/6.25) per the standing assumption that unconfirmed historical work ran Opus-class. Estimate = sum of max(0, expected - measured) per day before today; covers purged pre-horizon history and thinned days inside the window. Measured records keep their confirmed-model pricing. Tokens are in+out only."
  totals = [ordered]@{ estTokens = $totEstTok; estCostUSD = [math]::Round($totEstCost, 2); perDay = $totPerDayArr }
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
Write-Host ("Wrote {0}: ~{1:n0} tokens / ~`${2:n2} estimated beyond what the logs still hold." -f $OutPath, $totEstTok, $totEstCost) -ForegroundColor Green

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
