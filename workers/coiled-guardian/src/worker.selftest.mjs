// worker.selftest.mjs -- proves which page each kind of reader is served, the print edition
// first among them, because a route added is a route proved. Run: node src/worker.selftest.mjs
//
// It drives the real fetch handler with a stand-in store, so the session check, the reader's
// span and the page key are exercised together, the way a request meets them. What it holds
// down:
//   a stranger asking for the print page gets the password form and no page
//   the author and an all-true reader get the full print page
//   a bounded reader gets the print page written for their span and never the full one
//   a span with no print page published refuses rather than falling back to the full one
//   the share link reader is bounded the same way
//   the chapter bound still holds beside the new route

import worker from "./worker.js";

const store = new Map(Object.entries({
  "cg:index": "INDEX-FULL",
  "cg:index-r30": "INDEX-R30",
  "cg:print": "PRINT-FULL",
  "cg:print-r30": "PRINT-R30",
  "cg:ch-1": "CH-1",
  "cg:ch-30": "CH-30",
  "cg:ch-31": "CH-31",
  "cg:ch-92": "CH-92",
}));

const TOKEN = "TvQ2m8Lx4Kd9Rb7Nw3Yc6Hf1";
const env = {
  SESSION_SECRET: "test-session-secret-not-the-real-one",
  COILED_PASSWORD: "the-author-phrase",
  REVIEWERS: JSON.stringify({
    "nell": "nell-reader-phrase",
    "ari-b": { "phrase": "ari-reader-phrase", "through": 45 },
    "whole": { "phrase": "whole-book-phrase", "all": true },
  }),
  SHARE: JSON.stringify({ token: TOKEN, through: 30 }),
  GATED_DOCS: {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    put: async (k, v) => { store.set(k, v); },
  },
};

const BASE = "https://yesandeverything.com/coiledguardian";

let failed = 0;
const is = (got, want, what) => {
  if (got === want) { console.log("  ok    " + what); return; }
  failed++;
  console.log("  FAIL  " + what + "\n        got " + JSON.stringify(got) +
              ", want " + JSON.stringify(want));
};

const cookieOf = (r) => (r.headers.get("set-cookie") || "").split(";")[0];

async function signIn(phrase) {
  const r = await worker.fetch(new Request(BASE + "/login", {
    method: "POST", body: new URLSearchParams({ password: phrase }),
  }), env);
  return cookieOf(r);
}

async function get(path, cookie, method = "GET") {
  const r = await worker.fetch(new Request(BASE + path, {
    method, headers: cookie ? { cookie } : {},
  }), env);
  return { status: r.status, body: await r.text() };
}

// The 503 page logs the missing key to the console on purpose; keep it out of the report.
console.error = () => {};

console.log("a stranger");
const bare = await get("/print");
is(bare.status, 200, "the print page answers a stranger with the password form");
is(bare.body.includes("Access password"), true, "and that form is all it sends");
is(bare.body.includes("PRINT"), false, "no print page reaches a stranger");

console.log("the author");
const author = await signIn("the-author-phrase");
is((await get("/print", author)).body, "PRINT-FULL", "the author gets the whole book to print");
is((await get("/print/", author)).body, "PRINT-FULL", "a trailing slash is the same page");
is((await get("/", author)).body, "INDEX-FULL", "the author's contents page is unchanged");
is((await get("/ch-92", author)).body, "CH-92", "and every chapter still serves");
is((await get("/printx", author)).status, 404, "a path that only starts like the print page is nothing");
is((await get("/print/2", author)).status, 404, "nor is anything under it");
is((await get("/print", author, "POST")).status, 405, "the print page is read, never written");

console.log("a bounded reader");
const nell = await signIn("nell-reader-phrase");
const nellPrint = await get("/print", nell);
is(nellPrint.body, "PRINT-R30", "a reader bounded to thirty gets the thirty-chapter print page");
is(nellPrint.body.includes("FULL"), false, "and never the full one");
is((await get("/", nell)).body, "INDEX-R30", "their contents page is their span's");
is((await get("/ch-30", nell)).body, "CH-30", "chapter thirty serves");
is((await get("/ch-31", nell)).status, 404, "chapter thirty-one does not");

console.log("a span with no print page published");
const ari = await signIn("ari-reader-phrase");
const ariPrint = await get("/print", ari);
is(ariPrint.status, 503, "a reader whose span has no print page gets the not-published page");
is(ariPrint.body.includes("PRINT-FULL"), false, "with no fallback to the full book");

console.log("the whole-book invitation");
const whole = await signIn("whole-book-phrase");
is((await get("/print", whole)).body, "PRINT-FULL", "all true prints the whole book");

console.log("the share link");
const open = await worker.fetch(new Request(BASE + "/r/" + TOKEN), env);
is(open.status, 303, "the link signs its reader in");
const link = cookieOf(open);
is((await get("/print", link)).body, "PRINT-R30", "a link reader gets the link's span to print");
is((await get("/ch-31", link)).status, 404, "and the chapter bound holds for them too");

console.log(failed ? `\n${failed} failure(s)` : "\nselftest passed");
process.exit(failed ? 1 : 0);
