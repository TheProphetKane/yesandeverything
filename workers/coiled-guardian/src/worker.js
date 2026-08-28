// worker.js: the gate in front of the private manuscript at /coiledguardian.
//
// The Coiled Guardian is an unpublished novel series written in X:\CoiledGuardian. It is not
// public, it is intended to sell, and nothing about it may reach this repository, which is
// public. The chapter bodies live in the GATED_DOCS key-value namespace, written by that
// project's publish step, and are read back only after a session cookie validates.
//
// Same shape as workers/gated-docs, with one difference that matters: that Worker serves one
// document per prefix, and this one serves many pages under a single prefix. So the page is
// resolved from the rest of the path AFTER the session check rather than before it, and an
// unknown page under a valid session is a 404 rather than a hint that something is there.
//
// There is deliberately no assets binding. An assets binding serves static files before fetch()
// runs, and a gate that can be skipped by a path is not a gate.

import {
  roleFor, issueCookie, sessionRole, clearCookie,
  loginPage, loginHeaders, docHeaders,
} from "./auth.js";

const BOOK = {
  prefix: "/coiledguardian",
  key: "coiled-guardian",          // signed into the cookie, so a session is book-scoped
  cookie: "coiled",
  title: "The Coiled Guardian",
  viewerSecret: "COILED_PASSWORD",
};

// Every page this Worker will serve, and the key-value key each one is published under. A path
// that is not on this list is a 404 even for a signed-in reader, so adding a chapter is a
// deliberate edit here and not a matter of what happens to be sitting in the namespace.
const PAGES = {
  "": "cg:index",
  "/": "cg:index",
  "/ch-1": "cg:ch-1",
  "/ch-2": "cg:ch-2",
  "/ch-3": "cg:ch-3",
  "/ch-4": "cg:ch-4",
  "/ch-5": "cg:ch-5",
};

const html = (body, status = 200, headers = {}) =>
  new Response(body, { status, headers });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // The route should make this unreachable. If a route is ever widened by accident, refuse
    // rather than fall through to something that might serve content.
    if (path !== BOOK.prefix && !path.startsWith(BOOK.prefix + "/")) {
      return html("Not found", 404, docHeaders());
    }

    const rest = path.slice(BOOK.prefix.length);

    if (rest === "/login" && request.method === "POST") {
      const form = await request.formData().catch(() => null);
      const role = form ? await roleFor(form.get("password"), BOOK, env) : null;
      if (role) {
        return html("", 303, {
          ...loginHeaders(),
          location: BOOK.prefix + "/",
          "set-cookie": await issueCookie(BOOK, role, env),
        });
      }
      // Blunt brute-force cost, the same as the other gate. Not a rate limiter: it makes a
      // guessing run expensive without any state to keep or to get wrong.
      await new Promise((r) => setTimeout(r, 600));
      return html(loginPage(BOOK, "Incorrect password."), 401, loginHeaders());
    }

    if (rest === "/logout") {
      return html(loginPage(BOOK, "Signed out."), 200, {
        ...loginHeaders(),
        "set-cookie": clearCookie(BOOK),
      });
    }

    // --- the gate: nothing below here runs without a valid session ---
    const role = await sessionRole(request, BOOK, env);
    if (!role) return html(loginPage(BOOK), 200, loginHeaders());
    if (request.method !== "GET") return html("Method Not Allowed", 405, loginHeaders());

    const key = PAGES[rest];
    if (!key) return html("Not found", 404, docHeaders());

    const body = await env.GATED_DOCS.get(key);
    if (!body) {
      // Signed in and there is nothing to serve: the publish step has not run, or it wrote
      // under a different key. Said plainly rather than as a 404, because a 404 here would read
      // as a wrong link and send somebody looking in the wrong place.
      console.error("GATED_DOCS has no body under key " + key);
      return html(
        `<!doctype html><meta charset="utf-8"><title>Not published</title>` +
        `<body style="font:16px/1.6 system-ui;padding:48px;max-width:60ch">` +
        `<h1>Not published yet</h1><p>You are signed in, but nothing has been published under ` +
        `<code>${key}</code>. The book's publish step writes it; run that and reload.</p></body>`,
        503, docHeaders()
      );
    }

    return html(body, 200, docHeaders());
  },
};
