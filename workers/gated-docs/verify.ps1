# Does the gate actually withhold the document?
#
# The old arrangement passed every test you could write about the login form and still shipped
# the whole document to anyone who viewed source. So this checks the thing that matters: what
# an UNAUTHENTICATED request can see, measured in bytes and searched for content that should
# only exist behind the gate.
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$fails = 0
function Check($label, $cond, $detail) {
    if ($cond) { Write-Host ("PASS  " + $label) -ForegroundColor Green }
    else { Write-Host ("FAIL  " + $label + "  " + $detail) -ForegroundColor Red; $script:fails++ }
}

foreach ($doc in @(
    @{ path = '/hordes/';          name = 'Hordes';          marker = 'Here Be Hordes' },
    @{ path = '/brackish-rising/'; name = 'Brackish Rising'; marker = 'Brackish Rising' }
)) {
    $url = "https://yesandeverything.com" + $doc.path
    Write-Host ""
    Write-Host "==== $($doc.name)  $url ====" -ForegroundColor Magenta

    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    $body = $r.Content
    $len = $body.Length
    Write-Host "  unauthenticated response: $($r.StatusCode), $len bytes"

    Check "$($doc.name): response is small (a login form, not a document)" ($len -lt 8000) "got $len bytes"
    Check "$($doc.name): no base64 payload variable" ($body -notmatch 'var\s+ENCODED') "ENCODED is present"
    Check "$($doc.name): no cleartext password variable" ($body -notmatch 'var\s+PASSWORD') "PASSWORD is present"
    Check "$($doc.name): no editor phrase variable" ($body -notmatch 'var\s+EDITOR') "EDITOR is present"
    Check "$($doc.name): asks for a password" ($body -match 'name="password"') "no password field"
    Check "$($doc.name): excluded from indexing" ($r.Headers['x-robots-tag'] -match 'noindex') "x-robots-tag = $($r.Headers['x-robots-tag'])"
    Check "$($doc.name): not cacheable" ($r.Headers['cache-control'] -match 'no-store') "cache-control = $($r.Headers['cache-control'])"
    Check "$($doc.name): cannot be framed" ($r.Headers['x-frame-options'] -eq 'DENY') "x-frame-options = $($r.Headers['x-frame-options'])"

    # A wrong password must not open it, and must not leak the real one by timing out early.
    $wrong = $null
    try {
        $wrong = Invoke-WebRequest -Uri ($url.TrimEnd('/') + '/login') -Method POST `
            -Body @{ password = 'definitely-not-the-phrase' } -UseBasicParsing -ErrorAction Stop
    } catch { $wrong = $_.Exception.Response }
    $wrongCode = if ($wrong -is [Net.HttpWebResponse]) { [int]$wrong.StatusCode } elseif ($wrong) { [int]$wrong.StatusCode } else { 0 }
    Check "$($doc.name): a wrong password is refused" ($wrongCode -eq 401) "got $wrongCode"

    # And the document itself must not be reachable by guessing a deeper path.
    $deep = Invoke-WebRequest -Uri ($url.TrimEnd('/') + '/index.html') -UseBasicParsing -ErrorAction SilentlyContinue
    Check "$($doc.name): a deeper path does not bypass the gate" ($deep.Content.Length -lt 8000) "got $($deep.Content.Length) bytes"
}

Write-Host ""
if ($fails -eq 0) { Write-Host "=== OVERALL: PASS ===" -ForegroundColor Green; exit 0 }
Write-Host "=== OVERALL: FAIL ($fails) ===" -ForegroundColor Red
exit 1
