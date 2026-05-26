# unregister-all.ps1 - tear down all bar-raise Task Scheduler entries.
#
# Idempotent: missing tasks are silently skipped.

$ErrorActionPreference = "Continue"

$tasks = @(
  "bar-raise-br-daily",
  "bar-raise-hbh-daily",
  "bar-raise-yac-daily",
  "bar-raise-scheduler-daily",
  "bar-raise-yaa-daily",
  "bar-raise-yab-daily",
  "bar-raise-constellation-weekly"
)

foreach ($t in $tasks) {
  $existing = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $t -Confirm:$false
    Write-Host "Unregistered: $t" -ForegroundColor Yellow
  } else {
    Write-Host "Not registered (skipping): $t" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "===== Bar-raise tasks torn down =====" -ForegroundColor Cyan
