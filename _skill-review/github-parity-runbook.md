# GitHub repository parity runbook (2026-05-29)
Goal: bring all 7 repos to the same GitHub-side config level. Two repos appeared to be configured before this pass; the survey showed YaE actually wasn't (description "Website manager", no topics, no homepage). Treat this runbook as the new baseline.
Prereqs:

- `gh` CLI installed and authenticated as `TheProphetKane`
- PowerShell or any shell with `gh` on PATH
- ~10 minutes for the whole pass

**Note on private vs public repos.** Six repos are private; only YesAndEverything is public. All commands work for both. Topics on private repos are visible only to you and collaborators.

## One-time: install `gh` if missing

```powershell
winget install --id GitHub.cli
gh auth login    # follow the device-code flow
gh auth status   # confirm logged in as TheProphetKane
```

## Per-repo config (apply in order)

Each block below configures one repo: description, homepage, topics, features, license suggestion. Topics are space-separated for `gh repo edit --add-topic`.

### Here Be Hordes (`TheProphetKane/here-be-hordes`)

```powershell
gh repo edit TheProphetKane/here-be-hordes `
  --description "Industrial-era horror RTS survival in Godot 4.6. Hand-painted grim-dark, true 2:1 isometric. Build a portal-anchored colony on a distant exoplanet, hold the native undead at bay." `
  --homepage "https://yesandeverything.com/hordes/" `
  --enable-issues=true `
  --enable-projects=false `
  --enable-wiki=false `
  --enable-discussions=false

gh repo edit TheProphetKane/here-be-hordes --add-topic "godot,godot4,gdscript,rts,survival-game,isometric,tower-defense,game-development,indie-game,horror-game"
```

### Brackish Rising (`TheProphetKane/brackish-rising`)

```powershell
gh repo edit TheProphetKane/brackish-rising `
  --description "Industrial-medieval / WWI-naval horror RTS in Godot 4.6. Holding the inland ring against echo-hunting parasites that wear what's left of the missing." `
  --homepage "https://yesandeverything.com/brackish-rising/" `
  --enable-issues=true `
  --enable-projects=false `
  --enable-wiki=false `
  --enable-discussions=false

gh repo edit TheProphetKane/brackish-rising --add-topic "godot,godot4,gdscript,rts,survival-game,isometric,tower-defense,game-development,indie-game,horror-game"
```

### YesAndBudget (`TheProphetKane/yesandbudget`)

```powershell
gh repo edit TheProphetKane/yesandbudget `
  --description "Local-first personal budget tool. Drop in monthly bank statements (CSV), get rule-based categorization, see where the money's going and what to cut. Bank data never leaves the machine." `
  --homepage "https://yesandeverything.com/budget/" `
  --enable-issues=true `
  --enable-projects=false `
  --enable-wiki=false `
  --enable-discussions=false

gh repo edit TheProphetKane/yesandbudget --add-topic "personal-finance,budget,local-first,typescript,react,vite,hono,sqlite,self-hosted,privacy-first"
```

### YesAndChains (`TheProphetKane/yesandchains`)

```powershell
gh repo edit TheProphetKane/yesandchains `
  --description "Pocket caddy PWA for disc golfers. Build your bag, find courses, log rounds with per-shot stats, get AI-powered disc recommendations." `
  --homepage "https://yesandchains.com" `
  --enable-issues=true `
  --enable-projects=false `
  --enable-wiki=false `
  --enable-discussions=false

gh repo edit TheProphetKane/yesandchains --add-topic "disc-golf,pwa,typescript,cloudflare-workers,supabase,offline-first,sports-app,progressive-web-app,mobile-first"
```

### Yes and... Scheduler (`TheProphetKane/yesandscheduler`)

```powershell
gh repo edit TheProphetKane/yesandscheduler `
  --description "Multi-tenant employee-scheduling SaaS. Each client gets its own isolated org. Magic-link auth, six-week preference window, auto-fill round-robin." `
  --homepage "https://yesandeverything.com/projects/scheduler/" `
  --enable-issues=true `
  --enable-projects=false `
  --enable-wiki=false `
  --enable-discussions=false

gh repo edit TheProphetKane/yesandscheduler --add-topic "scheduling,saas,multi-tenant,cloudflare-workers,cloudflare-d1,typescript,react,vite,supabase,magic-link-auth,tailwind"
```

### YesAndApothecary (`TheProphetKane/yesandapothecary`)

```powershell
gh repo edit TheProphetKane/yesandapothecary `
  --description "Browser-based label designer for Celtic-styled apothecary jars. Vanilla JS + native ES modules, no build step. Parchment background, Elder Futhark runes, Celtic symbols." `
  --homepage "https://yesandeverything.com/apothecary/" `
  --enable-issues=true `
  --enable-projects=false `
  --enable-wiki=false `
  --enable-discussions=false

gh repo edit TheProphetKane/yesandapothecary --add-topic "label-designer,browser-app,vanilla-js,celtic,apothecary,herbalism,no-build,client-side,es-modules"
```

### YesAndEverything (`TheProphetKane/yesandeverything`)

```powershell
gh repo edit TheProphetKane/yesandeverything `
  --description "Personal project umbrella at yesandeverything.com. Static landing, gated GDD mirrors for Here Be Hordes and Brackish Rising, launcher for YesAndBudget, mirror for YesAndApothecary, status dashboard." `
  --homepage "https://yesandeverything.com" `
  --enable-issues=true `
  --enable-projects=false `
  --enable-wiki=false `
  --enable-discussions=false

gh repo edit TheProphetKane/yesandeverything --add-topic "personal-website,portfolio,static-site,github-pages,vanilla-html,vanilla-js,indie-projects,hub"
```

## Labels (apply once per repo type)

The label set is split into three: a Standard set every repo gets, plus a per-type set (game / webapp / hub). Run the standard set on all 7, then the per-type set on the matching repos.

### Standard labels (apply to all 7)

Wrap the per-repo loop. PowerShell:

```powershell
$repos = @(
  "TheProphetKane/here-be-hordes",
  "TheProphetKane/brackish-rising",
  "TheProphetKane/yesandbudget",
  "TheProphetKane/yesandchains",
  "TheProphetKane/yesandscheduler",
  "TheProphetKane/yesandapothecary",
  "TheProphetKane/yesandeverything",
)

$standardLabels = @(
  @{ name = "bug"; color = "d73a4a"; description = "Something isn't working" },
  @{ name = "feature"; color = "a2eeef"; description = "New feature or capability" },
  @{ name = "polish"; color = "0e8a16"; description = "UI/UX/voice/copy tightening" },
  @{ name = "tooling"; color = "5319e7"; description = "Build, release, audit, CI" },
  @{ name = "docs"; color = "0075ca"; description = "Documentation / GDD / DESIGN / CHANGELOG" },
  @{ name = "tech-debt"; color = "f9d0c4"; description = "Refactor for future velocity" },
  @{ name = "perf"; color = "fbca04"; description = "Performance or efficiency" },
  @{ name = "security"; color = "b60205"; description = "Locked-decision violation, secret exposure, data leak" },
  @{ name = "P0"; color = "b60205"; description = "Blocks the next milestone close" },
  @{ name = "P1"; color = "d93f0b"; description = "Land in the current milestone window" },
  @{ name = "P2"; color = "fbca04"; description = "Nice-to-have for current milestone" },
  @{ name = "P3"; color = "c5def5"; description = "Parked, revisit next planning beat" },
  @{ name = "from-audit"; color = "ededed"; description = "Surfaced by canonical-doc audit" },
  @{ name = "from-bar-raise"; color = "ededed"; description = "Surfaced by bar-raise report" },
  @{ name = "from-code-audit"; color = "ededed"; description = "Surfaced by code-audit skill" },
  @{ name = "from-queue-drain"; color = "ededed"; description = "Carried over from work queue" },
  @{ name = "blocked"; color = "000000"; description = "Waiting on an external dependency" },
  @{ name = "needs-decision"; color = "5319e7"; description = "Promote to DECISIONS doc" },
  @{ name = "wontfix"; color = "ffffff"; description = "Deliberately not doing" },
)

foreach ($repo in $repos) {
  foreach ($lbl in $standardLabels) {
    gh label create $lbl.name --repo $repo --color $lbl.color --description $lbl.description --force
  }
}
```

### Game labels (apply to: here-be-hordes, brackish-rising)

```powershell
$repos_game = @(
  "TheProphetKane/here-be-hordes",
  "TheProphetKane/brackish-rising",
)

$labels_game = @(
  @{ name = "game-design"; color = "7057ff"; description = "Mechanics / balance / scope" },
  @{ name = "art"; color = "f9d0c4"; description = "Asset adoption, sprite work, visual polish" },
  @{ name = "audio"; color = "e99695"; description = "SFX, music, voice" },
  @{ name = "engine"; color = "1d76db"; description = "Godot quirks, parser issues, runtime" },
  @{ name = "milestone:M0"; color = "ededed"; description = "Foundation milestone" },
  @{ name = "milestone:M1"; color = "ededed"; description = "MVP milestone" },
  @{ name = "milestone:M2"; color = "ededed"; description = "Vertical-slice milestone" },
  @{ name = "milestone:M3"; color = "ededed"; description = "Content depth milestone" },
  @{ name = "milestone:M4"; color = "ededed"; description = "Polish milestone" },
)

foreach ($repo in $repos_game) {
  foreach ($lbl in $labels_game) {
    gh label create $lbl.name --repo $repo --color $lbl.color --description $lbl.description --force
  }
}
```

### Webapp labels (apply to: yesandbudget, yesandchains, yesandscheduler, yesandapothecary)

```powershell
$repos_webapp = @(
  "TheProphetKane/yesandbudget",
  "TheProphetKane/yesandchains",
  "TheProphetKane/yesandscheduler",
  "TheProphetKane/yesandapothecary",
)

$labels_webapp = @(
  @{ name = "api"; color = "1d76db"; description = "Backend route, schema, endpoint" },
  @{ name = "ui"; color = "c5def5"; description = "Frontend component, page, interaction" },
  @{ name = "schema"; color = "5319e7"; description = "DB migration, shape change" },
  @{ name = "auth"; color = "b60205"; description = "Authentication / session / token" },
  @{ name = "import"; color = "0e8a16"; description = "Bank/data import flow (YaB)" },
  @{ name = "analytics"; color = "fbca04"; description = "Insights, forecasting, deep-dive" },
)

foreach ($repo in $repos_webapp) {
  foreach ($lbl in $labels_webapp) {
    gh label create $lbl.name --repo $repo --color $lbl.color --description $lbl.description --force
  }
}
```

### Hub labels (apply to: yesandeverything)

```powershell
$repos_hub = @(
  "TheProphetKane/yesandeverything",
)

$labels_hub = @(
  @{ name = "publish-pipeline"; color = "5319e7"; description = "GDD injection, mirror, deploy" },
  @{ name = "landing"; color = "c5def5"; description = "Homepage card, project tile, copy" },
  @{ name = "status-dashboard"; color = "0e8a16"; description = "status/ page or per-project JSON" },
  @{ name = "scheduled-task"; color = "fbca04"; description = "Cowork scheduled task wiring" },
)

foreach ($repo in $repos_hub) {
  foreach ($lbl in $labels_hub) {
    gh label create $lbl.name --repo $repo --color $lbl.color --description $lbl.description --force
  }
}
```

## Optional: tighten branch protection on `main`

If you want main protected against accidental force-pushes (relevant after the YaB history scrub), run per-repo:

```powershell
# Don't enable required PR reviews on solo projects - that blocks your own pushes.
# Just turn on linear history + block force-pushes:
gh api -X PATCH "/repos/TheProphetKane/<slug>/branches/main/protection" `
  -f required_status_checks='null' `
  -f enforce_admins=false `
  -f required_pull_request_reviews='null' `
  -f restrictions='null' `
  -F allow_force_pushes=false `
  -F allow_deletions=false `
  -F required_linear_history=true
```

Skip this on YaB until after the filter-repo + force-push history scrub completes. Same for any other project that might need a one-shot rewrite.

## License decision per repo

Suggestions (your call to apply):

- **Here Be Hordes** (here-be-hordes): none-private
- **Brackish Rising** (brackish-rising): none-private
- **YesAndBudget** (yesandbudget): MIT
- **YesAndChains** (yesandchains): MIT
- **Yes and... Scheduler** (yesandscheduler): none-private
- **YesAndApothecary** (yesandapothecary): MIT
- **YesAndEverything** (yesandeverything): none-public-source-but-no-license

`MIT` recommended for the open-source-friendly ones (YaB / YaC / YaApothecary). `none-private` for the games (HBH / BR / Scheduler) keeps source rights with you while letting close-friends clone for personal use under implicit copyright. YaE is mixed: public source but the GDD mirrors are gated; leave unlicensed.

To add MIT after deciding:

```powershell
gh api -X PUT "/repos/TheProphetKane/<slug>/contents/LICENSE" `
  -f message="add MIT license" `
  -f content=$([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content "<path-to-MIT-template>" -Raw))))
```

Simpler: clone, drop a `LICENSE` file, commit, push.

## Hygiene items surfaced during the survey

1. **YesAndChains `.git/config` has an embedded Personal Access Token.** The origin URL is `https://<TOKEN>@github.com/...`. Local-only, never pushed (origin is the remote, .git is gitignored), but the token sits in plaintext on disk. Clean it:

   ```powershell
   cd X:\YesAndChains
   git remote set-url origin https://github.com/TheProphetKane/yesandchains.git
   ```

   Then authenticate via `gh auth login` (uses the system credential helper) or via a fresh `.github-pat` file that stays gitignored. Don't paste the token into the URL again.

2. **YesAndEverything had `description: "Website manager"` and no topics.** The runbook above replaces both.

3. **Two `.project-context.json` files had wrong repo URLs.** HBH was pointing at `herebehordes`; actual is `here-be-hordes`. Scheduler was pointing at `scheduler`; actual is `yesandscheduler`. Both have been fixed locally; commit + push as part of the next ship.

4. **`has_pages: true` on multiple private repos.** GitHub Pages on private repos requires GitHub Pro/Team. Verify your plan supports this for the games (`here-be-hordes`, `brackish-rising`, `yesandscheduler`) before relying on it. The YaE-hosted mirrors don't depend on Pages from those repos.

5. **Sponsor / social-preview / pinned-issue config.** Out of scope for this pass. If you want, the same `gh api -X PATCH` pattern handles sponsor links and pinned issues; ask and I'll extend the runbook.

## Verification after applying

```powershell
foreach ($slug in @('here-be-hordes','brackish-rising','yesandbudget','yesandchains','yesandscheduler','yesandapothecary','yesandeverything')) {
  Write-Host "=== $slug ===" -ForegroundColor Cyan
  gh repo view TheProphetKane/$slug --json description,homepageUrl,repositoryTopics,hasIssuesEnabled,hasWikiEnabled,hasProjectsEnabled,visibility | ConvertFrom-Json | Format-List
}
```

Each repo should now print a populated description, the matching homepage URL, the topics array, and the feature flags from the runbook.
