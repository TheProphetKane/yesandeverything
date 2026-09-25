# wrangler-version.ps1: the one pinned wrangler version every deploy script here reads.
#
# Bar-raise 2026-09-24, dependency-01: three deploy scripts each ran a bare `npx wrangler`,
# so whichever version npm resolved that day is whatever shipped, and nothing in this
# repository said which one it was. There is no package.json anywhere in this static-site
# repo, and adding one just to pin three scripts would put an install step ahead of every
# deploy, breaking the one-command shape those scripts already have. A dot-sourced variable
# keeps that shape: `npx --yes "wrangler@$WranglerVersion" <command>` still resolves and runs
# in a single call, npx caches the pinned version after the first fetch, and every script
# that deploys reads the same value from here instead of typing its own.
#
# To move the pin: change the version below, run every deploy once to prove it, commit.
#
#     . (Join-Path $PSScriptRoot "..\..\scripts\wrangler-version.ps1")   # from workers/<name>/
#     . (Join-Path $PSScriptRoot "..\scripts\wrangler-version.ps1")      # from dashboard-api/
#     & npx --yes "wrangler@$WranglerVersion" deploy

$WranglerVersion = "4.139.0"
