// Self-test for registry.mjs's uniqueness guard (bar-raise 2026-09-24, data-integrity-01).
//
//   node scripts/registry.selftest.mjs
//
// SLUGS and PUBLIC_COPY are built with Object.fromEntries, which drops a project sharing an
// id or a slug with another one and says nothing. This proves assertUnique actually throws
// on a duplicate, in both fields, and stays quiet on a registry that has none, including the
// real data/projects.json that importing registry.mjs already loaded once above.

import { assertUnique, PROJECTS } from "./registry.mjs";

let failed = 0;
const is = (got, want, what) => {
  if (got === want) { console.log("  ok    " + what); return; }
  failed++;
  console.log("  FAIL  " + what + "\n        got " + JSON.stringify(got) + ", want " + JSON.stringify(want));
};

const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log("a duplicate id throws");
is(throws(() => assertUnique("id", [{ id: "Chains" }, { id: "Ring" }, { id: "Chains" }])), true,
   "two entries sharing an id are rejected");

console.log("a duplicate slug throws");
is(throws(() => assertUnique("slug", [{ id: "A", slug: "chains" }, { id: "B", slug: "chains" }])), true,
   "two entries sharing a slug are rejected");

console.log("no duplicates, no throw");
is(throws(() => assertUnique("id", [{ id: "A" }, { id: "B" }, { id: "C" }])), false,
   "distinct ids pass");
is(throws(() => assertUnique("slug", [{ id: "A", slug: "a" }, { id: "B" }, { id: "C", slug: "c" }])), false,
   "a project with no slug is skipped rather than treated as a duplicate undefined");

console.log("the real registry has no duplicates");
is(throws(() => { assertUnique("id", PROJECTS); assertUnique("slug", PROJECTS); }), false,
   "data/projects.json passes its own guard (already proved by loading registry.mjs above)");

console.log(failed ? `\n${failed} failure(s)` : "\nselftest passed");
process.exit(failed ? 1 : 0);
