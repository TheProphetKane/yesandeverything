#!/usr/bin/env node
// update-project-pages.mjs - stamp live project data into the public pages.
//
// Reads status/data/<Project>.json (which every project's release.ps1 pushes
// here) and rewrites the marked spans in:
//   - index.html project cards:      <!--live:version:Proj-->...<!--/live-->
//                                    <!--live:milestone:Proj-->...<!--/live-->
//   - projects/<slug>/index.html     <!--live:version-->...<!--/live-->
//   - projects/<slug>/design.html    <!--live:version-->...<!--/live-->
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
    const r = stamp(t, "version", vfmt(d.version));
    if (r.hit && r.text !== t) {
      if (!r.text.trimEnd().endsWith("</html>")) throw new Error(`${slug}/${page} lost its tail; refusing to write`);
      writeFileSync(p, r.text); changed++; stamped++;
    } else if (r.hit) { stamped++; }
  }
}

console.log(`update-project-pages: ${stamped} span(s) current across ${Object.keys(data).length} project(s); ${changed} file(s) rewritten.`);
