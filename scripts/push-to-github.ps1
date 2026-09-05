# push-to-github.ps1
# Commit + push YesAndEverything. Auto-detects what changed and writes a
# matching commit message. GitHub Pages auto-deploys from main root within
# ~30 seconds of push landing.
#
# No confirmation prompts (per use_release_scripts memory).
#
# -Path scopes the staging to explicit pathspecs. Without it the script stages
# everything, which sweeps whatever another session left staged into this
# commit. Pass -Path when you are shipping a targeted edit:
#   .\scripts\push-to-github.ps1 -Path status/data/Ring.json

param(
    [string[]]$Path = @(),
    # Commit everything in the index, including whatever another session staged.
    # Required only when the tree is genuinely not yours alone; see the guard below.
    [switch]$All
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $here "..")
Set-Location $repoRoot

# --- FUSE-mount git safety: clear stale locks ONLY if no live git process. ---
. (Join-Path $here "git-guard.ps1")
Assert-GitSafe -RepoRoot $repoRoot

# Helper: bail if previous git command failed.
function Assert-GitOk($step) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "git $step failed (exit $LASTEXITCODE)." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# --- Integrity guards: stop bad pushes from going live. ---
# 1. index.html must end with </html>. The umbrella landing page is the
#    most visible artifact; a truncated index.html is silent breakage.
# 2. CNAME must contain exactly "yesandeverything.com". A blank or
#    altered CNAME breaks the custom domain on next Pages deploy.
# 3. hordes/index.html must still have the var ENCODED line (HBH GDD
#    mirror's password-gate payload). HBH's publish-gdd.ps1 injects
#    into this line every publish; if the line shape changed, that
#    pipeline breaks silently next time it fires.
$indexPath = Join-Path $repoRoot "index.html"
if (Test-Path $indexPath) {
    $indexTail = ((Get-Content $indexPath -Tail 3) -join "`n").TrimEnd()
    if (-not $indexTail.EndsWith("</html>")) {
        Write-Host "INTEGRITY FAIL: index.html does not end with </html>. Tail was:" -ForegroundColor Red
        Write-Host $indexTail -ForegroundColor Yellow
        exit 1
    }
}

$cnamePath = Join-Path $repoRoot "CNAME"
if (Test-Path $cnamePath) {
    $cname = (Get-Content -Encoding utf8 $cnamePath -Raw).Trim()
    if ($cname -ne "yesandeverything.com") {
        Write-Host "INTEGRITY FAIL: CNAME should be 'yesandeverything.com' but contains: '$cname'" -ForegroundColor Red
        exit 1
    }
}

$hordesPath = Join-Path $repoRoot "hordes\index.html"
if (Test-Path $hordesPath) {
    $hordesContent = Get-Content -Encoding utf8 $hordesPath -Raw
    if ($hordesContent -notmatch '(?:var|let|const)\s+ENCODED\s*=') {
        Write-Host "INTEGRITY FAIL: hordes/index.html no longer has the var ENCODED line." -ForegroundColor Red
        Write-Host "HBH's publish-gdd.ps1 needs this line to inject the GDD payload." -ForegroundColor Yellow
        exit 1
    }
}

# Conflict marker scan across HTML/MD/JSON files at the repo root.
# Wrap in try/catch because git can emit LF/CRLF warnings to stderr that
# PowerShell's $ErrorActionPreference = "Stop" treats as fatal. Filter
# stderr-warnings out and trust $LASTEXITCODE for actual git failures.
$conflicted = $null
try {
    $diffOutput = & git diff --name-only --diff-filter=U 2>&1
    $conflicted = $diffOutput | Where-Object {
        $_ -is [string] -and $_ -notmatch '^warning:' -and $_ -notmatch 'will be replaced by'
    }
} catch {
    # Treat unexpected error as "no conflicts found" rather than aborting.
    $conflicted = $null
}
if ($conflicted) {
    Write-Host "INTEGRITY FAIL: unresolved merge conflicts in:" -ForegroundColor Red
    $conflicted | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    exit 1
}

# --- Receiving-side secret-exposure scan (2026-09-02, D62) ---
# Catches a secret-shaped artifact that another project's own publish script
# (publish-gdd.ps1 for Here Be Hordes and Brackish Rising, the version-chip
# patch to index.html) wrote into this tree, since that content never crosses
# the staged-file gate above: it can already be committed by the time this
# script runs, or committed by a script that never calls this one at all.
& (Join-Path $here "check-secret-exposure.ps1")
if ($LASTEXITCODE -ne 0) {
    Write-Host "Aborting push: receiving-side secret scan failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Integrity OK." -ForegroundColor Green
Write-Host ""

# --- Commit + push. ---
Write-Host "Repo status:" -ForegroundColor Cyan
git status --short
Write-Host ""

# What is ALREADY in the index, before this run stages anything. Anything here was put
# there by somebody else, which is the only way to tell an ordinary release apart from one
# that is about to sweep another session's work (decision D5). Measured before the add,
# because `git add -A` below makes the two indistinguishable.
$preStaged = @(& git diff --cached --name-only | Where-Object { $_ })
if ($preStaged.Count -gt 0) {
    Write-Host "Note: $($preStaged.Count) file(s) were already staged before this run." -ForegroundColor Yellow
}

# Unscoped-commit guard (D5). An unscoped commit here takes the WHOLE index, and
# unattended routines commit in this repository constantly, so the window where
# somebody else has work staged is not rare. The script already carried a comment
# warning about this, and the warning was not enough: it bit twice in one week.
#
# -Path is deliberately NOT made mandatory. The unscoped form is right when a release
# really does mean the whole tree, and a flag nobody can avoid is one people learn to
# pass without reading. What is checked instead is whether anything is staged that this
# run did not stage, which is the difference the old comment could not express.
if ($Path.Count -eq 0 -and -not $All) {
    $unexpected = @($preStaged)
    if ($unexpected.Count -gt 0) {
        Write-Host ""
        Write-Host "Refusing an unscoped commit: $($unexpected.Count) file(s) were already staged before this run started." -ForegroundColor Red
        foreach ($u in $unexpected) { Write-Host "    $u" -ForegroundColor Red }
        Write-Host ""
        Write-Host "An unscoped commit takes the whole index, so these would ship inside this release" -ForegroundColor Red
        Write-Host "under its message (decision D5). Either scope it:" -ForegroundColor Red
        Write-Host "    .\scripts\push-to-github.ps1 -Path <your files>" -ForegroundColor Red
        Write-Host "or, if you have looked at the list above and every file belongs in this commit:" -ForegroundColor Red
        Write-Host "    .\scripts\push-to-github.ps1 -All" -ForegroundColor Red
        exit 1
    }
}


# Stage. With -Path only those pathspecs go in, so a targeted edit cannot
# sweep another session's staged work. Without it, stage everything and let
# .gitignore handle secrets / build artifacts.
if ($Path.Count -gt 0) {
    Write-Host "Scoped staging to: $($Path -join ', ')" -ForegroundColor Cyan
    Invoke-Git add -- @Path
    Assert-GitOk "add"
    $staged = git diff --cached --name-only -- @Path
} else {
    Invoke-Git add -A
    Assert-GitOk "add"
    $staged = git diff --cached --name-only
}
# Secret-shape gate on what is actually staged. .gitignore only helps for files
# git is not already tracking, and this repo is public with Pages serving the
# raw tree, so a staged secret is live the moment the push lands.
$secretShapes = @(
    '\.pem$', '\.key$', '\.p12$', '\.pfx$', '\.ppk$',
    '(^|/)\.env($|\.)', '(^|/)id_rsa$', '(^|/)id_ed25519$',
    'secret', 'credential', 'webhook', 'cloudflare-token', 'oauth'
)
$suspect = @($staged -split "`n" | Where-Object { $_ } | ForEach-Object { $_.Trim() } | Where-Object {
    $f = $_
    if ($f -match '\.example$' -or $f -match '(?i)SECURITY') { return $false }
    foreach ($shape in $secretShapes) { if ($f -match "(?i)$shape") { return $true } }
    return $false
})
if ($suspect.Count -gt 0) {
    Write-Host "INTEGRITY FAIL: staged files look secret-shaped. This repo is PUBLIC." -ForegroundColor Red
    $suspect | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host "Secrets belong in X:\.secrets. Unstage these, or add an ignore rule." -ForegroundColor Yellow
    Write-Host "To override deliberately: `$env:YAE_ALLOW_SECRET_SHAPE = '1'" -ForegroundColor DarkGray
    if ($env:YAE_ALLOW_SECRET_SHAPE -ne "1") { exit 1 }
    Write-Host "YAE_ALLOW_SECRET_SHAPE=1 set; continuing." -ForegroundColor DarkYellow
}

if ([string]::IsNullOrWhiteSpace($staged)) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
    # Still push in case local commits are ahead of origin.
    Invoke-Git push origin main
    exit 0
}

# Compose a commit message from the changed paths.
$paths = @($staged -split "`n" | Where-Object { $_ } | ForEach-Object { $_.Trim() })
$count = $paths.Count
$summary = "yae: update $count file" + $(if ($count -eq 1) { "" } else { "s" })

# If a single project subdir was touched, name it.
# @() around the pipeline matters. Without it a single match comes back as a bare
# string, .Count on a string is 1, and $projectDirs[0] then indexes the STRING and
# returns its first character: every release touching exactly one project directory
# committed "yae: update p" instead of "yae: update projects/scheduler". Two commits
# in this history carry that message.
$projectDirs = @($paths | ForEach-Object {
    if ($_ -match '^(apothecary|hordes|projects/[^/]+)/') { $matches[1] } else { $null }
} | Where-Object { $_ } | Select-Object -Unique)

if ($projectDirs.Count -eq 1) {
    $summary = "yae: update $($projectDirs[0])"
}

Write-Host "Committing: $summary" -ForegroundColor Cyan
if ($Path.Count -gt 0) {
    # Pathspec-scoped commit: anything another session staged stays staged.
    Invoke-Git commit -m $summary -- @Path
} else {
    Invoke-Git commit -m $summary
}
Assert-GitOk "commit"

Write-Host ""
Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
Invoke-Git push origin main
Assert-GitOk "push"

Write-Host ""
Confirm-GitIntact -RepoRoot $repoRoot

Write-Host "Done. Latest commit:" -ForegroundColor Green
git log -1 --oneline
