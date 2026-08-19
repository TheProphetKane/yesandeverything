# MOVED 2026-08-19: the work queue lives in X:\PortfolioOps\queue\ now.
# This shim forwards so an unpatched caller still edits the ONE real queue
# file. Update the caller to X:\PortfolioOps\queue\queue-edit.ps1.
Write-Warning "queue-edit.ps1 moved to X:\PortfolioOps\queue\queue-edit.ps1; update this caller."
& 'X:\PortfolioOps\queue\queue-edit.ps1' @args
exit $LASTEXITCODE
