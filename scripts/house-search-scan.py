"""Check the house search against the listing feeds: new, updated, missed and gone.

    python scripts/house-search-scan.py            # dry run: report only
    python scripts/house-search-scan.py --write    # apply to data/house-search.json and the ledger
    python scripts/house-search-scan.py --write --build

Sources that answer an unattended fetch, measured 2026-10-27:

- Realtor.com's listing feed, read through homefinder.com, which serves the same search
  and detail routes without the bot wall. It carries the MLS (Mid America Regional
  Information Systems) listings for the county with price, status, pending and
  contingent flags, and a detail record with the bedroom levels, basement features,
  fencing, association fee, taxes and schools.
- Redfin's search feed, per region, as a second read of price and status.
- Zillow refuses every unattended fetch (a bot wall on curl, headless Chrome and the
  fetch tool). Zillow facts are refreshed only by a session with a signed-in Chrome.
- Drive times come from the public OSRM router (no traffic). Measured against the nine
  Google Maps drives on the page, it lands within two minutes of each, so the limit is
  applied to the OSRM figure with a borderline band above it that a person confirms.
- Flood zones come from the federal flood map service.

The script keeps a ledger, data/house-search-seen.json, of every listing that ever
matched the base criteria (asking price, bedrooms, size, existing single-family), with
the decision taken on it: tracked (on the page), candidate (needs a report), watching
(under contract, or a borderline drive), or excluded (with the reason). A listing the
ledger already holds a decision for is never raised twice. Tracked houses get their
price and status brought current and a line in the page's change list; a candidate gets
a draft entry in data/house-search-drafts.json with every mechanical field filled, which
a session turns into the full report.
"""

import argparse
import datetime as dt
import json
import math
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "house-search.json"
LEDGER = ROOT / "data" / "house-search-seen.json"
DRAFTS = ROOT / "data" / "house-search-drafts.json"
LASTRUN = ROOT / "data" / "house-search-last-run.json"
REPORT = None  # the run report once it exists, so a failure exit can still record what was read
BUILD = ROOT / "scripts" / "build-house-search.py"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/130.0.0.0 Safari/537.36")

# The daycare. The page never names it, and this repository is public, so its location lives
# in the private ops repository and is read at run time; the scan refuses to run without it.
DAYCARE_FILE = Path(r"X:\PortfolioOps\config\house-search.json")


def daycare():
    try:
        d = json.loads(DAYCARE_FILE.read_text(encoding="utf-8"))
        return float(d["daycare"]["lat"]), float(d["daycare"]["lon"])
    except (OSError, KeyError, ValueError) as ex:
        sys.exit(f"house-search-scan: the daycare location is read from {DAYCARE_FILE} "
                 f"({{\"daycare\": {{\"lat\": ..., \"lon\": ...}}}}), which could not be read: {ex}")


DAYCARE = None

CRITERIA = {
    "max_price": 335000,
    "min_beds": 3,
    "min_sqft": 1600,
    "max_drive_min": 20.0,     # in, on the routing estimate
    "borderline_min": 23.0,    # 20 to 23: listed for a person to confirm in Google Maps
}

REALTOR_SEARCH = ("https://www.homefinder.com/realestateandhomes-search/St.-Charles-County_MO/"
                  "beds-{beds}/price-na-{price}/sqft-{sqft}/pg-{page}")
REALTOR_DETAIL = "https://www.homefinder.com/realestateandhomes-detail/{permalink}"
REDFIN_GIS = ("https://www.redfin.com/stingray/api/gis?al=1&num_homes=350&page_number=1"
              "&sf=1,2,3,5,6,7&status=9&uipt=1,2,3,4,5,6,7,8&v=8&region_id={rid}&region_type={rtype}")
REDFIN_REGIONS = [("Lake Saint Louis", 10214, 6), ("O'Fallon", 14004, 6), ("Wentzville", 19768, 6),
                  ("St. Peters", 16702, 6), ("Dardenne Prairie", 4721, 6), ("St. Charles County", 1691, 5)]
OSRM = "https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
FEMA = ("https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?"
        "where=1%3D1&geometry={lon}%2C{lat}&geometryType=esriGeometryPoint&inSR=4326"
        "&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY&returnGeometry=false&f=json")

NOW = dt.datetime.now()
TODAY = NOW.strftime("%Y-%m-%d")


def longdate(d=None):
    d = d or NOW
    return f"{d:%B} {d.day}, {d.year}"


def money(n):
    return "${:,}".format(int(n))


def log(msg):
    print(msg, flush=True)


# ---------------------------------------------------------------- fetching

def fetch(url, timeout=40, tries=3, headers=None):
    h = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}
    h.update(headers or {})
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as ex:  # noqa: BLE001
            last = ex
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"fetch failed after {tries} tries: {url}: {last}")


def next_data(page_html):
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page_html, re.S)
    if not m:
        raise RuntimeError("no __NEXT_DATA__ block on the page")
    return json.loads(m.group(1))


def realtor_feed():
    """Every listing in the county under the base price, bedroom and size filters."""
    rows, page, total, page_size = {}, 1, None, None
    while True:
        url = REALTOR_SEARCH.format(beds=CRITERIA["min_beds"], price=CRITERIA["max_price"],
                                    sqft=CRITERIA["min_sqft"], page=page)
        try:
            pp = next_data(fetch(url))["props"]["pageProps"]["pageProps"]
        except RuntimeError as ex:
            if page > 1 and rows:
                log(f"realtor page {page}: {ex}; keeping the {len(rows)} read so far")
                break
            raise
        props = pp.get("properties") or []
        total = pp.get("totalProperties") if total is None else total
        page_size = page_size or len(props)
        for p in props:
            src = p.get("source") or {}
            mls = str(src.get("listing_id") or "")
            if not mls or mls in rows:
                continue
            d = p.get("description") or {}
            loc = (p.get("location") or {}).get("address") or {}
            fl = p.get("flags") or {}
            rows[mls] = {
                "mls": mls, "address": loc.get("line"), "city": loc.get("city"),
                "zip": loc.get("postal_code"), "price": p.get("list_price"),
                "status": p.get("status"), "pending": bool(fl.get("is_pending")),
                "contingent": bool(fl.get("is_contingent")),
                "newcon": bool(fl.get("is_new_construction")) or p.get("status") == "ready_to_build",
                "beds": d.get("beds"), "baths": d.get("baths_consolidated"), "sqft": d.get("sqft"),
                "year": d.get("year_built"), "type": d.get("type"), "lot_sqft": d.get("lot_sqft"),
                "lat": (loc.get("coordinate") or {}).get("lat"),
                "lon": (loc.get("coordinate") or {}).get("lon"),
                "listed": (p.get("list_date") or "")[:10], "permalink": p.get("permalink"),
                "photos": p.get("photo_count"),
                "cut": p.get("price_reduced_amount"),
            }
        if not props or (total and len(rows) >= total) or len(props) < (page_size or 1) or page >= 12:
            break
        page += 1
        time.sleep(0.4)
    return rows


def realtor_detail(permalink):
    pd = next_data(fetch(REALTOR_DETAIL.format(permalink=permalink)))
    pd = pd["props"]["pageProps"]["pageProps"]["initialReduxState"]["propertyDetails"]
    det = {}
    for c in pd.get("details") or []:
        det.setdefault(c.get("category") or "", []).extend(c.get("text") or [])
    lines = [x for v in det.values() for x in v]

    def pick(prefix):
        for x in lines:
            if x.startswith(prefix + ":"):
                return x.split(":", 1)[1].strip()
        return None

    def num(prefix):
        v = pick(prefix)
        try:
            return int(float(v.replace(",", ""))) if v else None
        except ValueError:
            return None

    return {
        "price": pd.get("list_price"), "status": pd.get("status"),
        "listed": (pd.get("list_date") or "")[:10],
        "last_change": pd.get("last_price_change_amount"),
        "last_sold": pd.get("last_sold_date"), "last_sold_price": pd.get("last_sold_price"),
        "days_on_mls": (pd.get("source") or {}).get("days_on_mls"),
        "updated": (pd.get("source") or {}).get("last_update_date"),
        "hoa_monthly": (pd.get("hoa") or {}).get("fee"),
        "tax_rate": (pd.get("mortgage") or {}).get("property_tax_rate"),
        "photos": pd.get("photo_count"), "href": pd.get("href"),
        "tags": [t.get("label") for t in pd.get("tags_for_display") or []],
        "text": (pd.get("description") or {}).get("text") or "",
        "beds_total": num("Bedrooms"), "beds_main": num("Bedrooms On Main Level"),
        "beds_upper": num("Bedrooms On Upper Level"), "beds_lower": num("Bedrooms On Lower Level"),
        "basement": pick("Basement Features"), "basement_desc": pick("Basement Description"),
        "foundation": pick("Foundation Details"), "levels": pick("Levels") or pick("Levels or Stories"),
        "style": pick("Architectural Style"), "fencing": pick("Fencing"),
        "lot_acres": pick("Lot Size Acres"), "lot_sqft": num("Lot Size Square Feet"),
        "association": pick("Association"), "fee": pick("Association Fee"),
        "fee_frequency": pick("Association Fee Frequency"), "fee_monthly": num("Calculated Total Monthly Association Fees"),
        "association_name": pick("Association Name"), "amenities": pick("Association Amenities"),
        "tax_amount": num("Annual Tax Amount"), "tax_year": pick("Tax Year"),
        "subdivision": pick("Subdivision"), "district": pick("School District"),
        "elementary": pick("Elementary School"), "middle": pick("Middle School"), "high": pick("High School"),
        "sqft_living": num("Total Square Feet Living"), "year_built": num("Year Built"),
        "roof": pick("Roof"), "basement_lines": [x for x in lines if "asement" in x],
        "flags": pd.get("flags") or {},
    }


def redfin_feed():
    """Price and status by MLS number across the regions Redfin will answer for."""
    rows = {}
    for name, rid, rtype in REDFIN_REGIONS:
        try:
            raw = fetch(REDFIN_GIS.format(rid=rid, rtype=rtype))
        except RuntimeError as ex:
            log(f"redfin {name}: {ex}")
            continue
        if not raw.startswith("{}&&"):
            log(f"redfin {name}: unexpected answer")
            continue
        payload = json.loads(raw[4:]).get("payload") or {}
        for h in payload.get("homes") or []:
            def v(x):
                return x.get("value") if isinstance(x, dict) else x
            mls = str(v(h.get("mlsId")) or "")
            if not mls or mls in rows:
                continue
            ll = (h.get("latLong") or {}).get("value") or {}
            rows[mls] = {
                "mls": mls, "price": v(h.get("price")), "status": h.get("mlsStatus"),
                "search_status": h.get("searchStatus"), "hoa_monthly": v(h.get("hoa")),
                "dom": v(h.get("dom")), "url": ("https://www.redfin.com" + h["url"]) if h.get("url") else None,
                "beds": v(h.get("beds")), "sqft": v(h.get("sqFt")), "year": v(h.get("yearBuilt")),
                "lat": ll.get("latitude"), "lon": ll.get("longitude"),
                "newcon": bool(h.get("isNewConstruction")), "ptype": h.get("propertyType"),
                "remarks": h.get("listingRemarks") or "", "address": v(h.get("streetLine")),
                "city": h.get("city"),
            }
        time.sleep(0.4)
    return rows


def route(lat, lon):
    try:
        j = json.loads(fetch(OSRM.format(lon1=lon, lat1=lat, lon2=DAYCARE[1], lat2=DAYCARE[0]), timeout=25, tries=2,
                             headers={"User-Agent": "house-search-scan/1.0"}))
        r = j["routes"][0]
        return round(r["duration"] / 60, 1), round(r["distance"] / 1609.34, 1)
    except Exception:  # noqa: BLE001
        return None, None


def flood(lat, lon):
    try:
        j = json.loads(fetch(FEMA.format(lat=lat, lon=lon), timeout=60, tries=2))
        zones = [(f.get("attributes") or {}) for f in j.get("features") or []]
        if not zones:
            return "Not inside a mapped flood zone on the federal flood map"
        z = zones[0]
        if z.get("FLD_ZONE") == "X" and "MINIMAL" in (z.get("ZONE_SUBTY") or ""):
            return "Minimal-risk area (Zone X) on the federal flood map"
        return f'Zone {z.get("FLD_ZONE")} ({(z.get("ZONE_SUBTY") or "").lower()}) on the federal flood map'
    except Exception:  # noqa: BLE001
        return None


def haversine(a, b):
    r = 3958.8
    la1, lo1 = map(math.radians, a)
    la2, lo2 = map(math.radians, b)
    d = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(d))


# ---------------------------------------------------------------- state

def load(path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def save(path, obj):
    text = json.dumps(obj, indent=2, ensure_ascii=False) + "\n"
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    os.replace(tmp, path)
    if path.read_text(encoding="utf-8") != text:
        sys.exit(f"write did not land intact: {path}")


def feed_state(rt, rf):
    """One word for where a listing stands, from both feeds."""
    if rt:
        if rt["pending"]:
            return "pending"
        if rt["contingent"]:
            return "contingent"
        if rt["status"] == "for_sale":
            return "active"
        if rt["status"] in ("sold", "off_market"):
            return rt["status"]
        return rt["status"] or "unknown"
    if rf:
        s = (rf.get("status") or "").lower()
        if "pending" in s or "contract" in s:
            return "pending"
        if "contingent" in s:
            return "contingent"
        if "active" in s or "coming" in s:
            return "active"
        return s or "unknown"
    return "gone"


STATE_TEXT = {
    "pending": "Under contract (pending) as of {d}, per the MLS feed.",
    "contingent": "Under contract with contingencies as of {d}, per the MLS feed.",
    "active": "Back on the market as of {d}, per the MLS feed.",
    "sold": "Sold, per the MLS feed on {d}.",
    "off_market": "Taken off the market, per the MLS feed on {d}.",
    "gone": "No longer in the MLS feed as of {d}: sold, withdrawn or expired. Check the listing.",
}


def basement_kind(det):
    text = " ".join(filter(None, [det.get("basement"), det.get("basement_desc"),
                                  " ".join(det.get("basement_lines") or []), det.get("text")])).lower()
    feat = (det.get("basement") or "").lower()
    style = (det.get("style") or "").lower() + " " + (det.get("levels") or "").lower()
    if "split" in style and "foyer" not in style:
        return "split"
    if (det.get("foundation") or "").lower().startswith("slab") and "basement" not in text:
        return "none"
    if "unfinished" in feat and "partial" not in feat:
        return "unfinished"
    if "partially finished" in feat or "partial" in feat:
        return "unsure"
    if "finished" in feat or "finished lower level" in text or "finished walkout" in text \
            or "recreation room" in text:
        return "finished"
    if "crawl" in feat or (det.get("foundation") or "").lower() == "crawl space":
        return "none"
    if not feat and "basement" not in text:
        return "unsure"
    return "unsure"


def must_haves(det):
    main = det.get("beds_main")
    kind = basement_kind(det)
    verdict = "pass"
    why = []
    if main is None:
        verdict = "check"
        why.append("the feed does not say which floor the bedrooms are on")
    elif main < 3:
        verdict = "fail"
        why.append(f"only {main} bedroom{'s' if main != 1 else ''} on the main floor")
    if kind in ("none", "unfinished"):
        verdict = "fail"
        why.append("no basement" if kind == "none" else "basement unfinished")
    elif kind in ("split", "unsure") and verdict != "fail":
        verdict = "check"
        why.append("split level, lower level only partly below ground" if kind == "split"
                   else "basement only partly finished, or not described")
    return verdict, kind, "; ".join(why)


# ---------------------------------------------------------------- the pass

def run(write, build, details):
    global DAYCARE
    DAYCARE = daycare()
    data = load(DATA, None)
    if not data:
        sys.exit(f"missing {DATA}")
    ledger = load(LEDGER, {"updated": None, "listings": {}})
    drafts = load(DRAFTS, {"updated": None, "drafts": []})
    listings = ledger["listings"]
    changes = data.setdefault("changes", [])
    data.setdefault("watchlist", [])
    report = {"ran": NOW.strftime("%Y-%m-%d %H:%M"), "new": [], "updated": [], "gone": [],
              "watching": [], "excluded": [], "errors": [], "sources": {}}
    global REPORT
    REPORT = report

    log(f"house-search-scan {report['ran']}: reading the feeds")
    try:
        rt = realtor_feed()
        report["sources"]["realtor"] = len(rt)
    except Exception as ex:  # noqa: BLE001
        rt = {}
        report["errors"].append(f"Realtor.com feed: {ex}")
    rf = redfin_feed()
    report["sources"]["redfin"] = len(rf)
    log(f"  Realtor.com feed: {len(rt)} listings under the filters; Redfin: {len(rf)} listings across the regions")
    if not rt and not rf:
        report["errors"].append("no feed answered; nothing changed")
        sys.exit("house-search-scan: no feed answered; nothing changed")

    tracked = {h.get("listingNumber"): h for h in data["houses"] if h.get("listingNumber")}

    # 1. Tracked houses: price, status, last checked.
    for mls, h in tracked.items():
        a, b = rt.get(mls), rf.get(mls)
        state = feed_state(a, b)
        entry = listings.setdefault(mls, {"address": h["address"], "city": h["city"], "decision": "tracked",
                                          "slug": h["slug"], "first_seen": TODAY, "history": []})
        entry.update({"decision": "tracked", "slug": h["slug"], "last_seen": TODAY if (a or b) else entry.get("last_seen")})
        price = (a or {}).get("price") or (b or {}).get("price")
        prev_state = entry.get("state")
        lines = []
        if price and int(price) != int(h["price"]):
            old, new = int(h["price"]), int(price)
            diff = new - old
            word = "cut" if diff < 0 else "raised"
            lines.append(f"Price {word} {money(abs(diff))} to {money(new)}, from {money(old)}.")
            h["price"] = new
            h["priceNote"] = f"{'Cut' if diff < 0 else 'Raised'} from {money(old)} on {longdate()}"
        if state == "gone" and not rt:
            state = prev_state or "active"   # Redfin alone cannot prove a listing left; its regions are partial
        if state != "active" and state != prev_state:
            if state == "gone":
                entry["missing_runs"] = entry.get("missing_runs", 0) + 1
                if entry["missing_runs"] < 2:
                    state = prev_state or "active"   # one missed read is not a withdrawal
            if state != "active" and state != prev_state:
                h["status"] = STATE_TEXT.get(state, STATE_TEXT["gone"]).format(d=longdate())
                lines.append(h["status"])
        elif state == "active":
            entry["missing_runs"] = 0
            if prev_state and prev_state != "active":
                h["status"] = STATE_TEXT["active"].format(d=longdate())
                lines.append(h["status"])
        entry["state"] = state if state != "gone" or entry.get("missing_runs", 0) >= 2 else (prev_state or "active")
        entry["price"] = price or entry.get("price")
        for text in lines:
            changes.insert(0, {"date": TODAY, "slug": h["slug"], "address": h["address"], "text": text})
            entry["history"].append({"date": TODAY, "text": text})
            for s in h.get("sections", []):
                if s.get("timeline"):
                    s["timeline"].append([longdate(), text])
                    break
            report["updated"].append(f'{h["address"]}: {text}')
        srcs = []
        if a:
            srcs.append("the MLS feed through Realtor.com")
        if b:
            srcs.append("Redfin")
        state_word = {"active": "for sale", "pending": "under contract", "contingent": "under contract with contingencies",
                      "gone": "not found"}.get(state, state)
        h["checked"] = {"date": TODAY, "time": NOW.strftime("%H:%M"),
                        "text": (f"{longdate()} at {NOW:%H:%M} against {' and '.join(srcs) if srcs else 'the feeds (not found in either)'}: "
                                 f"{state_word}" + (f" at {money(price)}" if price else "") + ". Zillow is read only by a browser session.")}
        if not (a or b) and rt:
            report["gone"].append(f'{h["address"]}: not in either feed this run ({entry.get("missing_runs", 0)} in a row)')

    # 2. Candidates: everything in the feeds that passes the base criteria and is not tracked.
    def base_ok(r):
        return (r["status"] == "for_sale" and not r["newcon"] and r["type"] == "single_family"
                and (r["beds"] or 0) >= CRITERIA["min_beds"] and (r["sqft"] or 0) >= CRITERIA["min_sqft"]
                and (r["price"] or 0) <= CRITERIA["max_price"])

    pool = {mls: r for mls, r in rt.items() if base_ok(r) and mls not in tracked}
    for mls, r in rf.items():
        if mls in tracked or mls in pool or r.get("newcon") or r.get("ptype") != 6:
            continue
        if (r.get("beds") or 0) >= CRITERIA["min_beds"] and (r.get("sqft") or 0) >= CRITERIA["min_sqft"] \
                and (r.get("price") or 0) <= CRITERIA["max_price"] and (r.get("search_status") in (1, 8)):
            pool[mls] = {"mls": mls, "address": r["address"], "city": r["city"], "zip": None, "price": r["price"],
                         "status": "for_sale", "pending": False, "contingent": False, "newcon": False,
                         "beds": r["beds"], "baths": None, "sqft": r["sqft"], "year": r["year"], "type": "single_family",
                         "lot_sqft": None, "lat": r["lat"], "lon": r["lon"], "listed": None, "permalink": None,
                         "photos": None, "cut": None, "redfin_only": True}

    for mls, r in sorted(pool.items(), key=lambda kv: kv[1]["price"] or 0):
        entry = listings.get(mls)
        state = "contingent" if r["contingent"] else "pending" if r["pending"] else "active"
        if entry:
            entry["last_seen"] = TODAY
            if entry.get("decision") == "watching" and entry.get("state") in ("pending", "contingent") and state == "active":
                entry["decision"] = "candidate"
                entry["history"].append({"date": TODAY, "text": "Back on the market."})
                report["new"].append(f'{r["address"]}, {r["city"]}: back on the market at {money(r["price"])}')
            elif entry.get("decision") == "candidate" and state != "active":
                entry["decision"] = "watching"
                entry["history"].append({"date": TODAY, "text": f"Went {state} before a report was written."})
            if r["price"] and entry.get("price") and int(r["price"]) != int(entry["price"]):
                entry["history"].append({"date": TODAY, "text": f'Price {money(entry["price"])} to {money(r["price"])}.'})
                if entry.get("decision") in ("candidate", "watching"):
                    report["updated"].append(f'{r["address"]}: price {money(entry["price"])} to {money(r["price"])} (not on the page)')
            entry["price"] = r["price"]
            entry["state"] = state
            continue
        # First sight of this listing.
        entry = {"address": r["address"], "city": r["city"], "zip": r["zip"], "price": r["price"],
                 "beds": r["beds"], "baths": r["baths"], "sqft": r["sqft"], "year": r["year"],
                 "lat": r["lat"], "lon": r["lon"], "listed": r["listed"], "permalink": r["permalink"],
                 "redfin": (rf.get(mls) or {}).get("url"), "first_seen": TODAY, "last_seen": TODAY,
                 "state": state, "history": []}
        if r.get("lat"):
            entry["drive_min"], entry["drive_mi"] = route(r["lat"], r["lon"])
            time.sleep(0.3)
        drive = entry.get("drive_min")
        if drive is None:
            entry["decision"] = "candidate"
            entry["reason"] = "drive time could not be routed; confirm it by hand"
        elif drive > CRITERIA["borderline_min"]:
            entry["decision"] = "excluded"
            entry["reason"] = f"{drive:g} minutes to the daycare by the routing estimate, over the 20-minute limit"
        elif drive > CRITERIA["max_drive_min"]:
            entry["decision"] = "watching"
            entry["reason"] = f"{drive:g} minutes by the routing estimate, right at the limit; confirm in Google Maps"
        else:
            entry["decision"] = "candidate"
            entry["reason"] = f"{drive:g} minutes to the daycare by the routing estimate"
        if entry["decision"] != "excluded" and state != "active":
            entry["decision"] = "watching"
            entry["reason"] = f"under contract ({state}); raised again if it comes back on the market"
        if entry["decision"] == "candidate" and r.get("redfin_only"):
            entry["decision"] = "watching"
            entry["reason"] += "; only Redfin lists it, so the must-haves are unread until the MLS record appears"
        if entry["decision"] == "candidate" and details and r.get("permalink"):
            try:
                det = realtor_detail(r["permalink"])
                time.sleep(0.4)
                verdict, kind, why = must_haves(det)
                entry["musts"] = {"verdict": verdict, "basement": kind, "beds_main": det.get("beds_main"), "why": why}
                entry["detail"] = {k: det.get(k) for k in ("hoa_monthly", "fee", "fee_frequency", "association_name",
                                                           "tax_amount", "tax_year", "fencing", "district",
                                                           "elementary", "last_sold", "style", "levels", "href",
                                                           "basement", "foundation", "listed", "last_change",
                                                           "lot_acres", "subdivision", "photos")}
                if (det.get("style") or "").lower().find("villa") >= 0 or "villa" in det.get("text", "").lower()[:400] \
                        or (det.get("fee_monthly") or 0) >= 200:
                    entry["decision"] = "excluded"
                    entry["reason"] = (f"attached villa or a high association fee ({money(det.get('fee_monthly') or 0)} a month)")
                elif verdict == "fail":
                    entry["decision"] = "excluded"
                    entry["reason"] = f"fails a must-have: {why}"
                if entry["decision"] == "candidate":
                    entry["flood"] = flood(r["lat"], r["lon"]) if r.get("lat") else None
                    drafts["drafts"] = [d for d in drafts["drafts"] if d.get("listingNumber") != mls]
                    drafts["drafts"].append(draft(r, entry, det, rf.get(mls)))
            except Exception as ex:  # noqa: BLE001
                report["errors"].append(f'{r["address"]}: detail read failed: {ex}')
        listings[mls] = entry
        line = f'{r["address"]}, {r["city"]}: {money(r["price"])}, {r["beds"]} beds, {r["sqft"]} sq ft, {entry["reason"]}'
        if entry["decision"] == "candidate":
            report["new"].append(line)
        elif entry["decision"] == "watching":
            report["watching"].append(line)
        else:
            report["excluded"].append(line)

    # 3. The watchlist on the page: the borderline drives still for sale, and the houses under contract
    # with contingencies inside the limit, which come back more often than a pending sale does. The
    # pending ones inside the limit are a count; the ledger holds every one of them.
    def on_page(v):
        if v.get("decision") not in ("watching", "candidate") or v.get("last_seen") != TODAY:
            return False
        drive = v.get("drive_min") or 0
        return v.get("state") == "active" or (v.get("state") == "contingent" and drive <= CRITERIA["max_drive_min"])

    data["watchlist"] = [
        {"address": v["address"], "city": v["city"], "price": v.get("price"), "beds": v.get("beds"),
         "sqft": v.get("sqft"), "drive": v.get("drive_min"), "why": v.get("reason"), "state": v.get("state"),
         "link": (REALTOR_DETAIL.format(permalink=v["permalink"]).replace("www.homefinder.com", "www.realtor.com")
                  if v.get("permalink") else v.get("redfin"))}
        for mls, v in sorted(listings.items(), key=lambda kv: kv[1].get("price") or 0) if on_page(v)
    ]
    data["pendingCount"] = sum(1 for v in listings.values()
                               if v.get("decision") == "watching" and v.get("state") == "pending"
                               and v.get("last_seen") == TODAY and (v.get("drive_min") or 99) <= CRITERIA["max_drive_min"])

    moved = bool(report["updated"] or report["new"] or report["gone"] or report["watching"] or report["excluded"])
    if moved:
        ledger["updated"] = report["ran"]
        drafts["updated"] = report["ran"]
    if report["updated"] or report["new"]:
        data["updated"] = TODAY
    del data["changes"][40:]

    for key in ("new", "updated", "gone", "watching", "excluded", "errors"):
        for line in report[key]:
            log(f"  {key.upper()}: {line}")
    log(f"  summary: {len(report['new'])} new, {len(report['updated'])} updated, {len(report['gone'])} gone, "
        f"{len(report['watching'])} watching, {len(report['excluded'])} excluded, {len(report['errors'])} errors")

    if write:
        save(DATA, data)
        save(LEDGER, ledger)
        save(DRAFTS, drafts)
        log(f"  wrote {DATA.name}, {LEDGER.name}, {DRAFTS.name}")
        if build:
            rc = subprocess.run([sys.executable, str(BUILD)], cwd=str(ROOT)).returncode
            if rc != 0:
                sys.exit("build failed")
    else:
        log("  dry run: nothing written")
    return report


def draft(r, entry, det, rf_row):
    """A house entry with every mechanical field filled; the judgment fields say so."""
    fee_m = det.get("fee_monthly")
    assoc = (det.get("association") or "").lower() == "yes" or bool(fee_m)
    fee_txt = None
    if assoc and det.get("fee"):
        freq = (det.get("fee_frequency") or "").lower()
        try:
            fee_n = int(float(det["fee"]))
            if freq.startswith("ann"):
                fee_txt = f"{money(fee_n)} a year (${fee_n / 12:,.2f} a month)"
            elif freq.startswith("month"):
                fee_txt = f"{money(fee_n)} a month"
            else:
                fee_txt = f"{money(fee_n)} {freq}".strip()
        except ValueError:
            fee_txt = det["fee"]
    main = det.get("beds_main")
    kind = entry["musts"]["basement"]
    fencing = det.get("fencing")
    fence_has = True if fencing and "yard" in fencing.lower() or (fencing and "full" in fencing.lower()) else (False if fencing and "none" in fencing.lower() else None)
    if fence_has is None and "fenced" in (det.get("text") or "").lower():
        fence_has = True
    slug = re.sub(r"[^a-z0-9]+", "-", (r["address"] or "").lower()).strip("-")
    drive = entry.get("drive_min")
    return {
        "slug": slug, "role": "comparable", "address": r["address"], "city": f'{r["city"]}, MO {r["zip"] or ""}'.strip(),
        "status": f'For sale since {longdate(dt.date.fromisoformat(det["listed"])) if det.get("listed") else "an unknown date"}.',
        "price": r["price"],
        "priceNote": (f'Cut {money(abs(det["last_change"]))} since listing' if det.get("last_change") else "No price change since listing"),
        "beds": f'{det.get("beds_total") or r["beds"]}' + (f": {main} on the main floor" if main is not None else ""),
        "baths": r.get("baths") or "",
        "size": f'{(det.get("sqft_living") or r["sqft"]):,} square feet (MLS figure)',
        "built": f'{det.get("year_built") or r["year"]}, {det.get("style") or "style not stated"}',
        "lot": f'{det["lot_acres"]} acre' if det.get("lot_acres") else (f'{det["lot_sqft"]:,} square feet' if det.get("lot_sqft") else "Not stated"),
        "hoa": {"has": assoc, "fee": fee_txt or ("No fee" if not assoc else "Fee not stated"),
                "name": det.get("association_name") or "", "note": (f'Amenities listed: {det["amenities"]}.' if det.get("amenities") else "")},
        "fence": {"has": fence_has, "note": f"MLS fencing field: {fencing}." if fencing else "The listing does not say."},
        "mainFloorBeds": {"count": main if main is not None else 0,
                          "note": (f"{main} on the main floor per the MLS bedroom levels." if main is not None
                                   else "The MLS record does not give bedroom levels; confirm on the listing.")},
        "basement": {"kind": kind, "note": f'MLS basement features: {det.get("basement") or det.get("basement_desc") or "not stated"}.'},
        "taxes": f'{money(det["tax_amount"])} for {det.get("tax_year") or "the last tax year"}' if det.get("tax_amount") else "Not stated",
        "schools": ", ".join(filter(None, [det.get("district"), det.get("elementary")])) or "Not stated",
        "flood": entry.get("flood") or "Not yet checked",
        "drive": f"About {drive:g} minutes, {entry.get('drive_mi')} miles (routing estimate, no traffic)" if drive else "Not routed",
        "bedsShort": f'{det.get("beds_total") or r["beds"]} / {r.get("baths") or "?"}',
        "sizeShort": f'{(det.get("sqft_living") or r["sqft"]):,}',
        "driveShort": f"{round(drive)} min (est.)" if drive else "?",
        "listing": (det.get("href") or ""), "listingNumber": r["mls"],
        "verdict": "DRAFT: written by the scan from the MLS record; a session reads the listing text and photos and writes the verdict.",
        "good": [], "watch": [],
        "sections": [
            {"h": "What has happened to it", "timeline": [
                *([[longdate(dt.date.fromisoformat(det["last_sold"])), "Last sold (date from the MLS record; Missouri does not publish sale prices)."]] if det.get("last_sold") else []),
                [longdate(dt.date.fromisoformat(det["listed"])) if det.get("listed") else "Listing date unknown", f'Listed at {money((r["price"] or 0) + (-(det.get("last_change") or 0)))}.'],
                *([[TODAY and longdate(), f'Price cut {money(abs(det["last_change"]))} to {money(r["price"])}.']] if det.get("last_change") else []),
            ], "p": ["County ownership history not yet pulled; the assessor site needs a browser session."]},
            {"h": "What the listing says", "p": [det.get("text") or ""]},
        ],
        "problems": [], "questions": [],
        "sources": [["Realtor.com listing", det.get("href") or ""]] + ([["Redfin listing", rf_row["url"]]] if rf_row and rf_row.get("url") else []),
        "feed": {"realtor_permalink": r.get("permalink"), "redfin": (rf_row or {}).get("url"), "tags": det.get("tags"),
                 "basement_lines": det.get("basement_lines"), "photos": det.get("photos")},
    }


def write_last_run(ok, error=None):
    """Every writing run leaves a record of when it ran, what each feed returned and what failed,
    including a run that exits early. The ledger stamp moves only when something changed, so
    without this a dead feed looks the same as a quiet day. check-dashboard-live.ps1 reads it."""
    rep = REPORT or {}
    errors = list(rep.get("errors") or [])
    if error and error not in errors:
        errors.append(error)
    save(LASTRUN, {"ran": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
                   "ok": bool(ok), "sources": rep.get("sources") or {}, "errors": errors})


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--write", action="store_true", help="apply the changes to the data file and the ledger")
    ap.add_argument("--build", action="store_true", help="after writing, rebuild the pages")
    ap.add_argument("--no-details", action="store_true", help="skip the per-listing detail reads")
    a = ap.parse_args()
    try:
        run(write=a.write, build=a.build, details=not a.no_details)
    except BaseException as ex:  # noqa: BLE001  record the failure, then let it propagate
        if a.write:
            code = ex.code if isinstance(ex, SystemExit) else f"{type(ex).__name__}: {ex}"
            write_last_run(False, str(code) if code is not None else "exited with no message")
        raise
    if a.write:
        write_last_run(True)


if __name__ == "__main__":
    main()
