"""Build the house search pages from data/house-search.json.

    python scripts/build-house-search.py

Writes house-search/index.html (the list) and house-search/<slug>/index.html (one full
report per house). Every page is self-contained, like the rest of the site. Each house
card and each report states the homeowners association answer and fee on its own line,
so a house with no fee says so instead of leaving the field blank.
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
  --violet: #b49cff; --violet-soft: #2a2347;
  --font-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --font-body: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;
  --font-data: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 1rem; line-height: 1.58; }
.wrap { max-width: 980px; margin: 0 auto; padding: 2rem max(16px, env(safe-area-inset-left, 0px)) 4rem; display: grid; gap: 2.25rem; }
h1, h2, h3 { font-family: var(--font-display); margin: 0; line-height: 1.15; text-wrap: balance; }
h1 { font-size: clamp(2rem, 6vw, 3rem); font-weight: 800; }
h2 { font-size: 1.45rem; font-weight: 800; }
h3 { font-size: 1.12rem; font-weight: 700; }
p { margin: 0; max-width: 70ch; }
a { color: var(--sea); text-underline-offset: 3px; }
a:focus-visible { outline: 3px solid var(--rose); outline-offset: 2px; border-radius: 6px; }
.eyebrow { font-family: var(--font-data); font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
header { display: grid; gap: 0.6rem; }
.crumb { font-family: var(--font-data); font-size: 0.85rem; }
.verdict { background: var(--sea-soft); border-left: 6px solid var(--sea); border-radius: 0 12px 12px 0; padding: 1rem 1.25rem; display: grid; gap: 0.4rem; }
.verdict strong { color: var(--sea); font-family: var(--font-data); font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; }
.price { font-family: var(--font-data); font-size: 1.6rem; font-variant-numeric: tabular-nums; }
.price small { font-size: 0.85rem; color: var(--muted); }
.hoa { display: flex; flex-wrap: wrap; gap: 0.4rem 0.75rem; align-items: baseline; padding: 0.7rem 1rem; border-radius: 10px; background: var(--violet-soft); border: 1px solid var(--violet); }
.hoa b { font-family: var(--font-data); font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--violet); }
.hoa.none { background: var(--pass-soft); border-color: var(--pass); }
.hoa.none b { color: var(--pass); }
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
.ask { background: var(--rose-soft); border-radius: 12px; padding: 1rem 1.25rem; display: grid; gap: 0.6rem; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 1.2rem; display: grid; gap: 0.8rem; min-width: 0; }
.card.subject { border: 2px solid var(--sea); }
.card-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0.4rem 1rem; }
.tag { display: inline-block; font-family: var(--font-data); font-size: 0.74rem; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.1rem 0.55rem; border-radius: 6px; background: var(--raise); color: var(--muted); }
.tag.subject { background: var(--sea-soft); color: var(--sea); }
.go { font-weight: 700; }
.foot { font-size: 0.85rem; color: var(--muted); display: grid; gap: 0.4rem; }
"""

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="{desc}">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@500&display=swap">
<style>{style}</style>
</head>
<body>
<main class="wrap">
"""

TAIL = """</main>
</body>
</html>
"""


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
                       title=e(f'{h["address"]} report'), style=STYLE)]
    out.append('<header>')
    out.append('<p class="crumb"><a href="../">House search</a></p>')
    out.append(f'<p class="eyebrow">Buyer report, updated {e(updated)}</p>')
    out.append(f'<h1>{e(h["address"])}</h1>')
    out.append(f'<p>{e(h["city"])}</p>')
    out.append(f'<p class="price">{money(h["price"])} <small>{e(h.get("priceNote", ""))}</small></p>')
    out.append(hoa_line(h))
    if h["hoa"].get("note"):
        out.append(f'<p>{e(h["hoa"]["note"])}</p>')
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


def card(h):
    cls = "card subject" if h.get("role") == "subject" else "card"
    tag = '<span class="tag subject">The house that started this</span>' if h.get("role") == "subject" \
        else '<span class="tag">Similar house</span>'
    return (f'<article class="{cls}"><div class="card-head"><h2>{e(h["address"])}</h2>{tag}</div>'
            f'<p>{e(h["city"])}</p>'
            f'<p class="price">{money(h["price"])} <small>{e(h.get("priceNote", ""))}</small></p>'
            f'{hoa_line(h)}{facts(h)}'
            f'<div class="verdict"><strong>The short answer</strong><p>{e(h["verdict"])}</p></div>'
            f'<p><a class="go" href="{e(h["slug"])}/">Read the full report</a> &middot; '
            f'<a href="{e(h["listing"])}" target="_blank" rel="noopener">Listing</a></p></article>')


def index(data):
    houses = data["houses"]
    out = [HEAD.format(desc="Houses under consideration, each with a full buyer report.",
                       title="House Search", style=STYLE)]
    out.append('<header>')
    out.append(f'<p class="eyebrow">Updated {e(data["updated"])}</p>')
    out.append('<h1>House search</h1>')
    out.append(f'<p>{e(data["criteria"])}</p>')
    if data.get("searchNote"):
        out.append(f'<p>{e(data["searchNote"])}</p>')
    out.append('</header>')
    if data.get("compareRows"):
        out.append(compare(houses))
    for h in houses:
        out.append(card(h))
    out.append(TAIL)
    return "".join(out)


def compare(houses):
    head = ("<tr><th>House</th><th>Price</th><th>Homeowners association</th>"
            "<th>Beds / baths</th><th>Size</th><th>Built</th><th>Drive to daycare</th></tr>")
    rows = []
    for h in houses:
        hoa = h["hoa"]
        hoa_txt = f'Yes, {hoa["fee"]}' if hoa["has"] else "No, no fee"
        rows.append(f'<tr><td><a href="{e(h["slug"])}/">{e(h["address"])}</a><br><small>{e(h["city"])}</small></td>'
                    f'<td class="num">{money(h["price"])}</td><td>{e(hoa_txt)}</td>'
                    f'<td>{e(h.get("bedsShort", h["beds"]))}</td><td>{e(h.get("sizeShort", h["size"]))}</td>'
                    f'<td class="num">{e(str(h["built"])[:4])}</td><td>{e(h.get("driveShort", h["drive"]))}</td></tr>')
    return (f'<section><h2>Side by side</h2><div class="scroll"><table style="min-width:760px">'
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


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    for h in data["houses"]:
        if "hoa" not in h or "has" not in h["hoa"]:
            sys.exit(f'{h["address"]}: no homeowners association answer; every house needs one')
        write(OUT / h["slug"] / "index.html", report(h, data["updated"]))
    write(OUT / "index.html", index(data))
    print(f'house-search: {len(data["houses"])} report(s) and the list written to {OUT}')


if __name__ == "__main__":
    main()
