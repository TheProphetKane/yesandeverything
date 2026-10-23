// Build the Pages artifact from an allowlist instead of uploading the repository root.
//
//   node scripts/stage-site.mjs _site     copy every published file into _site
//   node scripts/stage-site.mjs --check   exit 1 if a tracked entry is unclassified
//
// The deploy used to upload path '.', so every tracked file was a URL whether anyone
// meant it to be one: scripts/check-status-json.ps1, the Worker sources, this
// handler's own CLAUDE.md and config/claude_desktop_config.json all answered 200 on
// the live domain until 2026-10-23. The release gates, the build step and the Worker
// sources belong in this repository (they exist to make the public fetch correct) but
// not in the artifact, and a .gitignore line cannot separate the two because the
// workflow needs them checked out.
//
// Every top-level tracked entry must sit on exactly one of the two lists below. A new
// folder on neither fails the deploy and the release, so publishing something is a
// decision written here rather than a side effect of committing it.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Served at yesandeverything.com. status/ and dashboard/ carry the JSON the status
// page and the dashboard fetch, which is public on purpose.
const PUBLIC = new Set([
  "404.html", "CNAME", "index.html", "og.png", "robots.txt", "sitemap.xml",
  ".well-known", "apothecary", "budget", "dashboard", "projects", "sitemap",
  "status", "terms", "thanksgiving-2026", "work",
]);

// Kept in the repository, never served: build steps, release gates, Worker sources
// (deployed by wrangler, not by Pages), handlers and project config.
const PRIVATE = new Set([
  ".claude", ".github", ".gitattributes", ".gitignore", ".nojekyll",
  ".project-context.json", ".prose-ratchet.json", "CLAUDE.md", "DEPLOY.md",
  "DISCORD_WEBHOOK_NAMING.md", "config", "dashboard-api", "data", "docs",
  "scripts", "workers",
]);

// Source that has no business inside a public folder even when the folder itself is
// public. A script dropped into status/ or projects/ fails here instead of shipping.
const SOURCE_EXT = /\.(ps1|psm1|py|sh|bat|cmd|toml|jsonc)$/i;

const check = process.argv.includes("--check");
const out = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!check && !out) {
  console.error("usage: node scripts/stage-site.mjs <outDir> | --check");
  process.exit(2);
}

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const problems = [];
const staged = [];
for (const top of new Set(tracked.map((f) => f.split("/")[0]))) {
  if (PUBLIC.has(top) && PRIVATE.has(top)) problems.push(`${top}: on both lists`);
  else if (!PUBLIC.has(top) && !PRIVATE.has(top)) problems.push(`${top}: on neither list in scripts/stage-site.mjs`);
}
for (const f of tracked) {
  if (!PUBLIC.has(f.split("/")[0])) continue;
  if (SOURCE_EXT.test(f)) problems.push(`${f}: source file inside a public folder`);
  staged.push(f);
}

if (problems.length) {
  console.error("STAGE FAIL: the published set is not decided for every tracked entry.");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

if (check) {
  console.log(`stage-site: ${staged.length} files publish, every top-level entry classified.`);
  process.exit(0);
}

const dest = resolve(ROOT, out);
rmSync(dest, { recursive: true, force: true });
for (const f of staged) {
  mkdirSync(dirname(join(dest, f)), { recursive: true });
  copyFileSync(join(ROOT, f), join(dest, f));
}
console.log(`stage-site: copied ${staged.length} files into ${out}/`);
