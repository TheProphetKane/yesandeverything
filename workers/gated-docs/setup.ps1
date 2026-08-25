# setup.ps1: one-time provisioning for the gated-docs Worker.
#
# Creates the key-value namespace, generates fresh access phrases, writes them where Kane
# keeps secrets, and installs them as Worker secrets. Run once; re-running rotates the
# phrases, which is the correct thing to do if one is ever disclosed.
#
# NOTHING here prints a phrase. They are generated, written to X:\.secrets and piped into
# wrangler, and the only output is confirmation that each step landed. The old phrases are
# disclosed by definition (they were committed in cleartext to a public repository, and every
# value that file ever held is in its history), so they are replaced rather than carried over.
#
#     cd X:\YesAndEverything\workers\gated-docs
#     .\setup.ps1

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$secretsDir = "X:\.secrets\YesAndEverything"
$secretsFile = Join-Path $secretsDir "gated-docs-access.txt"

$env:CLOUDFLARE_API_TOKEN = (Get-Content 'X:\.secrets\.cloudflare-token' -Raw).Trim()

# ---------------------------------------------------------------- 1. the namespace
Write-Host "==== 1/4: key-value namespace ====" -ForegroundColor Magenta
$existing = cmd /c "npx wrangler kv namespace list 2>&1" | Out-String
$nsId = $null
try {
    $parsed = $existing | ConvertFrom-Json
    $hit = $parsed | Where-Object { $_.title -eq "gated-docs-yesandeverything-GATED_DOCS" -or $_.title -eq "GATED_DOCS" }
    if ($hit) { $nsId = $hit[0].id }
} catch { }

if ($nsId) {
    Write-Host "namespace already exists; reusing it." -ForegroundColor Green
} else {
    $created = cmd /c "npx wrangler kv namespace create GATED_DOCS 2>&1" | Out-String
    Write-Host $created
    if ($created -match '"?id"?\s*[:=]\s*"([0-9a-f]{32})"') { $nsId = $Matches[1] }
    if (-not $nsId) { throw "could not read the new namespace id out of wrangler's output" }
}
Write-Host "namespace id tail: ...$($nsId.Substring($nsId.Length-6))"

# Write the id into wrangler.jsonc so the binding resolves. The id is not a secret: it names a
# namespace, it does not grant access to one.
$cfgPath = Join-Path $here "wrangler.jsonc"
$cfg = Get-Content $cfgPath -Raw -Encoding utf8
if ($cfg -match 'REPLACE_WITH_NAMESPACE_ID') {
    $cfg = $cfg -replace 'REPLACE_WITH_NAMESPACE_ID', $nsId
    [System.IO.File]::WriteAllText($cfgPath, $cfg)
    Write-Host "wrangler.jsonc: namespace id written." -ForegroundColor Green
} else {
    Write-Host "wrangler.jsonc: already carries a namespace id; left alone." -ForegroundColor Yellow
}

# ---------------------------------------------------------------- 2. fresh phrases
Write-Host ""
Write-Host "==== 2/4: access phrases ====" -ForegroundColor Magenta

# Readable rather than random noise: these get typed by a person and read over a message. Four
# words out of a wide list beats a short random string for both strength and usability.
$words = @(
  'anchor','basalt','cinder','driftwood','ember','fathom','granite','harbour','ironwood','jetty',
  'kelp','lantern','marrow','nettle','obsidian','pewter','quarry','rampart','sable','tallow',
  'undertow','vellum','wharf','yarrow','zenith','bramble','cobalt','dredge','flint','gantry',
  'hollow','inlet','kestrel','lodestone','mistral','nadir','outcrop','pitch','quill','ridge',
  'saltmarsh','thicket','umber','verge','windlass','abyss','beacon','cairn','delta','estuary'
)
function New-Phrase {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $picked = for ($i = 0; $i -lt 4; $i++) {
        $b = [byte[]]::new(4); $rng.GetBytes($b)
        $words[[BitConverter]::ToUInt32($b, 0) % $words.Length]
    }
    ($picked -join '-')
}
function New-Key32 {
    $b = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    [Convert]::ToBase64String($b)
}

$phrases = [ordered]@{
    HORDES_PASSWORD        = New-Phrase
    HORDES_EDITOR_PASSWORD = New-Phrase
    RISING_PASSWORD        = New-Phrase
    RISING_EDITOR_PASSWORD = New-Phrase
    SESSION_SECRET         = New-Key32
}

New-Item -ItemType Directory -Force $secretsDir | Out-Null
$lines = @(
    "Access phrases for the gated design documents on yesandeverything.com.",
    "Written $(Get-Date -Format 'yyyy-MM-dd HH:mm:ssK') by workers/gated-docs/setup.ps1.",
    "",
    "These replace the phrases that were committed in cleartext to the PUBLIC",
    "yesandeverything repository. Treat every phrase that file ever held as disclosed:",
    "they are all in its git history and cannot be recalled.",
    "",
    "  https://yesandeverything.com/hordes/           viewer: $($phrases.HORDES_PASSWORD)",
    "                                                 editor: $($phrases.HORDES_EDITOR_PASSWORD)",
    "  https://yesandeverything.com/brackish-rising/  viewer: $($phrases.RISING_PASSWORD)",
    "                                                 editor: $($phrases.RISING_EDITOR_PASSWORD)",
    "",
    "The editor phrase turns on the in-document editing affordances; the viewer phrase does",
    "not. The server decides which, so a viewer's browser never receives the editor phrase.",
    "",
    "Session cookies are signed with SESSION_SECRET (below). Rotating it signs everyone out.",
    "  SESSION_SECRET: $($phrases.SESSION_SECRET)",
    "",
    "To rotate any of these, re-run workers/gated-docs/setup.ps1."
)
[System.IO.File]::WriteAllLines($secretsFile, $lines)
Write-Host "phrases written to $secretsFile" -ForegroundColor Green
Write-Host "(not printed here on purpose: read them from that file)" -ForegroundColor DarkGray

# ---------------------------------------------------------------- 3. install as Worker secrets
Write-Host ""
Write-Host "==== 3/4: install as Worker secrets ====" -ForegroundColor Magenta
# Through the API, not through `wrangler secret put`. Piping a value into that command
# created all five secrets with the right names and stored something other than what was
# piped: every phrase was refused, including with a trailing newline or carriage return
# appended. Posting the value in a request body leaves nothing in between to reinterpret it.
& (Join-Path $here "install-secrets.ps1")
if ($LASTEXITCODE -ne 0) { throw "install-secrets.ps1 failed" }

Write-Host ""
Write-Host "==== 4/4: next ====" -ForegroundColor Magenta
Write-Host "  publish the documents:  X:\HereBeHordes\scripts\publish-gdd.ps1"
Write-Host "                          X:\BrackishRising\scripts\publish-gdd.ps1"
Write-Host "  then deploy the gate:   npx wrangler deploy   (from this folder)"
