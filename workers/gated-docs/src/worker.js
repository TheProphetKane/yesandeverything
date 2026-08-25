// worker.js: the gate in front of the private design documents on yesandeverything.com.
//
// Routed at /hordes/* and /brackish-rising/*, which take precedence over the GitHub Pages
// origin serving the rest of this site. There is no static-asset binding and no path that
// skips the check: every request resolves a document, then a session, and only then reads the
// body out of the key-value namespace.
//
// The document bodies are NOT in this repository. Each project's publish step writes its
// document into the GATED_DOCS namespace; this Worker reads it back after authenticating.
// That is the whole point of the migration: this repository is public, and the previous
// arrangement committed the entire document here as base64 with the password in a variable
// above it.

import {
  roleFor, issueCookie, sessionRole, clearCookie,
  loginPage, loginHeaders, docHeaders,
} from "./auth.js";

/**
 * The gated documents.
 *
 * `prefix`  the path this document owns, and the cookie's Path, so a session for one document
 *           is never sent to the other.
 * `key`     the key-value key its body is published under, and part of the signed cookie
 *           payload, so a cookie minted for one document does not validate for another.
 * `accessModeKey` the local-storage flag the document itself reads to decide whether editing
 *           is available. Set from the session role, so the editor phrase is never handed to a
 *           viewer and the flag can no longer be set by typing it into a console prompt.
 */
const DOCS = [
  {
    prefix: "/hordes",
    key: "hordes",
    cookie: "hordes",
    title: "Here Be Hordes: Game Design Document",
    viewerSecret: "HORDES_PASSWORD",
    editorSecret: "HORDES_EDITOR_PASSWORD",
    accessModeKey: "htbh-access-mode",
  },
  {
    prefix: "/brackish-rising",
    key: "brackish-rising",
    cookie: "rising",
    title: "Brackish Rising: Game Design Document",
    viewerSecret: "RISING_PASSWORD",
    editorSecret: "RISING_EDITOR_PASSWORD",
    accessModeKey: "brackish-access-mode",
  },
];

const docFor = (path) =>
  DOCS.find((d) => path === d.prefix || path.startsWith(d.prefix + "/"));

const html = (body, status = 200, headers = {}) =>
  new Response(body, { status, headers });

/**
 * Stamp the access mode into the document before it is served.
 *
 * The documents read a local-storage flag to decide whether their editing affordances are
 * available. Previously the page set that flag when the visitor typed the editor phrase, which
 * meant the phrase had to ship to every visitor. Now the SERVER knows the role and writes the
 * flag, so a viewer's browser never receives the editor phrase at all.
 *
 * Injected immediately after the opening head tag so it runs before any of the document's own
 * script reads the flag. If the document has no head tag the body is served untouched rather
 * than mangled: a document that renders without its editing affordances is a smaller failure
 * than one that does not render.
 */
function withAccessMode(body, doc, role) {
  const stamp =
    `<script>try{localStorage.setItem(${JSON.stringify(doc.accessModeKey)},` +
    `${JSON.stringify(role)});}catch(e){}</script>`;
  const m = body.match(/<head[^>]*>/i);
  if (!m) return body;
  const at = m.index + m[0].length;
  return body.slice(0, at) + stamp + body.slice(at);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const doc = docFor(path);

    // The route should make this unreachable. If a route is ever widened by accident, refuse
    // rather than fall through to something that might serve content.
    if (!doc) return html("Not found", 404, docHeaders());

    const rest = path.slice(doc.prefix.length);

    // --- login (unauthenticated) ---
    if (rest === "/login" && request.method === "POST") {
      const form = await request.formData().catch(() => null);
      const role = form ? await roleFor(form.get("password"), doc, env) : null;
      if (role) {
        return html("", 303, {
          ...loginHeaders(),
          location: doc.prefix + "/",
          "set-cookie": await issueCookie(doc, role, env),
        });
      }
      // Blunt brute-force cost, same as the architecture gate. Not a rate limiter: it makes a
      // guessing run expensive without any state to keep or to get wrong.
      await new Promise((r) => setTimeout(r, 600));
      return html(loginPage(doc, "Incorrect password."), 401, loginHeaders());
    }

    if (rest === "/logout") {
      return html(loginPage(doc, "Signed out."), 200, {
        ...loginHeaders(),
        "set-cookie": clearCookie(doc),
      });
    }

    // --- the gate: nothing below here runs without a valid session ---
    const role = await sessionRole(request, doc, env);
    if (!role) return html(loginPage(doc), 200, loginHeaders());
    if (request.method !== "GET") return html("Method Not Allowed", 405, loginHeaders());

    // --- the document ---
    const body = await env.GATED_DOCS.get(doc.key);
    if (!body) {
      // Authenticated and there is nothing to serve: the publish step has not run, or it wrote
      // under a different key. Said plainly rather than as a 404, because a 404 here would read
      // as "wrong link" and send somebody looking in the wrong place.
      console.error("GATED_DOCS has no body under key " + doc.key);
      return html(
        `<!doctype html><meta charset="utf-8"><title>Not published</title>` +
        `<body style="font:16px/1.6 system-ui;padding:48px;max-width:60ch">` +
        `<h1>Not published yet</h1><p>You are signed in, but no document has been published ` +
        `under <code>${doc.key}</code>. The project's publish step writes it; run that and ` +
        `reload.</p></body>`,
        503, docHeaders()
      );
    }

    return html(withAccessMode(body, doc, role), 200, docHeaders());
  },
};
