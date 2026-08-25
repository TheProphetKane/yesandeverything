// auth.js: the server-side gate for the private design documents.
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

const COOKIE_PREFIX = "gd_";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h, matching the architecture gate

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

/**
 * Which role does this password unlock, if any?
 *
 * Two tiers, because the documents themselves have two. The editor phrase turns on in-document
 * editing (the Progress tab reads an access-mode flag); the viewer phrase does not. Both are
 * checked every time rather than short-circuiting on the first match, so the answer takes the
 * same work either way.
 */
export async function roleFor(submitted, doc, env) {
  const viewer = await passwordMatches(submitted, env[doc.viewerSecret]);
  const editor = doc.editorSecret ? await passwordMatches(submitted, env[doc.editorSecret]) : false;
  if (editor) return "editor";
  if (viewer) return "viewer";
  return null;
}

// The cookie is stateless and signed: "<expiry>.<role>.<signature>". The signature covers the
// document key as well as the expiry and role, so a session for one document is not a session
// for another. Nothing in it is secret; it cannot be forged without SESSION_SECRET.
export async function issueCookie(doc, role, env) {
  const exp = String(Date.now() + TTL_MS);
  const payload = `${doc.key}.${exp}.${role}`;
  const sig = b64url(await hmac(env.SESSION_SECRET, payload));
  return [
    `${COOKIE_PREFIX}${doc.cookie}=${exp}.${role}.${sig}`,
    "Path=" + doc.prefix,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${TTL_MS / 1000}`,
  ].join("; ");
}

/** The role this request carries for this document, or null. */
export async function sessionRole(request, doc, env) {
  if (!env.SESSION_SECRET) return null;
  const name = COOKIE_PREFIX + doc.cookie;
  const raw = (request.headers.get("cookie") || "")
    .split(/;\s*/)
    .find((c) => c.startsWith(name + "="));
  if (!raw) return null;

  const val = raw.slice(name.length + 1);
  const parts = val.split(".");
  if (parts.length !== 3) return null;
  const [exp, role, sig] = parts;
  if (!/^\d+$/.test(exp)) return null;
  if (role !== "viewer" && role !== "editor") return null;

  const expect = b64url(await hmac(env.SESSION_SECRET, `${doc.key}.${exp}.${role}`));
  if (!ctEqual(enc.encode(sig), enc.encode(expect))) return null;
  if (Number(exp) <= Date.now()) return null;
  return role;
}

export function clearCookie(doc) {
  return `${COOKIE_PREFIX}${doc.cookie}=; Path=${doc.prefix}; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

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
  <div class="sub">${esc(doc.title)}: confidential</div>
  ${error ? `<div class="err">${esc(error)}</div>` : ""}
  <label for="p">Access password</label>
  <input id="p" name="password" type="password" autofocus required>
  <button type="submit">Enter</button>
  <div class="note">This document is access-controlled on the server and excluded from search
  indexes. If you were sent this link, the password came with it.</div>
</form></body></html>`;
}
