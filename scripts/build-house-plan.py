"""Build the house plan page for 45 Autumn Crest Ct.

    python scripts/build-house-plan.py          writes house-plan/index.html
    python scripts/build-house-plan.py --check  exits 1 when the page on disk differs from a fresh build

The source is docs/HOUSE-PLAN-45-AUTUMN-CREST.md, which the prose gate measures. Edit it, build,
ship; never edit the page by hand. Its tables become cards on a phone, each cell labeled with its
column, and a line holding {{floor-plans}} becomes the floor plan gallery, whose pictures open in a
pop-out over the page (or full size in a new tab without scripts). The pictures sit beside the page
in house-plan/ and are committed as they are.
"""

import html
import re
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "HOUSE-PLAN-45-AUTUMN-CREST.md"
OUT = ROOT / "house-plan" / "index.html"
REPORT = "/house-search/45-autumn-crest-ct/"
INKARNATE = "https://inkarnate.com/maps/edit/21881456"

FIGURES = [
    {
        "thumb": "floors-grid-small.jpg",
        "full": "floors-grid.png",
        "title": "All three floors on a 1-foot grid",
        "text": "The main and upper floors are the builder's Rockport drawing, fitted to the county's measured "
                "outline. The basement shows the stair, the landing and the rough-in from the walk-through.",
    },
    {
        "thumb": "basement-inkarnate-small.jpg",
        "full": "basement-inkarnate.jpg",
        "title": "The basement, one square to the foot",
        "text": "Walls, doors, 8-by-2 shelving bays and 27-gallon bins sit on the pad at the right, at true size, "
                "ready to copy into the room.",
        "link": (INKARNATE, "Open it in Inkarnate (Kane's account)"),
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


def gallery():
    out = ['<section class="plans" aria-labelledby="plans-h"><h2 id="plans-h">Floor plans</h2><div class="gallery">']
    for f in FIGURES:
        title = html.escape(f["title"])
        links = [f'<a href="{f["full"]}" target="_blank" rel="noopener">Full size in a new tab</a>']
        if f.get("link"):
            links.append(f'<a href="{f["link"][0]}" target="_blank" rel="noopener">{html.escape(f["link"][1])}</a>')
        out.append(
            f'<figure class="plan-card" style="margin:0">'
            f'<a class="shot" href="{f["full"]}" data-title="{title}" target="_blank" rel="noopener">'
            f'<img src="{f["thumb"]}" alt="{title}" loading="lazy"></a>'
            f'<figcaption class="words"><b>{title}</b><small>{html.escape(f["text"])}</small>'
            f'<span class="links">{" ".join(links)}</span></figcaption></figure>')
    out.append("</div></section>")
    return "".join(out)


def build():
    text = SRC.read_text(encoding="utf-8")
    first = text.splitlines()[0]
    if not first.startswith("# "):
        sys.exit("the plan source must open on its title heading")
    title = first[2:].strip()
    body_md = text.split("\n", 1)[1]
    body = markdown.markdown(body_md, extensions=["tables"], output_format="html")
    body = re.sub(r"<table>.*?</table>", label_table, body, flags=re.S)
    if "<p>{{floor-plans}}</p>" not in body:
        sys.exit("the plan source lost its {{floor-plans}} line")
    body = body.replace("<p>{{floor-plans}}</p>", gallery())
    # the opening paragraph is the status line
    body = body.replace("<p>", '<p class="status">', 1)
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="The family's plan for 45 Autumn Crest Ct, Wentzville, from the inspection to the basement.">
<title>{html.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@500;700&display=swap">
<style>{STYLE}</style>
</head>
<body>
<main class="wrap">
<header>
<p class="crumb"><a href="{REPORT}">The house report</a> · <a href="/house-search/">The house search</a></p>
<p class="eyebrow">House plan, if the purchase goes through</p>
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
    return page


def main():
    page = build()
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != page:
            print("house-plan/index.html is stale; run python scripts/build-house-plan.py")
            return 1
        print("house-plan/index.html matches its source")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page, encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(page):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
