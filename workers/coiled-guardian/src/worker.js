// worker.js: the gate in front of a private page set at /coiledguardian.
//
// The pages behind this gate are private and none of their content may reach this
// repository, which is public. Their bodies live in the GATED_DOCS key-value namespace,
// written by the owning project's own publish step, and are read back only after a session
// cookie validates. This file holds no phrase and no page.
//
// Same shape as workers/gated-docs, with one difference that matters: that Worker serves one
// document per prefix, and this one serves many pages under a single prefix. So the page is
// resolved from the rest of the path AFTER the session check rather than before it, and an
// unknown page under a valid session is a 404 rather than a hint that something is there.
//
// There is deliberately no assets binding. An assets binding serves static files before fetch()
// runs, and a gate that can be skipped by a path is not a gate.

import { ATTEMPT_MAX, clearFailures, lockedOut, recordFailure } from "./attempts.mjs";
import {
  roleFor, issueCookie, sessionRole, clearCookies, isAuthor, reviewerOf, reviewerThrough,
  matchesShare, shareLink, LINK_SLUG, LINK_TTL, isLinkSlug, newLinkRole,
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
//
// The author's notes live under cg:notes. Since 2026-09-20 an invited outside reviewer writes
// to a key of their own, cg:review:<slug>, resolved from the signed session role and never
// from anything the client sends. Two properties follow from that and both are the point.
// Attribution cannot be wrong, because the key is the identity. And one reviewer never reads
// another, nor the author's own notes, so the readings stay independent: the value of an
// outside perspective is that it was not anchored on somebody else's.
const NOTES_KEY = "cg:notes";
const notesKeyFor = (role) => {
  const slug = reviewerOf(role);
  return slug ? "cg:review:" + slug : NOTES_KEY;
};

// Bar-raise 2026-09-24, security-02: the POST body was capped at 512 kilobytes on the wire,
// but nothing checked what was inside it, and nothing capped how many notes could pile up in
// the store across repeated posts. A note is small by nature: an id, the text or anchor it
// quotes, who wrote it, and the stamps around it. Anything shaped wrong is dropped before the
// merge rather than stored, the same way a note from the author's own store is already
// dropped on a reader session. NOTES_STORE_MAX bounds the store itself, per key, so an
// unbounded stream of posts cannot grow one key forever even where every single note is valid.
const NOTE_TEXT_MAX = 20000;   // one margin comment or quoted anchor, generous for anything typed by hand
const NOTE_FIELD_MAX = 300;    // id, who, at, ed, kind: identifiers and stamps, never prose
const NOTES_STORE_MAX = 4000;  // notes per key; oldest by "at" are dropped first past this

function isValidNote(n) {
  if (!n || typeof n !== "object" || Array.isArray(n)) return false;
  const str = (v, max) => v === undefined || (typeof v === "string" && v.length <= max);
  return str(n.id, NOTE_FIELD_MAX) && str(n.who, NOTE_FIELD_MAX) && str(n.at, NOTE_FIELD_MAX)
    && str(n.ed, NOTE_FIELD_MAX) && str(n.kind, NOTE_FIELD_MAX)
    && str(n.text, NOTE_TEXT_MAX) && str(n.anchor, NOTE_TEXT_MAX);
}

// Stored as { v, notes } since the reliability-01 optimistic-concurrency fix
// (2026-09-03/04); a bare array is the pre-fix shape and reads as v 0 so an old
// stored value keeps working without a migration step.
async function readNotesStore(env, key = NOTES_KEY) {
  let raw;
  try { raw = JSON.parse(await env.GATED_DOCS.get(key)); } catch { raw = null; }
  if (Array.isArray(raw)) return { v: 0, notes: raw };
  if (raw && typeof raw === "object" && Array.isArray(raw.notes)) {
    return { v: Number.isInteger(raw.v) ? raw.v : 0, notes: raw.notes };
  }
  return { v: 0, notes: [] };
}

// Every page this Worker will serve. The index maps by name; chapters map by a bounded
// numeric pattern, added 2026-08-27 when the book outgrew the hand-kept five-row list and
// its chapters started returning this Worker's 404 the night Kane sat down to read them.
// The pattern keeps the original intent: only chapter-shaped keys can ever be served, so
// nothing else sitting in the shared namespace is reachable, and a chapter link the index
// does not carry resolves to a key the publish step never wrote, which lands on the plain
// "not published" page rather than leaking anything.
//
// `through` bounds a reader to the span they were invited to read: the index they get is the
// one the publish step wrote for that span, and a chapter past it resolves to nothing, exactly
// as a chapter that has not been published does. Null means no bound, which is the author and
// the one invitation that says `"all": true`. Everything else is bounded, including a mistyped
// invitation, because auth.js defaults the span closed. If the bounded index has not been
// published there is no fallback to the full one: the reader gets the plain not-published page,
// which is the same refusal a stranger gets and leaks nothing about what lies past the span.
//
// /print is the whole book on one page, set for paper (Kane, 2026-09-21: his grandmother reads
// it and wanted a copy she could print and write on). It carries every chapter's text, so it is
// bounded exactly as the contents page is: a bounded reader gets the print page written for
// their span, cg:print-r<through>, and never the full one, with the same no-fallback refusal.
// Every book lives at /coiledguardian/<its title> (Kane, 2026-09-25: "it should be
// /coiledguardian/<title>"). The titles are not in this file, because this repository is public
// and the book is not. The owning project's publish step writes the address table into the
// store beside the pages, under cg:books:
//
//   { "home": "<slug>", "books": [ { "slug": "<slug>", "keys": "cg:" }, ... ] }
//
// so a retitle moves the addresses with the next publish and needs no deploy. The keys never
// follow a retitle: cg:* for book one and cg:two:* for book two, as they have always been
// written, so a note, a reader span or a page already in the store stays where it is.
//
// The table names addresses and nothing more. Who reads what stays in this file: the reader
// spans and the share link belong to book one, the book whose pages sit at the bare cg:
// prefix, and every other book is the author's (and the all-true invitation's). Book two opened
// 2026-09-23. A bounded reader was invited to a stretch of book one, so every path into another
// book answers them the way a chapter past their span does: the plain password form, which is
// the author's door and says nothing about what stands behind it. An entry the gate cannot use,
// with a reserved slug or keys outside the page prefixes, is dropped rather than served.
const SITE_KEY = "cg:books";
const SPAN_KEYS = "cg:";
const SLUG_OK = /^[a-z0-9][a-z0-9-]{0,39}$/;
const KEYS_OK = /^cg:(?:[a-z0-9]+:)?$/;
const RESERVED = new Set(["login", "logout", "r", "api", "print", "review", "notes"]);

async function readSite(env) {
  let raw;
  try { raw = JSON.parse(await env.GATED_DOCS.get(SITE_KEY)); } catch { raw = null; }
  const books = (raw && Array.isArray(raw.books) ? raw.books : []).filter((b) =>
    b && typeof b.slug === "string" && typeof b.keys === "string" && SLUG_OK.test(b.slug)
    && !RESERVED.has(b.slug) && !/^ch-/.test(b.slug) && KEYS_OK.test(b.keys)
    && b.keys !== "cg:review:");
  const home = books.find((b) => b.slug === (raw && raw.home))
    || books.find((b) => b.keys === SPAN_KEYS) || null;
  return { books, home };
}

// The addresses served before the retitle: book one's pages at the bare prefix, book two's
// under /two, the segment of its keys. Anybody allowed the page is sent on to where it lives
// now. A bounded reader asking under /two gets the password form and never the redirect, whose
// Location would name a book they were not invited to.
const FORMER_ONE = /^\/(print|ch-[1-9][0-9]{0,2})$/;

const pageKey = (rest, through, books) => {
  const m = /^\/([a-z0-9-]+)(\/.*)?$/.exec(rest);
  const book = m && books.find((b) => b.slug === m[1]);
  if (!book) return null;
  if (through && book.keys !== SPAN_KEYS) return null;
  const sub = m[2] || "";
  if (sub === "" || sub === "/") return book.keys + (through ? "index-r" + through : "index");
  if (sub === "/print") return book.keys + (through ? "print-r" + through : "print");
  const c = /^\/ch-([1-9][0-9]{0,2})$/.exec(sub);
  if (!c) return null;
  if (through && Number(c[1]) > through) return null;
  return book.keys + "ch-" + c[1];
};

// A header given as an array is appended once per value, which is how a sign-out clears both
// session cookies in one response.
const html = (body, status = 200, headers = {}) => {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x));
    else h.set(k, v);
  }
  return new Response(body, { status, headers: h });
};

// A redirect inside the gate, never cached, so a retitle can move an address again.
const moved = (to) => html("", 302, docHeaders({ location: BOOK.prefix + to }));

// Signed in and there is nothing to serve: the publish step has not run, or it wrote under a
// different key. Said plainly rather than as a 404, because a 404 here would read as a wrong link
// and send somebody looking in the wrong place.
function notPublished(key) {
  console.error("GATED_DOCS has no body under key " + key);
  return html(
    `<!doctype html><meta charset="utf-8"><title>Not published</title>` +
    `<body style="font:16px/1.6 system-ui;padding:48px;max-width:60ch">` +
    `<h1>Not published yet</h1><p>You are signed in, but nothing has been published under ` +
    `<code>${key}</code>. The book's publish step writes it; run that and reload.</p></body>`,
    503, docHeaders()
  );
}

// Two handlers on one object, named rather than reached through `this`, so the gate never
// depends on how the runtime binds a method call.
const handlers = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // The route should make this unreachable. If a route is ever widened by accident, refuse
    // rather than fall through to something that might serve content.
    if (path !== BOOK.prefix && !path.startsWith(BOOK.prefix + "/")) {
      return html("Not found", 404, docHeaders());
    }

    const rest = path.slice(BOOK.prefix.length);

    // The author's way back in from anywhere, whatever session the browser already holds: by
    // this address, or from any chapter past a bounded reader's span, which answers with the same
    // form.
    if (rest === "/login" && request.method === "GET") {
      return html(loginPage(BOOK), 200, loginHeaders());
    }

    if (rest === "/login" && request.method === "POST") {
      // security-03, same as the sibling gate: the delay below was the whole of
      // the defence, so a run from one address could keep guessing all day with
      // nothing recording it. A locked-out caller never reaches the comparison.
      if (await lockedOut(env.GATED_DOCS, "cg", request)) {
        await new Promise((r) => setTimeout(r, 600));
        return html(loginPage(BOOK, "Too many attempts. Try again shortly."), 429, loginHeaders());
      }
      const form = await request.formData().catch(() => null);
      const role = form ? await roleFor(form.get("password"), BOOK, env) : null;
      if (role) {
        await clearFailures(env.GATED_DOCS, "cg", request);
        return html("", 303, {
          ...loginHeaders(),
          location: BOOK.prefix + "/",
          "set-cookie": await issueCookie(BOOK, role, env),
        });
      }
      // Blunt brute-force cost, the same as the other gate. The counter above is
      // the state; this is still the per-try price underneath it.
      const nAttempts = await recordFailure(env.GATED_DOCS, "cg", request);
      if (nAttempts >= ATTEMPT_MAX) {
        console.warn(`[gate] coiled-guardian: ${nAttempts} wrong passwords from one address; locked out`);
      }
      await new Promise((r) => setTimeout(r, 600));
      return html(loginPage(BOOK, "Incorrect password."), 401, loginHeaders());
    }

    // The share link, added 2026-09-20 on Kane's ask for something he can paste into a message
    // without also sending a phrase. The token in the path is the whole credential, so it is
    // long enough not to be guessed, compared through digests, and it buys the same bounded
    // reader session a phrase would. The reader is then an ordinary r:link session and every
    // rule below applies to them unchanged: the span, the notes key, the refusals.
    //
    // The session lasts thirty days rather than twelve hours, because a link reader has no
    // phrase to fall back on when one runs out. Landing them on a password form they cannot
    // answer is how a shared link gets reported as broken.
    const share = /^\/r\/([A-Za-z0-9_-]{24,128})$/.exec(rest);
    //
    // The link writes only the reader cookie, and never for a browser that already holds the
    // author's session (Kane, 2026-09-21): opening his own link to see what his readers see
    // used to replace his session with theirs and lock him out past chapter thirty.
    //
    // Each browser gets a link slug of its own, so one link reader never reads another's notes.
    // A browser that already holds one keeps it, so reopening the link keeps a reader's notes
    // where they were.
    if (share) {
      if (await matchesShare(share[1], env)) {
        const headers = { ...loginHeaders(), location: BOOK.prefix + "/" };
        const held = await sessionRole(request, BOOK, env);
        const slug = reviewerOf(held);
        if (!isAuthor(held) && !(slug && slug !== LINK_SLUG && isLinkSlug(slug))) {
          headers["set-cookie"] = await issueCookie(BOOK, newLinkRole(), env, LINK_TTL);
        }
        return html("", 303, headers);
      }
      // The same delay a wrong phrase costs, and the same page, so a wrong token cannot be
      // told from a dropped one or from a path that was never a link at all.
      await new Promise((r) => setTimeout(r, 600));
      return html(loginPage(BOOK), 200, loginHeaders());
    }

    if (rest === "/logout") {
      return html(loginPage(BOOK, "Signed out."), 200, {
        ...loginHeaders(),
        "set-cookie": clearCookies(BOOK),
      });
    }

    // --- the gate: nothing below here runs without a valid session ---
    let role = await sessionRole(request, BOOK, env);
    if (!role) return html(loginPage(BOOK), 200, loginHeaders());

    // A link session minted before every browser had a slug of its own carries the bare shared
    // slug. It is reissued one of its own here, on whatever it asked for, so from this request on
    // it reads and writes only its own notes.
    let reissue = null;
    if (role === "r:" + LINK_SLUG) {
      role = newLinkRole();
      reissue = await issueCookie(BOOK, role, env, LINK_TTL);
    }
    const res = await handlers.serve(request, env, role, rest);
    if (reissue) res.headers.append("set-cookie", reissue);
    return res;
  },

  async serve(request, env, role, rest) {

    // The notes store, added 2026-08-29. The annotation layer used to keep its notes in each
    // device's localStorage alone, so a note made on the phone was invisible at the desk and
    // invisible to the sessions that apply the edits. The chapter pages now sync the whole
    // array through here (merge on the client, store whole). Behind the session on purpose:
    // the notes quote the manuscript. The cookie is SameSite=Lax, which a browser never sends
    // on a cross-site POST, so another site's form arrives bare and stops at the login wall.
    if (rest === "/api/notes") {
      const jsonHeaders = docHeaders({ "content-type": "application/json; charset=utf-8" });
      const notesKey = notesKeyFor(role);
      // A reader's store never holds or shows the author's notes (Kane, 2026-09-22). His own
      // phone, sitting on the share link, once posted its whole store of his notes into the
      // link's key, where every link reader's page would have listed them. So on a reader
      // session every note whose id the author's store carries is dropped on the way in and
      // filtered on the way out, whatever a device sends.
      const authorIds = reviewerOf(role)
        ? new Set((await readNotesStore(env, NOTES_KEY)).notes.map((n) => n && n.id).filter(Boolean))
        : null;
      const notTheAuthors = (n) => !authorIds || !(n && n.id && authorIds.has(n.id));
      if (request.method === "GET") {
        const stored = await readNotesStore(env, notesKey);
        return html(JSON.stringify(stored.notes.filter(notTheAuthors)), 200, jsonHeaders);
      }
      if (request.method === "POST") {
        const text = await request.text();
        if (text.length > 512 * 1024) return html('{"error":"too large"}', 413, jsonHeaders);
        let notes;
        try { notes = JSON.parse(text); } catch { notes = null; }
        if (!Array.isArray(notes)) return html('{"error":"expected an array"}', 400, jsonHeaders);
        notes = notes.filter(notTheAuthors).filter(isValidNote);

        // Merge, never overwrite (2026-08-29, the night a refresh appeared to eat
        // annotations). A client posts its whole array, but another device or the
        // session tooling may have written since that client last read, so the store's
        // copy is folded in: union by id, a delete anywhere wins everywhere, and the
        // copy that still carries its text beats a stripped one. Notes without ids
        // (there should be none) are kept rather than dropped.
        const fold = (byId, loose, n) => {
          if (!n || typeof n !== "object") return;
          if (!n.id) { loose.push(n); return; }
          const prev = byId.get(n.id);
          if (!prev) { byId.set(n.id, n); return; }
          const del = prev.del || n.del ? 1 : 0;
          // A note amended in its margin card carries ed, the moment of its last edit (Kane,
          // 2026-09-24). The copy with the later ed wins the text, so a device still holding
          // the words from before the edit cannot post them back over it. With no ed on either
          // side the incoming copy wins, as it always has.
          const texted = (x) => !!(x.text || x.anchor);
          const texty = !texted(n) ? prev : !texted(prev) ? n
            : (prev.ed || "") > (n.ed || "") ? prev : n;
          const kept = { ...prev, ...texty };
          // rm marks a note the reader deleted, as against one a session resolved; the margin
          // hides the first and shows the second as applied. Like del, it wins everywhere.
          if (prev.rm || n.rm) kept.rm = 1; else delete kept.rm;
          // A self-declared name survives the fold whichever copy carries it. Readers coming in
          // on one shared link have nothing else telling them apart, so losing it here would put
          // two people's notes into one anonymous pile.
          const who = prev.who || n.who;
          if (who) kept.who = who; else delete kept.who;
          if (del) kept.del = 1; else delete kept.del;
          byId.set(n.id, kept);
        };
        const mergeOnto = (cur) => {
          const byId = new Map();
          const loose = [];
          cur.filter(notTheAuthors).forEach((n) => fold(byId, loose, n));
          notes.forEach((n) => fold(byId, loose, n));
          const merged = [...byId.values()].concat(loose)
            .sort((a, b) => ((a.at || "") < (b.at || "") ? -1 : (a.at || "") > (b.at || "") ? 1 : 0));
          // Cap the store so it cannot grow forever across repeated posts. Sorted ascending
          // by "at" above, so the slice below keeps the newest NOTES_STORE_MAX and drops the
          // oldest first; a note with no "at" sorts first and is the first dropped too.
          return merged.length > NOTES_STORE_MAX ? merged.slice(merged.length - NOTES_STORE_MAX) : merged;
        };

        // Optimistic-concurrency check (bar-raise 2026-09-03, reliability-01). Workers KV
        // has no compare-and-swap, so this cannot be made airtight the way a database
        // transaction would be, but a bare get-then-put left the whole merge computation
        // as the race window: two interleaved writes could each read the same "cur" and
        // the second put would still silently drop whatever the first one added. Storing
        // a version alongside the notes and re-reading it right before the put narrows
        // that window to the read-put gap, and retries the merge against whatever landed
        // in between rather than clobbering it.
        let result = null;
        for (let attempt = 0; attempt < 5 && !result; attempt++) {
          const before = await readNotesStore(env, notesKey);
          const merged = mergeOnto(before.notes);
          const after = await readNotesStore(env, notesKey);
          if (after.v !== before.v) continue;   // something else wrote between our two reads; retry
          const nextV = after.v + 1;
          await env.GATED_DOCS.put(notesKey, JSON.stringify({ v: nextV, notes: merged }));
          result = merged;
        }
        if (!result) {
          // Every attempt raced with another writer. Fold onto whatever is live now and
          // write it anyway rather than dropping the client's notes entirely; this is the
          // one case left where two truly simultaneous writes can still interleave.
          const before = await readNotesStore(env, notesKey);
          result = mergeOnto(before.notes);
          await env.GATED_DOCS.put(notesKey, JSON.stringify({ v: before.v + 1, notes: result }));
        }
        return html(JSON.stringify({ ok: true, count: result.length }), 200, jsonHeaders);
      }
      return html("Method Not Allowed", 405, docHeaders());
    }

    if (request.method !== "GET") return html("Method Not Allowed", 405, loginHeaders());

    const through = reviewerThrough(role, env);
    const site = await readSite(env);
    if (!site.home) return notPublished(SITE_KEY);

    // The bare prefix is the home book's contents page, and book one's addresses from before
    // the retitle land where their page lives now. A bounded reader always lands on book one,
    // whatever the table calls home, so no redirect ever names another book to them.
    const one = site.books.find((b) => b.keys === SPAN_KEYS);
    if (rest === "" || rest === "/") {
      const land = through ? one : site.home;
      return land ? moved("/" + land.slug + "/") : html(loginPage(BOOK), 200, loginHeaders());
    }
    if (one && FORMER_ONE.test(rest)) return moved("/" + one.slug + rest);

    const key = pageKey(rest, through, site.books);
    if (!key) {
      // A chapter past a bounded reader's span answers with the plain password form and nothing
      // else (Kane, 2026-09-22: "Make it a password prompt if they click next on 30", and "I dont
      // want people to even know a chapter exists before I make it available"). Every path a
      // bounded reader may not have gets the same form, whether the chapter is written or not
      // and whether the book exists or not, so the answer cannot be used to count what lies past
      // the span or to find a book by its name. It is also the author's door: signed in there,
      // every chapter opens, and no reader credential can take that away.
      if (through) return html(loginPage(BOOK), 200, loginHeaders());
      // A book's address from before the retitle is the segment of its keys (/two for cg:two:).
      const m = /^\/([a-z0-9]+)(\/.*)?$/.exec(rest);
      const was = m && site.books.find((b) => b.keys === "cg:" + m[1] + ":");
      if (was) return moved("/" + was.slug + (m[2] || "/"));
      return html("Not found", 404, docHeaders());
    }

    const body = await env.GATED_DOCS.get(key);
    if (!body) return notPublished(key);

    return html(body, 200, docHeaders());
  },
};

export default handlers;
