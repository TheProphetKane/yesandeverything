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

# A non-zero exit alone is NOT a failure: release scripts leak sub-command exit
# codes (git diff, findstr, test runners) on a clean run. Decide from the output.
# Returns the strongest genuine-failure line, or $null if nothing looks like one.
function Get-StrongFail($cap) {
  $strong = '(?i)(\bFAILED\b|fatal:|error:|\bException\b|not recognized|is not valid|ParserError|\brejected\b|cannot find path|unable to|index\.lock)'
  $noise  = '(?i)(no conflict markers|integrity ok|^pass\b|\.test\.|tests?:)'
  for ($i = $cap.Count - 1; $i -ge 0; $i--) {
    $t = ([string]$cap[$i]).Trim()
    if ($t -and ($t -match $strong) -and ($t -notmatch $noise)) { return $t }
  }
  return $null
}
# Did the release clearly complete its work despite a leaked non-zero exit?
function Test-ReleaseSucceeded($cap) {
  $blob = ($cap -join "`n")
  return ($blob -match '(?i)(Release complete|Pushed to origin|pushed to|to https?://\S+\.git|everything up-to-date|nothing (new )?to commit|set up to track)')
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
  try {
    foreach ($lock in @(".git\index.lock", ".git\HEAD.lock")) {
      if (Test-Path $lock) {
        Remove-Item -Force $lock -ErrorAction SilentlyContinue
        Write-Host ("   cleared stale {0}" -f $lock) -ForegroundColor Yellow
      }
    }

    $global:LASTEXITCODE = 0
    # Capture all streams (incl. Write-Host) by ASSIGNMENT so the child's true
    # exit code survives, then echo. Pass/fail is decided from the OUTPUT, not the
    # raw exit code - release scripts leak sub-command codes on a clean run.
    $capRaw = & $script @relArgs *>&1
    $code = $LASTEXITCODE
    foreach ($o in $capRaw) {
      $text = if ($o -is [System.Management.Automation.ErrorRecord]) { $o.ToString() } else { [string]$o }
      $cap.Add($text); Write-Host $text
    }

    $hard = Get-StrongFail $cap
    if ($hard) {
      if ($hard -match '(?i)(already shipped|nothing (new )?to commit|up-to-date|no changes)') { $line.Status = "skipped"; $line.Note = $hard }
      else { $line.Status = "failed"; $line.Note = $hard }
    }
    elseif ($code -and $code -ne 0 -and -not (Test-ReleaseSucceeded $cap)) {
      $line.Status = "failed"; $line.Note = "exit $code (no error text; check this project's output above)"
    }
    else { $line.Status = "ok" }
  }
  catch {
    $cap.Add($_.Exception.Message)
    $hard = Get-StrongFail $cap
    $line.Status = "failed"; $line.Note = if ($hard) { $hard } else { $_.Exception.Message }
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

$skipped = @($results | Where-Object { $_.Status -eq "skipped" })
if ($skipped.Count -gt 0) { Write-Host ("{0} skipped - nothing new to ship." -f $skipped.Count) -ForegroundColor DarkGray }

$failed = @($results | Where-Object { $_.Status -eq "failed" })
if ($failed.Count -gt 0) {
  Write-Host ("{0} failed - the reason for each is in the Note column above." -f $failed.Count) -ForegroundColor Red
  exit 1
}
Write-Host "All requested releases finished." -ForegroundColor Green
