# yac-yesand-display-branding result

- Finished: 2026-06-11T16:35:00Z
- Status: done (awaiting release.ps1)

## What was done
Display-name rebrand to "Yes& Chains" across the YaC app surface. No slug, folder, repo, or URL changes.

## Files touched
- index.html: apple-mobile-web-app-title, application-name, og:title, og:site_name, og:image:alt, twitter:title, page title (em dash also removed: "Yes& Chains · My Bag"), sr-only h1, header brand span (now "Yes&" with the accent styling on the ampersand), brand CSS comment
- manifest.json: name "Yes& Chains" (short_name stays "Chains")
- README.md: first line
- src/legal-view.ts: service name throughout Terms + Privacy
- src/mobile-hooks-2.ts: share text + share title

## Followups
- src/ changes need the build (release.ps1 preship runs esbuild) to land in app.js.
