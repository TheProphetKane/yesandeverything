# -*- coding: utf-8 -*-
"""audit-dashboard-page.py: compare what the live pages show (the capture written by
scripts/audit-dashboard-page.mjs) with the feeds they read and with the canonical status
files behind the feeds. Writes docs/DASHBOARD_AUDIT-<date>.md. Exit 1 when any row fails.

   node scripts/audit-dashboard-page.mjs scripts/.audit-capture.json
   python scripts/audit-dashboard-page.py scripts/.audit-capture.json
"""
import glob, io, json, os, re, subprocess, sys, urllib.request
from datetime import datetime, timezone, timedelta

CAP = sys.argv[1] if len(sys.argv) > 1 else "scripts/.audit-capture.json"
SITE = "https://yesandeverything.com"
WORKER = "https://usage.yesandeverything.com"
CANON = r"X:\PortfolioOps\status\data"
REPOS = {"Agents": r"X:\YesAndAgents", "Apothecary": r"X:\YesAndApothecary", "Budget": r"X:\YesAndBudget", "Cattery": r"X:\YesAndCattery",
         "Chains": r"X:\YesAndChains", "Everything": r"X:\YesAndEverything", "Gnosis": r"X:\YesAndGnosis", "Hordes": r"X:\HereBeHordes",
         "Ring": r"X:\YesAndRing", "Rising": r"X:\BrackishRising", "Scheduler": r"X:\YesAndScheduler"}
DISPLAY = {"Agents": "Yes& Agents", "Apothecary": "Yes& Apothecary", "Architecture": "Yes& Architecture", "Budget": "Yes& Budget",
           "Cattery": "Yes& Cattery", "Chains": "Yes& Chains", "Everything": "Yes& Everything", "Gnosis": "Gnosis",
           "Guardian": "Coiled Guardian", "Hordes": "Here Be Hordes", "Ring": "Yes& Ring", "Rising": "Brackish Rising",
           "Scheduler": "Yes& Scheduler", "Skylight": "Yes& Skylight"}
# retired projects stay in the totals but off the live roster (the core legend and the found list)
_reg = json.load(io.open(r"X:\YesAndEverything\data\projects.json", encoding="utf-8"))
RETIRED = set(p["id"] for p in (_reg.get("projects") or []) if p.get("retired"))


def fetch(url):
    req = urllib.request.Request(url + ("&" if "?" in url else "?") + "audit=1", headers={"Cache-Control": "no-cache", "User-Agent": "Mozilla/5.0 audit-dashboard-page"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def load(p):
    with io.open(p, encoding="utf-8") as f:
        return json.load(f)


def fmt_tok(n):
    if n is None:
        return "0"
    if n >= 1e9:
        return "%.2fB" % (n / 1e9)
    if n >= 1e6:
        return "%.2fM" % (n / 1e6)
    if n >= 1e3:
        return "%.1fk" % (n / 1e3)
    return str(int(round(n)))


def fmt_usd(n):
    n = n or 0
    return "$" + ("%.0f" % n if n >= 100 else "%.2f" % n)


def total_tok(r):
    return (r.get("input") or 0) + (r.get("cacheRead") or 0) + (r.get("cacheWrite") or 0) + (r.get("output") or 0)


def central_day(offset=0):
    now = datetime.now(timezone.utc) - timedelta(days=offset)
    return (now - timedelta(hours=5)).strftime("%Y-%m-%d")  # Central is UTC-5 in September


rows = []


def row(surface, item, shown, expected, ok=None, note=""):
    if ok is None:
        ok = str(shown).strip() == str(expected).strip()
    rows.append((surface, item, str(shown), str(expected), bool(ok), note))


cap = load(CAP)
usage = fetch(WORKER + "/usage.json")
statuses = fetch(WORKER + "/statuses.json")
constellation = fetch(SITE + "/status/data/constellation.json")
lean = fetch(SITE + "/dashboard/data/usage-today.json")
backfill = fetch(SITE + "/dashboard/data/backfill.json")
pages = {}
for pid in list(statuses.keys()):
    try:
        pages[pid] = fetch(SITE + "/status/data/%s.json" % pid)
    except Exception:
        pages[pid] = None

# ---------- layer 1: canonical -> feeds ----------
canon = {}
for p in sorted(glob.glob(os.path.join(CANON, "*.json"))):
    d = load(p)
    if isinstance(d, dict) and d.get("project"):
        canon[d["project"]] = d
for pid, c in sorted(canon.items()):
    if c.get("private"):
        row("feed", pid + " withheld", "absent" if pid not in statuses else "PRESENT", "absent", pid not in statuses, "private: true stays off the public bundle")
        continue
    s = statuses.get(pid)
    g = pages.get(pid)
    if not s:
        row("feed", pid + " in statuses.json", "missing", "present", False)
        continue
    br = c.get("barRaise") or {}
    sb = s.get("barRaise") or {}
    for k in ("version", "lastReleaseAt", "workTreeClean", "stale"):
        row("feed", pid + " " + k, s.get(k), c.get(k))
    for k in ("actionsOpen", "actionsClosed", "health", "verdict"):
        row("feed", pid + " barRaise." + k, sb.get(k), br.get(k))
    row("feed", pid + " completion", (s.get("completion") or {}).get("pct"), (c.get("completion") or {}).get("pct"))
    row("feed", pid + " audit findings", json.dumps((s.get("audit") or {}).get("findings"), sort_keys=True), json.dumps((c.get("audit") or {}).get("findings"), sort_keys=True))
    def ms(x):
        m = x.get("milestone")
        return m.get("label") if isinstance(m, dict) else m
    row("feed", pid + " milestone", ms(s), ms(c))
    if g:
        row("pages copy", pid + " version", g.get("version"), c.get("version"))
        row("pages copy", pid + " actionsOpen", (g.get("barRaise") or {}).get("actionsOpen"), br.get("actionsOpen"))
        row("pages copy", pid + " verdict", (g.get("barRaise") or {}).get("verdict"), br.get("verdict"))
        row("pages copy", pid + " audit", json.dumps((g.get("audit") or {}).get("findings"), sort_keys=True), json.dumps((c.get("audit") or {}).get("findings"), sort_keys=True))
    else:
        row("pages copy", pid + " served", "404", "200", False)
    repo = REPOS.get(pid)
    if repo and os.path.isdir(repo):
        try:
            log = subprocess.check_output(["git", "-C", repo, "log", "-40", "--format=%s"], text=True, encoding="utf-8", errors="replace")
            v = str(c.get("version") or "").lstrip("v")
            hit = bool(v) and (v in log)
            if not hit and re.fullmatch(r"[0-9a-f]{7,12}", v):
                hit = subprocess.call(["git", "-C", repo, "cat-file", "-e", v], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0
            for cand in ("PROJECT_SPEC.md", "package.json", "project.godot", "index.html"):
                fp = os.path.join(repo, cand)
                if os.path.exists(fp):
                    spec = io.open(fp, encoding="utf-8", errors="replace").read()
                    if v and v in spec:
                        hit = True
                        break
            row("repo", pid + " version " + v + " named in the repo", "yes" if hit else "no", "yes", hit, "last 40 commit subjects or the version source")
        except Exception as e:
            row("repo", pid + " version", "git failed: %s" % e, "readable", False)
gen = datetime.strptime(usage["generatedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
captured = datetime.strptime(cap["capturedAt"][:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
age_h = (datetime.now(timezone.utc) - gen).total_seconds() / 3600
age_at_capture_min = int((captured - gen).total_seconds() / 60)
row("feed", "usage.json age (hours)", "%.1f" % age_h, "under 5.5", age_h < 5.5)
local_usage = load(r"X:\YesAndEverything\dashboard\data\usage.json")
row("feed", "usage.json worker vs local generatedAt", usage["generatedAt"], local_usage["generatedAt"])
local_cn = load(os.path.join(CANON, "constellation.json"))
row("feed", "constellation generatedAt pages vs canonical", constellation.get("generatedAt"), local_cn.get("generatedAt"))
cn_age = (datetime.now(timezone.utc) - datetime.strptime(constellation["generatedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).days
row("feed", "constellation age (days)", cn_age, "under 8", cn_age < 8)

# ---------- layer 2: feeds -> dashboard page ----------
D = cap["dashboard"]
today = central_day(0)
yester = central_day(1)
withheld = set(usage.get("dailyCurvesWithheld") or [])
t_tok = t_cost = y_tok = a_tok = a_cost = 0
sessions = 0
per_today = {}
for pid, u in usage["projects"].items():
    for d in u.get("daily") or []:
        if d.get("d") == today:
            t_tok += total_tok(d)
            t_cost += d.get("costUSD") or 0
            per_today[pid] = per_today.get(pid, 0) + total_tok(d)
        if d.get("d") == yester:
            y_tok += total_tok(d)
    at = u.get("allTime") or {}
    a_tok += total_tok(at)
    a_cost += at.get("costUSD") or 0
    sessions += u.get("sessions") or 0
bf = backfill.get("totals") or {}
cell = [t.split("\n")[0] for t in D["totals"]]
row("dashboard", "tokens today", cell[0], fmt_tok(t_tok) + "tok")
row("dashboard", "cost today", cell[1], fmt_usd(t_cost) + "est")
delta = "--" if y_tok <= 0 else str(int(round((t_tok - y_tok) / y_tok * 100)))
shown_delta = re.sub(r"[^\d-]", "", cell[2])
row("dashboard", "vs yesterday (percent)", shown_delta, delta.lstrip("-"), shown_delta == delta.lstrip("-"), "sign carried by the arrow")
row("dashboard", "all-time tokens", cell[3], fmt_tok(a_tok + (bf.get("estTokens") or 0)) + "tok est")
row("dashboard", "all-time cost", cell[4], fmt_usd(a_cost + (bf.get("estCostUSD") or 0)) + "est")
row("dashboard", "burn rate today", cell[5], "$%.3f/1k" % ((t_cost / (t_tok / 1000)) if t_tok else 0))
open_sum = sum((s.get("barRaise") or {}).get("actionsOpen") or 0 for s in statuses.values())
row("dashboard", "review actions open", cell[6], "%dopen" % open_sum)
shown_age = int(re.sub(r"\D", "", cell[7]) or 0) if "m ago" in cell[7] else -1
row("dashboard", "last collected", cell[7], "%dm ago" % age_at_capture_min, abs(shown_age - age_at_capture_min) <= 3, "age at capture time, within three minutes")
row("dashboard", "band health", D["band"]["health"].replace("\n", ""), "%s/100" % constellation.get("portfolioHealth"))
row("dashboard", "band verdict", D["band"]["verdict"].lower(), constellation.get("portfolioVerdict"))
since = constellation["generatedAt"]
since_day = since[:10]
closed_since = 0
for name in constellation.get("projects") or []:
    s = statuses.get(name)
    if not s or not s.get("barRaise"):
        continue
    for r in (s["barRaise"].get("closedLog") or []):
        when = str(r.get("date") or r.get("at") or r.get("closedAt") or "")
        if not when:
            continue
        after = when > since if len(when) > 10 else when > since_day
        if after:
            closed_since += len(r["ids"]) if isinstance(r.get("ids"), list) else 1
row("dashboard", "band open / closed", D["band"]["sub"], "%d open / %d closed" % (open_sum, closed_since))
closed_sum = sum((s.get("barRaise") or {}).get("actionsClosed") or 0 for s in statuses.values() if (s.get("barRaise") or {}).get("actionsClosed") is not None)
audit_sum = 0
for s in statuses.values():
    f = (s.get("audit") or {}).get("findings")
    if f:
        audit_sum += sum(f.get(k) or 0 for k in ("critical", "high", "medium", "low"))
stale_sum = sum(1 for s in statuses.values() if s.get("stale") is True)
nums = {n.split("\n")[1].lower(): n.split("\n")[0] for n in D["band"]["nums"] if "\n" in n}
row("dashboard", "band closed", nums.get("closed"), str(closed_sum))
row("dashboard", "band audit", nums.get("audit"), str(audit_sum))
row("dashboard", "band stale", nums.get("stale"), str(stale_sum))
open_actions = [a for a in constellation.get("topActions") or [] if a.get("project") not in statuses or ((statuses[a["project"]].get("barRaise") or {}).get("actionsOpen") or 0) > 0]
row("dashboard", "band actions shown", len(D["band"]["actions"]), min(3, len(open_actions)))
for a in D["band"]["actions"]:
    lbl = a.split("\n")[-1][:50]
    row("dashboard", "band action still open: " + lbl[:40], "shown", "open", any(lbl in (x.get("label") or "") for x in open_actions))
for line in D["legend"]:
    m = re.match(r"^(\S+) (private|(\S+) · (\d+)%)$", line)
    if not m:
        continue
    pid = m.group(1)
    if pid in withheld:
        row("dashboard", "legend " + pid, m.group(2), "private")
        continue
    tok = per_today.get(pid, 0)
    # the legend shares out only the live roster: retired projects (Lexi, Scheduler) are off the core
    live_tok = sum(v for k, v in per_today.items() if k not in RETIRED)
    row("dashboard", "legend " + pid, m.group(2), "%s · %d%%" % (fmt_tok(tok), int(round(tok / live_tok * 100)) if live_tok else 0))
rad = D["radar"]
names = [n for n in ["Agents", "Apothecary", "Budget", "Cattery", "Chains", "Gnosis", "Hordes", "Ring", "Rising", "Scheduler"] if n in rad]
nums_r = re.findall(r"^(\d+)$", rad, re.M)
for i, n in enumerate(names):
    s = statuses.get(n) or {}
    row("dashboard", "radar completion " + n, nums_r[i] if i < len(nums_r) else "?", (s.get("completion") or {}).get("pct"))
for sp in D["spotlights"]:
    t = sp["text"]
    m = re.search(r"^(.*?)(vv?\d[\w.]*)?↗?▶?(\d+) / 14\n", t, re.M)
    if not m:
        continue
    disp = m.group(1).strip()
    pid = next((k for k, v in DISPLAY.items() if v == disp), None)
    if disp == "All Projects":
        mm = re.search(r"today (\S+) \((\$[\d.]+)\) / all-time (\S+) \((\$[\d.]+)\) / (\d+) sessions", t)
        if mm:
            row("dashboard", "spotlight ALL today", mm.group(1) + " " + mm.group(2), fmt_tok(t_tok) + " " + fmt_usd(t_cost))
            row("dashboard", "spotlight ALL all-time", mm.group(3) + " " + mm.group(4), fmt_tok(a_tok + (bf.get("estTokens") or 0)) + " " + fmt_usd(a_cost + (bf.get("estCostUSD") or 0)))
            row("dashboard", "spotlight ALL sessions", mm.group(5), sessions)
        continue
    if not pid:
        row("dashboard", "spotlight unknown card", disp, "known", False)
        continue
    u = usage["projects"].get(pid) or {}
    at = u.get("allTime") or {}
    bfp = (backfill.get("projects") or {}).get(pid) or {}
    if pid in withheld:
        row("dashboard", "spotlight %s today" % pid, "private" if "today private" in t else "number", "private")
    else:
        mm = re.search(r"today (\S+) \((\$[\d.]+)\)", t)
        cost = sum((d.get("costUSD") or 0) for d in (u.get("daily") or []) if d.get("d") == today)
        row("dashboard", "spotlight %s today" % pid, mm.group(1) + " " + mm.group(2) if mm else "?", fmt_tok(per_today.get(pid, 0)) + " " + fmt_usd(cost))
    mm = re.search(r"all-time (\S+) \((\$[\d.]+)\)(?: / (\d+) sessions)?", t)
    if mm:
        row("dashboard", "spotlight %s all-time" % pid, mm.group(1) + " " + mm.group(2), fmt_tok(total_tok(at) + (bfp.get("estTokens") or 0)) + " " + fmt_usd((at.get("costUSD") or 0) + (bfp.get("estCostUSD") or 0)))
        if mm.group(3):
            row("dashboard", "spotlight %s sessions" % pid, mm.group(3), u.get("sessions"))
    s = statuses.get(pid)
    if s:
        row("dashboard", "spotlight %s version" % pid, (m.group(2) or "").lstrip("v"), str(s.get("version") or "").lstrip("v"))
        mc = re.search(r"(\d+)%\nCOMPLETE", t)
        mh = re.search(r"(\d+)\nHEALTH", t)
        if s.get("completion"):
            row("dashboard", "spotlight %s complete" % pid, mc.group(1) if mc else "?", s["completion"].get("pct"))
        br = s.get("barRaise") or {}
        if br.get("health") is not None:
            row("dashboard", "spotlight %s health" % pid, mh.group(1) if mh else "?", br["health"])
        chips = " | ".join(sp["chips"])
        exp_found = "found%d open / %d closed" % (br.get("actionsOpen") or 0, br.get("actionsClosed") or 0)
        row("dashboard", "spotlight %s found chip" % pid, "present" if exp_found in chips else chips[:80], "present", exp_found in chips, exp_found)
        if br.get("verdict"):
            exp_v = "%s %s" % (br["verdict"], br.get("health"))
            row("dashboard", "spotlight %s verdict chip" % pid, "present" if exp_v in chips else chips[:60], "present", exp_v in chips, exp_v)
for mini in D["strip"]:
    parts = mini.split("\n")
    if len(parts) < 2:
        continue
    tag, val = parts[0], parts[1]
    pid = tag if tag in usage["projects"] else next((k for k, v in DISPLAY.items() if v == tag), tag)
    if pid == "All Projects":
        row("dashboard", "strip ALL", val, fmt_tok(t_tok))
        continue
    row("dashboard", "strip " + pid, val, "private" if pid in withheld else fmt_tok(per_today.get(pid, 0)))
bucket_txt = "\n".join(x["text"] for x in D["spotlights"] if "MEAN COMPLETE" in x["text"])
verd = {}
for s in statuses.values():
    v = (s.get("barRaise") or {}).get("verdict")
    if v:
        verd[v] = verd.get(v, 0) + 1
for v, n in sorted(verd.items()):
    want = "%d %s" % (n, v)
    row("dashboard", "bucket " + v, "present" if want in bucket_txt else "absent", "present", want in bucket_txt, want)
gates = sum(((s.get("itemsLeft") or {}).get("gates") or 0) for s in statuses.values())
mg = re.search(r"to done(\d+) left", bucket_txt)
row("dashboard", "to done gates", mg.group(1) if mg else "?", gates)
mf = re.search(r"found(\d+ open / \d+ closed(?: \+ \d+ audit)?)", bucket_txt)
row("dashboard", "found line", mf.group(1) if mf else "?", "%d open / %d closed + %d audit" % (open_sum, closed_sum, audit_sum))
backlog = 0
for s in statuses.values():
    b = s.get("backlog")
    backlog += (b.get("count") if isinstance(b, dict) else (b or 0)) or 0
mb = re.search(r"\+ (\d+) backlog", bucket_txt)
row("dashboard", "backlog", mb.group(1) if mb else "?", backlog)
parked = sum(len(s["barRaise"]["deferred"]) for s in statuses.values() if isinstance((s.get("barRaise") or {}).get("deferred"), list))
mp = re.search(r"(\d+) parked", bucket_txt)
row("dashboard", "parked", mp.group(1) if mp else "0", parked, note="the queue feed is private, so only the status deferred lists count")
for pid, s in statuses.items():
    if not s.get("version"):
        continue
    want = "%s v%s" % (pid, s["version"])
    row("dashboard", "ticker " + pid, want if want in D["ticker"] else "missing", want)
for pid, s in statuses.items():
    br = s.get("barRaise") or {}
    if br.get("actionsOpen") is None or pid in RETIRED:
        continue
    exp = "%d open / %d closed" % (br.get("actionsOpen") or 0, br.get("actionsClosed") or 0)
    seg = D["lists"]["found"].split("\n" + pid + "\n")
    ok = len(seg) > 1 and exp in seg[1][:400]
    row("dashboard", "lists found " + pid, "present" if ok else "absent", "present", ok, exp)

# ---------- layer 2b: feeds -> status page ----------
for card in cap["status"].get("cards") or []:
    head = card.split("\n")[0]
    pid = next((k for k, v in DISPLAY.items() if head.startswith(v + " (")), None)
    if not pid:
        continue
    g = pages.get(pid) or statuses.get(pid) or {}
    txt = card.replace("\n", " ")
    mv = re.search(r"(?<![A-Za-z])v(v?\d[\w.]*)", txt)
    row("status page", pid + " version", (mv.group(1) if mv else "?").lstrip("v"), str(g.get("version") or "").lstrip("v"))
    if g.get("workTreeClean") is not None:
        row("status page", pid + " tree", "clean" if "treeclean" in txt else ("dirty" if "treedirty" in txt else "?"), "clean" if g["workTreeClean"] else "dirty")
    lp = (lean.get("projects") or {}).get(pid)
    if lp:
        tt = total_tok(lp)
        exp = ("%.2fM" % (tt / 1e6)) if tt >= 1e6 else (("%.1fk" % (tt / 1e3)) if tt >= 1e3 else str(tt))
        mt = re.search(r"tokens today([\d.]+[Mk]?)", txt)
        row("status page", pid + " tokens today", mt.group(1) if mt else "?", exp)
    f = (g.get("audit") or {}).get("findings")
    if f:
        exp = "%d high %d med %d low" % (f.get("high") or 0, f.get("medium") or 0, f.get("low") or 0)
        row("status page", pid + " audit", "present" if exp in txt else "absent", "present", exp in txt, exp)
    br = g.get("barRaise") or {}
    if br.get("verdict"):
        exp = "%shealth %s" % (br["verdict"].upper(), br.get("health"))
        row("status page", pid + " review", "present" if exp in txt else "absent", "present", exp in txt, exp)
    if br.get("actionsOpen") is not None:
        exp = "%d actions open / %d closed" % (br.get("actionsOpen") or 0, br.get("actionsClosed") or 0)
        row("status page", pid + " actions", "present" if exp in txt else "absent", "present", exp in txt, exp)
top = cap["status"].get("top") or ""
row("status page", "rollup verdict", "needs-attention" if "needs-attention" in top else top[:40], constellation.get("portfolioVerdict"))
shown_top = [l for l in top.split("\n") if l.startswith("high /") or l.startswith("medium /") or l.startswith("low /")]
row("status page", "top actions shown", len(shown_top), min(5, len(open_actions)))
home = cap["homepage"].get("body") or ""
for pid, s in statuses.items():
    if pid in ("Agents", "Everything") or not s.get("version"):
        continue
    v = "v" + str(s["version"]).lstrip("v")
    row("homepage", pid + " pill", v if v in home else "absent", v, note="Agents is delisted from the homepage by rule; Everything is the site itself and has no card")

# ---------- report ----------
fails = [r for r in rows if not r[4]]
day = datetime.now().strftime("%Y-%m-%d")
out = "docs/DASHBOARD_AUDIT-%s.md" % day
lines = ["# Dashboard audit, %s" % datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %z"), "",
         "Every value the live dashboard, the public status page and the homepage show, read past the gate by `scripts/audit-dashboard-page.mjs`, compared with the feeds the pages read and with the canonical status files behind the feeds. Capture taken %s." % cap.get("capturedAt"), "",
         "Rows: %d. Failing: %d." % (len(rows), len(fails)), ""]
if fails:
    lines += ["## Failing", "", "| surface | item | shown | expected | note |", "|---|---|---|---|---|"]
    lines += ["| %s | %s | %s | %s | %s |" % (r[0], r[1], r[2].replace("|", "/"), r[3].replace("|", "/"), r[5]) for r in fails]
    lines.append("")
lines += ["## Every row", "", "| ok | surface | item | shown | expected |", "|---|---|---|---|---|"]
lines += ["| %s | %s | %s | %s | %s |" % ("yes" if r[4] else "NO", r[0], r[1], r[2].replace("|", "/"), r[3].replace("|", "/")) for r in rows]
with io.open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(lines) + "\n")
print("rows %d failing %d -> %s" % (len(rows), len(fails), out))
for r in fails:
    print("  FAIL %s | %s | shown %s | expected %s | %s" % (r[0], r[1], r[2][:70], r[3][:70], r[5]))
sys.exit(1 if fails else 0)
