# Removes the stale .git\index.lock file that the Cowork FUSE mount
# routinely leaves behind. Run from the repo root any time git complains:
#   "Another git process seems to be running"
#
# Usage: .\unstick-git.ps1

$lock = Join-Path $PSScriptRoot '.git\index.lock'
if (Test-Path $lock) {
    Remove-Item $lock -Force
    Write-Host "Removed $lock" -ForegroundColor Green
} else {
    Write-Host "No lock file found — nothing to unstick." -ForegroundColor Yellow
}
