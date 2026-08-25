# release.ps1
# One-stop release for YesAndEverything (umbrella static site).
# Equivalent to running push-to-github.ps1 then discord-notify.ps1.
#
# Usage from the YaE repo root:
#   .\scripts\release.ps1
#
# -Path forwards pathspecs to push-to-github.ps1 so the release stages only
# what you shipped. Without it the push stages everything, which sweeps
# whatever another session left staged into your commit. Routines write
# status/data, dashboard/data and the queue continuously, so an unscoped
# release almost always carries someone else's work:
#   .\scripts\release.ps1 -Path status/data/Ring.json
#
# Note: HBH's publish-gdd.ps1 already pushes to this repo from the HBH
# side. THIS script is for direct YaE edits (landing-page changes, new
# project cards, apothecary mirror updates that didn't come from
# X:\YesAndApothecary\deploy.ps1, etc).

param(
    [string[]]$Path = @()
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

# Save + restore caller's cwd. push-to-github.ps1 Set-Locations into the
# repo; if it exits leaving the cwd elsewhere, callers get stranded.
Push-Location

try {
    Write-Host "==== Step 1/5: dashboard JSON integrity guard ====" -ForegroundColor Magenta
    & (Join-Path $here "check-status-json.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Aborting release: corrupt status JSON would ship to the live dashboard." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "==== Step 2/5: write YaE's own dashboard status JSON ====" -ForegroundColor Magenta
    # Non-fatal: a failed status write never unships a release.
    try {
        $global:LASTEXITCODE = 0
        & (Join-Path $here "write-dashboard-status.ps1")
    } catch {
        # A console-only warning is a record that exists until the window closes, and this
        # step runs unattended constantly, so nobody is reading that window (bar-raise
        # yae-status-write-failure-silent). The card then sits at whatever it last said,
        # which looks exactly like a project that has not changed.
        #
        # Two durable records instead. `stale` on the canonical status file is the field the
        # dashboard already understands, so the failure shows up where someone is looking
        # rather than where they are not. Still non-fatal: a stale card must not unship a
        # release that is otherwise fine.
        $msg = "$_"
        Write-Host "WARN: YaE status write failed ($msg). Dashboard card may be stale." -ForegroundColor Yellow
        try {
            $canon = "X:\PortfolioOps\status\data\Everything.json"
            if (Test-Path $canon) {
                $j = Get-Content -Encoding utf8 -Raw $canon | ConvertFrom-Json
                $stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                $note = "status write FAILED at $stamp -- this card is stale: $msg"
                if ($j.PSObject.Properties["stale"]) { $j.stale = $note }
                else { $j | Add-Member -NotePropertyName stale -NotePropertyValue $note }
                $out = ($j | ConvertTo-Json -Depth 30) -replace "`r`n", "`n"
                [System.IO.File]::WriteAllText($canon, $out, [System.Text.UTF8Encoding]::new($false))
                Write-Host "Recorded the failure on the canonical status file so the card says so." -ForegroundColor Yellow
            }
        } catch {
            # The durable record is itself best effort. If even this cannot be written the
            # console line is all there is, which is where this started.
            Write-Host "WARN: could not record the status-write failure durably either ($_)." -ForegroundColor Yellow
        }
    }

    # Step 2 is itself a writer, so re-run the guard over its output. Checking
    # only before the write let a corrupt JSON written in Step 2 sail into the
    # Step 3 push and onto the live dashboard.
    & (Join-Path $here "check-status-json.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Aborting release: the Step 2 status write produced corrupt JSON." -ForegroundColor Red
        exit 1
    }

    Write-Host "==== Step 3/5: project-page prose staleness guard ====" -ForegroundColor Magenta
    # Prose-staleness guard. The version pill on every project page is stamped from that
    # project status JSON, so it is right the moment a release pushes, while the prose
    # underneath it is hand-written and nothing updates it. That is how the Scheduler page
    # sat at a v0.7.1 story under a v0.7.3 pill: it named the right number and described
    # work from two releases earlier, and the pill being automatic is what hid it, because
    # the one thing a reader checks was correct. Only pages that organise a section BY
    # release are in scope, so a page describing the product without naming one is not
    # dragged in. Fatal: shipping a page that reads current and is not is the whole defect.
    & node (Join-Path $here "check-page-prose-staleness.mjs") --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Aborting release: a project page promises a version its prose does not describe." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "==== Step 4/5: push YaE to GitHub ====" -ForegroundColor Magenta
    if ($Path.Count -gt 0) {
        Write-Host "Scoped to: $($Path -join ', ')" -ForegroundColor DarkGray
        & (Join-Path $here "push-to-github.ps1") -Path $Path
    } else {
        & (Join-Path $here "push-to-github.ps1")
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "push-to-github.ps1 exited $LASTEXITCODE." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "==== Step 5/5: post to #yae-dev-log on Discord ====" -ForegroundColor Magenta
    # If scripts\.discord_webhook.txt is missing, discord-notify.ps1 logs a
    # warning and exits 0. Release is unaffected; Discord is optional.
    & (Join-Path $here "discord-notify.ps1")

    Write-Host ""
    Write-Host "==== Release complete ====" -ForegroundColor Green
}
finally {
    Pop-Location
}

# --- Refresh the live usage dashboard for this release (best-effort) ---
# Pushes fresh per-project token usage to the dashboard's Cloudflare KV so the live
# page (usage.yesandeverything.com) updates within seconds. -NoPush = KV + local only:
# no extra git commit and no GitHub Pages build. Never fails the release.
try { & "X:\YesAndEverything\scripts\collect-usage.ps1" -NoPush } catch { Write-Host "usage dashboard refresh skipped: $_" -ForegroundColor DarkGray }

# --- Hard-fail live check -------------------------------------------------
# A release that announces itself without looking at the site is announcing the push,
# not the deploy. This is GitHub Pages, asynchronous after the push, so the gap between
# "Release complete" and a broken page was exactly the window nobody watched. Learned
# on Gnosis 2026-07-28: a broken deploy must NEVER report success.
#
# Polls rather than sleeping once. A fixed wait either fails a healthy deploy or wastes
# the time on a fast one. Throws at the end rather than warning, because not checking
# at all is what a warning would amount to here.
$liveUrl = "https://yesandeverything.com/"
$deadline = (Get-Date).AddSeconds(90)
$liveOk = $false
$lastErr = "never attempted"
Write-Host "Live check: the hub homepage at $liveUrl" -ForegroundColor Cyan
while (-not $liveOk -and (Get-Date) -lt $deadline) {
    try {
        $resp = Invoke-WebRequest -Uri $liveUrl -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        if ([int]$resp.StatusCode -eq 200) { $liveOk = $true; break }
        $lastErr = "status $([int]$resp.StatusCode)"
    } catch { $lastErr = $_.Exception.Message }
    Start-Sleep -Seconds 6
}
if (-not $liveOk) {
    Write-Host "LIVE CHECK FAILED: $liveUrl did not return 200 within 90s. Last: $lastErr" -ForegroundColor Red
    throw "Live check failed for $liveUrl. The push landed; the site did not come back healthy. Do not treat this release as shipped."
}
Write-Host "Live check OK: $liveUrl returned 200." -ForegroundColor Green

# ---- the gated design documents are still gated ----
#
# Checks the LIVE site, so it runs after the push: an unauthenticated request to /hordes/
# and /brackish-rising/ must return a small login form carrying no payload and no phrase.
# Those two paths served the whole document as base64 with the phrase above it until
# 2026-08-25, and the shape of a regression is the same: a large response to a request
# that did not authenticate.
#
# Warns rather than aborts, because by the time it runs the release has already shipped and
# a release that shipped fine should not be reported as failed. A failure here is something
# to act on immediately, not something to swallow.
# $repoRoot does not exist in this script; $here is $PSScriptRoot, the scripts folder. The
# first version of this used $repoRoot, which resolves to nothing, so Test-Path came back
# false and the check silently never ran. A guard that quietly does not run is worse than no
# guard, because the release output reads identically either way.
$gateCheck = Join-Path (Split-Path -Parent $here) "workers\gated-docs\verify.ps1"
if (Test-Path $gateCheck) {
    Write-Host ""
    Write-Host "==== gated documents: still gated? ====" -ForegroundColor Magenta
    & $gateCheck
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: the gate check FAILED against the live site. The design documents may be exposed." -ForegroundColor Red
        Write-Host "         Investigate before the next release: workers\gated-docs\verify.ps1" -ForegroundColor Red
    }
}
