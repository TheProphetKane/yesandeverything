"""Build the house search pages from data/house-search.json.

    python scripts/build-house-search.py

Writes house-search/index.html (the list) and house-search/<slug>/index.html (one full
report per house). Every page is self-contained, like the rest of the site. Each house
card and each report states the homeowners association answer and fee on its own line,
so a house with no fee says so instead of leaving the field blank. The fenced back yard
gets the same treatment, with "Not stated" when the listing does not say.

Two must-haves are checked on every house: 3 bedrooms on the main floor, and a finished
basement. The basement is the tornado shelter, so a house without one fails the same as a
house whose basement is unfinished, and the partly-sunk lower level of a split-level
needs confirming. The build refuses a house that is missing either answer, and the list
groups houses by the result: both met, one to confirm, one failed.

The X on each house marks it a no. The marks live in the viewer's browser storage,
shared by the list and the reports, so they survive a reload but not a change of device.
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
tr.is-no td { opacity: 0.45; }
tr.is-no td:first-child { opacity: 1; }
tr.is-no td:first-child a { text-decoration: line-through; color: var(--muted); }
.ask { background: var(--rose-soft); border-radius: 12px; padding: 1rem 1.25rem; display: grid; gap: 0.6rem; }
.group-head { display: grid; gap: 0.3rem; }
.count { display: inline-block; font-family: var(--font-data); font-size: 0.9rem; vertical-align: middle; padding: 0.05rem 0.55rem; border-radius: 999px; background: var(--raise); color: var(--muted); }
.group-pass .count { background: var(--pass-soft); color: var(--pass); }
.group-check .count { background: var(--amber-soft); color: var(--amber); }
.group-fail .count, .group-no .count { background: var(--fail-soft); color: var(--fail); }
.cards { display: grid; gap: 1.25rem; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 1.2rem; display: grid; gap: 0.8rem; min-width: 0; }
.card.subject { border: 2px solid var(--sea); }
.card-head, .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
.titles { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem 0.9rem; min-width: 0; }
.card-head h3 { font-size: 1.45rem; font-weight: 800; }
.card-body { display: grid; gap: 0.8rem; min-width: 0; }
.tag { display: inline-block; font-family: var(--font-data); font-size: 0.74rem; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.1rem 0.55rem; border-radius: 6px; background: var(--raise); color: var(--muted); }
.tag.subject { background: var(--sea-soft); color: var(--sea); }
.tag.no-tag { background: var(--fail-soft); color: var(--fail); }
.no-tag, .no-note { display: none; }
.is-no .no-tag { display: inline-block; }
.is-no .no-note { display: block; }
.no-note { background: var(--fail-soft); border-left: 6px solid var(--fail); border-radius: 0 12px 12px 0; padding: 0.8rem 1.1rem; }
.card.is-no { border: 1px dashed var(--fail); background: var(--bg); }
.card.is-no .card-body { display: none; }
.card.is-no h3 { color: var(--muted); text-decoration: line-through; }
.nope { display: none; flex: none; min-width: 44px; height: 44px; padding: 0 0.6rem; place-items: center; border-radius: 10px; border: 1px solid var(--line); background: var(--raise); color: var(--fail); font: 700 1.3rem/1 var(--font-data); cursor: pointer; }
.nope:hover { background: var(--fail-soft); border-color: var(--fail); }
.is-no .nope { color: var(--ink); font-size: 0.85rem; letter-spacing: 0.04em; padding: 0 0.9rem; }
.js .nope { display: inline-grid; }
.js-only { display: none; }
.js .js-only { display: block; }
.go { font-weight: 700; }
.foot { font-size: 0.85rem; color: var(--muted); display: grid; gap: 0.4rem; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
"""

# The X button. The list of no's is one array of slugs in localStorage, read by the list
# and by every report, so a no set on a report shows on the list and the other way round.
# Storage can throw (private windows, blocked site data); the page still works without it.
SCRIPT = """
(function () {
  var KEY = "house-search-no";
  var noGroup = document.getElementById("g-no");
  var live = document.getElementById("announce");
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (err) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* lasts until the page closes */ }
  }
  var no = load();
  function isNo(slug) { return no.indexOf(slug) !== -1; }
  function place(card, on) {
    var home = on ? noGroup : document.getElementById(card.getAttribute("data-home"));
    var list = home.querySelector(".cards");
    if (card.parentNode === list) return;
    var order = +card.getAttribute("data-order"), next = null;
    for (var i = 0; i < list.children.length; i++) {
      if (+list.children[i].getAttribute("data-order") > order) { next = list.children[i]; break; }
    }
    list.insertBefore(card, next);
  }
  function render() {
    document.querySelectorAll("[data-house]").forEach(function (el) {
      var on = isNo(el.getAttribute("data-house"));
      el.classList.toggle("is-no", on);
      if (noGroup && el.matches("article.card")) place(el, on);
    });
    document.querySelectorAll("button[data-nope]").forEach(function (b) {
      var on = isNo(b.getAttribute("data-nope")), addr = b.getAttribute("data-addr");
      b.textContent = on ? "Undo" : "\\u2715";
      b.setAttribute("aria-label", on ? "Undo the no on " + addr : "Mark " + addr + " as a no");
      b.title = on ? "Put this house back" : "Mark this house as a no";
    });
    document.querySelectorAll(".group").forEach(function (g) {
      var n = g.querySelectorAll(".cards > .card").length;
      g.hidden = n === 0;
      var c = g.querySelector(".count");
      if (c) c.textContent = n;
    });
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-nope]");
    if (!b) return;
    var slug = b.getAttribute("data-nope"), on = !isNo(slug);
    no = no.filter(function (s) { return s !== slug; });
    if (on) no.push(slug);
    save(no);
    render();
    b.focus({ preventScroll: true });
    if (live) {
      live.textContent = b.getAttribute("data-addr") + (on ? (noGroup ? " marked no and moved to the bottom." : " marked no.") : " put back.");
    }
  });
  window.addEventListener("storage", function (ev) { if (ev.key === KEY) { no = load(); render(); } });
  window.addEventListener("pageshow", function () { no = load(); render(); });
  render();
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
     "Close on paper. The amber line on each house says what to ask."),
    ("fail", "Fails a must-have",
     "Kept for comparison. The red line on each house says which one it misses."),
]


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


def nope(h):
    return (f'<button type="button" class="nope" data-nope="{e(h["slug"])}" data-addr="{e(h["address"])}" '
            f'aria-label="Mark {e(h["address"])} as a no" title="Mark this house as a no">✕</button>')


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
    out.append(f'<div class="title-row"><h1>{e(h["address"])}</h1>{nope(h)}</div>')
    out.append('<p class="no-note">You marked this house a no. It sits at the bottom of the house list until you undo it.</p>')
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


def card(h, order, group):
    cls = "card subject" if h.get("role") == "subject" else "card"
    tag = '<span class="tag subject">The house that started this</span>' if h.get("role") == "subject" \
        else '<span class="tag">Similar house</span>'
    return (f'<article class="{cls}" data-house="{e(h["slug"])}" data-home="g-{group}" data-order="{order}">'
            f'<div class="card-head"><div class="titles"><h3>{e(h["address"])}</h3>{tag}'
            f'<span class="tag no-tag">Marked no</span></div>{nope(h)}</div>'
            f'<div class="card-body"><p>{e(h["city"])}</p>'
            f'<p class="price">{money(h["price"])} <small>{e(h.get("priceNote", ""))}</small></p>'
            f'{musts(h)}{hoa_line(h)}{fence_line(h)}{facts(h)}'
            f'<div class="verdict"><strong>The short answer</strong><p>{e(h["verdict"])}</p></div>'
            f'<p><a class="go" href="{e(h["slug"])}/">Read the full report</a> &middot; '
            f'<a href="{e(h["listing"])}" target="_blank" rel="noopener">Listing</a></p></div></article>')


def ordered(houses):
    """Houses meeting both must-haves first, then the ones to confirm, then the failures."""
    return [h for key, _, _ in GROUPS for h in houses if overall(h) == key]


def index(data):
    houses = ordered(data["houses"])
    out = [HEAD.format(desc="Houses under consideration, each with a full buyer report.",
                       title="House Search", style=STYLE, attrs="")]
    out.append('<header>')
    out.append(f'<p class="eyebrow">Updated {e(data["updated"])}</p>')
    out.append('<h1>House search</h1>')
    out.append(f'<p>{e(data["criteria"])}</p>')
    if data.get("searchNote"):
        out.append(f'<p>{e(data["searchNote"])}</p>')
    out.append('<p class="js-only">Tap the ✕ on a house to mark it a no. It drops to the bottom of the page, '
               'where Undo puts it back. The marks are saved in this browser only, so a phone and a laptop '
               'each keep their own.</p>')
    out.append('</header>')
    if data.get("compareRows"):
        out.append(compare(houses))
    order = 0
    for key, title, blurb in GROUPS:
        members = [h for h in houses if overall(h) == key]
        out.append(f'<section class="group group-{key}" id="g-{key}"{"" if members else " hidden"}>'
                   f'<div class="group-head"><h2>{e(title)} <span class="count">{len(members)}</span></h2>'
                   f'<p>{e(blurb)}</p></div><div class="cards">')
        for h in members:
            out.append(card(h, order, key))
            order += 1
        out.append('</div></section>')
    out.append('<section class="group group-no" id="g-no" hidden><div class="group-head">'
               '<h2>Marked no <span class="count">0</span></h2>'
               '<p>Saved in this browser. Undo puts a house back where it was.</p></div>'
               '<div class="cards"></div></section>')
    out.append(TAIL)
    return "".join(out)


def compare(houses):
    head = ("<tr><th>House</th><th>Price</th><th>3 beds on main floor</th><th>Finished basement</th>"
            "<th>Fenced yard</th><th>Homeowners association</th>"
            "<th>Beds / baths</th><th>Size</th><th>Built</th><th>Drive to daycare</th></tr>")
    rows = []
    for h in houses:
        hoa = h["hoa"]
        hoa_txt = f'Yes, {hoa["fee"]}' if hoa["has"] else "No, no fee"
        main, base = checks(h)
        count = h["mainFloorBeds"]["count"]
        main_txt = {"pass": f"Pass ({count})", "fail": f"Fails ({count})", "check": "Check"}[main]
        base_txt = BASEMENT_SHORT[h["basement"]["kind"]]
        fence_txt, fence_cls = {True: ("Yes", "pass"), False: ("No", "soft"),
                                None: ("Not stated", "check")}[h["fence"]["has"]]
        rows.append(f'<tr data-house="{e(h["slug"])}"><td><a href="{e(h["slug"])}/">{e(h["address"])}</a>'
                    f' <span class="tag no-tag">No</span><br><small>{e(h["city"])}</small></td>'
                    f'<td class="num">{money(h["price"])}</td>'
                    f'<td class="{main}">{MARK[main]} {e(main_txt)}</td><td class="{base}">{MARK[base]} {e(base_txt)}</td>'
                    f'<td class="{fence_cls}">{e(fence_txt)}</td><td>{e(hoa_txt)}</td>'
                    f'<td>{e(h.get("bedsShort", h["beds"]))}</td><td>{e(h.get("sizeShort", h["size"]))}</td>'
                    f'<td class="num">{e(str(h["built"])[:4])}</td><td>{e(h.get("driveShort", h["drive"]))}</td></tr>')
    return (f'<section><h2>Side by side</h2><div class="scroll"><table style="min-width:1100px">'
            f'<thead>{head}</thead><tbody>{"".join(rows)}</tbody></table></div></section>')


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
