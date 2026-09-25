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
  // The address table the publish step writes. Stand-in slugs: the real titles stay out of this
  // repository, which is public.
  "cg:books": JSON.stringify({ home: "book-a", books: [
    { slug: "book-a", keys: "cg:" }, { slug: "book-b", keys: "cg:two:" }] }),
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
  return { status: r.status, body: await r.text(), location: r.headers.get("location"),
           cache: r.headers.get("cache-control") };
}

// The 503 page logs the missing key to the console on purpose; keep it out of the report.
console.error = () => {};

console.log("a stranger");
const bare = await get("/book-a/print");
is(bare.status, 200, "the print page answers a stranger with the password form");
is(bare.body.includes("Access password"), true, "and that form is all it sends");
is(bare.body.includes("PRINT"), false, "no print page reaches a stranger");

console.log("the author");
const author = await signIn("the-author-phrase");
is((await get("/book-a/print", author)).body, "PRINT-FULL", "the author gets the whole book to print");
is((await get("/book-a/print/", author)).body, "PRINT-FULL", "a trailing slash is the same page");
is((await get("/book-a/", author)).body, "INDEX-FULL", "the author's contents page is unchanged");
is((await get("/book-a/ch-92", author)).body, "CH-92", "and every chapter still serves");
is((await get("/book-a/printx", author)).status, 404, "a path that only starts like the print page is nothing");
is((await get("/book-a/print/2", author)).status, 404, "nor is anything under it");
is((await get("/book-a/print", author, "POST")).status, 405, "the print page is read, never written");

console.log("a bounded reader");
const nell = await signIn("nell-reader-phrase");
const nellPrint = await get("/book-a/print", nell);
is(nellPrint.body, "PRINT-R30", "a reader bounded to thirty gets the thirty-chapter print page");
is(nellPrint.body.includes("FULL"), false, "and never the full one");
is((await get("/book-a/", nell)).body, "INDEX-R30", "their contents page is their span's, exactly as published");
is((await get("/book-a/ch-30", nell)).body, "CH-30", "chapter thirty serves");
is((await get("/book-a/ch-31", nell)).body.includes("CH-31"), false, "chapter thirty-one does not");

console.log("a span with no print page published");
const ari = await signIn("ari-reader-phrase");
const ariPrint = await get("/book-a/print", ari);
is(ariPrint.status, 503, "a reader whose span has no print page gets the not-published page");
is(ariPrint.body.includes("PRINT-FULL"), false, "with no fallback to the full book");

console.log("the whole-book invitation");
const whole = await signIn("whole-book-phrase");
is((await get("/book-a/print", whole)).body, "PRINT-FULL", "all true prints the whole book");

console.log("the share link");
const open = await worker.fetch(new Request(BASE + "/r/" + TOKEN), env);
is(open.status, 303, "the link signs its reader in");
const link = cookieOf(open);
is((await get("/book-a/print", link)).body, "PRINT-R30", "a link reader gets the link's span to print");
const past = await get("/book-a/ch-31", link);
is(past.body.includes("CH-31"), false, "and the chapter bound holds for them too");
is(past.body.includes("Access password"), true, "next on chapter thirty lands on the password form");
is(past.body, (await get("/book-a/ch-31")).body, "the very form a stranger gets, with nothing added");
is(past.body, (await get("/book-a/ch-999", link)).body,
   "and the same answer as a chapter that was never written, so nothing past the span can be counted");
is(/30|past|more chapters|further/i.test(past.body), false, "it says nothing about any span or what lies past it");
is((await get("/book-a/ch-92", link)).body.includes("CH-92"), false, "chapter ninety-two stays shut to the link");
is((await get("/book-a/print", link)).body.includes("FULL"), false, "the link never gets the full print page");

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
is((await get("/book-a/ch-31", both)).body, "CH-31", "with both cookies he reads chapter thirty-one");
is((await get("/book-a/ch-92", both)).body, "CH-92", "and chapter ninety-two");
is((await get("/book-a/", both)).body, "INDEX-FULL", "and his own contents page, not the link's");
is((await get("/book-a/print", both)).body, "PRINT-FULL", "and the whole book to print");
is((await get("/book-a/ch-92", link + "; " + author)).body, "CH-92", "whichever order the browser sends them in");

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
is((await get("/book-a/ch-30", legacyLink)).body, "CH-30", "a link session from before the split still reads its span");
is((await get("/book-a/ch-31", legacyLink)).body.includes("CH-31"), false, "and is still bounded");
is((await get("/book-a/ch-31", legacyLink + "; " + author)).body, "CH-31",
   "if an old link cookie and the author cookie ever arrive together, the author still wins");
const signBack = await worker.fetch(new Request(BASE + "/login", {
  method: "POST", headers: { cookie: legacyLink }, body: new URLSearchParams({ password: "the-author-phrase" }),
}), env);
const fresh = cookieOf(signBack);
is(nameOf(fresh), "cg_coiled", "signing in over an old link session writes the author cookie in its place");
is((await get("/book-a/ch-92", fresh)).body, "CH-92", "and every chapter opens again");

console.log("the way back in is always there");
is((await get("/login", link)).body.includes("Access password"), true, "the sign-in form answers any session");
is((await get("/book-a/", link)).body, "INDEX-R30", "a bounded contents page carries nothing the publish step did not write");
is((await get("/book-a/ch-45", link)).body.includes("Access password"), true, "any chapter past the span is the author's door");
const out = await worker.fetch(new Request(BASE + "/logout", { headers: { cookie: both } }), env);
const cleared = setCookies(out).map(nameOf).sort().join(",");
is(cleared, "cg_coiled,cg_coiled_r", "signing out clears both sessions");

console.log("a reader credential never opens more than its span");
const expiredAuthor = author.replace(/=(\d+)\./, "=1.");
is((await get("/book-a/ch-31", expiredAuthor + "; " + link)).body.includes("CH-31"), false,
   "a lapsed author cookie beside a link cookie is bounded, and says how to sign back in");
const forged = link.replace(/\.r:link\./, ".reader.");
is((await get("/book-a/ch-31", forged)).body.includes("CH-31"), false,
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
const legacy = await worker.fetch(new Request(BASE + "/book-a/ch-1", { headers: { cookie: shared } }), env);
is(await legacy.text(), "CH-1", "a session on the old shared slug still reads");
is(/^cg_coiled_r=[0-9]+\.r:link-[a-z0-9]{10}\./.test(setCookies(legacy)[0] || ""), true,
   "and is reissued a slug of its own on that same request");

// Book two, added 2026-09-23 under /two and at its own address since 2026-09-25. The author
// reads it; nobody invited to a stretch of book one learns that it exists, and the answer they
// get is the same password form a chapter past their span gives, so nothing under it can be
// counted or told apart from an unwritten page, and it answers exactly as a book that is not
// there at all.
console.log("book two is the author's alone");
is((await get("/book-b", author)).body, "TWO-INDEX", "the author gets book two's contents page");
is((await get("/book-b/", author)).body, "TWO-INDEX", "with or without the slash");
is((await get("/book-b/ch-1", author)).body, "TWO-CH-1", "and its chapters");
is((await get("/book-b/print", author)).body, "TWO-PRINT", "and its print edition");
is((await get("/book-b/x", author)).status, 404, "a path under it that is not a page is nothing");
is((await get("/book-bx", author)).status, 404, "and a path that only starts like it is nothing");
is((await get("/book-b/ch-1", whole)).body, "TWO-CH-1", "the all-true invitation reads book two too");
for (const [who, c] of [["a stranger", null], ["a bounded reader", nell], ["the link", link]]) {
  for (const p of ["/book-b", "/book-b/ch-1", "/book-b/print", "/two", "/two/ch-1", "/two/print", "/nothing"]) {
    const r = await get(p, c);
    is(r.status, 200, `${who} asking for ${p} gets the password form`);
    is(r.body.includes("TWO"), false, `and no page of book two`);
    is(r.body, (await get("/book-a/ch-999", c)).body, `the same answer as a chapter never written`);
    is(r.location, null, `and no redirect, so the address never names book two`);
  }
}

// Kane, 2026-09-25: "it should be /coiledguardian/<title>". Every book moved to its own address,
// and the addresses from before land where their page lives now: the bare prefix and book one's
// old paths for anybody signed in, book two's old paths for the author and the all-true reader.
console.log("the addresses before the retitle");
const at = (p) => "/coiledguardian" + p;
for (const [from, to] of [["/", "/book-a/"], ["", "/book-a/"], ["/print", "/book-a/print"],
                          ["/ch-92", "/book-a/ch-92"], ["/two", "/book-b/"], ["/two/", "/book-b/"],
                          ["/two/ch-1", "/book-b/ch-1"], ["/two/print", "/book-b/print"]]) {
  const r = await get(from, author);
  is(r.status === 302 && r.location, at(to), `the author asking for ${from || "the bare prefix"} is sent to ${to}`);
}
is((await get("/two/ch-1", whole)).location, at("/book-b/ch-1"), "and so is the all-true reader");
is((await get("/ch-92", author)).cache.includes("no-store"), true, "a redirect is never cached, so an address can move again");
is((await get("/two/x", author)).location, at("/book-b/x"), "anything under /two follows, and is judged where it lands");
is((await get("/nothing", author)).status, 404, "a book the site does not carry is nothing");
is((await get("/", nell)).location, at("/book-a/"), "a bounded reader at the bare prefix lands on their contents page");
is((await get("/ch-1", link)).location, at("/book-a/ch-1"), "and a link reader's old chapter address still opens");
is((await get("/ch-31", link)).location, at("/book-a/ch-31"), "past the span the old address moves the same way");
is((await get("/ch-999", link)).location, at("/book-a/ch-999"), "as does one never written, so the move counts nothing");
const landing = await worker.fetch(new Request(BASE + "/login", {
  method: "POST", body: new URLSearchParams({ password: "the-author-phrase" }),
}), env);
is(landing.headers.get("location"), at("/"), "signing in lands on the bare prefix");
is((await get("/", author)).location, at("/book-a/"), "which is book one's contents page");
is((await worker.fetch(new Request(BASE + "/r/" + TOKEN), env)).headers.get("location"), at("/"),
   "and so does the share link");
is((await get("/", null)).body.includes("Access password"), true, "a stranger at the bare prefix gets the password form");
is((await get("/", null)).location, null, "and no redirect naming a book");

// The table is the publish step's, so a retitle is a table change and nothing here. What the
// table can never do is decide who reads what: a bounded reader stays on book one whatever it
// says, and an entry the gate cannot use is dropped.
console.log("the address table");
const table = store.get("cg:books");
const retable = (o) => store.set("cg:books", JSON.stringify(o));
retable({ home: "book-a", books: [{ slug: "book-a", keys: "cg:" }, { slug: "book-c", keys: "cg:two:" }] });
is((await get("/book-c/ch-1", author)).body, "TWO-CH-1", "a retitled book answers at its new address");
is((await get("/book-b/ch-1", author)).status, 404, "and its old slug is nothing");
is((await get("/two/ch-1", author)).location, at("/book-c/ch-1"), "while /two follows it to the new one");
retable({ home: "book-b", books: [{ slug: "book-a", keys: "cg:" }, { slug: "book-b", keys: "cg:two:", spans: true }] });
is((await get("/", author)).location, at("/book-b/"), "the author lands wherever the table calls home");
is((await get("/", nell)).location, at("/book-a/"), "a bounded reader lands on book one whatever it calls home");
is((await get("/book-b/ch-1", nell)).body.includes("TWO"), false, "and no table entry opens another book to a reader");
retable({ home: "book-a", books: [{ slug: "book-a", keys: "cg:" }, { slug: "login", keys: "cg:two:" },
  { slug: "notes", keys: "cg:" }, { slug: "rv", keys: "cg:review:" }, { slug: "ext", keys: "gd:" },
  { slug: "Caps", keys: "cg:two:" }, { slug: "ch-9", keys: "cg:two:" }] });
is((await get("/login", author)).body.includes("Access password"), true, "a reserved slug never shadows the gate's own paths");
is((await get("/rv/", author)).status, 404, "an entry pointing at the reader stores is dropped");
is((await get("/ext/", author)).status, 404, "as is one pointing outside the book's keys");
is((await get("/ch-9", author)).location, at("/book-a/ch-9"), "and a chapter-shaped slug never shadows a chapter");
// Before the first publish that writes a table, the gate serves the addresses it served before
// the retitle, with their old bounds, so a deploy ahead of the publish breaks nothing.
store.delete("cg:books");
is((await get("/", author)).body, "INDEX-FULL", "with no table the bare prefix is book one's contents page again");
is((await get("/ch-92", author)).body, "CH-92", "book one's chapters answer at their old address");
is((await get("/two/ch-1", author)).body, "TWO-CH-1", "and book two's under /two");
is((await get("/book-a/ch-1", author)).status, 404, "while an address from the table is nothing yet");
is((await get("/", nell)).body, "INDEX-R30", "a bounded reader keeps their span's contents page");
is((await get("/ch-31", nell)).body.includes("CH-31"), false, "and their bound");
is((await get("/two/ch-1", link)).body, (await get("/ch-999", link)).body,
   "and book two is the same password form to the link as a chapter never written");
is((await get("/two", link)).body.includes("TWO"), false, "with no page of it");
store.set("cg:books", table);

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

// bar-raise 2026-09-24, security-02: the notes POST took any array under 512 kilobytes and
// merged it in with no check on what a single note held and no cap on how large the store
// could grow. These prove both guards actually bite.
console.log("malformed notes are dropped, not stored");
store.set("cg:notes", JSON.stringify({ v: 1, notes: [] }));
await post([
  { id: "v1", at: "2026-09-24T13:00:00Z", text: "a fine note" },
  { id: "v2", at: "2026-09-24T13:00:00Z", text: 12345 },             // text must be a string
  { id: 999, at: "2026-09-24T13:00:00Z", text: "id is a number" },   // id must be a string
  "not even an object",
  { id: "v3", at: "2026-09-24T13:00:00Z", text: "x".repeat(30000) }, // text over the cap
]);
const notesNow = () => JSON.parse(store.get("cg:notes")).notes.map((n) => n.id);
is(notesNow().includes("v1"), true, "a well-formed note is stored");
is(notesNow().includes("v2"), false, "a non-string text is dropped");
is(notesNow().includes("v3"), false, "text over the field cap is dropped");
is(notesNow().length, 1, "the number-id and bare-string entries never made it in either");

console.log("the store caps its size");
const seeded = [];
for (let i = 0; i < 4000; i++) {
  seeded.push({ id: "seed-" + i, at: "2026-01-01T00:00:00." + String(i).padStart(4, "0") + "Z", text: "seed" });
}
store.set("cg:notes", JSON.stringify({ v: 1, notes: seeded }));
await post([{ id: "newest", at: "2099-01-01T00:00:00Z", text: "pushes the store over the cap" }]);
const capped = JSON.parse(store.get("cg:notes")).notes;
is(capped.length, 4000, "the store never grows past its cap");
is(capped.some((n) => n.id === "newest"), true, "the newest note survives the cap");
is(capped.some((n) => n.id === "seed-0"), false, "the oldest note is dropped to make room");

console.log(failed ? `\n${failed} failure(s)` : "\nselftest passed");
process.exit(failed ? 1 : 0);
