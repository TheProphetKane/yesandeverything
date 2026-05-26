# bar-raise-constellation.ps1 - scheduled weekly constellation bar-raise.
#
# Windows Task Scheduler invokes this on Mondays at 07:00 (after the six
# per-project Monday runs at 06:00-06:25 have completed). It calls the Claude
# Code CLI with the constellation prompt, which fires the bar-raise skill
# orchestrator at orchestrators/constellation.md across the whole portfolio.
#
# Output lands in:
#   - Six per-project X:\<Project>\docs\BAR_RAISE-YYYY-MM-DD.md files
#   - X:\YesAndEverything\docs\CONSTELLATION-YYYY-MM-DD.md
#   - X:\YesAndEverything\status\data\constellation.json
#   - Six updated X:\YesAndEverything\status\data\<project>.json files
#   - X:\YesAndEverything\scripts\schedule\logs\bar-raise-constellation-YYYY-MM-DD.log

$ErrorActionPreference = "Continue"
$ScriptDir = $PSScriptRoot
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$Today = Get-Date -Format "yyyy-MM-dd"
$LogPath = Join-Path $LogDir "bar-raise-constellation-$Today.log"

$ClaudeBin = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $ClaudeBin) {
  "$(Get-Date -Format o) ERROR: claude CLI not found on PATH. Aborting." | Tee-Object -FilePath $LogPath -Append
  exit 1
}

$Prompt = "constellation review"
$InvokeArgs = @("--print", $Prompt)

"$(Get-Date -Format o) START bar-raise-constellation" | Tee-Object -FilePath $LogPath -Append
"$(Get-Date -Format o) ClaudeBin: $ClaudeBin" | Tee-Object -FilePath $LogPath -Append

# Run from YaE root so the constellation orchestrator's relative writes
# (docs/CONSTELLATION-*.md, status/data/constellation.json) land in the
# right place.
Push-Location "X:\YesAndEverything"
try {
  & $ClaudeBin @InvokeArgs 2>&1 | Tee-Object -FilePath $LogPath -Append
  $rc = $LASTEXITCODE
} finally {
  Pop-Location
}

"$(Get-Date -Format o) END bar-raise-constellation exit=$rc" | Tee-Object -FilePath $LogPath -Append
exit $rc
