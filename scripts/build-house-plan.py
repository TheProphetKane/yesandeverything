"""Build the house plan pages for 45 Autumn Crest Ct.

    python scripts/build-house-plan.py          writes house-plan/index.html, house-plan/basement/index.html
                                                and house-plan/floors/index.html
    python scripts/build-house-plan.py --check  exits 1 when any page on disk differs from a fresh build

Each page's source is a markdown file in docs/ that the prose gate measures: docs/HOUSE-PLAN-45-AUTUMN-CREST.md
for the plan, docs/HOUSE-PLAN-BASEMENT-LAYOUTS.md for the basement layout, docs/HOUSE-PLAN-FLOORS.md for the
main and upper floors. Edit the source, build, ship;
never edit a page by hand. Tables become cards on a phone, each cell labeled with its column. A line holding
{{floor-plans}} becomes the plan's picture gallery; a line holding {{layout}} becomes the basement
layout's drawing, which scripts/draw-basement-layouts.py writes, and {{main-floor}} and {{upper-floor}}
become the floor drawings scripts/draw-house-floors.py writes. Every table with a family column and a
hired column gets a section total row, and a line holding {{totals}} becomes the conclusion: the rule is
that the first dollar figure in a cost cell is that row's total, and everything after it is detail. Pictures open in a pop-out over the page,
or full size in a new tab without scripts.
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
        "text": "The king bed facing the television, the infant's crib, the toddler's bed and the guest room, "
                "with the loft floored to the front wall.",
    },
    {
        "thumb": "basement/layout.svg",
        "page": "basement/",
        "title": "The basement layout",
        "text": "Nick's layout to the foot: the D&D studio, the office, the kids' play area, the bins, a bigger "
                "bath and a 29-foot putting lane, drawn around the stair and the furnace.",
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
        "crumbs": [("/house-plan/", "The house plan"), ("/house-plan/floors/", "The main and upper floors")],
        "description": "The basement layout for 45 Autumn Crest Ct: a D&D studio, an office, a play area, bins and a putting lane.",
        "status_first": False,
    },
    {
        "src": ROOT / "docs" / "HOUSE-PLAN-FLOORS.md",
        "out": ROOT / "house-plan" / "floors" / "index.html",
        "eyebrow": "Main and upper floors, 1 square to the foot",
        "crumbs": [("/house-plan/", "The house plan"), ("/house-plan/basement/", "The basement layout")],
        "description": "The main and upper floors of 45 Autumn Crest Ct, every room colored by its use.",
        "status_first": False,
    },
]

STYLE = """
:root {
  color-scheme: dark;
  --bg: #0b1622; --surface: #122233; --raise: #182c42; --ink: #e8f0f8; --muted: #9fb3c8;
  --line: #24405a; --sea: #4cc3e0; --sea-soft: #12384a; --rose: #ff6f9c;
  --pass: #6fd68f; --pass-soft: #163a24; --violet: #b49cff; --violet-soft: #2a2347;
  --font-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --font-body: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;
  --font-data: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 1rem; line-height: 1.55; }
.wrap { max-width: 1560px; margin: 0 auto; padding: 1.75rem max(16px, 2.5vw) 4rem; display: grid; gap: 1.6rem; }
h1, h2 { font-family: var(--font-display); margin: 0; line-height: 1.15; text-wrap: balance; }
h1 { font-size: clamp(1.9rem, 5vw, 2.9rem); font-weight: 800; }
h2 { font-size: 1.4rem; font-weight: 800; margin-top: 0.8rem; padding-bottom: 0.35rem; border-bottom: 2px solid var(--line); }
p { margin: 0; max-width: 88ch; }
a { color: var(--sea); text-underline-offset: 3px; }
a:focus-visible, button:focus-visible { outline: 3px solid var(--rose); outline-offset: 2px; border-radius: 6px; }
header { display: grid; gap: 0.55rem; }
.crumb, .eyebrow { font-family: var(--font-data); font-size: 0.82rem; }
.eyebrow { letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.status { background: var(--pass-soft); border-left: 6px solid var(--pass); border-radius: 0 12px 12px 0; padding: 0.8rem 1.1rem; max-width: none; }
.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 1rem; }
.plan-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: grid; }
.plan-card a.shot { display: block; background: #fff; line-height: 0; cursor: zoom-in; }
.plan-card img { width: 100%; height: 240px; object-fit: contain; background: #fff; }
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
td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
tr.total td { background: var(--raise) !important; border-top: 2px solid var(--sea); font-weight: 700; }
.tag { display: inline-block; font-family: var(--font-data); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border-radius: 999px; padding: 0.05rem 0.55rem; margin-right: 0.4rem; vertical-align: 0.1em; }
.tag.need { background: var(--pass-soft); color: var(--pass); }
.tag.want { background: var(--violet-soft); color: var(--violet); }
.tag.fail { background: var(--raise); color: var(--muted); border: 1px solid var(--line); }
tbody tr:nth-child(even) td { background: rgba(255, 255, 255, 0.025); }
td.c-when, td.c-date, td.c-item, td.c-project { font-weight: 700; }
td.c-when, td.c-date { white-space: nowrap; }
td.c-date { color: var(--sea); font-family: var(--font-data); font-size: 0.86rem; white-space: normal; min-width: 9rem; }
td.c-family, td.c-hired { font-variant-numeric: tabular-nums; min-width: 11rem; }
td.c-family { color: var(--pass); }
td.c-hired { color: var(--violet); }
td.c-source { color: var(--muted); font-size: 0.88rem; min-width: 12rem; }
table.t-plan td.c-what { min-width: 26rem; }
table.t-facts td.c-fact { min-width: 30rem; }
ul { margin: 0; padding-left: 1.2rem; max-width: 88ch; color: var(--muted); }
dialog { border: 0; padding: 0; background: var(--surface); color: var(--ink); border-radius: 12px; width: min(96vw, 1800px); max-height: 94vh; }
dialog::backdrop { background: rgba(3, 8, 14, 0.82); }
dialog .bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.6rem 0.9rem; border-bottom: 1px solid var(--line); font-family: var(--font-data); font-size: 0.85rem; }
dialog .bar button { font: inherit; background: var(--raise); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 0.35rem 0.8rem; cursor: pointer; }
dialog .pic { overflow: auto; max-height: calc(94vh - 3.2rem); background: #fff; }
dialog .pic img { display: block; width: 100%; height: auto; }
dialog .pic.zoom img { width: auto; max-width: none; }
@media (max-width: 860px) {
  .table-wrap { border: 0; background: none; overflow: visible; }
  table, tbody, tr, td { display: block; width: 100%; }
  thead { display: none; }
  tbody tr { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; margin-bottom: 0.8rem; padding: 0.35rem 0; }
  tbody tr:nth-child(even) td { background: none; }
  td { display: grid; grid-template-columns: 5.8rem 1fr; gap: 0.6rem; border-bottom: 0; padding: 0.35rem 0.9rem; min-width: 0 !important; white-space: normal !important; }
  td::before { content: attr(data-label); font-family: var(--font-data); font-size: 0.7rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); padding-top: 0.2rem; }
  td:empty { display: none; }
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
    kind = "t-plan" if any(h.lower() == "date" for h in heads) else ("t-facts" if "Fact" in heads else "t-long")

    def label_row(row):
        cells = iter(range(len(heads)))

        def label_cell(cell):
            i = next(cells, None)
            if i is None:
                return cell.group(0)
            return f'<td class="{column_class(heads[i])}" data-label="{html.escape(heads[i], quote=True)}"'
        row_html = re.sub(r"<td(?=[\s>])", label_cell, row.group(0))
        first = re.search(r"<td[^>]*>(.*?)</td>", row_html, re.S)
        if first and first.group(1).startswith("<strong>"):
            row_html = row_html.replace("<tr>", '<tr class="total">', 1)
        return row_html

    table = re.sub(r"<tr>.*?</tr>", label_row, table, flags=re.S)
    table = table.replace("<table>", f'<table class="{kind}">', 1)
    # An empty cell renders as nothing, so a phone card skips it.
    table = re.sub(r'(<td [^>]*>)\s*(</td>)', r"\1\2", table)
    return f'<div class="table-wrap">{table}</div>'


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


def layout_figure(marker):
    """A drawing for the page that sits in the drawing's own folder, so its address is relative to the page."""
    folder, file, title = FIGURES[marker]
    name = stamped(file, ROOT / "house-plan" / folder)
    return (f'<figure class="layout" style="margin:0">'
            f'<a class="shot" href="{name}" data-title="{title}" target="_blank" rel="noopener">'
            f'<img src="{name}" alt="{title}, drawn to a 1-foot grid"></a>'
            f'<figcaption><a href="{name}" target="_blank" rel="noopener">Full size in a new tab</a></figcaption></figure>')


MONEY = re.compile(r"\$([\d,]+(?:\.\d+)?)(?:\s+to\s+\$([\d,]+(?:\.\d+)?))?")
FAMILY = ("Nick", "Lexi", "Dad", "Grandma", "Everyone", "brother")
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
    it out and the conclusion lists it."""
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


def dollars(value, up):
    step = 100
    rounded = (math.ceil(value / step) if up else math.floor(value / step)) * step
    return f"${rounded:,.0f}"


def span(low, high):
    if not high:
        return "None"
    return f"{dollars(low, False)} to {dollars(high, True)}"


MONTHS = {name: i for i, name in enumerate(("January", "February", "March", "April", "May", "June", "July",
                                             "August", "September", "October", "November", "December"), 1)}
DATE = re.compile(r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (" + "|".join(MONTHS) + r") (\d{1,2})")
OFFSET = re.compile(r"^(Contract day|Closing day|Move-in)\s*([+−-])\s*(\d+)(?:\s+to\s+(\d+))?\s+days?$")
ANCHOR_ROWS = {"Contract day": "Contract day", "Closing day": "Closing day", "Move-in day": "Move-in"}


def check_dates(md):
    """Every date in a table carries the right weekday, and every row timed as an offset (Contract day
    + 3 days, Move-in + 14 to 45 days) carries the dates that offset gives from its anchor row. The
    anchors are the rows named Contract day, Closing day and Move-in day, so moving the closing moves
    the check with it. The year is the contract's, rolling over after December."""
    first = re.search(r"(" + "|".join(MONTHS) + r") (\d{1,2}), (20\d\d)", md)
    if not first:
        return
    year0, month0 = int(first.group(3)), MONTHS[first.group(1)]
    rows = [[c.strip() for c in line.strip().strip("|").split("|")] for line in md.split("\n") if line.startswith("| ")]

    def dates_in(cell):
        found = []
        for weekday, month, day in DATE.findall(cell):
            year = year0 if MONTHS[month] >= month0 else year0 + 1
            found.append((weekday, datetime.date(year, MONTHS[month], int(day))))
        return found

    anchors, wrong = {}, []
    for row in rows:
        if len(row) > 1 and row[0] in ANCHOR_ROWS and dates_in(row[1]):
            anchors[ANCHOR_ROWS[row[0]]] = dates_in(row[1])[0][1]
    for row in rows:
        if len(row) < 2:
            continue
        found = dates_in(row[1])
        for weekday, day in found:
            if day.strftime("%A") != weekday:
                wrong.append(f"{row[0]}: {day:%B} {day.day} is a {day:%A}, not a {weekday}")
        m = OFFSET.match(row[0])
        if m and found and m.group(1) in anchors:
            sign = -1 if m.group(2) in "−-" else 1
            start = anchors[m.group(1)] + datetime.timedelta(days=sign * int(m.group(3)))
            if found[0][1] != start:
                wrong.append(f"{row[0]}: starts {start:%A, %B} {start.day}, not {found[0][1]:%B} {found[0][1].day}")
            if m.group(4) and len(found) > 1:
                end = anchors[m.group(1)] + datetime.timedelta(days=int(m.group(4)))
                if found[-1][1] != end:
                    wrong.append(f"{row[0]}: ends {end:%A, %B} {end.day}, not {found[-1][1]:%B} {found[-1][1].day}")
    if wrong:
        sys.exit("dates that do not match the calendar or their offsets:\n  " + "\n  ".join(wrong))


TAGS = {"Needed": "need", "Wanted": "want", "When it fails": "fail"}
TAG = re.compile(r"^\*\*(Needed|Wanted|When it fails)\.\*\*")


def add_totals(md):
    """Give every table with a family column and a hired column its section totals, needed and wanted
    apart, and fill the {{totals}} and {{headline}} markers. Each cost row carries a mark at the head of
    one cell: Needed, Wanted or When it fails. When-it-fails rows stay out of every total and are listed
    as a reserve. The family figure takes the family's price for each job the family does and the hired
    price for the rest; the hired figure hires every job."""
    lines = md.split("\n")
    out, sections, aside, reserve = [], [], {}, []
    heading = ""
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("## "):
            heading = line[3:].strip()
        if not (line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip())):
            out.append(line)
            i += 1
            continue
        head = cells(line)
        j = i + 2
        while j < len(lines) and lines[j].startswith("|"):
            j += 1
        rows = [cells(r) for r in lines[i + 2:j]]
        out.extend(lines[i:j])
        fam_col = next((k for k, h in enumerate(head) if h.lower().startswith("family")), None)
        hired_col = next((k for k, h in enumerate(head) if h.lower().startswith("hired")), None)
        if fam_col is None or hired_col is None:
            i = j
            continue
        who_col = next((k for k, h in enumerate(head) if h.lower() == "who"), None)
        totals = {"need": [0.0] * 4, "want": [0.0] * 4}
        for row in rows:
            fam, hired = figure(row[fam_col], True), figure(row[hired_col], True)
            tag = next((TAGS[m.group(1)] for c in row if (m := TAG.match(c))), None)
            if (fam or hired) and not tag:
                sys.exit(f"a cost row carries no Needed, Wanted or When it fails mark: {row[0]}")
            if tag == "fail":
                pick = hired or fam
                if pick:
                    reserve.append(f"{row[0]}: {span(pick[0], pick[1])} hired")
                continue
            for cell in (row[fam_col], row[hired_col]):
                for clause in re.split(r";|\.\s", cell):
                    found = figure(clause)
                    if found and found[2]:
                        aside.setdefault(found[2], {}).setdefault(found[3].lower(), found[3])
            family_does = who_col is None or any(name in row[who_col] for name in FAMILY)
            bucket = totals[tag or "need"]
            for slot, pick in ((0, fam if (fam and family_does) else hired), (2, hired or fam)):
                if pick and not pick[2]:
                    bucket[slot] += pick[0]
                    bucket[slot + 1] += pick[1]

        def total_row(label, t):
            row = [""] * len(head)
            row[0] = f"**{label}**"
            row[fam_col] = f"**{span(t[0], t[1])}**"
            row[hired_col] = f"**{span(t[2], t[3])}**"
            return "| " + " | ".join(row) + " |"

        out.append(total_row("Section total, needed", totals["need"]))
        if any(totals["want"]):
            out.append(total_row("Section total, wanted", totals["want"]))
        sections.append((heading, totals))
        i = j
    md = "\n".join(out)

    def total_of(picked, kind):
        return [sum(t[kind][k] for _, t in picked) for k in range(4)]

    def up(value):
        return dollars(value * (1 + CUSHION), True)

    near = [s for s in sections if not s[0].lower().startswith("long term")]
    later = [s for s in sections if s[0].lower().startswith("long term")]
    need, want_now, want_later = total_of(sections, "need"), total_of(near, "want"), total_of(later, "want")

    table = ["| Section | Needed, family | Needed, hired | Wanted, family | Wanted, hired |", "|---|---|---|---|---|"]
    for name, t in sections:
        table.append(f"| {name} | {span(t['need'][0], t['need'][1])} | {span(t['need'][2], t['need'][3])} | "
                     f"{span(t['want'][0], t['want'][1])} | {span(t['want'][2], t['want'][3])} |")
    table.append(f"| **All sections** | **{span(need[0], need[1])}** | **{span(need[2], need[3])}** | "
                 f"**{span(want_now[0] + want_later[0], want_now[1] + want_later[1])}** | "
                 f"**{span(want_now[2] + want_later[2], want_now[3] + want_later[3])}** |")
    table += ["", f"With a {CUSHION:.0%} cushion on each high end, the figures to plan on:", "",
              "| Budget | Family does what it can | Hired out, all of it |", "|---|---|---|",
              f"| Needed work | up to {up(need[1])} | up to {up(need[3])} |",
              f"| Needed work and this year's wants | up to {up(need[1] + want_now[1])} | up to {up(need[3] + want_now[3])} |"]
    notes = []
    for _, name in SET_ASIDE:
        if name in aside:
            items = "; ".join(v[0].upper() + v[1:] for v in aside[name].values())
            notes.append(f"- {name}: {items}.")
    block = "\n".join(table)
    if reserve:
        block += "\n\nNot budgeted, because each waits for the old one to fail: " + "; ".join(reserve) + "."
    block += "\n\nLeft out of every total above:\n\n" + "\n".join(notes)
    md = md.replace("{{totals}}", block)
    headline = (f"**Needed work:** {span(need[0], need[1])} with the family doing the work it can, or "
                f"{span(need[2], need[3])} hired out, and up to {up(need[1])} with a {CUSHION:.0%} cushion. "
                f"**This year's wants on top**, mostly the basement: {span(want_now[0], want_now[1])} for the family, "
                f"{span(want_now[2], want_now[3])} hired. The windows, the furnace, the water heater and the roof "
                f"are not budgeted; each comes when the old one fails.")
    return md.replace("{{headline}}", headline)


def build(page):
    text = page["src"].read_text(encoding="utf-8")
    first = text.splitlines()[0]
    if not first.startswith("# "):
        sys.exit(f"{page['src'].name} must open on its title heading")
    title = first[2:].strip()
    body_md = text.split("\n", 1)[1]
    check_dates(body_md)
    body_md = add_totals(body_md)
    body = markdown.markdown(body_md, extensions=["tables", "toc"], output_format="html")
    body = re.sub(r"<table>.*?</table>", label_table, body, flags=re.S)
    for word, kind in TAGS.items():
        body = body.replace(f"<strong>{word}.</strong>", f'<span class="tag {kind}">{word}</span>')
    if "{{floor-plans}}" in text:
        body = body.replace("<p>{{floor-plans}}</p>", gallery())
    for marker in FIGURES:
        if "{{" + marker + "}}" in text:
            body = body.replace("<p>{{" + marker + "}}</p>", layout_figure(marker))
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
<script>{SCRIPT}</script>
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
