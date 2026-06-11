# yac-store-launch result (partial: autonomous slice)

- Started: 2026-06-11T09:01Z
- Finished: 2026-06-11T09:08Z
- Status: blocked-on-user (autonomous portion done; remainder needs owner accounts)
- Prompt: Completion gate: launch Yes& Chains on app sites (PWA store listings; TWA for Play Store, iOS install guidance).

## What was done

Closed the documented store-readiness blocker (docs/pwa-icon-gap.md): every manifest icon claimed sizes it did not have, all six entries pointing at the 1920x1920 temp-logo. PWABuilder/Bubblewrap store packaging and the Lighthouse installability audit fail on that.

- Generated 10 real sized icons in assets/ from temp-logo on the #0a120a theme bg: icon-192, icon-512, icon-maskable-512 (mark inside 80% safe zone), apple-touch-icon-180/152/120, favicon-32/16, icon-144, icon-96.
- manifest.json: icons array now honest (6 entries, real files/sizes incl. maskable); shortcut icons repointed to icon-192; fake 640x1136 screenshot declaration corrected to actual size.
- index.html head: 7 apple-touch-icon/favicon links repointed from temp-logo to sized files. In-app brand img (line 1315) intentionally untouched; that is yac-brand-art-swap.
- sw.js: 10 icons added to PRECACHE_URLS. CACHE_VERSION not bumped (release flow owns it). node --check passes; all edits via atomic write + readback; tails verified.
- docs/pwa-icon-gap.md marked RESOLVED with derivation notes.

All changes uncommitted in the YaC tree, committed-ready. Ship via cd X:\YesAndChains; .\scripts\release.ps1 (preship gauntlet will validate).

## What remains on this gate (needs Nick)

1. Decide wrapper path: docs/APP-STORE-PATH.md recommends Capacitor over TWA (this item's prompt says TWA; the doc argues against TWA-only). Decision, then Play Console ($25) + Apple Developer ($99/yr) accounts, keystore/signing, Mac+Xcode for iOS.
2. Real device screenshots for store listings and manifest screenshots array.
3. Brand art swap before store submission (icons regenerate in one command from the final logo; derivation script noted in pwa-icon-gap.md).
4. iOS install guidance already exists at docs/INSTALL-GUIDE.md; surface it on yesandchains.com if wanted.

## Followups recommended

- None new queued; brand-art and store-account steps already exist as yac-brand-art-swap and this item.
