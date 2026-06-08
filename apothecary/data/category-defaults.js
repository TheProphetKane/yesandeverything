// category-defaults.js: per-botanical-category representative slug.
//
// LOCKED DECISION (v0.8.2): no SVG anywhere in the ingredient or symbol slots.
//
// HISTORICAL (pre-v0.15): this mapped a botanical category to a representative
// herb's PNG so a herb with no art of its own could fall back to a category
// stand-in. That fallback ran against data/ingredients/<slug>.png, which was
// removed once the renderer went library-only. The v0.15 botanical renderer
// resolves art from data/illustrations/ by keyword (state.illustration or the
// herb-to-illustration auto-match) and hides the slot when nothing matches; it
// does not consult this map. The module is still imported in main.js but its
// slug is no longer read by render.js. Retained pending removal.

export const CATEGORY_DEFAULTS = {
  flower:   'chamomile',     // recognized daisy-like flower silhouette
  herb:     'basil',         // classic leafy herb
  root:     'ginger',        // gnarled rhizome
  resin:    'frankincense',  // resin droplets / boswellia
  mushroom: 'shiitake',      // cap-and-stem mushroom
  bark:     'oak bark',      // tree-bark cross-section
  berry:    'black pepper',  // small clustered berry
  seed:     'cumin',         // scattered umbellifer seeds
  bulb:     'garlic',        // classic bulb
  peel:     'lemon peel',    // citrus zest curl
};

// Slug rule matches render.js ingredientSlug: lowercase, apostrophes
// stripped, whitespace hyphenated. The renderer applies this transform
// at use time; this map carries the raw herb keys as they appear in
// data/herbs.json.
export function categoryDefaultSlug(category) {
  const raw = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS.herb;
  return String(raw).toLowerCase().replace(/'/g, '').replace(/\s+/g, '-');
}
