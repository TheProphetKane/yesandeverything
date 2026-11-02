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
import re
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
tr.is-no td, tr.is-no td.pass, tr.is-no td.fail, tr.is-no td.check, tr.is-no td.soft { color: var(--muted); }
tr.is-no td.addr a { text-decoration: line-through; color: var(--muted); }
.tag.marked-no { display: none; background: var(--fail-soft); color: var(--fail); border: 1px solid var(--fail); }
tr.is-no .tag.marked-no { display: inline-block; }
.ask { background: var(--rose-soft); border-radius: 12px; padding: 1rem 1.25rem; display: grid; gap: 0.6rem; }
.group-head { display: grid; gap: 0.3rem; }
.count { display: inline-block; font-family: var(--font-data); font-size: 0.9rem; vertical-align: middle; padding: 0.05rem 0.55rem; border-radius: 999px; background: var(--raise); color: var(--muted); }
.group-pass .count { background: var(--pass-soft); color: var(--pass); }
.group-check .count { background: var(--amber-soft); color: var(--amber); }
.group-fail .count, .group-no .count { background: var(--fail-soft); color: var(--fail); }
.group-view h2 { color: var(--pass); }
.group-view .count { background: var(--pass-soft); color: var(--pass); }
.group-view .scroll { border-color: var(--pass); box-shadow: 0 0 0 2px var(--pass); }
.group-ours h2 { color: var(--pass); }
.group-ours .count { background: var(--pass-soft); color: var(--pass); }
.group-ours .scroll { border-color: var(--pass); box-shadow: 0 0 0 2px var(--pass); }
.title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
.tag { display: inline-block; font-family: var(--font-data); font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.05rem 0.45rem; border-radius: 6px; background: var(--raise); color: var(--muted); }
.tag.subject { background: var(--sea-soft); color: var(--sea); }
.tag.ours { background: var(--pass-soft); color: var(--pass); border: 1px solid var(--pass); }
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
.votes { display: block; margin-top: 0.25rem; font-size: 0.82rem; color: var(--muted); }
.votes:empty { display: none; }
.votes .v-view { color: var(--pass); font-weight: 700; }
.votes .v-no { color: var(--fail); font-weight: 700; }
.tag.state { background: var(--amber-soft); color: var(--amber); border: 1px solid var(--amber); }
.tag.state.gone { background: var(--fail-soft); color: var(--fail); border-color: var(--fail); }
.state-banner { background: var(--amber-soft); border-left: 6px solid var(--amber); border-radius: 0 12px 12px 0; padding: 0.8rem 1.1rem; }
.state-banner.gone { background: var(--fail-soft); border-left-color: var(--fail); }
.state-banner.ours { background: var(--pass-soft); border-left-color: var(--pass); }
.group-off .count { background: var(--amber-soft); color: var(--amber); }
.voter { color: var(--muted); }
.linkish { background: none; border: 0; padding: 0; color: var(--sea); font: inherit; text-decoration: underline; cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
"""

# The check and X buttons. Each person's vote is kept on its own, under the first name they type
# once on each phone or laptop, by the family-votes Worker at /house-search/api/marks
# (workers/family-votes), so one person's tap never undoes another's. A house sits in the Want
# to view table while anyone has it ticked, with whose tick it is, and the Recent votes list on
# the list page shows every change with who made it. Each browser keeps the last answer in
# localStorage (house-search-votes) so the page draws before the route answers, and keeps its
# own unsent taps in house-search-mine until they land; a tap carries the time it was made, so
# one that waited offline cannot undo a newer one made on the same person's other phone. The
# single-mark version's unsent queue (house-search-pending) is dropped unread: those were the
# taps that could clear someone else's mark. A browser that never opened the shared version
# still carries its old local-only marks (house-search-view, house-search-no) up once, as its
# own votes, where it has none. Storage can throw (private windows, blocked site data); the
# page still works without it.
SCRIPT = """
(function () {
  var API = "/house-search/api/marks";
  var NAME = "house-search-name", CACHE = "house-search-votes", MINE = "house-search-mine", SYNCED = "house-search-synced";
  var OLD = { view: "house-search-view", no: "house-search-no" };
  var LABELS = {
    view: ["Tick {a} as one to view", "Take your tick off {a}", "Want to view", "Take your tick off"],
    no: ["Mark {a} as a no", "Take your no off {a}", "Mark as a no", "Take your no off"]
  };
  var listed = !!document.getElementById("g-no");
  var live = document.getElementById("announce");
  var note = document.getElementById("save-note");
  var voterEl = document.getElementById("voter");
  var logEl = document.getElementById("vote-log");
  var canSend = typeof fetch === "function";
  var votes = {}, log = [], pending = {}, name = "", queue = Promise.resolve();
  var addrs = {};
  document.querySelectorAll("button[data-slug]").forEach(function (b) { addrs[b.getAttribute("data-slug")] = b.getAttribute("data-addr"); });
  function get(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "null");
      return v && typeof v === "object" ? v : fallback;
    } catch (err) { return fallback; }
  }
  function put(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (err) { /* lasts until the page closes */ }
  }
  function text(key) {
    try { return localStorage.getItem(key) || ""; } catch (err) { return ""; }
  }
  function cleanName(raw) {
    var n = String(raw || "").replace(/\\s+/g, " ").trim();
    try { return n.length <= 40 && new RegExp("^\\\\p{L}[\\\\p{L} '.-]*$", "u").test(n) ? n : ""; }
    catch (err) { return n.length <= 40 && /^[A-Za-z][A-Za-z '.-]*$/.test(n) ? n : ""; }
  }
  function keyOf(n) { return "n:" + n.toLowerCase(); }
  function overlay() {
    for (var s in pending) {
      var p = pending[s], v = {}, k;
      for (k in votes[s] || {}) v[k] = votes[s][k];
      if (p.mark) v[keyOf(p.name)] = { mark: p.mark, name: p.name, at: p.set };
      else delete v[keyOf(p.name)];
      if (p.mark && p.name && v.earlier && v.earlier.mark === p.mark) delete v.earlier;
      votes[s] = v;
    }
  }
  function read() {
    var c = get(CACHE, {});
    votes = c.votes && typeof c.votes === "object" ? c.votes : {};
    log = Array.isArray(c.log) ? c.log : [];
    pending = get(MINE, {});
    name = cleanName(text(NAME));
    overlay();
  }
  function mine(slug) {
    var v = votes[slug], r = name && v && v[keyOf(name)];
    return r ? r.mark : "";
  }
  function overall(slug) {
    var v = votes[slug] || {}, seen = "";
    for (var k in v) {
      if (v[k].mark === "view") return "view";
      if (v[k].mark === "no") seen = "no";
    }
    return seen;
  }
  function who(slug, mark) {
    var v = votes[slug] || {}, out = [];
    for (var k in v) {
      if (v[k].mark !== mark) continue;
      out.push(k === "earlier" ? "a mark from before names" : v[k].name || "someone");
    }
    return out;
  }
  function warn(t) {
    if (!note) return;
    note.textContent = t;
    note.hidden = !t;
  }
  function take(j) {
    if (j && !j.votes && j.marks && typeof j.marks === "object") {
      // A Worker from before names answers with one mark per house; show each as a mark from before names.
      j.votes = {};
      for (var m in j.marks) j.votes[m] = { earlier: { mark: j.marks[m], name: "", at: j.at || 0 } };
    }
    if (!j || !j.votes || typeof j.votes !== "object") return;
    votes = j.votes;
    if (Array.isArray(j.log)) log = j.log;
    put(CACHE, { votes: votes, log: log });
    overlay();
    render();
  }
  function settle(slug, set) {
    if (pending[slug] && pending[slug].set === set) { delete pending[slug]; put(MINE, pending); }
  }
  function send(slug) {
    var p = pending[slug];
    if (!p) return Promise.resolve();
    if (!canSend) return Promise.reject(new Error("This browser cannot reach the shared list."));
    return fetch(API, { method: "POST", headers: { "content-type": "application/json" },
                        body: JSON.stringify({ slug: slug, mark: p.mark, name: p.name, set: p.set }) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok) { settle(slug, p.set); take(j); warn(""); return; }
          if (r.status !== 429 && r.status < 500) { settle(slug, p.set); read(); render(); }
          throw new Error(j.error || "The shared list refused it (" + r.status + ").");
        });
      }, function () { throw new Error("The shared list did not answer."); });
  }
  function later(slug) {
    queue = queue.then(function () { return send(slug); }, function () { return send(slug); });
    return queue;
  }
  function legacy() {
    if (!name || text(SYNCED) === "1") return;
    ["view", "no"].forEach(function (m) {
      var list = get(OLD[m], []);
      if (Array.isArray(list)) list.forEach(function (s) {
        if (!mine(s) && !(s in pending)) pending[s] = { mark: m, name: name, set: 1 };
      });
    });
    put(MINE, pending);
    try { localStorage.setItem(SYNCED, "1"); } catch (err) { /* runs again next load */ }
  }
  function sync() {
    if (!canSend) return;
    fetch(API, { cache: "no-store", headers: { accept: "application/json" } })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject(new Error("The shared list did not answer (" + r.status + ")."));
      }, function () { throw new Error("The shared list did not answer."); })
      .then(function (j) {
        take(j);
        legacy();
        warn("");
        return Object.keys(pending).reduce(function (chain, s) {
          return chain.then(function () { return later(s); });
        }, Promise.resolve());
      })
      .catch(function (err) {
        if (Object.keys(pending).length) warn("Not saved for everyone yet. " + err.message + " It shows here and goes up again when the page next loads.");
      });
  }
  function showVoter() {
    if (!voterEl) return;
    voterEl.textContent = name ? "Voting as " + name + ". " : "The first tap asks for your first name, so everyone can see whose vote is whose. ";
    var b = document.createElement("button");
    b.type = "button";
    b.className = "linkish";
    b.id = "change-name";
    b.textContent = name ? "Not you? Change the name" : "Set your name now";
    voterEl.appendChild(b);
  }
  function askName() {
    var n = window.prompt("Your first name, so everyone can see whose vote is whose. Type the same name on every phone or laptop you use.", name || "");
    if (n === null) return "";
    n = cleanName(n);
    if (!n) { warn("A name is letters and spaces, up to 40 characters. Nothing was saved."); return ""; }
    name = n;
    try { localStorage.setItem(NAME, n); } catch (err) { /* asked again next load */ }
    showVoter();
    return n;
  }
  function when(at) {
    try { return new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch (err) { return ""; }
  }
  function sentence(e) {
    var person = e.name || "Someone", addr = addrs[e.slug] || e.slug;
    if (e.why) return "The " + (e.from === "view" ? "tick" : "no") + " from before names on " + addr + " is now " + e.why.replace(/^claimed by /, "") + "'s.";
    if (e.to === "view") return person + " ticked " + addr + " to view" + (e.from === "no" ? ", in place of their no." : ".");
    if (e.to === "no") return person + " marked " + addr + " a no" + (e.from === "view" ? ", in place of their tick." : ".");
    return person + " took their " + (e.from === "view" ? "tick" : "no") + " off " + addr + ".";
  }
  function renderLog() {
    if (!logEl) return;
    logEl.textContent = "";
    log.slice(0, 25).forEach(function (e) {
      var li = document.createElement("li"), w = document.createElement("span"), t = document.createElement("span");
      w.className = "when";
      w.textContent = when(e.at);
      t.textContent = sentence(e);
      li.appendChild(w);
      li.appendChild(t);
      logEl.appendChild(li);
    });
    var sec = document.getElementById("recent-votes");
    if (sec) sec.hidden = !log.length;
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
      var m = overall(el.getAttribute("data-house"));
      el.classList.toggle("is-view", m === "view");
      el.classList.toggle("is-no", m === "no");
      if (listed && el.matches("tr")) place(el, m);
    });
    document.querySelectorAll("[data-votes]").forEach(function (el) {
      var slug = el.getAttribute("data-votes"), yes = who(slug, "view"), no = who(slug, "no");
      el.textContent = "";
      if (yes.length) {
        var a = document.createElement("span");
        a.className = "v-view";
        a.textContent = "\\u2713 " + yes.join(", ");
        el.appendChild(a);
      }
      if (yes.length && no.length) el.appendChild(document.createTextNode(" \\u00b7 "));
      if (no.length) {
        var c = document.createElement("span");
        c.className = "v-no";
        c.textContent = "\\u2715 " + no.join(", ");
        el.appendChild(c);
      }
    });
    document.querySelectorAll("button[data-pick]").forEach(function (b) {
      var want = b.getAttribute("data-pick"), on = mine(b.getAttribute("data-slug")) === want;
      var t = LABELS[want], addr = b.getAttribute("data-addr");
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", t[on ? 1 : 0].replace("{a}", addr));
      b.title = t[on ? 3 : 2];
    });
    document.querySelectorAll(".group").forEach(function (g) {
      if (!g.querySelector("tbody")) return;
      var n = g.querySelectorAll("tbody > tr").length;
      g.hidden = n === 0;
      var c = g.querySelector(".count");
      if (c) c.textContent = n;
    });
    renderLog();
  }
  document.addEventListener("click", function (ev) {
    if (ev.target.closest("#change-name")) { askName(); render(); return; }
    var b = ev.target.closest("button[data-pick]");
    if (!b) return;
    if (!name && !askName()) return;
    var slug = b.getAttribute("data-slug"), want = b.getAttribute("data-pick");
    var mark = mine(slug) === want ? "" : want;
    pending[slug] = { mark: mark, name: name, set: Date.now() };
    put(MINE, pending);
    overlay();
    render();
    b.focus({ preventScroll: true });
    var addr = b.getAttribute("data-addr");
    var said = mark === "view" ? addr + " ticked to view under " + name + (listed ? ", in the Want to view table at the top of the page." : ".")
      : mark === "no" ? addr + " marked no under " + name + "."
      : name + "'s mark taken off " + addr + ".";
    if (live) live.textContent = said;
    later(slug).catch(function (err) {
      warn("Not saved for everyone yet. " + err.message + " It shows here and goes up again when the page next loads.");
      if (live) live.textContent = said + " Not saved for everyone yet. " + err.message;
    });
  });
  window.addEventListener("storage", function (ev) {
    if (ev.key === CACHE || ev.key === MINE || ev.key === NAME) { read(); showVoter(); render(); }
  });
  window.addEventListener("pageshow", function (ev) { if (ev.persisted) { read(); render(); sync(); } });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  try { localStorage.removeItem("house-search-pending"); localStorage.removeItem("house-search-marks"); } catch (err) { /* nothing to drop */ }
  read();
  showVoter();
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


STATE_WORD = {"pending": "Under contract", "contingent": "Under contract, contingent", "gone": "Off the market"}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
          "October", "November", "December"]


def state_of(h):
    """active, contingent, pending or gone: set by the scan, read from the status line for older entries."""
    if h.get("state") in ("active", "pending", "contingent", "gone"):
        return h["state"]
    text = (h.get("status") or "").lower()
    if text.startswith("under contract with contingencies"):
        return "contingent"
    if text.startswith("under contract"):
        return "pending"
    if text.startswith("no longer") or text.startswith("off market") or "withdrawn" in text[:40]:
        return "gone"
    return "active"


def state_since(h):
    """The day the house left the market, as "October 29", when the data says."""
    if h.get("stateSince"):
        y, m, d = (int(x) for x in h["stateSince"].split("-"))
        return f"{MONTHS[m - 1]} {d}"
    found = re.search(r"as of (\w+ \d+), \d{4}", h.get("status") or "")
    return found.group(1) if found else ""


def ours_since(h):
    """The day the family's offer was accepted, as "November 2", from the ours block the data carries."""
    y, m, d = (int(x) for x in h["ours"]["since"].split("-"))
    return f"{MONTHS[m - 1]} {d}"


def state_tag(h):
    if h.get("ours"):
        return f'<br><span class="tag ours">Our contract since {e(ours_since(h))}</span>'
    st = state_of(h)
    if st == "active":
        return ""
    since = state_since(h)
    cls = " gone" if st == "gone" else ""
    return f'<br><span class="tag state{cls}">{e(STATE_WORD[st])}{" since " + e(since) if since else ""}</span>'


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
    out.append(f'<p class="votes" data-votes="{e(h["slug"])}"></p>')
    out.append('<p class="voter js-only" id="voter"></p>')
    st = state_of(h)
    if h.get("ours"):
        out.append(f'<p class="state-banner ours"><b>Our contract since {e(ours_since(h))}.</b> '
                   f'{e(h["ours"]["note"])}</p>')
    elif st != "active":
        since = state_since(h)
        out.append(f'<p class="state-banner{" gone" if st == "gone" else ""}"><b>{e(STATE_WORD[st])}'
                   f'{" since " + e(since) if since else ""}.</b> {e(h["status"])}</p>')
    out.append('<p class="view-note">On the list to view. It sits in the Want to view table at the top of '
               'the house search page, for everyone who opens it, while anyone has it ticked.</p>')
    out.append('<p class="no-note">Marked a no. It sits in the Marked no table at the bottom of the house '
               'search page, for everyone who opens it, until whoever marked it takes the no off or someone ticks it.</p>')
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
    if h.get("realtor"):
        subject += '<br><span class="tag subject">On the realtor\'s list</span>'
    return (f'<tr data-house="{e(h["slug"])}" data-home="g-{key}" data-order="{order}">'
            f'<td class="pick-col">{picks(h)}</td>'
            f'<td class="addr"><a class="go" href="{e(h["slug"])}/">{e(h["address"])}</a>'
            f'<br><small>{e(h["city"])} &middot; '
            f'<a href="{e(h["listing"])}" target="_blank" rel="noopener">Listing</a></small>{subject}{state_tag(h)}'
            f'<br><span class="tag marked-no">Marked no</span><span class="votes" data-votes="{e(h["slug"])}"></span></td>'
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
    out.append('<p class="js-only">Tap the ✓ on a house you want to view, or the ✕ to rule it out. Each '
               'person\'s vote is kept under their own first name, which the page asks for the first time you '
               'vote on a phone or laptop. A house moves up to the Want to view table while anyone has it '
               'ticked, with whose tick it is, and drops to the Marked no table when someone has ruled it out '
               'and nobody has ticked it. Tapping your own mark again takes off only your vote. Every phone and '
               'laptop that opens this page sees the same tables, and Recent votes near the bottom lists every '
               'change with who made it.</p>')
    out.append('<p class="voter js-only" id="voter"></p>')
    out.append('</header>')
    out.append(group("view", "Want to view", "Every house anyone has ticked, with whose tick it is. Your ✓ "
                     "again takes your tick off; it never touches anyone else's.", []))
    order = 0
    mine = []
    for h in houses:
        if h.get("ours"):
            mine.append(row(h, order, "ours"))
            order += 1
    out.append(group("ours", "Our contract", "The house the family is buying. The feeds will show it under "
                     "contract; that contract is ours. The tag says since when, and the report says what "
                     "happens next.", mine))
    for key, title, blurb in GROUPS:
        rows = []
        for h in houses:
            if overall(h) == key and state_of(h) == "active" and not h.get("ours"):
                rows.append(row(h, order, key))
                order += 1
        out.append(group(key, title, blurb, rows))
    gone = []
    for h in houses:
        if state_of(h) != "active" and not h.get("ours"):
            gone.append(row(h, order, "off"))
            order += 1
    out.append(group("off", "Under contract or off the market",
                     "These were on the list and have gone under contract or left the market; each row says "
                     "which, and since when. A tick on one keeps it in the Want to view table, with the same tag.",
                     gone))
    out.append(watching(data.get("watchlist") or [], data.get("pendingCount") or 0))
    out.append(group("no", "Marked no", "Houses someone has ruled out and nobody has ticked, with whose no it is. "
                     "Your ✕ again takes your no off.", []))
    if data.get("leftOut"):
        out.append(left_out(data["leftOut"]))
    out.append('<section class="group" id="recent-votes" hidden><div class="group-head"><h2>Recent votes</h2>'
               '<p>Every change to a vote, newest first, with who made it.</p></div>'
               '<ol class="timeline" id="vote-log"></ol></section>')
    out.append(changes(data.get("changes") or []))
    out.append(TAIL)
    return "".join(out)


def changes(items):
    """What the twice-daily check found, newest first. Empty when nothing has moved yet."""
    if not items:
        return ""
    def where(c):
        if c.get("slug"):
            return f'<a href="{e(c["slug"])}/">{e(c["address"])}</a>'
        if c.get("link"):
            return f'<a href="{e(c["link"])}" target="_blank" rel="noopener">{e(c["address"])}</a>'
        return e(c["address"])
    rows = "".join(
        f'<li><span class="when">{e(c["date"])}</span><span>{where(c)}: {e(c["text"])}</span></li>'
        for c in items[:25])
    return (f'<section class="group" id="changes"><div class="group-head"><h2>What changed</h2>'
            f'<p>Found by the twice-daily check of the listing feeds, newest first. Each line is also on '
            f'the timeline of that house.</p></div><ol class="timeline">{rows}</ol></section>')


def left_out(items):
    """Houses someone sent or asked about that were checked and left off the list, with the reason."""
    rows = []
    for w in items:
        link = (f'<a href="{e(w["link"])}" target="_blank" rel="noopener">{e(w["address"])}</a>' if w.get("link")
                else e(w["address"]))
        price = money(w["price"]) if w.get("price") else ""
        rows.append(f'<tr><td class="addr">{link}<br><small>{e(w.get("city") or "")}'
                    f'{" &middot; " + e(w["from"]) if w.get("from") else ""}</small></td>'
                    f'<td class="num">{price}</td><td>{e(w.get("checked") or "")}</td><td>{e(w["why"])}</td></tr>')
    return (f'<section class="group group-fail" id="left-out"><div class="group-head">'
            f'<h2>Checked and left out <span class="count">{len(rows)}</span></h2>'
            f'<p>Houses sent to the family or asked about, checked against the price, the drive and the two '
            f'must-haves, and left off the list. Each row says why.</p></div>'
            f'<div class="scroll"><table style="min-width:720px"><thead><tr><th>House</th><th>Price</th>'
            f'<th>Checked</th><th>Why it is out</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div></section>')


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
