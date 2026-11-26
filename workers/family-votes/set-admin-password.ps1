# Sets the admin password for the Golden's Guzzlers beer board, the one password that unlocks
# deleting. The password is typed here, hidden, and never leaves this window: only a salted
# PBKDF2-SHA256 hash goes to Cloudflare, as the BEER_ADMIN_HASH secret on the family-votes Worker.
# Run it again to change the password. Keys handed out under the old one stop working, so each
# admin phone unlocks again.
#
#     powershell -NoProfile -ExecutionPolicy Bypass -File X:\YesAndEverything\workers\family-votes\set-admin-password.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
. (Join-Path $PSScriptRoot "..\..\scripts\wrangler-version.ps1")
if (-not $env:CLOUDFLARE_API_TOKEN) {
    $tokenFile = "X:\.secrets\.cloudflare-token"
    if (Test-Path $tokenFile) { $env:CLOUDFLARE_API_TOKEN = (Get-Content $tokenFile -Raw).Trim() }
}

function Read-Hidden([string]$prompt) {
    $secure = Read-Host -Prompt $prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Get-AdminHash([string]$password, [byte[]]$salt, [int]$rounds) {
    $kdf = [Security.Cryptography.Rfc2898DeriveBytes]::new([Text.Encoding]::UTF8.GetBytes($password), $salt, $rounds, [Security.Cryptography.HashAlgorithmName]::SHA256)
    $hash = $kdf.GetBytes(32)
    $kdf.Dispose()
    $saltHex = -join ($salt | ForEach-Object { $_.ToString("x2") })
    $hashHex = -join ($hash | ForEach-Object { $_.ToString("x2") })
    return "pbkdf2-sha256`$$rounds`$$saltHex`$$hashHex"
}

$first = Read-Hidden "Admin password"
$second = Read-Hidden "The same password again"
if ($first -cne $second) { Write-Host "The two did not match. Nothing was changed." -ForegroundColor Red; exit 1 }
if ($first.Length -lt 8) { Write-Host "Use at least eight characters. Nothing was changed." -ForegroundColor Red; exit 1 }

$salt = New-Object byte[] 16
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
$value = Get-AdminHash $first $salt 100000
$first = $null
$second = $null

$ErrorActionPreference = "Continue"
$value | & npx --yes "wrangler@$WranglerVersion" secret put BEER_ADMIN_HASH
if ($LASTEXITCODE -ne 0) { Write-Host "wrangler could not store the secret. Nothing was changed." -ForegroundColor Red; exit 1 }
Write-Host "Admin password set. On the board, pick Nick, tap Admin at the bottom, and type it there." -ForegroundColor Green
