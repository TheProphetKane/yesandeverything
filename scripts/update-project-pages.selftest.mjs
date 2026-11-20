// Self-test for update-project-pages.mjs (bar-raise 2026-11-19, maintainability-01).
//
//   node scripts/update-project-pages.selftest.mjs
//
// The updater rewrites the homepage cards and every project page on each Pages deploy and
// had no test of its own. This builds a two-project fixture site in a temp directory (a
// copy of the three scripts it needs, a two-entry registry, status files, a homepage and
// two project pages), runs the copied updater there, and asserts the version and the
// milestone land in the cards and the pages, a second run changes nothing, and the real
// site files are never touched.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "yae-update-pages-"));
let failed = 0;
const ok = (cond, what, detail) => {
  if (cond) { console.log("  ok    " + what); return; }
  failed++;
  console.log("  FAIL  " + what + (detail ? "\n        " + detail : ""));
};
const w = (rel, text) => { const p = join(tmp, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text, "utf8"); };
const r = (rel) => readFileSync(join(tmp, rel), "utf8");

try {
  for (const f of ["update-project-pages.mjs", "registry.mjs", "atomic-write.mjs"]) {
    mkdirSync(join(tmp, "scripts"), { recursive: true });
    copyFileSync(join(REAL, "scripts", f), join(tmp, "scripts", f));
  }
  w("data/projects.json", JSON.stringify({ projects: [
    { id: "Alpha", slug: "alpha", displayName: "Yes& Alpha", blurb: "the first fixture", ld: { "@type": "WebApplication", applicationCategory: "Fixture" } },
    { id: "Beta", slug: "beta", displayName: "Beta", blurb: "the second fixture", ld: { "@type": "WebApplication", applicationCategory: "Fixture" } },
  ] }));
  w("status/data/Alpha.json", JSON.stringify({ version: "1.2.3", milestone: { id: "M4", label: "Fixture lock", status: "active" } }));
  w("status/data/Beta.json", JSON.stringify({ version: "v0.9.0", milestone: "Beta polish" }));
  w("index.html", [
    "<!doctype html><html><head>",
    '<meta name="description" content="old"><meta property="og:description" content="old"><meta name="twitter:description" content="old">',
    '<script type="application/ld+json">',
    "{}",
    "</script></head><body>",
    "<p>Alpha <!--live:version:Alpha-->v0.0.1<!--/live--> <!--live:milestone:Alpha-->old<!--/live--></p>",
    "<p>Beta <!--live:version:Beta-->v0.0.1<!--/live--> <!--live:milestone:Beta-->old<!--/live--></p>",
    "</body></html>", "",
  ].join("\n"));
  for (const s of ["alpha", "beta"]) {
    const id = s === "alpha" ? "Alpha" : "Beta";
    w(`projects/${s}/index.html`, `<!doctype html><html><body><span><!--live:version:${id}-->v0.0.1<!--/live--></span> <em><!--live:milestone:${id}-->old<!--/live--></em></body></html>\n`);
  }

  const realBefore = readFileSync(join(REAL, "index.html"), "utf8");
  const run = () => spawnSync(process.execPath, [join(tmp, "scripts", "update-project-pages.mjs")], { encoding: "utf8" });
  const first = run();
  ok(first.status === 0, "the updater exits 0 on the fixture", first.stderr);

  const home = r("index.html");
  ok(home.includes("<!--live:version:Alpha-->v1.2.3<!--/live-->"), "homepage card carries Alpha's version, with the v added");
  ok(home.includes("<!--live:version:Beta-->v0.9.0<!--/live-->"), "homepage card keeps Beta's version, no double v");
  ok(home.includes("<!--live:milestone:Alpha-->Fixture lock<!--/live-->"), "homepage card carries Alpha's milestone label");
  ok(home.includes("<!--live:milestone:Beta-->Beta polish<!--/live-->"), "homepage card carries Beta's plain-string milestone");
  ok(/<meta name="description" content="Projects by Kane\. Alpha: the first fixture\./.test(home), "meta description regenerated from the registry");

  const a = r("projects/alpha/index.html");
  ok(a.includes("<!--live:version:Alpha-->v1.2.3<!--/live-->"), "Alpha page carries the version");
  ok(a.includes("<!--live:milestone:Alpha-->M4, Fixture lock<!--/live-->"), "Alpha page carries the milestone with its id");
  const b = r("projects/beta/index.html");
  ok(b.includes("<!--live:version:Beta-->v0.9.0<!--/live-->"), "Beta page carries the version");
  ok(b.includes("<!--live:milestone:Beta-->Beta polish<!--/live-->"), "Beta page carries the milestone");

  const second = run();
  ok(second.status === 0 && /0 file\(s\) rewritten/.test(second.stdout), "a second run rewrites nothing (idempotent)", second.stdout);
  ok(readFileSync(join(REAL, "index.html"), "utf8") === realBefore, "the real index.html was not touched");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) { console.log("\nselftest FAILED: " + failed); process.exit(1); }
console.log("\nselftest passed");
