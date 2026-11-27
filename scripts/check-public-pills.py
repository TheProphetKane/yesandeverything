# -*- coding: utf-8 -*-
"""check-public-pills.py: fail when a stamped version pill in a public page differs from
the canonical status file's version (X:\PortfolioOps\status\data\<Project>.json).

Pills are the <!--live:version:Proj-->..<!--/live--> spans (keyed) and the bare
<!--live:version--> span on a project page, whose project comes from data/projects.json.
Fix with: node scripts/update-project-pages.mjs
   python scripts/check-public-pills.py
"""
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CANON = r"X:\PortfolioOps\status\data"


def load(p):
    with io.open(p, encoding="utf-8") as f:
        return json.load(f)


def vfmt(v):
    s = str(v or "").strip()
    return ("" if not s else (s if s.startswith("v") else "v" + s))


def check():
    """Return a list of (file, project, shown, expected, ok) rows."""
    reg = load(os.path.join(ROOT, "data", "projects.json"))
    slug_to_id = {}
    for p in reg.get("projects") or []:
        if p.get("slug") and p.get("id") and not p.get("retired"):
            slug_to_id[p["slug"]] = p["id"]
    files = [("index.html", None)]
    for slug in slug_to_id:
        for page in ("index.html", "design.html"):
            files.append((os.path.join("projects", slug, page), slug_to_id[slug]))
    rows = []
    cache = {}
    for rel, pid in files:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        with io.open(path, encoding="utf-8") as f:
            t = f.read()
        for m in re.finditer(r"<!--live:version(?::([A-Za-z0-9_-]+))?-->(.*?)<!--/live-->", t, re.S):
            who = m.group(1) or pid
            if not who:
                continue
            if who not in cache:
                cp = os.path.join(CANON, who + ".json")
                cache[who] = vfmt(load(cp).get("version")) if os.path.exists(cp) else None
            exp = cache[who]
            if exp is None:
                continue
            shown = m.group(2).strip()
            rows.append((rel.replace("\\", "/"), who, shown, exp, shown == exp))
    return rows


if __name__ == "__main__":
    rows = check()
    bad = [r for r in rows if not r[4]]
    for f, who, shown, exp, ok in rows:
        print(("ok   " if ok else "FAIL ") + "%s %s shows %s, canonical %s" % (f, who, shown, exp))
    print("%d pill(s) checked, %d differ" % (len(rows), len(bad)))
    sys.exit(1 if bad else 0)
