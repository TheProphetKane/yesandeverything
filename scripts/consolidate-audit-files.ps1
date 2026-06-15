# consolidate-audit-files.ps1
# One-shot cleanup of audit / scheduled-task report artifacts across all repos.
#
# For each repo:
#   - clears any stale .git/index.lock (FUSE leaves these pinned)
#   - keeps the NEWEST file of each report type on disk (drift-auto-fix needs
#     the latest CANONICAL_AUDIT to exist), untracks it so .gitignore takes over
#   - deletes every older dated copy and untracks it
#   - stages ONLY .gitignore + the report removals, so feature WIP is untouched
#   - commits and pushes
#
# Matches: *AUDIT-YYYY-MM-DD*.md, BAR_RAISE-YYYY-MM-DD*.md,
#          CONSTELLATION-YYYY-MM-DD*.md, drift-fixes-YYYY-MM-DD*.md, digest-YYYY-MM-DD*.md
# Never matches BAR_RAISE_ROADMAP.md / BAR_RAISE_HANDOVER.md (underscore, no date).

$repos = [ordered]@{
  'YesAndEverything' = 'X:\YesAndEverything'
  'YesAndBudget'     = 'X:\YesAndBudget'
  'Scheduler'        = 'X:\YesAndScheduler'
  'HereBeHordes'     = 'X:\HereBeHordes'
  'YesAndChains'     = 'X:\YesAndChains'
  'YesAndApothecary' = 'X:\YesAndApothecary'
  'BrackishRising'   = 'X:\BrackishRising'
}

$matchRe = [regex]'(?i)^(.*AUDIT-20\d\d-\d\d-\d\d.*|BAR_RAISE-20\d\d-\d\d-\d\d.*|CONSTELLATION-20\d\d-\d\d-\d\d.*|drift-fixe?s?-20\d\d-\d\d-\d\d.*|digest-20\d\d-\d\d-\d\d.*)\.md$'
$dateRe  = [regex]'(20\d\d-\d\d-\d\d)'

function Get-TypeKey([string]$n) {
  $m = $dateRe.Match($n)
  if ($m.Success) { return $n.Substring(0, $m.Index).TrimEnd('-','_') }
  return $n
}

foreach ($name in $repos.Keys) {
  $root = $repos[$name]
  if (-not (Test-Path $root)) { Write-Host "$name : MISSING, skipped"; continue }
  Set-Location $root
. (Join-Path $PSScriptRoot "git-guard.ps1")
  # [git-guard] superseded by Assert-GitSafe: Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue

  $docs = Join-Path $root 'docs'
  if (-not (Test-Path $docs)) { Write-Host "$name : no docs/, gitignore only"; }

  $keepCount = 0; $delCount = 0
  if (Test-Path $docs) {
    $files = Get-ChildItem $docs -File | Where-Object { $matchRe.IsMatch($_.Name) }
    if ($files) {
      foreach ($g in ($files | Group-Object { Get-TypeKey $_.Name })) {
        $sorted = @($g.Group | Sort-Object Name)
        $keep   = $sorted[-1]
        # untrack the newest but leave it on disk
        git rm --cached --quiet -- $keep.FullName 2>$null
        $keepCount++
        if ($sorted.Count -gt 1) {
          foreach ($old in $sorted[0..($sorted.Count-2)]) {
            git rm -f --quiet -- $old.FullName 2>$null
            if (Test-Path $old.FullName) { Remove-Item -Force $old.FullName -ErrorAction SilentlyContinue }
            $delCount++
          }
        }
      }
    }
  }

  Assert-GitSafe

  git add -- .gitignore 2>$null
  Assert-GitSafe
  git commit -m "chore: untrack + prune audit/scheduled-task reports, keep latest per type" --quiet 2>$null
  if ($LASTEXITCODE -eq 0) { git push --quiet 2>$null }
  Write-Host "$name : kept $keepCount latest, removed $delCount old"
}

Set-Location 'X:\YesAndEverything'
. (Join-Path $PSScriptRoot "git-guard.ps1")
Write-Host "`nDone. Future audit/report files are gitignored in every repo."
