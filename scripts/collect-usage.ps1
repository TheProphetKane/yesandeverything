# collect-usage.ps1 - aggregate per-project Claude token usage for the /dashboard/ page.
#
# Scans local session logs (Claude Code project transcripts + Cowork session
# logs), attributes each usage record to a project, buckets tokens by Central
# calendar day, prices them with the editable table below, and writes
# dashboard\data\usage.json. Incremental: a state file remembers how far into
# each log it has read, so repeat runs only process appended lines.
#
#   cd X:\YesAndEverything
#   .\scripts\collect-usage.ps1            # incremental collect + commit + push
#   .\scripts\collect-usage.ps1 -NoPush    # collect only
#   .\scripts\collect-usage.ps1 -Audit     # read-only full scan; writes a coverage
#                                          # report to docs\USAGE_AUDIT-<date>.md and
#                                          # compares against the live usage.json.
#                                          # Touches nothing else.
#   .\scripts\collect-usage.ps1 -Rescan    # rebuild ALL history from the logs with
#                                          # current attribution + dedupe rules, then
#                                          # write + push as normal.
#
# ATTRIBUTION (v2, 2026-06-11): each file's project is the MAJORITY VOTE of
# pattern hits across every line scanned, not the first hit. Per-record, a cwd
# match wins outright, then the record's own line match, then the file majority,
# then YaE. v1 stamped a whole session with the first project name seen, which
# misattributed Cowork sessions (their first lines mention every repo) and is
# why Hordes / Rising read low. State files from v1 trigger a one-time full
# re-scan automatically.
#
# DEDUPE: Claude Code writes one transcript line per content block, repeating
# the same message id + usage. v1 counted each repeat. v2 counts one usage per
# message id (keeping the last, which carries final output counts).
#
# In incremental runs a file's majority can shift as it grows; already-banked
# records keep their original attribution. Run -Rescan occasionally (or after
# any attribution change) to re-true history.
#
# Costs are API-EQUIVALENT ESTIMATES. Subscription usage is not billed per
# token; the table below exists so the numbers mean something. Edit freely.

param([switch]$NoPush, [switch]$Audit, [switch]$Rescan)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot
. (Join-Path $PSScriptRoot "git-guard.ps1")

$ATTRIB_VERSION = 18  # v18 (2026-07-10): adds Lexi (X:\YesAndLexi, private family project —
# kayak search; never publicly listed, same tier as Counselor/Skylight): kayak-scout task
# name + folder patterns + REPO_PATHS + QUEUE_ALIAS entries.
# v17 (2026-07-08): fixes Gnosis work leaking to Everything. The
# worker/site is "gnosis-yesandeverything" (HYPHEN) and the escaped pattern
# "gnosis.yesandeverything" only matched the DOT form, so every worker-name mention fell
# through to the bare "yesandeverything" -> Everything. Adds the hyphen form and the world
# name "Elder Domain" (zero-collision, pervades the vault) so Gnosis work in mixed
# sessions stops carrying-forward to Everything. Both -> Gnosis, ordered before yesandeverything.
# v16 (2026-07-07): adds blueprint-refresh -> Everything (weekly
# system-blueprint regeneration routine) and ingest-answers -> Gnosis (daily answers
# ingest routine created 2026-07-06 without a pattern).
# v15 (2026-07-06): RPG renamed to Gnosis (folder X:\YesAndGnosis,
# repo yesandgnosis, gnosis.yesandeverything.com); all RPG-era patterns now attribute to
# id "Gnosis"; adds gnosis patterns. v14 (2026-07-06): added RPG (X:\YesAndRPG, Elder Domain world
# vault + campaign wiki at rpg.yesandeverything.com) - repo patterns, task names
# (audit-rpg, bar-raise-rpg), REPO_PATHS + QUEUE_ALIAS entries.
# v13 (2026-07-06): bar-raise routines RENAMED from acronyms to
# words (bar-raise-br->rising, -hbh->hordes, -yac->chains, -yaa->apothecary,
# -yab->budget, -yaag->agents, -yae->everything); new word task-name patterns added,
# old acronym patterns kept below as historical aliases for pre-rename transcripts.
# v12 (2026-07-06): adds bar-raise-yae -> Everything (new daily
# hub-site bar-raise) and audit-counselor -> Counselor (new nightly care-audit);
# audit-yab task retired (pattern kept as a historical alias).
# v11 (2026-07-03): task-name patterns for the new per-project
# routines (audit-agents/ring/cattery/skylight, bar-raise-ring/cattery/skylight);
# bar-raise-yaag -> Agents ordered before bar-raise-yaa (substring collision had sent
# Agents' daily bar-raise to Apothecary); taskProj now persists in per-file state so
# incremental scans keep a task session's identity (it was detected on first scan
# only, then lost - long audit sessions drifted to Everything by vote majority).
# v10: adds Ring (X:\YesAndRing, FORMERLY X:\YesAndCats - it owns
                      # data\breed-art and is the TICA show tracker) + Cattery
                      # (X:\YesAndCattery, a SEPARATE breeder-marketplace project);
                      # forces a full re-scan re-truing the historical Ring/Cattery
                      # work, which ran from cwd X:\ root.
                      # v9: adds Counselor (X:\YesAndCounselor; no git, matched by
                      # content strings) + Skylight (X:\YesAndSkylight); forces a
                      # full re-scan that re-trues history.
                      # v8: scheduled-task runs attribute wholly to their task's
                      # project by the <scheduled-task name> tag, beating the
                      # queue-driven majority (fixes nightly audits landing in Everything).
                      # v7: path-less usage records inherit the last project actually
                      # touched (carry-forward context) instead of the whole-session
                      # majority, so mixed sessions split by what was touched.
                      # v6: dropped the bare "Scheduler" substring pattern that
                      # hijacked cross-project scheduled-task sessions; the legacy
                      # X:\Scheduler repo is now matched by anchored cwd path only.
                      # v5: word ids everywhere (Hordes/Rising/Chains/Scheduler/
                      # Apothecary/Budget/Everything/Agents); letter codes are
                      # permanent aliases, never canonical
                      # (v4: per-model breakdown + true horizon; v3: dedupe + ts chain)

# ----- Pricing (USD per million tokens; Anthropic published API rates) ----
# Verified against the published price list on the date below. When rates
# change: update the table AND bump $PRICING_VERSION (any date string). Costs
# are frozen into the state aggregates at scan time, so a rate change applies
# to FUTURE token use only, never retroactively (a -Rescan reprices everything
# at the current table; avoid rescanning across a rate change unless that is
# what you want). Cache rates: read = 0.1x input, 5-minute write = 1.25x input.
$PRICING_VERSION = "2026-06-10"
$PRICING = @(
  @{ match = "fable";  in = 10.0; out = 50.0; cacheRead = 1.00; cacheWrite = 12.50 },
  @{ match = "opus";   in =  5.0; out = 25.0; cacheRead = 0.50; cacheWrite =  6.25 },
  @{ match = "sonnet"; in =  3.0; out = 15.0; cacheRead = 0.30; cacheWrite =  3.75 },
  @{ match = "haiku";  in =  1.0; out =  5.0; cacheRead = 0.10; cacheWrite =  1.25 }
)
$PRICE_DEFAULT = @{ in = 3.0; out = 15.0; cacheRead = 0.30; cacheWrite = 3.75 }

# ----- Project attribution (ordered; first hit wins WITHIN a line) ---------
# Canonical ids are the WORDS. Letter codes (HBH, BR, YaC...) are aliases.
$PROJECT_PATTERNS = @(
  # scheduled-task names first: a task session belongs to its project even when
  # its prompt also mentions the YaE queue or other repos
  @{ pat = "bar-raise-yaag";      id = "Agents" },     # BEFORE bar-raise-yaa: yaa is a substring of yaag
  @{ pat = "audit-agents";        id = "Agents" },
  @{ pat = "bar-raise-ring";      id = "Ring" },
  @{ pat = "audit-ring";          id = "Ring" },
  @{ pat = "bar-raise-cattery";   id = "Cattery" },
  @{ pat = "audit-cattery";       id = "Cattery" },
  @{ pat = "bar-raise-skylight";  id = "Skylight" },
  @{ pat = "audit-skylight";      id = "Skylight" },
  @{ pat = "bar-raise-constellation"; id = "Everything" },  # cross-project by design
  @{ pat = "audit-counselor";     id = "Counselor" },   # nightly care-audit; greps YaE surfaces for leak-sweep by design
  @{ pat = "kayak-scout";         id = "Lexi" },        # twice-daily kayak sweep routine (2026-07-10)
  @{ pat = "bar-raise-gnosis";    id = "Gnosis" },
  @{ pat = "audit-gnosis";        id = "Gnosis" },
  @{ pat = "ingest-answers";      id = "Gnosis" },
  @{ pat = "blueprint-refresh";   id = "Everything" },  # weekly system-blueprint regen; cross-portfolio by design
  @{ pat = "bar-raise-rpg";       id = "Gnosis" },
  @{ pat = "audit-rpg";           id = "Gnosis" },
  # word-based bar-raise task names (renamed 2026-07-06 from acronyms; the old
  # acronym patterns remain below as historical aliases for pre-rename transcripts)
  @{ pat = "bar-raise-everything";  id = "Everything" },  # hub-site; reads other repos for the reuse lens by design
  @{ pat = "bar-raise-rising";      id = "Rising" },
  @{ pat = "bar-raise-hordes";      id = "Hordes" },
  @{ pat = "bar-raise-chains";      id = "Chains" },
  @{ pat = "bar-raise-apothecary";  id = "Apothecary" },
  @{ pat = "bar-raise-budget";      id = "Budget" },
  @{ pat = "bar-raise-agents";      id = "Agents" },
  # old acronym aliases (disabled tasks; kept so historical transcripts still attribute)
  @{ pat = "bar-raise-yae";       id = "Everything" },
  @{ pat = "audit-htbh";          id = "Hordes" },
  @{ pat = "bar-raise-hbh";       id = "Hordes" },
  @{ pat = "audit-brackish";      id = "Rising" },
  @{ pat = "bar-raise-br";        id = "Rising" },
  @{ pat = "audit-yac";           id = "Chains" },
  @{ pat = "bar-raise-yac";       id = "Chains" },
  @{ pat = "audit-scheduler";     id = "Scheduler" },
  @{ pat = "bar-raise-scheduler"; id = "Scheduler" },
  @{ pat = "audit-apothecary";    id = "Apothecary" },
  @{ pat = "bar-raise-yaa";       id = "Apothecary" },
  @{ pat = "audit-yab";           id = "Budget" },
  @{ pat = "bar-raise-yab";       id = "Budget" },
  # renamed (2026-06-13) project audit slugs; old htbh/brackish/yac/yab kept above as aliases
  @{ pat = "audit-hordes";        id = "Hordes" },
  @{ pat = "audit-rising";        id = "Rising" },
  @{ pat = "audit-chains";        id = "Chains" },
  @{ pat = "audit-budget";        id = "Budget" },
  @{ pat = "audit-everything";    id = "Everything" },
  # cross-project scheduled tasks -> Everything: they touch every repo by design,
  # so they must never attribute to whichever repo their prompt happens to mention.
  @{ pat = "loop-tick";           id = "Everything" },
  @{ pat = "queue-drain";         id = "Everything" },
  @{ pat = "queue-triage";        id = "Everything" },
  @{ pat = "handler-audit";       id = "Everything" },
  @{ pat = "working-tree-scan";   id = "Everything" },
  @{ pat = "cross-project-digest"; id = "Everything" },
  @{ pat = "self-reprompt-loop";  id = "Everything" },
  @{ pat = "usage-refresh";       id = "Everything" },   # frequent dashboard-refresh routine; runs the collector itself
  @{ pat = "claude-temp-cleanup"; id = "Everything" },   # daily local-disk cleanup routine
  # Counselor (X:\YesAndCounselor) has no dedicated session dir; its work ran
  # from root / Yes& Agents cwds, so it is matched by a strong content string,
  # not a cwd path. Placed high so it wins like a task-name identity.
  @{ pat = "appreciation-connections"; id = "Counselor" },
  # repo folder names (match X:\ paths, /mnt/ paths, and dir-encoded forms)
  @{ pat = "HereBeHordes";        id = "Hordes" },
  @{ pat = "HereThereBeHordes";   id = "Hordes" },
  @{ pat = "here-be-hordes";      id = "Hordes" },
  @{ pat = "BrackishRising";      id = "Rising" },
  @{ pat = "brackish-rising";     id = "Rising" },
  @{ pat = "YesAndChains";        id = "Chains" },
  @{ pat = "yesandchains";        id = "Chains" },
  @{ pat = "YesAndScheduler";     id = "Scheduler" },
  @{ pat = "YesAndApothecary";    id = "Apothecary" },
  @{ pat = "yesandapothecary";    id = "Apothecary" },
  @{ pat = "YesAndBudget";        id = "Budget" },
  @{ pat = "YesAndCounselor";     id = "Counselor" },
  @{ pat = "yesandcounselor";     id = "Counselor" },
  @{ pat = "spouse.yesandeverything"; id = "Counselor" },
  @{ pat = "YesAndGnosis";        id = "Gnosis" },
  @{ pat = "yesandgnosis";        id = "Gnosis" },
  @{ pat = "gnosis.yesandeverything"; id = "Gnosis" },   # dot form (custom domain)
  @{ pat = "gnosis-yesandeverything"; id = "Gnosis" },   # HYPHEN form (worker name) - MUST precede bare yesandeverything below
  @{ pat = "Elder Domain";        id = "Gnosis" },        # the world name; pervades vault content, collides with nothing
  @{ pat = "YesAndRPG";           id = "Gnosis" },
  @{ pat = "yesandrpg";           id = "Gnosis" },
  @{ pat = "rpg.yesandeverything"; id = "Gnosis" },
  @{ pat = "YesAndSkylight";      id = "Skylight" },
  @{ pat = "yesandskylight";      id = "Skylight" },
  @{ pat = "YesAndLexi";          id = "Lexi" },
  @{ pat = "yesandlexi";          id = "Lexi" },
  @{ pat = "YesAndAgents";        id = "Agents" },
  @{ pat = "yesandagents";        id = "Agents" },
  @{ pat = "YesAndRing";          id = "Ring" },
  @{ pat = "yesandring";          id = "Ring" },
  @{ pat = "ring.yesandeverything"; id = "Ring" },
  @{ pat = "YesAndCattery";       id = "Cattery" },
  @{ pat = "yesandcattery";       id = "Cattery" },
  @{ pat = "YesAndCats";          id = "Ring" },       # old name of Ring (X:\YesAndCats -> X:\YesAndRing); owns data\breed-art
  @{ pat = "yesandcats";          id = "Ring" },
  @{ pat = "YesAndEverything";    id = "Everything" },
  @{ pat = "yesandeverything";    id = "Everything" },
  # generic scheduled-task dir -> Everything (after project task names above)
  @{ pat = "Claude\Scheduled";    id = "Everything" },
  @{ pat = "Claude\\Scheduled";   id = "Everything" },   # JSON-escaped form in raw lines
  @{ pat = "mnt/Scheduled";       id = "Everything" },
  # legacy X:\Scheduler repo, anchored to the cwd/path form. The bare word
  # "Scheduler" in prose (e.g. "Windows Task Scheduler", or a cross-project task
  # whose prompt lists every repo) must NOT hijack a session. Real Scheduler dev
  # still attributes via YesAndScheduler + audit-scheduler above and these path
  # forms; cross-project scheduled tasks fall through to Scheduled -> Everything.
  @{ pat = "X--Scheduler";        id = "Scheduler" },
  @{ pat = "X:\Scheduler";        id = "Scheduler" },
  @{ pat = "X:\\Scheduler";       id = "Scheduler" }
)

# Permanent alias fold: anything keyed by an old id resolves to its word.
$ID_FOLD = @{
  HBH = "Hordes"; HTBH = "Hordes"; BR = "Rising"; YaC = "Chains"; YaS = "Scheduler"
  YaA = "Apothecary"; YaB = "Budget"; YaE = "Everything"; YaAg = "Agents"
  Other = "Everything"; unattributed = "Everything"
}
function Resolve-ProjectId([string]$id) {
  if ($id -and $ID_FOLD.ContainsKey($id)) { return $ID_FOLD[$id] }
  return $id
}

# ----- Scan roots: Claude Code transcripts + every Cowork session log ------
# The desktop app's data dir depends on the install type: classic exe writes
# %APPDATA%\Claude, some builds use %LOCALAPPDATA%\AnthropicClaude or
# %LOCALAPPDATA%\Claude, and the MSIX/Store package redirects Roaming writes
# into <package>\LocalCache\Roaming\Claude. Probe everything and scan
# whichever exist; missing Cowork roots mean entire sessions go uncounted.
$SCAN_ROOTS = @(
  (Join-Path $env:USERPROFILE ".claude\projects"),
  (Join-Path $env:APPDATA "Claude"),
  (Join-Path $env:LOCALAPPDATA "Claude"),
  (Join-Path $env:LOCALAPPDATA "AnthropicClaude")
)
$pkgRoot = Join-Path $env:LOCALAPPDATA "Packages"
if (Test-Path $pkgRoot) {
  Get-ChildItem $pkgRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "Claude|Anthropic" } |
    ForEach-Object {
      $SCAN_ROOTS += (Join-Path $_.FullName "LocalCache\Roaming\Claude")
      $SCAN_ROOTS += (Join-Path $_.FullName "LocalCache\Local\AnthropicClaude")
      $SCAN_ROOTS += (Join-Path $_.FullName "LocalState")
    }
}
# extra roots can be pinned here once discovered (one path per line):
$ExtraRootsFile = Join-Path $PSScriptRoot ".usage-scan-roots.txt"
if (Test-Path $ExtraRootsFile) {
  Get-Content $ExtraRootsFile | ForEach-Object { if ($_.Trim()) { $SCAN_ROOTS += $_.Trim() } }
}
$SCAN_ROOTS = @($SCAN_ROOTS | Select-Object -Unique)

# Absolute paths throughout: .NET file APIs ignore PowerShell's cwd.
# Day buckets use the Central calendar day so "today" resets at midnight
# Central everywhere, regardless of the machine or viewer timezone.
$CT = [System.TimeZoneInfo]::FindSystemTimeZoneById("Central Standard Time")
function Get-CentralDay([datetime]$ts) {
  return [System.TimeZoneInfo]::ConvertTime($ts.ToUniversalTime(), $CT).ToString("yyyy-MM-dd")
}

$DataDir = Join-Path $RepoRoot "dashboard\data"
$OutPath = Join-Path $DataDir "usage.json"
$StatePath = Join-Path $DataDir ".usage-state.json"
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }

# One compiled alternation instead of 28 IndexOf calls per line: this is the
# difference between a minutes-long first ingest and an hour-long one.
$PROJ_RX = New-Object System.Text.RegularExpressions.Regex (
  "(" + (($PROJECT_PATTERNS | ForEach-Object { [regex]::Escape($_.pat) }) -join "|") + ")"),
  ([System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Compiled)
$PROJ_MAP = @{}
foreach ($p in $PROJECT_PATTERNS) { if (-not $PROJ_MAP.ContainsKey($p.pat.ToLowerInvariant())) { $PROJ_MAP[$p.pat.ToLowerInvariant()] = $p.id } }
function Get-ProjectFor([string]$text) {
  if (-not $text) { return $null }
  $m = $PROJ_RX.Match($text)
  if ($m.Success) { return $PROJ_MAP[$m.Value.ToLowerInvariant()] }
  return $null
}

# Field extractors for raw transcript lines (no per-line JSON parse; a full
# ConvertFrom-Json on every usage line is what made big ingests crawl).
$RXC = [System.Text.RegularExpressions.RegexOptions]::Compiled
$RX_IN  = New-Object regex '"input_tokens"\s*:\s*(\d+)', $RXC
$RX_OUT = New-Object regex '"output_tokens"\s*:\s*(\d+)', $RXC
$RX_CR  = New-Object regex '"cache_read_input_tokens"\s*:\s*(\d+)', $RXC
$RX_CW  = New-Object regex '"cache_creation_input_tokens"\s*:\s*(\d+)', $RXC
$RX_MODEL = New-Object regex '"model"\s*:\s*"([^"]+)"', $RXC
$RX_TS  = New-Object regex '"timestamp"\s*:\s*"([^"]+)"', $RXC
$RX_CWD = New-Object regex '"cwd"\s*:\s*"([^"]*)"', $RXC
$RX_MID = New-Object regex '"id"\s*:\s*"(msg_[^"]+)"', $RXC
function RxVal([System.Text.RegularExpressions.Regex]$rx, [string]$s) {
  $m = $rx.Match($s)
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

function Get-Price([string]$model) {
  if ($model) {
    foreach ($p in $PRICING) {
      if ($model.IndexOf($p.match, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $p }
    }
  }
  return $PRICE_DEFAULT
}
function Get-ModelFamily([string]$model) {
  if ($model) {
    foreach ($p in $PRICING) {
      if ($model.IndexOf($p.match, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $p.match }
    }
  }
  return "other"
}

# ----- Load state -----------------------------------------------------------
$FreshScan = ($Audit -or $Rescan)
$Files = @{}   # path -> @{ length; processed; project; votes; lastMsgId }
$Agg = @{}     # project -> date -> @{ input; output; cacheRead; cacheWrite; cost }
$AggM = @{}    # project -> model family -> @{ input; output; cacheRead; cacheWrite; cost }
$PrevOldest = $null   # oldest record ever seen across runs (the log horizon)
if (-not $FreshScan -and (Test-Path $StatePath)) {
  try {
    $state = Get-Content -Raw $StatePath | ConvertFrom-Json
    if (-not $state.pricingVersion) { throw "state predates pricing versioning; full re-scan" }
    if ([int]$state.attribVersion -ne $ATTRIB_VERSION) {
      throw "state attribution v$($state.attribVersion) != v$ATTRIB_VERSION; full re-scan with vote-based attribution + dedupe"
    }
    if ($state.pricingVersion -ne $PRICING_VERSION) {
      Write-Host "INFO: pricing table changed ($($state.pricingVersion) -> $PRICING_VERSION). Existing aggregates keep their original pricing; new tokens use the new table." -ForegroundColor Yellow
    }
    if ($state.oldestRecord) { try { $PrevOldest = [datetime]$state.oldestRecord } catch { $PrevOldest = $null } }
    foreach ($prop in $state.files.PSObject.Properties) {
      $votes = @{}
      if ($prop.Value.votes) { foreach ($v in $prop.Value.votes.PSObject.Properties) { $votes[$v.Name] = [int]$v.Value } }
      $Files[$prop.Name] = @{ length = [long]$prop.Value.length; processed = [long]$prop.Value.processed; project = $prop.Value.project; votes = $votes; lastMsgId = $prop.Value.lastMsgId; lastTs = $prop.Value.lastTs; taskProj = $prop.Value.taskProj }
    }
    foreach ($row in $state.agg) {
      $rp = Resolve-ProjectId $row.p
      if (-not $Agg.ContainsKey($rp)) { $Agg[$rp] = @{} }
      if (-not $Agg[$rp].ContainsKey($row.d)) { $Agg[$rp][$row.d] = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; cost = [double]0 } }
      $b = $Agg[$rp][$row.d]
      $b.input += [long]$row.input; $b.output += [long]$row.output
      $b.cacheRead += [long]$row.cacheRead; $b.cacheWrite += [long]$row.cacheWrite; $b.cost += [double]$row.cost
    }
    if ($state.aggM) {
      foreach ($row in $state.aggM) {
        $rp = Resolve-ProjectId $row.p
        if (-not $AggM.ContainsKey($rp)) { $AggM[$rp] = @{} }
        if (-not $AggM[$rp].ContainsKey($row.m)) { $AggM[$rp][$row.m] = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; cost = [double]0 } }
        $bm = $AggM[$rp][$row.m]
        $bm.input += [long]$row.input; $bm.output += [long]$row.output
        $bm.cacheRead += [long]$row.cacheRead; $bm.cacheWrite += [long]$row.cacheWrite; $bm.cost += [double]$row.cost
      }
    }
  } catch {
    Write-Host "WARN: full rescan. ($_)" -ForegroundColor Yellow
    $Files = @{}; $Agg = @{}
  }
}

function Add-Usage([string]$proj, [string]$day, $u, [string]$model) {
  $in  = [long]($u.input_tokens); if (-not $in) { $in = 0 }
  $out = [long]($u.output_tokens); if (-not $out) { $out = 0 }
  $cr  = [long]($u.cache_read_input_tokens); if (-not $cr) { $cr = 0 }
  $cw  = [long]($u.cache_creation_input_tokens); if (-not $cw) { $cw = 0 }
  if (($in + $out + $cr + $cw) -eq 0) { return }
  $price = Get-Price $model
  $cost = ($in * $price.in + $out * $price.out + $cr * $price.cacheRead + $cw * $price.cacheWrite) / 1e6
  if (-not $Agg.ContainsKey($proj)) { $Agg[$proj] = @{} }
  if (-not $Agg[$proj].ContainsKey($day)) { $Agg[$proj][$day] = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; cost = [double]0 } }
  $b = $Agg[$proj][$day]
  $b.input += $in; $b.output += $out; $b.cacheRead += $cr; $b.cacheWrite += $cw; $b.cost += $cost
  # per-model family rollup: which model burned what, per project, all-time
  $fam = Get-ModelFamily $model
  if (-not $AggM.ContainsKey($proj)) { $AggM[$proj] = @{} }
  if (-not $AggM[$proj].ContainsKey($fam)) { $AggM[$proj][$fam] = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; cost = [double]0 } }
  $bm = $AggM[$proj][$fam]
  $bm.input += $in; $bm.output += $out; $bm.cacheRead += $cr; $bm.cacheWrite += $cw; $bm.cost += $cost
}

# ----- Scan -----------------------------------------------------------------
$scannedFiles = 0; $newLines = 0; $usageRecords = 0; $dupSkipped = 0; $fallbackYaE = 0; $tsFallbacks = 0
# one message id = one usage, across ALL files in the run (transcript copies
# and interleaved repeats otherwise double-count)
$SeenMsg = New-Object 'System.Collections.Generic.HashSet[string]'
$oldestTs = $null; $newestTs = $null
$fileTotals = @()   # audit detail: per-file resolved project + token sum

foreach ($root in $SCAN_ROOTS) {
  if (-not (Test-Path $root)) { Write-Host "INFO: $root not found, skipping." -ForegroundColor DarkGray; continue }
  $logs = Get-ChildItem -Path $root -Filter *.jsonl -Recurse -File -ErrorAction SilentlyContinue
  # Only session TRANSCRIPTS carry billable usage. App roots also hold
  # file-history and other jsonl logs whose text can look usage-shaped and
  # whose mtimes are always fresh; counting those inflates "today".
  if ($root -notlike "*\.claude\projects") {
    $logs = @($logs | Where-Object { $_.FullName -match "\\\.claude\\projects\\" })
  }
  Write-Host ("  root {0} -> {1} transcript file(s)" -f $root, @($logs).Count) -ForegroundColor DarkGray
  foreach ($f in $logs) {
    $key = $f.FullName
    $prev = $null
    if (-not $FreshScan) { $prev = $Files[$key] }
    if ($prev -and $prev.length -eq $f.Length) { continue }
    $processed = 0
    $votes = @{}
    $lastMsgId = $null
    $lastTs = $null
    if ($prev) {
      $processed = $prev.processed
      if ($prev.votes) { $votes = $prev.votes }
      $lastMsgId = $prev.lastMsgId
      if ($prev.lastTs) { try { $lastTs = [datetime]$prev.lastTs } catch { $lastTs = $null } }
    }
    $scannedFiles++
    if ($scannedFiles % 25 -eq 0) { Write-Host ("  ...{0} file(s) in, {1} usage record(s) so far" -f $scannedFiles, $usageRecords) -ForegroundColor DarkGray }

    $fs = $null
    try { $fs = [System.IO.File]::Open($key, "Open", "Read", "ReadWrite") }
    catch { Write-Host "WARN: cannot open $key ($($_.Exception.Message)); skipped." -ForegroundColor Yellow; continue }
    try {
      if ($processed -gt 0 -and $processed -le $fs.Length) { $fs.Seek($processed, "Begin") | Out-Null } else { $processed = 0 }
      $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
      $chunk = $sr.ReadToEnd()
      # Only count fully-terminated lines; an in-flight session may be mid-write
      # on the last line. Leave the partial tail for the next run.
      $lastNl = $chunk.LastIndexOf("`n")
      if ($lastNl -lt 0) { continue }
      $body = $chunk.Substring(0, $lastNl + 1)
      $byteLen = [System.Text.Encoding]::UTF8.GetByteCount($body)
      $newProcessed = $processed + $byteLen

      # Pass 1: vote + buffer usage records. Attribution resolves AFTER the
      # whole chunk has voted, so early records aren't stamped by whatever
      # project name happened to appear first. All field extraction is
      # regex-on-raw-line; no per-line JSON parsing.
      $records = New-Object System.Collections.Generic.List[object]
      $ctxProj = $null   # last project actually touched; carried forward to path-less records
      foreach ($line in $body -split "`n") {
        if (-not $line) { continue }
        $newLines++
        $lineHit = Get-ProjectFor $line
        if ($lineHit) { if ($votes.ContainsKey($lineHit)) { $votes[$lineHit]++ } else { $votes[$lineHit] = 1 }; $ctxProj = $lineHit }
        $ui = $line.IndexOf('"usage"')
        if ($ui -lt 0) { continue }
        # read the token counts only from a small window starting at the usage
        # object, so token-count-looking text elsewhere in the line can't hit
        $win = $line.Substring($ui, [Math]::Min(600, $line.Length - $ui))
        $inS = RxVal $RX_IN $win
        $outS = RxVal $RX_OUT $win
        if ($inS -eq $null -and $outS -eq $null) { continue }
        $usage = @{
          input_tokens = [long]$(if ($inS) { $inS } else { 0 })
          output_tokens = [long]$(if ($outS) { $outS } else { 0 })
          cache_read_input_tokens = [long]$(if (($v = RxVal $RX_CR $win)) { $v } else { 0 })
          cache_creation_input_tokens = [long]$(if (($v2 = RxVal $RX_CW $win)) { $v2 } else { 0 })
        }
        $model = RxVal $RX_MODEL $line
        $msgId = RxVal $RX_MID $line
        $strong = $null
        $cwdS = RxVal $RX_CWD $line
        if ($cwdS) { $strong = Get-ProjectFor $cwdS; if ($strong) { $ctxProj = $strong } }
        $ts = $null
        $tsS = RxVal $RX_TS $line
        if ($tsS) { try { $ts = [datetime]$tsS } catch { $ts = $null } }
        # Timestamp chain: a line without its own timestamp inherits the last
        # one seen in this file. Falling back to the file's WRITE time dumped
        # whole histories into "today" whenever the app touched a file, which
        # is exactly the today-inflation bug. Creation time is the last resort.
        if ($ts) { $lastTs = $ts }
        elseif ($lastTs) { $ts = $lastTs }
        else { $ts = $f.CreationTime; $tsFallbacks++ }
        $rec = @{ strong = $strong; lineHit = $lineHit; ctx = $ctxProj; msgId = $msgId; ts = $ts; usage = $usage; model = $model }
        # Dedupe: one message id = one usage, globally. Transcript copies and
        # interleaved repeats of the same message must not double-count.
        if ($msgId) {
          if ($msgId -eq $lastMsgId) { $dupSkipped++; continue }
          if (-not $SeenMsg.Add($msgId)) { $dupSkipped++; continue }
        }
        $records.Add($rec)
      }

      # Pass 2: resolve attribution and bank the records.
      # Scheduled-task identity override: a scheduled run carries a
      # <scheduled-task name="<id>"> tag at the top of its transcript. Attribute
      # the WHOLE session to that task's project (audit-scheduler -> Scheduler,
      # cross-project tasks -> Everything), beating content majority - these
      # sessions also write to the YaE work-queue, which otherwise drags the
      # majority vote to Everything and zeroes the audited project.
      $taskProj = $null
      if ($body -match 'scheduled-task name=[''"\\]*([\w-]+)') { $taskProj = Get-ProjectFor $matches[1] }
      # incremental scans lose the head-of-file task tag; fall back to the identity
      # remembered from the first scan of this transcript
      if (-not $taskProj -and $prev -and $prev.taskProj) { $taskProj = $prev.taskProj }
      $fileProj = $null
      if ($taskProj) { $fileProj = $taskProj }
      elseif ($votes.Count -gt 0) { $fileProj = ($votes.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 1).Key }
      if (-not $fileProj) { $fileProj = Get-ProjectFor $key }
      $fileTok = [long]0
      foreach ($r in $records) {
        $proj = if ($taskProj) { $taskProj } else { $r.strong }   # scheduled-task identity wins outright
        if (-not $proj) { $proj = $r.lineHit }
        if (-not $proj) { $proj = $r.ctx }      # follow the work: last project touched
        if (-not $proj) { $proj = $fileProj }   # session majority is the last resort, not the default
        if (-not $proj) { $proj = "Everything"; $fallbackYaE++ }
        $usageRecords++
        if (-not $oldestTs -or $r.ts -lt $oldestTs) { $oldestTs = $r.ts }
        if (-not $newestTs -or $r.ts -gt $newestTs) { $newestTs = $r.ts }
        $u = $r.usage
        $fileTok += [long]($u.input_tokens) + [long]($u.output_tokens)
        Add-Usage $proj (Get-CentralDay $r.ts) $u $r.model
        if ($r.msgId) { $lastMsgId = $r.msgId }
      }
      if ($Audit -and $fileTok -gt 0) {
        $fileTotals += [pscustomobject]@{ path = $key; project = $(if ($fileProj) { $fileProj } else { "Everything" }); tokens = $fileTok }
      }
      $Files[$key] = @{ length = $f.Length; processed = $newProcessed; project = $fileProj; votes = $votes; lastMsgId = $lastMsgId; lastTs = $(if ($lastTs) { $lastTs.ToString("o") } else { $null }); taskProj = $taskProj }
    } catch {
      Write-Host "WARN: error reading $key ($($_.Exception.Message)); file skipped this run." -ForegroundColor Yellow
    } finally {
      $fs.Dispose()
    }
  }
}
if ($PrevOldest -and (-not $oldestTs -or $PrevOldest -lt $oldestTs)) { $oldestTs = $PrevOldest }
Write-Host "Scanned $scannedFiles file(s), $newLines line(s), $usageRecords usage record(s), $dupSkipped duplicate(s) merged, $fallbackYaE unattributed->YaE, $tsFallbacks timestamp fallback(s)." -ForegroundColor Green
if ($oldestTs) { Write-Host ("Log horizon: oldest surviving record {0:yyyy-MM-dd}, newest {1:yyyy-MM-dd}. Transcripts older than the retention window are purged from disk and cannot be recovered." -f $oldestTs, $newestTs) -ForegroundColor DarkGray }

# All-time must never regress. Transcripts purge on retention, so a full rescan
# rebuilds the aggregate from a shrinking window and would otherwise ratchet the
# total DOWN. The git-tracked usage-log ledger survives purges; use its per-field
# high-water mark as a floor so each project's all-time can only ever rise.
function Get-LedgerHighWater([string]$proj) {
  $hw = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; costUSD = [double]0 }
  $dir = Join-Path $RepoRoot "usage-log"
  if (-not (Test-Path $dir)) { return $hw }
  # Include EVERY ledger whose id folds to this project, so pre-migration short
  # codes (HBH, YaC, YaE, ...) that hold the stranded historical peak still floor
  # the post-migration word-id total. Per-field MAX, so no tokens are ever lost.
  foreach ($lf in (Get-ChildItem -Path $dir -Filter *.jsonl -File -ErrorAction SilentlyContinue)) {
    if ((Resolve-ProjectId ([System.IO.Path]::GetFileNameWithoutExtension($lf.Name))) -ne $proj) { continue }
    foreach ($l in (Get-Content $lf.FullName)) {
      if (-not $l -or -not $l.Trim()) { continue }
      try { $e = $l | ConvertFrom-Json } catch { continue }
      if (-not $e.allTime) { continue }
      $a = $e.allTime
      if ([long]$a.input     -gt $hw.input)     { $hw.input     = [long]$a.input }
      if ([long]$a.output    -gt $hw.output)    { $hw.output    = [long]$a.output }
      if ([long]$a.cacheRead -gt $hw.cacheRead) { $hw.cacheRead = [long]$a.cacheRead }
      if ([long]$a.cacheWrite -gt $hw.cacheWrite) { $hw.cacheWrite = [long]$a.cacheWrite }
      if ([double]$a.costUSD -gt $hw.costUSD)   { $hw.costUSD   = [double]$a.costUSD }
    }
  }
  return $hw
}

# ----- Roll up --------------------------------------------------------------
$cutoff = (Get-Date).Date.AddDays(-60)
$projects = [ordered]@{}
foreach ($proj in ($Agg.Keys | Sort-Object)) {
  $allTime = @{ input = [long]0; output = [long]0; cacheRead = [long]0; cacheWrite = [long]0; costUSD = [double]0 }
  $daily = @()
  foreach ($day in ($Agg[$proj].Keys | Sort-Object)) {
    $b = $Agg[$proj][$day]
    $allTime.input += $b.input; $allTime.output += $b.output
    $allTime.cacheRead += $b.cacheRead; $allTime.cacheWrite += $b.cacheWrite
    $allTime.costUSD += $b.cost
    if ([datetime]$day -ge $cutoff) {
      $daily += [ordered]@{ d = $day; input = $b.input; output = $b.output; cacheRead = $b.cacheRead; cacheWrite = $b.cacheWrite; costUSD = [math]::Round($b.cost, 4) }
    }
  }
  $allTime.costUSD = [math]::Round($allTime.costUSD, 2)
  # floor at the durable ledger high-water so a purge-shrunk rescan can't regress all-time
  $hw = Get-LedgerHighWater $proj
  if ($hw.input     -gt $allTime.input)     { $allTime.input     = $hw.input }
  if ($hw.output    -gt $allTime.output)    { $allTime.output    = $hw.output }
  if ($hw.cacheRead -gt $allTime.cacheRead) { $allTime.cacheRead = $hw.cacheRead }
  if ($hw.cacheWrite -gt $allTime.cacheWrite) { $allTime.cacheWrite = $hw.cacheWrite }
  if ($hw.costUSD   -gt $allTime.costUSD)   { $allTime.costUSD   = [math]::Round($hw.costUSD, 2) }
  $sessions = @($Files.Keys | Where-Object { $Files[$_].project -eq $proj }).Count
  $models = [ordered]@{}
  if ($AggM.ContainsKey($proj)) {
    foreach ($fam in ($AggM[$proj].Keys | Sort-Object)) {
      $bm = $AggM[$proj][$fam]
      $models[$fam] = [ordered]@{ input = $bm.input; output = $bm.output; cacheRead = $bm.cacheRead; cacheWrite = $bm.cacheWrite; costUSD = [math]::Round($bm.cost, 2) }
    }
  }
  $projects[$proj] = [ordered]@{ allTime = $allTime; sessions = $sessions; models = $models; daily = $daily }
}
# the true horizon: oldest day in the aggregates (incremental scans only see
# NEW lines, so the scan-time oldest alone would drift forward to "today")
foreach ($proj in $Agg.Keys) {
  foreach ($day in $Agg[$proj].Keys) {
    try { $dd = [datetime]$day } catch { continue }
    if (-not $oldestTs -or $dd -lt $oldestTs) { $oldestTs = $dd }
  }
}

# ----- Audit mode: report + compare, write nothing else --------------------
if ($Audit) {
  $live = $null
  if (Test-Path $OutPath) { try { $live = Get-Content -Raw $OutPath | ConvertFrom-Json } catch { $live = $null } }
  $today = Get-CentralDay (Get-Date)
  $reportPath = Join-Path $RepoRoot "docs\USAGE_AUDIT-$today.md"
  $L = New-Object System.Collections.Generic.List[string]
  $L.Add("# Usage coverage audit - $today")
  $L.Add("")
  $L.Add("Full fresh scan of all session logs with v$ATTRIB_VERSION attribution (majority vote + cwd override) and message-id dedupe, compared against the live ``dashboard/data/usage.json``. Read-only: no state, output, or git changes.")
  $L.Add("")
  $L.Add("Scanned $scannedFiles files / $usageRecords usage records. $dupSkipped duplicate usage lines merged. $fallbackYaE records had no attribution signal and defaulted to YaE.")
  if ($oldestTs) { $L.Add("Oldest surviving record: $($oldestTs.ToString('yyyy-MM-dd')). Anything before that has been purged from disk by transcript retention and is not recoverable.") }
  $L.Add("")
  $L.Add("## Fresh scan vs live dashboard (all-time)")
  $L.Add("")
  $L.Add("| project | in (fresh) | in (live) | out (fresh) | out (live) | cost (fresh) | cost (live) |")
  $L.Add("|---|---:|---:|---:|---:|---:|---:|")
  $allIds = New-Object System.Collections.Generic.HashSet[string]
  foreach ($k in $projects.Keys) { [void]$allIds.Add($k) }
  if ($live -and $live.projects) { foreach ($pp in $live.projects.PSObject.Properties) { [void]$allIds.Add($pp.Name) } }
  foreach ($id in ($allIds | Sort-Object)) {
    $fa = if ($projects.Contains($id)) { $projects[$id].allTime } else { @{ input = 0; output = 0; costUSD = 0 } }
    $la = $null
    if ($live -and $live.projects -and $live.projects.PSObject.Properties[$id]) { $la = $live.projects.$id.allTime }
    if (-not $la) { $la = @{ input = 0; output = 0; costUSD = 0 } }
    $L.Add(("| {0} | {1:n0} | {2:n0} | {3:n0} | {4:n0} | `${5:n2} | `${6:n2} |" -f $id, [long]$fa.input, [long]$la.input, [long]$fa.output, [long]$la.output, [double]$fa.costUSD, [double]$la.costUSD))
  }
  $L.Add("")
  $L.Add("## Largest sessions by tokens (attribution spot-check)")
  $L.Add("")
  foreach ($ft in ($fileTotals | Sort-Object tokens -Descending | Select-Object -First 20)) {
    $L.Add(("- ``{0}`` -> **{1}** ({2:n0} in+out)" -f $ft.path, $ft.project, $ft.tokens))
  }
  $L.Add("")
  $L.Add("To adopt these numbers: ``.\scripts\collect-usage.ps1 -Rescan``")
  $L.Add("")
  [System.IO.File]::WriteAllText($reportPath, ($L -join "`n"), [System.Text.UTF8Encoding]::new($false))
  Write-Host "Audit report: $reportPath" -ForegroundColor Green
  foreach ($proj in $projects.Keys) {
    $a = $projects[$proj].allTime
    Write-Host ("  {0,-14} {1,12:n0} in / {2,12:n0} out  ~ `${3,9:n2}" -f $proj, $a.input, $a.output, $a.costUSD) -ForegroundColor DarkGray
  }
  exit 0
}

# ----- Publish-boundary exclusion --------------------------------------------
# Projects listed here are dropped from usage.json / queue.json / the ledger.
# Agents was excluded 2026-07-06 (full delist) but RESTORED 2026-07-08 (Kane):
# it's tracked on the robots-gated dashboard/status analytics tier again, so its
# usage attribution flows through. It stays off the public homepage grid, which
# is enforced in index.html + update-project-pages.mjs (no Agents card/slug), not
# here. Empty = nothing excluded.
$PUBLIC_EXCLUDE = @()
foreach ($x in $PUBLIC_EXCLUDE) { if ($projects.Contains($x)) { $projects.Remove($x) } }

# ----- Build usage.json ------------------------------------------------------
$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  pricingVersion = $PRICING_VERSION
  pricingNote = "Anthropic published API rates as of $PRICING_VERSION; rate changes apply forward only (costs freeze into history at scan time)"
  oldestRecord = $(if ($oldestTs) { $oldestTs.ToString("yyyy-MM-dd") } else { $null })
  projects = $projects
}

function Write-ValidatedJson([string]$path, $obj) {
  $json = ($obj | ConvertTo-Json -Depth 10) -replace "`r`n", "`n"
  if (-not $json.EndsWith("`n")) { $json += "`n" }
  $tmp = "$path.tmp"
  [System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))
  $null = (Get-Content -Raw $tmp | ConvertFrom-Json)   # must parse before it may replace the live file
  Move-Item -Force $tmp $path
  $back = [System.IO.File]::ReadAllText($path)
  if ($back.Contains([char]0)) { throw "NUL bytes in $path after write" }
  $null = ($back | ConvertFrom-Json)                   # verify-before-done: re-parse the fresh read
}

Write-ValidatedJson $OutPath $payload
Write-Host "Wrote $OutPath ($([math]::Round((Get-Item $OutPath).Length / 1kb, 1)) KB)." -ForegroundColor Green

# ----- Per-project usage log (lives ONLY in this repo) ---------------------
# Transcripts get purged on retention; git does not. Each collect run appends
# a cumulative per-model snapshot per project to usage-log\<id>.jsonl (skipped
# when nothing changed), stamping the project's current version + HEAD commit
# read from its repo WITHOUT writing anything there. The snapshot series in
# this repo's git history makes model attribution and cost calculable for any
# era, forever, with zero assumptions. Delta for a span = last line minus
# first line of the span.
$REPO_PATHS = @{
  Hordes = "X:\HereBeHordes"; Rising = "X:\BrackishRising"; Chains = "X:\YesAndChains"
  Scheduler = "X:\YesAndScheduler"; Apothecary = "X:\YesAndApothecary"; Budget = "X:\YesAndBudget"
  Everything = "X:\YesAndEverything"; Agents = "X:\YesAndAgents"
  Counselor = "X:\YesAndCounselor"; Skylight = "X:\YesAndSkylight"
  Ring = "X:\YesAndRing"; Cattery = "X:\YesAndCattery"
  Gnosis = "X:\YesAndGnosis"; Lexi = "X:\YesAndLexi"
}
$LogDir = Join-Path $RepoRoot "usage-log"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
foreach ($proj in $projects.Keys) {
  try {
    $at = $projects[$proj].allTime
    $sig = "$($at.input)|$($at.output)|$($at.cacheRead)|$($at.cacheWrite)|$($at.costUSD)"
    $logPath = Join-Path $LogDir "$proj.jsonl"
    if (Test-Path $logPath) {
      $lastLine = Get-Content $logPath -Tail 1
      try { $prevE = $lastLine | ConvertFrom-Json } catch { $prevE = $null }
      if ($prevE -and $prevE.sig -eq $sig) { continue }   # nothing new to document
    }
    $ver = $null; $head = $null
    $rp = $REPO_PATHS[$proj]
    if ($rp -and (Test-Path $rp)) {
      $pkg = Join-Path $rp "package.json"
      if (Test-Path $pkg) { try { $ver = (Get-Content -Raw $pkg | ConvertFrom-Json).version } catch {} }
      if (-not $ver) {
        $pg = Join-Path $rp "project.godot"
        if (Test-Path $pg) {
          $mv = [regex]::Match((Get-Content -Raw $pg), 'config/version="([^"]+)"')
          if ($mv.Success) { $ver = $mv.Groups[1].Value }
        }
      }
      # Counselor has no .git; calling git there throws under EAP=Stop and would
      # skip the whole snapshot. Guard so a non-repo just yields a null commit.
      if (Test-Path (Join-Path $rp ".git")) {
        try { $head = (& git -C $rp rev-parse --short HEAD 2>$null) } catch { $head = $null }
      }
    }
    $entry = [ordered]@{
      at = $payload.generatedAt
      project = $proj
      version = $ver
      commit = $head
      sig = $sig
      allTime = $at
      models = $projects[$proj].models
    }
    $line = ($entry | ConvertTo-Json -Depth 5 -Compress)
    $null = ($line | ConvertFrom-Json)   # validate before touching the log
    [System.IO.File]::AppendAllText($logPath, $line + "`n", [System.Text.UTF8Encoding]::new($false))
    $tail = Get-Content $logPath -Tail 1
    $null = ($tail | ConvertFrom-Json)   # fresh-read re-parse (FUSE guard)
  } catch {
    Write-Host "WARN: usage-log snapshot for $proj failed ($_)" -ForegroundColor Yellow
  }
}
foreach ($proj in $projects.Keys) {
  $a = $projects[$proj].allTime
  Write-Host ("  {0,-14} {1,12:n0} in / {2,12:n0} out  ~ `${3,9:n2}" -f $proj, $a.input, $a.output, $a.costUSD) -ForegroundColor DarkGray
}

# ----- Save state ------------------------------------------------------------
$flat = @()
foreach ($proj in $Agg.Keys) {
  foreach ($day in $Agg[$proj].Keys) {
    $b = $Agg[$proj][$day]
    $flat += [ordered]@{ p = $proj; d = $day; input = $b.input; output = $b.output; cacheRead = $b.cacheRead; cacheWrite = $b.cacheWrite; cost = $b.cost }
  }
}
$flatM = @()
foreach ($proj in $AggM.Keys) {
  foreach ($fam in $AggM[$proj].Keys) {
    $bm = $AggM[$proj][$fam]
    $flatM += [ordered]@{ p = $proj; m = $fam; input = $bm.input; output = $bm.output; cacheRead = $bm.cacheRead; cacheWrite = $bm.cacheWrite; cost = $bm.cost }
  }
}
Write-ValidatedJson $StatePath ([ordered]@{ pricingVersion = $PRICING_VERSION; attribVersion = $ATTRIB_VERSION; oldestRecord = $(if ($oldestTs) { $oldestTs.ToString("o") } else { $null }); files = $Files; agg = $flat; aggM = $flatM })

# ----- Queue summary for the dashboard ---------------------------------------
# Live "queued" counts per project, refreshed every collect run, so the
# dashboard never shows release-stale work counts. queued = status pending
# (set to be picked up by the next sweeps); waiting = blocked / blocked-on-user.
$QueuePath = Join-Path $RepoRoot ".work-queue.json"
$QUEUE_ALIAS = @{
  htbh = "Hordes"; hbh = "Hordes"; herebehordes = "Hordes"; hordes = "Hordes"
  br = "Rising"; brackishrising = "Rising"; brackish = "Rising"; rising = "Rising"
  yac = "Chains"; chains = "Chains"; yesandchains = "Chains"
  scheduler = "Scheduler"; yas = "Scheduler"; yesandscheduler = "Scheduler"
  yaa = "Apothecary"; apothecary = "Apothecary"; yaapothecary = "Apothecary"; yesandapothecary = "Apothecary"
  yab = "Budget"; budget = "Budget"; yesandbudget = "Budget"
  yae = "Everything"; everything = "Everything"; yesandeverything = "Everything"
  yaag = "Agents"; agents = "Agents"; yesandagents = "Agents"
  counselor = "Counselor"; yesandcounselor = "Counselor"
  skylight = "Skylight"; yesandskylight = "Skylight"
  ring = "Ring"; yesandring = "Ring"; cats = "Ring"; yesandcats = "Ring"
  cattery = "Cattery"; yesandcattery = "Cattery"
  gnosis = "Gnosis"; yag = "Gnosis"; yesandgnosis = "Gnosis"; rpg = "Gnosis"; yarpg = "Gnosis"; yesandrpg = "Gnosis"
  lexi = "Lexi"; yesandlexi = "Lexi"
  all = "ALL"; cross = "ALL"; "cross-cutting" = "ALL"
}
try {
  if (Test-Path $QueuePath) {
    $q = Get-Content -Raw $QueuePath | ConvertFrom-Json
    $qCounts = @{}; $qWaiting = @{}; $qDeferred = @{}; $qItems = @()
    foreach ($it in $q.items) {
      $qp = ("" + $it.project).ToLowerInvariant()
      $key = $QUEUE_ALIAS[$qp]
      if (-not $key) { $key = "Everything" }
      if ($PUBLIC_EXCLUDE -contains $key) { continue }   # delisted projects never reach queue.json
      $st = "" + $it.status
      # An item is DEFERRED (parked, not actionable now) if flagged deferred:true or its
      # status is a deferred state. "queued" must stay IMMEDIATELY ACTIONABLE, so a
      # deferred-but-pending item is counted under deferred, never queued.
      $isDeferred = ($it.deferred -eq $true) -or ($st -eq "deferred")
      if ($isDeferred) { $qDeferred[$key] = 1 + [int]$qDeferred[$key] }
      elseif ($st -eq "pending") { $qCounts[$key] = 1 + [int]$qCounts[$key] }
      elseif ($st -eq "blocked" -or $st -eq "blocked-on-user") { $qWaiting[$key] = 1 + [int]$qWaiting[$key] }
      # Embed the ACTIVE items (drop completed/done/wontfix) so the dashboard lists them
      # from the SAME live KV source as the counts -- not from the Pages-deployed (lagged)
      # .work-queue.json, which drifts from the counts and shows phantom/missing rows.
      if ($st -notin @("completed", "done", "wontfix")) {
        $title = "" + $it.title; if (-not $title) { $title = "" + $it.prompt }
        if (-not $title) { $title = "" + $it.body }; if (-not $title) { $title = "" + $it.id }
        $title = ($title -replace '\s+', ' ').Trim(); if ($title.Length -gt 200) { $title = $title.Substring(0, 200) }
        $why = "" + $it.deferReason; if (-not $why) { $why = "" + $it.blockedReason }; if (-not $why) { $why = "" + $it.deferredReason }
        $qItems += [ordered]@{
          id = "" + $it.id; project = "" + $it.project; priority = "" + $it.priority
          status = $st; deferred = [bool]$isDeferred; title = $title; reason = ($why -replace '\s+', ' ').Trim()
        }
      }
    }
    Write-ValidatedJson (Join-Path $DataDir "queue.json") ([ordered]@{
      generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
      queued = $qCounts
      waiting = $qWaiting
      deferred = $qDeferred
      items = $qItems
    })
    Write-Host "Wrote queue.json (live queued counts per project)." -ForegroundColor Green
  }
} catch {
  Write-Host "WARN: queue summary failed ($_)" -ForegroundColor Yellow
}

# ----- Push to the live dashboard (Cloudflare KV) ----------------------------
# The dashboard reads usage.json + queue.json from the usage-yesandeverything
# Worker (KV-backed) so the live page updates in seconds on every run, with NO
# GitHub Pages build (Pages rebuilds the whole site per push and is rate-limited
# to ~10/hr, which froze the dashboard on 2026-06-23). Writes use the owner's
# authenticated wrangler CLI, so there is no ingest secret in the repo. The git
# commit below still runs as a durable history/backup of the same JSON.
#
# Relax EAP to Continue BEFORE the wrangler calls (not just before git below):
# wrangler writes normal progress to stderr, and under EAP=Stop the `2>&1`
# redirect promotes that into a terminating NativeCommandError that the catch
# reports as "errored" even when the push exits 0. The $LASTEXITCODE check is
# the real success signal. Same stderr-wrap class fixed in the HBH release
# scripts (push-to-github / publish-gdd / write-dashboard-status).
$ErrorActionPreference = "Continue"
$KV_NS = "3c33ecd9b31e4d769f5cfb7dc5e12ab9"
foreach ($pair in @(@{ k = "usage"; f = $OutPath }, @{ k = "queue"; f = (Join-Path $DataDir "queue.json") })) {
  # NOTE: use simple local vars in the wrangler call. A bareword like "--path=$pair.f"
  # expands only $pair (-> "System.Collections.Hashtable") and keeps ".f" literal, so
  # wrangler gets a garbage path. Simple $vars expand correctly; property access does not.
  $kvKey = $pair.k
  $kvFile = $pair.f
  if (-not (Test-Path $kvFile)) { continue }
  try {
    & wrangler kv key put --namespace-id=$KV_NS $kvKey --path=$kvFile --remote 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "KV: pushed $kvKey to the live dashboard." -ForegroundColor Green }
    else { Write-Host "KV: push of $kvKey failed (exit $LASTEXITCODE); live dashboard lags until the next push." -ForegroundColor Yellow }
  } catch { Write-Host "KV: push of $kvKey errored ($_)" -ForegroundColor Yellow }
}

# Bundle the per-project status JSON (status/data/<Project>.json: version, milestone,
# completion, queued, bar-raise verdict, audit pointer) into one "statuses" blob and push
# it to KV too, so the dashboard's completion/version data is live as well -- not gated by
# GitHub Pages builds the way the static status files are. Each project's release writes its
# own status/data/<Project>.json BEFORE calling this collector, so this captures fresh values.
try {
  $statusDir = Join-Path $RepoRoot "status\data"
  if (Test-Path $statusDir) {
    $bundle = [ordered]@{}
    foreach ($sf in (Get-ChildItem -Path $statusDir -Filter *.json -File)) {
      if ($sf.Name -eq "constellation.json") { continue }   # rollup, not a project card
      $sid = [System.IO.Path]::GetFileNameWithoutExtension($sf.Name)
      try { $bundle[$sid] = (Get-Content -Raw $sf.FullName | ConvertFrom-Json) }
      catch { Write-Host "KV statuses: skipped $($sf.Name) (parse error)" -ForegroundColor Yellow }
    }
    $statusTmp = Join-Path ([System.IO.Path]::GetTempPath()) "yae-statuses.kv.json"
    [System.IO.File]::WriteAllText($statusTmp, ($bundle | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
    & wrangler kv key put --namespace-id=$KV_NS statuses --path=$statusTmp --remote 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "KV: pushed statuses ($($bundle.Count) projects) to the live dashboard." -ForegroundColor Green }
    else { Write-Host "KV: push of statuses failed (exit $LASTEXITCODE); status side lags until the next push." -ForegroundColor Yellow }
    Remove-Item -Path $statusTmp -ErrorAction SilentlyContinue
  }
} catch { Write-Host "KV: statuses bundle errored ($_)" -ForegroundColor Yellow }

# ----- Commit + push ---------------------------------------------------------
if ($NoPush) { Write-Host "NoPush set; usage.json updated locally only." -ForegroundColor DarkGray; exit 0 }
# EAP is already Continue from the KV-push block above (same git/native-stderr
# stderr-wrap reason); the git calls below rely on $LASTEXITCODE checks.
# Never block on a credential prompt. A scheduled run with no cached creds would
# otherwise hang on `git push` forever; combined with the task's IgnoreNew, that
# one zombie blocks every later run and freezes the dashboard (root cause of the
# 2026-06-23 stall). Fail fast instead so the local commit still lands.
$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "Never"
foreach ($lockName in @("index.lock", "HEAD.lock")) {
  $lock = ".git\$lockName"
  if (Test-Path $lock) { Remove-Item -Force $lock -ErrorAction SilentlyContinue }
}
Assert-GitSafe
& git add dashboard/data/usage.json dashboard/data/queue.json usage-log 2>&1 | Out-Null
$staged = git diff --cached --name-only 2>$null
if ([string]::IsNullOrWhiteSpace($staged)) { Write-Host "Nothing changed; no push." -ForegroundColor DarkGray; exit 0 }
Assert-GitSafe
& git commit -m "work: usage refresh" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "WARN: commit failed; staged only." -ForegroundColor Yellow; exit 0 }
$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) { $branch = "main" }
Assert-GitSafe
& git push origin $branch 2>&1 | Out-Null
Confirm-GitIntact
if ($LASTEXITCODE -ne 0) { Write-Host "WARN: push failed; committed locally." -ForegroundColor Yellow; exit 0 }
Write-Host "Pushed usage refresh; dashboard updates in ~30s." -ForegroundColor Green
