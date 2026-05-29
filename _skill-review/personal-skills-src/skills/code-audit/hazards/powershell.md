# PowerShell hazards

Load when auditing `.ps1` files. Most of Nick's release tooling is PowerShell.

## Parse / syntax (BLOCK)

### Unanchored `.Replace(text, str, 1)` on shared landing pages

```powershell
# BAD - replaces the FIRST card on YaE landing, not the project-specific one
$content.Replace($oldVersion, $newVersion, 1)
```

YaE has multiple version pills on landing.html (one per project card). A first-match replace stamps the wrong card. Reference: memory `publish_gdd_regex_bug_lesson`.

Fix: scope the regex to the specific project card via a multi-line anchor.

```powershell
# GOOD
$content = $content -replace '(?ms)(<!-- HBH start -->.*?v)\d+\.\d+\.\d+', "`$1$newVersion"
```

### Confirmation prompts in release scripts

```powershell
# BAD - release.ps1 / push-to-github.ps1 / publish-gdd.ps1 must never prompt
$confirm = Read-Host "Push? (y/n)"
if ($confirm -ne "y") { exit }
```

These scripts auto-commit and auto-push with no y/n. Reintroducing prompts is a regression that breaks the scheduled-task pipeline.

Reference: memory `no_confirmation_prompts`.

### Stale .git/index.lock not cleared

```powershell
# BAD - the FUSE mount leaves stale .git/index.lock between sessions; every git op must clear first
git commit -m "..."
```

Fix:
```powershell
$lock = ".git\index.lock"
if (Test-Path $lock) { Remove-Item -Force $lock -ErrorAction SilentlyContinue }
git commit -m "..."
```

Reference: memory `git_index_lock_quirk`.

## Logic smells (MEDIUM)

### Set-Content without -NoNewline on JSON / config files

Set-Content appends a trailing newline by default. For .json files that must be byte-perfect (some tools choke on trailing whitespace), use `-NoNewline`.

### Get-Content -Raw with append

`Get-Content -Raw` returns a single string; if you then `Add-Content`, you're double-buffering. Prefer `Set-Content` after a clean rewrite.

### Heredoc-style here-strings inside other quotes

PowerShell here-strings have specific opening/closing requirements. Mixing them inside double-quoted strings or interpolation creates parse errors.

## FUSE-mount-specific (HIGH)

### Direct file writes without atomic-write-with-readback

The FUSE Windows mount truncates mid-write with non-trivial frequency. PowerShell `Set-Content` is NOT safe for critical files.

For files that matter (release scripts that update package.json, CHANGELOG.md prepends, version-pill stampers), use the atomic-write pattern:

```powershell
$tmp = "$path.tmp"
[System.IO.File]::WriteAllText($tmp, $content, [System.Text.UTF8Encoding]::new($false))
$got = [System.IO.File]::ReadAllText($tmp)
if ($got -ne $content) {
    Write-Host "WARN: tmp readback mismatch, retrying" -ForegroundColor Yellow
    Start-Sleep -Milliseconds 500
    # retry
} else {
    Move-Item -Force $tmp $path
}
```

Reference: `scripts/write-dashboard-status.ps1` has this pattern with a 5-attempt retry loop.

## Release-flow-specific (BLOCK)

### Release script missing version-pill consistency check

Every release.ps1 must call a `Test-VersionPills` function (or equivalent) before commit that asserts package.json + apps/web/package.json + apps/api/package.json + packages/shared/package.json + any App.tsx pill + any DESIGN.md "Version: x.y.z" line all agree. Drift here ships a confused release.

Reference: HBH `check-version-pill.ps1`, YaB `release.ps1` Test-VersionPills function.

### Skipping the preship gate without YAB_SKIP_PRESHIP guard

A `release.ps1` that runs the build/test pipeline inline (without a preship.ps1 gate that can be bypassed via env var for emergencies) loses the emergency-escape valve.
