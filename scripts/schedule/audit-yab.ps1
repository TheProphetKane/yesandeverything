## audit-yab.ps1 - scheduled canonical-audit run for YesAndBudget.
##
## Windows Task Scheduler invokes this script daily. It calls the Claude
## Code CLI with the project-canonical-audit trigger phrase, which writes
## docs/CANONICAL_AUDIT-YYYY-MM-DD.md and updates
## X:\YesAndEverything\status\data\YaB.json's audit block.
##
## Companion to bar-raise-yab.ps1: same wrapper shape, different skill.
## The bar-raise is the structured deep review; the canonical-audit is the
## narrower doc-vs-code drift sweep.
##
## First-run verification:
##   1. Confirm `claude` is on PATH.
##   2. Run this script manually once, verify the log and the audit md both
##      land.



# --- enforce repo-root cwd (cross-project requirement) ---
$__here = $PSScriptRoot
$__repoRoot = if ((Split-Path -Leaf $__here) -eq 'scripts') { Split-Path -Parent $__here } else { $__here }
Set-Location -LiteralPath $__repoRoot
$ErrorActionPreference = "Continue"
$ScriptDir = $PSScriptRoot
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$Today = Get-Date -Format "yyyy-MM-dd"
$LogPath = Join-Path $LogDir "audit-yab-$Today.log"

$ClaudeBin = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $ClaudeBin) {
  "$(Get-Date -Format o) ERROR: claude CLI not found on PATH. Aborting." | Tee-Object -FilePath $LogPath -Append
  exit 1
}

$Prompt = "project-canonical-audit YaB"
$InvokeArgs = @("--print", $Prompt)

"$(Get-Date -Format o) START audit-yab" | Tee-Object -FilePath $LogPath -Append
"$(Get-Date -Format o) ClaudeBin: $ClaudeBin" | Tee-Object -FilePath $LogPath -Append
"$(Get-Date -Format o) Args: $($InvokeArgs -join ' ')" | Tee-Object -FilePath $LogPath -Append

Push-Location "X:\YesAndBudget"
try {
  & $ClaudeBin @InvokeArgs 2>&1 | Tee-Object -FilePath $LogPath -Append
  $rc = $LASTEXITCODE
} finally {
  Pop-Location
}

"$(Get-Date -Format o) END audit-yab exit=$rc" | Tee-Object -FilePath $LogPath -Append
exit $rc
