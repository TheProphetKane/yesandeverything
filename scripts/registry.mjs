// The one project registry, read (bar-raise architecture-01, 2026-09-22).
//
// data/projects.json is the source. This module is what the Node-side consumers
// import, and it derives the per-surface shapes those consumers used to keep as
// four separate hand-maintained literals:
//
//   SLUGS       slug -> dashboard id, for the two page scripts
//   PUBLIC_COPY slug -> {name, blurb, pair, ld}, for the homepage enumerations
//
// The two browser pages cannot import this, because the site has no build step
// and every page is self-contained by convention, so stamp-project-registry.mjs
// writes their lists into them between markers and check-project-registry.mjs
// fails the release when a stamped copy has drifted.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const REGISTRY = JSON.parse(readFileSync(join(ROOT, "data", "projects.json"), "utf8"));
export const PROJECTS = REGISTRY.projects;

/* Every project with a public page, slug to dashboard id, in slug order so the
 * shape matches the literal this replaced. */
export const SLUGS = Object.fromEntries(
  PROJECTS.filter((p) => p.slug).sort((a, b) => a.slug.localeCompare(b.slug)).map((p) => [p.slug, p.id]),
);

/* The homepage's machine-readable enumerations: the meta description, the two
 * social descriptions and the JSON-LD hasPart list. Keyed by the same slugs that
 * gate the cards, so a new project cannot ship a card and miss every description
 * of the site the way cattery and gnosis once did. */
export const PUBLIC_COPY = Object.fromEntries(
  PROJECTS.filter((p) => p.slug && p.ld).map((p) => [p.slug, {
    name: p.displayName.replace(/^Yes& /, ""),
    blurb: p.blurb ?? null,
    ...(p.pair ? { pair: p.pair } : {}),
    ld: p.ld,
  }]),
);

/* What the dashboard needs, which is every project including the ones with no
 * public page, in id order. */
export const DASHBOARD_ROWS = PROJECTS
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((p) => ({
    id: p.id,
    tag: p.id,
    displayName: p.displayName,
    hue: p.hue,
    ...(p.usageOnly ? { usageOnly: true } : {}),
    ...(p.retired ? { retired: p.retired } : {}),
    ...(p.stalled ? { stalled: p.stalled } : {}),
  }));

/* What the status page needs: the projects that publish a status card, which is
 * every one that is not usage-only. `short` is the lowercased id, which is what
 * that page was already using it for. */
export const STATUS_ROWS = PROJECTS
  .filter((p) => !p.usageOnly)
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((p) => ({
    id: p.id,
    displayName: p.displayName,
    short: p.id.toLowerCase(),
    ...(p.retired ? { retired: p.retired } : {}),
    ...(p.stalled ? { stalled: p.stalled } : {}),
  }));
