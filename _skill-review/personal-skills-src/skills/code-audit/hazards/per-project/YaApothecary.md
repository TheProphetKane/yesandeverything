# YesAndApothecary project-specific hazards

`X:\YesAndApothecary`. Browser-based Celtic apothecary label designer. Vanilla JS, native ES modules, no build step, no framework.

## Always-on checks

- `checks/secret_exposure.py` (`.discord_webhook.txt`)
- `checks/version_drift.py` (PROJECT_SPEC.md "Version pill" + CHANGELOG.md first entry + index.html `<span class="version-pill">` + git tag — ALL FOUR must agree)
- `checks/voice_violations.py` (CHANGELOG.md, README.md, DEPLOY.md, PROJECT_SPEC.md)

## Architecture rules (BLOCK on violation)

### Schema-driven pattern is non-negotiable

Renderer reads a template descriptor from `data/label-templates.js`. Editor reads the same descriptor for which fields to expose. Adding a new label kind is a new entry in `label-templates.js` PLUS any item renderers in `render.js`.

Code that hardcodes label structure into HTML or the renderer → BLOCK.

### Native modules only

No imports from npm. No bundler. If new code wants to add a library, the PROJECT_SPEC.md entry must be written first with justification.

### Single state object

All writes through `state.set` or `state.patchNested`. No direct DOM-state coupling. Code that mutates DOM in the editor without routing through state → HIGH.

### Pure renderer

`render(state, container, ctx)` is the only function that touches preview DOM. Code that updates the preview from anywhere else → HIGH.

## Voice rules

PROJECT_SPEC.md, DEPLOY.md, CHANGELOG.md, README.md, and any user-visible string in the app must follow the solo-dev voice rule. See `hazards/voice-public-artifacts.md`.

## Versioning discipline

Every commit bumps the pill in THREE locations which must agree:
1. `PROJECT_SPEC.md` line `Version pill: **vX.Y.Z**`
2. `CHANGELOG.md` first `## vX.Y.Z` heading
3. `index.html` `<span class="version-pill">vX.Y.Z</span>` footer

`scripts/release.ps1` owns the bump. Do NOT hand-edit the pill before calling release; the script does it.

`scripts/check-version-pill.ps1` runs as the second pre-step inside release.ps1 and fails the release if the three sources drift. Same shape as HBH's `Test-GddIntegrity`.

## Release flow

```powershell
.\scripts\release.ps1 -Message "<concise change>"
```

Orchestrates: version-pill validator → commit + push YaApothecary → mirror runtime files into `X:\YesAndEverything\apothecary\` via robocopy /MIR → commit + push YaE mirror → Discord post (deduped).

If any new code at `X:\YesAndEverything\apothecary\` is edited DIRECTLY (instead of in YaApothecary source) → HIGH. The mirror gets overwritten on next release.
