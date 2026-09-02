// migrate.js - saved-state migration + backfill, extracted from main.js
// (v1.0.4) so every load path shares one implementation:
//   - boot (main.js: localStorage restore)
//   - saved-label recall (saved-labels-ui.js: entries saved by older versions)
//   - test-migration.mjs (imports the shipped code instead of a fork)
//
// normalizeState(initial, ctx) takes a raw persisted snapshot from ANY prior
// schema version and returns it upgraded in place to the current shape.
// ctx carries the data registries so this module needs no imports outside
// src/ (cache-bust contract): { templates, defaultTemplateId, parchmentTextures }.

// Deliberately no static import of ../state.js. main.js loads state.js
// dynamically with a cache-busted URL and this module runs the same way; a
// static import here would pull a second, un-versioned instance that can
// serve stale code after a deploy (cache-bust contract, PROJECT_SPEC 3.1,
// bar-raise architecture-01). defaultState/defaultLayout/DEFAULT_SECTION_TITLES
// arrive via the ctx param instead, forwarded from main.js's own versioned
// import of state.js.

// bar-raise security-02 (2026-08-26): render.js interpolates state.accent,
// state.shopColor, and every per-item color/glow straight into style="..."
// attribute strings with no escaping (the text fields alongside them go
// through esc(), colors never did). A crafted value like `red" onmouseover="`
// breaks out of the attribute and injects arbitrary markup. Every field that
// ends up there gets forced through this pattern before it ever reaches
// render.js; anything that fails it resets to a safe default rather than
// rendering. Colors in this app are always browser-native <input type=color>
// or a fixed swatch, both always 3- or 6-digit hex, so the pattern costs
// nothing on legitimate state and only rejects a tampered or hand-edited one.
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Build a v0.9 layout from a pre-v0.9 saved state. Reads state.placement
// (per-item front/back booleans) and state.notesSplit (combined vs three-col
// back-bottom-row) to reconstruct what the user had, then maps onto the new
// zone shape. Anything not in placement defaults to its canonical home.
export function migrateLayoutFrom(old, defaults, ctx) {
  const baseline = ctx.defaultLayout(undefined, ctx.templates, ctx.defaultTemplateId);
  const placement = old.placement;

  // No old placement to honor -> just hand back the baseline.
  if (!placement || typeof placement !== 'object') {
    // Honor notesSplit if it was the only customization.
    if (old.notesSplit === true) splitNotesZone(baseline);
    reconcileNotesHidden(baseline);
    return baseline;
  }

  // Map old placement keys to the items they correspond to. compounds,
  // cautions, and notes are intentionally excluded; in v0.8 those three lived
  // inside the back-bottom-row composite and their placement toggles were
  // broken (the bug v0.9 fixes). They're now governed by notesSplit alone,
  // handled separately below.
  const KEY_TO_ITEM = {
    shop: 'shop',
    description: 'description',
    descFull: 'back-desc-full',
    props: 'props',
    symbol: 'symbol',
    botanical: 'botanical',
    rune1: 'rune-1',
    rune2: 'rune-2',
    rune3: 'rune-3',
    historicUses: 'historic',
    pairings: 'pairings',
  };

  // For each item, decide where it goes based on placement[key].front/back.
  // both -> appears on both sides. neither -> hidden.
  const wantFront = new Set();
  const wantBack  = new Set();
  for (const [pKey, itemKey] of Object.entries(KEY_TO_ITEM)) {
    const p = placement[pKey];
    if (!p) {
      // No record - leave it wherever the baseline put it. We figure that out
      // below by inspecting the baseline.
      continue;
    }
    if (p.front) wantFront.add(itemKey);
    if (p.back)  wantBack.add(itemKey);
  }

  // Apply wantFront/wantBack to the baseline: remove items the user hid, add
  // items the user moved to a side that doesn't have them.
  const allItemsInZones = (zones) => {
    const set = new Set();
    zones.forEach(z => z.items.forEach(i => set.add(i)));
    return set;
  };

  // Walk PRESENT items in each side; if user marked them hidden on that side,
  // strip them. If user marked them present on the opposite side, add them.
  for (const side of ['front', 'back']) {
    const want = side === 'front' ? wantFront : wantBack;
    const zones = baseline[side];
    for (const z of zones) {
      z.items = z.items.filter(item => {
        // If this item is in our key map, honor placement. Otherwise (dividers,
        // back-name, back-latin), keep as-is - those had no placement toggle.
        const tracked = Object.values(KEY_TO_ITEM).includes(item);
        if (!tracked) return true;
        // For tracked items, honor want set IF user actually had a record.
        // Items not in placement at all are kept where baseline put them.
        const pKey = Object.entries(KEY_TO_ITEM).find(([, v]) => v === item)?.[0];
        if (!pKey || !placement[pKey]) return true;
        return want.has(item);
      });
    }
    // Add items the user explicitly wanted on this side that aren't here yet.
    const present = allItemsInZones(zones);
    for (const item of want) {
      if (present.has(item)) continue;
      // Append to a sensible zone: front -> center, back -> last zone.
      const target = side === 'front'
        ? (zones.find(z => z.id === 'front-center') ?? zones[0])
        : zones[zones.length - 1];
      if (target) target.items.push(item);
    }
  }

  // notesSplit migration: replace combined "notes" with explicit "compounds"
  // + "cautions" in the back-bottom zone, set to 3-column layout.
  if (old.notesSplit === true) splitNotesZone(baseline);

  // Build hidden list: any tracked item the user explicitly turned off on
  // BOTH sides.
  const hidden = [];
  for (const [pKey, itemKey] of Object.entries(KEY_TO_ITEM)) {
    const p = placement[pKey];
    if (!p) continue;
    if (!p.front && !p.back) hidden.push(itemKey);
  }
  // Reconcile compounds/cautions/notes against zone presence: whichever isn't
  // placed lives in hidden so the picker can offer it.
  const finalPresent = new Set([
    ...allItemsInZones(baseline.front),
    ...allItemsInZones(baseline.back),
  ]);
  for (const candidate of ['compounds', 'cautions', 'notes']) {
    if (!finalPresent.has(candidate) && !hidden.includes(candidate)) {
      hidden.push(candidate);
    }
  }
  baseline.hidden = hidden;
  return baseline;
}

// Same reconciliation for the early-return path (no placement object).
export function reconcileNotesHidden(layout) {
  const present = new Set();
  layout.front.forEach(z => z.items.forEach(i => present.add(i)));
  layout.back.forEach(z => z.items.forEach(i => present.add(i)));
  const hidden = new Set(layout.hidden || []);
  for (const c of ['compounds', 'cautions', 'notes']) {
    if (present.has(c)) hidden.delete(c);
    else hidden.add(c);
  }
  layout.hidden = Array.from(hidden);
}

export function splitNotesZone(layout) {
  // Find the back-bottom zone (or any zone containing 'notes') and replace
  // 'notes' with ['compounds', 'cautions'] in-place.
  for (const z of layout.back) {
    const idx = z.items.indexOf('notes');
    if (idx >= 0) {
      z.items.splice(idx, 1, 'compounds', 'cautions');
      z.layoutMode = 'columns-3';
    }
  }
}

// Upgrade a persisted snapshot (boot restore or saved-label recall) to the
// current schema in place and return it. Mirrors the historical migration
// order main.js accreted from v0.8 through v1.0; keep additions appended and
// dated so the sequence stays readable as a history.
export function normalizeState(initial, ctx) {
  const { templates, defaultTemplateId, parchmentTextures = [] } = ctx;
  const defaults = ctx.defaultState(templates, defaultTemplateId);

  // Template + size validation. An unknown or missing templateId (retired
  // template) falls back to the default. Only the id is corrected here; the
  // layout logic below decides whether to keep a v0.9+ layout (state-owned,
  // renders fine regardless of template identity) or migrate an older shape.
  // Deliberately NOT templatePatch: that re-seeds layout, which would clobber
  // a pre-v0.9 placement/notesSplit signal before migrateLayoutFrom reads it.
  if (!initial.templateId || !templates[initial.templateId]) {
    initial.templateId = defaultTemplateId;
  }
  const tmpl = templates[initial.templateId];
  if (!initial.sizeId || !tmpl.sizes.find(s => s.id === initial.sizeId)) {
    initial.sizeId = tmpl.defaultSize;
  }

  for (const k of ['backEnabled', 'descFull', 'historicUses', 'compounds', 'cautions', 'pairings']) {
    if (typeof initial[k] === 'undefined') initial[k] = defaults[k];
  }
  if (typeof initial.nutrition === 'string' && !initial.compounds) {
    initial.compounds = initial.nutrition;
  }
  if (typeof initial.icon === 'undefined') initial.icon = defaults.icon;

  // security-02: accent and shopColor render straight into a style attribute
  // (render.js herb-name/latin/props/description/rune/shop/divider items) with
  // no escaping. Reject anything that isn't a bare hex color.
  if (typeof initial.accent !== 'string' || !HEX_COLOR_RE.test(initial.accent)) {
    initial.accent = defaults.accent;
  }
  if (typeof initial.shopColor !== 'string' || !HEX_COLOR_RE.test(initial.shopColor)) {
    initial.shopColor = defaults.shopColor;
  }

  // security-02: state.symbol resolves through ctx.symbolAliases and lands in
  // an unescaped src="data/symbols/<id>.png" attribute (render.js). 'none'
  // is the valid "no symbol" sentinel; anything else must be a known id or
  // alias. ctx.symbolIds is optional so a caller that hasn't wired the new
  // field yet (an older test harness) degrades to skipping the check rather
  // than throwing.
  if (ctx.symbolIds && initial.symbol !== 'none' && !ctx.symbolIds.has(initial.symbol)) {
    initial.symbol = defaults.symbol;
  }

  // v0.9 migration: state.layout owns zone composition. Old saved state may
  // carry state.placement (per-item front/back grid) and state.notesSplit
  // instead. Build state.layout from those signals + the canonical default,
  // then drop the retired fields.
  if (!initial.layout || !Array.isArray(initial.layout.front)) {
    initial.layout = migrateLayoutFrom(initial, defaults, ctx);
  } else {
    // Already on v0.9 shape - just ensure hidden array exists.
    if (!Array.isArray(initial.layout.hidden)) initial.layout.hidden = [];
  }
  delete initial.placement;
  delete initial.notesSplit;

  // v0.11 backfill: section titles, custom items, layout presets, border style.
  if (!initial.sectionTitles || typeof initial.sectionTitles !== 'object') {
    initial.sectionTitles = { ...ctx.DEFAULT_SECTION_TITLES };
  } else {
    // Add any new default keys that didn't exist when this state was saved.
    for (const k of Object.keys(ctx.DEFAULT_SECTION_TITLES)) {
      if (!(k in initial.sectionTitles)) initial.sectionTitles[k] = ctx.DEFAULT_SECTION_TITLES[k];
    }
  }
  if (!Array.isArray(initial.customItems))   initial.customItems = [];
  if (!Array.isArray(initial.layoutPresets)) initial.layoutPresets = [];
  if (typeof initial.borderStyle !== 'string') initial.borderStyle = 'celtic';
  // v0.14: illustration override field. Default null = auto-match.
  // security-02: a non-null value lands in an unescaped
  // src="data/illustrations/<keyword>.png" attribute (render.js), so it must
  // be a known library keyword. ctx.illustrationKeywords is optional for the
  // same reason ctx.symbolIds is above.
  if (initial.illustration === undefined) initial.illustration = null;
  if (initial.illustration !== null && ctx.illustrationKeywords) {
    if (typeof initial.illustration !== 'string' || !ctx.illustrationKeywords.has(initial.illustration)) {
      initial.illustration = null;
    }
  }
  // v0.14.2: preview-collapse persistence. Both open on first load.
  if (!initial.previewCollapse || typeof initial.previewCollapse !== 'object') {
    initial.previewCollapse = { front: false, back: false };
  }
  if (typeof initial.previewCollapse.front !== 'boolean') initial.previewCollapse.front = false;
  if (typeof initial.previewCollapse.back  !== 'boolean') initial.previewCollapse.back  = false;

  // v0.11: backfill zone.align (default 'center') on any pre-existing layout.
  // security-02: an item entry can be an object { key, color?, glow? }
  // (render.js normalizeItem); color and glow land in the same unescaped
  // style attributes as accent/shopColor above, so the same pattern applies.
  // A field that fails it is dropped rather than defaulted: render.js's
  // instanceColor/instanceGlow already fall back to state.accent / no glow
  // when the field is absent, which is the correct per-item default.
  for (const side of ['front', 'back']) {
    for (const z of (initial.layout?.[side] ?? [])) {
      if (!z.align) z.align = 'center';
      for (const it of (z.items ?? [])) {
        if (!it || typeof it !== 'object') continue;
        if (it.color !== undefined && !HEX_COLOR_RE.test(it.color)) delete it.color;
        if (it.glow !== undefined && !HEX_COLOR_RE.test(it.glow)) delete it.glow;
      }
    }
  }

  // v0.8.3: validate parchmentTexture against the manifest. Old saved states
  // may reference 'gradient' (retired) or a slot id that no longer exists
  // after re-sorting; reset those to the default (parchment-01 / lightest).
  const validIds = new Set(parchmentTextures.map(t => t.id));
  if (!validIds.has(initial.parchmentTexture)) {
    initial.parchmentTexture = parchmentTextures[0]?.id ?? 'parchment-01';
  }

  // v1.0.4: enforce the runes-length-3 invariant the renderer and editor
  // assume. Pad short/absent arrays from the defaults, truncate long ones.
  if (!Array.isArray(initial.runes)) initial.runes = [];
  initial.runes = initial.runes.slice(0, 3).map(r => ({
    c: r && typeof r.c === 'string' ? r.c : '',
    m: r && typeof r.m === 'string' ? r.m : '',
    ...(r && typeof r.n === 'string' ? { n: r.n } : {}),
  }));
  while (initial.runes.length < 3) initial.runes.push({ ...defaults.runes[initial.runes.length] });

  return initial;
}
