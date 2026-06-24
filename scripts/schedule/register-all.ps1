# register-all.ps1 - one-shot Task Scheduler installer for the bar-raise pipeline.
#
# Registers 8 tasks (6 per-project daily + 1 per-project twice-weekly + 1 constellation weekly):
#   - bar-raise-br-daily                06:00 daily
#   - bar-raise-hbh-daily               06:05 daily
#   - bar-raise-yac-daily               06:10 daily
#   - bar-raise-scheduler-twice-weekly  06:15 Mon,Thu (app is feature-complete + parked)
#   - bar-raise-yaa-daily               06:20 daily
#   - bar-raise-yab-daily               06:25 daily
#   - bar-raise-yaag-daily              06:30 daily
#   - bar-raise-constellation-weekly    Monday 07:00
#
# Staggering avoids YaE-side git push collisions. All tasks use:
#   - StartWhenAvailable so missed runs catch up on next wake.
#   - WakeToRun = false (do NOT wake the laptop just for the bar-raise).
#   - Run only if network is available.
#
# Run elevated (Task Scheduler registration requires admin or per-user setup).



# --- enforce repo-root cwd (cross-project requirement) ---
$__here = $PSScriptRoot
$__repoRoot = if ((Split-Path -Leaf $__here) -eq 'scripts') { Split-Path -Parent $__here } else { $__here }
Set-Location -LiteralPath $__repoRoot
$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

function Register-BarRaiseTask {
  param(
    [string]$TaskName,
    [string]$ScriptPath,
    [datetime]$DailyTime,
    [string[]]$DaysOfWeek = $null  # if set, register as a weekly trigger on these days
  )

  # Tear down any existing registration so re-running this is idempotent.
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

  if ($DaysOfWeek) {
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DaysOfWeek -At $DailyTime
  } else {
    $trigger = New-ScheduledTaskTrigger -Daily -At $DailyTime
  }

  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RunOnlyIfNetworkAvailable

  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Bar-raise periodic review. See X:\YesAndEverything\docs\BAR_RAISE_ROADMAP.md Phase 5." `
    | Out-Null

  Write-Host "Registered: $TaskName ($($DailyTime.ToString('HH:mm'))$(if ($DaysOfWeek) { " $($DaysOfWeek -join ',')" } else { " daily" }))" -ForegroundColor Green
}

# Drop any orphaned legacy registration from before the twice-weekly rename.
Unregister-ScheduledTask -TaskName "bar-raise-scheduler-daily" -Confirm:$false -ErrorAction SilentlyContinue

# Stagger 5 minutes apart starting 06:00. Order picked to put the heaviest
# projects (BR, HBH) first so the YaE-side commits queue cleanly.
$base = [datetime]"06:00"

Register-BarRaiseTask "bar-raise-br-daily"        (Join-Path $ScriptDir "bar-raise-br.ps1")        $base.AddMinutes(0)
Register-BarRaiseTask "bar-raise-hbh-daily"       (Join-Path $ScriptDir "bar-raise-hbh.ps1")       $base.AddMinutes(5)
Register-BarRaiseTask "bar-raise-yac-daily"       (Join-Path $ScriptDir "bar-raise-yac.ps1")       $base.AddMinutes(10)
# Scheduler is feature-complete and parked, so daily bar-raises waste tokens.
# Twice-weekly (Mon,Thu) per the Scheduler repo's .project-context.json cadence.
Register-BarRaiseTask "bar-raise-scheduler-twice-weekly" (Join-Path $ScriptDir "bar-raise-scheduler.ps1") $base.AddMinutes(15) @("Monday","Thursday")
Register-BarRaiseTask "bar-raise-yaa-daily"       (Join-Path $ScriptDir "bar-raise-yaa.ps1")       $base.AddMinutes(20)
Register-BarRaiseTask "bar-raise-yab-daily"       (Join-Path $ScriptDir "bar-raise-yab.ps1")       $base.AddMinutes(25)
Register-BarRaiseTask "bar-raise-yaag-daily"      (Join-Path $ScriptDir "bar-raise-yaag.ps1")      $base.AddMinutes(30)

# Constellation: Monday 07:00 (after the Monday per-project runs complete).
$constTime = [datetime]"07:00"
Register-BarRaiseTask "bar-raise-constellation-weekly" (Join-Path $ScriptDir "bar-raise-constellation.ps1") $constTime "Monday"

Write-Host ""
Write-Host "===== All 8 bar-raise tasks registered =====" -ForegroundColor Cyan
Write-Host "Check: Get-ScheduledTask | Where-Object { `$_.TaskName -like 'bar-raise-*' }"
Write-Host "Logs:  X:\YesAndEverything\scripts\schedule\logs\"
