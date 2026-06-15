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

Get-ChildItem "status\data\*.json" -ErrorAction SilentlyContinue | ForEach-Object {
  $path  = $_.FullName
  $name  = $_.Name
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $why   = $null

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
          try { $null = $body | ConvertFrom-Json } catch { $why = "does not parse: $($_.Exception.Message)" }
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
