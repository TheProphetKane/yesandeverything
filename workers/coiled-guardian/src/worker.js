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

// One book-wide array of reading notes (comments and suggested edits), written by the
// annotation layer on the chapter pages. Manuscript-adjacent, so it lives beside the
// chapter bodies and never in this repository.
const NOTES_KEY = "cg:notes";

// Every page this Worker will serve. The index maps by name; chapters map by a bounded
// numeric pattern, added 2026-08-27 when the book outgrew the hand-kept five-row list and
// its chapters started returning this Worker's 404 the night Kane sat down to read them.
// The pattern keeps the original intent: only chapter-shaped keys can ever be served, so
// nothing else sitting in the shared namespace is reachable, and a chapter link the index
// does not carry resolves to a key the publish step never wrote, which lands on the plain
// "not published" page rather than leaking anything.
const pageKey = (rest) => {
  if (rest === "" || rest === "/") return "cg:index";
  const m = /^\/ch-([1-9][0-9]{0,2})$/.exec(rest);
  return m ? "cg:ch-" + m[1] : null;
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

    // The notes store, added 2026-08-29. The annotation layer used to keep its notes in each
    // device's localStorage alone, so a note made on the phone was invisible at the desk and
    // invisible to the sessions that apply the edits. The chapter pages now sync the whole
    // array through here (merge on the client, store whole). Behind the session on purpose:
    // the notes quote the manuscript. The cookie is SameSite=Strict, so a cross-site POST
    // arrives bare and stops at the login wall above.
    if (rest === "/api/notes") {
      const jsonHeaders = docHeaders({ "content-type": "application/json; charset=utf-8" });
      if (request.method === "GET") {
        const body = await env.GATED_DOCS.get(NOTES_KEY);
        return html(body || "[]", 200, jsonHeaders);
      }
      if (request.method === "POST") {
        const text = await request.text();
        if (text.length > 512 * 1024) return html('{"error":"too large"}', 413, jsonHeaders);
        let notes;
        try { notes = JSON.parse(text); } catch { notes = null; }
        if (!Array.isArray(notes)) return html('{"error":"expected an array"}', 400, jsonHeaders);

        // Merge, never overwrite (2026-08-29, the night a refresh appeared to eat
        // annotations). A client posts its whole array, but another device or the
        // session tooling may have written since that client last read, so the store's
        // copy is folded in: union by id, a delete anywhere wins everywhere, and the
        // copy that still carries its text beats a stripped one. Notes without ids
        // (there should be none) are kept rather than dropped.
        let cur = [];
        try { cur = JSON.parse(await env.GATED_DOCS.get(NOTES_KEY)) || []; } catch { cur = []; }
        const byId = new Map();
        const loose = [];
        const fold = (n) => {
          if (!n || typeof n !== "object") return;
          if (!n.id) { loose.push(n); return; }
          const prev = byId.get(n.id);
          if (!prev) { byId.set(n.id, n); return; }
          const del = prev.del || n.del ? 1 : 0;
          const texty = (n.text || n.anchor) ? n : prev;
          const kept = { ...prev, ...texty };
          if (del) kept.del = 1; else delete kept.del;
          byId.set(n.id, kept);
        };
        cur.forEach(fold);
        notes.forEach(fold);
        const merged = [...byId.values()].concat(loose)
          .sort((a, b) => ((a.at || "") < (b.at || "") ? -1 : (a.at || "") > (b.at || "") ? 1 : 0));
        await env.GATED_DOCS.put(NOTES_KEY, JSON.stringify(merged));
        return html(JSON.stringify({ ok: true, count: merged.length }), 200, jsonHeaders);
      }
      return html("Method Not Allowed", 405, docHeaders());
    }

    if (request.method !== "GET") return html("Method Not Allowed", 405, loginHeaders());

    const key = pageKey(rest);
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
