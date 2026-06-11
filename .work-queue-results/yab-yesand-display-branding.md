# yab-yesand-display-branding result

- Finished: 2026-06-11T16:35:00Z
- Status: done (awaiting release.ps1)

## What was done
Display-name rebrand to "Yes& Budget". No slug, folder, repo, or URL changes. Sidebar BrandMark now reads "Yes&" + gradient "Budget".

## Files touched
- apps/web/index.html: page title
- apps/web/src/App.tsx: pageTitleFor fallback, document.title (both forms), BrandMark span
- apps/web/src/hooks/useDocumentTitle.ts: BASE constant
- apps/web/src/pages/Dashboard.tsx: empty-state body copy
- apps/web/src/components/FirstLaunchConsent.tsx: consent headline
- README.md: first line
