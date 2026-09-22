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
//   the author and the readers never share a cookie, the link never writes over the author,
//     the author wins whenever both are present, his notes stay his, and a bounded session
//     always offers him the sign-in form (Kane, 2026-09-21, the night the link locked him out)

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
is((await get("/", nell)).body.startsWith("INDEX-R30"), true, "their contents page is their span's");
is((await get("/ch-30", nell)).body, "CH-30", "chapter thirty serves");
is((await get("/ch-31", nell)).body.includes("CH-31"), false, "chapter thirty-one does not");

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
const past = await get("/ch-31", link);
is(past.body.includes("CH-31"), false, "and the chapter bound holds for them too");
is(past.body.includes("Access password") && past.body.includes("chapters 1 to 30"), true,
   "a chapter past the bound offers the author's sign-in instead of a dead end");
is((await get("/ch-92", link)).body.includes("CH-92"), false, "chapter ninety-two stays shut to the link");
is((await get("/print", link)).body.includes("FULL"), false, "the link never gets the full print page");

// Kane, 2026-09-21: opening his own share link replaced his session with the link's, and he could
// not read past chapter thirty. Everything below holds that shut for good: the author and the
// readers never share a cookie, and the author wins whenever both are present.
console.log("the author and the readers never share a cookie");
const setCookies = (r) => (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get("set-cookie")])
  .filter(Boolean);
const nameOf = (c) => c.split("=")[0];
is(nameOf(cookieOf(open)), "cg_coiled_r", "the share link writes the reader cookie");
is(nameOf(author), "cg_coiled", "the author's password writes the author cookie");
is(nameOf(nell), "cg_coiled_r", "a reviewer's phrase writes the reader cookie, never the author's");
const authorIssue = await worker.fetch(new Request(BASE + "/login", {
  method: "POST", body: new URLSearchParams({ password: "the-author-phrase" }),
}), env);
is(/Max-Age=2592000/.test(authorIssue.headers.get("set-cookie") || ""), true,
   "the author's session lasts thirty days, so it does not lapse under a reader session");

console.log("the author opening his own link stays the author");
const reopen = await worker.fetch(new Request(BASE + "/r/" + TOKEN, { headers: { cookie: author } }), env);
is(reopen.status, 303, "the link still redirects him to the contents page");
is(setCookies(reopen).length, 0, "and sets no cookie at all over his session");
const both = author + "; " + link;
is((await get("/ch-31", both)).body, "CH-31", "with both cookies he reads chapter thirty-one");
is((await get("/ch-92", both)).body, "CH-92", "and chapter ninety-two");
is((await get("/", both)).body, "INDEX-FULL", "and his own contents page, not the link's");
is((await get("/print", both)).body, "PRINT-FULL", "and the whole book to print");
is((await get("/ch-92", link + "; " + author)).body, "CH-92", "whichever order the browser sends them in");

console.log("his notes stay his, a reader's stay theirs");
store.set("cg:notes", JSON.stringify({ v: 1, notes: [{ id: "k1", text: "the author's note" }] }));
store.set("cg:review:link", JSON.stringify({ v: 1, notes: [{ id: "r1", text: "a reader's note" }] }));
is((await get("/api/notes", both)).body.includes("the author's note"), true,
   "with both cookies the notes store is the author's");
is((await get("/api/notes", both)).body.includes("a reader's note"), false,
   "and no reader's note reaches him through it");
is((await get("/api/notes", link)).body.includes("the author's note"), false,
   "a link reader never reads the author's notes");
await worker.fetch(new Request(BASE + "/api/notes", {
  method: "POST", headers: { cookie: both }, body: JSON.stringify([{ id: "k2", text: "written with both" }]),
}), env);
is(store.get("cg:notes").includes("written with both"), true, "a note he writes lands in his own store");
is(store.get("cg:review:link").includes("written with both"), false, "and never in the link's");

console.log("sessions written before the split");
const legacyLink = link.replace(/^cg_coiled_r=/, "cg_coiled=");
is((await get("/ch-30", legacyLink)).body, "CH-30", "a link session from before the split still reads its span");
is((await get("/ch-31", legacyLink)).body.includes("CH-31"), false, "and is still bounded");
is((await get("/ch-31", legacyLink + "; " + author)).body, "CH-31",
   "if an old link cookie and the author cookie ever arrive together, the author still wins");
const signBack = await worker.fetch(new Request(BASE + "/login", {
  method: "POST", headers: { cookie: legacyLink }, body: new URLSearchParams({ password: "the-author-phrase" }),
}), env);
const fresh = cookieOf(signBack);
is(nameOf(fresh), "cg_coiled", "signing in over an old link session writes the author cookie in its place");
is((await get("/ch-92", fresh)).body, "CH-92", "and every chapter opens again");

console.log("the way back in is always there");
is((await get("/login", link)).body.includes("Access password"), true, "the sign-in form answers any session");
is((await get("/", link)).body.includes("Author sign-in"), true, "a bounded contents page names the way in");
is((await get("/", author)).body.includes("Author sign-in"), false, "the author's own contents page does not");
const out = await worker.fetch(new Request(BASE + "/logout", { headers: { cookie: both } }), env);
const cleared = setCookies(out).map(nameOf).sort().join(",");
is(cleared, "cg_coiled,cg_coiled_r", "signing out clears both sessions");

console.log("a reader credential never opens more than its span");
const expiredAuthor = author.replace(/=(\d+)\./, "=1.");
is((await get("/ch-31", expiredAuthor + "; " + link)).body.includes("CH-31"), false,
   "a lapsed author cookie beside a link cookie is bounded, and says how to sign back in");
const forged = link.replace(/\.r:link\./, ".reader.");
is((await get("/ch-31", forged)).body.includes("CH-31"), false,
   "a reader cookie edited to claim the author is refused");

console.log(failed ? `\n${failed} failure(s)` : "\nselftest passed");
process.exit(failed ? 1 : 0);
