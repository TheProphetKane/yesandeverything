#!/usr/bin/env node
// update-project-pages.mjs - stamp live project data into the public pages.
//
// Reads status/data/<Project>.json (which every project's release.ps1 pushes
// here) and rewrites the marked spans in:
//   - index.html project cards:      <!--live:version:Proj-->...<!--/live-->
//                                    <!--live:milestone:Proj-->...<!--/live-->
//   - projects/<slug>/index.html     <!--live:version:Proj-->...<!--/live--> (keyed preferred;
//   - projects/<slug>/design.html     bare <!--live:version--> still honored)
//                                    <!--live:milestone:Proj-->...<!--/live--> (optional, prose)
//
// Runs in the Pages deploy workflow before the artifact upload, so ANY project
// release (which pushes its status JSON to this repo) redeploys the site with
// fresh numbers. Also runnable locally: node scripts/update-project-pages.mjs
// Idempotent; skips cleanly when a marker or JSON is absent.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// slug -> dashboard identifier (the status/data/<id>.json name).
// Agents is delisted from all public surfaces (2026-07-06); never add it here.
const SLUGS = {
  "apothecary": "Apothecary",
  "brackish-rising": "Rising",
  "budget": "Budget",
  "cattery": "Cattery",
  "chains": "Chains",
  "gnosis": "Gnosis",
  "here-be-hordes": "Hordes",
  "ring": "Ring",
  "scheduler": "Scheduler",
};

// Public-facing copy for the four machine-readable homepage enumerations
// (meta description, og:description, twitter:description, JSON-LD hasPart).
// Keyed by the same slugs that gate the cards so a new project cannot ship a
// card and miss every description of the site the way cattery and gnosis did.
const PUBLIC_COPY = {
  "here-be-hordes":  { name: "Here Be Hordes", blurb: "grim-dark survival RTS games in Godot", pair: "brackish-rising", ld: { "@type": "VideoGame" } },
  "brackish-rising": { name: "Brackish Rising", blurb: null, ld: { "@type": "VideoGame" } },
  "chains":          { name: "Chains", blurb: "a live disc-golf caddy PWA at yesandchains.com", ld: { "@type": "SoftwareApplication", applicationCategory: "SportsApplication", url: "https://yesandchains.com" } },
  "scheduler":       { name: "Scheduler", blurb: "a multi-tenant employee-scheduling SaaS", ld: { "@type": "SoftwareApplication", applicationCategory: "BusinessApplication" } },
  "apothecary":      { name: "Apothecary", blurb: "a browser-based Celtic label designer", ld: { "@type": "WebApplication" } },
  "budget":          { name: "Budget", blurb: "a local-first personal budget tool", ld: { "@type": "WebApplication", applicationCategory: "FinanceApplication" } },
  "ring":            { name: "Ring", blurb: "a cat-show point tracker for TICA exhibitors", ld: { "@type": "WebApplication", url: "https://ring.yesandeverything.com" } },
  "cattery":         { name: "Cattery", blurb: "a two-sided marketplace for cat breeders and buyers", ld: { "@type": "WebApplication" } },
  "gnosis":          { name: "Gnosis", blurb: "a gated worldbuilding wiki for a tabletop campaign", ld: { "@type": "WebSite", url: "https://gnosis.yesandeverything.com" } },
};
for (const slug of Object.keys(SLUGS)) {
  if (!PUBLIC_COPY[slug]) throw new Error(`PUBLIC_COPY is missing ${slug}; add it before shipping the card`);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const vfmt = (v) => { const s = String(v || "").trim(); return s ? (s.startsWith("v") ? s : "v" + s) : ""; };
const mfmt = (m) => { const raw = (m && typeof m === "object") ? (m.label || m.name || m.title || m.id || "") : m; let s = String(raw || "").replace(/\s+/g, " ").trim(); if (s.length > 52) s = s.slice(0, 49).trimEnd() + "..."; return s; };

function stamp(text, key, value) {
  if (!value) return { text, hit: false };
  const re = new RegExp(`(<!--live:${key}-->)([\\s\\S]*?)(<!--/live-->)`, "g");
  let hit = false;
  const out = text.replace(re, (_, a, _old, b) => { hit = true; return a + esc(value) + b; });
  return { text: out, hit };
}

const data = {};
for (const id of new Set(Object.values(SLUGS))) {
  const p = join(ROOT, "status", "data", `${id}.json`);
  if (existsSync(p)) {
    try { data[id] = JSON.parse(readFileSync(p, "utf8")); } catch (e) { console.error(`skip ${id}: bad JSON (${e.message})`); }
  }
}

let changed = 0, stamped = 0;

// 1. homepage cards
{
  const p = join(ROOT, "index.html");
  let t = readFileSync(p, "utf8");
  const before = t;
  for (const [id, d] of Object.entries(data)) {
    let r = stamp(t, `version:${id}`, vfmt(d.version)); t = r.text; if (r.hit) stamped++;
    r = stamp(t, `milestone:${id}`, mfmt(d.milestone)); t = r.text; if (r.hit) stamped++;
  }
  if (t !== before) {
    if (!t.trimEnd().endsWith("</html>")) throw new Error("index.html lost its tail; refusing to write");
    writeFileSync(p, t); changed++;
  }
}

// 2. per-project pages
for (const [slug, id] of Object.entries(SLUGS)) {
  const d = data[id];
  if (!d) continue;
  for (const page of ["index.html", "design.html"]) {
    const p = join(ROOT, "projects", slug, page);
    if (!existsSync(p)) continue;
    let t = readFileSync(p, "utf8");
    const before = t;
    // Keyed markers preferred (a copied page template cannot silently take
    // another project's numbers); bare version marker still honored.
    // Detail-page milestone prose carries the M-number too ("M4, Pre-Production
    // Lock"); homepage cards keep the bare label. Skip the prefix when the label
    // already says the id: several projects use the version or a slug as the
    // milestone id, and prefixing gave "v1.0, v1.0 - core label designer complete"
    // and "phase-2-built, Phase 2 built (...)". Compare with separators and case
    // stripped so "phase-2-built" matches "Phase 2 built".
    const flat = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const mlabel = mfmt(d.milestone);
    const midRaw = (d.milestone && typeof d.milestone === "object" && d.milestone.id) ? d.milestone.id : "";
    const mid = (midRaw && !flat(mlabel).startsWith(flat(midRaw))) ? `${midRaw}, ` : "";
    for (const [key, value] of [
      [`version:${id}`, vfmt(d.version)],
      ["version", vfmt(d.version)],
      [`milestone:${id}`, mid + mlabel],
    ]) {
      const r = stamp(t, key, value); t = r.text; if (r.hit) stamped++;
    }
    // Meta/social description tags and any "what's new" heading hand-embed
    // the version as plain text ("... at v0.7.1.") rather than a <!--live-->
    // marker, because HTML comments can't sit inside an attribute value. A
    // version bump then stamps the pill but leaves these frozen (Scheduler
    // carried v0.7.1 in three meta tags and a heading while its own pill read
    // v0.7.3). Rewrite any bare vX.Y.Z run inside the description/og/twitter
    // content attributes and any <h2> heading so a release can't freeze them
    // again; skip entirely if the version string isn't already present so an
    // unrelated number elsewhere in the page is never touched.
    if (page === "index.html" && vfmt(d.version)) {
      const metaRe = /(<meta (?:name="(?:description|twitter:description)"|property="og:description") content="[^"]*?)v\d+(?:\.\d+){1,3}(?:\.x)?([^"]*")/g;
      t = t.replace(metaRe, (_, a, b) => { stamped++; return a + vfmt(d.version) + b; });
      const h2Re = /(<h2>)v\d+(?:\.\d+){1,3}(?:\.x)?( - what's new<\/h2>)/;
      t = t.replace(h2Re, (_, a, b) => { stamped++; return a + vfmt(d.version) + b; });
    }
    if (t !== before) {
      if (!t.trimEnd().endsWith("</html>")) throw new Error(`${slug}/${page} lost its tail; refusing to write`);
      writeFileSync(p, t); changed++;
    }
  }
}

// 3. sitemap.xml - regenerate from the same public-project source (SLUGS) that
// gates every card, so a new project can never silently miss the sitemap again
// (cattery/gnosis/ring shipped cards in c7231e8 and never reached it). Static
// top-level URLs are listed explicitly; each projects/<slug>/ entry is derived
// from SLUGS and emitted only when its directory actually exists on disk. Runs
// in the Pages deploy workflow, so it self-heals on every release.
{
  const STATIC = ["/", "/budget/", "/terms/", "/apothecary/"];
  const locs = [...STATIC];
  for (const slug of Object.keys(SLUGS)) {
    if (existsSync(join(ROOT, "projects", slug, "index.html"))) locs.push(`/projects/${slug}/`);
  }
  const body = locs.map((l) => `  <url><loc>https://yesandeverything.com${l}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  const p = join(ROOT, "sitemap.xml");
  const before = existsSync(p) ? readFileSync(p, "utf8") : "";
  if (xml !== before) { writeFileSync(p, xml); changed++; console.log(`sitemap.xml: rewritten (${locs.length} urls)`); }
}

// 4. homepage machine-readable enumerations - meta description, og:description,
// twitter:description and the JSON-LD hasPart list, all regenerated from
// PUBLIC_COPY so they cannot drift from the card grid. They listed 7 of 9
// projects for ten review passes because each was hand-maintained.
{
  const p = join(ROOT, "index.html");
  let t = readFileSync(p, "utf8");
  const before = t;
  const slugs = Object.keys(SLUGS);

  // Long form: "Name: blurb." A paired entry (the two RTS games) shares one
  // sentence, so the second half of the pair carries a null blurb.
  const sentences = [];
  for (const slug of slugs) {
    const c = PUBLIC_COPY[slug];
    if (c.blurb === null) continue;
    const names = c.pair ? `${c.name} and ${PUBLIC_COPY[c.pair].name}` : c.name;
    sentences.push(`${names}: ${c.blurb}.`);
  }
  const longDesc = `Projects by Kane. ${sentences.join(" ")}`;

  // Short form: the plain name list, in card order.
  const listed = slugs.map((s) => PUBLIC_COPY[s].name);
  const shortDesc = `Projects by Kane: ${listed.join(", ")}.`;

  const setAttr = (attrRe, value) => {
    t = t.replace(attrRe, (m, a, _old, b) => a + value.replace(/"/g, "&quot;") + b);
  };
  setAttr(/(<meta name="description" content=")([^"]*)(")/,          longDesc);
  setAttr(/(<meta property="og:description" content=")([^"]*)(")/,   shortDesc);
  setAttr(/(<meta name="twitter:description" content=")([^"]*)(")/,  shortDesc);

  const hasPart = slugs.map((slug) => {
    const c = PUBLIC_COPY[slug];
    return { ...c.ld, name: c.name };
  });
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "yesandeverything",
    url: "https://yesandeverything.com/",
    author: { "@type": "Person", name: "Kane" },
    description: "Projects by Kane.",
    hasPart,
  };
  t = t.replace(
    /(<script type="application\/ld\+json">\s*\n\s*)([\s\S]*?)(\n\s*<\/script>)/,
    (m, a, _old, b) => a + JSON.stringify(ld) + b
  );

  if (t !== before) {
    if (!t.trimEnd().endsWith("</html>")) throw new Error("index.html lost its tail; refusing to write");
    writeFileSync(p, t); changed++; console.log(`index.html: regenerated the ${slugs.length}-project descriptions and JSON-LD`);
  }
}

console.log(`update-project-pages: ${stamped} span(s) current across ${Object.keys(data).length} project(s); ${changed} file(s) rewritten.`);
