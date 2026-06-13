# migrate-ids-to-words.ps1
# Finishes the portfolio id-to-words migration: every dashboard/status data key
# and filename becomes the project's single word, no acronyms anywhere.
# Idempotent - safe to re-run. Native (runs on the real disk), so no FUSE truncation.
#
#   cd X:\YesAndEverything
#   .\scripts\migrate-ids-to-words.ps1
#   .\scripts\release.ps1      # ships the YaE side (dashboard + renamed status files)
#
$ErrorActionPreference = "Continue"

function Replace-InFile([string]$path, [hashtable]$map) {
  if (-not (Test-Path $path)) { Write-Host "skip (missing): $path" -ForegroundColor DarkGray; return }
  $c = [IO.File]::ReadAllText($path); $orig = $c
  foreach ($k in $map.Keys) { $c = $c.Replace($k, $map[$k]) }
  if ($c -ne $orig) { [IO.File]::WriteAllText($path, $c); Write-Host "patched: $path" -ForegroundColor Green }
  else { Write-Host "ok (already words): $path" -ForegroundColor DarkGray }
}

# ---- 1. Per-project status writers: filename + internal project field -> word ----
$writers = @(
  @{ p="X:\HereBeHordes\scripts\write-dashboard-status.ps1";     code="HBH";  word="Hordes" }
  @{ p="X:\BrackishRising\scripts\write-dashboard-status.ps1";   code="BR";   word="Rising" }
  @{ p="X:\YesAndChains\scripts\write-dashboard-status.ps1";     code="YaC";  word="Chains" }
  @{ p="X:\YesAndScheduler\scripts\write-dashboard-status.ps1";  code="YaS";  word="Scheduler" }
  @{ p="X:\YesAndApothecary\scripts\write-dashboard-status.ps1"; code="YaA";  word="Apothecary" }
  @{ p="X:\YesAndBudget\scripts\write-dashboard-status.ps1";     code="YaB";  word="Budget" }
  @{ p="X:\YesAndAgents\scripts\write-dashboard-status.ps1";     code="YaAg"; word="Agents" }
  @{ p="X:\YesAndEverything\scripts\write-dashboard-status.ps1"; code="YaE";  word="Everything" }
)
foreach ($w in $writers) {
  Replace-InFile $w.p @{ "$($w.code).json" = "$($w.word).json"; "project = `"$($w.code)`"" = "project = `"$($w.word)`"" }
}

# ---- 2. YaE-side bar-raise / audit writers + YaC release: filename -> word ----
Replace-InFile "X:\YesAndEverything\scripts\schedule\bar-raise-hbh.ps1" @{ "HBH.json"="Hordes.json" }
Replace-InFile "X:\YesAndEverything\scripts\schedule\bar-raise-br.ps1"  @{ "BR.json"="Rising.json" }
Replace-InFile "X:\YesAndEverything\scripts\schedule\bar-raise-yac.ps1" @{ "YaC.json"="Chains.json" }
Replace-InFile "X:\YesAndEverything\scripts\schedule\bar-raise-yaa.ps1" @{ "YaA.json"="Apothecary.json" }
Replace-InFile "X:\YesAndEverything\scripts\schedule\bar-raise-yab.ps1" @{ "YaB.json"="Budget.json" }
Replace-InFile "X:\YesAndEverything\scripts\schedule\audit-yab.ps1"     @{ "YaB.json"="Budget.json" }
Replace-InFile "X:\YesAndChains\scripts\release.ps1"                    @{ "YaC.json"="Chains.json" }

# ---- 3. Rename the status data files (git mv) + fix their internal project field ----
$renames = @(
  @{ old="HBH";  new="Hordes" }, @{ old="BR"; new="Rising" }, @{ old="yac"; new="Chains" },
  @{ old="YaS";  new="Scheduler" }, @{ old="yaa"; new="Apothecary" }, @{ old="YaB"; new="Budget" },
  @{ old="YaAg"; new="Agents" }, @{ old="YaE"; new="Everything" }
)
Push-Location X:\YesAndEverything
Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue
foreach ($r in $renames) {
  $oldRel = "status/data/$($r.old).json"; $newRel = "status/data/$($r.new).json"
  $oldAbs = "X:\YesAndEverything\$($oldRel -replace '/','\')"
  if (-not (Test-Path $oldAbs)) { Write-Host "skip rename (missing): $oldRel" -ForegroundColor DarkGray; continue }
  $j = [IO.File]::ReadAllText($oldAbs)
  $j = $j.Replace("`"project`":  `"$($r.old)`"", "`"project`":  `"$($r.new)`"").Replace("`"project`": `"$($r.old)`"", "`"project`": `"$($r.new)`"")
  [IO.File]::WriteAllText($oldAbs, $j)
  git mv -f -- $oldRel $newRel 2>$null
  if ($LASTEXITCODE -ne 0) { Move-Item -Force $oldAbs ("X:\YesAndEverything\" + ($newRel -replace '/','\')); git add -- $oldRel $newRel 2>$null }
  Write-Host "renamed: $oldRel -> $newRel" -ForegroundColor Green
}
Pop-Location

# ---- 4. Commit + push the 7 project repos (writer change only; leaves other work alone) ----
$projRepos = @(
  "X:\HereBeHordes","X:\BrackishRising","X:\YesAndChains","X:\YesAndScheduler",
  "X:\YesAndApothecary","X:\YesAndBudget","X:\YesAndAgents"
)
foreach ($r in $projRepos) {
  Remove-Item -Force "$r\.git\index.lock" -ErrorAction SilentlyContinue
  git -C $r add -- scripts/write-dashboard-status.ps1 scripts/release.ps1 2>$null
  git -C $r commit -m "chore: id-to-words - status JSON uses the project word, no acronyms" 2>$null
  if ($LASTEXITCODE -eq 0) { git -C $r push 2>$null; Write-Host "committed+pushed: $r" -ForegroundColor Green }
  else { Write-Host "nothing to commit: $r" -ForegroundColor DarkGray }
}

Write-Host "`nWriters, bar-raise scripts, and status files migrated. Now run:  .\scripts\release.ps1  to ship the YaE side (dashboard + renamed status files)." -ForegroundColor Cyan
