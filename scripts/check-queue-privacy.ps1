# check-queue-privacy.ps1 - the live queue feed must keep answering the private
# sentinel, never a real item list (bar-raise security-02).
#
# The work queue was pulled off every public surface on 2026-08-19. The endpoint
# answers {"private":true} rather than a 404, and the dashboard treats that as a
# real answer. Nothing checked on an ongoing basis that it holds, and the way it
# would stop holding is quiet: a collector change that starts writing rows to the
# public key, and the queue goes public with every card still rendering normally.
#
# Fails on a real list, on a shape that is neither the sentinel nor an empty
# answer, and on a request that did not land. A request that did not land is a
# failure on purpose: a check that reports all-clear when it could not reach the
# thing it guards is the failure reliability-02 was raised for on the sibling
# script, and this one is not repeating it.
#
#   .\scripts\check-queue-privacy.ps1

$ErrorActionPreference = "Stop"
$url = "https://usage.yesandeverything.com/queue.json"
$bad = 0

Write-Host "queue privacy: $url"

$resp = $null
try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
} catch {
    Write-Host "  FAIL  the endpoint did not answer: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$body = $resp.Content
if ([string]::IsNullOrWhiteSpace($body)) {
    Write-Host "  FAIL  the endpoint answered with an empty body" -ForegroundColor Red
    exit 1
}

$j = $null
try { $j = $body | ConvertFrom-Json } catch {
    Write-Host "  FAIL  the answer is not JSON: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# The sentinel is the expected answer.
if ($j.PSObject.Properties.Name -contains "private" -and $j.private) {
    Write-Host "  ok    the feed answers the private sentinel" -ForegroundColor Green
} else {
    Write-Host "  FAIL  the feed did not answer {private:true}; it answered:" -ForegroundColor Red
    Write-Host "        $($body.Substring(0, [Math]::Min(300, $body.Length)))" -ForegroundColor Red
    $bad++
}

# And whatever it answered, it must not carry rows. Checked separately from the
# sentinel, because a payload holding both would pass a sentinel-only check.
foreach ($field in @("items", "rows", "queue", "open")) {
    $v = $j.$field
    if ($null -ne $v -and $v -is [Array] -and $v.Count -gt 0) {
        Write-Host "  FAIL  the feed carries $($v.Count) row(s) under '$field'" -ForegroundColor Red
        $bad++
    }
}

# A prompt or a title anywhere in the body is a queue row by any other name.
foreach ($tell in @('"prompt"', '"drainNote"', '"blocker_type"', '"finding_id"')) {
    if ($body.Contains($tell)) {
        Write-Host "  FAIL  the body contains $tell, which only a real queue row carries" -ForegroundColor Red
        $bad++
    }
}

if ($bad -gt 0) {
    Write-Host "=== QUEUE PRIVACY: FAIL ($bad) ===" -ForegroundColor Red
    exit 1
}
Write-Host "=== QUEUE PRIVACY: PASS ===" -ForegroundColor Green
exit 0
