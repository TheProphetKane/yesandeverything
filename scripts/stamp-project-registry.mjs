// Stamp the project registry into the two browser pages (architecture-01).
//
//   node scripts/stamp-project-registry.mjs           rewrite both pages
//   node scripts/stamp-project-registry.mjs --check    exit 1 if either has drifted
//
// data/projects.json is the source. The pages cannot import it: this site has no
// build step and every page is self-contained by convention, and a runtime fetch
// would add a request and a failure mode to a list that never changes between
// deploys. So the list is written into each page between markers, the same way
// update-project-pages.mjs already stamps live version spans, and --check is a
// release gate so a page cannot drift back to being hand-kept.
//
// Edit data/projects.json, run this, commit both.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileAtomic } from "./atomic-write.mjs";
import { PROJECTS, DASHBOARD_ROWS, STATUS_ROWS } from "./registry.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

// One row per line, aligned the way both pages already write them, because a
// stamped block somebody has to read should look like the hand-written one it
// replaced rather than like output.
function render(rows, indent) {
  const pad = " ".repeat(indent);
  return rows.map((r) => pad + JSON.stringify(r).replace(/","/g, '", "').replace(/:/g, ": ")).join(",\n");
}

const TARGETS = [
  {
    file: join(ROOT, "dashboard", "index.html"),
    rel: "dashboard/index.html",
    open: "  // REGISTRY:dashboard (stamped from data/projects.json; edit that, run scripts/stamp-project-registry.mjs)\n  var PROJECTS = [\n",
    close: "\n  ];\n  // /REGISTRY:dashboard\n",
    body: render(DASHBOARD_ROWS, 4),
  },
  {
    file: join(ROOT, "status", "index.html"),
    rel: "status/index.html",
    open: "  // REGISTRY:status (stamped from data/projects.json; edit that, run scripts/stamp-project-registry.mjs)\n  var PROJECTS = [\n",
    close: "\n  ];\n  // /REGISTRY:status\n",
    body: render(STATUS_ROWS, 4),
  },
];

let drift = 0;
for (const t of TARGETS) {
  const src = readFileSync(t.file, "utf8");
  const want = t.open + t.body + t.close;

  // First run: there are no markers yet, so replace the hand-written literal.
  const markerStart = src.indexOf(t.open.split("\n")[0]);
  let out;
  if (markerStart >= 0) {
    const end = src.indexOf(t.close.trimStart().split("\n").slice(-2)[0], markerStart);
    if (end < 0) throw new Error(`${t.rel}: opening marker with no closing one`);
    out = src.slice(0, markerStart) + want.replace(/^\n/, "") + src.slice(end + t.close.trimStart().split("\n").slice(-2)[0].length + 1);
  } else {
    const literal = /^ {2}var PROJECTS = \[\n[\s\S]*?^ {2}\];\n/m;
    if (!literal.test(src)) throw new Error(`${t.rel}: no PROJECTS literal and no markers; nothing to stamp`);
    out = src.replace(literal, want.replace(/^\n/, ""));
  }

  if (out === src) {
    console.log(`  current  ${t.rel}`);
    continue;
  }
  if (check) {
    console.error(`  DRIFT    ${t.rel} does not match data/projects.json`);
    drift++;
    continue;
  }
  writeFileAtomic(t.file, out);
  console.log(`  stamped  ${t.rel}`);
}

// The homepage's Live / Pre-MVP / Post-MVP badges are a human's call, and this registry
// has no field for that nuance and never should. What it does own is stalled and retired,
// each a single dated fact, and a hand-authored badge already drifted from both once
// (bar-raise 2026-09-24, strategic-kill-this-01): four cards still read Live or Pre-MVP
// weeks after D81 stalled the projects behind them. So a card whose project is stalled or
// retired gets its badge driven from here, through the same <!--live:key--> marker shape
// update-project-pages.mjs already uses for version and milestone spans; a card whose
// project is neither keeps whatever a person wrote, since there is nothing here to drive
// it from.
{
  const file = join(ROOT, "index.html");
  const rel = "index.html";
  const src = readFileSync(file, "utf8");
  let out = src;
  for (const p of PROJECTS) {
    if (!p.slug) continue;
    const badge = p.retired ? '<span class="status retired">Retired</span>'
      : p.stalled ? '<span class="status stalled">Stalled</span>'
      : null;
    if (!badge) continue;
    const re = new RegExp(`(<!--live:status:${p.id}-->)([\\s\\S]*?)(<!--/live-->)`);
    if (!re.test(out)) throw new Error(`${rel}: no live:status marker for ${p.id}`);
    out = out.replace(re, (_, a, _old, b) => a + badge + b);
  }
  if (out === src) {
    console.log(`  current  ${rel}`);
  } else if (check) {
    console.error(`  DRIFT    ${rel} badges do not match data/projects.json`);
    drift++;
  } else {
    writeFileAtomic(file, out);
    console.log(`  stamped  ${rel}`);
  }
}

if (check && drift) {
  console.error(`\n${drift} page(s) have drifted from data/projects.json. Run: node scripts/stamp-project-registry.mjs`);
  process.exit(1);
}
console.log(check ? "\nproject registry: both pages match data/projects.json" : "\nproject registry stamped.");
