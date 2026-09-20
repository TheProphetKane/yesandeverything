// auth.selftest.mjs -- proves the reviewer tier of the gate, because a check added is a check
// proved. Run: node src/auth.selftest.mjs
//
// What it holds down, all of it security-shaped:
//   a reviewer phrase unlocks that reviewer and nobody else
//   the author's phrase still unlocks the author
//   a wrong phrase unlocks nothing
//   a malformed REVIEWERS secret unlocks nothing rather than half a map
//   a cookie signed for one role does not validate as another, so a reviewer cannot
//     promote itself to the author by editing the role in its own cookie
//   a cookie signed for another book's key does not validate here

import { roleFor, reviewerOf, reviewerThrough, issueCookie, sessionRole } from "./auth.js";

const BOOK = { prefix: "/coiledguardian", key: "coiled-guardian", cookie: "coiled",
               title: "The Coiled Guardian", viewerSecret: "COILED_PASSWORD" };

const env = {
  SESSION_SECRET: "test-session-secret-not-the-real-one",
  COILED_PASSWORD: "the-author-phrase",
  REVIEWERS: JSON.stringify({
    "nell": "nell-reader-phrase",
    "ari-b": { "phrase": "ari-reader-phrase", "through": 30 },
  }),
};

let failed = 0;
const is = (got, want, what) => {
  if (got === want) { console.log("  ok    " + what); return; }
  failed++;
  console.log("  FAIL  " + what + "\n        got " + JSON.stringify(got) +
              ", want " + JSON.stringify(want));
};

const reqWith = (cookie) => ({ headers: { get: (h) => (h === "cookie" ? cookie : null) } });

console.log("roles");
is(await roleFor("the-author-phrase", BOOK, env), "reader", "the author's phrase is the author");
is(await roleFor("nell-reader-phrase", BOOK, env), "r:nell", "a reviewer phrase is that reviewer");
is(await roleFor("ari-reader-phrase", BOOK, env), "r:ari-b", "the second reviewer is the second reviewer");
is(await roleFor("guess", BOOK, env), null, "a wrong phrase is nobody");
is(await roleFor("", BOOK, env), null, "an empty phrase is nobody");
is(reviewerOf("reader"), null, "the author carries no reviewer slug");
is(reviewerOf("r:nell"), "nell", "a reviewer role carries its slug");
is(reviewerOf("r:../../etc"), null, "a slug that is not a slug is refused");

console.log("a broken secret locks the invitations out");
is(await roleFor("nell-reader-phrase", BOOK, { ...env, REVIEWERS: "{not json" }, ), null,
   "malformed JSON yields no reviewers");
is(await roleFor("short", BOOK, { ...env, REVIEWERS: JSON.stringify({ a: "short" }) }), null,
   "a phrase under eight characters is not accepted");
is(await roleFor("the-author-phrase", BOOK, { ...env, REVIEWERS: "[]" }), "reader",
   "a broken secret does not break the author's own sign-in");

console.log("cookies");
const asReviewer = (await issueCookie(BOOK, "r:nell", env)).split(";")[0];
is(await sessionRole(reqWith(asReviewer), BOOK, env), "r:nell", "a reviewer cookie round-trips");
const asAuthor = (await issueCookie(BOOK, "reader", env)).split(";")[0];
is(await sessionRole(reqWith(asAuthor), BOOK, env), "reader", "the author's cookie round-trips");

const [name, value] = asReviewer.split("=");
const [exp, , sig] = value.split(".");
is(await sessionRole(reqWith(`${name}=${exp}.reader.${sig}`), BOOK, env), null,
   "a reviewer cannot become the author by editing the role in its own cookie");
is(await sessionRole(reqWith(`${name}=${exp}.r:ari-b.${sig}`), BOOK, env), null,
   "a reviewer cannot become another reviewer either");
is(await sessionRole(reqWith(`${name}=${exp}.r:nell.${sig}`), { ...BOOK, key: "other-book" }, env),
   null, "a cookie for this book is not a cookie for another");
is(await sessionRole(reqWith(`${name}=1.r:nell.${sig}`), BOOK, env), null,
   "an expired cookie is refused");

console.log("invited spans");
is(reviewerThrough("r:nell", env), null, "a reviewer with no span sees everything published");
is(reviewerThrough("r:ari-b", env), 30, "a reviewer invited through thirty carries thirty");
is(reviewerThrough("reader", env), null, "the author is bounded by nothing");
is(reviewerThrough("r:ari-b", { ...env, REVIEWERS: "{broken" }), null,
   "a broken secret bounds nobody, because it invites nobody");
is(await roleFor("ari-reader-phrase", BOOK, env), "r:ari-b",
   "the object form of an invitation still unlocks its reviewer");

console.log(failed ? `\n${failed} failure(s)` : "\nselftest passed");
process.exit(failed ? 1 : 0);
