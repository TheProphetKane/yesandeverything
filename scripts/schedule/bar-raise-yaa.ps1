# bar-raise-yaa.ps1 - scheduled per-project bar-raise for YesAndApothecary.
#
# Windows Task Scheduler invokes this script daily. It calls the Claude Code
# CLI with the per-project bar-raise prompt, which fires the bar-raise skill
# orchestrator at orchestrators/per_project.md against YesAndApothecary.
#
# Output lands in:
#   - X:\YesAndApothecary\docs\BAR_RAISE-YYYY-MM-DD.md
#   - X:\YesAndEverything\status\data\YaA.json (barRaise block updated)
#   - X:\YesAndEverything\scripts\schedule\logs\bar-raise-yaa-YYYY-MM-DD.log
#
# The skill itself commits + pushes the YaE-side JSON change. This shim does
# not touch git directly.
#
# Phase 5 contract per X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md.
#
# First-run verification:
#   1. Confirm `claude` is on PATH. If not, edit the $ClaudeBin path below.
#   2. Confirm `claude --print` is the right non-interactive flag for the
#      installed Claude Code build. If the flag has changed (e.g. `--prompt`
#      or `-p` or `--non-interactive`), edit $InvokeArgs below.
#   3. Run this script manually once and verify the log + the dashboard JSON
#      both update.

$ErrorActionPreference = "Continue"
$ScriptDir = $PSScriptRoot
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$Today = Get-Date -Format "yyyy-MM-dd"
$LogPath = Join-Path $LogDir "bar-raise-yaa-$Today.log"

# ----- Claude Code invocation ------------------------------------------
# If `claude` is on PATH, this resolves it. If not, replace with an absolute
# path (e.g. "C:\Users\Kane\AppData\Local\Programs\claude\claude.exe").
$ClaudeBin = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $ClaudeBin) {
  "$(Get-Date -Format o) ERROR: claude CLI not found on PATH. Aborting." | Tee-Object -FilePath $LogPath -Append
  exit 1
}

# Trigger phrase. The bar-raise skill triggers on this; the orchestrator at
# orchestrators/per_project.md runs against YesAndApothecary.
$Prompt = "bar-raise YaA"

# Non-interactive flag. `--print` is the documented Claude Code flag at the
# time of buildout; if a future CC version renames it, update here.
$InvokeArgs = @("--print", $Prompt)

"$(Get-Date -Format o) START bar-raise-yaa" | Tee-Object -FilePath $LogPath -Append
"$(Get-Date -Format o) ClaudeBin: $ClaudeBin" | Tee-Object -FilePath $LogPath -Append
"$(Get-Date -Format o) Args: $($InvokeArgs -join ' ')" | Tee-Object -FilePath $LogPath -Append

# Run from the project root so any relative paths the skill writes resolve sensibly.
Push-Location "X:\YesAndApothecary"
try {
  & $ClaudeBin @InvokeArgs 2>&1 | Tee-Object -FilePath $LogPath -Append
  $rc = $LASTEXITCODE
} finally {
  Pop-Location
}

"$(Get-Date -Format o) END bar-raise-yaa exit=$rc" | Tee-Object -FilePath $LogPath -Append

# Non-fatal exit: Task Scheduler treats non-zero as failure. The bar-raise
# skill itself is responsible for "soft" failures (missing handler, JSON
# write retry exhaustion, etc.) and surfaces them in the log. Hard failures
# (CLI not found, claude crashed) exit non-zero so the dashboard / Discord
# can surface the schedule break.
exit $rc
