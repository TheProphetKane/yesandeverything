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
//     the author wins whenever both are present, his notes stay his, and a chapter past a
//     bounded span is the plain password form, the same for a chapter written or not
//     (Kane, 2026-09-21 and 22)

import worker from "./worker.js";
import { issueCookie } from "./auth.js";

const store = new Map(Object.entries({
  "cg:index": "INDEX-FULL",
  "cg:index-r30": "INDEX-R30",
  "cg:print": "PRINT-FULL",
  "cg:print-r30": "PRINT-R30",
  "cg:ch-1": "CH-1",
  "cg:ch-30": "CH-30",
  "cg:ch-31": "CH-31",
  "cg:ch-92": "CH-92",
  "cg:two:index": "TWO-INDEX",
  "cg:two:ch-1": "TWO-CH-1",
  "cg:two:print": "TWO-PRINT",
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
is((await get("/", nell)).body, "INDEX-R30", "their contents page is their span's, exactly as published");
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
is(past.body.includes("Access password"), true, "next on chapter thirty lands on the password form");
is(past.body, (await get("/ch-31")).body, "the very form a stranger gets, with nothing added");
is(past.body, (await get("/ch-999", link)).body,
   "and the same answer as a chapter that was never written, so nothing past the span can be counted");
is(/30|past|more chapters|further/i.test(past.body), false, "it says nothing about any span or what lies past it");
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
is((await get("/", link)).body, "INDEX-R30", "a bounded contents page carries nothing the publish step did not write");
is((await get("/ch-45", link)).body.includes("Access password"), true, "any chapter past the span is the author's door");
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

// Kane, 2026-09-22: every link reader once wrote to one shared key, and his own phone, sitting
// on the link, posted his whole store of notes into it. Each browser now has a key of its own, and
// no reader store ever holds or shows an id the author's store carries.
console.log("every link reader is on their own, and never sees the author's notes");
const roleOf = (c) => c.split("=")[1].split(".")[1];
const ra = cookieOf(await worker.fetch(new Request(BASE + "/r/" + TOKEN), env));
const rb = cookieOf(await worker.fetch(new Request(BASE + "/r/" + TOKEN), env));
is(/^r:link-[a-z0-9]{10}$/.test(roleOf(ra)), true, "the link gives a browser a slug of its own");
is(roleOf(ra) === roleOf(rb), false, "and two browsers never share one");
await worker.fetch(new Request(BASE + "/api/notes", {
  method: "POST", headers: { cookie: ra }, body: JSON.stringify([{ id: "ra", text: "reader a's note" }]),
}), env);
is((await get("/api/notes", ra)).body.includes("reader a's note"), true, "a reader reads their own note");
is((await get("/api/notes", rb)).body.includes("reader a's note"), false, "and no other link reader does");
const again = await worker.fetch(new Request(BASE + "/r/" + TOKEN, { headers: { cookie: ra } }), env);
is(setCookies(again).length, 0, "reopening the link keeps the browser's own slug, and its notes with it");
await worker.fetch(new Request(BASE + "/api/notes", {
  method: "POST", headers: { cookie: ra },
  body: JSON.stringify([{ id: "k1", text: "the author's note, from a phone on the link" },
                        { id: "ra2", text: "reader a again" }]),
}), env);
const aKey = "cg:review:" + roleOf(ra).slice(2);
is(store.get(aKey).includes("the author's note"), false, "an author's note posted on a reader session is dropped");
is(store.get(aKey).includes("reader a again"), true, "while the reader's own note beside it lands");
store.set(aKey, JSON.stringify({ v: 9, notes: [{ id: "k1", text: "the author's note, seeded" },
                                               { id: "ra", text: "reader a's note" }] }));
is((await get("/api/notes", ra)).body.includes("the author's note"), false,
   "and one already sitting in a reader store is never shown");
const shared = (await issueCookie({ prefix: "/coiledguardian", key: "coiled-guardian", cookie: "coiled" },
  "r:link", env, 60000)).split(";")[0];
const legacy = await worker.fetch(new Request(BASE + "/ch-1", { headers: { cookie: shared } }), env);
is(await legacy.text(), "CH-1", "a session on the old shared slug still reads");
is(/^cg_coiled_r=[0-9]+\.r:link-[a-z0-9]{10}\./.test(setCookies(legacy)[0] || ""), true,
   "and is reissued a slug of its own on that same request");

// Book two, under /two, added 2026-09-23. The author reads it; nobody invited to a stretch of book
// one learns that it exists, and the answer they get is the same password form a chapter past
// their span gives, so nothing under /two can be counted or told apart from an unwritten page.
console.log("book two is the author's alone");
is((await get("/two", author)).body, "TWO-INDEX", "the author gets book two's contents page");
is((await get("/two/", author)).body, "TWO-INDEX", "with or without the slash");
is((await get("/two/ch-1", author)).body, "TWO-CH-1", "and its chapters");
is((await get("/two/print", author)).body, "TWO-PRINT", "and its print edition");
is((await get("/two/x", author)).status, 404, "a path under it that is not a page is nothing");
is((await get("/twox", author)).status, 404, "and a path that only starts like it is nothing");
is((await get("/two/ch-1", whole)).body, "TWO-CH-1", "the all-true invitation reads book two too");
for (const [who, c] of [["a stranger", null], ["a bounded reader", nell], ["the link", link]]) {
  for (const p of ["/two", "/two/ch-1", "/two/print"]) {
    const r = await get(p, c);
    is(r.status, 200, `${who} asking for ${p} gets the password form`);
    is(r.body.includes("TWO"), false, `and no page of book two`);
    is(r.body, (await get("/ch-999", c)).body, `the same answer as a chapter never written`);
  }
}

// A note amended in its margin card (Kane, 2026-09-24) carries ed, the moment of the edit. A
// device still holding the old words must not post them back over the new ones, in either order.
console.log("an amended note keeps its amendment");
store.set("cg:notes", JSON.stringify({ v: 1, notes: [
  { id: "e1", at: "2026-09-24T10:00:00Z", text: "first words", kind: "comment" }] }));
const post = (notes) => worker.fetch(new Request(BASE + "/api/notes", {
  method: "POST", headers: { cookie: author }, body: JSON.stringify(notes),
}), env);
const e1 = async () => JSON.parse(store.get("cg:notes")).notes.find((n) => n.id === "e1");
await post([{ id: "e1", at: "2026-09-24T10:00:00Z", text: "amended words", kind: "edit",
              ed: "2026-09-24T11:00:00Z" }]);
is((await e1()).text, "amended words", "the edit lands over the stored words");
is((await e1()).kind, "edit", "with its kind");
await post([{ id: "e1", at: "2026-09-24T10:00:00Z", text: "first words", kind: "comment" }]);
is((await e1()).text, "amended words", "a stale copy with no edit stamp does not undo it");
await post([{ id: "e1", at: "2026-09-24T10:00:00Z", text: "older edit", ed: "2026-09-24T10:30:00Z" }]);
is((await e1()).text, "amended words", "nor does an older edit");
await post([{ id: "e1", at: "2026-09-24T10:00:00Z", text: "newest", ed: "2026-09-24T12:00:00Z" }]);
is((await e1()).text, "newest", "a newer edit wins");
await post([{ id: "e1", at: "2026-09-24T10:00:00Z", text: "newest", ed: "2026-09-24T12:00:00Z", del: 1, rm: 1 }]);
await post([{ id: "e1", at: "2026-09-24T10:00:00Z", text: "newest", ed: "2026-09-24T12:00:00Z" }]);
is((await e1()).rm === 1 && (await e1()).del === 1, true, "a reader's delete holds against a copy from before it");

console.log(failed ? `\n${failed} failure(s)` : "\nselftest passed");
process.exit(failed ? 1 : 0);
