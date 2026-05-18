# push-to-github.ps1
# Commit + push YesAndEverything. Auto-detects what changed and writes a
# matching commit message. GitHub Pages auto-deploys from main root within
# ~30 seconds of push landing.
#
# No confirmation prompts (per use_release_scripts memory).

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $here "..")
Set-Location $repoRoot

# --- FUSE bug guard: clear stale .git\index.lock. ---
$lockFile = Join-Path $repoRoot ".git\index.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}

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
# 3. hordes/index.html must still have the var ENCODED line (HTBH GDD
#    mirror's password-gate payload). HTBH's publish-gdd.ps1 injects
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
    $cname = (Get-Content $cnamePath -Raw).Trim()
    if ($cname -ne "yesandeverything.com") {
        Write-Host "INTEGRITY FAIL: CNAME should be 'yesandeverything.com' but contains: '$cname'" -ForegroundColor Red
        exit 1
    }
}

$hordesPath = Join-Path $repoRoot "hordes\index.html"
if (Test-Path $hordesPath) {
    $hordesContent = Get-Content $hordesPath -Raw
    if ($hordesContent -notmatch '(?:var|let|const)\s+ENCODED\s*=') {
        Write-Host "INTEGRITY FAIL: hordes/index.html no longer has the var ENCODED line." -ForegroundColor Red
        Write-Host "HTBH's publish-gdd.ps1 needs this line to inject the GDD payload." -ForegroundColor Yellow
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

Write-Host "Integrity OK." -ForegroundColor Green
Write-Host ""

# --- Commit + push. ---
Write-Host "Repo status:" -ForegroundColor Cyan
git status --short
Write-Host ""

# Stage everything. .gitignore handles secrets / build artifacts.
git add -A
Assert-GitOk "add"

$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($staged)) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
    # Still push in case local commits are ahead of origin.
    git push origin main
    exit 0
}

# Compose a commit message from the changed paths.
$paths = @($staged -split "`n" | Where-Object { $_ } | ForEach-Object { $_.Trim() })
$count = $paths.Count
$summary = "yae: update $count file" + $(if ($count -eq 1) { "" } else { "s" })

# If a single project subdir was touched, name it.
$projectDirs = $paths | ForEach-Object {
    if ($_ -match '^(apothecary|hordes|projects/[^/]+)/') { $matches[1] } else { $null }
} | Where-Object { $_ } | Select-Object -Unique

if ($projectDirs.Count -eq 1) {
    $summary = "yae: update $($projectDirs[0])"
}

Write-Host "Committing: $summary" -ForegroundColor Cyan
git commit -m $summary
Assert-GitOk "commit"

Write-Host ""
Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push origin main
Assert-GitOk "push"

Write-Host ""
Write-Host "Done. Latest commit:" -ForegroundColor Green
git log -1 --oneline
