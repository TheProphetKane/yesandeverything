"""Build the house search pages from data/house-search.json.

    python scripts/build-house-search.py

Writes house-search/index.html (the list) and house-search/<slug>/index.html (one full
report per house). Every page is self-contained, like the rest of the site. The list is
short table rows only; the full breakdown of a house lives on its report and nowhere else.
Each row and each report states the homeowners association answer and fee, so a house
with no fee says so instead of leaving the field blank. The fenced back yard gets the
same treatment, with "Not stated" when the listing does not say.

Two must-haves are checked on every house: 3 bedrooms on the main floor, and a finished
basement. The basement is the tornado shelter, so a house without one fails the same as a
house whose basement is unfinished, and the partly-sunk lower level of a split-level
needs confirming. The build refuses a house that is missing either answer, and the list
groups houses by the result: both met, one to confirm, one failed.

Every house carries a check mark (want to view) and an X (no), on its report and as the
far-left column of its table row. A house holds one mark at most. A checked row moves up
into the Want to view table at the top of the page, and a no drops to the Marked no table
at the bottom. The marks are one shared list for everyone who opens the page, kept by the
family-votes Worker at /house-search/api/marks (workers/family-votes); each browser keeps
a copy so the page draws at once and keeps working offline, and sends what it changed as
soon as the route answers.
"""

import html
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "house-search.json"
OUT = ROOT / "house-search"

STYLE = """
:root {
  color-scheme: dark;
  --bg: #0b1622; --surface: #122233; --raise: #182c42; --ink: #e8f0f8; --muted: #9fb3c8;
  --line: #24405a; --sea: #4cc3e0; --sea-soft: #12384a; --rose: #ff6f9c; --rose-soft: #3d1a2b;
  --pass: #6fd68f; --pass-soft: #163a24; --fail: #ff8a80; --fail-soft: #3e1c1a;
  --violet: #b49cff; --violet-soft: #2a2347; --amber: #f2c46d; --amber-soft: #3a2f14;
  --font-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --font-body: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;
  --font-data: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 1rem; line-height: 1.58; }
.wrap { max-width: 980px; margin: 0 auto; padding: 2rem max(16px, env(safe-area-inset-left, 0px)) 4rem; display: grid; gap: 2.25rem; }
h1, h2, h3 { font-family: var(--font-display); margin: 0; line-height: 1.15; text-wrap: balance; }
h1 { font-size: clamp(2rem, 6vw, 3rem); font-weight: 800; }
h2 { font-size: 1.45rem; font-weight: 800; }
h3 { font-size: 1.12rem; font-weight: 700; }
p { margin: 0; max-width: 70ch; }
a { color: var(--sea); text-underline-offset: 3px; }
a:focus-visible, button:focus-visible { outline: 3px solid var(--rose); outline-offset: 2px; border-radius: 6px; }
.eyebrow { font-family: var(--font-data); font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
header { display: grid; gap: 0.6rem; }
.crumb { font-family: var(--font-data); font-size: 0.85rem; }
.verdict { background: var(--sea-soft); border-left: 6px solid var(--sea); border-radius: 0 12px 12px 0; padding: 1rem 1.25rem; display: grid; gap: 0.4rem; }
.verdict strong { color: var(--sea); font-family: var(--font-data); font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; }
.price { font-family: var(--font-data); font-size: 1.6rem; font-variant-numeric: tabular-nums; }
.price small { font-size: 0.85rem; color: var(--muted); }
.hoa, .fence { display: flex; flex-wrap: wrap; gap: 0.4rem 0.75rem; align-items: baseline; padding: 0.7rem 1rem; border-radius: 10px; background: var(--violet-soft); border: 1px solid var(--violet); }
.hoa b, .fence b { font-family: var(--font-data); font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--violet); }
.hoa.none, .fence.yes { background: var(--pass-soft); border-color: var(--pass); }
.hoa.none b, .fence.yes b { color: var(--pass); }
.fence.no { background: var(--rose-soft); border-color: var(--rose); }
.fence.no b { color: var(--rose); }
.fence.unknown { background: var(--amber-soft); border-color: var(--amber); }
.fence.unknown b { color: var(--amber); }
.musts { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.musts li { display: grid; grid-template-columns: 1.5rem 1fr; gap: 0.6rem; align-items: start; padding: 0.65rem 0.9rem; border-radius: 10px; background: var(--raise); border-left: 5px solid var(--line); }
.musts li > div { display: grid; gap: 0.15rem; min-width: 0; }
.musts .mark { font-family: var(--font-data); font-weight: 700; font-size: 1.1rem; line-height: 1.45; text-align: center; }
.musts b { font-family: var(--font-data); font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; }
.musts .pass { border-left-color: var(--pass); }
.musts .fail { border-left-color: var(--fail); }
.musts .check { border-left-color: var(--amber); }
.musts .pass .mark, .musts .pass .st { color: var(--pass); }
.musts .fail .mark, .musts .fail .st { color: var(--fail); }
.musts .check .mark, .musts .check .st { color: var(--amber); }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.75rem 1.5rem; margin: 0; }
.facts div { display: grid; gap: 0.1rem; min-width: 0; }
.facts dt { font-size: 0.74rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.facts dd { margin: 0; }
section { display: grid; gap: 0.9rem; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem 1.5rem; }
.two > div { display: grid; gap: 0.4rem; align-content: start; min-width: 0; background: var(--surface); border-radius: 12px; padding: 1rem 1.1rem; }
.two h3 { font-size: 0.85rem; font-family: var(--font-data); letter-spacing: 0.06em; text-transform: uppercase; }
.good h3 { color: var(--pass); }
.watch h3 { color: var(--fail); }
ul, ol { margin: 0; padding-left: 1.2rem; display: grid; gap: 0.35rem; }
.timeline { list-style: none; padding: 0; display: grid; gap: 0; border-left: 2px solid var(--line); margin-left: 0.4rem; }
.timeline li { display: grid; gap: 0.15rem; padding: 0 0 0.9rem 1.1rem; position: relative; }
.timeline li::before { content: ""; position: absolute; left: -7px; top: 0.45rem; width: 12px; height: 12px; border-radius: 50%; background: var(--sea); }
.timeline .when { font-family: var(--font-data); font-size: 0.85rem; color: var(--sea); }
.problem { background: var(--surface); border: 1px solid var(--line); border-left: 5px solid var(--rose); border-radius: 0 12px 12px 0; padding: 0.95rem 1.1rem; display: grid; gap: 0.4rem; }
.problem .cost { font-size: 0.92rem; color: var(--muted); }
.problem .cost b { color: var(--rose); font-weight: 700; }
.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 0.95rem; }
th, td { text-align: left; padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 0.74rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); background: var(--bg); }
tr:last-child td { border-bottom: 0; }
td.num { font-family: var(--font-data); font-variant-numeric: tabular-nums; }
td.pass { color: var(--pass); }
td.fail { color: var(--fail); }
td.check { color: var(--amber); }
td.soft { color: var(--rose); }
main[data-page="list"] { max-width: 1400px; }
table.houses { table-layout: fixed; }
table.houses th, table.houses td { padding: 0.55rem 0.6rem; }
td.addr small { color: var(--muted); }
details.note summary { cursor: pointer; color: var(--sea); width: fit-content; }
details.note p { margin-top: 0.5rem; }
th.pick-col, td.pick-col, col.pick-col { display: none; }
.js th.pick-col, .js td.pick-col { display: table-cell; }
.js col.pick-col { display: table-column; }
tr.is-no td { opacity: 0.45; }
tr.is-no td.pick-col, tr.is-no td.addr { opacity: 1; }
tr.is-no td.addr a { text-decoration: line-through; color: var(--muted); }
.ask { background: var(--rose-soft); border-radius: 12px; padding: 1rem 1.25rem; display: grid; gap: 0.6rem; }
.group-head { display: grid; gap: 0.3rem; }
.count { display: inline-block; font-family: var(--font-data); font-size: 0.9rem; vertical-align: middle; padding: 0.05rem 0.55rem; border-radius: 999px; background: var(--raise); color: var(--muted); }
.group-pass .count { background: var(--pass-soft); color: var(--pass); }
.group-check .count { background: var(--amber-soft); color: var(--amber); }
.group-fail .count, .group-no .count { background: var(--fail-soft); color: var(--fail); }
.group-view h2 { color: var(--pass); }
.group-view .count { background: var(--pass-soft); color: var(--pass); }
.group-view .scroll { border-color: var(--pass); box-shadow: 0 0 0 2px var(--pass); }
.title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
.tag { display: inline-block; font-family: var(--font-data); font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.05rem 0.45rem; border-radius: 6px; background: var(--raise); color: var(--muted); }
.tag.subject { background: var(--sea-soft); color: var(--sea); }
.no-note, .view-note { display: none; }
.is-no .no-note, .is-view .view-note { display: block; }
.no-note, .view-note { border-radius: 0 12px 12px 0; padding: 0.8rem 1.1rem; }
.no-note { background: var(--fail-soft); border-left: 6px solid var(--fail); }
.view-note { background: var(--pass-soft); border-left: 6px solid var(--pass); }
.save-note { background: var(--amber-soft); border-left: 6px solid var(--amber); border-radius: 0 12px 12px 0; padding: 0.8rem 1.1rem; max-width: none; }
.picks { display: none; flex: none; gap: 0.4rem; }
.js .picks { display: inline-flex; }
.pick { width: 44px; height: 44px; padding: 0; display: grid; place-items: center; border-radius: 10px; border: 1px solid var(--line); background: var(--raise); font: 700 1.25rem/1 var(--font-data); cursor: pointer; }
.pick.view { color: var(--pass); }
.pick.no { color: var(--fail); }
.pick.view:hover { background: var(--pass-soft); border-color: var(--pass); }
.pick.no:hover { background: var(--fail-soft); border-color: var(--fail); }
.pick.view[aria-pressed="true"] { background: var(--pass); border-color: var(--pass); color: var(--bg); }
.pick.no[aria-pressed="true"] { background: var(--fail); border-color: var(--fail); color: var(--bg); }
.js-only { display: none; }
.js .js-only { display: block; }
.go { font-weight: 700; }
.foot { font-size: 0.85rem; color: var(--muted); display: grid; gap: 0.4rem; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
"""

# The check and X buttons. The marks are one shared list, read from and written to the
# family-votes Worker at /house-search/api/marks, so a mark set on any phone or laptop shows
# on every other one, on the list and on every report. Each browser keeps a copy in
# localStorage (house-search-marks) so the page draws before the route answers and still
# works offline; a change that could not be sent waits in house-search-pending and goes up
# on the next load. The first visit after the marks became shared (2026-10-28) carries the
# browser's old local-only marks (house-search-view, house-search-no) up for any house the
# shared list has no mark on, so nothing set before that day is lost. Storage can throw
# (private windows, blocked site data); the page still works without it.
SCRIPT = """
(function () {
  var API = "/house-search/api/marks";
  var KEY = "house-search-marks", PENDING = "house-search-pending", SYNCED = "house-search-synced";
  var OLD = { view: "house-search-view", no: "house-search-no" };
  var LABELS = {
    view: ["Mark {a} as one to view", "Take {a} off the viewing list", "Want to view", "Take off the viewing list"],
    no: ["Mark {a} as a no", "Undo the no on {a}", "Mark as a no", "Put this house back"]
  };
  var listed = !!document.getElementById("g-no");
  var live = document.getElementById("announce");
  var note = document.getElementById("save-note");
  var canSend = typeof fetch === "function";
  var marks = {}, pending = {};
  function get(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "null");
      return v && typeof v === "object" ? v : fallback;
    } catch (err) { return fallback; }
  }
  function put(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (err) { /* lasts until the page closes */ }
  }
  function clean(obj) {
    var out = {};
    for (var s in obj) if (obj[s] === "view" || obj[s] === "no") out[s] = obj[s];
    return out;
  }
  function oldMarks() {
    var out = {};
    ["view", "no"].forEach(function (m) {
      var list = get(OLD[m], []);
      if (Array.isArray(list)) list.forEach(function (s) { out[s] = m; });
    });
    return out;
  }
  function read() {
    marks = clean(get(KEY, null) || oldMarks());
    pending = get(PENDING, {});
  }
  function markOf(slug) { return marks[slug] || ""; }
  function set(slug, mark) {
    if (mark) marks[slug] = mark; else delete marks[slug];
    put(KEY, marks);
  }
  function warn(text) {
    if (!note) return;
    note.textContent = text;
    note.hidden = !text;
  }
  function settle(slug, mark) {
    if (pending[slug] === mark) { delete pending[slug]; put(PENDING, pending); }
  }
  function take(j) {
    if (!j || !j.marks || typeof j.marks !== "object") return;
    marks = clean(j.marks);
    for (var s in pending) { if (pending[s]) marks[s] = pending[s]; else delete marks[s]; }
    put(KEY, marks);
    render();
  }
  function send(slug, mark) {
    pending[slug] = mark;
    put(PENDING, pending);
    if (!canSend) return Promise.reject(new Error("This browser cannot reach the shared list."));
    return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: slug, mark: mark }) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok) { settle(slug, mark); take(j); warn(""); return; }
          if (r.status !== 429 && r.status < 500) settle(slug, mark);
          throw new Error(j.error || "The shared list refused it (" + r.status + ").");
        });
      }, function () { throw new Error("The shared list did not answer."); });
  }
  function sync() {
    if (!canSend) return;
    fetch(API, { cache: "no-store", headers: { accept: "application/json" } })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject(new Error("The shared list did not answer (" + r.status + ")."));
      }, function () { throw new Error("The shared list did not answer."); })
      .then(function (j) {
        var synced = false;
        try { synced = localStorage.getItem(SYNCED) === "1"; } catch (err) { /* treated as the first visit */ }
        if (!synced) {
          var shared = clean(j.marks);
          for (var s in marks) if (!shared[s] && !(s in pending)) pending[s] = marks[s];
          put(PENDING, pending);
          try { localStorage.setItem(SYNCED, "1"); } catch (err) { /* runs again next load; the shared list wins where it has a mark */ }
        }
        take(j);
        warn("");
        return Object.keys(pending).reduce(function (chain, s) {
          return chain.then(function () { return send(s, pending[s]); });
        }, Promise.resolve());
      })
      .catch(function (err) {
        if (Object.keys(pending).length) warn("Not saved for everyone yet. " + err.message + " It shows here and goes up again when the page next loads.");
      });
  }
  function place(row, mark) {
    var home = document.getElementById(mark ? "g-" + mark : row.getAttribute("data-home"));
    var list = home.querySelector("tbody");
    if (row.parentNode === list) return;
    var order = +row.getAttribute("data-order"), next = null;
    for (var i = 0; i < list.children.length; i++) {
      if (+list.children[i].getAttribute("data-order") > order) { next = list.children[i]; break; }
    }
    list.insertBefore(row, next);
  }
  function render() {
    document.querySelectorAll("[data-house]").forEach(function (el) {
      var m = markOf(el.getAttribute("data-house"));
      el.classList.toggle("is-view", m === "view");
      el.classList.toggle("is-no", m === "no");
      if (listed && el.matches("tr")) place(el, m);
    });
    document.querySelectorAll("button[data-pick]").forEach(function (b) {
      var want = b.getAttribute("data-pick"), on = markOf(b.getAttribute("data-slug")) === want;
      var text = LABELS[want], addr = b.getAttribute("data-addr");
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", text[on ? 1 : 0].replace("{a}", addr));
      b.title = text[on ? 3 : 2];
    });
    document.querySelectorAll(".group").forEach(function (g) {
      var n = g.querySelectorAll("tbody > tr").length;
      g.hidden = n === 0;
      var c = g.querySelector(".count");
      if (c) c.textContent = n;
    });
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-pick]");
    if (!b) return;
    var slug = b.getAttribute("data-slug"), want = b.getAttribute("data-pick");
    var mark = markOf(slug) === want ? "" : want;
    set(slug, mark);
    render();
    b.focus({ preventScroll: true });
    var addr = b.getAttribute("data-addr");
    var said = mark === "view" ? addr + " added to the Want to view table" + (listed ? " at the top of the page." : ".")
      : mark === "no" ? addr + " marked no" + (listed ? ", in the table at the bottom of the page." : ".")
      : addr + " cleared.";
    if (live) live.textContent = said;
    send(slug, mark).catch(function (err) {
      warn("Not saved for everyone yet. " + err.message + " It shows here and goes up again when the page next loads.");
      if (live) live.textContent = said + " Not saved for everyone yet. " + err.message;
    });
  });
  window.addEventListener("storage", function (ev) {
    if (ev.key === KEY || ev.key === PENDING) { read(); render(); }
  });
  window.addEventListener("pageshow", function (ev) { if (ev.persisted) { read(); render(); sync(); } });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  read();
  render();
  sync();
})();
"""

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="{desc}">
<title>{title}</title>
<script>document.documentElement.classList.add("js");</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@500;700&display=swap">
<style>{style}</style>
</head>
<body>
<main class="wrap"{attrs}>
<p class="sr-only" id="announce" aria-live="polite"></p>
<p class="save-note" id="save-note" hidden></p>
"""

TAIL = "</main>\n<script>" + SCRIPT + "</script>\n</body>\n</html>\n"

BASEMENT = {"finished": "pass", "none": "fail", "unfinished": "fail", "split": "check", "unsure": "check"}
BASEMENT_SHORT = {"finished": "Pass", "none": "Fails, no basement", "unfinished": "Fails, unfinished",
                  "split": "Check, split level", "unsure": "Check"}
MARK = {"pass": "✓", "fail": "✕", "check": "?"}
WORD = {"pass": "Pass", "fail": "Fails", "check": "Check"}
GROUPS = [
    ("pass", "Meets both must-haves",
     "3 bedrooms on the main floor, and a finished basement for tornado shelter."),
    ("check", "One must-have to confirm",
     "Close on paper. The amber cell shows which one; the full report says what to ask."),
    ("fail", "Fails a must-have",
     "Kept for comparison. The red cell shows which must-have it misses."),
]
# Every table on the list page shares these columns and widths, so the Want to view table,
# the three must-have groups and the Marked no table line up with each other.
COLUMNS = [("View / No", 116, "pick-col"), ("House", 196, ""), ("Price", 96, ""),
           ("3 beds on main floor", 106, ""), ("Finished basement", 128, ""), ("Fenced yard", 92, ""),
           ("Homeowners association", 164, ""), ("Beds / baths", 124, ""), ("Size", 124, ""),
           ("Built", 60, ""), ("Drive to daycare", 88, "")]


def e(s):
    return html.escape(str(s), quote=True)


def money(n):
    return "${:,}".format(int(n))


def hoa_line(h):
    hoa = h["hoa"]
    if hoa["has"]:
        return (f'<div class="hoa"><b>Homeowners association: Yes</b>'
                f'<span>{e(hoa["fee"])}, {e(hoa["name"])}</span></div>')
    fee = hoa.get("fee") or "no fee"
    return f'<div class="hoa none"><b>Homeowners association: No</b><span>{e(fee)}</span></div>'


def fence_line(h):
    fence = h["fence"]
    word, cls = {True: ("Yes", "yes"), False: ("No", "no"), None: ("Not stated", "unknown")}[fence["has"]]
    return f'<div class="fence {cls}"><b>Fenced back yard: {word}</b><span>{e(fence["note"])}</span></div>'


def checks(h):
    """The two must-haves, each as pass, fail or check."""
    beds = h["mainFloorBeds"]
    main = "pass" if beds["count"] >= 3 else "check" if beds.get("close") else "fail"
    return main, BASEMENT[h["basement"]["kind"]]


def overall(h):
    states = checks(h)
    return "fail" if "fail" in states else "check" if "check" in states else "pass"


def musts(h):
    main, base = checks(h)
    rows = [(main, "3 bedrooms on the main floor", h["mainFloorBeds"]["note"]),
            (base, "A finished basement", h["basement"]["note"])]
    return '<ul class="musts">' + "".join(
        f'<li class="{s}"><span class="mark" aria-hidden="true">{MARK[s]}</span>'
        f'<div><b>{e(label)}: <span class="st">{WORD[s]}</span></b><span>{e(note)}</span></div></li>'
        for s, label, note in rows) + '</ul>'


def picks(h):
    slug, addr = e(h["slug"]), e(h["address"])
    return (f'<span class="picks">'
            f'<button type="button" class="pick view" data-pick="view" data-slug="{slug}" data-addr="{addr}" '
            f'aria-pressed="false" aria-label="Mark {addr} as one to view" title="Want to view">✓</button>'
            f'<button type="button" class="pick no" data-pick="no" data-slug="{slug}" data-addr="{addr}" '
            f'aria-pressed="false" aria-label="Mark {addr} as a no" title="Mark as a no">✕</button></span>')


def facts(h):
    rows = [
        ("Status", h["status"]),
        ("Bedrooms", h["beds"]),
        ("Bathrooms", h["baths"]),
        ("Size", h["size"]),
        ("Built", h["built"]),
        ("Lot", h["lot"]),
        ("Property taxes", h["taxes"]),
        ("Schools", h["schools"]),
        ("Flood risk", h["flood"]),
        ("Drive to daycare", h["drive"]),
        ("Last checked", (h.get("checked") or {}).get("text")),
    ]
    inner = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in rows if v)
    return f'<dl class="facts">{inner}</dl>'


def report(h, updated):
    out = [HEAD.format(desc=e(f'Buyer research on {h["address"]}, {h["city"]}.'),
                       title=e(f'{h["address"]} report'), style=STYLE,
                       attrs=f' data-house="{e(h["slug"])}"')]
    out.append('<header>')
    out.append('<p class="crumb"><a href="../">House search</a></p>')
    out.append(f'<p class="eyebrow">Buyer report, updated {e(updated)}</p>')
    out.append(f'<div class="title-row"><h1>{e(h["address"])}</h1>{picks(h)}</div>')
    out.append('<p class="view-note">On the list to view. It sits in the Want to view table at the top of '
               'the house search page, for everyone who opens it.</p>')
    out.append('<p class="no-note">Marked a no. It sits in the Marked no table at the bottom of the house '
               'search page, for everyone who opens it, until someone puts it back.</p>')
    out.append(f'<p>{e(h["city"])}</p>')
    out.append(f'<p class="price">{money(h["price"])} <small>{e(h.get("priceNote", ""))}</small></p>')
    out.append(musts(h))
    out.append(hoa_line(h))
    if h["hoa"].get("note"):
        out.append(f'<p>{e(h["hoa"]["note"])}</p>')
    out.append(fence_line(h))
    out.append('</header>')
    out.append(f'<div class="verdict"><strong>The short answer</strong><p>{e(h["verdict"])}</p></div>')
    out.append(f'<section><h2>Key facts</h2>{facts(h)}'
               f'<p><a href="{e(h["listing"])}" target="_blank" rel="noopener">Open the listing and its photos</a>'
               f'{" (listing number " + e(h["listingNumber"]) + ")" if h.get("listingNumber") else ""}. '
               'Photo numbers below follow the listing\'s photo order.</p></section>')
    if h.get("good") or h.get("watch"):
        out.append('<section class="two">')
        out.append('<div class="good"><h3>In its favor</h3><ul>'
                   + "".join(f"<li>{e(x)}</li>" for x in h.get("good", [])) + '</ul></div>')
        out.append('<div class="watch"><h3>Against it</h3><ul>'
                   + "".join(f"<li>{e(x)}</li>" for x in h.get("watch", [])) + '</ul></div>')
        out.append('</section>')
    for s in h.get("sections", []):
        out.append(f'<section><h2>{e(s["h"])}</h2>')
        if s.get("timeline"):
            out.append('<ol class="timeline">' + "".join(
                f'<li><span class="when">{e(w)}</span><span>{e(t)}</span></li>' for w, t in s["timeline"]) + '</ol>')
        for p in s.get("p", []):
            out.append(f'<p>{e(p)}</p>')
        if s.get("ul"):
            out.append('<ul>' + "".join(f"<li>{e(x)}</li>" for x in s["ul"]) + '</ul>')
        out.append('</section>')
    if h.get("problems"):
        out.append('<section><h2>Problems and risks</h2>')
        for p in h["problems"]:
            out.append(f'<div class="problem"><h3>{e(p["title"])}</h3><p>{e(p["body"])}</p>'
                       f'<p class="cost"><b>Cost:</b> {e(p["cost"])}</p></div>')
        out.append('</section>')
    if h.get("costTable"):
        ct = h["costTable"]
        rows = "".join(f'<tr><td>{e(a)}</td><td class="num">{e(b)}</td></tr>' for a, b in ct["rows"])
        out.append(f'<section><h2>What it would take</h2><p>{e(ct["note"])}</p>'
                   f'<div class="scroll"><table><thead><tr><th>Item</th><th>Estimate</th></tr></thead>'
                   f'<tbody>{rows}</tbody></table></div></section>')
    if h.get("questions"):
        out.append('<section class="ask"><h2>Ask before making an offer</h2><ol>'
                   + "".join(f"<li>{e(q)}</li>" for q in h["questions"]) + '</ol></section>')
    if h.get("sources"):
        out.append('<section class="foot"><h3>Sources</h3><ul>' + "".join(
            f'<li><a href="{e(u)}" target="_blank" rel="noopener">{e(t)}</a></li>' for t, u in h["sources"])
            + '</ul><p>Costs marked as estimates are typical St. Louis-area ranges, not quotes. '
              'Public records and listings can be wrong; an inspection is the real test.</p></section>')
    out.append(TAIL)
    return "".join(out)


def row(h, order, key):
    """One short table row. The full breakdown lives only on the house's own report page."""
    hoa = h["hoa"]
    hoa_txt = f'Yes, {hoa["fee"]}' if hoa["has"] else "No, no fee"
    main, base = checks(h)
    count = h["mainFloorBeds"]["count"]
    main_txt = {"pass": f"Pass ({count})", "fail": f"Fails ({count})", "check": "Check"}[main]
    base_txt = BASEMENT_SHORT[h["basement"]["kind"]]
    fence_txt, fence_cls = {True: ("Yes", "pass"), False: ("No", "soft"),
                            None: ("Not stated", "check")}[h["fence"]["has"]]
    subject = '<br><span class="tag subject">Started this</span>' if h.get("role") == "subject" else ""
    return (f'<tr data-house="{e(h["slug"])}" data-home="g-{key}" data-order="{order}">'
            f'<td class="pick-col">{picks(h)}</td>'
            f'<td class="addr"><a class="go" href="{e(h["slug"])}/">{e(h["address"])}</a>'
            f'<br><small>{e(h["city"])} &middot; '
            f'<a href="{e(h["listing"])}" target="_blank" rel="noopener">Listing</a></small>{subject}</td>'
            f'<td class="num">{money(h["price"])}</td>'
            f'<td class="{main}">{MARK[main]} {e(main_txt)}</td><td class="{base}">{MARK[base]} {e(base_txt)}</td>'
            f'<td class="{fence_cls}">{e(fence_txt)}</td><td>{e(hoa_txt)}</td>'
            f'<td>{e(h.get("bedsShort", h["beds"]))}</td><td>{e(h.get("sizeShort", h["size"]))}</td>'
            f'<td class="num">{e(str(h["built"])[:4])}</td><td>{e(h.get("driveShort", h["drive"]))}</td></tr>')


def table(rows):
    def cls(c):
        return f' class="{c}"' if c else ""
    cols = "".join(f'<col{cls(c)} style="width:{w}px">' for _, w, c in COLUMNS)
    head = "".join(f"<th{cls(c)}>{e(t)}</th>" for t, _, c in COLUMNS)
    width = sum(w for _, w, _ in COLUMNS)
    return (f'<div class="scroll"><table class="houses" style="min-width:{width}px"><colgroup>{cols}</colgroup>'
            f'<thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def group(key, title, blurb, rows):
    return (f'<section class="group group-{key}" id="g-{key}"{"" if rows else " hidden"}>'
            f'<div class="group-head"><h2>{e(title)} <span class="count">{len(rows)}</span></h2>'
            f'<p>{e(blurb)}</p></div>{table(rows)}</section>')


def ordered(houses):
    """Houses meeting both must-haves first, then the ones to confirm, then the failures."""
    return [h for key, _, _ in GROUPS for h in houses if overall(h) == key]


def index(data):
    houses = ordered(data["houses"])
    out = [HEAD.format(desc="Houses under consideration, each with a full buyer report.",
                       title="House Search", style=STYLE, attrs=' data-page="list"')]
    out.append('<header>')
    out.append(f'<p class="eyebrow">Updated {e(data["updated"])}</p>')
    out.append('<h1>House search</h1>')
    out.append(f'<p>{e(data["criteria"])}</p>')
    if data.get("searchNote"):
        out.append(f'<details class="note"><summary>How these houses were found</summary>'
                   f'<p>{e(data["searchNote"])}</p></details>')
    out.append('<p>Tap an address for its full report. Prices and statuses are checked against the listing feeds '
               'twice a day, about 6 in the morning and 6 in the evening; what moved is listed at the bottom of '
               'the page and on the timeline of each house.</p>')
    out.append('<p class="js-only">Tap the ✓ on a house you want to view, or the ✕ to rule it out. Houses to '
               'view move up into their own table at the top of the page, and no\'s drop to a table at the '
               'bottom; tapping the same mark again clears it. The marks are shared: whoever sets one, every '
               'phone and laptop that opens this page sees the same tables.</p>')
    out.append('</header>')
    out.append(group("view", "Want to view", "Shared with everyone who opens this page. Tap the ✓ again to take a house off this table.", []))
    order = 0
    for key, title, blurb in GROUPS:
        rows = []
        for h in houses:
            if overall(h) == key:
                rows.append(row(h, order, key))
                order += 1
        out.append(group(key, title, blurb, rows))
    out.append(watching(data.get("watchlist") or [], data.get("pendingCount") or 0))
    out.append(group("no", "Marked no", "Shared with everyone who opens this page. Tap the ✕ again to put a house back where it was.", []))
    out.append(changes(data.get("changes") or []))
    out.append(TAIL)
    return "".join(out)


def changes(items):
    """What the twice-daily check found, newest first. Empty when nothing has moved yet."""
    if not items:
        return ""
    rows = "".join(
        f'<li><span class="when">{e(c["date"])}</span><span><a href="{e(c["slug"])}/">{e(c["address"])}</a>: '
        f'{e(c["text"])}</span></li>' for c in items[:25])
    return (f'<section class="group" id="changes"><div class="group-head"><h2>What changed</h2>'
            f'<p>Found by the twice-daily check of the listing feeds, newest first. Each line is also on '
            f'the timeline of that house.</p></div><ol class="timeline">{rows}</ol></section>')


def watching(items, pending):
    """Houses the check is keeping an eye on but has not written up: a borderline drive, or under contract."""
    if not items and not pending:
        return ""
    note = (f'<p>{pending} more house{"s" if pending != 1 else ""} inside the limit {"are" if pending != 1 else "is"} '
            f'pending, which rarely falls through; the check raises any that comes back on the market.</p>'
            if pending else "")
    if not items:
        return (f'<section class="group group-check" id="watching"><div class="group-head">'
                f'<h2>Watching, not written up</h2>{note}</div></section>')
    rows = []
    for w in items:
        link = (f'<a href="{e(w["link"])}" target="_blank" rel="noopener">{e(w["address"])}</a>' if w.get("link")
                else e(w["address"]))
        price = money(w["price"]) if w.get("price") else ""
        facts = ", ".join(filter(None, [f'{w["beds"]} beds' if w.get("beds") else "",
                                        f'{w["sqft"]:,} sq ft' if w.get("sqft") else "",
                                        f'about {w["drive"]:g} min' if w.get("drive") else ""]))
        rows.append(f'<tr><td class="addr">{link}<br><small>{e(w.get("city") or "")}</small></td>'
                    f'<td class="num">{price}</td><td>{e(facts)}</td><td>{e(w.get("why") or "")}</td></tr>')
    return (f'<section class="group group-check" id="watching"><div class="group-head">'
            f'<h2>Watching, not written up <span class="count">{len(rows)}</span></h2>'
            f'<p>These match on paper but are under contract, or sit right at the drive-time limit. The check '
            f'raises one as a new house the day it comes back on the market or the drive is confirmed.</p>{note}</div>'
            f'<div class="scroll"><table style="min-width:720px"><thead><tr><th>House</th><th>Price</th>'
            f'<th>On paper</th><th>Why it waits</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div></section>')


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    os.replace(tmp, path)
    back = path.read_text(encoding="utf-8")
    if back != text or not back.rstrip().endswith("</html>"):
        sys.exit(f"write did not land intact: {path}")


def missing(h):
    """Every answer a house must carry before it can be listed."""
    gaps = []
    if "has" not in h.get("hoa", {}):
        gaps.append("no homeowners association answer")
    if type(h.get("mainFloorBeds", {}).get("count")) is not int:
        gaps.append("no count of bedrooms on the main floor")
    if h.get("basement", {}).get("kind") not in BASEMENT:
        gaps.append(f'no basement answer (one of {", ".join(BASEMENT)})')
    if h.get("fence", {}).get("has", "absent") not in (True, False, None):
        gaps.append("no fenced-yard answer (null when the listing does not say)")
    for field in ("mainFloorBeds", "basement", "fence"):
        if not h.get(field, {}).get("note"):
            gaps.append(f"no note on {field}")
    return gaps


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    for h in data["houses"]:
        gaps = missing(h)
        if gaps:
            sys.exit(f'{h["address"]}: {"; ".join(gaps)}. Every house needs all of them.')
    for h in data["houses"]:
        write(OUT / h["slug"] / "index.html", report(h, data["updated"]))
    write(OUT / "index.html", index(data))
    tally = {key: sum(overall(h) == key for h in data["houses"]) for key, _, _ in GROUPS}
    print(f'house-search: {len(data["houses"])} report(s) and the list written to {OUT}; must-haves: '
          f'{tally["pass"]} met, {tally["check"]} to confirm, {tally["fail"]} failed')


if __name__ == "__main__":
    main()
