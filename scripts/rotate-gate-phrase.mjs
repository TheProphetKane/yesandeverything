#!/usr/bin/env node
// Rotate the shared gate phrase across every gated page, and stop storing it in cleartext.
//
// Bar-raise yae-shared-gate-password-reused-11-files. The same literal phrase gated twelve
// pages (eleven when the finding was written), sitting in plain view in each one's source,
// so reading it once from any page unlocked all twelve. Anyone who opened view-source on
// the most public of them had the private ones.
//
// Two things were wrong and only one of them is a decision.
//
// The cleartext is not a decision: a phrase compared as a literal can be read straight out
// of the page, which makes the gate worth nothing against anyone who looks. Comparing a
// SHA-256 hash instead costs nothing, changes nothing for the person typing the phrase,
// and removes the read-it-from-source path entirely. It is also what dashboard/index.html
// already does, so this makes the twelve pages consistent with the one that got it right.
//
// The reuse IS a decision: whether the design pages, the two game documents and the skill
// review should share one phrase or split by tier is Kane's call, and it needs him because
// he is the one who has to remember the result. Recorded as an open brief rather than
// guessed at here.
//
// What this script does is make either answer cheap. It rewrites every gated page to
// compare a hash, and it can rotate them all in one command. Without it, rotation means
// hand-editing twelve files and getting all twelve right.
//
// The gate remains client-side friction and nothing more. The hordes and brackish-rising
// pages carry their whole payload base64-encoded in the same file, so anyone who views
// source already has the content without any phrase at all. This raises the floor; it does
// not turn the gate into access control, and no one should start treating it as one.
//
// Usage:
//   node scripts/rotate-gate-phrase.mjs --check           report what each page uses
//   node scripts/rotate-gate-phrase.mjs --harden          hash the phrase already in use
//   node scripts/rotate-gate-phrase.mjs --set "<phrase>"  rotate every page to a new one
//
// --set never prints the phrase back, and the phrase never lands in a file.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const mode = args.includes("--set") ? "set" : args.includes("--harden") ? "harden" : "check";
const newPhrase = mode === "set" ? args[args.indexOf("--set") + 1] : null;

if (mode === "set" && !newPhrase) {
  console.error("--set needs a phrase after it.");
  process.exit(2);
}

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/** Every .html under the repo, skipping the places that are not ours to rewrite. */
function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name.startsWith("_archive")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) htmlFiles(full, out);
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

// The cleartext form these pages ship today.
const LITERAL = /v\s*===\s*'([^']+)'/;
// The hashed form this script writes. Recognised so a second run is a no-op.
const HASHED = /GATE_SHA\s*=\s*"([a-f0-9]{64})"/;

const pages = [];
for (const file of htmlFiles(ROOT)) {
  const src = readFileSync(file, "utf8");
  const lit = src.match(LITERAL);
  const hashed = src.match(HASHED);
  if (!lit && !hashed) continue;
  pages.push({ file, rel: relative(ROOT, file), src, literal: lit?.[1] ?? null, hash: hashed?.[1] ?? null });
}

if (mode === "check") {
  const byPhrase = new Map();
  for (const p of pages) {
    const key = p.literal ? `cleartext:${sha256(p.literal).slice(0, 12)}` : `hashed:${p.hash.slice(0, 12)}`;
    byPhrase.set(key, (byPhrase.get(key) ?? []).concat(p.rel));
  }
  for (const [key, files] of byPhrase) {
    // The phrase itself is never printed, only a fingerprint of it: this output is a
    // report about a secret and must not become a place the secret is written down.
    console.log(`\n${key}  (${files.length} page${files.length === 1 ? "" : "s"})`);
    for (const f of files) console.log(`    ${f}`);
  }
  const cleartext = pages.filter((p) => p.literal);
  console.log(
    `\n${pages.length} gated page${pages.length === 1 ? "" : "s"}, ${cleartext.length} still comparing a cleartext literal.`,
  );
  if (cleartext.length) {
    console.log("Run with --harden to hash the phrase already in use, changing nothing for the person typing it.");
    process.exit(1);
  }
  process.exit(0);
}

let changed = 0;
for (const p of pages) {
  const target = mode === "set" ? sha256(newPhrase) : p.literal ? sha256(p.literal) : p.hash;
  if (!target) continue;

  let out = p.src;
  if (p.hash) {
    if (p.hash === target) continue;
    out = out.replace(HASHED, `GATE_SHA = "${target}"`);
  } else {
    // Swap the literal comparison for a hash comparison, and inject the hash plus the
    // digest helper next to it. Async, because the platform digest API is.
    out = out.replace(
      LITERAL,
      `await sha256hex(v)===GATE_SHA`,
    );
    out = out.replace(
      /(document\.getElementById\('gateForm'\)\.addEventListener\('submit',\s*)function\s*\(e\)\s*\{/,
      `var GATE_SHA = "${target}";\n  async function sha256hex(s){\n` +
        `    // Comparing a hash rather than the phrase itself: a literal in the page source\n` +
        `    // is readable by anyone who opens view-source, which made the gate worth nothing.\n` +
        `    var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));\n` +
        `    return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0')}).join('');\n` +
        `  }\n  $1async function(e){`,
    );
  }

  if (out !== p.src) {
    writeFileSync(p.file, out, "utf8");
    console.log(`  rewrote ${p.rel}`);
    changed++;
  }
}

console.log(`\n${changed} page${changed === 1 ? "" : "s"} updated.`);
if (mode === "set") {
  console.log("The new phrase is not printed here and is not written to any file. Anyone who");
  console.log("needs it has to be told it.");
}
