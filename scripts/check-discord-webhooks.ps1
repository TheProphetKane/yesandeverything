# check-discord-webhooks.ps1
# Reports, per project, which Discord webhook URL files EXIST and which scripts READ them.
# Prints file NAMES and caller paths only. It never opens a webhook file and never prints a URL.
#
# Why it exists: every project handler used to list all five roles from
# DISCORD_WEBHOOK_NAMING.md whether or not the webhook was ever created, so a role with a live
# caller and no webhook (Chains audit digests) looked the same as a role nobody had wired.
# Ruled 2026-08-26: a handler lists a webhook only when it exists AND a script reads its file.
# This is how that claim gets checked without a session touching X:\.secrets contents.
#
# Exit 0 when every webhook has a caller and every caller has a webhook, 1 otherwise.
#
# Usage:
#   cd X:\YesAndEverything
#   .\scripts\check-discord-webhooks.ps1

$ErrorActionPreference = "Stop"

$secretsRoot = "X:\.secrets"

# Ident        = the dashboard identifier, per DISCORD_WEBHOOK_NAMING.md.
# Dynamic      = filename patterns a script builds at runtime, which no literal search can find.
# OffByRuling  = a project that deliberately has no webhooks; a missing file is the ruling working.
$projects = @(
    @{ Repo = "BrackishRising";   Ident = "Rising" },
    @{ Repo = "HereBeHordes";     Ident = "Hordes" },
    @{ Repo = "YesAndApothecary"; Ident = "Apothecary" },
    @{ Repo = "YesAndBudget";     Ident = "Budget" },
    @{ Repo = "YesAndChains";     Ident = "Chains" },
    @{ Repo = "YesAndGnosis";     Ident = "Gnosis";
       # tools/discord/post.mjs builds `.discord_${topic}_webhook.txt` from the topic name, so the
       # five per-topic webhooks have a real caller that no literal grep can see.
       Dynamic = @{ Pattern = "^\.discord_(characters|items|monsters|maps|one-shot-ideas)_webhook\.txt$";
                    Caller  = "tools/discord/post.mjs (topic name interpolated)" } },
    @{ Repo = "YesAndRing";       Ident = "Ring" },
    @{ Repo = "YesAndScheduler";  Ident = "Scheduler" },
    @{ Repo = "YesAndEverything"; Ident = "Everything"; OffByRuling = "release notifications off, Kane 2026-06-22" }
)

$gaps = @()

foreach ($p in $projects) {
    $repoPath = Join-Path "X:\" $p.Repo
    if (-not (Test-Path $repoPath)) { continue }

    Write-Host ""
    Write-Host "=== $($p.Ident)  ($($p.Repo)) ===" -ForegroundColor Cyan

    # Which webhook files exist. Names only, contents never read.
    $secretsDir = Join-Path (Join-Path $secretsRoot $p.Repo) "scripts"
    $onDisk = @()
    if (Test-Path $secretsDir) {
        $onDisk = @(Get-ChildItem -Path $secretsDir -Force -File -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -like ".discord_*webhook.txt" } |
                    ForEach-Object { $_.Name })
    }

    # Which files the repo's own code asks for. Skip .example templates and commented-out lines:
    # neither is a caller, and counting them turns a real gap into noise.
    $callers = @{}
    $searchDirs = @((Join-Path $repoPath "scripts"), (Join-Path $repoPath "tools")) |
                  Where-Object { Test-Path $_ }
    foreach ($d in $searchDirs) {
        $hits = Select-String -Path (Join-Path $d "*") -Pattern '\.discord_[a-z_-]*webhook\.txt' `
                              -AllMatches -ErrorAction SilentlyContinue
        foreach ($h in $hits) {
            if ($h.Path -like "*.example") { continue }
            if ($h.Line -match '^\s*(#|//)') { continue }
            foreach ($m in $h.Matches) {
                $name = $m.Value
                if (-not $callers.ContainsKey($name)) { $callers[$name] = @() }
                $rel = $h.Path.Replace("$repoPath\", "")
                if ($callers[$name] -notcontains $rel) { $callers[$name] += $rel }
            }
        }
    }

    # Dynamically-built filenames get their caller attributed by pattern.
    if ($p.ContainsKey("Dynamic")) {
        foreach ($f in $onDisk) {
            if ($f -match $p.Dynamic.Pattern -and -not $callers.ContainsKey($f)) {
                $callers[$f] = @($p.Dynamic.Caller)
            }
        }
    }

    $all = @(@($onDisk) + @($callers.Keys) | Sort-Object -Unique)
    if ($all.Count -eq 0) {
        $why = if ($p.ContainsKey("OffByRuling")) { "none by ruling: $($p.OffByRuling)" } else { "no webhook files and no callers" }
        Write-Host "  $why" -ForegroundColor DarkGray
        continue
    }

    foreach ($f in $all) {
        $exists = $onDisk -contains $f
        $read   = $callers.ContainsKey($f)
        if ($exists -and $read) {
            Write-Host ("  LIVE     {0}  <- {1}" -f $f, ($callers[$f] -join ", ")) -ForegroundColor Green
        } elseif ($read -and -not $exists -and $p.ContainsKey("OffByRuling")) {
            Write-Host ("  OFF      {0}  <- {1}  ({2})" -f $f, ($callers[$f] -join ", "), $p.OffByRuling) -ForegroundColor DarkGray
        } elseif ($read -and -not $exists) {
            Write-Host ("  MISSING  {0}  <- {1}  (caller runs, webhook not created)" -f $f, ($callers[$f] -join ", ")) -ForegroundColor Red
            $gaps += "$($p.Ident): $f is read by $($callers[$f] -join ', ') but no webhook exists"
        } else {
            Write-Host ("  ORPHAN   {0}  (webhook exists, nothing reads it)" -f $f) -ForegroundColor Yellow
            $gaps += "$($p.Ident): $f exists but no script reads it"
        }
    }
}

Write-Host ""
if ($gaps.Count -eq 0) {
    Write-Host "Every webhook file has a caller and every caller has a webhook." -ForegroundColor Green
    exit 0
}
Write-Host "$($gaps.Count) mismatch(es):" -ForegroundColor Red
foreach ($g in $gaps) { Write-Host "  - $g" -ForegroundColor Red }
exit 1
