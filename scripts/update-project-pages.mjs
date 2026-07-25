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
    // Lock"); homepage cards keep the bare label.
    const mid = (d.milestone && typeof d.milestone === "object" && d.milestone.id) ? `${d.milestone.id}, ` : "";
    for (const [key, value] of [
      [`version:${id}`, vfmt(d.version)],
      ["version", vfmt(d.version)],
      [`milestone:${id}`, mid + mfmt(d.milestone)],
    ]) {
      const r = stamp(t, key, value); t = r.text; if (r.hit) stamped++;
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

console.log(`update-project-pages: ${stamped} span(s) current across ${Object.keys(data).length} project(s); ${changed} file(s) rewritten.`);
