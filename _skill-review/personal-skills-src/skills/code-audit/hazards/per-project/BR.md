# Brackish Rising project-specific hazards

`X:\BrackishRising`. Industrial-medieval / WWI-naval horror RTS in Godot 4.6 (planned). Sibling project to HBH; do NOT cross-contaminate.

## Always-on checks

- All HBH always-on checks (inherits the Godot scaffolding)
- `checks/godot_uid_format.py` — BR has uuid-hex bugs from v0.30.0
- `checks/voice_violations.py` — STRICTER than other projects (hard-blocks em dash entity AND literal, inline SVG, AI tool names)

## Critical files (FUSE-truncation BLOCK)

- `docs/GDD.html`
- `source/autoloads/*.gd`
- Any file referenced by `[autoload]` in `project.godot`
- `CHANGELOG.md`
- `BACKLOG.md`
- `CLAUDE.md`

## Recurring patterns specific to BR

### HBH file inheritance pattern (HIGH on rename)

Many `.gd` files in BR's `source/` kept their HBH-era filename (`brute.gd`, `bloater.gd`, `cottage` refs, `soldier.gd`, `sniper.gd`, `shotgunner.gd`) even after the BR design renamed the feature (Wrecker / Bilgemaw / Manor / Rifleman / Marksman / Trench Sweeper). Scene preload constants reference the OLD file paths; tooltips/labels use the NEW BR names.

If audit finds a source file renamed without updating every preload site + every .tscn ext_resource line + the .uid mapping → BLOCK. Coordinated renames must queue as a single PR.

### preload() is parse-time (HIGH, recurring)

Hit BR v0.30.0 / v0.31.1 on scout.gd + harpoonist.gd. See `hazards/godot-gdscript.md`.

### .tscn # comments (HIGH, recurring)

Hit BR v0.31.2 on the six HBH enemy .tscn stubs. See `hazards/godot-tscn.md`.

### Empty `if` after cut-mechanic strip (HIGH, recurring)

Hit BR v0.31.2 on building.gd. See `hazards/godot-gdscript.md`. Cascade caused 15+ files to fail to load.

### Orphan @export after cut-mechanic strip (HIGH, recurring)

Hit BR v0.31.4 on building.gd. See `hazards/godot-gdscript.md`.

### v0.20.0 const-centralization vs extends inheritance

When const-centralization deletes a local TILE_W/TILE_H block in a parent, child files that inherited via `extends "...parent.gd"` silently break. After any const-centralization on a parent, grep every child for bare `TILE_W`/`TILE_H` access.

### UID format (BLOCK on new UID)

Godot UID = `uid://b[base32]{12}`. BR v0.30.0 shipped 14-char uuid-hex UIDs. `checks/godot_uid_format.py` enforces.

## Voice rules (STRICTER than other projects)

Per BR CLAUDE.md. Hard-blocked tokens:
- Em dash (literal U+2014 AND `&mdash;`/`&ndash;`)
- "per Nick"
- AI tool names (Midjourney, Claude, ChatGPT, GPT-N, OpenAI, Anthropic)
- First-person `I`, `I'll`, `we` in changelog context
- AI vocabulary
- Inline `<svg>` in public artifacts

Hit BR v0.13.1 (two em dashes + two Midjourney references shipped) and v0.16.x (HTML-entity em dash bypassed the literal check).

Voice-violation findings on BR public artifacts are BLOCK (not MEDIUM as on other projects).

## Lore boundary (HIGH)

Per HBH CLAUDE.md "Lore Direction" and BR CLAUDE.md "Sibling projects". BR is Out of the Depths direction. HBH is Alien Portal canonical. Cross-contamination either way (Alien Portal lore in BR source, or coral/brackish/Navy refs in HBH source) → BLOCK.

## Asset attribution

BR artist is "Navy" (since 2026-05-24). Credit "Navy's [asset type]". Never name the upstream art tool. Working filenames are not pack names — don't infer.

## Release pipeline rule

All BR pushes go through `.\scripts\release.ps1`. Raw `git push` or plumbing-level commits bypass `publish-gdd.ps1` and the gate page goes stale. Detect: if HEAD has a commit message NOT matching the release.ps1 pattern (`feat(brackish): vX.Y.Z - ...`) within the last 24 hours → MEDIUM finding.
