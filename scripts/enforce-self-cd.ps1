# enforce-self-cd.ps1
# Cross-project requirement: every release/push/deploy script must cd to its own
# repo root before doing anything, so it works no matter what cwd it is run from.
#
# This patcher inserts a self-locate guard into every *.ps1 under each repo's
# scripts/ folder (and repo root). It is SAFE to run repeatedly:
#   - skips files that already self-locate
#   - inserts the guard in the correct spot relative to a script-level param() block
#   - re-parses each patched file and reverts it if the edit broke the syntax
#   - writes a .bak next to every file it changes
#
# Usage (from anywhere):
#   powershell -ExecutionPolicy Bypass -File X:\path\to\enforce-self-cd.ps1
#   add -WhatIf to preview without writing.

[CmdletBinding()]
param([switch]$WhatIf)

$ErrorActionPreference = 'Stop'
$MARKER = '# --- enforce repo-root cwd (cross-project requirement) ---'

$repos = @(
  'X:\YesAndScheduler','X:\YesAndChains','X:\YesAndApothecary','X:\YesAndBudget',
  'X:\HereBeHordes','X:\YesAndEverything','X:\BrackishRising'
)

function Get-Guard {
  # Guard adapts whether the script sits in <repo>\scripts\ or at the repo root.
  @"
$MARKER
`$__here = `$PSScriptRoot
`$__repoRoot = if ((Split-Path -Leaf `$__here) -eq 'scripts') { Split-Path -Parent `$__here } else { `$__here }
Set-Location -LiteralPath `$__repoRoot
"@
}

function Test-AlreadySelfLocating([string]$text) {
  if ($text -match [regex]::Escape($MARKER)) { return $true }
  # Heuristic: an existing Set-Location driven by PSScriptRoot/$here/$repoRoot in the first 40 lines.
  $head = ($text -split "`n" | Select-Object -First 40) -join "`n"
  return ($head -match 'Set-Location' -and $head -match '\$PSScriptRoot|\$here|\$repoRoot')
}

$patched = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]
$failed  = New-Object System.Collections.Generic.List[string]

foreach ($repo in $repos) {
  if (-not (Test-Path $repo)) { Write-Warning "missing repo: $repo"; continue }
  $files = @()
  $files += Get-ChildItem -Path $repo -Filter *.ps1 -File -ErrorAction SilentlyContinue
  $sd = Join-Path $repo 'scripts'
  if (Test-Path $sd) { $files += Get-ChildItem -Path $sd -Filter *.ps1 -File -Recurse -ErrorAction SilentlyContinue }

  foreach ($f in $files) {
    $path = $f.FullName
    $text = Get-Content -LiteralPath $path -Raw
    if (Test-AlreadySelfLocating $text) { $skipped.Add($path); continue }

    # Parse to find a script-level param() block (must insert AFTER it).
    $errors = $null; $tokens = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errors)
    if ($errors -and $errors.Count) { $failed.Add("$path (pre-existing parse errors, left untouched)"); continue }

    if ($ast.ParamBlock) {
      $insertAt = $ast.ParamBlock.Extent.EndOffset
    } elseif ($ast.EndBlock -and $ast.EndBlock.Statements.Count) {
      $insertAt = $ast.EndBlock.Statements[0].Extent.StartOffset   # before first real statement, after comments
    } else {
      $insertAt = $text.Length
    }

    $newText = $text.Substring(0, $insertAt) + "`r`n`r`n" + (Get-Guard) + "`r`n" + $text.Substring($insertAt)

    # Validate the patched text parses cleanly before committing it to disk.
    $perr = $null; $ptok = $null
    [void][System.Management.Automation.Language.Parser]::ParseInput($newText, [ref]$ptok, [ref]$perr)
    if ($perr -and $perr.Count) { $failed.Add("$path (patch would break parse, skipped)"); continue }

    if ($WhatIf) { $patched.Add("$path (WhatIf)"); continue }
    Copy-Item -LiteralPath $path -Destination "$path.bak" -Force
    Set-Content -LiteralPath $path -Value $newText -NoNewline -Encoding UTF8
    $patched.Add($path)
  }
}

Write-Host ""
Write-Host ("PATCHED ({0}):" -f $patched.Count) -ForegroundColor Green
$patched | ForEach-Object { Write-Host "  + $_" }
Write-Host ("ALREADY OK / SKIPPED ({0}):" -f $skipped.Count) -ForegroundColor DarkGray
$skipped | ForEach-Object { Write-Host "  = $_" }
if ($failed.Count) {
  Write-Host ("NEEDS A LOOK ({0}):" -f $failed.Count) -ForegroundColor Yellow
  $failed | ForEach-Object { Write-Host "  ! $_" }
}
Write-Host ""
Write-Host "Backups written as <script>.ps1.bak next to each patched file." -ForegroundColor DarkGray
Write-Host "Spot-check one, then commit each repo (its own release.ps1 will sweep it up)." -ForegroundColor DarkGray
