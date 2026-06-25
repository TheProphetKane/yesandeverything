<#
queue-edit.ps1 - single-flight, lockfile-guarded mutation of the work queue.

WHY: multiple drain instances were doing lock-free read-modify-write on
.work-queue.json and lost-updated / corrupted it. Every mutation MUST go through
this helper (or the matching lock in YaAg server.mjs) so writers serialize.

Protocol (shared with server.mjs): acquire .work-queue.lock by atomic
CreateNew; write pid|utc|host; break a stale lock after 30s; retry with backoff
up to 15s; do the read-modify-write; atomic tmp+parse+rename; release. Hold the
lock ONLY for the brief file mutation, never across a running prompt.

Usage:
  .\scripts\queue-edit.ps1 -Op get
  .\scripts\queue-edit.ps1 -Op add  -Json '<item-json>'
  .\scripts\queue-edit.ps1 -Op set  -Id <id> -Status done [-IncAttempts] [-ResultPath <p>] [-Notes "..."]
  .\scripts\queue-edit.ps1 -Op drop -Id <id>

Dot-source it (no -Op) to reuse Invoke-QueueMutation { param($q) ...; $q } for
arbitrary single-flight edits.
#>
param(
  [ValidateSet('get', 'add', 'set', 'drop')] [string]$Op,
  [string]$Id, [string]$Json, [string]$Status,
  [switch]$IncAttempts, [string]$ResultPath, [string]$Notes
)
$ErrorActionPreference = 'Stop'

$QueuePath = 'X:\YesAndEverything\.work-queue.json'
$LockPath  = 'X:\YesAndEverything\.work-queue.lock'
$StaleMs   = 30000
$TimeoutMs = 15000

function Acquire-QueueLock {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
  while ($true) {
    try {
      $fs = [System.IO.File]::Open($LockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      $w = New-Object System.IO.StreamWriter($fs)
      $w.WriteLine(("{0}|{1}|{2}" -f $PID, [DateTime]::UtcNow.ToString('o'), $env:COMPUTERNAME))
      $w.Flush(); $w.Dispose(); $fs.Dispose()
      return
    }
    catch [System.IO.IOException] {
      try {
        $info = Get-Item $LockPath -ErrorAction Stop
        if (([DateTime]::UtcNow - $info.LastWriteTimeUtc).TotalMilliseconds -gt $StaleMs) {
          Write-Host "queue-edit: breaking stale lock (age > ${StaleMs}ms)" -ForegroundColor Yellow
          Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
          continue
        }
      }
      catch {}
      if ([DateTime]::UtcNow -gt $deadline) { throw "queue lock busy > $([int]($TimeoutMs / 1000))s; aborting to avoid corruption" }
      Start-Sleep -Milliseconds (80 + (Get-Random -Maximum 140))
    }
  }
}
function Release-QueueLock { Remove-Item $LockPath -Force -ErrorAction SilentlyContinue }

function Read-Queue {
  if (-not (Test-Path $QueuePath)) { return [pscustomobject]@{ version = 1; updated = ''; items = @() } }
  return ([System.IO.File]::ReadAllText($QueuePath) | ConvertFrom-Json)
}
$DrainLogPath = 'X:\YesAndEverything\.work-queue-drain-log.json'

# Keep the drain log OUT of the main queue file. A _drain_log growing inside
# .work-queue.json enlarges the read-modify-write surface, and a FUSE truncation
# co-located with the items array stranded it (BR lost 4 drift ids 2026-06-22).
# Every write through this helper rotates any _drain_log to a capped sidecar so
# the main file stays lean and the items array is never co-located with the log.
function Rotate-DrainLog($q) {
  if (-not ($q.PSObject.Properties['_drain_log'])) { return }
  $entries = @($q._drain_log)
  $q.PSObject.Properties.Remove('_drain_log')
  if ($entries.Count -eq 0) { return }
  $existing = @()
  if (Test-Path $DrainLogPath) {
    try { $existing = @([System.IO.File]::ReadAllText($DrainLogPath) | ConvertFrom-Json) } catch { $existing = @() }
  }
  $merged = @($existing) + $entries
  if ($merged.Count -gt 200) { $merged = $merged[($merged.Count - 200)..($merged.Count - 1)] }  # cap
  $tmp = "$DrainLogPath.tmp"
  [System.IO.File]::WriteAllText($tmp, ($merged | ConvertTo-Json -Depth 20), [System.Text.UTF8Encoding]::new($false))
  $null = ([System.IO.File]::ReadAllText($tmp) | ConvertFrom-Json)
  Move-Item -Force $tmp $DrainLogPath
}
function Write-QueueAtomic($q) {
  $q.updated = [DateTime]::UtcNow.ToString('o')
  Rotate-DrainLog $q
  $json = ($q | ConvertTo-Json -Depth 30)
  # Atomic write + read-back verify, retried. The tmp is parse-validated before
  # the rename, but this FUSE mount can still land a truncated final file or
  # serve a stale read right after the move (it false-failed safe_write 3x in
  # one session). So after the rename, re-read $QueuePath and confirm it is
  # byte-identical AND parses; retry the whole write if not. Better to throw
  # under the lock than release it over a corrupt queue.
  $enc = [System.Text.UTF8Encoding]::new($false)
  $tmp = "$QueuePath.tmp"
  for ($attempt = 0; $attempt -lt 5; $attempt++) {
    [System.IO.File]::WriteAllText($tmp, $json, $enc)
    $null = ([System.IO.File]::ReadAllText($tmp) | ConvertFrom-Json)  # parse before it may replace the live file
    Move-Item -Force $tmp $QueuePath
    $got = [System.IO.File]::ReadAllText($QueuePath)
    $ok = $false
    if ($got -eq $json) { try { $null = ($got | ConvertFrom-Json); $ok = $true } catch { $ok = $false } }
    if ($ok) { return }
    Start-Sleep -Milliseconds 300  # let a stale read settle, then rewrite
  }
  throw "queue-edit: .work-queue.json read-back verify failed after 5 attempts (FUSE truncation/stale-read); aborting to avoid shipping a corrupt queue"
}
# Set a property, adding it if the JSON object doesn't already have it (PS 5.1
# throws on assigning a non-existent property of a [pscustomobject]).
function Set-Prop($obj, [string]$name, $val) {
  if ($obj.PSObject.Properties[$name]) { $obj.$name = $val }
  else { $obj | Add-Member -NotePropertyName $name -NotePropertyValue $val -Force }
}
# Lock -> read -> mutate -> atomic write -> unlock. The mutator gets $q and must return it.
function Invoke-QueueMutation([scriptblock]$Mutator) {
  Acquire-QueueLock
  try {
    $q = Read-Queue
    if ($null -eq $q.items) { $q | Add-Member -NotePropertyName items -NotePropertyValue @() -Force }
    $q = & $Mutator $q
    Write-QueueAtomic $q
    return $q
  }
  finally { Release-QueueLock }
}

if (-not $Op) { return }   # dot-sourced: expose the functions, do nothing else

switch ($Op) {
  'get' {
    Acquire-QueueLock
    try { Read-Queue | ConvertTo-Json -Depth 30 } finally { Release-QueueLock }
  }
  'add' {
    if (-not $Json) { throw "-Json <item> is required for add" }
    $item = $Json | ConvertFrom-Json
    Invoke-QueueMutation { param($q) $q.items = @($q.items) + $item; $q } | Out-Null
    Write-Host "queue-edit: added $($item.id)" -ForegroundColor Green
  }
  'set' {
    if (-not $Id) { throw "-Id is required for set" }
    Invoke-QueueMutation {
      param($q)
      $hit = $q.items | Where-Object { $_.id -eq $Id }
      if (-not $hit) { throw "id $Id not found" }
      if ($Status) { Set-Prop $hit 'status' $Status }
      if ($IncAttempts) { $cur = if ($hit.PSObject.Properties['attempts']) { [int]$hit.attempts } else { 0 }; Set-Prop $hit 'attempts' ($cur + 1) }
      if ($ResultPath) { Set-Prop $hit 'result_path' $ResultPath }
      if ($Notes) { Set-Prop $hit 'notes' $Notes }
      $q
    } | Out-Null
    Write-Host "queue-edit: set $Id" -ForegroundColor Green
  }
  'drop' {
    if (-not $Id) { throw "-Id is required for drop" }
    Invoke-QueueMutation { param($q) $q.items = @($q.items | Where-Object { $_.id -ne $Id }); $q } | Out-Null
    Write-Host "queue-edit: dropped $Id" -ForegroundColor Green
  }
}
