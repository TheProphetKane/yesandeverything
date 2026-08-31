# Does the right phrase actually open the document, and does the editor phrase give the editor?
#
# Reads the phrases out of the secrets file and never prints them. A gate that refuses everyone
# passes every test in verify-gate.ps1, so this is the other half of the proof.
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$file = 'X:\.secrets\YesAndEverything\gated-docs-access.txt'
if (-not (Test-Path $file)) { Write-Host "no phrases file at $file" -ForegroundColor Red; exit 1 }
$txt = Get-Content $file -Raw

function Phrase([string]$pattern) {
    $m = [regex]::Match($txt, $pattern)
    if (-not $m.Success) { throw "could not find $pattern in the phrases file" }
    $m.Groups[1].Value.Trim()
}

$fails = 0
function Check($label, $cond, $detail) {
    if ($cond) { Write-Host ("PASS  " + $label) -ForegroundColor Green }
    else { Write-Host ("FAIL  " + $label + "  " + $detail) -ForegroundColor Red; $script:fails++ }
}

$cases = @(
    @{ name='Hordes'; url='https://yesandeverything.com/hordes'; marker='Here Be Hordes';
       viewer=(Phrase 'hordes/\s+viewer: (.+)'); editor=(Phrase 'hordes/[^\r\n]*\r?\n\s+editor: (.+)');
       flag='htbh-access-mode' },
    @{ name='Brackish Rising'; url='https://yesandeverything.com/brackish-rising'; marker='Brackish Rising';
       viewer=(Phrase 'brackish-rising/\s+viewer: (.+)'); editor=(Phrase 'brackish-rising/[^\r\n]*\r?\n\s+editor: (.+)');
       flag='brackish-access-mode' }
)

foreach ($c in $cases) {
    Write-Host ""
    Write-Host "==== $($c.name) ====" -ForegroundColor Magenta

    foreach ($role in @('viewer','editor')) {
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $login = Invoke-WebRequest -Uri "$($c.url)/login" -Method POST -Body @{ password = $c[$role] } `
            -WebSession $session -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
        $code = [int]$login.StatusCode
        Check "$($c.name) [$role]: login accepted" ($code -eq 303) "got $code"

        $doc = Invoke-WebRequest -Uri "$($c.url)/" -WebSession $session -UseBasicParsing -ErrorAction SilentlyContinue
        $len = $doc.Content.Length
        Check "$($c.name) [$role]: document served ($([math]::Round($len/1024))KB)" ($len -gt 500000) "got $len bytes"
        Check "$($c.name) [$role]: it is the real document" ($doc.Content -match [regex]::Escape($c.marker)) "marker not found"
        Check "$($c.name) [$role]: access mode stamped as $role" ($doc.Content -match ([regex]::Escape($c.flag) + '","' + $role + '"')) "flag not stamped"
    }
}

Write-Host ""
if ($fails -eq 0) { Write-Host "=== OVERALL: PASS ===" -ForegroundColor Green; exit 0 }
Write-Host "=== OVERALL: FAIL ($fails) ===" -ForegroundColor Red
exit 1
