# write-dashboard-status.ps1 - emit YaE's own status JSON for the dashboard.
#
# Every project repo feeds status/data/<id>.json on release; YaE itself was
# the one project without a writer, so the Everything card had no status
# data. This runs inside YaE's release BEFORE push-to-github, so the JSON
# rides the same commit - no self-commit, no self-push.
#
# Read-modify-write: the audit + barRaise blocks are owned by the review
# skills and are preserved verbatim; this script only refreshes the
# release-owned fields.

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DataDir = Join-Path $RepoRoot "status\data"
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }
$JsonPath = Join-Path $DataDir "Everything.json"

$ctx = $null
try { $ctx = Get-Content -Raw (Join-Path $RepoRoot ".project-context.json") | ConvertFrom-Json } catch { $ctx = $null }

$headRaw = (& git -C $RepoRoot log -1 --pretty="%h|%cI|%s" 2>$null)
$head = @("", "", "")
if ($headRaw) { $head = $headRaw -split "\|", 3 }

$existing = $null
if (Test-Path $JsonPath) {
  try { $existing = Get-Content -Raw $JsonPath | ConvertFrom-Json } catch { $existing = $null }
}

$msg = $head[2]
if ($msg -and $msg.Length -gt 160) { $msg = $msg.Substring(0, 157) + "..." }

$payload = [ordered]@{
  project = "Everything"
  displayName = $(if ($ctx -and $ctx.display_name) { $ctx.display_name } else { "Yes& Everything" })
  version = $head[0]   # no semver on the umbrella site; HEAD short sha stands in
  lastReleaseAt = $head[1]
  lastReleaseMessage = $msg
  milestone = $(if ($ctx -and $ctx.milestone) { $ctx.milestone } else { $null })
  completion = $(if ($ctx -and $ctx.completion) { [ordered]@{ pct = $ctx.completion.pct; anchored = $ctx.completion.anchored } } else { $null })
  itemsLeft = $(if ($ctx -and $ctx.completion -and $ctx.completion.remaining) { [ordered]@{ gates = @($ctx.completion.remaining).Count } } else { $null })
  repoUrl = "https://github.com/TheProphetKane/yesandeverything"
  workTreeClean = $true   # the release commits everything, this file included
  audit = $(if ($existing -and $existing.audit) { $existing.audit } else { $null })
  barRaise = $(if ($existing -and $existing.barRaise) { $existing.barRaise } else { $null })
  stale = $false
  tags = $(if ($ctx -and $ctx.tags) { $ctx.tags } else { @("static-site", "orchestration", "release-pipeline", "public-voice") })
}

$json = ($payload | ConvertTo-Json -Depth 6) -replace "`r`n", "`n"
if (-not $json.EndsWith("`n")) { $json += "`n" }
$tmp = "$JsonPath.tmp"
[System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))
$null = (Get-Content -Raw $tmp | ConvertFrom-Json)   # parse before replacing the live file
Move-Item -Force $tmp $JsonPath
$back = [System.IO.File]::ReadAllText($JsonPath)
if ($back.Contains([char]0)) { throw "NUL bytes in $JsonPath after write" }
$null = ($back | ConvertFrom-Json)                   # fresh-read re-parse (FUSE guard)
Write-Host "Wrote status/data/Everything.json (HEAD $($head[0]))." -ForegroundColor Green
