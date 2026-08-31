# install-secrets.ps1: put the access phrases onto the Worker, exactly.
#
# Split out of setup.ps1 because piping a value into `wrangler secret put` did not store what
# was piped. All five secrets were created with the right names and none of the phrases worked,
# including with a trailing newline or carriage return appended, so whatever reached wrangler
# on stdin through a PowerShell 5.1 pipeline was not the string that went in.
#
# This posts the value to the API instead, where the bytes are the ones in the request body and
# nothing between here and Cloudflare can reinterpret them.
#
# Phrases are read from X:\.secrets and never printed. Run this after setup.ps1 has generated
# them, or any time they need reinstalling.
#
#     cd X:\YesAndEverything\workers\gated-docs
#     .\install-secrets.ps1

$ErrorActionPreference = "Stop"
$script = "gated-docs-yesandeverything"
$acct = "1a36e094b77857eedf7ceb5a99e007d1"
$file = 'X:\.secrets\YesAndEverything\gated-docs-access.txt'

if (-not (Test-Path $file)) { throw "no phrases file at $file; run setup.ps1 first" }
$txt = Get-Content $file -Raw

function Phrase([string]$pattern, [string]$what) {
    $m = [regex]::Match($txt, $pattern)
    if (-not $m.Success) { throw "could not read $what out of $file" }
    $m.Groups[1].Value.Trim()
}

$secrets = [ordered]@{
    HORDES_PASSWORD        = Phrase 'hordes/\s+viewer: (.+)' 'the Hordes viewer phrase'
    HORDES_EDITOR_PASSWORD = Phrase 'hordes/[^\r\n]*\r?\n\s+editor: (.+)' 'the Hordes editor phrase'
    RISING_PASSWORD        = Phrase 'brackish-rising/\s+viewer: (.+)' 'the Rising viewer phrase'
    RISING_EDITOR_PASSWORD = Phrase 'brackish-rising/[^\r\n]*\r?\n\s+editor: (.+)' 'the Rising editor phrase'
    SESSION_SECRET         = Phrase 'SESSION_SECRET: (\S+)' 'the session signing key'
}

$env:CLOUDFLARE_API_TOKEN = (Get-Content 'X:\.secrets\.cloudflare-token' -Raw).Trim()
$headers = @{ Authorization = "Bearer $env:CLOUDFLARE_API_TOKEN"; "Content-Type" = "application/json" }
$uri = "https://api.cloudflare.com/client/v4/accounts/$acct/workers/scripts/$script/secrets"

foreach ($name in $secrets.Keys) {
    $body = @{ name = $name; text = $secrets[$name]; type = "secret_text" } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri $uri -Method PUT -Headers $headers -Body $body
    if (-not $r.success) {
        Write-Host "FAILED to install $name" -ForegroundColor Red
        $r.errors | ConvertTo-Json -Depth 4
        exit 1
    }
    Write-Host "  $name installed ($($secrets[$name].Length) characters)." -ForegroundColor Green
}

Write-Host ""
Write-Host "All five installed. Verify with the login check before trusting them." -ForegroundColor Cyan
