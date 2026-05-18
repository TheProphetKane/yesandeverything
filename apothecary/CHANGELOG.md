# Changelog

Semver. PATCH for fixes/tuning/doc-only. MINOR for features, templates, themes, schemas. MAJOR for breaking schema (saved-state migration required).

## v0.5.0 — 2026-05-18 — Saved labels + visual pickers + PNG export + reset-fields

Five user-facing additions:

- **Saved labels.** New sidebar lists named label snapshots stored in localStorage under key `yesandapothecary.v1.saved`. Save the current state with a name, load it back later, duplicate, rename, delete. Independent of the live state. New module: `src/util/saved-labels.js`, UI in `src/ui/saved-labels-ui.js`.
- **Visual symbol picker.** Replaces the `<select>` dropdown with a 3-column grid of clickable SVG tiles. The picker re-renders when accent color changes so the preview shows the actual color you'll print.
- **Visual rune picker.** Each rune slot gets a current-rune button (char + name) plus a 6×4 grid popover with all 24 Elder Futhark runes. Click a rune to select. Click outside to dismiss. Selecting a new rune **auto-fills the canonical meaning** from a new `data/rune-meanings.json` table so you don't have to remember Tiwaz = "Protection & Justice".
- **PNG export.** New "Save as PNG" button next to Print. Uses html2canvas (CDN) to rasterize the print-stage at 2x scale, downloads as `<herbname>.png`. The print-stage is moved offscreen during capture, then restored.
- **Per-field reset.** Each editable field gets a small ↺ button that reverts just that field to the current herb's database default. Lets you experiment with one field at a time without losing your way home.

Layout: editor panel narrowed from 42% to 38% to make room for the 240px saved-labels sidebar. Mobile breakpoint moved to 1100px (was 900px) so the three-column layout collapses gracefully.

Schema additions (additive, backwards-compatible): none. `state.runes[i].m` was already free-form; the auto-fill just sets it on rune-char change.

Files touched:

- New: `src/util/saved-labels.js`, `src/util/export-png.js`, `src/ui/saved-labels-ui.js`, `data/rune-meanings.json`.
- Updated: `src/main.js` (loads rune-meanings, mounts saved-labels sidebar), `src/ui/editor.js` (visual pickers, reset buttons, PNG button), `styles/editor.css` (sidebar + picker styles), `index.html` (html2canvas CDN, saved-aside mount point).

## v0.4.0 — 2026-05-18 — Field placement + per-herb icons + garden palette + animations

Five-axis polish pass:

- **Field placement table.** Front/Back checkboxes for 12 placeable items (Shop, Short Description, Properties, Symbol, Botanical Icon, Runes 1-3, Full Description, Traditional Uses, Notes, Pairings). Both unchecked = hidden everywhere. Defaults match the current layout. New `placement` field on state, additive for v0.1-v0.3 saved sessions.
- **Per-herb SVG icons.** New `data/icons.js` registry with 20 stylized silhouettes (one per herb). Renderer prefers the per-herb icon, falls back to the generic botanical-type SVG.
- **Celtic symbols re-researched.** All 6 redrawn with 3+ sourced citations each (Wikipedia, Britannica, Newgrange, Book of Kells, Order of Bards). The Buddhist endless knot in v0.3 was replaced with **Triquetra** (actually Celtic trinity knot).
- **Garden palette.** Deeper forest base, mossy gradient cards, soft gold glows on focus, firefly-drift particle layer behind the app. Respects `prefers-reduced-motion`.
- **Tasteful animations.** App reveal, swatch pulse on selection, back-fields slide-down, status-message fade, hover lift on buttons, frame shadow-glow.

Bug fixes:

- **Back label overlap.** Each preview card now lives in a `.label-frame` sized to post-scale dimensions so flex stacking gives correct layout space.
- **Small-label readability.** Body text dropped italic, switched to Cinzel non-italic at slightly bumped sizes. Latin name keeps its italic (single short line).
- **"Historic Uses" → "Traditional Uses"** everywhere display-facing. State field stays `historicUses` for backwards-compat.

## v0.3.0 — 2026-05-18 — Back label + plain-paper print + herb autocomplete

(See git history for full v0.3 / v0.2 / v0.1 entries.)
