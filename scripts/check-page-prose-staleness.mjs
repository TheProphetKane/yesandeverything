#!/usr/bin/env node
// check-page-prose-staleness.mjs - does version-keyed prose still describe what shipped?
//
// The version pill on every project page is stamped from that project's status JSON, so it
// is current the moment a release pushes. The prose underneath it is hand-written and
// nothing updated it, which is how the Scheduler page sat at a v0.7.1 story under a v0.7.3
// pill: it said "Live", named the right number, and described work from two releases
// earlier. The pill being automatic is what hid the gap, because the one thing a reader
// checks was right.
//
// Scope, which is the whole design of this check, and it took two wrong versions to get
// right. Requiring the pill's version to appear anywhere in the prose failed 16 of 18
// pages, because most describe the product without naming a release at all and that prose
// cannot go stale on a number. Requiring the NEWEST version cited to equal the pill failed
// three more, because a page saying "the connector added in v0.13.0" is stating history
// correctly, not claiming to be current. Both were checks nobody could satisfy, which is
// the same defect as no check.
//
// So the check anchors on the heading instead. A heading that reads "vX.Y.Z - what's new"
// is a page organising itself BY release: it promises the section below describes that
// version. That promise is checkable, and it is exactly the one the Scheduler page broke.
// Historical mentions in body prose are listed for information and never fail anything.
//
// Excluded from the body before matching: the head, because its meta descriptions carry
// hand-written version text no reader sees; the stamped spans, because the pill is what is
// being checked against and a page must not pass on the pill itself; scripts and styles.
//
// Exits 1 when any adopted page is behind. Run it directly:
//   node scripts/check-page-prose-staleness.mjs
// --quiet prints only the failures and the tally.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUIET = process.argv.includes("--quiet");

// Same map the stamper uses. Its own copy rather than an import, because the stamper is a
// script with side effects at import time.
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

/** Everything a reader actually sees: no head, no stamped spans, no comments, no code. */
function visibleBody(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<!--live:[\s\S]*?<!--\/live-->/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function stampedVersion(html) {
  const m = html.match(/<!--live:version(?::[A-Za-z]+)?-->([\s\S]*?)<!--\/live-->/);
  if (!m) return null;
  const v = m[1].replace(/<[^>]*>/g, "").trim();
  return v || null;
}

const parse = (v) => {
  const m = String(v).match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const fmt = (t) => `v${t.join(".")}`;

/** Version-keyed section headings: "v0.7.3 - what's new", "What's new in v1.2.0". */
function whatsNewHeadings(body) {
  const out = [];
  for (const m of body.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)) {
    const text = m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!/what(?:'|&#39;|&rsquo;|’)?s new|what is new|latest release|this release/i.test(text)) continue;
    const v = text.match(/\bv(\d+)\.(\d+)\.(\d+)\b/);
    if (!v) continue; // "What it does" style heading with no version promise.
    out.push({ text, version: [Number(v[1]), Number(v[2]), Number(v[3])] });
  }
  return out;
}

/** Every vX.Y.Z the reader can see. Informational only. */
function versionsInProse(body) {
  return [...body.matchAll(/\bv(\d+)\.(\d+)\.(\d+)\b/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
  ]);
}

const rows = [];
for (const [slug, id] of Object.entries(SLUGS)) {
  for (const page of ["index.html", "design.html"]) {
    const path = join(ROOT, "projects", slug, page);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, "utf8");
    const stampedRaw = stampedVersion(html);
    const stamped = stampedRaw ? parse(stampedRaw) : null;
    if (!stamped) {
      rows.push({ slug, page, id, state: "no-marker", detail: stampedRaw ?? "absent" });
      continue;
    }
    const body = visibleBody(html);
    const headings = whatsNewHeadings(body);
    const mentions = versionsInProse(body).length;
    if (headings.length === 0) {
      rows.push({
        slug,
        page,
        id,
        state: "unkeyed",
        detail: `pill ${fmt(stamped)}, ${mentions} version mention${mentions === 1 ? "" : "s"} in prose, no release-keyed heading`,
      });
      continue;
    }
    // Newest heading wins: a page may keep older what's-new sections below the current one.
    headings.sort((a, b) => cmp(b.version, a.version));
    const newest = headings[0];
    const behind = cmp(newest.version, stamped) < 0;
    rows.push({
      slug,
      page,
      id,
      state: behind ? "stale" : "current",
      detail: behind
        ? `pill ${fmt(stamped)}, but the section heading still promises ${fmt(newest.version)}: "${newest.text}"`
        : `pill ${fmt(stamped)}, heading ${fmt(newest.version)}`,
    });
  }
}

const label = {
  stale: "STALE",
  current: "ok   ",
  unkeyed: "skip ",
  "no-marker": "skip ",
};
for (const r of rows) {
  if (QUIET && r.state !== "stale") continue;
  const note =
    r.state === "no-marker" ? `no stamped version marker (${r.detail})` : r.detail;
  console.log(`  ${label[r.state]} ${r.slug}/${r.page} - ${note}`);
}

const stale = rows.filter((r) => r.state === "stale");
const current = rows.filter((r) => r.state === "current");
const skipped = rows.length - stale.length - current.length;
console.log(
  `\n${current.length + stale.length} release-keyed page${
    current.length + stale.length === 1 ? "" : "s"
  } checked, ${stale.length} stale. ${skipped} page${
    skipped === 1 ? "" : "s"
  } organise no section by release and are out of scope.`,
);
if (stale.length > 0) {
  console.log(
    "\nA stale page carries the current version on its pill and a section heading that" +
      "\npromises an older one, so it reads as current to anyone who checks the number." +
      "\nUpdate the section, or take the version out of the heading and let it describe" +
      "\nthe product instead.",
  );
  process.exit(1);
}
