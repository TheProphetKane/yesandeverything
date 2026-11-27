# -*- coding: utf-8 -*-
"""audit-dashboard-page.py: compare what the live pages show (the capture written by
scripts/audit-dashboard-page.mjs) with the feeds they read and with the canonical status
files behind the feeds. Writes docs/DASHBOARD_AUDIT-<date>.md. Exit 1 when any row fails.

   node scripts/audit-dashboard-page.mjs scripts/.audit-capture.json
   python scripts/audit-dashboard-page.py scripts/.audit-capture.json
"""
import glob, io, json, math, os, re, subprocess, sys, urllib.request
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP

CAP = sys.argv[1] if len(sys.argv) > 1 else "scripts/.audit-capture.json"
SITE = "https://yesandeverything.com"
WORKER = "https://usage.yesandeverything.com"
CANON = r"X:\PortfolioOps\status\data"
REPOS = {"Agents": r"X:\YesAndAgents", "Apothecary": r"X:\YesAndApothecary", "Budget": r"X:\YesAndBudget", "Cattery": r"X:\YesAndCattery",
         "Chains": r"X:\YesAndChains", "Everything": r"X:\YesAndEverything", "Gnosis": r"X:\YesAndGnosis", "Hordes": r"X:\HereBeHordes",
         "Rising": r"X:\BrackishRising"}
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


def to_fixed(n, places):
    # JavaScript's toFixed, which every page formats with: the exact value of the double,
    # a tie going to the larger number. Python's "%.0f" sends a tie to the even neighbour,
    # so Apothecary's all-time cost of exactly 1216.5 printed $1216 here and $1217 on the
    # page (2026-11-20).
    return str(Decimal(n).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP))


def fmt_tok(n):
    if n is None:
        return "0"
    if n >= 1e9:
        return to_fixed(n / 1e9, 2) + "B"
    if n >= 1e6:
        return to_fixed(n / 1e6, 2) + "M"
    if n >= 1e3:
        return to_fixed(n / 1e3, 1) + "k"
    return str(math.floor(n + 0.5))


def fmt_usd(n):
    n = n or 0
    return "$" + (to_fixed(n, 0) if n >= 100 else to_fixed(n, 2))


def total_tok(r):
    return (r.get("input") or 0) + (r.get("cacheRead") or 0) + (r.get("cacheWrite") or 0) + (r.get("output") or 0)


def central(utc):
    """Central time for a UTC moment, by the US rule since 2007: UTC-5 from the second Sunday
    of March at 08:00 UTC to the first Sunday of November at 07:00 UTC, UTC-6 otherwise. This
    subtracted five hours all year, so from November to March a run between 23:00 and
    midnight Central judged every "today" row against tomorrow (review of 2026-11-21)."""
    start = datetime(utc.year, 3, 8, 8, tzinfo=timezone.utc)
    start += timedelta(days=(6 - start.weekday()) % 7)
    end = datetime(utc.year, 11, 1, 7, tzinfo=timezone.utc)
    end += timedelta(days=(6 - end.weekday()) % 7)
    return utc + (timedelta(hours=-5) if start <= utc < end else timedelta(hours=-6))


rows = []


def row(surface, item, shown, expected, ok=None, note=""):
    if ok is None:
        ok = str(shown).strip() == str(expected).strip()
    rows.append((surface, item, str(shown), str(expected), bool(ok), note))


cap = load(CAP)
captured = datetime.strptime(cap["capturedAt"][:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
# The capture is judged against the feeds it held, so an old one would pass against its own
# old feeds. audit-dashboard-page.mjs deletes the last capture before it starts; this row
# catches a capture run by hand long before the comparison.
cap_age_min = (datetime.now(timezone.utc) - captured).total_seconds() / 60
row("feed", "capture age (minutes)", "%.1f" % cap_age_min, "under 20", 0 <= cap_age_min < 20,
    "an older capture is judged against the feeds of its own moment, not today's")
# The worker feeds the dashboard capture read before and after the page and found unchanged
# (see audit-dashboard-page.mjs). Every dashboard number is judged against these, so a
# collector run after the capture cannot split the page from its feeds. A capture without
# them falls back to a fresh fetch, and the row below fails, because the numbers may differ.
feeds = cap.get("feeds") or {}
usage = json.loads(feeds["usage"]) if feeds.get("usage") else fetch(WORKER + "/usage.json")
statuses = json.loads(feeds["statuses"]) if feeds.get("statuses") else fetch(WORKER + "/statuses.json")
row("feed", "worker feeds held still through the dashboard capture", "yes" if feeds.get("usage") and feeds.get("statuses") else "no", "yes",
    note="when they moved three reads running, the page is judged against a later fetch")
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
# Canonical is written on the collecting machine (kane-pc), by the releases, lanes and sweeps
# that run there, and its collector state file marks it. On any other machine canonical is
# the last commit, and the sweeps commit twice a day, at 01:00 and 13:00. A release written
# on the collecting machine since then is in the feed but not in the copy here. Brackish
# Rising shipped 0.98.1 at 14:25 on 2026-11-20, and the copy here read 0.97.37 until the
# next sweep. Judged against that snapshot, a correct feed failed.
#
# So off the collecting machine, each block (release, audit, barRaise) whose feed timestamp
# is newer than the copy here is checked against the feed instead, under one row saying so.
# A block whose copy here is as new or newer stays strict, which is how a stale feed fails
# (Everything's audit block on 2026-11-20, three hours behind canonical). On the collecting
# machine every block is strict, since a feed ahead of canonical there means a writer
# bypassed canonical.
ON_COLLECTOR = os.path.exists(r"X:\YesAndEverything\dashboard\data\.usage-state.json")


def stamp(x):
    try:
        t = datetime.fromisoformat(str(x).replace("Z", "+00:00"))
    except ValueError:
        return None
    # A stamp written without a zone is read as UTC, so it compares instead of raising.
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def block_stamp(d, block):
    if block == "release":
        # The release fields only. Agents' generatedAt is its tunnel heartbeat, refreshed every
        # few hours, and counted here it marked the whole release block "behind" and waved its
        # version, release date, tree state, completion and milestone past canonical
        # (review of 2026-11-21).
        vals = [d.get(k) for k in ("lastReleaseAt", "lastCommitAt")]
    else:
        vals = [(d.get(block) or {}).get("latestReportAt")]
    got = [t for t in (stamp(v) for v in vals if v) if t]
    return max(got) if got else None


def repo_names(repo, v):
    # Off the collecting machine the clones here are mirrors that trail their upstream: the
    # Gnosis clone sat 45 commits behind on 2026-11-20 and failed a version that was released
    # and pushed. So there the upstream's history and version files count too, after a fetch.
    refs = ["HEAD"]
    if not ON_COLLECTOR:
        subprocess.call(["git", "-C", repo, "fetch", "-q"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
        if subprocess.call(["git", "-C", repo, "rev-parse", "-q", "--verify", "@{u}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
            refs.append("@{u}")
    log = subprocess.check_output(["git", "-C", repo, "log", "-40", "--format=%s"] + refs, text=True, encoding="utf-8", errors="replace")
    if v in log:
        return True
    if re.fullmatch(r"[0-9a-f]{7,12}", v) and subprocess.call(["git", "-C", repo, "cat-file", "-e", v], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
        return True
    for cand in ("PROJECT_SPEC.md", "package.json", "project.godot", "index.html"):
        fp = os.path.join(repo, cand)
        if os.path.exists(fp) and v in io.open(fp, encoding="utf-8", errors="replace").read():
            return True
        if "@{u}" in refs:
            up = subprocess.run(["git", "-C", repo, "show", "@{u}:" + cand], capture_output=True, text=True, encoding="utf-8", errors="replace")
            if up.returncode == 0 and v in up.stdout:
                return True
    return False


def ms(x):
    m = x.get("milestone")
    return m.get("label") if isinstance(m, dict) else m


unchecked = []
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
    ref = {}
    for block in ("release", "audit", "barRaise"):
        here, live = block_stamp(c, block), block_stamp(s, block)
        behind = not ON_COLLECTOR and here is not None and live is not None and live > here
        ref[block] = s if behind else c
        if behind:
            # The sweep commits canonical every day, so a write older than a day and a half
            # should be in the copy here. Past that, a sweep missed it or this clone is unpulled.
            lag_h = (datetime.now(timezone.utc) - live).total_seconds() / 3600
            row("feed", "%s %s: canonical here behind the feed" % (pid, block), "behind, %s here, %s live" % (here.isoformat(), live.isoformat()),
                "a feed write under 36 hours old", lag_h < 36,
                "written on the collecting machine since the last sweep, so checked against the feed here; strict on the collecting machine")
    br = c.get("barRaise") or {}
    sb = s.get("barRaise") or {}
    if ref["release"] is c:
        for k in ("version", "lastReleaseAt", "workTreeClean", "stale"):
            row("feed", pid + " " + k, s.get(k), c.get(k))
        row("feed", pid + " completion", (s.get("completion") or {}).get("pct"), (c.get("completion") or {}).get("pct"))
        row("feed", pid + " milestone", ms(s), ms(c))
    if ref["barRaise"] is c:
        for k in ("actionsOpen", "actionsClosed", "health", "verdict"):
            row("feed", pid + " barRaise." + k, sb.get(k), br.get(k))
    if ref["audit"] is c:
        row("feed", pid + " audit findings", json.dumps((s.get("audit") or {}).get("findings"), sort_keys=True), json.dumps((c.get("audit") or {}).get("findings"), sort_keys=True))
    rb = ref["barRaise"].get("barRaise") or {}
    if g:
        row("pages copy", pid + " version", g.get("version"), ref["release"].get("version"))
        row("pages copy", pid + " actionsOpen", (g.get("barRaise") or {}).get("actionsOpen"), rb.get("actionsOpen"))
        row("pages copy", pid + " verdict", (g.get("barRaise") or {}).get("verdict"), rb.get("verdict"))
        row("pages copy", pid + " audit", json.dumps((g.get("audit") or {}).get("findings"), sort_keys=True), json.dumps((ref["audit"].get("audit") or {}).get("findings"), sort_keys=True))
    else:
        row("pages copy", pid + " served", "404", "200", False)
    repo = REPOS.get(pid)
    if repo and not os.path.isdir(repo):
        unchecked.append(pid)  # named in the report, so the skip is not silent
    if repo and os.path.isdir(repo):
        v = str(ref["release"].get("version") or "").lstrip("v")
        try:
            hit = bool(v) and repo_names(repo, v)
            row("repo", pid + " version " + v + " named in the repo", "yes" if hit else "no", "yes", hit, "last 40 commit subjects or the version source" + ("" if ON_COLLECTOR else ", here or upstream"))
        except Exception as e:
            row("repo", pid + " version", "git failed: %s" % e, "readable", False)
gen = datetime.strptime(usage["generatedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
age_h = (datetime.now(timezone.utc) - gen).total_seconds() / 3600
row("feed", "usage.json age (hours)", "%.1f" % age_h, "under 5.5", age_h < 5.5)
# Held in the same reads as the worker feeds, so a collector run after the capture cannot
# make the worker read as older than a local copy it was never compared with.
local_usage = json.loads(feeds["local_usage"]) if feeds.get("local_usage") else load(r"X:\YesAndEverything\dashboard\data\usage.json")
# At or newer, the collector's own readback rule. On the collecting machine the local copy is
# the run it just wrote. Anywhere else it is the last committed copy, which trails the worker
# by up to four hours by design, so an equality test failed on every other machine. Only a
# worker OLDER than the local copy means a key-value push failed, which is the freeze this
# row exists to catch.
local_gen = datetime.fromisoformat(local_usage["generatedAt"].replace("Z", "+00:00"))
row("feed", "usage.json worker at or newer than local", usage["generatedAt"], "at or after " + local_usage["generatedAt"], gen >= local_gen, "an older worker means the key-value push failed")
local_cn = load(os.path.join(CANON, "constellation.json"))
row("feed", "constellation generatedAt pages vs canonical", constellation.get("generatedAt"), local_cn.get("generatedAt"))
cn_age = (datetime.now(timezone.utc) - datetime.strptime(constellation["generatedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).days
row("feed", "constellation age (days)", cn_age, "under 8", cn_age < 8)

# ---------- layer 2: feeds -> dashboard page ----------
D = cap["dashboard"]
# The Central day of the capture, which is the day the page itself was reading.
today_c = central(captured)
today = today_c.strftime("%Y-%m-%d")
yester = (today_c.date() - timedelta(days=1)).isoformat()
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
row("dashboard", "burn rate today", cell[5], "$%s/1k" % to_fixed((t_cost / (t_tok / 1000)) if t_tok else 0, 3))
open_sum = sum((s.get("barRaise") or {}).get("actionsOpen") or 0 for s in statuses.values())
row("dashboard", "review actions open", cell[6], "%dopen" % open_sum)
# The page floors the age into one unit, as fmtAgo in dashboard/index.html does: seconds,
# minutes under an hour, hours under a day, then days. This row read minutes only, so a
# collection more than an hour old failed as "1h ago" against "88m ago" (2026-11-20).
def ago_text(sec):
    sec = int(sec)
    if sec < 60:
        return "%ds ago" % sec
    if sec < 3600:
        return "%dm ago" % (sec // 60)
    if sec < 86400:
        return "%dh ago" % (sec // 3600)
    return "%dd ago" % (sec // 86400)


age_at_capture_s = (captured - gen).total_seconds()
ma = re.match(r"^(\d+)([smhd]) ago", cell[7])
ok_age = False
if ma:
    unit = {"s": 1, "m": 60, "h": 3600, "d": 86400}[ma.group(2)]
    ok_age = int(ma.group(1)) * unit - 180 <= age_at_capture_s < (int(ma.group(1)) + 1) * unit + 180
row("dashboard", "last collected", cell[7], ago_text(age_at_capture_s), ok_age, "age at capture time, within three minutes of the unit shown")
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
wheel_seen = []  # (position, name) of every card read
for sp in D["spotlights"]:
    t = sp["text"]
    h = sp.get("head")
    if h:
        disp, shown_ver = (h.get("name") or "").strip(), h.get("version") or ""
        pm = re.match(r"^(\d+) / (\d+)$", (h.get("pos") or "").strip())
        if pm:
            wheel_seen.append((int(pm.group(1)), disp))
    else:
        # A capture from before the header fields. Any wheel length, and a commit-hash version
        # as Everything carries; this pattern read "/ 14", so once the wheel held 13 cards
        # every spotlight row was skipped without a word (found 2026-11-20).
        m = re.search(r"^(.*?)(v(?:v?\d[\w.]*|[0-9a-f]{7,12}))?↗?▶?(\d+) / (\d+)\n", t, re.M)
        if not m:
            continue
        disp, shown_ver = m.group(1).strip(), m.group(2) or ""
        wheel_seen.append((int(m.group(3)), disp))
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
        row("dashboard", "spotlight %s version" % pid, shown_ver.lstrip("v"), str(s.get("version") or "").lstrip("v"))
        if h:
            row("dashboard", "spotlight %s stale badge" % pid, "shown" if h.get("stale") else "none", "shown" if s.get("stale") is True else "none")
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
# Coverage, so a card that is not read fails instead of dropping its rows: a wheel that does
# not turn reads one position many times, a project missing from the wheel leaves a name
# out, and a header that does not parse leaves a position out (review of 2026-11-21).
want_wheel = ["All Projects"] + [p.get("displayName") for p in (_reg.get("projects") or []) if not p.get("retired")]
row("dashboard", "spotlight wheel length", D.get("wheel"), len(want_wheel), note="the page's count against the live roster in data/projects.json")
row("dashboard", "spotlight positions read", ",".join(str(p) for p, _n in sorted(wheel_seen)),
    ",".join(str(i) for i in range(1, len(want_wheel) + 1)), note="each card once")
row("dashboard", "spotlight cards read", "; ".join(sorted(n for _p, n in wheel_seen)), "; ".join(sorted(want_wheel)))
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
lt = str(D.get("listsTitle") or "").strip()
row("dashboard", "lists scope", lt, "lists", lt.lower() == "lists", "no project filter, so the lists cover every project")
for pid, s in statuses.items():
    br = s.get("barRaise") or {}
    if br.get("actionsOpen") is None or pid in RETIRED:
        continue
    exp = "%d open / %d closed" % (br.get("actionsOpen") or 0, br.get("actionsClosed") or 0)
    seg = D["lists"]["found"].split("\n" + pid + "\n")
    ok = len(seg) > 1 and exp in seg[1][:400]
    row("dashboard", "lists found " + pid, "present" if ok else "absent", "present", ok, exp)

# ---------- layer 2b: feeds -> status page ----------
# The status page takes tokens today from the one-day file only when that file is for today's
# Central date, and from the full file otherwise (status/index.html). The one-day file sat at
# 2026-10-04 for 48 days, and these rows compared the page with that same file, so its stale
# numbers passed as today's (review of 2026-11-21).
lean_gen = stamp(lean.get("generatedAt") or "")
row("status page", "one-day usage file current", "%s, day %s" % (lean.get("generatedAt"), lean.get("day")),
    "generated under 12 hours before the capture", bool(lean_gen) and timedelta(0) <= captured - lean_gen < timedelta(hours=12),
    "sync-dashboard-data.yml writes it from each data sync")
if lean.get("day") == today:
    def page_today(pid):
        lp = (lean.get("projects") or {}).get(pid)
        return total_tok(lp) if lp else None
else:
    full = fetch(SITE + "/dashboard/data/usage.json")
    full_gen = stamp(full.get("generatedAt") or "")
    row("status page", "full usage file current", full.get("generatedAt"), "generated under 12 hours before the capture",
        bool(full_gen) and timedelta(0) <= captured - full_gen < timedelta(hours=12),
        "the page's source while the one-day file is not for today")

    def page_today(pid):
        u = (full.get("projects") or {}).get(pid)
        return sum(total_tok(d) for d in (u.get("daily") or []) if d.get("d") == today) if u else None
pills = cap["status"].get("versions")
pills = pills if isinstance(pills, list) else []  # an exception on the page arrives as a string
cards_seen = []
for ci, card in enumerate(cap["status"].get("cards") or []):
    head = card.split("\n")[0]
    pid = next((k for k, v in DISPLAY.items() if head.startswith(v + " (")), None)
    if not pid:
        continue
    cards_seen.append(pid)
    g = pages.get(pid) or statuses.get(pid) or {}
    txt = card.replace("\n", " ")
    if pills:
        shown_v = (pills[ci] if ci < len(pills) else None) or ""
    else:
        # A capture from before the pill list. The stale badge runs into the pill in the card
        # text ("STALEv1.4.1") and Everything's version is a commit hash, so this can misread.
        mv = re.search(r"(?<![A-Za-z])v(v?\d[\w.]*|[0-9a-f]{7,12})", txt)
        shown_v = mv.group(1) if mv else "?"
    row("status page", pid + " version", shown_v.lstrip("v"), str(g.get("version") or "").lstrip("v"))
    if g.get("workTreeClean") is not None:
        row("status page", pid + " tree", "clean" if "treeclean" in txt else ("dirty" if "treedirty" in txt else "?"), "clean" if g["workTreeClean"] else "dirty")
    tt = page_today(pid)
    if tt is not None:
        exp = (to_fixed(tt / 1e6, 2) + "M") if tt >= 1e6 else ((to_fixed(tt / 1e3, 1) + "k") if tt >= 1e3 else str(tt))
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
# Every public status file gets a card, so an empty or short card list fails here instead of
# passing with no rows (review of 2026-11-21).
row("status page", "cards", ", ".join(sorted(cards_seen)), ", ".join(sorted(pid for pid in statuses if pages.get(pid))))
top = cap["status"].get("top") or ""
# The verdict is its own line under the PORTFOLIO VERDICT label. This row looked for the one
# word needs-attention, so any other verdict printed the label as a failure (2026-11-20).
want_verdict = constellation.get("portfolioVerdict")
row("status page", "rollup verdict", want_verdict if want_verdict in [l.strip() for l in top.split("\n")] else top[:40], want_verdict)
shown_top = [l for l in top.split("\n") if l.startswith("high /") or l.startswith("medium /") or l.startswith("low /")]
row("status page", "top actions shown", len(shown_top), min(5, len(open_actions)))
home = cap["homepage"].get("body") or ""
for pid, s in statuses.items():
    if pid in ("Agents", "Everything") or not s.get("version"):
        continue
    v = "v" + str(s["version"]).lstrip("v")
    row("homepage", pid + " pill", v if v in home else "absent", v, note="Agents is delisted from the homepage by rule; Everything is the site itself and has no card")

# public version pills in the repo html against the canonical status files (check-public-pills.py)
import importlib.util
_sp = importlib.util.spec_from_file_location("check_public_pills", os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-public-pills.py"))
_cp = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(_cp)
for _f, _who, _shown, _exp, _ok in _cp.check():
    row("public pill", _f + " " + _who, _shown, _exp, _ok, "stamped by scripts/update-project-pages.mjs; run it, then commit")

# ---------- report ----------
fails = [r for r in rows if not r[4]]
day = datetime.now().strftime("%Y-%m-%d")
out = "docs/DASHBOARD_AUDIT-%s.md" % day
lines = ["# Dashboard audit, %s" % datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %z"), "",
         "Every value the live dashboard, the public status page and the homepage show, read past the gate by `scripts/audit-dashboard-page.mjs`, compared with the feeds the pages read and with the canonical status files behind the feeds. Capture taken %s." % cap.get("capturedAt"), "",
         "Rows: %d. Failing: %d." % (len(rows), len(fails)), ""]
if unchecked:
    lines += ["Not checked here: the repository row for %s, whose clones are not on this machine." % ", ".join(unchecked), ""]
if fails:
    lines += ["## Failing", "", "| surface | item | shown | expected | note |", "|---|---|---|---|---|"]
    lines += ["| %s | %s | %s | %s | %s |" % (r[0], r[1], r[2].replace("|", "/"), r[3].replace("|", "/"), r[5]) for r in fails]
    lines.append("")
lines += ["## Every row", "", "| ok | surface | item | shown | expected |", "|---|---|---|---|---|"]
lines += ["| %s | %s | %s | %s | %s |" % ("yes" if r[4] else "NO", r[0], r[1], r[2].replace("|", "/"), r[3].replace("|", "/")) for r in rows]
with io.open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(lines) + "\n")
print("rows %d failing %d -> %s" % (len(rows), len(fails), out))
if unchecked:
    print("  not checked here: the repository row for %s" % ", ".join(unchecked))
for r in fails:
    print("  FAIL %s | %s | shown %s | expected %s | %s" % (r[0], r[1], r[2][:70], r[3][:70], r[5]))
sys.exit(1 if fails else 0)
