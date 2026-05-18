# discord-notify.ps1
# Posts a release notification to the YaE dev-log Discord channel via
# webhook. Called as Step 2 of release.ps1.
#
# Configuration:
#   Webhook URL lives in scripts/.discord_webhook.txt (gitignored).
#   If the file is missing the script logs a warning and exits 0
#   (release continues; Discord posting is optional).
#
# Setup (one-time, in Discord):
#   1. Right-click the #yae-dev-log channel -> Edit Channel
#   2. Integrations -> Webhooks -> New Webhook
#   3. Name it ("YaE Release Bot"), pick avatar, copy URL
#   4. Save to scripts\.discord_webhook.txt (single line, no quotes)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repoRoot = Split-Path -Parent $here

# Discord requires TLS 1.2+.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$webhookFile = Join-Path $here ".discord_webhook.txt"
if (-not (Test-Path $webhookFile)) {
    Write-Host "Discord webhook not configured - skipping notification." -ForegroundColor Yellow
    Write-Host "Setup: create $webhookFile with a Discord webhook URL on a single line." -ForegroundColor Yellow
    exit 0
}

$webhookUrl = (Get-Content $webhookFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    Write-Host "Discord webhook file is empty - skipping." -ForegroundColor Yellow
    exit 0
}

# Pull the latest commit subject + body for the post.
$commitSubject = (git -C $repoRoot log -1 --format="%s" 2>$null).Trim()
$commitSha = (git -C $repoRoot log -1 --format="%h" 2>$null).Trim()
$commitDate = (git -C $repoRoot log -1 --format="%ad" --date=short 2>$null).Trim()

if ([string]::IsNullOrWhiteSpace($commitSubject)) {
    Write-Host "Could not read latest commit. Skipping Discord post." -ForegroundColor Yellow
    exit 0
}

$titleText = "YaE: $commitSubject"
$descBody = "Commit ``$commitSha`` on $commitDate. Live at https://yesandeverything.com within ~30s."

# Cap title at 256 chars, description at 600.
if ($titleText.Length -gt 256) { $titleText = $titleText.Substring(0, 253) + "..." }
if ($descBody.Length -gt 600) { $descBody = $descBody.Substring(0, 597) + "..." }

# Replace em-dashes per solo-dev voice rule.
$titleText = $titleText -replace '\s*—\s*', ' - '
$descBody = $descBody -replace '\s*—\s*', ', '

$payloadObj = @{
    embeds = @(
        @{
            title = $titleText
            description = $descBody
            color = 6589383  # muted blue-gray
        }
    )
}
$payload = $payloadObj | ConvertTo-Json -Compress -Depth 5

try {
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $bodyBytes -ContentType "application/json; charset=utf-8" | Out-Null
    Write-Host "Discord notification posted." -ForegroundColor Green
} catch {
    Write-Host "Discord post failed: $($_.Exception.Message)" -ForegroundColor Red
    # Non-fatal; release succeeded.
    exit 0
}
