# propagate-git-guard.ps1 - backfill scripts/git-guard.ps1 across every repo and
# wire it into the git-writing scripts. Mirrors enforce-self-cd.ps1: idempotent,
# DRY-RUN by default, writes .bak, validates each file parses before saving.
#
#   .\scripts\propagate-git-guard.ps1            # dry run: show what would change
#   .\scripts\propagate-git-guard.ps1 -Apply     # write the changes
#   .\scripts\propagate-git-guard.ps1 -Apply -Repos X:\YesAndBudget,X:\Scheduler
#
# What it does per repo:
#   1. Copies the canonical scripts\git-guard.ps1 into the repo's scripts\.
#   2. In each git-writing script (release / push-to-github / write-dashboard-status
#      / discord-notify and any *.ps1 that runs git add|commit|push):
#        - dot-sources git-guard.ps1 after the first Set-Location
#        - comments out blind `Remove-Item ... .lock` clears (the race)
#        - inserts Assert-GitSafe right before the first git write (cwd is the
#          target repo at that point, so the guard targets the right repo)
#        - inserts Confirm-GitIntact after the last git push
#   3. Skips any script already referencing git-guard.ps1 (idempotent).

param(
  [switch]$Apply,
  [string[]]$Repos = @(),
  [string]$Root = ""
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repoRoot = if ((Split-Path -Leaf $here) -eq 'scripts') { Split-Path -Parent $here } else { $here }
Set-Location -LiteralPath $repoRoot

$canonical = Join-Path $repoRoot "scripts\git-guard.ps1"
if (-not (Test-Path $canonical)) { Write-Host "ERROR: canonical scripts\git-guard.ps1 not found in $repoRoot." -ForegroundColor Red; exit 1 }
if (-not $Root) { $Root = Split-Path -Parent $repoRoot }

if ($Repos.Count -eq 0) {
  $Repos = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue | Where-Object {
    $s = Join-Path $_.FullName "scripts"
    (Test-Path (Join-Path $s "release.ps1")) -or (Test-Path (Join-Path $s "push-to-github.ps1")) -or (Test-Path (Join-Path $s "write-dashboard-status.ps1"))
  } | Select-Object -ExpandProperty FullName
}

Write-Host ("Mode: " + $(if ($Apply) { "APPLY" } else { "DRY RUN (use -Apply to write)" })) -ForegroundColor Cyan
Write-Host "Repos: $($Repos -join ', ')`n"

function Test-Parses([string]$text) {
  $errs = $null
  [System.Management.Automation.Language.Parser]::ParseInput($text, [ref]$null, [ref]$errs) | Out-Null
  return ($errs.Count -eq 0)
}

function Patch-Script([string]$path) {
  $orig = Get-Content -Raw $path
  if ($orig -match 'git-guard\.ps1') { return @{ changed=$false; note="already guarded" } }
  # only touch scripts that actually run git writes
  if ($orig -notmatch '(?m)^\s*(&\s*)?git\s+(add|commit|push)\b') { return @{ changed=$false; note="no git writes" } }

  $t = $orig
  # 1. dot-source after first Set-Location line
  $t = [regex]::Replace($t, '(?m)^(.*Set-Location[^\r\n]*)$',
       "`$1`n. (Join-Path `$PSScriptRoot ""git-guard.ps1"")", 1)
  # 2. comment out blind lock clears
  $t = [regex]::Replace($t, '(?m)^(\s*)(Remove-Item[^\r\n]*\.lock[^\r\n]*)$',
       '$1# [git-guard] superseded by Assert-GitSafe: $2')
  # 3. Assert-GitSafe before the first git write
  $t = [regex]::Replace($t, '(?m)^(\s*)((?:&\s*)?git\s+(?:add|commit|push)\b[^\r\n]*)$',
       "`$1Assert-GitSafe`n`$1`$2", 1)
  # 4. Confirm-GitIntact after the last git push
  $pushes = [regex]::Matches($t, '(?m)^(\s*)((?:&\s*)?git\s+push\b[^\r\n]*)$')
  if ($pushes.Count -gt 0) {
    $last = $pushes[$pushes.Count-1]
    $indent = $last.Groups[1].Value
    $t = $t.Substring(0,$last.Index+$last.Length) + "`n$indent" + "Confirm-GitIntact" + $t.Substring($last.Index+$last.Length)
  }

  if (-not (Test-Parses $t)) { return @{ changed=$false; note="PARSE FAIL after patch - left untouched" } }
  if ($script:Apply) {
    Copy-Item $path "$path.bak" -Force
    [System.IO.File]::WriteAllText($path, ($t -replace "`r`n","`n"), [System.Text.UTF8Encoding]::new($false))
  }
  return @{ changed=$true; note="patched" }
}

$Apply = $Apply.IsPresent
foreach ($repo in $Repos) {
  Write-Host "== $repo ==" -ForegroundColor Green
  $sd = Join-Path $repo "scripts"
  if (-not (Test-Path $sd)) { Write-Host "  no scripts\ dir, skipping"; continue }
  $dest = Join-Path $sd "git-guard.ps1"
  if ($repo -ne $repoRoot) {
    if ($Apply) { Copy-Item $canonical $dest -Force; Write-Host "  + git-guard.ps1 copied" -ForegroundColor DarkYellow }
    else { Write-Host "  would copy git-guard.ps1" }
  }
  foreach ($f in Get-ChildItem $sd -Filter *.ps1 -ErrorAction SilentlyContinue) {
    if ($f.Name -eq "git-guard.ps1" -or $f.Name -eq "propagate-git-guard.ps1") { continue }
    $r = Patch-Script $f.FullName
    $tag = if ($r.changed) { "[would patch]" } else { "[skip]" }
    if ($r.changed -or $r.note -notin @("no git writes")) { Write-Host "  $tag $($f.Name) - $($r.note)" }
  }
}
Write-Host "`nDone. Review the .bak diffs, then commit each repo through its own release flow." -ForegroundColor Cyan
