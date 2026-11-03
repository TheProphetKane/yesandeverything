"""Build the house plan pages for 45 Autumn Crest Ct.

    python scripts/build-house-plan.py          writes house-plan/index.html and house-plan/basement/index.html
    python scripts/build-house-plan.py --check  exits 1 when either page on disk differs from a fresh build

Each page's source is a markdown file in docs/ that the prose gate measures: docs/HOUSE-PLAN-45-AUTUMN-CREST.md
for the plan, docs/HOUSE-PLAN-BASEMENT-LAYOUTS.md for the basement layout. Edit the source, build, ship;
never edit a page by hand. Tables become cards on a phone, each cell labeled with its column. A line holding
{{floor-plans}} becomes the plan's picture gallery; a line holding {{layout}} becomes the basement
layout's drawing, which scripts/draw-basement-layouts.py writes. Pictures open in a pop-out over the page,
or full size in a new tab without scripts.
"""

import html
import re
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
REPORT = "/house-search/45-autumn-crest-ct/"

PLAN_GALLERY = [
    {
        "thumb": "floors-grid-small.jpg",
        "full": "floors-grid.png",
        "title": "All three floors on a 1-foot grid",
        "text": "The main and upper floors are the builder's Rockport drawing, fitted to the county's measured "
                "outline. The basement panel shows the stair, the landing and the rough-in.",
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
        "crumbs": [("/house-plan/", "The house plan"), (REPORT, "The house report")],
        "description": "The basement layout for 45 Autumn Crest Ct: a D&D studio, an office, a play area, bins and a putting lane.",
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
        return re.sub(r"<td(?=[\s>])", label_cell, row.group(0))

    table = re.sub(r"<tr>.*?</tr>", label_row, table, flags=re.S)
    table = table.replace("<table>", f'<table class="{kind}">', 1)
    # An empty cell renders as nothing, so a phone card skips it.
    table = re.sub(r'(<td [^>]*>)\s*(</td>)', r"\1\2", table)
    return f'<div class="table-wrap">{table}</div>'


def card(f):
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


def layout_figure():
    name = "layout.svg"
    title = "The basement layout"
    return (f'<figure class="layout" style="margin:0">'
            f'<a class="shot" href="{name}" data-title="{title}" target="_blank" rel="noopener">'
            f'<img src="{name}" alt="{title}, drawn to a 1-foot grid"></a>'
            f'<figcaption><a href="{name}" target="_blank" rel="noopener">Full size in a new tab</a></figcaption></figure>')


def build(page):
    text = page["src"].read_text(encoding="utf-8")
    first = text.splitlines()[0]
    if not first.startswith("# "):
        sys.exit(f"{page['src'].name} must open on its title heading")
    title = first[2:].strip()
    body_md = text.split("\n", 1)[1]
    body = markdown.markdown(body_md, extensions=["tables"], output_format="html")
    body = re.sub(r"<table>.*?</table>", label_table, body, flags=re.S)
    if "{{floor-plans}}" in text:
        body = body.replace("<p>{{floor-plans}}</p>", gallery())
    body = body.replace("<p>{{layout}}</p>", layout_figure())
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
