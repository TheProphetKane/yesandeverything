"""Build the house plan pages for 45 Autumn Crest Ct.

    python scripts/build-house-plan.py          writes house-plan/index.html, house-plan/basement/index.html
                                                and house-plan/floors/index.html
    python scripts/build-house-plan.py --check  exits 1 when any page on disk differs from a fresh build

Each page's source is a markdown file in docs/ that the prose gate measures: docs/HOUSE-PLAN-45-AUTUMN-CREST.md
for the plan, docs/HOUSE-PLAN-BASEMENT-LAYOUTS.md for the basement layout, docs/HOUSE-PLAN-FLOORS.md for the
main and upper floors. Edit the source, build, ship; never edit a page by hand.

A table with a Job column, a Family column and a Hired column is a list of jobs: each row becomes a card
(the mark and the short name, both prices, the date, who, what it takes, then the cost detail), and the
section closes on its totals, needed, wanted and the two together. A cost cell opens on that row's figure
and the words that qualify it; a colon or a semicolon starts the detail. A line holding {{headline}}
becomes the budget at a glance, and a line holding {{summary}} becomes the one list of every job with its
two prices and the total. Any other table becomes cards on a phone, each cell labeled with its column.
A line holding {{floor-plans}} becomes the plan's picture gallery; a line holding {{layout}} becomes the
basement layout's drawing, which scripts/draw-basement-layouts.py writes, and {{main-floor}} and
{{upper-floor}} become the floor drawings scripts/draw-house-floors.py writes. Pictures open in a pop-out
over the page, or full size in a new tab without scripts.
"""

import datetime
import hashlib
import html
import math
import re
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
REPORT = "/house-search/45-autumn-crest-ct/"

PLAN_GALLERY = [
    {
        "thumb": "floors/main.svg",
        "page": "floors/",
        "title": "The main floor",
        "text": "Every room colored by its use and furnished as a first pass: the sectional, the toy room with "
                "the train table, the frog shelf, and tables for the breakfast and dining rooms.",
    },
    {
        "thumb": "floors/upper.svg",
        "page": "floors/#the-upper-floor",
        "title": "The upper floor",
        "text": "The king bed facing the television, the infant's crib, the toddler's bed, and the guest "
                "room's full bed.",
    },
    {
        "thumb": "basement/layout.svg",
        "page": "basement/",
        "title": "The basement layout",
        "text": "Nick's layout redrawn on November 5 around what the walk-through found: every room where he "
                "planned it, the studio boxing the sump pit into a closet in its corner, the bins in the room the sellers "
                "finished, a 32-foot putting lane, drawn around the stair, the furnace and the two beams.",
    },
]

PAGES = [
    {
        "src": ROOT / "docs" / "HOUSE-PLAN-45-AUTUMN-CREST.md",
        "out": ROOT / "house-plan" / "index.html",
        "eyebrow": "House plan, if the purchase goes through",
        "crumbs": [(REPORT, "The house report"), ("/house-search/", "The house search")],
        "description": "The family's plan for 45 Autumn Crest Ct, Wentzville, from the inspection to the basement.",
        "status_first": True,
    },
    {
        "src": ROOT / "docs" / "HOUSE-PLAN-BASEMENT-LAYOUTS.md",
        "out": ROOT / "house-plan" / "basement" / "index.html",
        "eyebrow": "Basement layout, 1 square to the foot",
        "crumbs": [("/house-plan/", "The house plan"), ("/house-plan/floors/", "The floor plans")],
        "description": "The basement layout for 45 Autumn Crest Ct: a D&D studio, an office, a play area, bins and a putting lane.",
        "status_first": False,
    },
    {
        "src": ROOT / "docs" / "HOUSE-PLAN-FLOORS.md",
        "out": ROOT / "house-plan" / "floors" / "index.html",
        "eyebrow": "Every floor, 1 square to the foot",
        "crumbs": [("/house-plan/", "The house plan"), ("/house-plan/basement/", "The basement layout")],
        "description": "The main floor, the upper floor and the basement of 45 Autumn Crest Ct, every room colored by its use.",
        "status_first": False,
    },
]

STYLE = """
:root {
  color-scheme: dark;
  --bg: #0b1622; --surface: #122233; --raise: #182c42; --ink: #e8f0f8; --muted: #9fb3c8;
  --line: #24405a; --sea: #4cc3e0; --sea-soft: #12384a; --rose: #ff6f9c; --rose-soft: #3d1a2b;
  --pass: #6fd68f; --pass-soft: #163a24; --violet: #b49cff; --violet-soft: #2a2347;
  --font-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --font-body: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;
  --font-data: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 1rem; line-height: 1.55; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 1.75rem max(16px, 2.5vw) 4rem; display: grid; gap: 1.4rem; }
h1, h2, h3 { font-family: var(--font-display); margin: 0; line-height: 1.15; text-wrap: balance; }
h1 { font-size: clamp(1.9rem, 5vw, 2.9rem); font-weight: 800; }
h2 { font-size: 1.45rem; font-weight: 800; margin-top: 1.4rem; padding-bottom: 0.35rem; border-bottom: 2px solid var(--line); scroll-margin-top: 1rem; }
h3 { font-size: 1.1rem; font-weight: 700; }
p { margin: 0; max-width: 80ch; }
a { color: var(--sea); text-underline-offset: 3px; }
a:focus-visible, button:focus-visible { outline: 3px solid var(--rose); outline-offset: 2px; border-radius: 6px; }
header { display: grid; gap: 0.55rem; }
.crumb, .eyebrow { font-family: var(--font-data); font-size: 0.82rem; }
.eyebrow { letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.status { background: var(--pass-soft); border-left: 6px solid var(--pass); border-radius: 0 12px 12px 0; padding: 0.8rem 1.1rem; max-width: none; }
.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 1rem; }
.plan-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: grid; }
.plan-card a.shot { display: block; background: #fff; line-height: 0; cursor: zoom-in; }
.plan-card img { width: 100%; height: 220px; object-fit: contain; background: #fff; }
.plan-card .words { padding: 0.8rem 1rem 1rem; display: grid; gap: 0.35rem; }
.plan-card b { font-family: var(--font-display); font-size: 1.05rem; }
.plan-card small { color: var(--muted); font-size: 0.9rem; }
.plan-card .links { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; font-family: var(--font-data); font-size: 0.82rem; }
figure.layout { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); }
figure.layout a.shot { display: block; cursor: zoom-in; line-height: 0; }
figure.layout img { width: 100%; max-width: 980px; height: auto; display: block; margin: 0 auto; }
figure.layout figcaption { background: var(--surface); padding: 0.5rem 0.9rem; font-family: var(--font-data); font-size: 0.82rem; }
.plan-card a.page-link { display: block; background: #fff; line-height: 0; }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
th { text-align: left; font-family: var(--font-data); font-size: 0.76rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); background: var(--raise); padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--line); vertical-align: bottom; }
td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
tbody tr:nth-child(even) td { background: rgba(255, 255, 255, 0.025); }
tr.total td { background: var(--raise) !important; border-top: 2px solid var(--sea); font-weight: 700; }
td.c-item { font-weight: 700; }
td.c-source { color: var(--muted); font-size: 0.88rem; min-width: 12rem; }
table.t-facts td.c-fact { min-width: 24rem; }
.tag { display: inline-block; font-family: var(--font-data); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border-radius: 999px; padding: 0.05rem 0.55rem; margin-right: 0.45rem; vertical-align: 0.15em; white-space: nowrap; }
.tag.need { background: var(--rose-soft); color: var(--rose); }
.tag.want { background: var(--violet-soft); color: var(--violet); }
.tag.fail { background: var(--raise); color: var(--muted); border: 1px solid var(--line); }
.tag.all { background: var(--sea-soft); color: var(--sea); }
ul { margin: 0; padding-left: 1.2rem; max-width: 80ch; display: grid; gap: 0.35rem; }
ul.notes { color: var(--muted); }
.glance { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 0.8rem; }
.tile { background: var(--surface); border: 1px solid var(--line); border-top: 5px solid var(--line); border-radius: 12px; padding: 0.8rem 1rem 0.9rem; display: grid; gap: 0.3rem; }
.tile.need { border-top-color: var(--rose); }
.tile.want { border-top-color: var(--violet); }
.tile.all { border-top-color: var(--sea); background: var(--raise); }
.tile .row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.8rem; font-variant-numeric: tabular-nums; }
.tile .row span { font-family: var(--font-data); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.tile .row b { font-size: 1.08rem; }
.tile .row.fam b { color: var(--pass); }
.tile .row.hire b { color: var(--sea); }
.glance-note { color: var(--muted); font-size: 0.92rem; }
.jobs { display: grid; gap: 0.7rem; }
.job { background: var(--surface); border: 1px solid var(--line); border-left: 6px solid var(--line); border-radius: 10px; padding: 0.8rem 1.05rem 0.9rem; display: grid; gap: 0.4rem; scroll-margin-top: 1rem; }
.job.need { border-left-color: var(--rose); }
.job.want { border-left-color: var(--violet); }
.job:target { outline: 3px solid var(--sea); outline-offset: 2px; }
.job-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 0.5rem 1rem; }
.prices { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.price { display: grid; border-radius: 8px; padding: 0.25rem 0.65rem; font-variant-numeric: tabular-nums; font-weight: 700; font-size: 0.95rem; min-width: 8.5rem; }
.price small { font-family: var(--font-data); font-size: 0.66rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.85; }
.price em { font-style: normal; font-weight: 400; font-size: 0.78rem; opacity: 0.85; }
.price.fam { background: var(--pass-soft); color: var(--pass); }
.price.hire { background: var(--sea-soft); color: var(--sea); }
.price.aside { background: var(--raise); color: var(--muted); border: 1px dashed var(--line); }
.when { font-family: var(--font-data); font-size: 0.84rem; color: var(--ink); }
.when .meta { color: var(--muted); }
.job .what { max-width: 90ch; }
.job .detail { color: var(--muted); font-size: 0.9rem; max-width: 90ch; }
.job .detail b { font-family: var(--font-data); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.05em; }
table.t-total, table.t-summary { font-variant-numeric: tabular-nums; }
table.t-total td:not(:first-child), table.t-summary td:not(:first-child) { white-space: nowrap; }
table.t-total td:nth-child(2), table.t-summary td:nth-child(2) { color: var(--pass); }
table.t-total td:nth-child(3), table.t-summary td:nth-child(3) { color: var(--sea); }
table.t-summary tr.group th { background: var(--bg); padding-top: 0.9rem; }
table.t-summary td small { display: block; color: var(--muted); font-size: 0.76rem; font-weight: 400; }
.section-note { color: var(--muted); font-size: 0.9rem; }
.tag.done-tag { display: none; background: var(--pass-soft); color: var(--pass); }
.job.done .tag.done-tag, tr.done .tag.done-tag { display: inline-block; }
.job.done .name, tr.done td:first-child a { text-decoration: line-through; text-decoration-thickness: 2px; }
.job.done { background: var(--bg); }
.job.done .what, .job.done .detail, .job.done .when, .job.done .prices { opacity: 0.55; }
tr.done td { color: var(--muted) !important; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding-top: 0.2rem; }
.done-label { display: inline-flex; align-items: center; gap: 0.4rem; font-family: var(--font-data); font-size: 0.82rem; cursor: pointer; }
input.done-box { width: 1.15rem; height: 1.15rem; accent-color: var(--pass); cursor: pointer; margin: 0; }
.list-done { display: inline-flex; vertical-align: -0.2em; margin-right: 0.5rem; }
button.switch { font: inherit; font-family: var(--font-data); font-size: 0.78rem; background: var(--raise); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 0.3rem 0.7rem; cursor: pointer; }
button.switch:hover { border-color: var(--sea); }
.who-bar { color: var(--muted); font-size: 0.9rem; }
button.linkish { font: inherit; background: none; border: 0; padding: 0; color: var(--sea); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.plan-note { position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%); width: min(92vw, 640px); background: var(--rose-soft); color: var(--ink); border: 1px solid var(--rose); border-radius: 10px; padding: 0.6rem 0.9rem; z-index: 5; max-width: none; }
details.changes { color: var(--muted); }
details.changes summary { cursor: pointer; color: var(--ink); }
details.changes ol { margin: 0.6rem 0 0; padding-left: 1.2rem; display: grid; gap: 0.25rem; font-size: 0.9rem; }
dialog { border: 0; padding: 0; background: var(--surface); color: var(--ink); border-radius: 12px; width: min(96vw, 1800px); max-height: 94vh; }
dialog::backdrop { background: rgba(3, 8, 14, 0.82); }
dialog .bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.6rem 0.9rem; border-bottom: 1px solid var(--line); font-family: var(--font-data); font-size: 0.85rem; }
dialog .bar button { font: inherit; background: var(--raise); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 0.35rem 0.8rem; cursor: pointer; }
dialog .pic { overflow: auto; max-height: calc(94vh - 3.2rem); background: #fff; }
dialog .pic img { display: block; width: 100%; height: auto; }
dialog .pic.zoom img { width: auto; max-width: none; }
@media (max-width: 860px) {
  .table-wrap.cards { border: 0; background: none; overflow: visible; }
  .cards table, .cards tbody, .cards tr, .cards td { display: block; width: 100%; }
  .cards thead { display: none; }
  .cards tbody tr { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; margin-bottom: 0.8rem; padding: 0.35rem 0; }
  .cards tbody tr:nth-child(even) td { background: none; }
  .cards td { display: grid; grid-template-columns: 5.8rem 1fr; gap: 0.6rem; border-bottom: 0; padding: 0.35rem 0.9rem; min-width: 0 !important; white-space: normal !important; }
  .cards td::before { content: attr(data-label); font-family: var(--font-data); font-size: 0.7rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); padding-top: 0.2rem; }
  .cards td:empty { display: none; }
  table.t-total, table.t-summary { font-size: 0.86rem; }
  table.t-total td, table.t-total th, table.t-summary td, table.t-summary th { padding: 0.5rem 0.5rem; }
  table.t-total td:not(:first-child), table.t-summary td:not(:first-child) { white-space: normal; }
  .price { min-width: 0; flex: 1 1 8rem; }
  .prices { width: 100%; }
  .plan-card img { height: 200px; }
}
"""

SCRIPT = """
(() => {
  const dlg = document.getElementById('pop');
  if (!dlg || !dlg.showModal) return;
  const img = dlg.querySelector('img'), title = dlg.querySelector('.title'), full = dlg.querySelector('.full'), pic = dlg.querySelector('.pic');
  document.querySelectorAll('a.shot').forEach(a => a.addEventListener('click', ev => {
    ev.preventDefault();
    img.src = a.href; img.alt = a.dataset.title; title.textContent = a.dataset.title; full.href = a.href;
    pic.classList.remove('zoom'); dlg.showModal();
  }));
  img.addEventListener('click', () => pic.classList.toggle('zoom'));
  dlg.querySelector('.close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
})();
"""

PLAN_SCRIPT = r"""
(() => {
  const cards = [...document.querySelectorAll('article.job[data-job]')];
  if (!cards.length) return;
  const API = '/house-plan/api/state';
  const NAME = 'house-search-name';
  const LABEL = { need: 'Needed', want: 'Wanted', fail: 'When it fails' };
  const note = document.getElementById('plan-note');
  const whoBar = document.getElementById('who-bar');
  const logEl = document.getElementById('plan-log');
  const rows = [...document.querySelectorAll('tr[data-job]')];
  const tbody = rows.length ? rows[0].parentElement : null;
  const totalRow = tbody ? tbody.querySelector('tr.total') : null;
  const groups = {};
  document.querySelectorAll('tr[data-group]').forEach(r => { groups[r.dataset.group] = r; });
  const byId = {}, base = {};
  cards.forEach(c => { byId[c.dataset.job] = c; base[c.dataset.job] = c.dataset.mark; });
  let state = {}, log = [], name = '', queue = Promise.resolve();
  try { name = localStorage.getItem(NAME) || ''; } catch (err) { /* asked on the first change */ }
  const pair = s => (s ? s.split(',').map(Number) : null);
  const money = v => '$' + v.toLocaleString('en-US');
  const span = (lo, hi) => (hi ? money(Math.floor(lo / 100) * 100) + ' to ' + money(Math.ceil(hi / 100) * 100) : '$0');
  const markOf = id => (state[id] && state[id].mark) || base[id];
  const doneOf = id => !!(state[id] && state[id].done);
  function cleanName(raw) {
    const n = String(raw || '').replace(/\s+/g, ' ').trim();
    try { return n.length <= 40 && new RegExp("^\\p{L}[\\p{L} '.-]*$", 'u').test(n) ? n : ''; }
    catch (err) { return n.length <= 40 && /^[A-Za-z][A-Za-z '.-]*$/.test(n) ? n : ''; }
  }
  function warn(msg) {
    if (!note) return;
    note.textContent = msg;
    note.hidden = !msg;
  }
  function render() {
    const zero = () => ({ need: [0, 0, 0, 0], want: [0, 0, 0, 0] });
    const sec = {}, all = zero();
    let done = 0, counted = 0;
    cards.forEach(c => {
      const id = c.dataset.job, m = markOf(id), d = doneOf(id);
      c.classList.remove('need', 'want');
      if (m !== 'fail') c.classList.add(m);
      const tag = c.querySelector('.tag.mark');
      if (tag) { tag.className = 'tag mark ' + m; tag.textContent = LABEL[m]; }
      c.classList.toggle('done', d);
      const box = c.querySelector('input.done-box');
      if (box) box.checked = d;
      const sw = c.querySelector('button.switch');
      if (sw) sw.textContent = m === 'need' ? 'Move to Wanted' : 'Move to Needed';
      if (m === 'fail') return;
      counted += 1;
      if (d) done += 1;
      const s = sec[c.dataset.sec] || (sec[c.dataset.sec] = zero());
      [[pair(c.dataset.fam), 0], [pair(c.dataset.hire), 2]].forEach(([fig, i]) => {
        if (!fig) return;
        s[m][i] += fig[0]; s[m][i + 1] += fig[1];
        all[m][i] += fig[0]; all[m][i + 1] += fig[1];
      });
    });
    const both = t => t.need.map((v, i) => v + t.want[i]);
    const show = (el, v, side) => { el.textContent = side === 'fam' ? span(v[0], v[1]) : span(v[2], v[3]); };
    document.querySelectorAll('table.t-total[data-sec]').forEach(table => {
      const s = sec[table.dataset.sec] || zero();
      const vals = { need: s.need, want: s.want, both: both(s) };
      table.querySelectorAll('[data-t]').forEach(td => { const [k, side] = td.dataset.t.split('-'); show(td, vals[k], side); });
    });
    document.querySelectorAll('[data-g]').forEach(el => {
      const [k, side] = el.dataset.g.split('-');
      show(el, k === 'all' ? both(all) : all[k], side);
    });
    if (tbody && totalRow) {
      const sorted = rows.slice().sort((a, b) => a.dataset.idx - b.dataset.idx);
      ['need', 'want'].forEach(g => {
        if (groups[g]) tbody.insertBefore(groups[g], totalRow);
        sorted.filter(r => markOf(r.dataset.job) === g).forEach(r => tbody.insertBefore(r, totalRow));
      });
      rows.forEach(r => {
        const d = doneOf(r.dataset.job);
        r.classList.toggle('done', d);
        const b = r.querySelector('input.done-box');
        if (b) b.checked = d;
      });
    }
    const prog = document.getElementById('plan-progress');
    if (prog) prog.textContent = done + ' of ' + counted + ' needed and wanted jobs done.';
  }
  function when(at) {
    try { return new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch (err) { return ''; }
  }
  function sentence(e) {
    const who = e.name || 'Someone';
    const what = byId[e.job] ? byId[e.job].dataset.name : e.job;
    const did = e.field === 'done'
      ? (e.to ? 'marked ' + what + ' done' : 'took the done mark off ' + what)
      : 'moved ' + what + ' to ' + (e.to === 'need' ? 'Needed' : 'Wanted');
    return who + ' ' + did + ', ' + when(e.at) + '.';
  }
  function showLog() {
    if (!logEl) return;
    logEl.textContent = '';
    (log.length ? log : [null]).forEach(e => {
      const li = document.createElement('li');
      li.textContent = e ? sentence(e) : 'Nothing has been changed yet.';
      logEl.appendChild(li);
    });
  }
  function showWho() {
    if (!whoBar) return;
    whoBar.textContent = 'Every job has a Done box and a switch between Needed and Wanted, and a change saves for everyone. '
      + (name ? 'Changing as ' + name + '. ' : 'The first change asks for your first name. ');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'linkish';
    b.textContent = name ? 'Not you? Change the name' : 'Set your name now';
    b.addEventListener('click', () => { askName(true); });
    whoBar.appendChild(b);
  }
  function askName(force) {
    if (name && !force) return name;
    const n = window.prompt('Your first name, so everyone can see who changed what. Type the same name on every phone or laptop you use.', name || '');
    if (n === null) return '';
    const clean = cleanName(n);
    if (!clean) { warn('A name is letters and spaces, up to 40 characters. Nothing was saved.'); return ''; }
    name = clean;
    try { localStorage.setItem(NAME, clean); } catch (err) { /* asked again next load */ }
    showWho();
    return clean;
  }
  function take(j) {
    if (j && j.jobs && typeof j.jobs === 'object') state = j.jobs;
    if (j && Array.isArray(j.log)) log = j.log;
    render();
    showLog();
  }
  function change(id, field, value) {
    const who = askName(false);
    if (!who) { render(); return; }
    const before = state[id] ? Object.assign({}, state[id]) : null;
    state[id] = Object.assign({}, state[id] || {}, { [field]: value });
    render();
    const body = JSON.stringify({ job: id, field, value, name: who, set: Date.now() });
    queue = queue.then(() => fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
      .then(r => r.json().catch(() => ({})).then(j => {
        if (!r.ok) throw new Error(j.error || 'The save was refused.');
        take(j);
        warn('');
      }))
      .catch(err => {
        if (before) state[id] = before; else delete state[id];
        render();
        warn('Not saved: ' + err.message + ' Try it again.');
      }));
  }
  cards.forEach(c => {
    const id = c.dataset.job;
    const box = c.querySelector('input.done-box');
    if (box) box.addEventListener('change', () => change(id, 'done', box.checked));
    const sw = c.querySelector('button.switch');
    if (sw) sw.addEventListener('click', () => change(id, 'mark', markOf(id) === 'need' ? 'want' : 'need'));
  });
  rows.forEach(r => {
    const box = r.querySelector('input.done-box');
    if (box) box.addEventListener('change', () => change(r.dataset.job, 'done', box.checked));
  });
  showWho();
  render();
  if (typeof fetch === 'function') {
    fetch(API, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('the saved changes did not load.'))))
      .then(j => {
        take(j);
        document.querySelectorAll('.controls, .list-done, #who-bar, #plan-progress, details.changes')
          .forEach(el => { el.hidden = false; });
      })
      .catch(() => { /* no shared state: the page stays the plan as written, with no controls */ });
  }
})();
"""

COLUMN_CLASS = [
    (r"^when$", "when"), (r"^date$", "date"), (r"^what$", "what"), (r"^who$", "who"),
    (r"^family", "family"), (r"^hired", "hired"), (r"^item$", "item"), (r"^fact$", "fact"),
    (r"^source$", "source"), (r"^project$", "project"), (r"^when and why$", "why"),
    (r"family$", "family"), (r"hired$", "hired"),
]


def text_of(fragment):
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def column_class(label):
    low = label.lower()
    for pattern, name in COLUMN_CLASS:
        if re.search(pattern, low):
            return "c-" + name
    return "c-other"


def label_table(match):
    table = match.group(0)
    heads = [text_of(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", table, re.S)]
    kind = "t-facts" if "Fact" in heads else "t-long"

    def label_row(row):
        cells = iter(range(len(heads)))

        def label_cell(cell):
            i = next(cells, None)
            if i is None:
                return cell.group(0)
            return f'<td class="{column_class(heads[i])}" data-label="{html.escape(heads[i], quote=True)}"'
        return re.sub(r"<td(?=[\s>])", label_cell, row.group(0))

    table = re.sub(r"<tr>.*?</tr>", label_row, table, flags=re.S)
    table = table.replace("<table>", f'<table class="{kind}">', 1)
    # An empty cell renders as nothing, so a phone card skips it.
    table = re.sub(r'(<td [^>]*>)\s*(</td>)', r"\1\2", table)
    return f'<div class="table-wrap cards">{table}</div>'


def stamped(rel, base=ROOT / "house-plan"):
    """A picture's path with a hash of its bytes on the end. The site serves pictures with a four-hour
    cache lifetime, so a redrawn layout under the same name stays stale in a browser that saw the old
    one; the hash changes the address whenever the picture changes."""
    data = (base / rel).read_bytes()
    return f"{rel}?v={hashlib.sha256(data).hexdigest()[:10]}"


def card(f):
    f = {k: (stamped(v) if k in ("thumb", "full") else v) for k, v in f.items()}
    title = html.escape(f["title"])
    if f.get("page"):
        return (f'<figure class="plan-card" style="margin:0"><a class="page-link" href="{f["page"]}">'
                f'<img src="{f["thumb"]}" alt="{title}" loading="lazy"></a>'
                f'<figcaption class="words"><b>{title}</b><small>{html.escape(f["text"])}</small>'
                f'<span class="links"><a href="{f["page"]}">Open the layout</a></span></figcaption></figure>')
    return (f'<figure class="plan-card" style="margin:0">'
            f'<a class="shot" href="{f["full"]}" data-title="{title}" target="_blank" rel="noopener">'
            f'<img src="{f["thumb"]}" alt="{title}" loading="lazy"></a>'
            f'<figcaption class="words"><b>{title}</b><small>{html.escape(f["text"])}</small>'
            f'<span class="links"><a href="{f["full"]}" target="_blank" rel="noopener">Full size in a new tab</a>'
            f'</span></figcaption></figure>')


def gallery():
    return ('<section class="plans" aria-labelledby="plans-h"><h2 id="plans-h">Floor plans</h2><div class="gallery">'
            + "".join(card(f) for f in PLAN_GALLERY) + "</div></section>")


FIGURES = {
    "layout": ("basement", "layout.svg", "The basement layout"),
    "main-floor": ("floors", "main.svg", "The main floor"),
    "upper-floor": ("floors", "upper.svg", "The upper floor"),
}


def layout_figure(marker, page_dir):
    """A drawing placed on a page, its address written relative to the page's own folder, so the floors page
    can show the basement drawing from the basement's folder."""
    folder, file, title = FIGURES[marker]
    name = stamped(file, ROOT / "house-plan" / folder)
    if (ROOT / "house-plan" / folder) != page_dir:
        name = f"../{folder}/{name}"
    return (f'<figure class="layout" style="margin:0">'
            f'<a class="shot" href="{name}" data-title="{title}" target="_blank" rel="noopener">'
            f'<img src="{name}" alt="{title}, drawn to a 1-foot grid"></a>'
            f'<figcaption><a href="{name}" target="_blank" rel="noopener">Full size in a new tab</a></figcaption></figure>')


MONEY = re.compile(r"\$([\d,]+(?:\.\d+)?)(?:\s+to\s+\$([\d,]+(?:\.\d+)?))?")
FAMILY = ("Nick", "Lexi", "Bill", "Gannan", "AJ", "Obo", "Dom", "Everyone")
SET_ASIDE = (("a year", "Every year"), ("if needed", "Only if needed"), ("credit", "Credits asked of the sellers"),
             ("closing costs", "Paid in the closing costs"))


def money(text):
    return float(text.replace(",", ""))


PER_UNIT = re.compile(r"\s*(each|a bay|a square foot|a step|a gallon|a door|per\b)")
CUSHION = 0.15


def figure(cell, strict=False):
    """The row's figure, read from a cost cell: the first dollar amount, which by the page's rule is the
    row's total, with everything after it detail. Returns (low, high, set_aside, clause) or None. A
    figure whose clause says a year, if needed, credit or closing costs is set aside: the totals leave
    it out and the list at the bottom names it."""
    for clause in re.split(r";|\.\s", cell):
        m = MONEY.search(clause)
        if m:
            if strict and PER_UNIT.match(clause[m.end():]):
                sys.exit(f"a cost cell opens on a price per unit, which the totals would read as the row's total: {clause.strip()}")
            low = money(m.group(1))
            high = money(m.group(2) or m.group(1))
            kind = next((name for word, name in SET_ASIDE if word in clause.lower()), None)
            return low, high, kind, clause.strip().rstrip(".")
    return None


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def tables(md):
    """Every markdown table in the text, as (first line, line after the last row, header, rows)."""
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        if lines[i].startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            j = i + 2
            while j < len(lines) and lines[j].startswith("|"):
                j += 1
            yield i, j, cells(lines[i]), [cells(r) for r in lines[i + 2:j]]
            i = j
        else:
            i += 1


def dollars(value, up):
    step = 100
    rounded = (math.ceil(value / step) if up else math.floor(value / step)) * step
    return f"${rounded:,.0f}"


def span(low, high):
    if not high:
        return "$0"
    return f"{dollars(low, False)} to {dollars(high, True)}"


MONTHS = {name: i for i, name in enumerate(("January", "February", "March", "April", "May", "June", "July",
                                             "August", "September", "October", "November", "December"), 1)}
DATE = re.compile(r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (" + "|".join(MONTHS) + r") (\d{1,2})")
OFFSET = re.compile(r"^(Contract day|Closing day|Move-in)\s*([+−-])\s*(\d+)(?:\s+to\s+(\d+))?\s+days?$")
ANCHOR_ROWS = {"Contract day": "Contract day", "Closing day": "Closing day", "Move-in day": "Move-in"}


def check_dates(md):
    """Every date in a table carries the right weekday, and every row timed as an offset (Contract day
    + 3 days, Move-in + 14 to 45 days) carries the dates that offset gives from its anchor row. The
    anchors are the rows whose When is Contract day, Closing day or Move-in day, so moving the closing
    moves the check with it. The year is the contract's, rolling over after December."""
    first = re.search(r"(" + "|".join(MONTHS) + r") (\d{1,2}), (20\d\d)", md)
    if not first:
        return
    year0, month0 = int(first.group(3)), MONTHS[first.group(1)]
    rows = []
    for _, _, head, body in tables(md):
        low = [h.lower() for h in head]
        if "when" in low and "date" in low:
            w, d = low.index("when"), low.index("date")
            rows += [(r[w], r[d]) for r in body if len(r) > max(w, d)]

    def dates_in(cell):
        found = []
        for weekday, month, day in DATE.findall(cell):
            year = year0 if MONTHS[month] >= month0 else year0 + 1
            found.append((weekday, datetime.date(year, MONTHS[month], int(day))))
        return found

    anchors, wrong = {}, []
    for when, date in rows:
        if when in ANCHOR_ROWS and dates_in(date):
            anchors[ANCHOR_ROWS[when]] = dates_in(date)[0][1]
    for when, date in rows:
        found = dates_in(date)
        for weekday, day in found:
            if day.strftime("%A") != weekday:
                wrong.append(f"{when}: {day:%B} {day.day} is a {day:%A}, not a {weekday}")
        m = OFFSET.match(when)
        if m and found and m.group(1) in anchors:
            sign = -1 if m.group(2) in "−-" else 1
            start = anchors[m.group(1)] + datetime.timedelta(days=sign * int(m.group(3)))
            if found[0][1] != start:
                wrong.append(f"{when}: starts {start:%A, %B} {start.day}, not {found[0][1]:%B} {found[0][1].day}")
            if m.group(4) and len(found) > 1:
                end = anchors[m.group(1)] + datetime.timedelta(days=int(m.group(4)))
                if found[-1][1] != end:
                    wrong.append(f"{when}: ends {end:%A, %B} {end.day}, not {found[-1][1]:%B} {found[-1][1].day}")
    if wrong:
        sys.exit("dates that do not match the calendar or their offsets:\n  " + "\n  ".join(wrong))


TAGS = {"Needed": "need", "Wanted": "want", "When it fails": "fail"}
TAG = re.compile(r"^\*\*(Needed|Wanted|When it fails)\.\*\*\s*")


def inline(text):
    """A table cell's markdown as inline HTML: links and bold survive, the paragraph wrapper does not."""
    out = markdown.markdown(text, output_format="html")
    return out[3:-4] if out.startswith("<p>") and out.endswith("</p>") else out


def split_cost(text):
    """A cost cell's head, the figure with the words that qualify it, and its detail, which starts at the
    first colon or semicolon after the figure."""
    text = text.strip()
    m = MONEY.match(text)
    if not m:
        return text, ""
    rest = text[m.end():]
    cut = min([i for i in (rest.find(":"), rest.find(";")) if i >= 0], default=-1)
    if cut < 0:
        return text, ""
    return (m.group(0) + rest[:cut]).strip(), rest[cut + 1:].strip()


def slug(name, taken):
    base = "job-" + (re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "row")
    out, n = base, 2
    while out in taken:
        out, n = f"{base}-{n}", n + 1
    taken.add(out)
    return out


def read_jobs(head, rows, heading, taken):
    """The rows of one job table, each with its mark, its two prices and the figures the totals count. A
    row with a price needs a mark, and a row done by someone outside the family carries no family price,
    so the family column always reads as what the family pays."""
    low = [h.lower() for h in head]
    col = {key: next((k for k, h in enumerate(low) if h.startswith(key)), None)
           for key in ("job", "when", "date", "what", "who", "family", "hired")}
    jobs = []
    for row in rows:
        row = row + [""] * (len(head) - len(row))
        get = lambda key: row[col[key]].strip() if col[key] is not None else ""
        m = TAG.match(get("job"))
        tag = TAGS[m.group(1)] if m else None
        name = get("job")[m.end():].strip() if m else get("job")
        fam_text, hire_text = get("family"), get("hired")
        fam, hire = figure(fam_text, True), figure(hire_text, True)
        if (fam or hire or fam_text or hire_text) and not tag:
            sys.exit(f"a cost row carries no Needed, Wanted or When it fails mark: {name}")
        family_does = any(n in get("who") for n in FAMILY)
        if fam and not fam[2] and not family_does:
            sys.exit(f"a row nobody in the family does carries a family price; put the detail in the text: {name}")
        aside = {}
        for cell in (fam_text, hire_text):
            for clause in re.split(r";|\.\s", cell):
                found = figure(clause)
                if found and found[2]:
                    aside.setdefault(found[3].lower(), (found[2], found[3]))
        counted_fam = fam if (fam and not fam[2]) else (hire if (hire and not hire[2]) else None)
        counted_hire = hire if (hire and not hire[2]) else (fam if (fam and not fam[2]) else None)
        jobs.append({
            "name": name, "tag": tag, "id": slug(name, taken), "section": heading,
            "when": get("when"), "date": get("date"), "what": get("what"), "who": get("who"),
            "fam_text": fam_text, "hire_text": hire_text,
            "fam": counted_fam, "hire": counted_hire, "aside": list(aside.values()),
            "free": fam_text.lower() == "free" or hire_text.lower() == "free",
        })
    return jobs


def sums(jobs, tag):
    t = [0.0] * 4
    for j in jobs:
        if j["tag"] != tag:
            continue
        for slot, pick in ((0, j["fam"]), (2, j["hire"])):
            if pick:
                t[slot] += pick[0]
                t[slot + 1] += pick[1]
    return t


def price_chip(cls, label, head, note=""):
    note = f" <em>{note}</em>" if note else ""
    return f'<span class="price {cls}"><small>{label}</small>{html.escape(head)}{note}</span>'


def chips(j):
    """The two prices at the head of a card. A figure the totals leave out (a yearly bill, a credit, a cost
    paid only if needed or inside the closing costs) gets its own muted chip, never a family or hired one."""
    out = []
    heads = {}
    for side in ("fam", "hire"):
        text = j[side + "_text"]
        found = figure(text) if text else None
        heads[side] = (split_cost(text)[0] if text else "", bool(found and found[2]))
    (fam_head, fam_aside), (hire_head, hire_aside) = heads["fam"], heads["hire"]
    if fam_head:
        out.append(price_chip("aside" if fam_aside else "fam", "Not in the totals" if fam_aside else "Family", fam_head))
    elif hire_head and not hire_aside:
        out.append(price_chip("fam", "Family", hire_head, "same either way"))
    if hire_head:
        out.append(price_chip("aside" if hire_aside else "hire", "Not in the totals" if hire_aside else "Hired", hire_head))
    elif fam_head and not MONEY.match(fam_head):
        out.append(price_chip("hire", "Hired", fam_head))
    return f'<div class="prices">{"".join(out)}</div>' if out else ""


def figures(pick):
    return f"{pick[0]:g},{pick[1]:g}" if pick else ""


def job_card(j, sec):
    tag = f'<span class="tag mark {j["tag"]}">{[k for k, v in TAGS.items() if v == j["tag"]][0]}</span>' if j["tag"] else ""
    meta = [html.escape(x) for x in (j["when"], j["who"]) if x and x != j["date"]]
    when = (f'<p class="when">{html.escape(j["date"]) if j["date"] else ""}'
            f'{" " if j["date"] and meta else ""}<span class="meta">{" · ".join(meta)}</span></p>')
    details = []
    for label, text in (("Family", j["fam_text"]), ("Hired", j["hire_text"])):
        detail = split_cost(text)[1] if text else ""
        if detail:
            details.append(f"<b>{label}:</b> {inline(detail)}")
    detail = f'<p class="detail">{"<br>".join(details)}</p>' if details else ""
    name = html.escape(j["name"])
    switch = ('<button type="button" class="switch">Move to Wanted</button>' if j["tag"] == "need" else
              '<button type="button" class="switch">Move to Needed</button>' if j["tag"] == "want" else "")
    controls = (f'<div class="controls" hidden><label class="done-label"><input type="checkbox" class="done-box" '
                f'aria-label="{name} is done"> Done</label>{switch}</div>')
    return (f'<article class="job {j["tag"] or ""}" id="{j["id"]}" data-job="{j["id"]}" data-mark="{j["tag"]}" '
            f'data-sec="{sec}" data-name="{html.escape(j["name"], quote=True)}" data-fam="{figures(j["fam"])}" '
            f'data-hire="{figures(j["hire"])}">'
            f'<div class="job-head"><h3>{tag}<span class="tag done-tag">Done</span><span class="name">{name}</span></h3>'
            f'{chips(j)}</div>{when}<p class="what">{inline(j["what"])}</p>{detail}{controls}</article>')


def total_table(caption, rows, sec):
    total = ' class="total"'
    body = "".join(f'<tr{total if bold else ""}><td>{label}</td><td data-t="{key}-fam">{fam}</td>'
                   f'<td data-t="{key}-hire">{hire}</td></tr>'
                   for key, label, fam, hire, bold in rows)
    return (f'<div class="table-wrap"><table class="t-total" data-sec="{sec}"><thead><tr><th>{caption}</th>'
            f'<th>Family does it</th><th>Hired out</th></tr></thead><tbody>{body}</tbody></table></div>')


def section_block(jobs, sec):
    need, want = sums(jobs, "need"), sums(jobs, "want")
    both = [a + b for a, b in zip(need, want)]
    table = total_table("Section total", [
        ("need", "Needed", span(need[0], need[1]), span(need[2], need[3]), False),
        ("want", "Wanted", span(want[0], want[1]), span(want[2], want[3]), False),
        ("both", "Needed and wanted", span(both[0], both[1]), span(both[2], both[3]), True),
    ], sec)
    fails = sum(1 for j in jobs if j["tag"] == "fail")
    note = (f'<p class="section-note">The {fails} jobs marked When it fails are left out of these totals.</p>'
            if fails else "")
    return f'<div class="jobs">{"".join(job_card(j, sec) for j in jobs)}</div>{table}{note}', need, want


WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six"}


def up(value):
    return dollars(value * (1 + CUSHION), True)


def glance(need, want, fails):
    both = [a + b for a, b in zip(need, want)]

    def tile(cls, label, t):
        return (f'<div class="tile {cls}"><span><span class="tag {cls}">{label}</span></span>'
                f'<div class="row fam"><span>Family does it</span><b data-g="{cls}-fam">{span(t[0], t[1])}</b></div>'
                f'<div class="row hire"><span>Hired out</span><b data-g="{cls}-hire">{span(t[2], t[3])}</b></div></div>')
    return (f'<section class="glance" aria-label="The budget at a glance">{tile("need", "Needed", need)}'
            f'{tile("want", "Wanted", want)}{tile("all", "Everything", both)}</section>'
            f'<p class="glance-note">With a {CUSHION * 100:.0f} percent cushion on the high end, plan on up to {up(both[1])} with the '
            f'family doing the work, or up to {up(both[3])} hired out. Insurance, closing costs, anything needed only '
            f'if a test calls for it, and the {WORDS.get(fails, fails)} replacements that wait for the old one to fail sit outside these '
            f'totals. <a href="#everything-on-one-list">Every job on one list</a> is at the bottom.</p>'
            f'<p class="glance-note" id="plan-progress" hidden></p>'
            f'<p class="who-bar" id="who-bar" hidden>Every job has a Done box and a switch between Needed and Wanted. '
            f'A change saves for everyone who opens the page.</p>'
            f'<p class="plan-note" id="plan-note" role="status" hidden></p>')


def summary(jobs, need, want):
    """The one list: every needed and wanted job with a counted price or none at all, short name first,
    each linked to its card, then one total, then what the totals leave out."""
    both = [a + b for a, b in zip(need, want)]
    rows = []
    for tag, label in (("need", "Needed"), ("want", "Wanted")):
        rows.append(f'<tr class="group" data-group="{tag}"><th colspan="3" scope="colgroup"><span class="tag {tag}">{label}</span></th></tr>')
        for j in jobs:
            if j["tag"] != tag or not (j["fam"] or j["free"]):
                continue
            fam_head = split_cost(j["fam_text"])[0] if j["fam_text"] else ""
            hire_head = split_cost(j["hire_text"])[0] if j["hire_text"] else ""
            if j["free"]:
                fam_cell = hire_cell = "Free"
            else:
                fam_cell = (html.escape(fam_head) if fam_head and not figure(fam_head)[2]
                            else f'{html.escape(hire_head)}<small>same either way</small>')
                hire_cell = html.escape(hire_head) if hire_head else html.escape(fam_head)
            rows.append(f'<tr data-job="{j["id"]}" data-idx="{jobs.index(j)}"><td><label class="list-done" hidden>'
                        f'<input type="checkbox" class="done-box" aria-label="{html.escape(j["name"], quote=True)} is done">'
                        f'</label><span class="tag done-tag">Done</span><a href="#{j["id"]}">{html.escape(j["name"])}</a></td>'
                        f'<td>{fam_cell}</td><td>{hire_cell}</td></tr>')
    rows.append(f'<tr class="total"><td>Total</td><td>{span(both[0], both[1])}</td><td>{span(both[2], both[3])}</td></tr>')
    table = ('<div class="table-wrap"><table class="t-summary"><thead><tr><th>Job</th><th>Family does it</th>'
             f'<th>Hired out</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>')

    aside = {}
    for j in jobs:
        if j["tag"] == "fail":
            continue
        for kind, clause in j["aside"]:
            head, detail = split_cost(clause)
            words = f"{head} ({detail})" if detail else head
            aside.setdefault(kind, []).append(f'<a href="#{j["id"]}">{html.escape(j["name"])}</a>: {html.escape(words)}')
    notes = [f"<li><b>{name}:</b> {'; '.join(aside[name])}.</li>" for _, name in SET_ASIDE if name in aside]
    reserve = []
    for j in jobs:
        if j["tag"] == "fail":
            head = split_cost(j["hire_text"] or j["fam_text"])[0]
            reserve.append(f'<a href="#{j["id"]}">{html.escape(j["name"])}</a> {html.escape(head)} hired')
    if reserve:
        notes.append(f"<li><b>When it fails, not budgeted:</b> {'; '.join(reserve)}.</li>")
    return (f'<p>Every job with a price, in the order it happens. A name opens its full listing above. The family '
            f'column is what the family pays doing the work it can, with the contractor\'s price where a contractor '
            f'does the job either way.</p>{table}'
            f'<p>With a {CUSHION * 100:.0f} percent cushion on the high end, plan on up to {up(both[1])} with the family doing '
            f'the work, or up to {up(both[3])} hired out.</p>'
            f'<h3>Not in the total</h3><ul class="notes">{"".join(notes)}</ul>'
            f'<details class="changes" hidden><summary>Recent changes: who ticked, unticked or moved what</summary>'
            f'<ol id="plan-log"><li>Nothing has been changed yet.</li></ol></details>')


def plan_blocks(md):
    """Swap every job table for a marker and build its cards, its section totals, the budget at a glance
    and the one list at the bottom. Returns the markdown with markers and the HTML for each marker."""
    lines = md.split("\n")
    blocks, jobs_all, taken = {}, [], set()
    need, want = [0.0] * 4, [0.0] * 4
    found = list(tables(md))
    headings = {}
    heading = ""
    for n, line in enumerate(lines):
        if line.startswith("## "):
            heading = line[3:].strip()
        headings[n] = heading
    for k, (start, end, head, rows) in reversed(list(enumerate(found))):
        low = [h.lower() for h in head]
        if not ("job" in low and any(h.startswith("family") for h in low) and any(h.startswith("hired") for h in low)):
            continue
        jobs = read_jobs(head, rows, headings[start], taken)
        block, s_need, s_want = section_block(jobs, k)
        blocks[f"jobs-{k}"] = block
        jobs_all[:0] = jobs
        need = [a + b for a, b in zip(need, s_need)]
        want = [a + b for a, b in zip(want, s_want)]
        lines[start:end] = [f"{{{{jobs-{k}}}}}"]
    if jobs_all:
        blocks["headline"] = glance(need, want, sum(1 for j in jobs_all if j["tag"] == "fail"))
        blocks["summary"] = summary(jobs_all, need, want)
    return "\n".join(lines), blocks


def build(page):
    text = page["src"].read_text(encoding="utf-8")
    first = text.splitlines()[0]
    if not first.startswith("# "):
        sys.exit(f"{page['src'].name} must open on its title heading")
    title = first[2:].strip()
    body_md = text.split("\n", 1)[1]
    check_dates(body_md)
    body_md, blocks = plan_blocks(body_md)
    body = markdown.markdown(body_md, extensions=["tables", "toc"], output_format="html")
    body = re.sub(r"<table>.*?</table>", label_table, body, flags=re.S)
    for word, kind in TAGS.items():
        body = body.replace(f"<strong>{word}.</strong>", f'<span class="tag {kind}">{word}</span>')
    if "{{floor-plans}}" in text:
        body = body.replace("<p>{{floor-plans}}</p>", gallery())
    for marker in FIGURES:
        if "{{" + marker + "}}" in text:
            body = body.replace("<p>{{" + marker + "}}</p>", layout_figure(marker, page["out"].parent))
    for marker, block in blocks.items():
        body = body.replace("<p>{{" + marker + "}}</p>", block)
    if "{{" in body:
        sys.exit(f"{page['src'].name} holds a marker the builder does not know")
    if page["status_first"]:
        body = body.replace("<p>", '<p class="status">', 1)
    crumbs = " · ".join(f'<a href="{href}">{html.escape(label)}</a>' for href, label in page["crumbs"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="{html.escape(page['description'])}">
<title>{html.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@500;700&display=swap">
<style>{STYLE}</style>
</head>
<body>
<main class="wrap">
<header>
<p class="crumb">{crumbs}</p>
<p class="eyebrow">{html.escape(page['eyebrow'])}</p>
<h1>{html.escape(title)}</h1>
</header>
{body}
</main>
<dialog id="pop" aria-label="Floor plan">
<div class="bar"><span class="title"></span><span><a class="full" href="#" target="_blank" rel="noopener">Full size</a> <button class="close" type="button">Close</button></span></div>
<div class="pic"><img alt=""></div>
</dialog>
<script>{SCRIPT}{PLAN_SCRIPT if "{{summary}}" in text else ""}</script>
</body>
</html>
"""


def main():
    stale = 0
    for page in PAGES:
        html_text = build(page)
        out = page["out"]
        rel = out.relative_to(ROOT).as_posix()
        if "--check" in sys.argv:
            current = out.read_text(encoding="utf-8") if out.exists() else ""
            if current != html_text:
                print(f"{rel} is stale; run python scripts/build-house-plan.py")
                stale += 1
            else:
                print(f"{rel} matches its source")
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html_text, encoding="utf-8", newline="\n")
        print(f"wrote {rel} ({len(html_text):,} bytes)")
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
