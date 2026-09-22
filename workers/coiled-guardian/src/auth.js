// auth.js: the server-side gate for the private manuscript at /coiledguardian.
//
// Copied from workers/gated-docs/src/auth.js on 2026-08-27 rather than shared, because the two
// Workers deploy separately and a shared module across deploy units is a coupling that buys
// nothing here. The cookie prefix differs so a session for one is never a session for the other.
// Roles: "reader" is the author's own session. Since 2026-09-20 an invited outside reviewer
// signs in with their own phrase and carries "r:<slug>", which the Worker uses to keep that
// reviewer's annotations in their own key. The role is signed into the cookie, so a reviewer
// cannot become the author or another reviewer by editing it.
//
// This is a copy of the model already proven on architecture.yesandeverything.com, widened to
// carry a ROLE and to serve more than one document. The property that matters is unchanged:
// nothing protected is ever emitted to an unauthenticated request. The document body lives in
// a key-value namespace, not in this repository, and the passwords live only as Worker
// secrets.
//
// What it replaces: two pages that shipped the whole document as base64 inside the HTML with
// the password in a variable a few lines above it. Those withheld nothing. Anyone could read
// the password out of the source, and anyone could skip the password entirely by decoding the
// payload. This repository is public, so both were readable without even loading the page.

const COOKIE_PREFIX = "cg_";
const TTL_MS = 12 * 60 * 60 * 1000;             // 12h for a reviewer's phrase
const LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;   // 30d for a share link, because the reader has no
                                                // phrase to fall back on when a session runs out
const AUTHOR_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d for the author, so his own session never
                                                // runs out underneath a reader session and
                                                // leaves him bounded without knowing why

// Two cookies, one for the author and one for everybody else (Kane, 2026-09-21). Until then a
// single cookie carried whichever role signed in last, so opening his own share link on his own
// phone replaced his session with the link's, and he was locked out of every chapter past
// thirty with nothing on the page telling him why. He had asked for readers on a host of their
// own for exactly this separation, and the session that built the link kept one host and one
// cookie instead. The share link stays where it was sent; the separation now lives in the
// cookies. A reader session is written only to READER_SUFFIX, never over the author's, and a
// valid author session wins whenever both are present, so no reader credential can bound him.
const READER_SUFFIX = "_r";
const isAuthor = (role) => role === "reader";
const cookieName = (doc, role) =>
  COOKIE_PREFIX + doc.cookie + (isAuthor(role) ? "" : READER_SUFFIX);

const enc = new TextEncoder();

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function sha256(str) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(str)));
}

// Constant-time compare of two equal-length byte arrays. Length inequality returns early,
// which leaks only the length, and every value compared here is a fixed-length digest.
function ctEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

// Compare a submitted password against a secret through their digests, so the comparison runs
// over fixed-length input and cannot leak the secret's length through timing.
async function passwordMatches(submitted, secret) {
  if (!submitted || !secret) return false;
  const [a, b] = await Promise.all([sha256(submitted), sha256(secret)]);
  return ctEqual(a, b);
}

/** A reviewer slug is short, lowercase and safe to sign into a cookie and to use as a key. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,23}$/;

// The slug the share link signs in as. Reserved, so a named invitation can never take it and
// quietly inherit or overwrite the link's notes.
export const LINK_SLUG = "link";
export const LINK_TTL = LINK_TTL_MS;

// Every browser that opens the share link gets a slug of its own, link-<ten random characters>,
// so its notes live under a key of their own and no link reader reads another's (Kane,
// 2026-09-22). Until then every link reader wrote to the one key cg:review:link, and when his
// own phone was on the link its whole store of his notes landed there too, where every other
// link reader's page would have shown them. A session minted before this carries the bare slug
// "link"; the gate reissues it a slug of its own on its next request.
const LINK_ID = /^link-[a-z0-9]{10}$/;
export const isLinkSlug = (slug) => slug === LINK_SLUG || LINK_ID.test(slug || "");
export function newLinkRole() {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return "r:" + LINK_SLUG + "-" + Array.from(a, (x) => "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]).join("");
}

/**
 * The open share link, from the SHARE secret, or null when there is none.
 *
 * Kane, 2026-09-20: "how about the fact that I have to share a password? Id rather just have it
 * live an unbounded on my site, easy to share with anyone at a moment. Then drop it when I am
 * ready to publish and put it back behind a gate."
 *
 * So the link is the whole credential. It carries enough random bits that it cannot be guessed
 * or walked, which is what keeps an unpublished manuscript off the open web while still being
 * one thing he can paste into a message. Nothing links to it and every page under this Worker
 * is sent with noindex, so it reaches exactly the people he sends it to. Dropping it is one
 * secret delete, after which the site is back to phrases only.
 *
 * The secret is {"token": "...", "through": 30}, or a bare token string for the default span.
 * A token under 24 characters is refused rather than served, because a short one is guessable
 * and a half-configured secret should close the door, not open it.
 */
export function shareLink(env) {
  let raw;
  try { raw = JSON.parse(env.SHARE || "null"); } catch { return null; }
  const token = typeof raw === "string" ? raw
    : (raw && typeof raw === "object" && typeof raw.token === "string" ? raw.token : null);
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{24,128}$/.test(token)) return null;
  const n = raw && typeof raw === "object" ? raw.through : null;
  const through = Number.isInteger(n) && n > 0 && n < 1000 ? n : DEFAULT_SPAN;
  return { token, through };
}

/** Does this path token open the share link? Compared through digests, never by === . */
export async function matchesShare(token, env) {
  const live = shareLink(env);
  if (!live || typeof token !== "string") return false;
  const [a, b] = await Promise.all([sha256(token), sha256(live.token)]);
  return ctEqual(a, b);
}

// How far an invited reader gets when the invitation does not say. The bound defaults closed
// (Kane, 2026-09-20). He asked for outside readers on a subdomain of their own so the rest of the
// book stayed locked; the session kept one host instead, which was its call over his and led to
// the lockout the two-cookie split above now prevents. The span lock itself failed the wrong way
// at first: a bare phrase, or an entry whose `through` was mistyped, used to mean everything
// published. One slip in a secret nobody reviews would have handed a stranger the
// unfinished half of a first draft. Now a reader is bounded unless the invitation says
// otherwise in as many words, so the slip locks down instead of opening up.
const DEFAULT_SPAN = 30;

/**
 * The invited outside reviewers, from the REVIEWERS secret.
 *
 * Each entry is `"slug": "phrase"` for a reader bounded to the default span, or
 * `"slug": { "phrase": "...", "through": 45 }` for one invited to a span of their own, or
 * `"slug": { "phrase": "...", "all": true }` for the one case that opens the whole book. The
 * span matters: a first draft goes out to a stranger one finished stretch at a time, and
 * handing over the chapters that have not had their pass spends a reading on known-unfinished
 * work.
 *
 * One secret rather than one per reviewer, because adding a reader to a manuscript should not
 * need a deploy or a config change: `wrangler secret put REVIEWERS` with the new map does it.
 * A malformed secret yields no reviewers at all rather than a half-parsed map, so a typo locks
 * the invitations out instead of letting an unintended phrase through.
 */
function reviewers(env) {
  let raw;
  try { raw = JSON.parse(env.REVIEWERS || "{}"); } catch { return []; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out = [];
  for (const [slug, v] of Object.entries(raw)) {
    if (!SLUG.test(slug) || slug === LINK_SLUG || slug.startsWith(LINK_SLUG + "-")) continue;
    const obj = v && typeof v === "object" && !Array.isArray(v) ? v : null;
    const phrase = typeof v === "string" ? v : (obj && typeof obj.phrase === "string" ? obj.phrase : null);
    if (typeof phrase !== "string" || phrase.length < 8) continue;
    // The whole book takes an explicit true and nothing else. Any other value, including a
    // string "true" out of a hand-edited secret, leaves the reader bounded.
    if (obj && obj.all === true) { out.push([slug, phrase, null]); continue; }
    const n = obj ? obj.through : null;
    const through = Number.isInteger(n) && n > 0 && n < 1000 ? n : DEFAULT_SPAN;
    out.push([slug, phrase, through]);
  }
  return out;
}

/**
 * How far into the book this reader was invited.
 *
 * A chapter number bounds them. Null means no bound, which is the author's session and an
 * invited reader whose entry says `"all": true`. A reader the secret does not carry at all
 * cannot hold a valid cookie, because roleFor is the only thing that mints one.
 */
export function reviewerThrough(role, env) {
  const slug = reviewerOf(role);
  if (!slug) return null;
  if (isLinkSlug(slug)) {
    const live = shareLink(env);
    return live ? live.through : DEFAULT_SPAN;
  }
  const row = reviewers(env).find(([s]) => s === slug);
  return row ? row[2] : DEFAULT_SPAN;
}

/**
 * Which role does this password unlock, if any?
 *
 * "reader" is the author. "r:<slug>" is an invited outside reviewer, whose annotations the
 * Worker then keeps under a key of their own. Every candidate is checked every time rather
 * than short-circuiting on the first match, so the answer takes the same work either way and
 * a wrong phrase cannot be told from a right one by how long the refusal took.
 */
export async function roleFor(submitted, doc, env) {
  let found = null;
  if (await passwordMatches(submitted, env[doc.viewerSecret])) found = "reader";
  for (const [slug, phrase] of reviewers(env)) {
    if (await passwordMatches(submitted, phrase) && !found) found = "r:" + slug;
  }
  return found;
}

/** The reviewer slug a role carries, or null for the author's own session. */
export function reviewerOf(role) {
  if (typeof role !== "string" || !role.startsWith("r:")) return null;
  const slug = role.slice(2);
  return SLUG.test(slug) ? slug : null;
}

// The cookie is stateless and signed: "<expiry>.<role>.<signature>". The signature covers the
// document key as well as the expiry and role, so a session for one document is not a session
// for another. Nothing in it is secret; it cannot be forged without SESSION_SECRET.
//
// SameSite=Lax, not Strict (Kane, 2026-09-21: the share link "worked for me on my desktop but
// wont work for my mom or me on the phone"). A link tapped in a message app is a navigation
// that starts outside the site, and a Strict cookie is withheld from every request in it, the
// redirect after /r/<token> included. So the link set the cookie, redirected to the contents
// page, and arrived there bare, which the reader saw as a password form. A pasted address bar
// counts as the site's own navigation, which is why the desktop worked. Lax is sent on a
// top-level GET from anywhere and never on a cross-site POST, so the notes store behind the
// session stays out of reach of another site's forms, which is all Strict was doing here.
export async function issueCookie(doc, role, env, ttl) {
  if (ttl === undefined) ttl = isAuthor(role) ? AUTHOR_TTL_MS : TTL_MS;
  const exp = String(Date.now() + ttl);
  const payload = `${doc.key}.${exp}.${role}`;
  const sig = b64url(await hmac(env.SESSION_SECRET, payload));
  return [
    `${cookieName(doc, role)}=${exp}.${role}.${sig}`,
    "Path=" + doc.prefix,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${ttl / 1000}`,
  ].join("; ");
}

// One cookie value checked: its signature, its expiry, and that the role is one this gate mints.
async function validRole(val, doc, env) {
  const parts = val.split(".");
  if (parts.length !== 3) return null;
  const [exp, role, sig] = parts;
  if (!/^\d+$/.test(exp)) return null;
  if (!isAuthor(role) && !reviewerOf(role)) return null;

  const expect = b64url(await hmac(env.SESSION_SECRET, `${doc.key}.${exp}.${role}`));
  if (!ctEqual(enc.encode(sig), enc.encode(expect))) return null;
  if (Number(exp) <= Date.now()) return null;
  return role;
}

/**
 * The role this request carries for this document, or null.
 *
 * Every cookie the gate could have set is read, the author's and the reader's, and a valid
 * author session wins over any reader session beside it. The author's cookie can still hold a
 * reader role, because before 2026-09-21 every session was written there; those link sessions
 * keep working as reader sessions until they expire, and they lose to the author the same way.
 */
export async function sessionRole(request, doc, env) {
  if (!env.SESSION_SECRET) return null;
  const names = [COOKIE_PREFIX + doc.cookie, COOKIE_PREFIX + doc.cookie + READER_SUFFIX];
  const jar = (request.headers.get("cookie") || "").split(/;\s*/);
  let reader = null;
  for (const c of jar) {
    const name = names.find((n) => c.startsWith(n + "="));
    if (!name) continue;
    const role = await validRole(c.slice(name.length + 1), doc, env);
    if (isAuthor(role)) return role;
    if (role && !reader) reader = role;
  }
  return reader;
}

/** Set-Cookie values that sign this browser out of every session the gate could have set. */
export function clearCookies(doc) {
  return [COOKIE_PREFIX + doc.cookie, COOKIE_PREFIX + doc.cookie + READER_SUFFIX].map((n) =>
    `${n}=; Path=${doc.prefix}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export { isAuthor };

/**
 * Headers for the login page. Strict, because this page is ours and needs no scripts at all.
 */
export function loginHeaders(extra = {}) {
  return {
    "content-type": "text/html; charset=utf-8",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "cache-control": "no-store, max-age=0",
    "strict-transport-security": "max-age=63072000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy":
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'none'; " +
      "img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    ...extra,
  };
}

/**
 * Headers for a document response.
 *
 * Deliberately looser than the login page on scripts and styles: these documents are
 * self-contained pages built by their own projects, full of inline script for the tab strip,
 * the progress editor and the charts, and a script-src of 'none' would serve a broken page.
 * The parts that actually matter for a private document are unchanged and are the reason this
 * gate exists: no indexing, no caching, no framing, and no referrer leaking the URL onward.
 */
export function docHeaders(extra = {}) {
  return {
    "content-type": "text/html; charset=utf-8",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "cache-control": "no-store, max-age=0, must-revalidate",
    "strict-transport-security": "max-age=63072000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    ...extra,
  };
}

const LOGIN_CSS = `
:root{--bg:#0e1014;--panel:#161a21;--fg:#e7e9ee;--muted:#9aa4b2;--accent:#5ad1c8;--line:#262c37;--avoid:#e5484d}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:
radial-gradient(1200px 700px at 50% -10%,rgba(90,209,200,.08),transparent),var(--bg);color:var(--fg);
font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.box{width:min(420px,92vw);background:var(--panel);border:1px solid var(--line);border-radius:16px;
padding:30px 28px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.brand{font-family:ui-monospace,monospace;font-weight:700;font-size:16px;letter-spacing:.02em}
.brand b{color:var(--accent)}
.sub{color:var(--muted);font-size:12px;margin:6px 0 22px;letter-spacing:.03em}
label{font-family:ui-monospace,monospace;font-size:12px;color:var(--muted);display:block;
margin-bottom:7px;text-transform:uppercase;letter-spacing:.06em}
input{width:100%;background:#0b0d11;border:1px solid var(--line);border-radius:10px;color:var(--fg);
padding:12px 13px;font-size:15px;outline:none}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(90,209,200,.18)}
button{margin-top:16px;width:100%;background:var(--accent);color:#04201d;border:0;border-radius:10px;
padding:12px;font-family:ui-monospace,monospace;font-weight:700;font-size:14px;cursor:pointer}
button:hover{filter:brightness(1.06)}
.err{background:rgba(229,72,77,.12);border:1px solid rgba(229,72,77,.4);color:#f0888b;
border-radius:9px;padding:9px 12px;font-size:13px;margin-bottom:16px}
.note{color:var(--muted);font-size:11.5px;margin-top:16px;line-height:1.5}`;

export function loginPage(doc, error = "") {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Restricted: ${esc(doc.title)}</title>
<style>${LOGIN_CSS}</style></head><body>
<form class="box" method="POST" action="${esc(doc.prefix)}/login" autocomplete="off">
  <div class="brand">Yes&amp;<b>Everything</b></div>
  <div class="sub">${esc(doc.title)}</div>
  ${error ? `<div class="err">${esc(error)}</div>` : ""}
  <label for="p">Access password</label>
  <input id="p" name="password" type="password" autofocus required>
  <button type="submit">Enter</button>
  <div class="note">An unpublished manuscript, access-controlled on the server and excluded from
  search indexes. If you were sent this link, the password came with it.</div>
</form></body></html>`;
}
