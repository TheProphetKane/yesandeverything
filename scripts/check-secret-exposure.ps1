# check-secret-exposure.ps1 - receiving-side secret-shape scan.
#
# Every artifact another project pushes into this public repository (today: the
# landing-page patch and the workers/gated-docs directory that Here Be Hordes' and
# Brackish Rising's own publish-gdd.ps1 write into, run from those repos, not this
# one) lands here without ever crossing this repo's own commit tooling first. A
# publisher's own gate cannot reach across repositories, so this is the backstop
# on the receiving side (D62, 2026-09-02, queue row yae-receiving-side-secret-scan).
#
# Reuses the pattern list from X:\BrackishRising\scripts\check_secret_exposure.py
# rather than inventing a second list to drift out of sync with it: a Discord
# webhook URL, a PEM private key, a GitHub personal access token (classic or
# fine-grained), an OpenAI/Anthropic-shaped API key, or a secret-named key
# assigned a high-entropy hex value. The hex branch is anchored to a secret-shaped
# key for the same reason the source does: a bare 40-hex run is indistinguishable
# from a git commit SHA, which appears throughout this repo's own prose.
#
# Scans every git-TRACKED file's content (git ls-files), not just staged files, so
# it also catches an artifact that another repo's script committed directly with
# its own git invocation and never routed through push-to-github.ps1 at all -
# which is exactly the shape publish-gdd.ps1 uses. Run standalone, from
# push-to-github.ps1 (local pre-push path), and from the Actions deploy workflow
# (receiving side for a push that bypassed the local script entirely).
#
# Exit 0 = clean. Exit 2 = a likely secret is tracked.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$ContentPatterns = @(
    'discord\.com/api/webhooks/\d{6,}/[A-Za-z0-9_\-]{20,}',   # Discord webhook URL
    '-----BEGIN [A-Z ]*PRIVATE KEY-----',                     # PEM private key
    '\bghp_[A-Za-z0-9]{36,}\b',                                # GitHub PAT (classic)
    '\bgithub_pat_[A-Za-z0-9_]{22,}\b',                        # GitHub PAT (fine-grained)
    '\bsk-[A-Za-z0-9]{20,}\b',                                 # OpenAI / Anthropic-style API key
    '(?i:secret|token|api[_-]?key|access[_-]?key|password|passwd)["''\s]*[:=]["''\s]*[0-9a-fA-F]{32,}'
)

$files = @(git ls-files | Where-Object { $_ })
$hits = @()

foreach ($rel in $files) {
    if ($rel -match '\.example$') { continue }
    $full = Join-Path (Get-Location) $rel
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
    $len = (Get-Item -LiteralPath $full).Length
    if ($len -gt 512kb) { continue }
    $text = $null
    try { $text = Get-Content -LiteralPath $full -Raw -Encoding utf8 -ErrorAction Stop } catch { continue }
    if (-not $text) { continue }
    foreach ($pat in $ContentPatterns) {
        if ($text -match $pat) {
            $hits += "${rel}: contents look like a live secret (matched: $pat)"
            break
        }
    }
}

if ($hits.Count -gt 0) {
    Write-Host "check-secret-exposure: FAIL - $($hits.Count) possible secret(s) tracked:" -ForegroundColor Red
    $hits | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host "git rm --cached the file, gitignore it, and rotate the secret if it ever reached a remote." -ForegroundColor Yellow
    exit 2
}

Write-Host "check-secret-exposure: OK ($($files.Count) tracked files, none secret-shaped)." -ForegroundColor Green
exit 0
