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

    # reliability-02: this used to suppress the error and carry on. A request
    # that never reached the origin left $r null, so $body was empty and $len
    # zero, and then EVERY assertion below passed: a zero-byte response is
    # smaller than 8000, contains no ENCODED variable, and leaks no password.
    # A gate that reports all-clear when it could not reach the thing it guards
    # is worse than no gate, because somebody reads the green and stops looking.
    $r = $null
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    } catch {
        # A 401 or a 403 is the expected answer from a gate and arrives as a
        # terminating error under -ErrorAction Stop, so the response on the
        # exception is the real one and the checks below run against it.
        $r = $_.Exception.Response
        if ($r -eq $null) {
            Check "$($doc.name): the gate answered at all" $false "no response from $url : $($_.Exception.Message)"
            continue
        }
    }
    $body = $r.Content
    if ($null -eq $body -and $r -is [Net.HttpWebResponse]) {
        $reader = New-Object IO.StreamReader($r.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
    }
    if ($null -eq $body) { $body = '' }
    $len = $body.Length
    Write-Host "  unauthenticated response: $($r.StatusCode), $len bytes"
    # Zero bytes is not a small login form, it is nothing. Say so rather than
    # letting the size assertion below read it as a pass.
    Check "$($doc.name): the gate returned a body" ($len -gt 0) "got an empty response"

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
    # Same reasoning as the first request: a suppressed failure gave this check
    # a zero-length body, which passed (reliability-02).
    $deep = $null
    try {
        $deep = Invoke-WebRequest -Uri ($url.TrimEnd('/') + '/index.html') -UseBasicParsing -ErrorAction Stop
    } catch { $deep = $_.Exception.Response }
    if ($null -eq $deep) {
        Check "$($doc.name): the deeper path answered at all" $false "no response"
    } else {
        $deepBody = $deep.Content
        if ($null -eq $deepBody -and $deep -is [Net.HttpWebResponse]) {
            $dr = New-Object IO.StreamReader($deep.GetResponseStream())
            $deepBody = $dr.ReadToEnd()
            $dr.Close()
        }
        if ($null -eq $deepBody) { $deepBody = '' }
        Check "$($doc.name): a deeper path does not bypass the gate" ($deepBody.Length -lt 8000) "got $($deepBody.Length) bytes"
    }
}

Write-Host ""
if ($fails -eq 0) { Write-Host "=== OVERALL: PASS ===" -ForegroundColor Green; exit 0 }
Write-Host "=== OVERALL: FAIL ($fails) ===" -ForegroundColor Red
exit 1
