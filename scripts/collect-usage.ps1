# collect-usage.ps1 - aggregate per-project Claude token usage for the /work/ dashboard.
#
# Scans local session logs (Claude Code project transcripts + Cowork session
# logs), attributes each usage record to a project by path, buckets tokens by
# local day, prices them with the editable table below, and writes
# work\data\usage.json. Incremental: a state file remembers how far into each
# log it has read, so repeat runs only process appended lines. Output lands
# at dashboard\data\usage.json for the /dashboard/ page.
#
# Run manually or on a schedule (every 30 min is plenty):
#   cd X:\YesAndEverything
#   .\scripts\collect-usage.ps1            # collect + commit + push
#   .\scripts\collect-usage.ps1 -NoPush    # collect only
#
# Costs are API-EQUIVALENT ESTIMATES. Subscription usage is not billed per
# token; the table below exists so the numbers mean something. Edit freely.

param([switch]$NoPush)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

# ----- Pricing (USD per million tokens; Anthropic published API rates) ----
# Verified against the published price list on the date below. When rates
# change: update the table AND bump $PRICING_VERSION (any date string). Costs
# are frozen into the state aggregates at scan time, so a rate change applies
# to FUTURE token use only, never retroactively. Cache rates follow the
# standard convention: read = 0.1x input, 5-minute write = 1.25x input.
$PRICING_VERSION = "2026-06-10"
$PRICING = @(
  @{ match = "fable";  in = 10.0; out = 50.0; cacheRead = 1.00; cacheWrite = 12.50 },
  @{ match = "opus";   in =  5.0; out = 25.0; cacheRead = 0.50; cacheWrite =  6.25 },
  @{ match = "sonnet"; in =  3.0; out = 15.0; cacheRead = 0.30; cacheWrite =  3.75 },
  @{ match = "haiku";  in =  1.0; out =  5.0; cacheRead = 0.10; cacheWrite =  1.25 }
)
$PRICE_DEFAULT = @{ in = 3.0; out = 15.0; cacheRead = 0.30; cacheWrite = 3.75 }

# ----- Project attribution (ordered; first hit wins) ---------------------
$PROJECT_PATTERNS = @(
  # scheduled-task names first: a task session belongs to its project even when
  # its prompt also mentions the YaE queue or other repos
  @{ pat = "audit-htbh";       id = "HBH" },
  @{ pat = "bar-raise-hbh";    id = "HBH" },
  @{ pat = "audit-brackish";   id = "BR" },
  @{ pat = "bar-raise-br";     id = "BR" },
  @{ pat = "audit-yac";        id = "YaC" },
  @{ pat = "bar-raise-yac";    id = "YaC" },
  @{ pat = "audit-scheduler";  id = "Scheduler" },
  @{ pat = "bar-raise-scheduler"; id = "Scheduler" },
  @{ pat = "audit-apothecary"; id = "YaA" },
  @{ pat = "bar-raise-yaa";    id = "YaA" },
  @{ pat = "audit-yab";        id = "YaB" },
  @{ pat = "bar-raise-yab";    id = "YaB" },
  @{ pat = "Claude\Scheduled"; id = "YaE" },   # any other scheduled task -> Everything
  @{ pat = "HereBeHordes";     id = "HBH" },
  @{ pat = "HereThereBeHordes"; id = "HBH" },
  @{ pat = "BrackishRising";   id = "BR" },
  @{ pat = "YesAndChains";     id = "YaC" },
  @{ pat = "YesAndScheduler";  id = "Scheduler" },
  @{ pat = "YesAndApothecary"; id = "YaA" },
  @{ pat = "YesAndBudget";     id = "YaB" },
  @{ pat = "YesAndEverything"; id = "YaE" },
  @{ pat = "Scheduler";        id = "Scheduler" }   # legacy X:\Scheduler path; after YesAnd* so it never shadows them
)

$SCAN_ROOTS = @(
  (Join-Path $env:USERPROFILE ".claude\projects"),
  (Join-Path $env:APPDATA "Claude"),
  (Join-Path $env:LOCALAPPDATA "AnthropicClaude")
)

# Absolute paths throughout: .NET file APIs ignore PowerShell's cwd.
# Day buckets use the Central calendar day so "today" resets at midnight
# Central everywhere, regardless of the machine or viewer timezone.
$CT = [System.TimeZoneInfo]::FindSystemTimeZoneById("Central Standard Time")
function Get-CentralDay([datetime]$ts) {
  return [System.TimeZoneInfo]::ConvertTime($ts.ToUniversalTime(), $CT).ToString("yyyy-MM-dd")
}

$DataDir = Join-Path $RepoRoot "dashboard\data"
$OutPath = Join-Path $DataDir "usage.json"
$StatePath = Join-Path $DataDir ".usage-state.json"
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }

function Get-ProjectFor([string]$text) {
  foreach ($p in $PROJECT_PATTERNS) {
    if ($text -and $text.IndexOf($p.pat, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $p.id }
  }
  return $null
}

function Get-Price([string]$model) {
  if ($model) {
    foreach ($p in $PRICING) {
      if ($model.IndexOf($p.match, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $p }
    }
  }
  return $PRICE_DEFAULT
}

# ----- Load state ---------------------------------------------------------
$Files = @{}   # path -> @{ length; processed; project }
$Agg = @{}     # project -> date -> @{ input; output; cacheRead; cacheWrite; cost }
if (Test-Path $StatePath) {
  try {
    $state = Get-Content -Raw $StatePath | ConvertFrom-Json
    if (-not $state.pricingVersion) {
      # Pre-versioned state was built on placeholder rates. One-time full
      # re-scan so history is priced at the published table. Versioned states
      # are never repriced: a future rate change applies forward only.
      throw "state predates pricing versioning; full re-scan at published rates"
    }
    if ($state.pricingVersion -ne $PRICING_VERSION) {
      Write-Host "INFO: pricing table changed ($($state.pricingVersion) -> $PRICING_VERSION). Existing aggregates keep their original pricing; new tokens use the new table." -ForegroundColor Yellow
    }
    foreach ($prop in $state.files.PSObject.Properties) {
      $Files[$prop.Name] = @{ length = [long]$prop.Value.length; processed = [long]$prop.Value.processed; project = $prop.Value.project }
    }
    foreach ($row in $state.agg) {
      $rp = $row.p
      if ($rp -eq "Other" -or $rp -eq "unattributed") { $rp = "YaE" }  # fold legacy buckets into Everything
      if (-not $Agg.ContainsKey($rp)) { $Agg[$rp] = @{} }
      if (-not $Agg[$rp].ContainsKey($row.d)) { $Agg[$rp][$row.d] = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; cost = [double]0 } }
      $b = $Agg[$rp][$row.d]
      $b.input += [long]$row.input; $b.output += [long]$row.output
      $b.cacheRead += [long]$row.cacheRead; $b.cacheWrite += [long]$row.cacheWrite; $b.cost += [double]$row.cost
    }
  } catch {
    Write-Host "WARN: state file unreadable; full rescan. ($_)" -ForegroundColor Yellow
    $Files = @{}; $Agg = @{}
  }
}

function Add-Usage([string]$proj, [string]$day, $u, [string]$model) {
  $in  = [long]($u.input_tokens); if (-not $in) { $in = 0 }
  $out = [long]($u.output_tokens); if (-not $out) { $out = 0 }
  $cr  = [long]($u.cache_read_input_tokens); if (-not $cr) { $cr = 0 }
  $cw  = [long]($u.cache_creation_input_tokens); if (-not $cw) { $cw = 0 }
  if (($in + $out + $cr + $cw) -eq 0) { return }
  $price = Get-Price $model
  $cost = ($in * $price.in + $out * $price.out + $cr * $price.cacheRead + $cw * $price.cacheWrite) / 1e6
  if (-not $Agg.ContainsKey($proj)) { $Agg[$proj] = @{} }
  if (-not $Agg[$proj].ContainsKey($day)) { $Agg[$proj][$day] = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; cost = [double]0 } }
  $b = $Agg[$proj][$day]
  $b.input += $in; $b.output += $out; $b.cacheRead += $cr; $b.cacheWrite += $cw; $b.cost += $cost
}

# ----- Scan ----------------------------------------------------------------
$scannedFiles = 0; $newLines = 0; $usageLines = 0
foreach ($root in $SCAN_ROOTS) {
  if (-not (Test-Path $root)) { Write-Host "INFO: $root not found, skipping." -ForegroundColor DarkGray; continue }
  $logs = Get-ChildItem -Path $root -Filter *.jsonl -Recurse -File -ErrorAction SilentlyContinue
  foreach ($f in $logs) {
    $key = $f.FullName
    $prev = $Files[$key]
    if ($prev -and $prev.length -eq $f.Length) { continue }
    $processed = 0; $fileProj = $null
    if ($prev) { $processed = $prev.processed; $fileProj = $prev.project }
    if (-not $fileProj) { $fileProj = Get-ProjectFor $key }
    $scannedFiles++

    $fs = [System.IO.File]::Open($key, "Open", "Read", "ReadWrite")
    try {
      if ($processed -gt 0 -and $processed -le $fs.Length) { $fs.Seek($processed, "Begin") | Out-Null } else { $processed = 0 }
      $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
      $chunk = $sr.ReadToEnd()
      $consumed = $fs.Length - $processed
      # Only count fully-terminated lines; an in-flight session may be mid-write
      # on the last line. Leave the partial tail for the next run.
      $lastNl = $chunk.LastIndexOf("`n")
      if ($lastNl -lt 0) { continue }
      $body = $chunk.Substring(0, $lastNl + 1)
      $byteLen = [System.Text.Encoding]::UTF8.GetByteCount($body)
      $newProcessed = $processed + $byteLen

      foreach ($line in $body -split "`n") {
        if (-not $line) { continue }
        $newLines++
        if ($line.IndexOf('"usage"') -lt 0) {
          if (-not $fileProj) { $hit = Get-ProjectFor $line; if ($hit) { $fileProj = $hit } }
          continue
        }
        $obj = $null
        try { $obj = $line | ConvertFrom-Json } catch { continue }
        $usage = $null; $model = $null
        if ($obj.message -and $obj.message.usage) { $usage = $obj.message.usage; $model = $obj.message.model }
        elseif ($obj.usage) { $usage = $obj.usage; $model = $obj.model }
        if (-not $usage) { continue }
        $usageLines++
        $proj = $null
        if ($obj.cwd) { $proj = Get-ProjectFor $obj.cwd }
        if (-not $proj) { $proj = Get-ProjectFor $line }
        if (-not $proj) { $proj = $fileProj }
        if (-not $proj) { $proj = "YaE" }   # anything unmatched rolls into Everything
        $ts = $null
        if ($obj.timestamp) { try { $ts = [datetime]$obj.timestamp } catch { $ts = $null } }
        if (-not $ts) { $ts = $f.LastWriteTime }
        $day = Get-CentralDay $ts
        Add-Usage $proj $day $usage $model
      }
      $Files[$key] = @{ length = $f.Length; processed = $newProcessed; project = $fileProj }
    } finally {
      $fs.Dispose()
    }
  }
}
Write-Host "Scanned $scannedFiles changed file(s), $newLines new line(s), $usageLines usage record(s)." -ForegroundColor Green

# ----- Build usage.json ----------------------------------------------------
$cutoff = (Get-Date).Date.AddDays(-60)
$projects = [ordered]@{}
foreach ($proj in ($Agg.Keys | Sort-Object)) {
  $allTime = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; costUSD = [double]0 }
  $daily = @()
  foreach ($day in ($Agg[$proj].Keys | Sort-Object)) {
    $b = $Agg[$proj][$day]
    $allTime.input += $b.input; $allTime.output += $b.output
    $allTime.cacheRead += $b.cacheRead; $allTime.cacheWrite += $b.cacheWrite
    $allTime.costUSD += $b.cost
    if ([datetime]$day -ge $cutoff) {
      $daily += [ordered]@{ d = $day; input = $b.input; output = $b.output; cacheRead = $b.cacheRead; cacheWrite = $b.cacheWrite; costUSD = [math]::Round($b.cost, 4) }
    }
  }
  $allTime.costUSD = [math]::Round($allTime.costUSD, 2)
  $sessions = @($Files.Keys | Where-Object { $Files[$_].project -eq $proj }).Count
  $projects[$proj] = [ordered]@{ allTime = $allTime; sessions = $sessions; daily = $daily }
}
$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  pricingVersion = $PRICING_VERSION
  pricingNote = "Anthropic published API rates as of $PRICING_VERSION; rate changes apply forward only (costs freeze into history at scan time)"
  projects = $projects
}

function Write-ValidatedJson([string]$path, $obj) {
  $json = ($obj | ConvertTo-Json -Depth 10) -replace "`r`n", "`n"
  if (-not $json.EndsWith("`n")) { $json += "`n" }
  $tmp = "$path.tmp"
  [System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))
  $null = (Get-Content -Raw $tmp | ConvertFrom-Json)   # must parse before it may replace the live file
  Move-Item -Force $tmp $path
  $back = [System.IO.File]::ReadAllText($path)
  if ($back.Contains([char]0)) { throw "NUL bytes in $path after write" }
  $null = ($back | ConvertFrom-Json)                   # verify-before-done: re-parse the fresh read
}

Write-ValidatedJson $OutPath $payload
Write-Host "Wrote $OutPath ($([math]::Round((Get-Item $OutPath).Length / 1kb, 1)) KB)." -ForegroundColor Green
foreach ($proj in $projects.Keys) {
  $a = $projects[$proj].allTime
  Write-Host ("  {0,-14} {1,12:n0} in / {2,12:n0} out  ~ `${3,9:n2}" -f $proj, $a.input, $a.output, $a.costUSD) -ForegroundColor DarkGray
}

# ----- Save state ----------------------------------------------------------
$flat = @()
foreach ($proj in $Agg.Keys) {
  foreach ($day in $Agg[$proj].Keys) {
    $b = $Agg[$proj][$day]
    $flat += [ordered]@{ p = $proj; d = $day; input = $b.input; output = $b.output; cacheRead = $b.cacheRead; cacheWrite = $b.cacheWrite; cost = $b.cost }
  }
}
Write-ValidatedJson $StatePath ([ordered]@{ pricingVersion = $PRICING_VERSION; files = $Files; agg = $flat })

# ----- Commit + push -------------------------------------------------------
if ($NoPush) { Write-Host "NoPush set; usage.json updated locally only." -ForegroundColor DarkGray; exit 0 }
# git writes normal progress to stderr; under ErrorActionPreference=Stop the
# 2>&1 redirect promotes that into a terminating NativeCommandError even on a
# successful push. Relax EAP for the native git calls below.
$ErrorActionPreference = "Continue"
foreach ($lockName in @("index.lock", "HEAD.lock")) {
  $lock = ".git\$lockName"
  if (Test-Path $lock) { Remove-Item -Force $lock -ErrorAction SilentlyContinue }
}
& git add dashboard/data/usage.json 2>&1 | Out-Null
$staged = git diff --cached --name-only 2>$null
if ([string]::IsNullOrWhiteSpace($staged)) { Write-Host "Nothing changed; no push." -ForegroundColor DarkGray; exit 0 }
& git commit -m "work: usage refresh" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "WARN: commit failed; staged only." -ForegroundColor Yellow; exit 0 }
$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) { $branch = "main" }
& git push origin $branch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "WARN: push failed; committed locally." -ForegroundColor Yellow; exit 0 }
Write-Host "Pushed usage refresh; dashboard updates in ~30s." -ForegroundColor Green
