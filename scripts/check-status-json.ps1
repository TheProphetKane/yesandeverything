# check-status-json.ps1 - integrity guard for the dashboard data files.
#
# Verifies every status/data/*.json parses as JSON, contains no embedded NUL
# bytes, and ends with a closing brace. Catches FUSE / interrupted-write
# truncation before it ships to the live dashboard.
#
# Trailing-NUL handling (2026-06-14): the FUSE mount routinely null-pads the
# tail of these files after the 06:33 dashboard writers run (a valid JSON body
# followed by a run of 0x00). That is recoverable: stripping the trailing NULs
# leaves a byte-exact-to-HEAD body. So rather than failing the whole release,
# the guard now strips a trailing-NUL run and atomically heals the working-tree
# file (byte-level tmp + Move + readback), then validates the cleaned body.
# Embedded NUL bytes (a NUL anywhere before the trailing run) are real mid-file
# truncation and still fail hard. Empty files, non-brace tails, and parse
# failures still fail hard.
#
# Exit 0 when clean (or successfully healed); exit 1 listing the bad files.
# Called as Step 0 of release.ps1; also runnable standalone after any bulk
# status write.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$bad    = @()
$healed = @()

# --- Status-card contract (2026-08-27, bar-raise finding yae-statusjson-contract-unversioned) ---
# status/index.html renders a project card off these keys unconditionally: project,
# displayName and version for the card head, lastReleaseAt for the freshness clock and
# the release line, workTreeClean and repoUrl for the meta row and the repo link, stale
# for the staleness pill, and tags for both the parked-cadence check and the tag pills.
# Every other field (milestone, completion, audit, barRaise, workQueueDepth) is
# legitimately optional: the page already renders a placeholder when a project has no
# active milestone, no bar-raise has run yet, or the queue concept does not apply to it.
# Gnosis shipped without `tags` for weeks with nothing to catch it; this is that catch.
# constellation.json is a portfolio roll-up, not a per-project card, and carries a
# different shape entirely, so it is exempt from this contract.
$SchemaVersion    = 1
$RequiredKeys     = @("project", "displayName", "version", "lastReleaseAt", "workTreeClean", "repoUrl", "stale", "tags")
$ContractExempt   = @("constellation.json")

# Mojibake byte signatures. These are the UTF-8 encodings of text that was
# already mojibake - a UTF-8 string decoded as cp1252 and re-encoded, the classic
# em-dash-to-garbage round trip. The result is VALID UTF-8 and parses clean, so
# every check below passes it while the dashboard renders rubbish;
# status/data/Ring.json carried three of them for weeks. Matched as raw bytes on
# purpose: putting the literal characters in this .ps1 would itself be an
# encoding hazard under PS 5.1's cp1252 default read of a BOM-less script.
$MOJIBAKE = @(
  @{ Name = "double-encoded punctuation"; Bytes = @(0xC3, 0xA2, 0xE2, 0x82, 0xAC) },
  @{ Name = "double-encoded A-tilde-cent"; Bytes = @(0xC3, 0x83, 0xC2, 0xA2) },
  @{ Name = "double-encoded A-circumflex-euro"; Bytes = @(0xC3, 0x82, 0xE2, 0x82, 0xAC) }
)

function Find-Mojibake([byte[]]$bytes, [int]$end) {
  foreach ($sig in $MOJIBAKE) {
    $pat = $sig.Bytes
    $limit = $end - $pat.Count
    for ($i = 0; $i -le $limit; $i++) {
      $hit = $true
      for ($k = 0; $k -lt $pat.Count; $k++) {
        if ($bytes[$i + $k] -ne $pat[$k]) { $hit = $false; break }
      }
      if ($hit) { return $sig.Name }
    }
  }
  return $null
}

# status/data/*.json AND the two files the live dashboard actually reads. The
# dashboard pair crossed no guard at all, despite the header above claiming this
# script catches corruption before it ships to the live dashboard.
$targets = @()
Get-ChildItem "status\data\*.json" -ErrorAction SilentlyContinue | ForEach-Object {
  $targets += [PSCustomObject]@{ File = $_; IsStatusCard = ($ContractExempt -notcontains $_.Name) }
}
Get-ChildItem "dashboard\data\usage.json" -ErrorAction SilentlyContinue | ForEach-Object {
  $targets += [PSCustomObject]@{ File = $_; IsStatusCard = $false }
}
Get-ChildItem "dashboard\data\queue.json" -ErrorAction SilentlyContinue | ForEach-Object {
  $targets += [PSCustomObject]@{ File = $_; IsStatusCard = $false }
}

$targets | ForEach-Object {
  $path         = $_.File.FullName
  $name         = $_.File.Name
  $isStatusCard = $_.IsStatusCard
  $bytes        = [System.IO.File]::ReadAllBytes($path)
  $why          = $null
  $parsed       = $null

  if ($bytes.Length -eq 0) {
    $why = "empty file"
  }
  else {
    # Length of the trailing-NUL run (FUSE pad). $end = index past last real byte.
    $end = $bytes.Length
    while ($end -gt 0 -and $bytes[$end - 1] -eq 0) { $end-- }
    $trailingNul = $bytes.Length - $end

    if ($end -eq 0) {
      $why = "all NUL bytes (total truncation)"
    }
    else {
      # Embedded NUL anywhere before the trailing run = real mid-file truncation.
      $embedded = $false
      for ($i = 0; $i -lt $end; $i++) { if ($bytes[$i] -eq 0) { $embedded = $true; break } }

      if ($embedded) {
        $why = "embedded NUL bytes (mid-file truncation)"
      }
      else {
        $body = [System.Text.Encoding]::UTF8.GetString($bytes, 0, $end)
        if (-not $body.TrimEnd().EndsWith("}")) {
          $why = "does not end with a closing brace"
        }
        else {
          try { $parsed = $body | ConvertFrom-Json } catch { $why = "does not parse: $($_.Exception.Message)" }
        }

        if (-not $why) {
          $moji = Find-Mojibake $bytes $end
          if ($moji) { $why = "contains mojibake ($moji) - a string was decoded as cp1252 and re-encoded somewhere upstream" }
        }

        # Required-key + schema-version assertion, status cards only (see contract note above).
        if (-not $why -and $isStatusCard) {
          $propNames = @()
          if ($parsed -is [System.Management.Automation.PSCustomObject]) {
            $propNames = @($parsed.PSObject.Properties.Name)
          }
          foreach ($key in $RequiredKeys) {
            if ($propNames -notcontains $key) {
              $bad += "${name}: missing required key '$key' (status-card contract v$SchemaVersion)"
            }
          }
          if ($propNames -notcontains "schemaVersion") {
            $bad += "${name}: missing schemaVersion (expected $SchemaVersion)"
          }
          elseif ($parsed.schemaVersion -ne $SchemaVersion) {
            $bad += "${name}: schemaVersion $($parsed.schemaVersion) does not match expected $SchemaVersion"
          }
        }

        # Body is valid but the file carried trailing NUL pad: heal it byte-exact.
        if (-not $why -and $trailingNul -gt 0) {
          $clean = New-Object 'byte[]' $end
          [System.Array]::Copy($bytes, $clean, $end)
          $tmp = "$path.tmp"
          try {
            [System.IO.File]::WriteAllBytes($tmp, $clean)
            Move-Item -Force -LiteralPath $tmp -Destination $path
            $verify = [System.IO.File]::ReadAllBytes($path)
            if ($verify.Length -ne $end) {
              $why = "heal failed (readback length $($verify.Length) != $end)"
            }
            else {
              $mismatch = $false
              for ($i = 0; $i -lt $end; $i++) { if ($verify[$i] -ne $clean[$i]) { $mismatch = $true; break } }
              if ($mismatch) { $why = "heal failed (readback byte mismatch)" }
              else { $healed += "${name}: stripped $trailingNul trailing NUL byte(s)" }
            }
          }
          catch {
            $why = "heal failed: $($_.Exception.Message)"
          }
          finally {
            if (Test-Path -LiteralPath $tmp) { Remove-Item -Force -LiteralPath $tmp -ErrorAction SilentlyContinue }
          }
        }
      }
    }
  }

  if ($why) { $bad += "${name}: $why" }
}

# --- Gate-secret republish guard (2026-07-24) ---
# Bar-raise prose kept quoting the mirrors' gate phrases into topFinding fields,
# which then shipped to the public status tree. Rather than hard-code the
# literals here (that would be the same leak in a new file), read them back out
# of the generated gate pages and check the status JSONs for a match. No gate
# page present = nothing to compare, so the check skips quietly.
$secrets = @()
foreach ($gate in @("hordes\index.html", "brackish-rising\index.html")) {
  if (-not (Test-Path -LiteralPath $gate)) { continue }
  $html = Get-Content -LiteralPath $gate -Raw -Encoding utf8
  foreach ($varName in @("PASSWORD", "EDITOR")) {
    $m = [regex]::Match($html, "var\s+$varName\s*=\s*(['`"])(.*?)\1")
    if ($m.Success -and $m.Groups[2].Value.Length -ge 6) { $secrets += $m.Groups[2].Value }
  }
}
$secrets = $secrets | Sort-Object -Unique

if ($secrets.Count -gt 0) {
  Get-ChildItem "status\data\*.json" -ErrorAction SilentlyContinue | ForEach-Object {
    $text = Get-Content -LiteralPath $_.FullName -Raw -Encoding utf8
    foreach ($s in $secrets) {
      if ($text -and $text.Contains($s)) {
        $bad += "$($_.Name): republishes a gate phrase from the mirror pages (rewrite the prose to name the finding without quoting the secret)"
        break
      }
    }
  }
}

if ($healed.Count -gt 0) {
  Write-Host "Healed trailing-NUL padding (FUSE) on:" -ForegroundColor Yellow
  $healed | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
}

if ($bad.Count -gt 0) {
  Write-Host "FAIL: corrupt dashboard JSON detected:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "Restore the last good version (git show HEAD:status/data/<file>) before releasing." -ForegroundColor Yellow
  exit 1
}

Write-Host "All status/data JSONs parse clean." -ForegroundColor Green
exit 0
