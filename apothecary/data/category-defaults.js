// category-defaults.js — per-botanical-category representative PNG.
//
// LOCKED DECISION (v0.8.2): no SVG anywhere in the ingredient or symbol slots.
// When a herb doesn't have its own data/ingredients/<slug>.png, the renderer
// falls back to a representative herb's PNG that shares the botanical
// category. These are picked from herbs with reliable Wikimedia line-drawing
// matches — strong, recognizable shapes that read as "this is a <category>"
// regardless of which specific entry the user picked.
//
// If a representative's PNG itself doesn't exist on disk, the slot hides
// (img.onerror chain bottoms out). No SVG ever rendered.

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
