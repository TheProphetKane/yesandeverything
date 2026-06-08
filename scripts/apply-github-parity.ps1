# apply-github-parity.ps1
# Generated 2026-05-29. Brings all 7 repos to identical config level.
#
# Prereqs:
#   1. gh CLI installed: winget install --id GitHub.cli
#   2. Authenticated: gh auth login    (TheProphetKane)
#
# Usage:
#   cd X:\YesAndEverything
#   .\scripts\apply-github-parity.ps1
#
# Safe to re-run: every step is idempotent. Existing labels with the same
# name get color/description updated via --force; existing topics are
# replaced wholesale by --add-topic / --remove-topic; description and
# homepage are simple field updates.



# --- enforce repo-root cwd (cross-project requirement) ---
$__here = $PSScriptRoot
$__repoRoot = if ((Split-Path -Leaf $__here) -eq 'scripts') { Split-Path -Parent $__here } else { $__here }
Set-Location -LiteralPath $__repoRoot
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Preflight: gh installed + authed?
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host 'gh CLI not found. Install: winget install --id GitHub.cli' -ForegroundColor Red
  exit 1
}
$status = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host 'gh not authenticated. Run: gh auth login' -ForegroundColor Red
  exit 1
}
Write-Host 'gh CLI ready.' -ForegroundColor Green

# ----- Per-repo metadata -----

$repos = @(
  @{
    slug = 'here-be-hordes'
    display = 'Here Be Hordes'
    description = "Exoplanet colony defense RTS in Godot 4.6. Portal-anchored outpost extracting resources for a depleted Earth while the native undead refuse to stay buried. Hand-painted, true 2:1 isometric."
    homepage = 'https://yesandeverything.com/hordes/'
    topics = 'godot,godot4,gdscript,rts,survival-game,isometric,tower-defense,game-development,indie-game,horror-game'
    labelSet = 'game'
  },
  @{
    slug = 'brackish-rising'
    display = 'Brackish Rising'
    description = "Industrial-medieval / WWI-naval horror RTS in Godot 4.6. Holding the inland ring against echo-hunting parasites that wear what is left of the missing."
    homepage = 'https://yesandeverything.com/brackish-rising/'
    topics = 'godot,godot4,gdscript,rts,survival-game,isometric,tower-defense,game-development,indie-game,horror-game'
    labelSet = 'game'
  },
  @{
    slug = 'yesandbudget'
    display = 'YesAndBudget'
    description = "Local-first personal budget tool. Drop in monthly bank statements (CSV), get rule-based categorization, see where the money is going and what to cut. Bank data never leaves the machine."
    homepage = 'https://yesandeverything.com/budget/'
    topics = 'personal-finance,budget,local-first,typescript,react,vite,hono,sqlite,self-hosted,privacy-first'
    labelSet = 'webapp'
  },
  @{
    slug = 'yesandchains'
    display = 'YesAndChains'
    description = "Pocket caddy PWA for disc golfers. Build your bag, find courses, log rounds with per-shot stats, get AI-powered disc recommendations."
    homepage = 'https://yesandchains.com'
    topics = 'disc-golf,pwa,typescript,cloudflare-workers,supabase,offline-first,sports-app,progressive-web-app,mobile-first'
    labelSet = 'webapp'
  },
  @{
    slug = 'yesandscheduler'
    display = 'Yes and... Scheduler'
    description = "Multi-tenant employee-scheduling SaaS. Each client gets its own isolated org. Magic-link auth, six-week preference window, auto-fill round-robin."
    homepage = 'https://yesandeverything.com/projects/scheduler/'
    topics = 'scheduling,saas,multi-tenant,cloudflare-workers,cloudflare-d1,typescript,react,vite,supabase,magic-link-auth,tailwind'
    labelSet = 'webapp'
  },
  @{
    slug = 'yesandapothecary'
    display = 'YesAndApothecary'
    description = "Browser-based label designer for Celtic-styled apothecary jars. Vanilla JS + native ES modules, no build step. Parchment background, Elder Futhark runes, Celtic symbols."
    homepage = 'https://yesandeverything.com/apothecary/'
    topics = 'label-designer,browser-app,vanilla-js,celtic,apothecary,herbalism,no-build,client-side,es-modules'
    labelSet = 'webapp'
  },
  @{
    slug = 'yesandeverything'
    display = 'YesAndEverything'
    description = "Personal project umbrella at yesandeverything.com. Static landing, gated GDD mirrors for Here Be Hordes and Brackish Rising, launcher for YesAndBudget, mirror for YesAndApothecary, status dashboard."
    homepage = 'https://yesandeverything.com'
    topics = 'personal-website,portfolio,static-site,github-pages,vanilla-html,vanilla-js,indie-projects,hub'
    labelSet = 'hub'
  }
)

# ----- Label catalogs -----

$standardLabels = @(
  @{ name = 'bug'; color = 'd73a4a'; description = "Something is not working" },
  @{ name = 'feature'; color = 'a2eeef'; description = "New feature or capability" },
  @{ name = 'polish'; color = '0e8a16'; description = "UI/UX/voice/copy tightening" },
  @{ name = 'tooling'; color = '5319e7'; description = "Build, release, audit, CI" },
  @{ name = 'docs'; color = '0075ca'; description = "Documentation, GDD, DESIGN, CHANGELOG" },
  @{ name = 'tech-debt'; color = 'f9d0c4'; description = "Refactor for future velocity" },
  @{ name = 'perf'; color = 'fbca04'; description = "Performance or efficiency" },
  @{ name = 'security'; color = 'b60205'; description = "Locked-decision violation, secret exposure, data leak" },
  @{ name = 'P0'; color = 'b60205'; description = "Blocks the next milestone close" },
  @{ name = 'P1'; color = 'd93f0b'; description = "Land in the current milestone window" },
  @{ name = 'P2'; color = 'fbca04'; description = "Nice-to-have for current milestone" },
  @{ name = 'P3'; color = 'c5def5'; description = "Parked, revisit next planning beat" },
  @{ name = 'from-audit'; color = 'ededed'; description = "Surfaced by canonical-doc audit" },
  @{ name = 'from-bar-raise'; color = 'ededed'; description = "Surfaced by bar-raise report" },
  @{ name = 'from-code-audit'; color = 'ededed'; description = "Surfaced by code-audit skill" },
  @{ name = 'from-queue-drain'; color = 'ededed'; description = "Carried over from work queue" },
  @{ name = 'blocked'; color = '000000'; description = "Waiting on an external dependency" },
  @{ name = 'needs-decision'; color = '5319e7'; description = "Promote to DECISIONS doc" },
  @{ name = 'wontfix'; color = 'ffffff'; description = "Deliberately not doing" }
)

$gameLabels = @(
  @{ name = 'game-design'; color = '7057ff'; description = "Mechanics, balance, scope" },
  @{ name = 'art'; color = 'f9d0c4'; description = "Asset adoption, sprite work, visual polish" },
  @{ name = 'audio'; color = 'e99695'; description = "SFX, music, voice" },
  @{ name = 'engine'; color = '1d76db'; description = "Godot quirks, parser issues, runtime" },
  @{ name = 'milestone-M0'; color = 'ededed'; description = "Foundation milestone" },
  @{ name = 'milestone-M1'; color = 'ededed'; description = "MVP milestone" },
  @{ name = 'milestone-M2'; color = 'ededed'; description = "Vertical-slice milestone" },
  @{ name = 'milestone-M3'; color = 'ededed'; description = "Content depth milestone" },
  @{ name = 'milestone-M4'; color = 'ededed'; description = "Polish milestone" }
)

$webappLabels = @(
  @{ name = 'api'; color = '1d76db'; description = "Backend route, schema, endpoint" },
  @{ name = 'ui'; color = 'c5def5'; description = "Frontend component, page, interaction" },
  @{ name = 'schema'; color = '5319e7'; description = "DB migration, shape change" },
  @{ name = 'auth'; color = 'b60205'; description = "Authentication, session, token" },
  @{ name = 'import'; color = '0e8a16'; description = "Bank/data import flow" },
  @{ name = 'analytics'; color = 'fbca04'; description = "Insights, forecasting, deep-dive" }
)

$hubLabels = @(
  @{ name = 'publish-pipeline'; color = '5319e7'; description = "GDD injection, mirror, deploy" },
  @{ name = 'landing'; color = 'c5def5'; description = "Homepage card, project tile, copy" },
  @{ name = 'status-dashboard'; color = '0e8a16'; description = "status/ page or per-project JSON" },
  @{ name = 'scheduled-task'; color = 'fbca04'; description = "Cowork scheduled task wiring" }
)

$labelSetMap = @{
  'game' = $gameLabels
  'webapp' = $webappLabels
  'hub' = $hubLabels
}

# ----- Step 1: repo metadata -----
Write-Host ''
Write-Host '=== Step 1: repo metadata (7 repos) ===' -ForegroundColor Cyan
foreach ($r in $repos) {
  $repo = "TheProphetKane/$($r.slug)"
  Write-Host "  $repo ($($r.display))" -ForegroundColor Yellow
  gh repo edit $repo `
    --description $r.description `
    --homepage $r.homepage `
    --enable-issues=true `
    --enable-projects=false `
    --enable-wiki=false `
    --enable-discussions=false
  if ($LASTEXITCODE -ne 0) { Write-Host "    WARN: repo edit failed for $repo" -ForegroundColor Yellow }
  # Add topics (gh dedupes server-side)
  gh repo edit $repo --add-topic $r.topics
  if ($LASTEXITCODE -ne 0) { Write-Host "    WARN: topic add failed for $repo" -ForegroundColor Yellow }
}
Write-Host 'Step 1 complete.' -ForegroundColor Green

# ----- Step 2: labels -----
Write-Host ''
Write-Host '=== Step 2: labels (standard + per-type) ===' -ForegroundColor Cyan
foreach ($r in $repos) {
  $repo = "TheProphetKane/$($r.slug)"
  $labels = $standardLabels + $labelSetMap[$r.labelSet]
  Write-Host "  ${repo}: $($labels.Count) labels ($($r.labelSet) set)" -ForegroundColor Yellow
  foreach ($lbl in $labels) {
    gh label create $lbl.name --repo $repo --color $lbl.color --description $lbl.description --force 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "    WARN: label $($lbl.name) failed" -ForegroundColor Yellow }
  }
}
Write-Host 'Step 2 complete.' -ForegroundColor Green

# ----- Step 3: optional default-branch lockdown -----
Write-Host ''
Write-Host '=== Step 3: branch protection (optional, prompts before applying) ===' -ForegroundColor Cyan
$reply = Read-Host 'Apply linear-history + no-force-push to main on all repos? (y/N)'
if ($reply -eq 'y' -or $reply -eq 'Y') {
  # Build the request body as a PowerShell object, convert to JSON, pipe to gh api --input -
  # gh's -f / -F flags send strings for null/booleans incorrectly; stdin JSON sidesteps that.
  $protection = @{
    required_status_checks         = $null
    enforce_admins                 = $false
    required_pull_request_reviews  = $null
    restrictions                   = $null
    allow_force_pushes             = $false
    allow_deletions                = $false
    required_linear_history        = $true
    required_conversation_resolution = $false
    lock_branch                    = $false
    allow_fork_syncing             = $true
  } | ConvertTo-Json -Depth 5 -Compress
  foreach ($r in $repos) {
    $repo = "TheProphetKane/$($r.slug)"
    Write-Host "  ${repo}" -ForegroundColor Yellow
    # Write the body as UTF-8 NO BOM (PowerShell pipe-to-stdin defaults trip GitHub's JSON parser).
    $tmpFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmpFile, $protection, [System.Text.UTF8Encoding]::new($false))
    try {
      $result = gh api -X PUT "/repos/$repo/branches/main/protection" --input $tmpFile 2>&1
      if ($LASTEXITCODE -eq 0) {
        Write-Host "    OK" -ForegroundColor Green
      } else {
        Write-Host "    WARN: protection failed for ${repo}: $result" -ForegroundColor Yellow
      }
    } catch {
      Write-Host "    WARN: exception applying protection to ${repo}: $_" -ForegroundColor Yellow
    } finally {
      Remove-Item -Force $tmpFile -ErrorAction SilentlyContinue
    }
  }
  Write-Host 'Step 3 complete.' -ForegroundColor Green
} else {
  Write-Host 'Step 3 skipped.' -ForegroundColor DarkGray
}

# ----- Verification -----
Write-Host ''
Write-Host '=== Verification ===' -ForegroundColor Cyan
foreach ($r in $repos) {
  $repo = "TheProphetKane/$($r.slug)"
  $info = gh repo view $repo --json description,homepageUrl,repositoryTopics,hasIssuesEnabled,visibility | ConvertFrom-Json
  $topicCount = if ($info.repositoryTopics) { $info.repositoryTopics.Count } else { 0 }
  $descLen = if ($info.description) { $info.description.Length } else { 0 }
  $homeOk = if ($info.homepageUrl) { 'yes' } else { 'NO' }
  Write-Host ("  {0,-32} desc={1,3}c  topics={2,2}  homepage={3,3}  vis={4}" -f $r.slug, $descLen, $topicCount, $homeOk, $info.visibility)
}
Write-Host ''
Write-Host '===== apply-github-parity complete =====' -ForegroundColor Green
