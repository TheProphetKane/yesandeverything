<#
release-all.ps1 - run every project's release.ps1 in sequence.

One orchestrator over the per-project release scripts. Each project keeps owning
its own bump, commit, push, and publish; this only walks them in order, clears
any stale git lock first, keeps going when one fails, and prints a summary at
the end. No prompts.

Order: leaf projects first, the YaE hub last, so the hub release captures any
landing-page or status-JSON changes the others mirror in.

Per-project release.ps1 parameter shapes differ, so args are set per project:
  HBH / BR / YaC / Scheduler / YaE  auto-detect, take no message
  Apothecary                        builds a message from the tree if none given
  Budget                            a bump needs a real message, else -Bump none

Usage:
  .\scripts\release-all.ps1
  .\scripts\release-all.ps1 -Message "cross-project maintenance pass"
  .\scripts\release-all.ps1 -Only HBH,YaC
  .\scripts\release-all.ps1 -DryRun
#>
param(
  [string]$Message = "",
  [string[]]$Only,
  [switch]$DryRun
)

$ErrorActionPreference = "Continue"

$projects = @(
  @{ Key = "HBH"; Name = "Here Be Hordes";  Path = "X:\HereBeHordes" }
  @{ Key = "BR";  Name = "Brackish Rising"; Path = "X:\BrackishRising" }
  @{ Key = "YaC"; Name = "Yes& Chains";     Path = "X:\YesAndChains" }
  @{ Key = "YaB"; Name = "Yes& Budget";     Path = "X:\YesAndBudget" }
  @{ Key = "YaA"; Name = "Yes& Apothecary"; Path = "X:\YesAndApothecary" }
  @{ Key = "YaS"; Name = "Scheduler";       Path = "X:\YesAndScheduler" }
  @{ Key = "YaE"; Name = "Yes& Everything"; Path = "X:\YesAndEverything" }
)

function Get-ReleaseArgs([string]$key, [string]$msg) {
  switch ($key) {
    "YaA"   { if ($msg) { return @("-Message", $msg) } else { return @() } }
    "YaB"   { if ($msg) { return @("-Message", $msg) } else { return @("-Bump", "none") } }
    default { return @() }
  }
}

# Pull the real reason out of a failed project's captured output. Prefers the
# last line that looks like an error; falls back to the last non-empty line.
function Get-FailReason($cap, $code) {
  $rx = '(?i)(pre-flight|fail|error|not recognized|cannot|unable|abort|denied|rejected|exception|missing|fatal|not found|conflict|no such|is not)'
  for ($i = $cap.Count - 1; $i -ge 0; $i--) { $t = ([string]$cap[$i]).Trim(); if ($t -and $t -match $rx) { return $t } }
  for ($i = $cap.Count - 1; $i -ge 0; $i--) { $t = ([string]$cap[$i]).Trim(); if ($t) { return $t } }
  return "exit $code (no diagnostic text captured)"
}
# Last few meaningful lines, for the per-failure detail block.
function Get-FailTail($cap) {
  $lines = @($cap | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  if ($lines.Count -eq 0) { return "" }
  $start = [Math]::Max(0, $lines.Count - 8)
  return ($lines[$start..($lines.Count - 1)] -join "`n")
}

$results = @()

foreach ($p in $projects) {
  if ($Only -and ($Only -notcontains $p.Key)) { continue }

  $script = Join-Path $p.Path "scripts\release.ps1"
  $line = [ordered]@{ Project = $p.Name; Key = $p.Key; Status = ""; Seconds = 0; Note = "" }

  if (-not (Test-Path $p.Path)) {
    $line.Status = "skipped"; $line.Note = "repo not found"
    $results += [pscustomobject]$line; continue
  }
  if (-not (Test-Path $script)) {
    $line.Status = "skipped"; $line.Note = "no scripts\release.ps1"
    $results += [pscustomobject]$line; continue
  }

  $relArgs = Get-ReleaseArgs $p.Key $Message

  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor DarkCyan
  Write-Host (">> {0}  ({1})" -f $p.Name, $p.Path) -ForegroundColor Cyan
  Write-Host ("   release.ps1 {0}" -f ($relArgs -join " ")) -ForegroundColor DarkGray
  Write-Host ("=" * 72) -ForegroundColor DarkCyan

  if ($DryRun) {
    $line.Status = "dry-run"; $line.Note = ("release.ps1 " + ($relArgs -join " ")).Trim()
    $results += [pscustomobject]$line; continue
  }

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  Push-Location $p.Path
  $cap = New-Object System.Collections.Generic.List[string]
  $line.Detail = ""
  try {
    foreach ($lock in @(".git\index.lock", ".git\HEAD.lock")) {
      if (Test-Path $lock) {
        Remove-Item -Force $lock -ErrorAction SilentlyContinue
        Write-Host ("   cleared stale {0}" -f $lock) -ForegroundColor Yellow
      }
    }

    $global:LASTEXITCODE = 0
    # Merge ALL streams (incl. Write-Host via the information stream, where the
    # per-project pre-flight reasons print) so the failure cause is recoverable,
    # while still echoing each line live.
    & $script @relArgs *>&1 | ForEach-Object {
      $text = if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { [string]$_ }
      $cap.Add($text); Write-Host $text
    }
    $code = $LASTEXITCODE

    if ($code -and $code -ne 0) {
      $line.Status = "failed"; $line.Note = Get-FailReason $cap $code; $line.Detail = Get-FailTail $cap
    }
    else { $line.Status = "ok" }
  }
  catch {
    $cap.Add($_.Exception.Message)
    $line.Status = "failed"; $line.Note = Get-FailReason $cap 1; $line.Detail = Get-FailTail $cap
  }
  finally {
    Pop-Location
    $sw.Stop(); $line.Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 1)
  }

  $results += [pscustomobject]$line
}

Write-Host ""
Write-Host ("=" * 72) -ForegroundColor DarkCyan
Write-Host "RELEASE-ALL SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 72) -ForegroundColor DarkCyan
$results | Format-Table Project, Key, Status, Seconds, Note -AutoSize -Wrap

$failed = @($results | Where-Object { $_.Status -eq "failed" })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "WHY EACH FAILURE HAPPENED" -ForegroundColor Red
  Write-Host ("-" * 72) -ForegroundColor DarkGray
  foreach ($f in $failed) {
    Write-Host ("{0} ({1}) - {2}s" -f $f.Project, $f.Key, $f.Seconds) -ForegroundColor Red
    Write-Host ("  reason: {0}" -f $f.Note) -ForegroundColor Yellow
    if ($f.Detail) {
      Write-Host "  last output:" -ForegroundColor DarkGray
      foreach ($dl in ($f.Detail -split "`n")) { Write-Host ("    | {0}" -f $dl) -ForegroundColor DarkGray }
    }
    Write-Host ""
  }
  Write-Host ("{0} project(s) failed; the rest still ran." -f $failed.Count) -ForegroundColor Red
  exit 1
}
Write-Host "All requested releases finished." -ForegroundColor Green
